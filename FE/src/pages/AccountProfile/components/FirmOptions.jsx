import { useState } from "react";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";
const buttonClass =
  "w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50";

function FirmOptions() {
  const { refresh } = useAuth();

  const [firmId, setFirmId] = useState("");
  const [joinPending, setJoinPending] = useState(false);
  const [joinError, setJoinError] = useState(null);

  const [firmName, setFirmName] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoinError(null);
    setJoinPending(true);
    try {
      await api.firmJoin(firmId.trim());
      await refresh();
    } catch (err) {
      setJoinError(err.message);
    } finally {
      setJoinPending(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError(null);
    setCreatePending(true);
    try {
      await api.firmCreate(firmName.trim());
      await refresh();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreatePending(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-main">
          Set up your firm
        </h2>
        <p className="text-sm text-text-muted">
          Join an existing firm or register your own to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={handleJoin}
          className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
          <div>
            <h3 className="text-base font-semibold text-text-main">
              Join a firm
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Request access to an existing firm using its firm ID.
            </p>
          </div>

          {joinError && (
            <p className="text-sm text-accent-dark" role="alert">
              {joinError}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              Firm ID
            </label>
            <input
              type="text"
              required
              value={firmId}
              onChange={(e) => setFirmId(e.target.value)}
              className={inputClass}
              placeholder="FIRM-XXXX"
            />
          </div>

          <button
            type="submit"
            disabled={joinPending || !firmId.trim()}
            className={buttonClass}
          >
            {joinPending ? "Sending request…" : "Send request"}
          </button>
        </form>

        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-xl border border-border bg-surface p-6 shadow-sm"
        >
          <div>
            <h3 className="text-base font-semibold text-text-main">
              Register your own firm
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              Create a new firm and become its admin.
            </p>
          </div>

          {createError && (
            <p className="text-sm text-accent-dark" role="alert">
              {createError}
            </p>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-text-main">
              Firm name
            </label>
            <input
              type="text"
              required
              value={firmName}
              onChange={(e) => setFirmName(e.target.value)}
              className={inputClass}
              placeholder="My Firm Name"
            />
          </div>

          <button
            type="submit"
            disabled={createPending || !firmName.trim()}
            className={buttonClass}
          >
            {createPending ? "Creating firm…" : "Create firm"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default FirmOptions;
