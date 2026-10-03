const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

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
  catalog: () => request("/catalog"),

  forecast: (params) => request(`/forecast/tomorrow${query(params)}`),
  metrics: (params) => request(`/forecast/metrics${query(params)}`),

  posMenu: () => request("/pos/menu"),
  checkout: (items) => post("/pos/checkout", { items }),
  setItemStatus: (itemId, stockout) =>
    patch("/pos/item-status", { item_id: itemId, stockout }),
  transactions: (limit) => request(`/pos/transactions${query({ limit })}`),

  submitSales: (payload) => post("/sales/entry", payload),
  salesHistory: () => request("/sales/history"),

  recipes: () => request("/recipes/mapping"),
  saveRecipe: (itemId, recipe) =>
    post("/recipes/mapping", { item_id: itemId, recipe }),

  accountProfile: () => request("/account/profile"),
  accountStores: () => request("/account/stores"),
  accountStock: () => request("/account/stock"),
  setStockLevel: (ingredient, unit, onHand) =>
    patch("/account/stock", { ingredient, unit, on_hand: onHand }),

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
  storeCreate: (storeName) => post("/stores", { storeName }),
  storeRename: (storeId, storeName) => patch(`/stores/${storeId}`, { storeName }),
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
