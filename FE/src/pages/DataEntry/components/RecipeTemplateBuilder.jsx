import { useState } from "react";

const menuItems = [
  { id: 1, name: "Grilled Chicken Bowl" },
  { id: 2, name: "Lamb Kebab Plate" },
  { id: 3, name: "Veggie Stir-Fry" },
  { id: 4, name: "Fish Tacos" },
  { id: 5, name: "Caesar Salad" },
];

const ingredients = [
  { id: 1, name: "Chicken Breast", unit: "kg" },
  { id: 2, name: "Basmati Rice", unit: "kg" },
  { id: 3, name: "Olive Oil", unit: "L" },
  { id: 4, name: "Bell Peppers", unit: "kg" },
  { id: 5, name: "Garlic", unit: "kg" },
  { id: 6, name: "Onions", unit: "kg" },
];

function buildInitialMappings() {
  const mappings = {};
  menuItems.forEach((menu) => {
    mappings[menu.id] = {};
    ingredients.forEach((ing) => {
      mappings[menu.id][ing.id] = "";
    });
  });
  return mappings;
}

function RecipeTemplateBuilder() {
  const [selectedMenu, setSelectedMenu] = useState(menuItems[0].id);
  const [mappings, setMappings] = useState(buildInitialMappings);

  const handleChange = (ingredientId, value) => {
    setMappings((prev) => ({
      ...prev,
      [selectedMenu]: {
        ...prev[selectedMenu],
        [ingredientId]: value,
      },
    }));
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
        value={selectedMenu}
        onChange={(e) => setSelectedMenu(Number(e.target.value))}
        className="mb-5 w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text-main outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
      >
        {menuItems.map((item) => (
          <option key={item.id} value={item.id}>
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
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing) => (
              <tr
                key={ing.id}
                className="border-b border-border/50 last:border-0"
              >
                <td className="py-2.5 font-medium text-text-main">{ing.name}</td>
                <td className="py-2.5 text-right">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    placeholder="0.0"
                    value={mappings[selectedMenu][ing.id]}
                    onChange={(e) => handleChange(ing.id, e.target.value)}
                    className="w-20 rounded-lg border border-border bg-bg px-2 py-1.5 text-right text-sm text-text-main outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                </td>
                <td className="py-2.5 text-right text-text-muted">{ing.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button className="mt-5 w-full rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-semibold text-text-main transition-colors hover:bg-border/50">
        Save Recipe Template
      </button>
    </section>
  );
}

export default RecipeTemplateBuilder;
