const Account = require("../models/Accounts");
const Firm = require("../models/Firms");
const Store = require("../models/Stores");

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
 * Resolve the store a data request is about, or send an error and return null.
 *
 * Every shared data endpoint (catalog, sales, recipes, pos, forecast) is
 * scoped to one store: `storeId` is read from the query string, the body or
 * the route params, and the store must belong to the caller's firm. Data never
 * crosses firms and never falls back to the global catalog.
 */
async function requireStore(req, res, { managerOnly = false } = {}) {
  const storeId =
    req.query?.storeId || (req.body || {}).storeId || req.params?.storeId;

  if (!storeId) {
    res.status(400).json({
      status: "error",
      message: "'storeId' is required — every data endpoint is scoped to one store",
    });
    return null;
  }

  // requireInitialized already resolved and attached the account for the
  // guarded data routes; the rest do their own lookup.
  const cookies = parseCookies(req.headers.cookie);
  const account =
    req.account ||
    (cookies.session ? await Account.findOne({ userId: cookies.session }) : null);
  if (!account) {
    res.status(401).json({ status: "error", message: "Not logged in" });
    return null;
  }

  const firm = account.firmId
    ? await Firm.findOne({ firmId: account.firmId })
    : account.firmName
      ? await Firm.findOne({ firmName: account.firmName })
      : null;
  if (!firm) {
    res.status(403).json({ status: "error", message: "You are not part of a firm" });
    return null;
  }

  if (managerOnly && account.role !== "manager") {
    res.status(403).json({ status: "error", message: "Manager access required" });
    return null;
  }

  if (!(firm.stores || []).includes(storeId)) {
    res.status(404).json({
      status: "error",
      message: "Store not found in your firm",
    });
    return null;
  }

  const store = await Store.findOne({ storeId });
  if (!store) {
    res.status(404).json({ status: "error", message: `Store '${storeId}' not found` });
    return null;
  }

  return { account, firm, store };
}

module.exports = requireStore;
