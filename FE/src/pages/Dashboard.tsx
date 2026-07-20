import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { TomorrowForecastCard } from "@/components/dashboard/TomorrowForecastCard";
import { RequiredIngredientsCard } from "@/components/dashboard/RequiredIngredientsCard";
import { PredictedItemSalesCard } from "@/components/dashboard/PredictedItemSalesCard";
import { WasteMitigationCard } from "@/components/dashboard/WasteMitigationCard";
import { UtilityOptimizationCard } from "@/components/dashboard/UtilityOptimizationCard";
import { EstimatedCostSavedCard } from "@/components/dashboard/EstimatedCostSavedCard";
import {
  businessProfile,
  forecast,
  navItems,
  predictedSales,
  requiredIngredients,
  summaryMetrics,
} from "@/data/mockData";

const [wasteMetric, utilityMetric, costSavedMetric] = summaryMetrics;

/** Top-level dashboard screen: sidebar + navbar shell with the forecast grid. */
export default function Dashboard() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar items={navItems} activeId="dashboard" />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar
          title="Dashboard"
          lastUpdated="Today, 06:00 AM"
          profile={businessProfile}
        />

        <main className="flex-1 overflow-y-auto scrollbar-none">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-6 px-8 py-8">
            <TomorrowForecastCard forecast={forecast} />

            <div className="grid grid-cols-2 gap-6">
              <RequiredIngredientsCard ingredients={requiredIngredients} />
              <PredictedItemSalesCard items={predictedSales} />
            </div>

            <div className="grid grid-cols-3 gap-6">
              <WasteMitigationCard metric={wasteMetric} />
              <UtilityOptimizationCard metric={utilityMetric} />
              <EstimatedCostSavedCard metric={costSavedMetric} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
