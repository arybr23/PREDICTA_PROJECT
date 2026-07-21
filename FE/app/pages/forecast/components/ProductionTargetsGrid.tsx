import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

interface ProductionTarget {
  name: string;
  portions: number;
  change: string;
  reason: string;
  trend: "up" | "down" | "stable";
}

const productionTargets: ProductionTarget[] = [
  { name: "Nasi Goreng Spec.", portions: 85, change: "+12%", reason: "Payday", trend: "up" },
  { name: "Ayam Geprek", portions: 60, change: "-5%", reason: "Rain", trend: "down" },
  { name: "Es Teh Manis", portions: 40, change: "0%", reason: "Stable", trend: "stable" },
];

export function ProductionTargetsGrid() {
  return (
    <Card>
      <h3 className="text-card-title text-text-primary mb-5">Production Targets</h3>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="pb-3 text-left text-caption font-medium uppercase tracking-wide text-text-secondary">Menu Item</th>
            <th className="pb-3 text-right text-caption font-medium uppercase tracking-wide text-text-secondary">Predicted Demand</th>
            <th className="pb-3 text-right text-caption font-medium uppercase tracking-wide text-text-secondary">Change</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {productionTargets.map((t) => (
            <tr key={t.name}>
              <td className="py-3 text-body text-text-primary font-medium">{t.name}</td>
              <td className="py-3 text-right text-body text-text-primary">{t.portions} Portions</td>
              <td className="py-3 text-right">
                <span className={cn(
                  "inline-flex items-center gap-1 rounded-pill px-2.5 py-1 text-caption font-medium",
                  t.trend === "up" ? "bg-success-light text-success" : t.trend === "down" ? "bg-danger-light text-danger" : "bg-background text-text-secondary"
                )}>
                  {t.change} ({t.reason})
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
