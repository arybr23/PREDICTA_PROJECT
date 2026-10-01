function StoreList({ stores = [], flaggedItems = 0 }) {
  const openCount = stores.filter((s) => s.isOpen).length;

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-main">Store List</h2>
          <p className="text-sm text-text-muted">Outlets managed by your firm</p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {openCount}/{stores.length} open
        </span>
      </div>

      {stores.length === 0 ? (
        <p className="mt-4 text-sm text-text-muted">No stores registered.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {stores.map((store) => (
            <li
              key={store.storeId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-main">
                  {store.storeName}
                </p>
                <p className="text-xs text-text-muted">{store.storeId}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  store.isOpen
                    ? "bg-primary/10 text-primary"
                    : "bg-bg text-text-muted"
                }`}
              >
                {store.isOpen ? "Open" : "Closed"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {flaggedItems > 0 && (
        <p className="mt-4 rounded-lg bg-accent/10 px-3 py-2 text-xs font-medium text-accent-dark">
          {flaggedItems} item{flaggedItems === 1 ? "" : "s"} currently flagged sold out
        </p>
      )}
    </section>
  );
}

export default StoreList;
