import { Leaf, Wallet } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { cn } from "@/lib/cn";

export function SdgImpactCard() {
  return (
    <Card>
      <h3 className="text-card-title text-text-primary mb-4 flex items-center gap-2.5">
        <Leaf className="h-5 w-5 text-primary" strokeWidth={2.25} />
        Eco-Impact &amp; Financial Sustainability Summary (UN SDG 12)
      </h3>
      <div className="flex flex-col gap-6 pt-2">
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-success-light text-success">
                <Leaf className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="text-small-title text-text-secondary">
                Waste Reduced
              </span>
            </div>
            <span className="text-small-title text-success font-bold">78%</span>
          </div>
          <ProgressBar
            value={78}
            max={100}
            trackClassName="bg-success-light"
            fillClassName="bg-success"
          />
          <p className="text-caption text-text-secondary mt-2">
            Expected spoilage minimized through predictive ordering
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary-light text-primary">
                <Wallet className="h-3.5 w-3.5" strokeWidth={2.5} />
              </span>
              <span className="text-small-title text-text-secondary">
                Financial Saved
              </span>
            </div>
            <span className="text-small-title text-primary font-bold">
              Rp450k
            </span>
          </div>
          <ProgressBar
            value={72}
            max={100}
            trackClassName="bg-primary-light"
            fillClassName="bg-primary"
          />
          <p className="text-caption text-text-secondary mt-2">
            Projected cost savings from waste reduction
          </p>
        </div>
      </div>
    </Card>
  );
}
