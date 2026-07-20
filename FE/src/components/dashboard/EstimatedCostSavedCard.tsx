import { Wallet } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import type { MetricCard as MetricCardData } from "@/types";

interface EstimatedCostSavedCardProps {
  metric: MetricCardData;
}

/** Bottom-row card showing projected cost savings in Rupiah. */
export function EstimatedCostSavedCard({ metric }: EstimatedCostSavedCardProps) {
  return (
    <MetricCard
      title={metric.title}
      value={metric.value}
      caption={metric.caption}
      icon={Wallet}
      tone={metric.tone}
    />
  );
}
