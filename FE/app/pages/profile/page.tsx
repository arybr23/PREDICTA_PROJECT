import { Store, Cpu, BookOpen } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { cn } from "@/lib/cn";
import { dbDiagnostics, recipeMatrix, storeInfo } from "@/data/mockData";

export default function ProfilePage() {
  return (
    <DashboardLayout title="Profile">
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader title="UMKM Merchant Profile" icon={Store} />
          <div className="space-y-0 divide-y divide-border">
            {storeInfo.slice(0, 5).map((item) => (
              <div key={item.label} className="flex items-center justify-between py-3">
                <span className="text-body text-text-secondary">{item.label}</span>
                <span className="text-body text-text-primary font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="AI Model Diagnostics Hub" icon={Cpu} />
          <div className="space-y-3">
            {dbDiagnostics.map((d) => (
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
      </div>

      <Card>
        <CardHeader title="Recipe Inventory Mapping Matrix" icon={BookOpen} />
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="pb-3 text-left text-caption font-medium uppercase tracking-wide text-text-secondary">Menu Item</th>
              <th className="pb-3 text-left text-caption font-medium uppercase tracking-wide text-text-secondary">Mapped Ingredient</th>
              <th className="pb-3 text-right text-caption font-medium uppercase tracking-wide text-text-secondary">Unit Ratio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {recipeMatrix.map((r) =>
              r.baseIngredients.map((ing, idx) => (
                <tr key={`${r.menuItem}-${idx}`}>
                  {idx === 0 && (
                    <td className="py-3 text-body text-text-primary font-medium" rowSpan={r.baseIngredients.length}>
                      {r.menuItem}
                    </td>
                  )}
                  <td className="py-3 text-body text-text-secondary">{ing.name}</td>
                  <td className="py-3 text-right text-body text-text-secondary">
                    {ing.amount} {ing.unit}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </DashboardLayout>
  );
}
