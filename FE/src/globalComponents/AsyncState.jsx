export function LoadingBlock({ label = "Loading…", className = "" }) {
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-xl border border-border bg-surface p-10 text-sm text-text-muted shadow-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      {label}
    </div>
  );
}

export function SkeletonBlock({ className = "", lines = 3 }) {
  return (
    <div className={`animate-pulse space-y-3 rounded-xl border border-border bg-surface p-6 shadow-sm ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded bg-bg"
          style={{ width: `${100 - i * 12}%` }}
        />
      ))}
    </div>
  );
}

export function ErrorBlock({ error, onRetry, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-accent/40 bg-accent/5 p-6 shadow-sm ${className}`}
      role="alert"
    >
      <p className="text-sm font-semibold text-accent-dark">
        Could not load data
      </p>
      <p className="mt-1 break-words text-sm text-text-muted">
        {error?.message || "Unknown error"}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
        >
          Try again
        </button>
      )}
    </div>
  );
}
