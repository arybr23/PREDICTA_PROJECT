const ingredients = [
  { id: 1, name: "Chicken Breast", weight: 12.5, unit: "kg" },
  { id: 2, name: "Basmati Rice", weight: 8.2, unit: "kg" },
  { id: 3, name: "Olive Oil", weight: 2.0, unit: "L" },
  { id: 4, name: "Bell Peppers", weight: 4.8, unit: "kg" },
  { id: 5, name: "Garlic", weight: 1.2, unit: "kg" },
  { id: 6, name: "Onions", weight: 3.5, unit: "kg" },
];

function IngredientsTable() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-text-main">
        Required Ingredients
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium text-text-muted">
              <th className="pb-2">Ingredient</th>
              <th className="pb-2 text-right">Weight</th>
              <th className="pb-2 text-right">Unit</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2.5 font-medium text-text-main">
                  {item.name}
                </td>
                <td className="py-2.5 text-right text-text-main">
                  {item.weight}
                </td>
                <td className="py-2.5 text-right text-text-muted">
                  {item.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default IngredientsTable;
