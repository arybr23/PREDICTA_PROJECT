import { useRef, useState } from "react";
import { api } from "../../../lib/api";
import { useApi, useMutation } from "../../../lib/useApi";

const ACCEPT = ".csv,.tsv,.txt,.xlsx,.xlsm";

/** The two decisions a review row can offer, per mismatch type. */
function optionsFor(row) {
  if (row.type === "missing") {
    return [
      { value: "add", label: "Add" },
      { value: "remove", label: "Remove" },
    ];
  }
  return [
    { value: "replace_menu", label: "Replace menu" },
    {
      value: "replace_dataset",
      label: row.type === "id_mismatch" ? "Replace ID in dataset" : "Replace name in dataset",
    },
  ];
}

/**
 * Bulk-load a store's pre-existing sales history from a file the user already
 * has. Columns are detected server-side, so no template is required, and
 * products are matched against this store's menu — anything that does not match
 * is reported back rather than dropped.
 *
 * On a store with no dataset at all it also offers the one-click demo seed:
 * the shared sample history, slid forward so its last day is today, with a
 * review list for products that do not line up with this store's menu.
 */
function ImportHistoryPanel({ storeId, onImported }) {
  const inputRef = useRef(null);
  const dryRun = useMutation();
  const importer = useMutation();

  const spanQuery = useApi(() => api.datasetSpan(storeId), [storeId]);
  const check = useMutation();
  const seeder = useMutation();

  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState("");
  const [review, setReview] = useState(null); // dry-run payload for the demo seed
  const [choices, setChoices] = useState({}); // item_id → selected option

  const active = dryRun.pending ? dryRun : importer;
  const result = importer.result || dryRun.result;
  const error = importer.error || dryRun.error;

  const submit = async (isDryRun) => {
    if (!file) return;
    const runner = isDryRun ? dryRun : importer;
    // Clear the other run's outcome so the panel shows one result at a time.
    (isDryRun ? importer : dryRun).reset();

    const { ok, value } = await runner.run(() =>
      api.importSales(storeId, file, { sheet: sheet.trim() || undefined, dryRun: isDryRun }),
    );

    if (ok && !isDryRun) {
      setFile(null);
      setSheet("");
      if (inputRef.current) inputRef.current.value = "";
      if (onImported) onImported(value);
    }
  };

  const startCheck = async () => {
    const { ok, value } = await check.run(() => api.seedDemo(storeId, { dryRun: true }));
    if (!ok) return;
    const initial = {};
    for (const row of value.review || []) {
      initial[row.item_id] = row.type === "missing" ? "add" : "replace_dataset";
    }
    setChoices(initial);
    setReview(value);
  };

  const cancelCheck = () => {
    setReview(null);
    setChoices({});
    check.reset();
  };

  const confirmSeed = async () => {
    if (!review) return;
    const addToMenu = [];
    const menuChoices = [];
    for (const row of review.review || []) {
      if (row.type === "missing") {
        if ((choices[row.item_id] ?? "add") === "add") addToMenu.push(row.item_id);
      } else {
        menuChoices.push({
          type: row.type,
          item_id: row.item_id,
          item_name: row.item_name,
          menu_id: row.menu_id,
          menu_name: row.menu_name,
          choice: choices[row.item_id] ?? "replace_dataset",
        });
      }
    }

    const { ok, value } = await seeder.run(() =>
      api.seedDemo(storeId, { addToMenu, menuChoices }),
    );
    if (!ok) return;

    setReview(null);
    setChoices({});
    check.reset();
    spanQuery.reload();
    if (onImported) onImported(value);
  };

  return (
    <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-text-main">
        Import Existing Sales History
      </h2>
      <p className="mb-4 text-sm text-text-muted">
        Already have sales in a spreadsheet or a POS export? Upload it and the
        columns are detected automatically. Products are matched against this
        store&rsquo;s menu by code first, then by name.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <label
            htmlFor="import-file"
            className="mb-1 block text-xs font-medium text-text-muted"
          >
            Sales file (.csv, .xlsx)
          </label>
          <input
            id="import-file"
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-main file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-primary"
          />
        </div>

        <div className="w-40">
          <label
            htmlFor="import-sheet"
            className="mb-1 block text-xs font-medium text-text-muted"
          >
            Excel sheet (optional)
          </label>
          <input
            id="import-sheet"
            type="text"
            value={sheet}
            onChange={(e) => setSheet(e.target.value)}
            placeholder="first sheet"
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text-main outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
          />
        </div>

        <button
          type="button"
          onClick={() => submit(true)}
          disabled={!file || active.pending}
          className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-main transition-colors hover:bg-bg disabled:opacity-50"
        >
          {dryRun.pending ? "Checking…" : "Check first"}
        </button>
        <button
          type="button"
          onClick={() => submit(false)}
          disabled={!file || active.pending}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
        >
          {importer.pending ? "Importing…" : "Import"}
        </button>
      </div>

      {/* Demo shortcut — only on a store that has never had a dataset. */}
      {spanQuery.data && !spanQuery.data.hasDataset && (
        <div className="mt-4 rounded-lg border border-dashed border-border bg-bg/50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-main">
                No dataset yet? Start from the sample data
              </p>
              <p className="mt-0.5 text-xs text-text-muted">
                720 days × 25 products of realistic sales history, slid forward so
                the last day is today — no file needed.
              </p>
            </div>
            <button
              type="button"
              onClick={startCheck}
              disabled={check.pending || seeder.pending}
              className="shrink-0 rounded-lg border border-primary/40 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              {check.pending ? "Checking…" : "Use demo dataset"}
            </button>
          </div>

          {check.error && (
            <div
              className="mt-3 rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs text-accent-dark"
              role="alert"
            >
              {check.error.message}
            </div>
          )}

          {review && (
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <p className="text-xs text-text-muted">
                {review.rows?.toLocaleString()} rows · {review.days} days ·{" "}
                {review.span?.from} → {review.span?.to} · dates shifted +
                {review.shift_days} day(s)
              </p>

              {(review.review || []).length === 0 ? (
                <p className="text-sm text-text-main">
                  All sample products already match this store&rsquo;s menu —
                  nothing to decide.
                </p>
              ) : (
                <>
                  <p className="text-sm font-medium text-text-main">
                    {review.review.length} product(s) need a decision before
                    seeding:
                  </p>
                  <ul className="space-y-2">
                    {review.review.map((row) => (
                      <li
                        key={row.item_id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-main">
                            {row.item_name}{" "}
                            <span className="font-mono text-xs font-normal text-text-muted">
                              {row.item_id}
                            </span>
                            <span
                              className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                row.type === "missing"
                                  ? "bg-accent/10 text-accent-dark"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {row.type === "missing"
                                ? "Not on menu"
                                : row.type === "id_mismatch"
                                  ? "ID mismatch"
                                  : "Name mismatch"}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted">
                            {row.type === "missing" &&
                              "No menu entry shares its code or name."}
                            {row.type === "id_mismatch" && (
                              <>
                                Sample uses code{" "}
                                <span className="font-mono">{row.item_id}</span>,
                                your menu has{" "}
                                <span className="font-mono">{row.menu_id}</span>{" "}
                                for the same product.
                              </>
                            )}
                            {row.type === "name_mismatch" && (
                              <>
                                Same code{" "}
                                <span className="font-mono">{row.item_id}</span> —
                                sample calls it &ldquo;{row.item_name}&rdquo;,
                                your menu &ldquo;{row.menu_name}&rdquo;.
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {optionsFor(row).map((opt) => {
                            const chosen =
                              (choices[row.item_id] ??
                                (row.type === "missing" ? "add" : "replace_dataset")) ===
                              opt.value;
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  setChoices((prev) => ({
                                    ...prev,
                                    [row.item_id]: opt.value,
                                  }))
                                }
                                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                                  chosen
                                    ? "bg-primary text-white"
                                    : "border border-border bg-bg text-text-main hover:bg-surface"
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={confirmSeed}
                  disabled={seeder.pending}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-50"
                >
                  {seeder.pending ? "Seeding…" : "Seed dataset"}
                </button>
                <button
                  type="button"
                  onClick={cancelCheck}
                  disabled={seeder.pending}
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-bg disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>

              {seeder.error && (
                <div
                  className="rounded-lg border border-accent/40 bg-accent/5 p-3 text-xs text-accent-dark"
                  role="alert"
                >
                  <p className="font-medium">{seeder.error.message}</p>
                  {seeder.error.detail?.unmatched_items?.length > 0 && (
                    <p className="mt-1">
                      Not matched: {seeder.error.detail.unmatched_items.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {seeder.result && !review && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-text-main">
          <p className="font-semibold">{seeder.result.message}</p>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
            <span>
              Rows <span className="font-medium">{seeder.result.rows_imported}</span>
            </span>
            <span>
              Days <span className="font-medium">{seeder.result.days_imported}</span>
            </span>
            <span>
              Menu added{" "}
              <span className="font-medium">{seeder.result.menu_added}</span>
            </span>
            <span>
              Menu replaced{" "}
              <span className="font-medium">{seeder.result.menu_replaced}</span>
            </span>
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {seeder.result.bridge?.trained
              ? `Model trained on ${seeder.result.bridge.history_days} days — forecasts are ready.`
              : seeder.result.bridge?.error
                ? `History written, but the model build reported: ${seeder.result.bridge.error}`
                : "Not enough history to train a model yet."}
          </p>
          {seeder.result.unmatched_count > 0 && (
            <p className="mt-1 text-xs text-text-muted">
              {seeder.result.unmatched_count} sample product(s) were kept with
              their sample codes instead of your menu&rsquo;s — add them to the
              menu if you want those sales to merge.
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          className="mt-4 rounded-lg border border-accent/40 bg-accent/5 p-4 text-sm text-accent-dark"
          role="alert"
        >
          <p className="font-medium">{error.message}</p>

          {error.detail?.unmatched_items?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium">Not on this store&rsquo;s menu:</p>
              <p className="mt-1 text-xs">
                {error.detail.unmatched_items.join(", ")}
                {error.detail.unmatched_count > error.detail.unmatched_items.length &&
                  ` …and ${error.detail.unmatched_count - error.detail.unmatched_items.length} more`}
              </p>
            </div>
          )}

          {error.detail?.columns_found && (
            <p className="mt-2 text-xs">
              Columns found:{" "}
              {Object.entries(error.detail.columns_found)
                .filter(([, v]) => v)
                .map(([k, v]) => `${k}=${v}`)
                .join(", ") || "none"}
            </p>
          )}

          {error.detail?.hint && (
            <p className="mt-2 text-xs">{error.detail.hint}</p>
          )}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-text-main">
          <p className="font-semibold">
            {result.dry_run ? "Checked — nothing written" : "Import complete"}
          </p>

          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
            <span>
              Rows read <span className="font-medium">{result.rows_read}</span>
            </span>
            <span>
              Imported <span className="font-medium">{result.rows_imported}</span>
            </span>
            <span>
              Days <span className="font-medium">{result.days_imported}</span>
            </span>
            <span>
              Skipped <span className="font-medium">{result.rows_skipped}</span>
            </span>
          </div>

          {result.date_from && (
            <p className="mt-2 text-xs text-text-muted">
              {result.date_from} → {result.date_to}
              {result.rows_updated_existing > 0 &&
                ` · ${result.rows_updated_existing} row(s) replaced existing values`}
              {result.sheet && ` · sheet "${result.sheet}"`}
            </p>
          )}

          <p className="mt-2 text-xs text-text-muted">
            Columns:{" "}
            {Object.entries(result.columns || {})
              .filter(([, v]) => v)
              .map(([k, v]) => `${k} ← ${v}`)
              .join(", ")}
          </p>

          {result.ambiguous_dates > 0 && (
            <p className="mt-2 text-xs text-text-muted">
              {result.ambiguous_dates} date(s) could be read as day-first or
              month-first; day-first was assumed.
            </p>
          )}

          {result.unmatched_items?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium">
                {result.unmatched_count} product(s) not on this store&rsquo;s menu,
                skipped:
              </p>
              <p className="mt-1 text-xs">
                {result.unmatched_items.join(", ")}
                {result.unmatched_count > result.unmatched_items.length &&
                  ` …and ${result.unmatched_count - result.unmatched_items.length} more`}
              </p>
            </div>
          )}

          {result.problems?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium">Rows that could not be read:</p>
              <ul className="mt-1 space-y-0.5 text-xs">
                {result.problems.slice(0, 5).map((p) => (
                  <li key={`${p.row}-${p.reason}`}>
                    row {p.row}: {p.reason}
                    {p.value ? ` (${p.value})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default ImportHistoryPanel;
