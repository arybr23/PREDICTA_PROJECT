"use client";

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { ShoppingCart, Receipt } from "lucide-react";
import type { PosMenuItem, SaleEntry } from "@/types";
import { posMenuItems, initialSaleEntries } from "@/data/mockData";

export function PosTerminal({ onNewSale }: { onNewSale?: (sale: SaleEntry) => void }) {
  const [sales, setSales] = useState<SaleEntry[]>(initialSaleEntries);

  const addSale = useCallback((item: PosMenuItem) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
    const newSale: SaleEntry = {
      id: `s-${Date.now()}`,
      timestamp: time,
      itemName: `1x ${item.name}`,
      quantity: 1,
      total: item.price,
    };
    setSales((prev) => [newSale, ...prev]);
    onNewSale?.(newSale);
  }, [onNewSale]);

  const totalItems = sales.reduce((sum, s) => sum + s.quantity, 0);
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);

  return (
    <>
      <Card>
        <CardHeader title="Quick Cashier POS Terminal" icon={ShoppingCart} />
        <div className="grid grid-cols-2 gap-2.5">
          {posMenuItems.map((item) => (
            <button
              key={item.id} type="button"
              onClick={() => addSale(item)}
              className="rounded-xl border border-border bg-background px-4 py-3 text-left hover:bg-primary-light hover:border-primary transition-colors"
            >
              <p className="text-small-title text-text-primary font-medium">+ {item.name}</p>
              <p className="text-caption text-text-secondary mt-0.5">Rp {item.price.toLocaleString()}</p>
            </button>
          ))}
        </div>
        <p className="text-caption text-text-secondary mt-4">Total Today: {totalItems} Items</p>
      </Card>

      <Card>
        <CardHeader title="Real-Time Live Sales Feed" icon={Receipt} />
        <div className="space-y-2 max-h-[280px] overflow-y-auto scrollbar-none">
          {sales.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg bg-background px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-body text-text-primary font-medium">{s.itemName}</p>
                <p className="text-caption text-text-secondary">{s.timestamp}</p>
              </div>
              <p className="text-body text-text-primary font-medium shrink-0 ml-3">Rp {s.total.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3 mt-3">
          <p className="text-small-title text-text-secondary">Today&rsquo;s Revenue</p>
          <p className="text-hero-metric text-primary">Rp {totalRevenue.toLocaleString()}</p>
        </div>
      </Card>
    </>
  );
}
