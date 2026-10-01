import { useState } from "react";
import { formatCurrency } from "../../../lib/format";

function MenuGrid({ items = [], stockouts = {}, onAddToCart }) {
  const [selectedItem, setSelectedItem] = useState(null);

  const handleAdd = (item) => {
    if (stockouts[item.item_id]) return;
    setSelectedItem(item.id);
    onAddToCart(item);
    setTimeout(() => setSelectedItem(null), 300);
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-10 text-center text-sm text-text-muted shadow-sm">
        No items in this category.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const isOut = stockouts[item.item_id];
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
              {formatCurrency(item.price)}
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
