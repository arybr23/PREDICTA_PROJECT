import { formatCurrency } from "../../../lib/format";

function OrderReceipt({
  cart,
  taxRate = 0.1,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
}) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(subtotal * taxRate);
  const total = subtotal + tax;
  const taxLabel = `Tax (${Math.round(taxRate * 100)}%)`;

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-surface shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-lg font-semibold text-text-main">Current Order</h2>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClearCart}
            className="rounded-lg border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-border/50 hover:text-text-main"
          >
            Clear All
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 text-center">
          <span className="mb-2 text-4xl">🛒</span>
          <p className="text-sm text-text-muted">No items yet</p>
          <p className="text-xs text-text-muted">
            Tap a menu item to add it
          </p>
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-2 overflow-y-auto px-5 py-3">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-bg/40 px-3 py-2.5"
              >
                <span className="text-xl">{item.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-main">
                    {item.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatCurrency(item.price)} each
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      item.qty <= 1
                        ? onRemoveItem(item.id)
                        : onUpdateQuantity(item.id, item.qty - 1)
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-sm font-bold text-text-main transition-colors hover:bg-bg"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-semibold text-text-main">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onUpdateQuantity(item.id, item.qty + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-surface text-sm font-bold text-text-main transition-colors hover:bg-bg"
                  >
                    +
                  </button>
                </div>
                <span className="w-20 text-right text-sm font-semibold text-text-main">
                  {formatCurrency(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-border px-5 py-4">
            <div className="flex justify-between text-sm text-text-muted">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-text-muted">
              <span>{taxLabel}</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-text-main">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default OrderReceipt;
