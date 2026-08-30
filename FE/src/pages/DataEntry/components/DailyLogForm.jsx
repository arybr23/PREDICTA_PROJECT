import { useState } from "react";

const menuItems = [
  { id: 1, name: "Grilled Chicken Bowl" },
  { id: 2, name: "Lamb Kebab Plate" },
  { id: 3, name: "Veggie Stir-Fry" },
  { id: 4, name: "Fish Tacos" },
  { id: 5, name: "Caesar Salad" },
];

function DailyLogForm() {
  const [sales, setSales] = useState(
    Object.fromEntries(menuItems.map((item) => [item.id, ""]))
  );

  const handleChange = (id, value) => {
    setSales((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-text-main">
        Daily Sales Log
      </h2>
      <p className="mb-4 text-sm text-text-muted">
        Enter actual end-of-day sales figures for each menu item.
      </p>

      <div className="space-y-3">
        {menuItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4"
          >
            <label
              htmlFor={`sales-${item.id}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-text-main"
            >
              {item.name}
            </label>
            <input
              id={`sales-${item.id}`}
              type="number"
              min="0"
              placeholder="0"
              value={sales[item.id]}
              onChange={(e) => handleChange(item.id, e.target.value)}
              className="w-24 rounded-lg border border-border bg-bg px-3 py-2 text-right text-sm text-text-main outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
            />
          </div>
        ))}
      </div>

      <button className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark">
        Submit Daily Log
      </button>
    </section>
  );
}

export default DailyLogForm;
