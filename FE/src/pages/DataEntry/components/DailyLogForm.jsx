import { formatDate } from "../../../lib/format";

const WEATHER_OPTIONS = [
  { value: "cerah", label: "Sunny (cerah)" },
  { value: "berawan", label: "Cloudy (berawan)" },
  { value: "hujan_ringan", label: "Light rain (hujan ringan)" },
  { value: "hujan_deras", label: "Heavy rain (hujan deras)" },
  { value: "panas_extreme", label: "Extreme heat (panas ekstrem)" },
];

function DailyLogForm({
  items = [],
  date,
  weather,
  temperature,
  sales,
  stockouts,
  onDateChange,
  onWeatherChange,
  onTemperatureChange,
  onSalesChange,
  onStockoutChange,
  onSubmit,
  submitting,
}) {
  const filled = Object.values(sales).filter((v) => v !== "" && Number(v) >= 0).length;

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-text-main">
        Daily Sales Log
      </h2>
      <p className="mb-4 text-sm text-text-muted">
        Enter actual end-of-day sales figures for each menu item.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
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
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>
        <div>
          <label
            htmlFor="log-weather"
            className="mb-1 block text-xs font-medium text-text-muted"
          >
            Weather
          </label>
          <select
            id="log-weather"
            value={weather}
            onChange={(e) => onWeatherChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          >
            {WEATHER_OPTIONS.map((w) => (
              <option key={w.value} value={w.value}>
                {w.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="log-temp"
            className="mb-1 block text-xs font-medium text-text-muted"
          >
            Temperature (°C)
          </label>
          <input
            id="log-temp"
            type="number"
            step="0.1"
            value={temperature}
            onChange={(e) => onTemperatureChange(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>
      </div>

      <p className="mb-3 text-xs text-text-muted">{formatDate(date)}</p>

      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.item_id}
            className="flex items-center justify-between gap-3"
          >
            <label
              htmlFor={`sales-${item.item_id}`}
              className="min-w-0 flex-1 truncate text-sm font-medium text-text-main"
            >
              {item.name}
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
        ))}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting}
        className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        {submitting
          ? "Saving & retraining model…"
          : `Submit Daily Log (${filled} item${filled === 1 ? "" : "s"})`}
      </button>
    </section>
  );
}

export default DailyLogForm;
