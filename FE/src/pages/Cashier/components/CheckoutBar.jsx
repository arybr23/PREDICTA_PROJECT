import { formatCurrency } from "../../../lib/format";

function CheckoutBar({ cart, taxRate = 0.1, onCheckout, pending = false }) {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = Math.round(subtotal * taxRate);
  const grandTotal = subtotal + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const disabled = cart.length === 0 || pending;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-6 py-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-muted">
          {itemCount} {itemCount === 1 ? "item" : "items"} in order
        </p>
        <p className="text-2xl font-bold text-text-main">
          {formatCurrency(grandTotal)}
        </p>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={onCheckout}
        className={`rounded-lg px-8 py-3 text-base font-bold text-white shadow-sm transition-all ${
          disabled
            ? "cursor-not-allowed bg-border text-text-muted"
            : "bg-primary hover:bg-primary-dark hover:shadow-md active:scale-[0.98]"
        }`}
      >
        {pending ? "Processing…" : "Checkout"}
      </button>
    </div>
  );
}

export default CheckoutBar;
