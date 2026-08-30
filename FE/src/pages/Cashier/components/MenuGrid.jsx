import { useState } from "react";

const menuItems = [
  { id: 1, name: "Grilled Chicken Bowl", price: 14.50, category: "Food", icon: "🍗" },
  { id: 2, name: "Lamb Kebab Plate", price: 16.00, category: "Food", icon: "🥩" },
  { id: 3, name: "Veggie Stir-Fry", price: 12.00, category: "Food", icon: "🥦" },
  { id: 4, name: "Fish Tacos", price: 13.50, category: "Food", icon: "🌮" },
  { id: 5, name: "Caesar Salad", price: 10.00, category: "Food", icon: "🥗" },
  { id: 6, name: "Margherita Pizza", price: 15.00, category: "Food", icon: "🍕" },
  { id: 7, name: "Classic Lemonade", price: 4.50, category: "Drinks", icon: "🍋" },
  { id: 8, name: "Iced Americano", price: 5.00, category: "Drinks", icon: "☕" },
  { id: 9, name: "Mango Smoothie", price: 6.50, category: "Drinks", icon: "🥭" },
  { id: 10, name: "Sparkling Water", price: 3.00, category: "Drinks", icon: "💧" },
  { id: 11, name: "Hummus & Pita", price: 7.00, category: "Snacks", icon: "🫓" },
  { id: 12, name: "Loaded Nachos", price: 8.50, category: "Snacks", icon: "🧀" },
];

function MenuGrid({ activeCategory, stockouts, onAddToCart }) {
  const [selectedItem, setSelectedItem] = useState(null);

  const filtered =
    activeCategory === "All Items"
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  const handleAdd = (item) => {
    if (stockouts[item.id]) return;
    setSelectedItem(item.id);
    onAddToCart(item);
    setTimeout(() => setSelectedItem(null), 300);
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {filtered.map((item) => {
        const isOut = stockouts[item.id];
        const isSelected = selectedItem === item.id;

        return (
          <button
            key={item.id}
            type="button"
            disabled={isOut}
            onClick={() => handleAdd(item)}
            className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all ${
              isOut
                ? "cursor-not-allowed border-border/60 bg-bg/50 opacity-50"
                : isSelected
                  ? "scale-95 border-primary bg-primary/5 shadow-md"
                  : "border-border bg-surface shadow-sm hover:border-primary/40 hover:shadow-md active:scale-95"
            }`}
          >
            <span className="text-3xl">{item.icon}</span>
            <span className="text-sm font-medium leading-tight text-text-main">
              {item.name}
            </span>
            <span className="text-base font-bold text-primary">
              ${item.price.toFixed(2)}
            </span>
            {isOut && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent-dark">
                Sold Out
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default MenuGrid;
