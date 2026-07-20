import { Wallet } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import type { MetricCard as MetricCardData } from "@/types";

export function EstimatedCostSavedCard({ metric }: { metric: MetricCardData }) {
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
