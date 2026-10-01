import { formatCurrency } from "../../../lib/format";

function OperationalMetrics({ metrics }) {
  const { adaptation } = metrics;

  const cards = [
    {
      label: "Waste Reduction",
      value: `${metrics.waste_reduction_pct}%`,
      description: `accuracy ${metrics.accuracy_pct}%`,
      color: "text-primary",
    },
    {
      label: "Cost Savings",
      value: formatCurrency(metrics.estimated_monthly_savings),
      description: "this month",
      color: "text-accent-dark",
    },
    {
      label: "Model Health",
      value: `Day ${adaptation.day}`,
      description: adaptation.status,
      color: "text-primary",
    },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map((m) => (
        <div
          key={m.label}
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
