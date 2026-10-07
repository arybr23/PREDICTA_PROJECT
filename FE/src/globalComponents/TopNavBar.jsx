import { useAuth } from "../lib/AuthContext";
import { useStores } from "../lib/StoreContext";

const selectClass =
  "max-w-56 rounded-lg border border-border bg-bg px-3 py-1.5 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function TopNavBar() {
  const { initialized } = useAuth();
  const { stores, selectedStoreId, selectStore } = useStores();

  return (
    <nav className="sticky top-0 z-30 ml-60 flex items-center justify-between border-b border-border bg-surface px-4 py-3 shadow-sm md:px-6">
      <div className="flex items-center gap-3">
        {initialized && (
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <span>Store</span>
            <select
              value={selectedStoreId}
              onChange={(e) => selectStore(e.target.value)}
              className={selectClass}
              aria-label="Current store"
            >
              <option value="">Select a store</option>
              {stores.map((store) => (
                <option key={store.storeId} value={store.storeId}>
                  {store.storeName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          Connected
        </span>
        <span className="rounded-full bg-bg px-2.5 py-1 text-xs font-medium text-text-muted">
          Aug 26, 2026
        </span>
      </div>
    </nav>
  );
}

export default TopNavBar;
