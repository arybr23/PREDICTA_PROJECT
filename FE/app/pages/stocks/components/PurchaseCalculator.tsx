import { ShoppingCart } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import type { PurchaseSuggestion } from "@/types";

export function PurchaseCalculator({ suggestions }: { suggestions: PurchaseSuggestion[] }) {
  return (
    <Card>
      <CardHeader title="Purchase Calculator" icon={ShoppingCart} />
      <div className="space-y-3">
        {suggestions.map((s) => {
          const purchase = s.needed - s.currentStock;
          return (
            <div key={s.id} className="rounded-xl border border-border bg-background px-4 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-small-title text-text-primary font-medium">{s.itemName}</p>
                <span className="text-body text-text-secondary">
                  {s.currentStock} / {s.needed} {s.unit}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <p className="text-caption text-text-secondary">
                  Purchase&nbsp;
                  <span className="text-hero-metric text-primary font-bold">{purchase}</span>
                  &nbsp;{s.unit}
                </p>
                <p className="text-caption text-text-secondary">
                  <span className="font-medium text-text-primary">$</span> = Need − Current
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
