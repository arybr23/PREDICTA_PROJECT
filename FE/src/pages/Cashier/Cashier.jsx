import { useState } from "react";
import CategoryNav from "./components/CategoryNav";
import MenuGrid from "./components/MenuGrid";
import OrderReceipt from "./components/OrderReceipt";
import StockoutFlag from "./components/StockoutFlag";
import CheckoutBar from "./components/CheckoutBar";

function Cashier() {
  const [activeCategory, setActiveCategory] = useState("All Items");
  const [cart, setCart] = useState([]);
  const [stockouts, setStockouts] = useState({});

  const addToCart = (item) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id ? { ...c, qty: c.qty + 1 } : c
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const updateQuantity = (id, qty) => {
    setCart((prev) =>
      prev.map((c) => (c.id === id ? { ...c, qty } : c))
    );
  };

  const removeItem = (id) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  };

  const clearCart = () => setCart([]);

  const toggleStockout = (id) => {
    setStockouts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCheckout = () => {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const count = cart.reduce((s, i) => s + i.qty, 0);
    alert(`Order confirmed! ${count} items — $${(total * 1.08).toFixed(2)}`);
    setCart([]);
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-main">
            Point of Sale
          </h1>
          <p className="text-sm text-text-muted">
            Select items and manage orders
          </p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          POS Active
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: Menu Area */}
        <div className="space-y-5">
          <CategoryNav
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
          <MenuGrid
            activeCategory={activeCategory}
            stockouts={stockouts}
            onAddToCart={addToCart}
          />
          <StockoutFlag
            stockouts={stockouts}
            onToggleStockout={toggleStockout}
          />
        </div>

        {/* Right: Order Sidebar */}
        <div className="space-y-4 lg:sticky lg:top-20 lg:h-fit">
          <OrderReceipt
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onClearCart={clearCart}
          />
          <CheckoutBar cart={cart} onCheckout={handleCheckout} />
        </div>
      </div>
    </div>
  );
}

export default Cashier;
