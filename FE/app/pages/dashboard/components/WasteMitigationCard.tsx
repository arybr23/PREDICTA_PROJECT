import { Trash2 } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import type { MetricCard as MetricCardData } from "@/types";

export function WasteMitigationCard({ metric }: { metric: MetricCardData }) {
  return (
    <MetricCard
      title={metric.title}
      value={metric.value}
      caption={metric.caption}
      icon={Trash2}
      tone={metric.tone}
    />
  );
}
