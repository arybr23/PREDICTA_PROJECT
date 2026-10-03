import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useApi, useMutation } from "../../lib/useApi";
import { formatCurrency } from "../../lib/format";
import { ErrorBlock, LoadingBlock } from "../../globalComponents/AsyncState";
import WorkspaceGate from "../../globalComponents/WorkspaceGate";
import StoreGate from "../../globalComponents/StoreGate";
import CategoryNav from "./components/CategoryNav";
import MenuGrid from "./components/MenuGrid";
import OrderReceipt from "./components/OrderReceipt";
import StockoutFlag from "./components/StockoutFlag";
import CheckoutBar from "./components/CheckoutBar";

function Cashier() {
  return (
    <WorkspaceGate
      title="Point of Sale"
      subtitle="Select items and manage orders"
      emptyTitle="No menu yet"
      emptyDescription="Menu items, categories, and checkout will appear here once your workspace is set up."
    >
      <StoreGate title="Point of Sale" subtitle="Select items and manage orders">
        <CashierContent />
      </StoreGate>
    </WorkspaceGate>
  );
}

function CashierContent() {
  const menu = useApi(() => api.posMenu(), []);
  const checkout = useMutation();
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [cart, setCart] = useState([]);
  const [stockOverrides, setStockOverrides] = useState({});
  const [receipt, setReceipt] = useState(null);
  const [statusError, setStatusError] = useState(null);

  const taxRate = menu.data?.tax_rate ?? 0.1;

  // Server flags are the baseline; local overrides win until the next reload.
  const serverFlags = useMemo(
    () =>
      Object.fromEntries((menu.data?.items || []).map((i) => [i.item_id, i.stockout])),
    [menu.data]
  );
  const stockouts = useMemo(
    () => ({ ...serverFlags, ...stockOverrides }),
    [serverFlags, stockOverrides]
  );

  const filtered = useMemo(() => {
    if (!menu.data) return [];
    if (activeCategory === "All Items") return menu.data.items;
    return menu.data.items.filter((item) => item.category === activeCategory);
  }, [menu.data, activeCategory]);

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) => (c.id === item.id ? { ...c, qty: c.qty + 1 } : c));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQuantity = (id, qty) => {
    setCart((prev) => prev.map((c) => (c.id === id ? { ...c, qty } : c)));
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const clearCart = () => setCart([]);

  const toggleStockout = async (itemId) => {
    const next = !stockouts[itemId];
    setStockOverrides((prev) => ({ ...prev, [itemId]: next }));
    setStatusError(null);
    try {
      await api.setItemStatus(itemId, next);
    } catch (err) {
      setStockOverrides((prev) => ({ ...prev, [itemId]: !next }));
      setStatusError(err.message);
    }
  };

  const handleCheckout = async () => {
    const items = cart.map((c) => ({ item_id: c.item_id, qty: c.qty }));
    const { ok, value } = await checkout.run(() => api.checkout(items));
    if (ok) {
      setReceipt(value.transaction);
      setCart([]);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Point of Sale</h1>
          <p className="text-sm text-text-muted">
            Select items and manage orders
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          POS Active
        </span>
      </div>

      {(statusError || checkout.error) && (
        <div
          className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm text-accent-dark"
          role="alert"
        >
          {statusError || checkout.error?.message}
        </div>
      )}

      {receipt && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-text-main">
          <span className="font-semibold">Order {receipt.id} confirmed.</span>{" "}
          {receipt.units} items · {formatCurrency(receipt.total)}
          <button
            type="button"
            onClick={() => setReceipt(null)}
            className="ml-3 text-xs font-medium text-primary underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {menu.loading && <LoadingBlock label="Loading menu…" />}
      {menu.error && <ErrorBlock error={menu.error} onRetry={menu.reload} />}

      {menu.data && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <CategoryNav
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
            <MenuGrid
              items={filtered}
              stockouts={stockouts}
              onAddToCart={addToCart}
            />
            <StockoutFlag
              items={menu.data.items}
              stockouts={stockouts}
              onToggleStockout={toggleStockout}
            />
          </div>

          <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
            <OrderReceipt
              cart={cart}
              taxRate={taxRate}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onClearCart={clearCart}
            />
            <CheckoutBar
              cart={cart}
              taxRate={taxRate}
              onCheckout={handleCheckout}
              pending={checkout.pending}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default Cashier;
