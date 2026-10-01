import { formatNumber } from "../../../lib/format";

const VISIBLE_ITEMS = 8;

function SalesBreakdown({ items = [] }) {
  const top = [...items]
    .sort((a, b) => b.predicted_units - a.predicted_units)
    .slice(0, VISIBLE_ITEMS);

  const max = top.reduce((m, i) => Math.max(m, i.predicted_units), 0) || 1;

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-text-main">
        Predicted Sales Breakdown
      </h2>

      {top.length === 0 ? (
        <p className="text-sm text-text-muted">No forecast items available.</p>
      ) : (
        <div className="space-y-4">
          {top.map((item) => (
            <div key={item.item_id}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium text-text-main">
                  <span className="mr-1.5">{item.icon}</span>
                  {item.name}
                </span>
                <span className="shrink-0 text-text-muted">
                  {formatNumber(item.predicted_units)}
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${(item.predicted_units / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default SalesBreakdown;
