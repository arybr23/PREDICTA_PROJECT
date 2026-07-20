import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface MetricCardProps {
  title: string;
  value: string;
  caption: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "info" | "neutral";
}

const TONE_CONFIG: Record<
  MetricCardProps["tone"],
  { iconBg: string; iconColor: string; valueColor: string }
> = {
  primary: { iconBg: "bg-primary-light", iconColor: "text-primary", valueColor: "text-primary" },
  success: { iconBg: "bg-success-light", iconColor: "text-success", valueColor: "text-success" },
  info: { iconBg: "bg-primary-light", iconColor: "text-primary", valueColor: "text-text-primary" },
  neutral: {
    iconBg: "bg-background",
    iconColor: "text-text-secondary",
    valueColor: "text-text-primary",
  },
};

/** Compact metric tile used for Waste Mitigation, Utility Optimization, and Cost Saved. */
export function MetricCard({ title, value, caption, icon: Icon, tone }: MetricCardProps) {
  const config = TONE_CONFIG[tone];
  return (
    <Card className="flex-1 min-w-0">
      <div className="flex items-center gap-2.5 mb-4">
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg shrink-0",
            config.iconBg
          )}
        >
          <Icon className={cn("h-4 w-4", config.iconColor)} strokeWidth={2.25} />
        </span>
        <h4 className="text-small-title text-text-secondary truncate">{title}</h4>
      </div>
      <p className={cn("text-2xl font-bold leading-tight mb-1 truncate", config.valueColor)}>
        {value}
      </p>
      <p className="text-caption text-text-secondary">{caption}</p>
    </Card>
  );
}
