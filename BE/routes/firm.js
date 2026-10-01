const express = require("express");
const router = express.Router();

const Firm = require("../models/Firms");
const Account = require("../models/Accounts");

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((pair) => {
    const [key, ...rest] = pair.split("=");
    cookies[key.trim()] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

/** POST /api/firm — create a new firm (session-authenticated). */
router.post("/", async (req, res) => {
  const { firmName } = req.body || {};

  if (!firmName) {
    return res.status(400).json({
      status: "error",
      message: "'firmName' is required",
    });
  }

  try {
    const cookies = parseCookies(req.headers.cookie);
    const sessionUserId = cookies.session;

    if (!sessionUserId) {
      return res.status(401).json({
        status: "error",
        message: "Not logged in",
      });
    }

    const account = await Account.findOne({ userId: sessionUserId });
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

    const firm = await Firm.create({
      firmName,
      firmId: "FIRM",
      members: [{ email: account.email, role: "admin" }],
    });

    firm.firmId = `FIRM-${String(firm._id).slice(-4).toUpperCase()}`;
    await firm.save();

    const firmPrefix = firm.firmId.split("-").pop();
    account.userId = `${firmPrefix}${String(account._id).slice(-4).toUpperCase()}`;
    account.firmName = firm.firmName;
    account.firmId = firm.firmId;
    account.pendingFirmId = "";
    account.pendingFirmName = "";
    account.role = "admin";
    account.initialized = true;
    await account.save();

    // The userId changed, so the old session cookie is no longer valid.
    res.setHeader(
      "Set-Cookie",
      `session=${account.userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`,
    );

    res.status(201).json({
      status: "success",
      firm: {
        firmId: firm.firmId,
        firmName: firm.firmName,
        members: firm.members,
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

/** POST /api/firm/:firmId/accept — accept a pending account request. */
router.post("/:firmId/accept", async (req, res) => {
  const { firmId } = req.params;
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({
      status: "error",
      message: "'email' is required",
    });
  }

  try {
    const firm = await Firm.findOne({ firmId });
    if (!firm) {
      return res.status(404).json({
        status: "error",
        message: `Firm '${firmId}' not found`,
      });
    }

    const index = firm.accountRequest.findIndex((r) => r.email === email);
    if (index === -1) {
      return res.status(404).json({
        status: "error",
        message: `No pending request from '${email}'`,
      });
    }

    const request = firm.accountRequest.splice(index, 1)[0];

    const account = await Account.findOne({ email });
    if (!account) {
      return res.status(404).json({
        status: "error",
        message: `Account '${email}' not found`,
      });
    }

    const firmPrefix = firmId.split("-").pop();
    account.userId = `${firmPrefix}${String(account._id).slice(-4).toUpperCase()}`;
    account.firmName = firm.firmName;
    account.firmId = firm.firmId;
    account.pendingFirmId = "";
    account.pendingFirmName = "";
    account.role = request.role;
    account.initialized = true;
    await account.save();

    firm.members.push({ email: account.email, role: account.role });
    await firm.save();

    res.status(200).json({
      status: "success",
      member: {
        userId: account.userId,
        name: account.name,
        email: account.email,
        role: account.role,
        storeId: request.storeId || "",
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

/** GET /api/firm — get firm data based on user role. */
router.get("/", async (req, res) => {
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

    if (!account.firmName) {
      return res.status(404).json({
        status: "error",
        message: "Not part of any firm",
      });
    }

    const firm = await Firm.findOne({ firmName: account.firmName }).lean();
    if (!firm) {
      return res.status(404).json({
        status: "error",
        message: "Firm not found",
      });
    }

    if (account.role === "admin") {
      return res.status(200).json({
        status: "success",
        firm: {
          firmId: firm.firmId,
          firmName: firm.firmName,
          members: firm.members,
          stores: firm.stores,
          accountRequest: firm.accountRequest,
        },
      });
    }

    res.status(200).json({
      status: "success",
      firm: {
        firmName: firm.firmName,
      },
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

module.exports = router;
