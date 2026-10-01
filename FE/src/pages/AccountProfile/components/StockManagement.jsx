import { useState } from "react";
import { formatNumber, formatQuantity } from "../../../lib/format";

const STATUS_STYLES = {
  short: { label: "Short", className: "bg-accent/20 text-accent-dark" },
  low: { label: "Low", className: "bg-accent/10 text-accent-dark" },
  ok: { label: "OK", className: "bg-primary/10 text-primary" },
  unknown: { label: "—", className: "bg-bg text-text-muted" },
};

function StockManagement({ items = [], forecast, forecastError, onUpdate, saving }) {
  const [drafts, setDrafts] = useState({});

  const rowKey = (item) => `${item.ingredient}::${item.unit}`;
  const shortCount = items.filter((i) => i.status === "short").length;

  const commit = (item) => {
    const k = rowKey(item);
    const raw = drafts[k];
    if (raw === undefined) return;
    const value = Number(raw);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[k];
      return next;
    });
    if (Number.isFinite(value) && value >= 0 && value !== item.on_hand) {
      onUpdate?.(item.ingredient, item.unit, value);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-main">
            Stock Management
          </h2>
          <p className="text-sm text-text-muted">
            Current ingredients in storage
          </p>
        </div>
        {shortCount > 0 && (
          <span className="shrink-0 rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent-dark">
            {shortCount} short
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-text-muted">
        {forecast
          ? `Compared against the ${forecast.target_date} forecast`
          : forecastError
            ? "Forecast unavailable — showing on-hand stock only"
            : "Loading requirement…"}
        {saving ? " · saving…" : ""}
      </p>

      <div className="mt-4 max-h-[28rem] overflow-y-auto pr-1">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-surface">
            <tr className="border-b border-border text-xs font-medium text-text-muted">
              <th className="pb-2">Ingredient</th>
              <th className="pb-2 text-right">On hand</th>
              <th className="pb-2 text-right">Need</th>
              <th className="pb-2 text-right">Cover</th>
              <th className="pb-2 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const k = rowKey(item);
              const style = STATUS_STYLES[item.status] || STATUS_STYLES.unknown;
              const value = drafts[k] ?? item.on_hand;

              return (
                <tr
                  key={k}
                  className="border-b border-border/50 last:border-0"
                >
                  <td className="py-2.5 pr-2 font-medium text-text-main">
                    {item.ingredient}
                  </td>
                  <td className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={value}
                        onChange={(e) =>
                          setDrafts((prev) => ({ ...prev, [k]: e.target.value }))
                        }
                        onBlur={() => commit(item)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                        }}
                        aria-label={`On hand ${item.ingredient}`}
                        className="w-20 rounded-lg border border-border bg-bg px-2 py-1 text-right text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
                      />
                      <span className="w-8 text-left text-xs text-text-muted">
                        {item.unit}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 text-right text-text-muted">
                    {item.required_tomorrow == null
                      ? "—"
                      : formatQuantity(item.required_tomorrow, item.unit)}
                  </td>
                  <td className="py-2.5 text-right text-text-muted">
                    {item.days_of_cover == null
                      ? "—"
                      : `${formatNumber(item.days_of_cover)}d`}
                  </td>
                  <td className="py-2.5 text-right">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${style.className}`}
                    >
                      {style.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {items.length === 0 && (
          <p className="py-6 text-center text-sm text-text-muted">
            No stock records yet.
          </p>
        )}
      </div>
    </section>
  );
}

export default StockManagement;
