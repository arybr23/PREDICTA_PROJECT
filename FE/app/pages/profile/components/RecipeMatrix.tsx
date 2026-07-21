import { Card } from "@/components/ui/Card";
import type { RecipeItem } from "@/types";

export function RecipeMatrix({ recipes }: { recipes: RecipeItem[] }) {
  return (
    <Card>
      <h3 className="text-card-title text-text-primary mb-5">Recipe → Ingredient Matrix</h3>
      <div className="space-y-4">
        {recipes.map((r) => (
          <div key={r.menuItem} className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-small-title text-text-primary font-medium">{r.menuItem}</p>
              <span className="text-caption text-text-secondary">Cost: {r.totalCost}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {r.baseIngredients.map((ing, idx) => (
                <span key={idx} className="inline-flex items-center gap-1 rounded-pill bg-card border border-border px-3 py-1 text-caption text-text-secondary">
                  {ing.name}
                  <span className="text-text-primary font-medium">{ing.amount}{ing.unit}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
