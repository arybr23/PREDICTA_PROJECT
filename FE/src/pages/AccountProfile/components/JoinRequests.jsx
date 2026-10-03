import { useState } from "react";
import { api } from "../../../lib/api";
import { useApi, useMutation } from "../../../lib/useApi";
import { ErrorBlock, LoadingBlock } from "../../../globalComponents/AsyncState";

/**
 * Admin-only panel on the Account page: everyone currently asking to join the
 * firm, with an accept / reject action per request.
 */
function JoinRequests({ firmId }) {
  const requests = useApi(() => api.firm(), [firmId]);
  const accept = useMutation();
  const reject = useMutation();
  const [error, setError] = useState(null);

  const pending = requests.data?.firm?.accountRequest || [];
  const busy = accept.pending || reject.pending;

  const handleAccept = async (request) => {
    setError(null);
    const { ok, error: err } = await accept.run(() =>
      api.firmAccept(firmId, request.email),
    );
    if (ok) {
      requests.reload();
    } else {
      setError(err.message);
    }
  };

  const handleReject = async (request) => {
    const label = request.name || request.email;
    if (!window.confirm(`Decline ${label}'s request to join your firm?`)) return;

    setError(null);
    const { ok, error: err } = await reject.run(() =>
      api.firmReject(firmId, request.email),
    );
    if (ok) {
      requests.reload();
    } else {
      setError(err.message);
    }
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-main">Join requests</h2>
          <p className="mt-0.5 text-sm text-text-muted">
            People asking to join your firm
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {pending.length} pending
        </span>
      </div>

      {error && (
        <div
          className="mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm text-accent-dark"
          role="alert"
        >
          {error}
        </div>
      )}

      {requests.loading && <LoadingBlock label="Loading requests…" />}
      {requests.error && (
        <ErrorBlock error={requests.error} onRetry={requests.reload} />
      )}

      {!requests.loading && !requests.error && pending.length === 0 && (
        <p className="mt-4 text-sm text-text-muted">
          No pending requests. Share your firm ID so others can ask to join.
        </p>
      )}

      {pending.length > 0 && (
        <ul className="mt-4 space-y-3">
          {pending.map((request) => (
            <li
              key={request.email}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-text-main">
                  {request.name || request.email}
                </p>
                <p className="truncate text-xs text-text-muted">
                  {request.email}
                  {request.role ? ` · ${request.role}` : ""}
                  {request.storeId ? ` · ${request.storeId}` : ""}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleAccept(request)}
                  disabled={busy}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  {accept.pending ? "Accepting…" : "Accept"}
                </button>
                <button
                  type="button"
                  onClick={() => handleReject(request)}
                  disabled={busy}
                  className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent-dark transition-colors hover:bg-accent/5 disabled:opacity-50"
                >
                  {reject.pending ? "Rejecting…" : "Reject"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default JoinRequests;
