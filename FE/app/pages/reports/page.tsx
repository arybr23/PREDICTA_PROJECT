"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PosTerminal } from "@/app/pages/reports/components/PosTerminal";
import { ConvergenceChart } from "@/app/pages/reports/components/ConvergenceChart";
import { NightlyReconciliation } from "@/app/pages/reports/components/NightlyReconciliation";
import { dailyComparison } from "@/data/mockData";
import type { SaleEntry } from "@/types";

export default function ReportsPage() {
  const [liveData, setLiveData] = useState(dailyComparison);

  const handleNewSale = (sale: SaleEntry) => {
    const last = liveData[liveData.length - 1];
    const newPoint = {
      day: last ? last.day + 0.5 : 1,
      label: "Live",
      predicted: last?.predicted ?? 180,
      actual: (last?.actual ?? 180) + sale.quantity * 2,
    };
    setLiveData((prev) => [...prev, newPoint]);
  };

  return (
    <DashboardLayout title="Reports & Live Sales">
      <div className="grid grid-cols-2 gap-6">
        <PosTerminal onNewSale={handleNewSale} />
      </div>
      <ConvergenceChart data={liveData} />
      <NightlyReconciliation />
    </DashboardLayout>
  );
}
