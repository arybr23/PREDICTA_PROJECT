import type { ReactNode } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { businessProfile, navItems } from "@/data/mockData";

interface DashboardLayoutProps {
  title: string;
  children: ReactNode;
}

export function DashboardLayout({ title, children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar items={navItems} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar title={title} lastUpdated="Today, 06:00 AM" profile={businessProfile} />
        <main className="flex-1 overflow-y-auto scrollbar-none">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
