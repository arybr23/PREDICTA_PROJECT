/**
 * Dashed placeholder card for "this store has no data yet".
 * Same styling as the WorkspaceGate / StoreGate cards so an empty page still
 * looks like part of the interface rather than an error.
 */
function EmptyState({ title, description, children }) {
  return (
    <div
      className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <p className="text-sm font-semibold text-text-main">{title}</p>
      <p className="mt-1 text-sm text-text-muted">{description}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}

export default EmptyState;
