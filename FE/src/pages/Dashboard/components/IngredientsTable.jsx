import { formatQuantity } from "../../../lib/format";

function IngredientsTable({ ingredients = [] }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-text-main">
        Required Ingredients
      </h2>

      {ingredients.length === 0 ? (
        <p className="text-sm text-text-muted">
          No ingredient mapping available yet.
        </p>
      ) : (
        <div className="max-h-96 overflow-y-auto">
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
                  key={`${item.ingredient}-${item.unit}`}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2.5 font-medium text-text-main">
                    {item.ingredient}
                  </td>
                  <td className="py-2.5 text-right text-text-main">
                    {formatQuantity(item.weight, item.unit).split(" ")[0]}
                  </td>
                  <td className="py-2.5 text-right text-text-muted">
                    {item.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default IngredientsTable;
