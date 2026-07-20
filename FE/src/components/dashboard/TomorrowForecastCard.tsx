import { Cloud } from "lucide-react";
import { Card } from "@/components/ui/Card";
import type { Forecast } from "@/types";

interface TomorrowForecastCardProps {
  forecast: Forecast;
}

/** Large hero card: tomorrow's total predicted item count plus context badge. */
export function TomorrowForecastCard({ forecast }: TomorrowForecastCardProps) {
  return (
    <Card className="flex flex-col items-center justify-center text-center py-14">
      <h2 className="text-hero-title text-text-secondary mb-3">
        {forecast.dayLabel}&rsquo;s Core Forecast
      </h2>
      <p className="text-hero-metric text-primary mb-2">{forecast.totalItems}</p>
      <p className="text-small-title text-text-primary mb-6">{forecast.itemLabel}</p>

      <span className="inline-flex items-center gap-2 rounded-pill bg-primary-light px-4 py-2 text-caption font-medium text-primary">
        <Cloud className="h-3.5 w-3.5" strokeWidth={2.5} />
        {forecast.weatherCondition} (+{forecast.trafficImpactPercent}% baseline traffic)
      </span>
    </Card>
  );
}
