function FirmCard({ firmName, firmId, role }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-xl font-semibold text-text-main">
          {firmName || "Your firm"}
        </h2>
        {firmId && <p className="text-sm text-text-muted">{firmId}</p>}

        <div className="flex flex-wrap gap-3 pt-1">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium capitalize text-primary">
            {role || "member"}
          </span>
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
            Active
          </span>
        </div>
      </div>

      <p className="mt-4 text-sm text-text-muted">
        Your firm is set up. Predictions, POS, and data entry are unlocked.
      </p>
    </section>
  );
}

export default FirmCard;
