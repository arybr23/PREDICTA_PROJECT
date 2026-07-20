import { Trash2 } from "lucide-react";
import { MetricCard } from "@/components/ui/MetricCard";
import type { MetricCard as MetricCardData } from "@/types";

interface WasteMitigationCardProps {
  metric: MetricCardData;
}

/** Bottom-row card showing expected spoilage percentage. */
export function WasteMitigationCard({ metric }: WasteMitigationCardProps) {
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
