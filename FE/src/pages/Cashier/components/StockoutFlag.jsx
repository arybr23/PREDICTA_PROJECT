function StockoutFlag({ items = [], stockouts = {}, onToggleStockout }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-text-main">
        Mid-Shift Stockout Flag
      </h2>
      <p className="mb-4 text-sm text-text-muted">
        Quickly mark items as sold out to track un-censored demand.
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
        {items.map((item) => {
          const isOut = stockouts[item.item_id];
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onToggleStockout(item.item_id)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                isOut
                  ? "border-accent/40 bg-accent/10 text-accent-dark"
                  : "border-border bg-bg text-text-main hover:border-border/80 hover:bg-border/20"
              }`}
            >
              <span className="truncate">{item.name}</span>
              {isOut && (
                <span className="ml-2 shrink-0 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                  OUT
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default StockoutFlag;
