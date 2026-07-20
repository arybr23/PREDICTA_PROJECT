import { Zap } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import type { MetricCard as MetricCardData } from "@/types";

interface UtilityOptimizationCardProps {
  metric: MetricCardData;
}

/** Bottom-row card showing utility consumption status. */
export function UtilityOptimizationCard({ metric }: UtilityOptimizationCardProps) {
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
