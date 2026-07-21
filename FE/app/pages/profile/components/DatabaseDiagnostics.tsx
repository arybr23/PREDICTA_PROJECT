import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { DbDiagnostic } from "@/types";

export function DatabaseDiagnostics({ diagnostics }: { diagnostics: DbDiagnostic[] }) {
  return (
    <Card>
      <h3 className="text-card-title text-text-primary mb-5">Database Diagnostics</h3>
      <div className="space-y-3">
        {diagnostics.map((d) => (
          <div key={d.metric} className="flex items-center justify-between rounded-lg bg-background px-4 py-3">
            <div className="flex items-center gap-3">
              <span className={cn("h-2 w-2 rounded-full", d.status === "healthy" ? "bg-success" : d.status === "warning" ? "bg-warning" : "bg-danger")} />
              <span className="text-body text-text-secondary">{d.metric}</span>
            </div>
            <span className="text-body text-text-primary font-medium">{d.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
