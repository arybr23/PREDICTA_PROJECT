import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface CardHeaderProps {
  title: string;
  icon: LucideIcon;
  iconBgClassName?: string;
  iconColorClassName?: string;
  action?: boolean;
}

/** Icon chip + title used at the top of every dashboard card. */
export function CardHeader({
  title,
  icon: Icon,
  iconBgClassName = "bg-primary-light",
  iconColorClassName = "text-primary",
  action = false,
}: CardHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-xl",
            iconBgClassName
          )}
        >
          <Icon className={cn("h-4.5 w-4.5", iconColorClassName)} strokeWidth={2.25} />
        </span>
        <h3 className="text-card-title text-text-primary">{title}</h3>
      </div>
      {action && (
        <button
          type="button"
          className="text-text-secondary hover:text-primary transition-colors"
          aria-label={`View ${title} details`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
