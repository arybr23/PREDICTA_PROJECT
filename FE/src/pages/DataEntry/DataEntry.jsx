import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useApi, useMutation } from "../../lib/useApi";
import { ErrorBlock, LoadingBlock } from "../../globalComponents/AsyncState";
import WorkspaceGate from "../../globalComponents/WorkspaceGate";
import AdaptationBadge from "./components/AdaptationBadge";
import DailyLogForm from "./components/DailyLogForm";
import StockoutToggle from "./components/StockoutToggle";
import RecipeTemplateBuilder from "./components/RecipeTemplateBuilder";

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function DataEntry() {
  return (
    <WorkspaceGate
      title="Data Entry &amp; Adaptation"
      subtitle="Log daily sales and adapt the forecast model"
      emptyTitle="No entries yet"
      emptyDescription="Daily logs, stockout tracking, and recipe templates will appear here once your workspace is set up."
    >
      <DataEntryContent />
    </WorkspaceGate>
  );
}

function DataEntryContent() {
  const catalog = useApi(() => api.catalog(), []);
  const metrics = useApi(() => api.metrics(), []);
  const recipes = useApi(() => api.recipes(), []);
  const submit = useMutation();
  const saveRecipe = useMutation();

  const [date, setDate] = useState(localToday);
  const [weather, setWeather] = useState("cerah");
  const [temperature, setTemperature] = useState("29");
  const [sales, setSales] = useState({});
  const [stockouts, setStockouts] = useState({});

  const items = catalog.data?.items || [];

  const defaultRecipes = useMemo(() => {
    const base = recipes.data?.defaults || {};
    return { ...base, ...(recipes.data?.overrides || {}) };
  }, [recipes.data]);

  const handleSalesChange = (itemId, value) => {
    setSales((prev) => ({ ...prev, [itemId]: value }));
  };

  const handleStockoutChange = (itemId) => {
    setStockouts((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleSubmit = async () => {
    const entries = items
      .map((item) => ({
        item_id: item.item_id,
        units_sold: Number(sales[item.item_id] ?? 0),
        stockout: Boolean(stockouts[item.item_id]),
      }))
      .filter((entry) => Number.isFinite(entry.units_sold));

    if (!entries.length) return;

    const { ok } = await submit.run(() =>
      api.submitSales({
        date,
        weather,
        temperature: Number(temperature) || undefined,
        entries,
      })
    );

    if (ok) {
      setSales({});
      metrics.reload();
    }
  };

  const handleSaveRecipe = async (itemId, recipe) => {
    const { ok } = await saveRecipe.run(() => api.saveRecipe(itemId, recipe));
    if (ok) recipes.reload();
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <h1 className="text-2xl font-bold text-text-main">
        Data Entry &amp; Adaptation
      </h1>

      <AdaptationBadge
        adaptation={metrics.data?.adaptation}
        loading={metrics.loading}
      />

      {submit.result && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-text-main">
          <span className="font-semibold">{submit.result.message}</span>
          {submit.result.training && (
            <span className="ml-2 text-text-muted">
              model {submit.result.training.output_model} · MAE{" "}
              {submit.result.training.mae_before} → {submit.result.training.mae_after}
            </span>
          )}
        </div>
      )}
      {submit.error && (
        <div
          className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm text-accent-dark"
          role="alert"
        >
          {submit.error.message}
        </div>
      )}

      {catalog.loading && <LoadingBlock label="Loading catalog…" />}
      {catalog.error && <ErrorBlock error={catalog.error} onRetry={catalog.reload} />}

      {catalog.data && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DailyLogForm
              items={items}
              date={date}
              weather={weather}
              temperature={temperature}
              sales={sales}
              stockouts={stockouts}
              onDateChange={setDate}
              onWeatherChange={setWeather}
              onTemperatureChange={setTemperature}
              onSalesChange={handleSalesChange}
              onStockoutChange={handleStockoutChange}
              onSubmit={handleSubmit}
              submitting={submit.pending}
            />
            <StockoutToggle
              items={items}
              stockouts={stockouts}
              onToggle={handleStockoutChange}
            />
          </div>

          {recipes.loading ? (
            <LoadingBlock label="Loading recipes…" />
          ) : (
            <RecipeTemplateBuilder
              items={items}
              defaultRecipes={defaultRecipes}
              onSave={handleSaveRecipe}
              saving={saveRecipe.pending}
            />
          )}
        </>
      )}
    </div>
  );
}

export default DataEntry;
