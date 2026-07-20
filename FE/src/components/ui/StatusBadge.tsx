import type { IngredientStatus } from "@/types";
import { cn } from "@/lib/cn";

const STATUS_CONFIG: Record<
  IngredientStatus,
  { label: string; dot: string; text: string; bg: string }
> = {
  "in-stock": {
    label: "In Stock",
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success-light",
  },
  "restock-needed": {
    label: "Restock Needed",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning-light",
  },
  "out-of-stock": {
    label: "Out of Stock",
    dot: "bg-danger",
    text: "text-danger",
    bg: "bg-danger-light",
  },
};

interface StatusBadgeProps {
  status: IngredientStatus;
}

/** Colored pill used to indicate ingredient stock status. */
export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-caption font-medium",
        config.bg,
        config.text
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
