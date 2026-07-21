"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Card } from "@/components/ui/Card";
import type { DailyComparison } from "@/types";

export function ConvergenceChart({ data }: { data: DailyComparison[] }) {
  return (
    <Card>
      <h3 className="text-card-title text-text-primary mb-1">Predicted vs Actual Sales</h3>
      <p className="text-caption text-text-secondary mb-5">7-day convergence tracking</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ left: -10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7280" }} />
          <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e5e7eb", fontSize: 13 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="predicted" stroke="#fa8112" strokeWidth={2.5} dot={{ r: 4, fill: "#fa8112" }} name="Predicted" />
          <Line type="monotone" dataKey="actual" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4, fill: "#22c55e" }} name="Actual" />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
