import { useMemo, useState } from "react";

const UNITS = ["kg", "L", "pcs"];

function RecipeTemplateBuilder({ items = [], defaultRecipes = {}, onSave, saving }) {
  const [requested, setRequested] = useState("");
  // Edits are kept per item; anything untouched falls back to the saved recipe.
  const [drafts, setDrafts] = useState({});

  const selected = useMemo(() => {
    if (items.some((i) => i.item_id === requested)) return requested;
    return items[0]?.item_id || "";
  }, [items, requested]);

  const saved = defaultRecipes[selected] || [];
  const lines = drafts[selected] ?? saved.map((r) => ({ ...r }));

  const setLines = (updater) => {
    setDrafts((prev) => ({
      ...prev,
      [selected]: typeof updater === "function" ? updater(lines) : updater,
    }));
  };

  const selectedName = useMemo(
    () => items.find((i) => i.item_id === selected)?.name || "",
    [items, selected]
  );

  const updateLine = (index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { ingredient: "", qty: "", unit: "kg" }]);
  };

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const recipe = lines
      .filter((l) => l.ingredient.trim())
      .map((l) => ({
        ingredient: l.ingredient.trim(),
        qty: Number(l.qty) || 0,
        unit: l.unit,
      }));
    onSave?.(selected, recipe);
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-text-main">
        Recipe Template Builder
      </h2>
      <p className="mb-4 text-sm text-text-muted">
        Map ingredient multipliers for each menu item.
      </p>

      <label
        htmlFor="menu-select"
        className="mb-2 block text-sm font-medium text-text-main"
      >
        Select Menu Item
      </label>
      <select
        id="menu-select"
        value={selected}
        onChange={(e) => setRequested(e.target.value)}
        className="mb-5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-main outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
      >
        {items.map((item) => (
          <option key={item.item_id} value={item.item_id}>
            {item.name}
          </option>
        ))}
      </select>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-medium text-text-muted">
              <th className="pb-2">Ingredient</th>
              <th className="pb-2 text-right">Multiplier</th>
              <th className="pb-2 text-right">Unit</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={4} className="py-4 text-sm text-text-muted">
                  No ingredients mapped yet.
                </td>
              </tr>
            )}
            {lines.map((line, index) => (
              <tr key={index} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 pr-2">
                  <input
                    type="text"
                    value={line.ingredient}
                    onChange={(e) => updateLine(index, { ingredient: e.target.value })}
                    className="w-full rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </td>
                <td className="py-2.5 text-right">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={line.qty}
                    onChange={(e) => updateLine(index, { qty: e.target.value })}
                    className="w-24 rounded-lg border border-border bg-bg px-2 py-1.5 text-right text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </td>
                <td className="py-2.5 text-right">
                  <select
                    value={line.unit}
                    onChange={(e) => updateLine(index, { unit: e.target.value })}
                    className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2.5 pl-2 text-right">
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="rounded-md px-2 py-1 text-xs font-medium text-text-muted transition-colors hover:bg-bg hover:text-accent-dark"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={addLine}
          className="rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text-main transition-colors hover:bg-border/50"
        >
          Add Ingredient
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : `Save Recipe for ${selectedName || "Item"}`}
        </button>
      </div>
    </section>
  );
}

export default RecipeTemplateBuilder;
