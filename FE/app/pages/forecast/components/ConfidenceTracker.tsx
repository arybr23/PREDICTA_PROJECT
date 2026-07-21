import { Card } from "@/components/ui/Card";

export function ConfidenceTracker({ confidence = 94 }: { confidence?: number }) {
  return (
    <Card>
      <h3 className="text-card-title text-text-primary mb-4">Forecast Confidence</h3>
      <div className="flex flex-col items-center py-4">
        <div className="relative h-28 w-28 mb-4">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#f7f8fa" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="52" fill="none" stroke="#fa8112" strokeWidth="10"
              strokeDasharray={`${(confidence / 100) * 327} 327`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-hero-metric text-primary">
            {confidence}%
          </span>
        </div>
        <p className="text-small-title text-text-primary font-medium mb-1">Model Confidence Score</p>
        <p className="text-caption text-text-secondary">Based on LightGBM ensemble of 6 features</p>
      </div>
    </Card>
  );
}
