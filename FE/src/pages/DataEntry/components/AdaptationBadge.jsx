const adaptationData = {
  day: 7,
  status: "Personalization Active",
  progress: 70,
};

function AdaptationBadge() {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-muted">
            AI Adaptation Progress
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">
              Day {adaptationData.day}
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {adaptationData.status}
            </span>
          </div>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-primary/20">
          <span className="text-lg font-bold text-primary">
            {adaptationData.progress}%
          </span>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-bg">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${adaptationData.progress}%` }}
        />
      </div>
    </section>
  );
}

export default AdaptationBadge;
