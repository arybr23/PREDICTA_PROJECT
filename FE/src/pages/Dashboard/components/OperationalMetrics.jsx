const metrics = [
  {
    id: 1,
    label: "Waste Reduction",
    value: "32%",
    description: "vs. last week",
    color: "text-primary",
  },
  {
    id: 2,
    label: "Cost Savings",
    value: "$1,240",
    description: "this month",
    color: "text-accent-dark",
  },
  {
    id: 3,
    label: "Model Health",
    value: "Day 7",
    description: "Personalization Active",
    color: "text-primary",
  },
];

function OperationalMetrics() {
  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {metrics.map((m) => (
        <div
          key={m.id}
          className="flex flex-col items-center rounded-xl border border-border bg-surface p-4 text-center shadow-sm"
        >
          <span className="text-xs font-medium text-text-muted">{m.label}</span>
          <span className={`mt-1 text-2xl font-bold ${m.color}`}>{m.value}</span>
          <span className="mt-0.5 text-xs text-text-muted">{m.description}</span>
        </div>
      ))}
    </section>
  );
}

export default OperationalMetrics;
