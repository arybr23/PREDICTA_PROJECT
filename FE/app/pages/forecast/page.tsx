import { Cloud } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card } from "@/components/ui/Card";
import { FeatureInfluenceChart } from "@/app/pages/forecast/components/FeatureInfluenceChart";
import { ProductionTargetsGrid } from "@/app/pages/forecast/components/ProductionTargetsGrid";
import { featureWeights, forecast } from "@/data/mockData";

export default function ForecastPage() {
  return (
    <DashboardLayout title="Forecast">
      <Card className="flex flex-col items-center text-center py-10">
        <p className="text-hero-title text-text-secondary mb-2">Tomorrow&rsquo;s Forecast Details</p>
        <p className="text-hero-metric text-primary font-bold mb-1">{forecast.totalItems}</p>
        <p className="text-small-title text-text-primary mb-4">{forecast.itemLabel}</p>
        <span className="inline-flex items-center gap-2 rounded-pill bg-primary-light px-4 py-2 text-caption font-medium text-primary mb-5">
          <Cloud className="h-3.5 w-3.5" strokeWidth={2.5} />
          {forecast.weatherCondition} (+{forecast.trafficImpactPercent}% baseline)
        </span>
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-caption text-text-secondary mb-1.5">
            <span>Confidence</span>
            <span className="font-medium text-primary">94%</span>
          </div>
          <div className="h-2.5 w-full rounded-pill bg-primary-light overflow-hidden">
            <div className="h-full rounded-pill bg-primary transition-all" style={{ width: "94%" }} />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        <FeatureInfluenceChart data={featureWeights} />
        <ProductionTargetsGrid />
      </div>

      <a
        href="/pages/stocks"
        className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-small-title text-white font-medium hover:bg-primary-dark transition-colors self-start"
      >
        Review Required Stocks →
      </a>
    </DashboardLayout>
  );
}
