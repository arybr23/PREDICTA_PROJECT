function AdaptationBadge({ adaptation, loading }) {
  const data = adaptation || { day: 0, status: "Baseline model", progress: 0 };

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-muted">
            AI Adaptation Progress
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              Day {data.day}
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {loading ? "Checking…" : data.status}
            </span>
          </div>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-primary/20">
          <span className="text-lg font-bold text-primary">
            {data.progress}%
          </span>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${data.progress}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-text-muted">
        Each submitted daily log runs a fine-tuning pass on the forecast model.
      </p>
    </section>
  );
}

export default AdaptationBadge;
