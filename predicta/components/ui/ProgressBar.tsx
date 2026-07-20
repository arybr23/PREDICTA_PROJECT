import { cn } from "@/lib/cn";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  trackClassName?: string;
  fillClassName?: string;
}

export function ProgressBar({ value, max, className, trackClassName = "bg-primary-light", fillClassName = "bg-primary" }: ProgressBarProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-2 w-full rounded-pill overflow-hidden", trackClassName, className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
      <div className={cn("h-full rounded-pill transition-all duration-500", fillClassName)} style={{ width: `${percent}%` }} />
    </div>
  );
}
