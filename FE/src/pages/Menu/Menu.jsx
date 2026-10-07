import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useApi, useMutation } from "../../lib/useApi";
import { ErrorBlock, LoadingBlock } from "../../globalComponents/AsyncState";
import WorkspaceGate from "../../globalComponents/WorkspaceGate";
import { useStores } from "../../lib/StoreContext";

const inputClass =
  "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

// Mirrors CATEGORY_LABEL in BE/config/catalog.js.
const CATEGORIES = [
  { key: "makanan_berat", label: "Food" },
  { key: "minuman", label: "Drinks" },
  { key: "snack", label: "Snacks" },
];

function Menu() {
  return (
    <WorkspaceGate
      title="Menu"
      subtitle="Edit the menu of the selected store"
      emptyTitle="Workspace not initialised"
      emptyDescription="Set up your workspace first, then you can build each store's menu."
    >
      <MenuContent />
    </WorkspaceGate>
  );
}

function MenuContent() {
  const { stores, loading, selectedStoreId, selectedStore, refreshStores } =
    useStores();

  const menu = useApi(
    () => (selectedStoreId ? api.storeMenu(selectedStoreId) : Promise.resolve(null)),
    [selectedStoreId],
  );
  const create = useMutation();
  const update = useMutation();
  const remove = useMutation();

  const [name, setName] = useState("");
  const [itemId, setItemId] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [price, setPrice] = useState("");
  const [icon, setIcon] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState(CATEGORIES[0].key);
  const [editPrice, setEditPrice] = useState("");
  const [error, setError] = useState(null);

  const items = menu.data?.items || [];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
        <LoadingBlock label="Loading stores…" />
      </div>
    );
  }

  // A store must be picked before its menu can be edited. A store that is not
  // initialised yet is welcome here — editing its menu is how it gets set up.
  if (!selectedStoreId || !selectedStore) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Menu</h1>
          <p className="text-sm text-text-muted">Edit the menu of the selected store</p>
        </div>
        <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-sm">
          <p className="text-sm font-semibold text-text-main">Select a store</p>
          <p className="mt-1 text-sm text-text-muted">
            Choose a store from the top bar to edit its menu.
          </p>
          {stores.length === 0 && (
            <Link
              to="/stores"
              className="mt-5 inline-block rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              Go to Stores
            </Link>
          )}
        </div>
      </div>
    );
  }

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    const { ok, error: err } = await create.run(() =>
      api.storeMenuCreate(selectedStoreId, {
        name: name.trim(),
        itemId: itemId.trim() || undefined,
        category,
        price: Number(price) || 0,
        icon: icon.trim(),
      }),
    );
    if (ok) {
      setName("");
      setItemId("");
      setPrice("");
      setIcon("");
      menu.reload();
      // The backend flags the store as initialised on this first write; the
      // selector and gates need the refreshed list.
      refreshStores();
    } else {
      setError(err.message);
    }
  };

  const startEdit = (item) => {
    setError(null);
    setEditingId(item.itemId);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditPrice(String(item.price ?? ""));
  };

  const handleUpdate = async () => {
    setError(null);
    const { ok, error: err } = await update.run(() =>
      api.storeMenuUpdate(selectedStoreId, editingId, {
        name: editName.trim(),
        category: editCategory,
        price: Number(editPrice) || 0,
      }),
    );
    if (ok) {
      setEditingId(null);
      menu.reload();
      refreshStores();
    } else {
      setError(err.message);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from this store's menu?`)) return;
    setError(null);
    const { ok, error: err } = await remove.run(() =>
      api.storeMenuDelete(selectedStoreId, item.itemId),
    );
    if (ok) {
      menu.reload();
      refreshStores();
    } else {
      setError(err.message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Menu</h1>
        <p className="text-sm text-text-muted">
          {selectedStore.storeName} · {selectedStoreId}
        </p>
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
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-6 shadow-sm"
      >
        <div className="min-w-52 flex-1">
          <label className="mb-1 block text-sm font-medium text-text-main">Item name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="e.g. Es Teh Manis"
          />
        </div>
        <div className="min-w-40">
          <label className="mb-1 block text-sm font-medium text-text-main">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map((entry) => (
              <option key={entry.key} value={entry.key}>
                {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-36">
          <label className="mb-1 block text-sm font-medium text-text-main">
            Item ID
          </label>
          <input
            type="text"
            value={itemId}
            onChange={(e) => setItemId(e.target.value)}
            className={inputClass}
            placeholder="auto"
            aria-describedby="item-id-hint"
          />
        </div>
        <div className="min-w-36">
          <label className="mb-1 block text-sm font-medium text-text-main">Price</label>
          <input
            type="number"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
            placeholder="0"
          />
        </div>
        <div className="min-w-24">
          <label className="mb-1 block text-sm font-medium text-text-main">Icon</label>
          <input
            type="text"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            className={inputClass}
            placeholder="🍹"
          />
        </div>
        <button
          type="submit"
          disabled={create.pending || !name.trim()}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {create.pending ? "Adding…" : "Add item"}
        </button>
        <p id="item-id-hint" className="w-full text-xs text-text-muted">
          Optional. Set it to the code your POS uses and imported sales files
          will match this item automatically; leave blank to generate one.
        </p>
      </form>

      {menu.loading && <LoadingBlock label="Loading menu…" />}
      {menu.error && <ErrorBlock error={menu.error} onRetry={menu.reload} />}

      {!menu.loading && !menu.error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
          <p className="text-sm font-semibold text-text-main">No menu items yet</p>
          <p className="mt-1 text-sm text-text-muted">
            Add the first item above, or seed this store from the Stores page.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-text-main">Menu Items</h2>
            <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              {items.length} {items.length === 1 ? "item" : "items"}
            </span>
          </div>

          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li
                key={item.itemId}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3"
              >
                {editingId === item.itemId ? (
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`${inputClass} min-w-40 flex-1 py-1.5`}
                      autoFocus
                    />
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className={`${inputClass} w-auto py-1.5`}
                    >
                      {CATEGORIES.map((entry) => (
                        <option key={entry.key} value={entry.key}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className={`${inputClass} w-28 py-1.5`}
                    />
                    <button
                      type="button"
                      onClick={handleUpdate}
                      disabled={update.pending || !editName.trim()}
                      className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                    >
                      {update.pending ? "Saving…" : "Save"}
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
                    <div className="flex min-w-0 items-center gap-3">
                      {item.icon && <span className="text-lg">{item.icon}</span>}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-text-main">
                          {item.name}
                        </p>
                        <p className="text-xs text-text-muted">
                          {item.categoryLabel} · {item.itemId}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm font-medium text-text-main">
                        {Number(item.price || 0).toLocaleString("id-ID")}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-main transition-colors hover:bg-bg"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
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

export default Menu;
