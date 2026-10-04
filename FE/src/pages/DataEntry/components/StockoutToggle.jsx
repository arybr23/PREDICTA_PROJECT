function StockoutToggle({ items = [], stockouts = {}, onToggle }) {
  const active = Object.values(stockouts).filter(Boolean).length;

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-text-main">
          Stockout Tracker
        </h2>
        {active > 0 && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-dark">
            {active} flagged
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-text-muted">
        Flag items that ran out of stock to capture un-censored demand. This is
        the same switch as the one on the Cashier page &mdash; changing it in
        either place updates both.
      </p>

      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.item_id}
            className="flex items-center justify-between gap-4"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-main">
              {item.name}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(stockouts[item.item_id])}
              onClick={() => onToggle(item.item_id)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                stockouts[item.item_id] ? "bg-accent" : "border border-border bg-bg"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  stockouts[item.item_id] ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            {stockouts[item.item_id] && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-dark">
                Stockout
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default StockoutToggle;
