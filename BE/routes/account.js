const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const Account = require("../models/Accounts");
const Firm = require("../models/Firms");
const { ACCOUNT, FIRM, STORES } = require("../config/firm");
const { computeIngredients } = require("../config/catalog");
const python = require("../services/python");
const store = require("../services/store");

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return derived === hash;
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((pair) => {
    const [key, ...rest] = pair.split("=");
    cookies[key.trim()] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

/** POST /api/account/register — create a new account. */
router.post("/register", async (req, res) => {
  const { email, password, name, firmId, storeId } = req.body || {};

  if (!email || !password || !name) {
    return res.status(400).json({
      status: "error",
      message: "'email', 'password', and 'name' are required",
    });
  }

  try {
    const exists = await Account.findOne({ email });
    if (exists) {
      return res.status(409).json({
        status: "error",
        message: "Email already registered",
      });
    }

    const passwordHash = hashPassword(password);

    const account = await Account.create({
      email,
      passwordHash,
      name,
      userId: "pending",
    });

    account.userId = "0000" + String(account._id).slice(-4).toUpperCase();
    await account.save();

    let firmRequest = null;
    if (firmId) {
      const firm = await Firm.findOne({ firmId });
      if (!firm) {
        return res.status(404).json({
          status: "error",
          message: `Firm '${firmId}' not found`,
        });
      }
      firm.accountRequest.push({
        email,
        name,
        role: "user",
        storeId: storeId || "",
      });
      await firm.save();
      firmRequest = firmId;
    }

    res.status(201).json({
      status: "success",
      account: {
        userId: account.userId,
        name: account.name,
        email: account.email,
      },
      firmRequest,
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Accounts Login Post ============================================

/** POST /api/account/login — sign in with email and password. */
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      status: "error",
      message: "'email' and 'password' are required",
    });
  }

  try {
    const account = await Account.findOne({ email });
    if (!account) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    const valid = verifyPassword(password, account.passwordHash);
    if (!valid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password",
      });
    }

    res.setHeader(
      "Set-Cookie",
      `session=${account.userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    );

    res.status(200).json({
      status: "success",
      account: {
        userId: account.userId,
        name: account.name,
        email: account.email,
        role: account.role,
        firmName: account.firmName,
        firmId: account.firmId,
        pendingFirmId: account.pendingFirmId,
        pendingFirmName: account.pendingFirmName,
        initialized: account.initialized === true,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Accounts Logout ================================================

/** POST /api/account/logout — clear session cookie. */
router.post("/logout", (req, res) => {
  res.setHeader(
    "Set-Cookie",
    "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );
  res.status(200).json({ status: "success", message: "Logged out" });
});

// Accounts Session Check ========================================

/** GET /api/account/me — check login status via session cookie. */
router.get("/me", async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const userId = cookies.session;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Not logged in",
      });
    }

    const account = await Account.findOne({ userId }).lean();
    if (!account) {
      return res.status(401).json({
        status: "error",
        message: "Session invalid",
      });
    }

    res.status(200).json({
      status: "success",
      account: {
        userId: account.userId,
        name: account.name,
        email: account.email,
        role: account.role,
        firmName: account.firmName,
        firmId: account.firmId,
        pendingFirmId: account.pendingFirmId,
        pendingFirmName: account.pendingFirmName,
        initialized: account.initialized === true,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Accounts Workspace Setup ======================================

/** POST /api/account/initialize — mark the account's workspace as set up. */
router.post("/initialize", async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const userId = cookies.session;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Not logged in",
      });
    }

    const account = await Account.findOne({ userId });
    if (!account) {
      return res.status(401).json({
        status: "error",
        message: "Session invalid",
      });
    }

    account.initialized = true;
    await account.save();

    res.status(200).json({
      status: "success",
      account: {
        userId: account.userId,
        name: account.name,
        email: account.email,
        role: account.role,
        firmName: account.firmName,
        initialized: true,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Accounts Firm Request =========================================

/** POST /api/account/firm-request — request to join a firm. */
router.post("/firm-request", async (req, res) => {
  try {
    const cookies = parseCookies(req.headers.cookie);
    const userId = cookies.session;

    if (!userId) {
      return res.status(401).json({
        status: "error",
        message: "Not logged in",
      });
    }

    const { firmId, storeId } = req.body || {};
    if (!firmId) {
      return res.status(400).json({
        status: "error",
        message: "'firmId' is required",
      });
    }

    const account = await Account.findOne({ userId });
    if (!account) {
      return res.status(401).json({
        status: "error",
        message: "Session invalid",
      });
    }

    if (account.firmName) {
      return res.status(409).json({
        status: "error",
        message: "Already part of a firm",
      });
    }

    const firm = await Firm.findOne({ firmId });
    if (!firm) {
      return res.status(404).json({
        status: "error",
        message: `Firm '${firmId}' not found`,
      });
    }

    const alreadyRequested = firm.accountRequest.some(
      (r) => r.email === account.email,
    );
    if (alreadyRequested) {
      return res.status(409).json({
        status: "error",
        message: "Request already pending",
      });
    }

    firm.accountRequest.push({
      email: account.email,
      name: account.name,
      role: "user",
      storeId: storeId || "",
    });
    await firm.save();

    account.pendingFirmId = firm.firmId;
    account.pendingFirmName = firm.firmName;
    account.initialized = true;
    await account.save();

    res.status(201).json({
      status: "success",
      message: `Request sent to ${firm.firmName}`,
      firm: {
        firmId: firm.firmId,
        firmName: firm.firmName,
      },
      account: {
        userId: account.userId,
        name: account.name,
        email: account.email,
        role: account.role,
        firmName: account.firmName,
        firmId: account.firmId,
        pendingFirmId: account.pendingFirmId,
        pendingFirmName: account.pendingFirmName,
        initialized: account.initialized === true,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

//END =============================================================

// /** GET /api/account/profile — the signed-in user and their firm. */
// router.get("/profile", async (req, res) => {
//   try {
//     const logs = await store.listDailyLogs();

//     res.status(200).json({
//       status: "success",
//       account: {
//         userId: ACCOUNT.userId,
//         name: ACCOUNT.name,
//         email: ACCOUNT.email,
//         role: ACCOUNT.role,
//         plan: FIRM.plan,
//         avatarUrl: ACCOUNT.avatarUrl,
//       },
//       firm: {
//         firmId: FIRM.firmId,
//         firmName: FIRM.firmName,
//         storeCount: STORES.length,
//         openStoreCount: STORES.filter((s) => s.isOpen).length,
//         loggedDays: logs.length,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({ status: "error", message: error.message });
//   }
// });

// /** GET /api/account/stores — outlets managed by the firm. */
// router.get("/stores", async (req, res) => {
//   try {
//     const stockouts = await store.getStockouts();
//     const flagged = Object.keys(stockouts).length;

//     res.status(200).json({
//       status: "success",
//       count: STORES.length,
//       stores: STORES.map((s) => ({
//         storeId: s.storeId,
//         storeName: s.storeName,
//         isOpen: s.isOpen,
//         status: s.isOpen ? "open" : "closed",
//       })),
//       flaggedItems: flagged,
//     });
//   } catch (error) {
//     res.status(500).json({ status: "error", message: error.message });
//   }
// });

// /**
//  * GET /api/account/stock
//  *
//  * On-hand ingredients compared against tomorrow's forecast requirement, so the
//  * page answers "what do I need to buy?" rather than just listing quantities.
//  */
// router.get("/stock", async (req, res) => {
//   try {
//     const stock = await store.getStock();

//     let required = new Map();
//     let forecast = null;
//     let forecastError = null;

//     try {
//       const prediction = await python.getForecast();
//       const ingredients = computeIngredients(prediction.menu_breakdown);
//       required = new Map(ingredients.map((i) => [key(i.ingredient, i.unit), i.weight]));
//       forecast = { target_date: prediction.target_date, model: prediction.model };
//     } catch (err) {
//       // Stock still renders without the forecast; the UI marks it unavailable.
//       forecastError = err.message;
//       console.error("[account] forecast unavailable for stock:", err.message);
//     }

//     const rows = stock.map((item) => {
//       const requiredTomorrow = required.get(key(item.ingredient, item.unit)) ?? null;
//       let status = "unknown";

//       if (requiredTomorrow != null) {
//         if (requiredTomorrow === 0) status = "ok";
//         else if (item.onHand < requiredTomorrow) status = "short";
//         else if (item.onHand < requiredTomorrow * 2) status = "low";
//         else status = "ok";
//       }

//       const dailyRequirement = item.dailyRequirement || 0;
//       return {
//         ingredient: item.ingredient,
//         unit: item.unit,
//         on_hand: item.onHand,
//         daily_requirement: dailyRequirement,
//         days_of_cover: dailyRequirement > 0
//           ? Number((item.onHand / dailyRequirement).toFixed(1))
//           : null,
//         required_tomorrow: requiredTomorrow,
//         shortfall: requiredTomorrow != null
//           ? Math.max(0, Number((requiredTomorrow - item.onHand).toFixed(3)))
//           : null,
//         status,
//       };
//     });

//     const shortCount = rows.filter((r) => r.status === "short").length;

//     res.status(200).json({
//       status: "success",
//       count: rows.length,
//       short_count: shortCount,
//       forecast,
//       forecast_error: forecastError,
//       items: rows.sort((a, b) => {
//         const rank = { short: 0, low: 1, unknown: 2, ok: 3 };
//         return rank[a.status] - rank[b.status] || a.ingredient.localeCompare(b.ingredient);
//       }),
//     });
//   } catch (error) {
//     res.status(500).json({ status: "error", message: error.message });
//   }
// });

// /**
//  * PATCH /api/account/stock
//  * Body: { ingredient, unit, on_hand }
//  */
// router.patch("/stock", async (req, res) => {
//   const { ingredient, unit } = req.body || {};
//   const onHand = Number((req.body || {}).on_hand);

//   if (!ingredient || !unit) {
//     return res.status(400).json({
//       status: "error",
//       message: "'ingredient' and 'unit' are required",
//     });
//   }
//   if (!Number.isFinite(onHand) || onHand < 0) {
//     return res.status(400).json({
//       status: "error",
//       message: "'on_hand' must be a non-negative number",
//     });
//   }

//   try {
//     const updated = await store.setStockLevel(ingredient, unit, onHand);
//     if (!updated) {
//       return res.status(404).json({
//         status: "error",
//         message: `No stock row for ${ingredient} (${unit})`,
//       });
//     }
//     res.status(200).json({ status: "success", item: updated });
//   } catch (error) {
//     res.status(500).json({ status: "error", message: error.message });
//   }
// });

module.exports = router;
