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

/**
 * Guards the data endpoints (forecast, catalog, sales, recipes, pos).
 *
 * The caller must have a valid session and must have completed the explicit
 * workspace initialisation step. Which store the data belongs to is enforced
 * afterwards by middleware/storeScope: every data request names one store.
 *
 *   401 — no session / unknown session
 *   403 — logged in, but the workspace is not initialised yet
 */
async function requireInitialized(req, res, next) {
  try {
    const userId = parseCookies(req.headers.cookie).session;
    if (!userId) {
      return res.status(401).json({ status: "error", message: "Not logged in" });
    }

    const account = await Account.findOne({ userId }).lean();
    if (!account) {
      return res.status(401).json({ status: "error", message: "Session invalid" });
    }

    if (account.initialized !== true) {
      return res.status(403).json({
        status: "error",
        message: "Workspace not initialised yet",
      });
    }

    req.account = account;
    return next();
  } catch (error) {
    return res.status(500).json({ status: "error", message: error.message });
  }
}

module.exports = requireInitialized;
