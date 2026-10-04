import { formatDate, formatWeather } from "../../../lib/format";

/**
 * The Daily Sales Log — the single place a day's figures are recorded.
 *
 * It replaces the old pair of panels. What the cashier rang up is shown here and
 * offered as the starting values, so the common case is "check and save" rather
 * than re-typing. One submission publishes the day into the store's dataset,
 * hands it to the ML history, and retrains the model once the store has enough
 * history for training to mean anything.
 *
 * A day can only be logged once. When `daily.logged` is true the form is
 * replaced by a read-only summary of what was saved, because the server refuses
 * a second submission for that date.
 */
function DailyLogForm({
  items = [],
  date,
  onDateChange,
  weatherPreview,
  weatherLoading,
  onRefreshWeather,
  daily,
  sales,
  stockouts,
  onSalesChange,
  onStockoutChange,
  onSubmit,
  submitting,
}) {
  const preview = weatherPreview || {};
  const detail = preview.detail || {};
  const staged = daily?.staged || {};
  const stagedById = new Map((staged.entries || []).map((e) => [e.item_id, e]));
  const loggedEntries = daily?.logged_entries || [];
  const logged = Boolean(daily?.logged);

  const filled = Object.values(sales).filter((v) => v !== "" && Number(v) > 0).length;
  const totalUnits = Object.values(sales).reduce(
    (sum, v) => sum + (v === "" || Number(v) <= 0 ? 0 : Number(v)),
    0,
  );

  const stagedUnits = staged.totals?.units ?? 0;
  const stagedItems = staged.totals?.distinct_items ?? 0;

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="mb-1 flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold text-text-main">Daily Sales Log</h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            logged ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-dark"
          }`}
        >
          {logged ? "Logged" : "Not logged yet"}
        </span>
      </div>
      <p className="mb-4 text-sm text-text-muted">
        {logged
          ? "This day is closed. A day can only be logged once."
          : "Check the figures rung up on the Cashier page, adjust if needed, and save. Weather is fetched for this store's city."}
      </p>

      <div className="mb-4">
        <label
          htmlFor="log-date"
          className="mb-1 block text-xs font-medium text-text-muted"
        >
          Date
        </label>
        <input
          id="log-date"
          type="date"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 sm:w-56"
        />
      </div>

      <div className="mb-5 rounded-lg border border-border bg-bg p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-text-muted">
            Weather &amp; temperature
          </span>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              fetched automatically
            </span>
            {onRefreshWeather && !logged && (
              <button
                type="button"
                onClick={onRefreshWeather}
                disabled={weatherLoading}
                className="rounded-lg border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-main transition-colors hover:bg-bg disabled:opacity-50"
              >
                {weatherLoading ? "Refreshing…" : "Refresh"}
              </button>
            )}
          </div>
        </div>

        {weatherLoading && !preview.available && (
          <p className="text-sm text-text-muted">Looking up weather…</p>
        )}

        {!weatherLoading && preview.available && (
          <>
            <p className="text-sm font-medium text-text-main">
              {formatWeather(preview.weather)}
              {preview.temperature != null && (
                <span className="ml-2 tabular-nums text-text-muted">
                  {preview.temperature} °C
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-text-muted">
              {preview.location?.city}
              {detail.precipitation_sum != null && (
                <> &middot; {detail.precipitation_sum} mm rain</>
              )}
              {detail.precipitation_hours != null && (
                <> over {detail.precipitation_hours} h</>
              )}
              {detail.temperature_max != null && (
                <> &middot; {detail.temperature_min}–{detail.temperature_max} °C</>
              )}
              {preview.source && <> &middot; {preview.source}</>}
            </p>
          </>
        )}

        {!weatherLoading && !preview.available && (
          <>
            <p className="text-sm font-medium text-text-main">Weather unavailable</p>
            <p className="mt-1 text-xs text-text-muted">
              {preview.message ||
                "This store has no city set, so weather cannot be fetched."}
            </p>
          </>
        )}
      </div>

      {/* ---- Logged: read-only record of what was saved ------------------- */}
      {logged ? (
        <>
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border text-left text-xs text-text-muted">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 text-right font-medium">Units</th>
                  <th className="pb-2 text-right font-medium">Sold out</th>
                </tr>
              </thead>
              <tbody>
                {loggedEntries.map((entry) => (
                  <tr key={entry.item_id} className="border-b border-border/50">
                    <td className="py-2 pr-3 text-text-main">{entry.item_name}</td>
                    <td className="py-2 text-right tabular-nums text-text-main">
                      {entry.units_sold}
                    </td>
                    <td className="py-2 text-right">
                      {entry.stockout ? (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-dark">
                          Yes
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 border-t border-border pt-4 text-xs text-text-muted">
            {loggedEntries.length} item{loggedEntries.length === 1 ? "" : "s"} ·{" "}
            {loggedEntries.reduce((s, e) => s + e.units_sold, 0)} units recorded
            {daily?.logged_at && <> · saved {formatDate(String(daily.logged_at).slice(0, 10))}</>}
          </p>
        </>
      ) : (
        <>
          {/* ---- Not logged: the till's figures, editable ----------------- */}
          {stagedItems > 0 && (
            <div className="mb-4 rounded-lg border border-border bg-bg p-3 text-xs text-text-muted">
              <span className="font-medium text-text-main">
                {stagedItems} item{stagedItems === 1 ? "" : "s"} · {stagedUnits} units
              </span>{" "}
              rung up on the Cashier page for {formatDate(daily?.staged?.date || date)}.
              These are filled in below.
            </div>
          )}

          {daily?.is_stale_day && (
            <div className="mb-4 rounded-lg border border-border bg-bg p-3 text-xs text-text-muted">
              The Cashier page is holding an unpublished day from{" "}
              {formatDate(daily.staged?.date)}. Select that date to log it.
            </div>
          )}

          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {items.map((item) => {
              const fromTill = stagedById.get(item.item_id);
              return (
                <div key={item.item_id} className="flex items-center justify-between gap-3">
                  <label
                    htmlFor={`sales-${item.item_id}`}
                    className="min-w-0 flex-1 truncate text-sm font-medium text-text-main"
                  >
                    {item.name}
                    {fromTill && (
                      <span className="ml-2 text-xs font-normal text-text-muted">
                        {fromTill.units_sold} from till
                      </span>
                    )}
                  </label>
                  <input
                    id={`sales-${item.item_id}`}
                    type="number"
                    min="0"
                    placeholder="0"
                    value={sales[item.item_id] ?? ""}
                    onChange={(e) => onSalesChange(item.item_id, e.target.value)}
                    className="w-20 rounded-lg border border-border bg-bg px-3 py-2 text-right text-sm text-text-main outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(stockouts[item.item_id])}
                    onClick={() => onStockoutChange(item.item_id)}
                    title="Flag as sold out (un-censored demand)"
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                      stockouts[item.item_id] ? "bg-accent" : "border border-border bg-bg"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                        stockouts[item.item_id] ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-text-muted">
              {filled} item{filled === 1 ? "" : "s"} · {totalUnits} unit
              {totalUnits === 1 ? "" : "s"}
              <br />
              {daily?.will_train
                ? "The model will retrain on save."
                : `Model trains once the store has more than ${
                    daily?.min_days_to_train ?? 7
                  } days of history (currently ${daily?.history_days ?? 0}).`}
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || daily?.can_submit === false}
              className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save today's log"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default DailyLogForm;
