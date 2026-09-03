const ingredients = [
  { id: 1, name: "Rice (Beras)", amount: "25 kg", unit: "kg" },
  { id: 2, name: "Chicken Breast", amount: "12 kg", unit: "kg" },
  { id: 3, name: "Cooking Oil", amount: "15 L", unit: "L" },
  { id: 4, name: "Shrimp Paste (Terasi)", amount: "2 kg", unit: "kg" },
  { id: 5, name: "Soy Sauce (Kecap)", amount: "8 L", unit: "L" },
  { id: 6, name: "Chili Pepper", amount: "5 kg", unit: "kg" },
  { id: 7, name: "Coconut Milk", amount: "10 L", unit: "L" },
  { id: 8, name: "Garlic", amount: "3 kg", unit: "kg" },
];

function StockManagement() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-text-main">Stock Management</h2>
      <p className="text-sm text-text-muted">Current ingredients in storage</p>

      <ul className="mt-4 space-y-2">
        {ingredients.map((item) => (
          <li
            key={item.id}
            className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5"
          >
            <span className="text-sm text-text-main">{item.name}</span>
            <span className="text-sm font-medium text-primary">{item.amount}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default StockManagement;
