import { formatDate, formatNumber, formatWeather } from "../../../lib/format";

function HeroForecastCard({ forecast }) {
  const { totals, context, target_date: targetDate } = forecast;

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium text-text-muted">
          Tomorrow&apos;s Forecast
        </p>
        <p className="text-xs font-medium text-text-muted">
          {formatDate(targetDate)}
        </p>
      </div>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-[40px] font-bold leading-none text-text-main">
          {formatNumber(totals?.portions)}
        </span>
        <span className="pb-1 text-lg font-semibold text-text-muted">
          portions
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent-dark">
          {formatWeather(context?.weather)}, {context?.temperature}°C
        </span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {context?.is_holiday ? "Public Holiday" : "No Holiday"}
        </span>
        <span className="rounded-full bg-bg px-3 py-1 text-xs font-medium text-text-muted">
          {context?.weekday}
        </span>
        <span className="rounded-full bg-bg px-3 py-1 text-xs font-medium text-text-muted">
          {context?.hijri_date}
        </span>
        {context?.is_ramadan && (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            Ramadan
          </span>
        )}
      </div>

      <p className="mt-4 text-xs text-text-muted">
        {formatNumber(totals?.distinct_items)} menu items ·{" "}
        {formatNumber(totals?.ingredient_lines)} raw ingredients to source
      </p>
    </section>
  );
}

export default HeroForecastCard;
