import { Zap } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import type { MetricCard as MetricCardData } from "@/types";

export function UtilityOptimizationCard({
  metric,
}: {
  metric: MetricCardData;
}) {
  return (
    <MetricCard
      title={metric.title}
      value={metric.value}
      caption={metric.caption}
      icon={Zap}
      tone={metric.tone}
    />
  );
}
