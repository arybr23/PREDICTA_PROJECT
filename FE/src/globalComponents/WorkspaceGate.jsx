import { useAuth } from "../lib/AuthContext";

/**
 * Wraps a page whose content only exists once the account's workspace has been
 * set up. Until then it renders the empty interface: heading only, no data.
 * Children are never mounted (so their data hooks never fetch) while empty.
 */
function WorkspaceGate({ title, subtitle, emptyTitle, emptyDescription, children }) {
  const { initialized } = useAuth();

  if (initialized) return children;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">{title}</h1>
        <p className="text-sm text-text-muted">{subtitle}</p>
      </div>

      <div
        className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-sm"
        role="status"
        aria-live="polite"
      >
        <p className="text-sm font-semibold text-text-main">{emptyTitle}</p>
        <p className="mt-1 text-sm text-text-muted">{emptyDescription}</p>
      </div>
    </div>
  );
}

export default WorkspaceGate;
