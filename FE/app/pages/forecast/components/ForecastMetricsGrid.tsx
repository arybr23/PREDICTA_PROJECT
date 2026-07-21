import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { ForecastMetric } from "@/types";

export function ForecastMetricsGrid({ metrics }: { metrics: ForecastMetric[] }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((m) => (
        <Card key={m.label} className="flex flex-col justify-center">
          <p className="text-caption text-text-secondary mb-1">{m.label}</p>
          <p className="text-hero-metric text-text-primary mb-1">{m.value}</p>
          <div className="flex items-center gap-1.5">
            {m.trend === "up" ? (
              <TrendingUp className="h-3.5 w-3.5 text-success" strokeWidth={2.5} />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-danger" strokeWidth={2.5} />
            )}
            <span className={cn("text-caption font-medium", m.trend === "up" ? "text-success" : "text-danger")}>
              {m.change}
            </span>
          </div>
        </Card>
      ))}
    </div>
  );
}
