import { Beaker } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Ingredient } from "@/types";

interface RequiredIngredientsCardProps {
  ingredients: Ingredient[];
}

/** Table card listing tomorrow's required ingredient volumes and stock status. */
export function RequiredIngredientsCard({ ingredients }: RequiredIngredientsCardProps) {
  return (
    <Card>
      <CardHeader title="Required Ingredients" icon={Beaker} action />

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="pb-3 text-left text-caption font-medium uppercase tracking-wide text-text-secondary">
              Ingredient
            </th>
            <th className="pb-3 text-left text-caption font-medium uppercase tracking-wide text-text-secondary">
              Required Volume
            </th>
            <th className="pb-3 text-left text-caption font-medium uppercase tracking-wide text-text-secondary">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {ingredients.map((ingredient) => (
            <tr key={ingredient.id}>
              <td className="py-3.5 text-body text-text-primary font-medium">
                {ingredient.name}
              </td>
              <td className="py-3.5 text-body text-text-secondary">
                {ingredient.requiredVolume} {ingredient.unit}
              </td>
              <td className="py-3.5">
                <StatusBadge status={ingredient.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
