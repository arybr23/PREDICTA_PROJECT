"use client";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { StockItem } from "@/types";

export function StockStatusGrid({ items }: { items: StockItem[] }) {
  const shortage = items.filter((i) => i.status === "shortage-risk");
  const safe = items.filter((i) => i.status === "safe");

  return (
    <Card>
      <h3 className="text-card-title text-text-primary mb-5">Stock Status</h3>

      {shortage.length > 0 && (
        <div className="mb-6">
          <p className="text-small-title text-danger font-medium mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-danger" />
            Shortage Risk
          </p>
          <div className="space-y-2">
            {shortage.map((item) => {
              const ratio = item.currentStock / item.requiredVolume;
              return (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-danger-light px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-text-primary font-medium">{item.name}</p>
                    <p className="text-caption text-text-secondary">
                      {item.currentStock} / {item.requiredVolume} {item.unit}
                    </p>
                  </div>
                  <div className="h-2 w-24 rounded-pill bg-white overflow-hidden ml-4 shrink-0">
                    <div className={cn("h-full rounded-pill bg-danger")} style={{ width: `${ratio * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {safe.length > 0 && (
        <div>
          <p className="text-small-title text-success font-medium mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success" />
            Safe
          </p>
          <div className="space-y-2">
            {safe.map((item) => {
              const ratio = item.currentStock / item.requiredVolume;
              return (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-success-light px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-text-primary font-medium">{item.name}</p>
                    <p className="text-caption text-text-secondary">
                      {item.currentStock} / {item.requiredVolume} {item.unit}
                    </p>
                  </div>
                  <div className="h-2 w-24 rounded-pill bg-white overflow-hidden ml-4 shrink-0">
                    <div className={cn("h-full rounded-pill bg-success")} style={{ width: `${ratio * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
