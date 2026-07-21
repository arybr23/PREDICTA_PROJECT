"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { CardHeader } from "@/components/ui/CardHeader";
import { Moon, RotateCcw } from "lucide-react";

const flags = [
  { id: "rain", label: "Heavy Evening Rain" },
  { id: "payday", label: "Payday Active" },
  { id: "event", label: "Local Event" },
  { id: "holiday", label: "Public Holiday Eve" },
];

export function NightlyReconciliation() {
  const [checked, setChecked] = useState<Record<string, boolean>>({
    rain: true, payday: true, event: false, holiday: false,
  });
  const [training, setTraining] = useState(false);

  const toggle = (id: string) => setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  const runTraining = () => {
    setTraining(true);
    setTimeout(() => setTraining(false), 2500);
  };

  return (
    <Card>
      <CardHeader title="Nightly Closing Reconciliation & Context Flags" icon={Moon} />
      <div className="flex flex-wrap gap-2 mb-5">
        {flags.map((f) => (
          <button
            key={f.id} type="button" onClick={() => toggle(f.id)}
            className={`inline-flex items-center gap-2 rounded-pill px-4 py-2 text-caption font-medium transition-colors ${
              checked[f.id]
                ? "bg-primary-light text-primary border border-primary"
                : "bg-background text-text-secondary border border-border hover:border-primary"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${checked[f.id] ? "bg-primary" : "bg-text-secondary"}`} />
            {f.label}
          </button>
        ))}
      </div>
      <button
        type="button" onClick={runTraining} disabled={training}
        className="inline-flex items-center gap-2.5 rounded-xl bg-primary px-6 py-3 text-small-title text-white font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
      >
        <RotateCcw className={`h-4 w-4 ${training ? "animate-spin" : ""}`} strokeWidth={2.25} />
        {training ? "Training LightGBM..." : "Run Nightly LightGBM Training Loop"}
      </button>
      {training && (
        <p className="text-caption text-success mt-3">init_model — incremental retraining complete ✓</p>
      )}
    </Card>
  );
}
