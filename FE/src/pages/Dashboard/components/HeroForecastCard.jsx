function HeroForecastCard() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <p className="text-sm font-medium text-text-muted">Tomorrow&apos;s Forecast</p>

      <div className="mt-2 flex items-end gap-2">
        <span className="text-[40px] font-bold leading-none text-text-main">185</span>
        <span className="pb-1 text-lg font-semibold text-text-muted">portions</span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent-dark">
          Sunny, 28°C
        </span>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          No Holiday
        </span>
        <span className="rounded-full bg-bg px-3 py-1 text-xs font-medium text-text-muted">
          Tuesday
        </span>
      </div>
    </section>
  );
}

export default HeroForecastCard;
