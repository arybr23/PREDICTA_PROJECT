const stores = [
  { id: 1, name: "Bistro Nusantara — Central Park", status: "open" },
  { id: 2, name: "Bistro Nusantara — Mall of Indonesia", status: "closed" },
  { id: 3, name: "Warung Predicta — Kelapa Gading", status: "open" },
  { id: 4, name: "Bistro Nusantara — Pondok Indah", status: "closed" },
];

function StoreList() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-text-main">Store List</h2>
      <p className="text-sm text-text-muted">Outlets managed by your firm</p>

      <ul className="mt-4 space-y-3">
        {stores.map((store) => (
          <li
            key={store.id}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-3"
          >
            <span className="text-sm font-medium text-text-main">{store.name}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                store.status === "open"
                  ? "bg-primary/10 text-primary"
                  : "bg-bg text-text-muted"
              }`}
            >
              {store.status === "open" ? "Open" : "Closed"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default StoreList;
