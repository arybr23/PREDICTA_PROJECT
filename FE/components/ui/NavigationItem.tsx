import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

interface NavigationItemProps {
  label: string;
  icon: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

export function NavigationItem({ label, icon, href, active = false, onClick }: NavigationItemProps) {
  const Icon = (Icons as unknown as Record<string, LucideIcon>)[icon] ?? Icons.Circle;

  const className = cn(
    "group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-small-title transition-colors",
    active ? "bg-primary-light text-primary" : "text-text-secondary hover:bg-background hover:text-text-primary"
  );
  const iconClassName = cn(
    "h-4.5 w-4.5 shrink-0",
    active ? "text-primary" : "text-text-secondary group-hover:text-text-primary"
  );

  if (href) {
    return (
      <Link href={href} aria-current={active ? "page" : undefined} className={className}>
        <Icon className={iconClassName} strokeWidth={2.25} />
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={className}>
      <Icon className={iconClassName} strokeWidth={2.25} />
      <span>{label}</span>
    </button>
  );
}
