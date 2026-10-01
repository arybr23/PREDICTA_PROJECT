import { useState } from "react";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { ErrorBlock, SkeletonBlock } from "../../globalComponents/AsyncState";
import WorkspaceGate from "../../globalComponents/WorkspaceGate";
import HeroForecastCard from "./components/HeroForecastCard";
import IngredientsTable from "./components/IngredientsTable";
import SalesBreakdown from "./components/SalesBreakdown";
import OperationalMetrics from "./components/OperationalMetrics";

function Dashboard() {
  return (
    <WorkspaceGate
      title="Dashboard"
      subtitle="Forecast engine and operational metrics"
      emptyTitle="No predictions yet"
      emptyDescription="Forecasts, ingredients, and metrics will appear here once your workspace is set up."
    >
      <DashboardContent />
    </WorkspaceGate>
  );
}

function DashboardContent() {
  const forecast = useApi(() => api.forecast(), []);
  const metrics = useApi(() => api.metrics(), []);
  const [refreshing, setRefreshing] = useState(false);

  const recalculate = async () => {
    setRefreshing(true);
    try {
      const [fresh, freshMetrics] = await Promise.all([
        api.forecast({ refresh: 1 }),
        api.metrics(),
      ]);
      forecast.setData(fresh);
      metrics.setData(freshMetrics);
    } catch {
      /* keep showing current data on failure */
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Dashboard</h1>
          <p className="text-sm text-text-muted">
            {forecast.data?.model
              ? `Forecast by ${forecast.data.model} · history through ${forecast.data.history_through}`
              : "Loading forecast engine…"}
          </p>
        </div>
        <button
          type="button"
          onClick={recalculate}
          disabled={refreshing || forecast.loading}
          className="shrink-0 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-bg disabled:opacity-50"
        >
          {refreshing ? "Recalculating…" : "Recalculate"}
        </button>
      </div>

      {forecast.loading && <SkeletonBlock className="h-40" lines={3} />}
      {forecast.error && <ErrorBlock error={forecast.error} onRetry={forecast.reload} />}
      {forecast.data && <HeroForecastCard forecast={forecast.data} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {forecast.loading ? (
          <>
            <SkeletonBlock lines={6} />
            <SkeletonBlock lines={6} />
          </>
        ) : forecast.data ? (
          <>
            <IngredientsTable ingredients={forecast.data.ingredients} />
            <SalesBreakdown items={forecast.data.menu_breakdown} />
          </>
        ) : null}
      </div>

      {metrics.loading && <SkeletonBlock lines={3} />}
      {metrics.error && <ErrorBlock error={metrics.error} onRetry={metrics.reload} />}
      {metrics.data && <OperationalMetrics metrics={metrics.data} />}
    </div>
  );
}

export default Dashboard;
