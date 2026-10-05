const express = require("express");
const router = express.Router();

const Firm = require("../models/Firms");
const Account = require("../models/Accounts");
const { setSessionCookie } = require("../services/cookies");

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach((pair) => {
    const [key, ...rest] = pair.split("=");
    cookies[key.trim()] = decodeURIComponent(rest.join("="));
  });
  return cookies;
}

/**
 * Session + manager check for the request-management routes.
 * Returns { account, firm }, or sends the error response and returns null.
 */
async function requireManagerOfFirm(req, res, firmId) {
  const cookies = parseCookies(req.headers.cookie);
  const userId = cookies.session;

  if (!userId) {
    res.status(401).json({ status: "error", message: "Not logged in" });
    return null;
  }

  const account = await Account.findOne({ userId });
  if (!account) {
    res.status(401).json({ status: "error", message: "Session invalid" });
    return null;
  }

  if (account.firmId !== firmId || account.role !== "manager") {
    res.status(403).json({ status: "error", message: "Manager access required" });
    return null;
  }

  const firm = await Firm.findOne({ firmId });
  if (!firm) {
    res.status(404).json({
      status: "error",
      message: `Firm '${firmId}' not found`,
    });
    return null;
  }

  return { account, firm };
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
      members: [{ email: account.email, role: "manager" }],
    });

    firm.firmId = `FIRM-${String(firm._id).slice(-4).toUpperCase()}`;
    await firm.save();

    const firmPrefix = firm.firmId.split("-").pop();
    account.userId = `${firmPrefix}${String(account._id).slice(-4).toUpperCase()}`;
    account.firmName = firm.firmName;
    account.firmId = firm.firmId;
    account.pendingFirmId = "";
    account.pendingFirmName = "";
    account.role = "manager";
    await account.save();

    // The userId changed, so the old session cookie is no longer valid.
    setSessionCookie(req, res, account.userId);

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

/**
 * POST /api/firm/:firmId/accept — accept a pending account request (manager only).
 * Body: { email }
 */
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
    const ctx = await requireManagerOfFirm(req, res, firmId);
    if (!ctx) return;
    const { firm } = ctx;

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

/**
 * POST /api/firm/:firmId/reject — decline a pending account request (manager only).
 * Body: { email }
 *
 * The request is dropped from the firm and the requester's pending flags are
 * cleared, so their "request pending" banner disappears and they are free to
 * request another firm.
 */
router.post("/:firmId/reject", async (req, res) => {
  const { firmId } = req.params;
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({
      status: "error",
      message: "'email' is required",
    });
  }

  try {
    const ctx = await requireManagerOfFirm(req, res, firmId);
    if (!ctx) return;
    const { firm } = ctx;

    const index = firm.accountRequest.findIndex((r) => r.email === email);
    if (index === -1) {
      return res.status(404).json({
        status: "error",
        message: `No pending request from '${email}'`,
      });
    }

    firm.accountRequest.splice(index, 1);
    await firm.save();

    const requester = await Account.findOne({ email });
    if (requester && requester.pendingFirmId === firmId) {
      requester.pendingFirmId = "";
      requester.pendingFirmName = "";
      await requester.save();
    }

    res.status(200).json({ status: "success", email });
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

    const firm = await Firm.findOne(
      account.firmId ? { firmId: account.firmId } : { firmName: account.firmName },
    ).lean();
    if (!firm) {
      return res.status(404).json({
        status: "error",
        message: "Firm not found",
      });
    }

    if (account.role === "manager") {
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
