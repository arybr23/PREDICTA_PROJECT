import { Beaker } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Ingredient } from "@/types";

export function RequiredIngredientsCard({
  ingredients,
}: {
  ingredients: Ingredient[];
}) {
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
          {ingredients.map((ing) => (
            <tr key={ing.id}>
              <td className="py-3.5 text-body text-text-primary font-medium">
                {ing.name}
              </td>
              <td className="py-3.5 text-body text-text-secondary">
                {ing.requiredVolume} {ing.unit}
              </td>
              <td className="py-3.5">
                <StatusBadge status={ing.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
