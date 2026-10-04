import { useRef, useState } from "react";
import { api } from "../../../lib/api";
import { useMutation } from "../../../lib/useApi";

const ACCEPT = ".csv,.tsv,.txt,.xlsx,.xlsm";

/**
 * Bulk-load a store's pre-existing sales history from a file the user already
 * has. Columns are detected server-side, so no template is required, and
 * products are matched against this store's menu — anything that does not match
 * is reported back rather than dropped.
 */
function ImportHistoryPanel({ storeId, onImported }) {
  const inputRef = useRef(null);
  const dryRun = useMutation();
  const importer = useMutation();

  const [file, setFile] = useState(null);
  const [sheet, setSheet] = useState("");

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
