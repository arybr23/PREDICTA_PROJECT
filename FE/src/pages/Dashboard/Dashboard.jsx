import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useApi } from "../../lib/useApi";
import { useStores } from "../../lib/StoreContext";
import { ErrorBlock, SkeletonBlock } from "../../globalComponents/AsyncState";
import WorkspaceGate from "../../globalComponents/WorkspaceGate";
import StoreGate from "../../globalComponents/StoreGate";
import EmptyState from "../../globalComponents/EmptyState";
import HeroForecastCard from "./components/HeroForecastCard";
import IngredientsTable from "./components/IngredientsTable";
import SalesBreakdown from "./components/SalesBreakdown";
import OperationalMetrics from "./components/OperationalMetrics";

function Dashboard() {
  const { selectedStoreId } = useStores();

  return (
    <WorkspaceGate
      title="Dashboard"
      subtitle="Forecast engine and operational metrics"
      emptyTitle="No predictions yet"
      emptyDescription="Forecasts, ingredients, and metrics will appear here once your workspace is set up."
    >
      <StoreGate
        title="Dashboard"
        subtitle="Forecast engine and operational metrics"
      >
        {/* Remounting per store drops the previous store's figures. */}
        <DashboardContent key={selectedStoreId} />
      </StoreGate>
    </WorkspaceGate>
  );
}

function DashboardContent() {
  const { selectedStoreId, selectedStore } = useStores();
  const forecast = useApi(
    () => api.forecast({ storeId: selectedStoreId }),
    [selectedStoreId]
  );
  const metrics = useApi(
    () => api.metrics({ storeId: selectedStoreId }),
    [selectedStoreId]
  );
  const [refreshing, setRefreshing] = useState(false);

  const hasForecast = Boolean(forecast.data && !forecast.data.empty);
  const hasMetrics = Boolean(metrics.data && !metrics.data.empty);
  const storeName = selectedStore?.storeName || "this store";

  const recalculate = async () => {
    setRefreshing(true);
    try {
      const [fresh, freshMetrics] = await Promise.all([
        api.forecast({ storeId: selectedStoreId, refresh: 1 }),
        api.metrics({ storeId: selectedStoreId }),
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
            {hasForecast
              ? `Forecast by ${forecast.data.model} · history through ${forecast.data.history_through}`
              : forecast.loading
                ? "Loading forecast engine…"
                : `${storeName} · forecast engine on standby`}
          </p>
        </div>
        <button
          type="button"
          onClick={recalculate}
          disabled={refreshing || forecast.loading || !hasForecast}
          className="shrink-0 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-bg disabled:opacity-50"
        >
          {refreshing ? "Recalculating…" : "Recalculate"}
        </button>
      </div>

      {forecast.loading && <SkeletonBlock className="h-40" lines={3} />}
      {forecast.error && <ErrorBlock error={forecast.error} onRetry={forecast.reload} />}
      {hasForecast && <HeroForecastCard forecast={forecast.data} />}
      {forecast.data?.empty && (
        <EmptyState
          title="No sales history yet"
          description={`Once ${storeName} logs its first day of sales, tomorrow's forecast and ingredient plan will appear here.`}
        >
          <Link
            to="/data-entry"
            className="inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Log this store's sales
          </Link>
        </EmptyState>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {forecast.loading ? (
          <>
            <SkeletonBlock lines={6} />
            <SkeletonBlock lines={6} />
          </>
        ) : hasForecast ? (
          <>
            <IngredientsTable ingredients={forecast.data.ingredients} />
            <SalesBreakdown items={forecast.data.menu_breakdown} />
          </>
        ) : null}
      </div>

      {metrics.loading && <SkeletonBlock lines={3} />}
      {metrics.error && <ErrorBlock error={metrics.error} onRetry={metrics.reload} />}
      {hasMetrics && <OperationalMetrics metrics={metrics.data} />}
      {metrics.data?.empty && (
        <EmptyState
          title="Not enough history for metrics"
          description="Accuracy and savings appear once this store has logged a few days of sales."
        />
      )}
    </div>
  );
}

export default Dashboard;
