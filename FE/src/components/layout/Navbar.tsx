import { useState } from "react";
import { ChevronDown, Store } from "lucide-react";
import type { BusinessProfile } from "@/types";
import { cn } from "@/lib/cn";

interface NavbarProps {
  title: string;
  lastUpdated: string;
  profile: BusinessProfile;
}

/** Top navigation bar: page title, freshness indicator, and profile switcher. */
export function Navbar({ title, lastUpdated, profile }: NavbarProps) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-border bg-card px-8">
      <div className="flex items-baseline gap-3">
        <h1 className="text-dashboard-title text-text-primary">{title}</h1>
        <span className="text-body text-text-secondary">Last updated: {lastUpdated}</span>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3.5 py-2 hover:bg-background transition-colors"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-light text-primary">
            <Store className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          <span className="text-small-title text-text-primary">{profile.name}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 text-text-secondary transition-transform",
              open && "rotate-180"
            )}
          />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-soft-lg z-10">
            <button className="w-full rounded-lg px-3 py-2 text-left text-body text-text-primary hover:bg-background transition-colors">
              Switch business
            </button>
            <button className="w-full rounded-lg px-3 py-2 text-left text-body text-text-primary hover:bg-background transition-colors">
              Account settings
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
