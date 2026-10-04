import { useMemo, useState } from "react";
import { formatCurrency } from "../../../lib/format";
import { filterMenuItems } from "../../../lib/menuFilter";

/**
 * The cashier's menu, as a vertical list.
 *
 * A grid works when everything is visible at once, but a store with a long menu
 * means scrolling and hunting. A list puts the name, price and availability on
 * one line each and leaves room for the search box, which filters by name or
 * item id as you type.
 *
 * The sold-out switch lives on the row rather than in a separate panel, so the
 * state you are changing is the state you are looking at. It is the same
 * `store.stockouts` flag the Data Entry page edits.
 */
function MenuList({
  items = [],
  stockouts = {},
  onAddToCart,
  onToggleStockout,
  pendingItemId = null,
}) {
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const filtered = useMemo(() => filterMenuItems(items, query), [items, query]);

  const soldOutCount = items.filter((i) => stockouts[i.item_id]).length;

  const handleAdd = (item) => {
    if (stockouts[item.item_id]) return;
    setSelectedItem(item.id);
    onAddToCart(item);
    setTimeout(() => setSelectedItem(null), 300);
  };

  return (
    <section className="rounded-xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border p-4">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the menu…"
            aria-label="Search menu items"
            className="w-full rounded-lg border border-border bg-bg py-2.5 pl-9 pr-3 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
          <span>
            {filtered.length} item{filtered.length === 1 ? "" : "s"}
            {query.trim() && <> matching “{query.trim()}”</>}
          </span>
          {soldOutCount > 0 && (
            <span className="rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent-dark">
              {soldOutCount} sold out
            </span>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="p-10 text-center text-sm text-text-muted">
          {items.length === 0
            ? "No items in this category."
            : `Nothing matches “${query.trim()}”.`}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((item) => {
            const isOut = Boolean(stockouts[item.item_id]);
            const isSelected = selectedItem === item.id;
            const isPending = pendingItemId === item.item_id;

            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  isOut ? "bg-bg/40" : isSelected ? "bg-primary/5" : ""
                }`}
              >
                {/* Adding to the cart is the row's main action. It is a sibling
                    of the switch, not a parent, because nesting buttons is
                    invalid and would make the switch unreachable. */}
                <button
                  type="button"
                  disabled={isOut}
                  onClick={() => handleAdd(item)}
                  className={`flex min-w-0 flex-1 items-center gap-3 text-left transition-opacity ${
                    isOut ? "cursor-not-allowed opacity-50" : "hover:opacity-80"
                  }`}
                >
                  <span className="shrink-0 text-2xl leading-none" aria-hidden="true">
                    {item.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text-main">
                      {item.name}
                    </span>
                    <span className="block truncate text-xs text-text-muted">
                      {item.category}
                      {isOut && " · sold out"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-primary">
                    {formatCurrency(item.price)}
                  </span>
                </button>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isOut}
                  aria-label={`Mark ${item.name} as sold out`}
                  title={isOut ? "Back in stock" : "Mark as sold out"}
                  disabled={isPending}
                  onClick={() => onToggleStockout(item.item_id)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                    isOut ? "bg-accent" : "border border-border bg-bg"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      isOut ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default MenuList;
