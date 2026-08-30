function CheckoutBar({ cart, onCheckout }) {
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const tax = total * 0.08;
  const grandTotal = total + tax;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-6 py-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-muted">
          {itemCount} {itemCount === 1 ? "item" : "items"} in order
        </p>
        <p className="text-2xl font-bold text-text-main">
          ${grandTotal.toFixed(2)}
        </p>
      </div>

      <button
        type="button"
        disabled={cart.length === 0}
        onClick={onCheckout}
        className={`rounded-lg px-8 py-3 text-base font-bold text-white shadow-sm transition-all ${
          cart.length === 0
            ? "cursor-not-allowed bg-border text-text-muted"
            : "bg-primary hover:bg-primary-dark hover:shadow-md active:scale-[0.98]"
        }`}
      >
        Checkout
      </button>
    </div>
  );
}

export default CheckoutBar;
