import { Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useStores } from "../lib/StoreContext";

/**
 * Second gate, mounted inside WorkspaceGate.
 *
 * The data pages stay empty until a store is selected in the top bar AND that
 * store has been initialised (demo data or a first data write). Children are
 * never mounted, so no data request fires while blocked.
 */
function StoreGate({ title, subtitle, children }) {
  const { user } = useAuth();
  const { stores, loading, selectedStoreId, selectedStore } = useStores();

  const isAdmin = user?.role === "admin";

  if (selectedStoreId && selectedStore && selectedStore.initialized) {
    return children;
  }

  let heading = "Select a store";
  let description = "Pick a store in the top bar to see its data.";
  let action = null;

  if (loading) {
    heading = "Loading stores…";
    description = "Checking which stores your firm has.";
  } else if (!stores.length) {
    heading = "No stores yet";
    description = isAdmin
      ? "Add your firm's first store, then set it up to unlock its data."
      : "Your firm has no stores yet. Ask an admin to add one.";
    action = isAdmin ? (
      <Link
        to="/stores"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Go to Stores
      </Link>
    ) : null;
  } else if (!selectedStoreId || !selectedStore) {
    heading = "Select a store";
    description = "Choose a store from the top bar to continue.";
  } else {
    heading = `${selectedStore.storeName} is not set up yet`;
    description = isAdmin
      ? "Add its menu and sales, or use the default demo data, to unlock this store."
      : "Ask your firm's admin to set up this store.";
    action = isAdmin ? (
      <Link
        to="/stores"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
      >
        Set up this store
      </Link>
    ) : null;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">{title}</h1>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>

      <div
        className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-text-main">{heading}</p>
        <p className="mt-1 text-sm text-text-muted">{description}</p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}

export default StoreGate;
