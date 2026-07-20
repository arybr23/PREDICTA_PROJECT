import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TomorrowForecastCard } from "@/app/pages/dashboard/components/TomorrowForecastCard";
import { RequiredIngredientsCard } from "@/app/pages/dashboard/components/RequiredIngredientsCard";
import { PredictedItemSalesCard } from "@/app/pages/dashboard/components/PredictedItemSalesCard";
import { WasteMitigationCard } from "@/app/pages/dashboard/components/WasteMitigationCard";
import { UtilityOptimizationCard } from "@/app/pages/dashboard/components/UtilityOptimizationCard";
import { EstimatedCostSavedCard } from "@/app/pages/dashboard/components/EstimatedCostSavedCard";
import {
  forecast,
  predictedSales,
  requiredIngredients,
  summaryMetrics,
} from "@/data/mockData";

const [wasteMetric, utilityMetric, costSavedMetric] = summaryMetrics;

export default function DashboardPage() {
  return (
    <DashboardLayout title="Dashboard">
      <div className="grid grid-cols-2 gap-6">
        <TomorrowForecastCard forecast={forecast} />
        <PredictedItemSalesCard items={predictedSales} />
      </div>
      <RequiredIngredientsCard ingredients={requiredIngredients} />
      <div className="grid grid-cols-3 gap-6">
        <WasteMitigationCard metric={wasteMetric} />
        <UtilityOptimizationCard metric={utilityMetric} />
        <EstimatedCostSavedCard metric={costSavedMetric} />
      </div>
    </DashboardLayout>
  );
}
