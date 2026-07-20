import { useState } from "react";
import { Sparkles } from "lucide-react";
import { NavigationItem } from "@/components/ui/NavigationItem";
import type { NavItem } from "@/types";

interface SidebarProps {
  items: NavItem[];
  activeId?: string;
}

/** Fixed-width vertical navigation for the dashboard shell. */
export function Sidebar({ items, activeId = "dashboard" }: SidebarProps) {
  const [active, setActive] = useState(activeId);

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col justify-between border-r border-border bg-card px-4 py-6">
      <div>
        <div className="flex items-center gap-2 px-2 mb-8">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-text-primary">
            PREDICTA
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavigationItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={active === item.id}
              onClick={() => setActive(item.id)}
            />
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <NavigationItem label="Help" icon="HelpCircle" onClick={() => {}} />
        <NavigationItem label="Logout" icon="LogOut" onClick={() => {}} />
      </div>
    </aside>
  );
}
