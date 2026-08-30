const categories = ["All Items", "Food", "Drinks", "Snacks"];

function CategoryNav({ activeCategory, onCategoryChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onCategoryChange(cat)}
          className={`whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
            activeCategory === cat
              ? "bg-primary text-white shadow-sm"
              : "border border-border bg-surface text-text-muted hover:bg-bg hover:text-text-main"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}

export default CategoryNav;
