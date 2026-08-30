const menuItems = [
  { id: 1, name: "Grilled Chicken Bowl", predicted: 62, max: 100 },
  { id: 2, name: "Lamb Kebab Plate", predicted: 45, max: 100 },
  { id: 3, name: "Veggie Stir-Fry", predicted: 38, max: 100 },
  { id: 4, name: "Fish Tacos", predicted: 25, max: 100 },
  { id: 5, name: "Caesar Salad", predicted: 15, max: 100 },
];

function SalesBreakdown() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-text-main">
        Predicted Sales Breakdown
      </h2>

      <div className="space-y-4">
        {menuItems.map((item) => (
          <div key={item.id}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-text-main">{item.name}</span>
              <span className="text-text-muted">{item.predicted}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${(item.predicted / item.max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default SalesBreakdown;
