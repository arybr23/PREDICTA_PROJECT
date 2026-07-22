"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { RechartsDevtools } from "@recharts/devtools";

import { Card } from "@/components/ui/Card";
import type { FeatureWeight } from "@/types";

export function FeatureInfluenceChart({ data }: { data: FeatureWeight[] }) {
  return (
    <Card>
      <h3 className="text-card-title text-text-primary mb-4">
        Feature Influence
      </h3>
      <p className="text-caption text-text-secondary mb-5">
        LightGBM feature weights driving tomorrow&rsquo;s forecast
      </p>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 20 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              domain={[0, "dataMax + 0.05"]}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
            />
            <YAxis
              type="category"
              dataKey="feature"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              width={140}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                fontSize: 13,
              }}
              formatter={(value) => [
                `${(Number(value) * 100).toFixed(0)}%`,
                "Weight",
              ]}
            />
            <Bar
              dataKey="weight"
              fill="#fa8112"
              radius={[0, 6, 6, 0]}
              barSize={24}
            />
            <RechartsDevtools />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 space-y-1.5">
        {data.map((f) => (
          <div
            key={f.feature}
            className="flex items-center justify-between text-caption text-text-secondary"
          >
            <span className="font-medium text-text-primary">{f.feature}</span>
            <span>{f.description}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
