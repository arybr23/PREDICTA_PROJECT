"use client";

import { useState } from "react";
import { ShoppingCart, Download, Printer } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { cn } from "@/lib/cn";
import { purchaseSuggestions, stockItems } from "@/data/mockData";

export default function StocksPage() {
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <DashboardLayout title="Stocks">
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <h3 className="text-card-title text-text-primary mb-5">Active Stock Balance Matrix</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="pb-3 text-left text-caption font-medium uppercase tracking-wide text-text-secondary">Ingredient</th>
                <th className="pb-3 text-right text-caption font-medium uppercase tracking-wide text-text-secondary">Current</th>
                <th className="pb-3 text-right text-caption font-medium uppercase tracking-wide text-text-secondary">Predicted Need</th>
                <th className="pb-3 text-right text-caption font-medium uppercase tracking-wide text-text-secondary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stockItems.map((item) => {
                const isShort = item.status === "shortage-risk";
                return (
                  <tr key={item.id}>
                    <td className="py-3 text-body text-text-primary font-medium">{item.name}</td>
                    <td className="py-3 text-right text-body text-text-secondary">{item.currentStock} {item.unit}</td>
                    <td className="py-3 text-right text-body text-text-secondary">{item.requiredVolume} {item.unit}</td>
                    <td className="py-3 text-right">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-caption font-medium",
                        isShort ? "bg-danger-light text-danger" : "bg-success-light text-success"
                      )}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", isShort ? "bg-danger" : "bg-success")} />
                        {isShort ? "🔴 Shortage" : "🟢 Safe"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Smart Procurement Generator" icon={ShoppingCart} />
          <p className="text-caption text-text-secondary mb-4 flex items-center gap-1.5">
            <span className="text-warning">⚠</span>
            Automated Shopping List (Purchase = Need − Current):
          </p>
          <div className="space-y-2 mb-5">
            {purchaseSuggestions.map((s) => {
              const purchase = s.needed - s.currentStock;
              return (
                <label
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors",
                    selected[s.id] ? "border-primary bg-primary-light" : "border-border bg-background hover:border-primary"
                  )}
                >
                  <input
                    type="checkbox" checked={!!selected[s.id]} onChange={() => toggle(s.id)}
                    className="h-4 w-4 accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-text-primary font-medium">
                      Buy <span className="text-primary font-bold">{purchase}</span> {s.unit} {s.itemName}
                    </p>
                    <p className="text-caption text-text-secondary">Need: {s.needed} {s.unit} | Current: {s.currentStock} {s.unit}</p>
                  </div>
                </label>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-small-title text-white font-medium hover:bg-primary-dark transition-colors">
              <Download className="h-4 w-4" strokeWidth={2.25} />
              Export Shopping Checklist
            </button>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-small-title text-text-primary font-medium hover:bg-background transition-colors">
              <Printer className="h-4 w-4" strokeWidth={2.25} />
              Print Invoice
            </button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
