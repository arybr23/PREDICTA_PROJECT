import { useState } from "react";
import { api } from "../../lib/api";
import { useApi, useMutation } from "../../lib/useApi";
import { ErrorBlock, LoadingBlock } from "../../globalComponents/AsyncState";

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function Stores() {
  const stores = useApi(() => api.stores(), []);
  const add = useMutation();
  const rename = useMutation();
  const remove = useMutation();

  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState(null);

  const items = stores.data?.stores || [];

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    const { ok, error: err } = await add.run(() => api.storeCreate(name.trim()));
    if (ok) {
      setName("");
      stores.reload();
    } else {
      setError(err.message);
    }
  };

  const startEdit = (store) => {
    setError(null);
    setEditingId(store.storeId);
    setEditName(store.storeName);
  };

  const handleRename = async () => {
    setError(null);
    const { ok, error: err } = await rename.run(() =>
      api.storeRename(editingId, editName.trim()),
    );
    if (ok) {
      setEditingId(null);
      stores.reload();
    } else {
      setError(err.message);
    }
  };

  const handleDelete = async (store) => {
    if (!window.confirm(`Remove "${store.storeName}" from your firm?`)) return;
    setError(null);
    const { ok, error: err } = await remove.run(() => api.storeDelete(store.storeId));
    if (ok) {
      stores.reload();
    } else {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Stores</h1>
        <p className="text-sm text-text-muted">Manage your firm's outlets</p>
      </div>

      {error && (
        <div
          className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm text-accent-dark"
          role="alert"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleAdd}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-sm font-medium text-text-main">
            New store name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Bistro Nusantara — Central Park"
          />
        </div>
        <button
          type="submit"
          disabled={add.pending || !name.trim()}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {add.pending ? "Adding…" : "Add store"}
        </button>
      </form>

      {stores.loading && <LoadingBlock label="Loading stores…" />}
      {stores.error && <ErrorBlock error={stores.error} onRetry={stores.reload} />}

      {!stores.loading && !stores.error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm font-semibold text-text-main">No stores yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Add your firm's first store above.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-main">Store List</h2>
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {items.length} {items.length === 1 ? "store" : "stores"}
            </span>
          </div>

          <ul className="mt-4 space-y-3">
            {items.map((store) => (
              <li
                key={store.storeId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
              >
                {editingId === store.storeId ? (
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`${inputClass} min-w-0 flex-1 py-1.5`}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleRename}
                      disabled={rename.pending || !editName.trim()}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                    >
                      {rename.pending ? "Saving…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-main">
                        {store.storeName}
                      </p>
                      <p className="text-xs text-text-muted">{store.storeId}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(store)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-main transition-colors hover:bg-bg"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(store)}
                        disabled={remove.pending}
                        className="rounded-lg border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent-dark transition-colors hover:bg-accent/5 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default Stores;
