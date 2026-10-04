import { useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useApi, useMutation } from "../../lib/useApi";
import { ErrorBlock, LoadingBlock } from "../../globalComponents/AsyncState";
import WorkspaceGate from "../../globalComponents/WorkspaceGate";
import StoreGate from "../../globalComponents/StoreGate";
import EmptyState from "../../globalComponents/EmptyState";
import { useStores } from "../../lib/StoreContext";
import AdaptationBadge from "./components/AdaptationBadge";
import DailyLogForm from "./components/DailyLogForm";
import ImportHistoryPanel from "./components/ImportHistoryPanel";
import StockoutToggle from "./components/StockoutToggle";
import RecipeTemplateBuilder from "./components/RecipeTemplateBuilder";

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function DataEntry() {
  const { selectedStoreId } = useStores();

  return (
    <WorkspaceGate
      title="Data Entry &amp; Adaptation"
      subtitle="Log daily sales and adapt the forecast model"
      emptyTitle="No entries yet"
      emptyDescription="Daily logs, stockout tracking, and recipe templates will appear here once your workspace is set up."
    >
      <StoreGate
        title="Data Entry &amp; Adaptation"
        subtitle="Log daily sales and adapt the forecast model"
      >
        {/* Remounting per store drops figures typed for the previous one. */}
        <DataEntryContent key={selectedStoreId} />
      </StoreGate>
    </WorkspaceGate>
  );
}

function DataEntryContent() {
  const { selectedStoreId, selectedStore, refreshStores } = useStores();
  const catalog = useApi(() => api.catalog(selectedStoreId), [selectedStoreId]);
  const metrics = useApi(
    () => api.metrics({ storeId: selectedStoreId }),
    [selectedStoreId]
  );
  const recipes = useApi(() => api.recipes(selectedStoreId), [selectedStoreId]);
  const submit = useMutation();
  const saveRecipe = useMutation();

  const [date, setDate] = useState(localToday);
  const [sales, setSales] = useState({});
  const [stockouts, setStockouts] = useState({});
  const [refreshingWeather, setRefreshingWeather] = useState(false);

  // What the till rang up for the chosen date, whether that date is already
  // logged, and how much history the store has. Refetched when the date changes.
  const daily = useApi(
    () => api.salesDaily(selectedStoreId, date),
    [selectedStoreId, date]
  );

  // Weather is looked up for the store's city and the chosen date, so the user
  // never types it. The entry endpoint fetches again on submit; this is the
  // preview.
  const weatherPreview = useApi(
    () => api.salesWeather(selectedStoreId, date),
    [selectedStoreId, date]
  );

  // Stable reference: `catalog.data?.items || []` would build a new array on
  // every render, which would in turn defeat the memos below.
  const items = useMemo(() => catalog.data?.items || [], [catalog.data]);

  const stagedById = useMemo(() => {
    const map = new Map();
    for (const entry of daily.data?.staged?.entries || []) {
      map.set(entry.item_id, entry);
    }
    return map;
  }, [daily.data]);

  // Typed values win; anything the user has not touched falls back to what the
  // till recorded. Derived rather than seeded into state, so a refetch can never
  // clobber an edit in progress.
  const effectiveSales = useMemo(() => {
    const out = {};
    for (const item of items) {
      const typed = sales[item.item_id];
      if (typed !== undefined && typed !== "") {
        out[item.item_id] = typed;
      } else {
        const fromTill = stagedById.get(item.item_id);
        if (fromTill && fromTill.units_sold > 0) {
          out[item.item_id] = String(fromTill.units_sold);
        }
      }
    }
    return out;
  }, [items, sales, stagedById]);

  // The sold-out flag is shared with the Cashier page: the catalog carries the
  // server's value and toggling writes straight back to the same store.stockouts
  // map the POS switch edits. Typed values win locally until a refetch.
  const effectiveStockouts = useMemo(() => {
    const out = {};
    for (const item of items) {
      const typed = stockouts[item.item_id];
      out[item.item_id] =
        typed !== undefined ? typed : Boolean(item.stockout);
    }
    return out;
  }, [items, stockouts]);

  const defaultRecipes = useMemo(() => {
    const base = recipes.data?.defaults || {};
    return { ...base, ...(recipes.data?.overrides || {}) };
  }, [recipes.data]);

  const handleSalesChange = (itemId, value) => {
    setSales((prev) => ({ ...prev, [itemId]: value }));
  };

  /**
   * Sold-out is one piece of state, not a per-page one. Writing it straight
   * through means the Cashier page shows the same thing the next time it loads,
   * and vice versa.
   */
  const handleStockoutChange = async (itemId) => {
    const next = !effectiveStockouts[itemId];
    // Optimistic, with rollback, so the switch does not lag behind the click.
    setStockouts((prev) => ({ ...prev, [itemId]: next }));
    try {
      await api.setItemStatus(selectedStoreId, itemId, next);
    } catch {
      setStockouts((prev) => ({ ...prev, [itemId]: !next }));
    }
  };

  const handleSubmit = async () => {
    const entries = items
      .map((item) => ({
        item_id: item.item_id,
        units_sold: Number(effectiveSales[item.item_id] ?? 0),
        stockout: Boolean(effectiveStockouts[item.item_id]),
      }))
      .filter((entry) => Number.isFinite(entry.units_sold));

    if (!entries.length) return;

    const { ok } = await submit.run(() =>
      api.submitSales(selectedStoreId, {
        date,
        entries,
      })
    );

    if (ok) {
      setSales({});
      setStockouts({});
      // The day is now closed, so re-read to swap the form for its summary.
      daily.reload();
      metrics.reload();
      // First real data write for this store also makes it initialised.
      if (selectedStoreId && selectedStore && !selectedStore.initialized) {
        try {
          await api.storeInitialize(selectedStoreId);
          refreshStores();
        } catch {
          /* the store stays pending; the manager can seed it from Stores */
        }
      }
    }
  };

  const handleRefreshWeather = async () => {
    setRefreshingWeather(true);
    try {
      const fresh = await api.salesWeather(selectedStoreId, date, 1);
      weatherPreview.setData(fresh);
    } catch {
      /* keep showing what we have */
    } finally {
      setRefreshingWeather(false);
    }
  };

  const handleSaveRecipe = async (itemId, recipe) => {
    const { ok } = await saveRecipe.run(() =>
      api.saveRecipe(selectedStoreId, itemId, recipe)
    );
    if (ok) recipes.reload();
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-text-main">
          Data Entry &amp; Adaptation
        </h1>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {selectedStore?.storeName || "No store selected"}
        </span>
      </div>

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

      {catalog.data && !items.length && (
        <EmptyState
          title="No menu yet"
          description={`${selectedStore?.storeName || "This store"} has no menu items yet. A manager can add them from the Stores page, then daily sales can be logged here.`}
        />
      )}

      {catalog.data && items.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <DailyLogForm
              items={items}
              date={date}
              onDateChange={setDate}
              weatherPreview={weatherPreview.data}
              weatherLoading={weatherPreview.loading || refreshingWeather}
              onRefreshWeather={handleRefreshWeather}
              daily={daily.data}
              sales={effectiveSales}
              stockouts={effectiveStockouts}
              onSalesChange={handleSalesChange}
              onStockoutChange={handleStockoutChange}
              onSubmit={handleSubmit}
              submitting={submit.pending}
            />
            <StockoutToggle
              items={items}
              stockouts={effectiveStockouts}
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

          {/* One-off setup: load sales that predate this store joining the app. */}
          <ImportHistoryPanel storeId={selectedStoreId} />
        </>
      )}
    </div>
  );
}

export default DataEntry;
