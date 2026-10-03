import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";
import { useAuth } from "./AuthContext";

const StoreContext = createContext(null);
const STORAGE_KEY = "predicta.selectedStoreId";

/**
 * Holds the firm's stores and the store currently selected in the top bar.
 *
 * The selection is what gates the data pages: they stay empty until a store
 * is selected AND that store is initialised. Selection is persisted in
 * localStorage so a reload keeps the same store; it is validated against the
 * freshly fetched store list and ignored once that store no longer exists.
 *
 * `stores` is null until the first fetch settles, which is the loading state.
 */
export function StoreProvider({ children }) {
  const { user } = useAuth();

  const [stores, setStores] = useState(null);
  const [validated, setValidated] = useState(false);
  const [storedStoreId, setStoredStoreId] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "",
  );

  const refreshStores = useCallback(async () => {
    if (!user) return;

    try {
      const res = await api.stores();
      setStores(res.stores || []);
      setValidated(true);
    } catch {
      // Not part of a firm (403) or unreachable — treat as no stores, but
      // keep the stored selection if we have never managed to load.
      setStores((prev) => prev || []);
    }
  }, [user]);

  useEffect(() => {
    refreshStores();
  }, [refreshStores]);

  // A stored selection only counts once we know it maps to a real store.
  // `stores` is null until the first fetch settles.
  const knownStores = user ? stores || [] : [];
  const loading = Boolean(user) && stores === null;
  const active = Boolean(user) && validated;
  const storeExists = knownStores.some((store) => store.storeId === storedStoreId);
  const selectedStoreId = !storedStoreId || (active && !storeExists) ? "" : storedStoreId;
  const selectedStore = storeExists
    ? knownStores.find((store) => store.storeId === selectedStoreId)
    : null;

  // Forget a selection whose store has been removed.
  useEffect(() => {
    if (!active || storeExists || !storedStoreId) return;
    localStorage.removeItem(STORAGE_KEY);
  }, [active, storeExists, storedStoreId]);

  const selectStore = useCallback((storeId) => {
    setStoredStoreId(storeId || "");
    if (storeId) {
      localStorage.setItem(STORAGE_KEY, storeId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  return (
    <StoreContext.Provider
      value={{
        stores: knownStores,
        loading,
        selectedStoreId,
        selectedStore,
        selectStore,
        refreshStores,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStores() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStores must be used within StoreProvider");
  return ctx;
}
