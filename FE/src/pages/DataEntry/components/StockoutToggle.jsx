import { useState } from "react";

const menuItems = [
  { id: 1, name: "Grilled Chicken Bowl" },
  { id: 2, name: "Lamb Kebab Plate" },
  { id: 3, name: "Veggie Stir-Fry" },
  { id: 4, name: "Fish Tacos" },
  { id: 5, name: "Caesar Salad" },
];

function StockoutToggle() {
  const [stockouts, setStockouts] = useState(
    Object.fromEntries(menuItems.map((item) => [item.id, false]))
  );

  const toggle = (id) => {
    setStockouts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-text-main">
        Stockout Tracker
      </h2>
      <p className="mb-4 text-sm text-text-muted">
        Flag items that ran out of stock to capture un-censored demand.
      </p>

      <div className="space-y-3">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-main">
              {item.name}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={stockouts[item.id]}
              onClick={() => toggle(item.id)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                stockouts[item.id]
                  ? "bg-accent"
                  : "border border-border bg-bg"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  stockouts[item.id]
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
            {stockouts[item.id] && (
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
