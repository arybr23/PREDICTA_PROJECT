import { BarChart3 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { MenuPrediction } from "@/types";

export function PredictedItemSalesCard({ items }: { items: MenuPrediction[] }) {
  return (
    <Card>
      <CardHeader title="Predicted Item Sales" icon={BarChart3} action />
      <ul className="flex flex-col gap-5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4">
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 mb-2">
                <p className="text-small-title text-text-primary truncate">
                  {item.name}
                </p>
                <p className="text-caption text-text-secondary shrink-0">
                  {item.predictedOrders} Orders
                </p>
              </div>
              <ProgressBar value={item.predictedOrders} max={item.maxOrders} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
