import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useApi, useMutation } from "../../lib/useApi";
import { useStores } from "../../lib/StoreContext";
import { formatCurrency } from "../../lib/format";
import { ErrorBlock, LoadingBlock } from "../../globalComponents/AsyncState";
import WorkspaceGate from "../../globalComponents/WorkspaceGate";
import StoreGate from "../../globalComponents/StoreGate";
import EmptyState from "../../globalComponents/EmptyState";
import CategoryNav from "./components/CategoryNav";
import MenuList from "./components/MenuList";
import OrderReceipt from "./components/OrderReceipt";
import CheckoutBar from "./components/CheckoutBar";

function Cashier() {
  const { selectedStoreId } = useStores();

  return (
    <WorkspaceGate
      title="Point of Sale"
      subtitle="Select items and manage orders"
      emptyTitle="No menu yet"
      emptyDescription="Menu items, categories, and checkout will appear here once your workspace is set up."
    >
      <StoreGate title="Point of Sale" subtitle="Select items and manage orders">
        {/* Remounting per store drops any cart or flags from the previous one. */}
        <CashierContent key={selectedStoreId} />
      </StoreGate>
    </WorkspaceGate>
  );
}

function CashierContent() {
  const { selectedStoreId, selectedStore } = useStores();
  const menu = useApi(() => api.posMenu(selectedStoreId), [selectedStoreId]);
  const checkout = useMutation();
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [cart, setCart] = useState([]);
  const [stockOverrides, setStockOverrides] = useState({});
  const [pendingStockoutId, setPendingStockoutId] = useState(null);
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
    setPendingStockoutId(itemId);
    setStatusError(null);
    try {
      await api.setItemStatus(selectedStoreId, itemId, next);
      // The switch is the same store.stockouts flag the Data Entry page edits,
      // so a change here is what that page reads when it next loads.
    } catch (err) {
      setStockOverrides((prev) => ({ ...prev, [itemId]: !next }));
      setStatusError(err.message);
    } finally {
      setPendingStockoutId(null);
    }
  };

  const handleCheckout = async () => {
    const items = cart.map((c) => ({ item_id: c.item_id, qty: c.qty }));
    const { ok, value } = await checkout.run(() =>
      api.checkout(selectedStoreId, items)
    );
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
          {selectedStore?.storeName || "POS Active"}
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
          <span className="ml-2 text-text-muted">
            Recorded in today&rsquo;s sales — publish it from the{" "}
            <Link to="/data-entry" className="font-medium text-primary underline">
              Data Entry
            </Link>{" "}
            page.
          </span>
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

      {menu.data && !menu.data.items.length && (
        <EmptyState
          title="No menu yet"
          description={`${selectedStore?.storeName || "This store"} has no menu items yet, so the cashier stays disabled. A manager can add them on the Menu page, or post a demo dataset from Data Entry to add them in one step.`}
        />
      )}

      {menu.data && menu.data.items.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <CategoryNav
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
            {/* The sold-out switch is on each row, so this one list covers both
                the menu and the mid-shift stockout flagging. */}
            <MenuList
              items={filtered}
              stockouts={stockouts}
              onAddToCart={addToCart}
              onToggleStockout={toggleStockout}
              pendingItemId={pendingStockoutId}
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
