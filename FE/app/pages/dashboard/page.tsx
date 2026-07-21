import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TomorrowForecastCard } from "@/app/pages/dashboard/components/TomorrowForecastCard";
import { RequiredIngredientsCard } from "@/app/pages/dashboard/components/RequiredIngredientsCard";
import { PredictedItemSalesCard } from "@/app/pages/dashboard/components/PredictedItemSalesCard";
import { SdgImpactCard } from "@/app/pages/dashboard/components/SdgImpactCard";
import { forecast, predictedSales, requiredIngredients } from "@/data/mockData";

export default function DashboardPage() {
  return (
    <DashboardLayout title="Dashboard">
      <TomorrowForecastCard forecast={forecast} />
      <div className="grid grid-cols-2 gap-6">
        <RequiredIngredientsCard ingredients={requiredIngredients} />
        <PredictedItemSalesCard items={predictedSales} />
      </div>
      <SdgImpactCard />
    </DashboardLayout>
  );
}
