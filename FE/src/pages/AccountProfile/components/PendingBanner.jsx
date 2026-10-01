function PendingBanner({ firmName, firmId }) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800"
      role="status"
      aria-live="polite"
    >
      <span className="mt-1.5 h-2 w-2 shrink-0 animate-pulse rounded-full bg-amber-500" />
      <div className="min-w-0">
        <p className="font-semibold">Join request pending</p>
        <p className="mt-0.5 text-amber-700">
          Your request to join {firmName || "the firm"}
          {firmId ? ` (${firmId})` : ""} is waiting for approval from the firm
          admin. Predictions, POS, and data entry are already unlocked.
        </p>
      </div>
    </div>
  );
}

export default PendingBanner;
