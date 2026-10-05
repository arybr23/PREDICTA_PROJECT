// Same-origin by default: `/api` is proxied to the API (Vercel rewrite in
// production, Vite dev proxy in development), so requests and the session
// cookie stay first-party — a cross-site absolute URL would have the browser
// drop the SameSite cookie and every call would come back 401.
// Override with VITE_API_URL to point elsewhere explicitly.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...options,
    });
  } catch (error) {
    throw new Error(
      `Cannot reach the API at ${BASE_URL} (${error.message}). Is the backend running? (cd BE && node server.js)`,
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    throw new Error(
      data?.message || data?.detail || `Request failed (${res.status})`,
    );
  }

  return data;
}

const post = (path, body) =>
  request(path, { method: "POST", body: JSON.stringify(body) });

const patch = (path, body) =>
  request(path, { method: "PATCH", body: JSON.stringify(body) });

/**
 * Multipart upload. Deliberately does not go through `request`, which sets a
 * JSON Content-Type — the browser has to set the multipart boundary itself.
 */
async function upload(path, formData) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch (error) {
    throw new Error(
      `Cannot reach the API at ${BASE_URL} (${error.message}). Is the backend running?`,
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }

  if (!res.ok) {
    const error = new Error(data?.message || `Upload failed (${res.status})`);
    // The importer explains itself in the payload; keep it for the UI.
    error.detail = data || null;
    throw error;
  }
  return data;
}

const query = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
};

export const api = {
  health: () => request("/health"),

  // Data endpoints are scoped to one store: pass the selected storeId.
  catalog: (storeId) => request(`/catalog${query({ storeId })}`),

  forecast: (params) => request(`/forecast/tomorrow${query(params)}`),
  metrics: (params) => request(`/forecast/metrics${query(params)}`),

  posMenu: (storeId) => request(`/pos/menu${query({ storeId })}`),
  checkout: (storeId, items) =>
    post(`/pos/checkout${query({ storeId })}`, { items }),
  setItemStatus: (storeId, itemId, stockout) =>
    patch(`/pos/item-status${query({ storeId })}`, {
      item_id: itemId,
      stockout,
    }),
  transactions: (storeId, limit) =>
    request(`/pos/transactions${query({ storeId, limit })}`),

  submitSales: (storeId, payload) =>
    post(`/sales/entry${query({ storeId })}`, payload),
  salesHistory: (storeId) => request(`/sales/history${query({ storeId })}`),

  // Today's sales as staged by the cashier, and the explicit publish step that
  // writes them into the store's own dataset. Checkout never writes the
  // dataset itself.
  // One day's state for the Daily Sales Log: what the till recorded, whether the
  // date is already logged, and how much history the store has.
  salesDaily: (storeId, date) =>
    request(`/sales/daily${query({ storeId, date })}`),

  // Weather is fetched server-side from the store's city; this is the preview
  // the Data Entry form shows so nobody types it.
  salesWeather: (storeId, date, refresh) =>
    request(`/sales/weather${query({ storeId, date, refresh })}`),

  // Bulk-load a store's pre-existing sales file (csv or xlsx).
  importSales: (storeId, file, options = {}) => {
    const form = new FormData();
    form.append("file", file);
    if (options.sheet) form.append("sheet", options.sheet);
    if (options.dryRun) form.append("dryRun", "true");
    return upload(`/sales/import${query({ storeId })}`, form);
  },

  recipes: (storeId) => request(`/recipes/mapping${query({ storeId })}`),
  saveRecipe: (storeId, itemId, recipe) =>
    post(`/recipes/mapping${query({ storeId })}`, { item_id: itemId, recipe }),

  accountProfile: () => request("/account/profile"),
  accountStores: () => request("/account/stores"),
  accountStock: (storeId) => request(`/account/stock${query({ storeId })}`),
  setStockLevel: (storeId, ingredient, unit, onHand) =>
    patch(`/account/stock${query({ storeId })}`, {
      ingredient,
      unit,
      on_hand: onHand,
    }),

  me: () => request("/account/me"),
  login: (email, password) => post("/account/login", { email, password }),
  register: (data) => post("/account/register", data),
  logout: () => request("/account/logout", { method: "POST" }),
  initialize: () => post("/account/initialize", {}),

  firm: () => request("/firm"),
  firmCreate: (firmName) => post("/firm", { firmName }),
  firmJoin: (firmId) => post("/account/firm-request", { firmId }),
  firmAccept: (firmId, email) => post(`/firm/${firmId}/accept`, { email }),
  firmReject: (firmId, email) => post(`/firm/${firmId}/reject`, { email }),

  stores: () => request("/stores"),
  storeLocations: () => request("/stores/locations"),
  storeCreate: (storeName, city) => post("/stores", { storeName, city }),
  storeRename: (storeId, storeName, city) =>
    patch(`/stores/${storeId}`, { storeName, city }),
  storeDelete: (storeId) => request(`/stores/${storeId}`, { method: "DELETE" }),
  storeInitialize: (storeId, options = {}) =>
    post(`/stores/${storeId}/initialize`, options),
  storeMenu: (storeId) => request(`/stores/${storeId}/menu`),
  storeMenuCreate: (storeId, item) => post(`/stores/${storeId}/menu`, item),
  storeMenuUpdate: (storeId, itemId, item) =>
    patch(`/stores/${storeId}/menu/${itemId}`, item),
  storeMenuDelete: (storeId, itemId) =>
    request(`/stores/${storeId}/menu/${itemId}`, { method: "DELETE" }),
};

export { BASE_URL };
