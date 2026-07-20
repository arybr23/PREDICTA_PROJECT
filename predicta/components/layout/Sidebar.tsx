"use client";

import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { NavigationItem } from "@/components/ui/NavigationItem";
import type { NavItem } from "@/types";
import { navItems } from "@/data/mockData";

interface SidebarProps {
  items: NavItem[];
}

const bottomItems = [
  { id: "help", label: "Help", icon: "HelpCircle" },
  { id: "logout", label: "Logout", icon: "LogOut" },
];

const ITEM_HREF: Record<string, string> = {};
for (const item of navItems) {
  ITEM_HREF[item.id] = item.href;
}

export function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();

  const activeId = items.find((i) => i.href === pathname)?.id ?? "dashboard";

  return (
    <aside className="flex h-full w-[248px] shrink-0 flex-col justify-between border-r border-border bg-card px-4 py-6">
      <div>
        <div className="flex items-center gap-2 px-2 mb-8">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
            <Sparkles className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-text-primary">PREDICTA</span>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((item) => (
            <NavigationItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              href={ITEM_HREF[item.id]}
              active={activeId === item.id}
            />
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        {bottomItems.map((item) => (
          <NavigationItem key={item.id} label={item.label} icon={item.icon} onClick={() => {}} />
        ))}
      </div>
    </aside>
  );
}
