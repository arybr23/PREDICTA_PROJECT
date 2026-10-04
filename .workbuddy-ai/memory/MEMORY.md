# PREDICTA — project conventions

## What it is
Demand forecasting for Indonesian minimarkets. Predict tomorrow's per-item
sales → convert to a raw-ingredient shopping list → model adapts as the store
logs real end-of-day figures. Multi-tenant: a Firm owns Stores; every data
request names one store.

Domain specifics that drive the design:
- **Dual calendar**: Gregorian + Hijri seasonality (Ramadan/Eid are real
  demand events). Shared helpers in `ML/src/calendar_utils.py`.
- **Censored demand**: `true_demand` vs `units_sold`. A stockout means you
  observed inventory, not demand. Stockout history is a model feature.

## Running it
```bash
npm run dev          # BE :5000 + FE :5173 (uses `&`; macOS/Linux only)
npm run dev:be       # BE only
npm run dev:fe       # FE only
npm run ml:train     # retrain all six horizon models
```
ML venv: `ML/venv` (python 3.9). **MongoDB is required** — `BE/.env` sets
`MONGO_URL=mongodb://127.0.0.1:27017/predicta_db` (local default).
`BE/config/db.js` now supports three-tier resolution:
`MONGO_ATLAS_URL` > `MONGO_COMPASS_URL` > `MONGO_URL` fallback.
Supabase client (`BE/services/supabase.js`) is ready with placeholder env vars
(`SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET`) for cloud file storage of
datasets and models. `BE/data/` and `BE/services/store.js` are gone.

## Request path
FE `lib/api.js` → `http://localhost:5000/api` (cookie `session`) →
`routes/index.js` → `requireInitialized` (401 no session / 403 not initialised)
→ `requireStore` (400 no storeId / 403 not in a firm / 404 store not in firm)
→ route handler → MongoDB and/or `services/python.js` → `ML/src/*.py`.

Session = cookie `session` whose value is the account's plain `userId`.
Passwords use `crypto.scryptSync` (`salt:hash`), no bcrypt.

## Per-store ML layout
All of a store's ML artifacts live under one per-identifier root
(`ML/src/store_paths.py` → `SALES_HISTORY_ROOT = ML/salesHistory`):

```
ML/salesHistory/<id>/datasets/<id>.csv        # plain sales record (5 cols)
ML/salesHistory/<id>/raw/historical_sales.csv  # 40-column feature history
ML/salesHistory/<id>/processed/feature_matrix.csv
ML/salesHistory/<id>/processed/label_encoders.json
ML/salesHistory/<id>/models/active_model.model
```

`--store <id>` switches `store_paths.py` to this root. A store **never** inherits
the offline horizon models; its first `incremental_train.py` run builds from
scratch (60 rounds). `predict.py` and `incremental_train.py` both hard-fail
rather than leak an offline model into a store. The **global/offline** scripts
(`train_base`, `generate_mock_data`, `train_multiple_models_*`, `evaluate`) still
use `ML/data/{raw,processed}` and `ML/models` — do NOT move those.

## Sold-out state is one shared flag
`store.stockouts` is the single source of truth, read and written by **both** the
Cashier page and the Data Entry page.

| | Cashier (`GET /pos/menu`) | Data Entry (`GET /catalog`) |
| --- | --- | --- |
| Reads | `item.stockout` | `item.stockout` |
| Writes | `PATCH /pos/item-status` | `PATCH /pos/item-status` |

`/catalog` **gained** `stockout` for this. Before that it returned the menu
without availability, and Data Entry's toggles were local state seeded from the
staged *sales* flag — a different concept with the same label, which is why the
two pages drifted. If you add another page that shows availability, read it from
one of these two endpoints rather than inventing a third source.

Both switches are optimistic with rollback. Sync happens **on navigation** (each
page refetches on mount) — two tabs side by side would need polling.

The Cashier menu is a **vertical list** (`MenuList.jsx`, search + inline switch),
not a grid. `MenuGrid.jsx` and `StockoutFlag.jsx` are gone. The row's add action
and its switch must stay **siblings** — nesting buttons is invalid and makes the
switch unreachable.

Menu search lives in `FE/src/lib/menuFilter.js` so it is testable.

## Sales paths
| Path | Endpoint | Writes | Read by |
| --- | --- | --- | --- |
| Cashier checkout | `POST /pos/checkout` | `store.dailySales` (staged, today only), `store.transactions` | the Daily Sales Log |
| Daily Sales Log | `POST /sales/entry` | `ML/salesHistory/<storeId>/datasets/<storeId>.csv` **and** `ML/salesHistory/<storeId>/raw/historical_sales.csv`, then retrains if eligible | the dataset; ML scripts read the history |
| Import an existing file | `POST /sales/import` | `ML/salesHistory/<storeId>/datasets/<storeId>.csv` (bulk upsert) → **bridges** to history + feature matrix + model | `runPostImportBridge` |

`POST /sales/post` was **removed** — it published the staged day without feeding
the ML history, which is the split the merged log closes.

### The import now bridges to the ML — `rebuild_store_history.py`
The split below used to be two disjoint pipelines (the import wrote only the
dataset). As of the import-rebuild bridge, uploading a file derives the whole
chain automatically.

| | Written by | Contains |
| --- | --- | --- |
| `ML/salesHistory/<id>/datasets/<id>.csv` | `import_sales.py` **or** `POST /sales/entry` | 5 columns, plain sales |
| `ML/salesHistory/<id>/raw/historical_sales.csv` | **`rebuild_store_history.py`** (called by `/import` bridge **and** `/sales/entry`'s `append_daily_log`) | 40-column feature history |
| `ML/salesHistory/<id>/processed/feature_matrix.csv` | `rebuild_store_history.py` → `build_feature_matrix()` | 23 features + target |
| `ML/salesHistory/<id>/models/active_model.model` | `incremental_train.py` (triggered when history > `MIN_DAYS_TO_TRAIN`) | the store's model |

`ML/src/rebuild_store_history.py` is the bridge: it reads `ML/salesHistory/<id>/datasets/<id>.csv`
and derives the 40-column history + feature matrix in one pass. It accepts:
- `--weather <json>`: `{ "YYYY-MM-DD": { "weather", "temperature" } }` — backfilled
  from Open-Meteo via `weather.fetchRange` (the dataset has no weather column).
- `--menu <json>`: `{ "items": [{ "itemId", "name", "category" }] }` — supplies
  `item_category` (the dataset has no category).
- `--skip-features`: history only.

It is **idempotent** — the history is rewritten from scratch each run, so
re-running never duplicates rows.

**Two endpoints use it:**
- `POST /sales/import` → after a successful non-dry import, `runPostImportBridge`
  fetches the weather range (`result.date_from`→`result.date_to`), writes a temp
  weather map, calls `rebuildStoreHistory`, then trains if `days > 7`. The import
  response now includes a `bridge` summary (`history_days`, `weather_backfilled`,
  `trained`, …). A weather-fetch failure is swallowed — the history is still
  rebuilt, just without the weather signal.
- `POST /sales/rebuild` → catches up a store that was imported **before** the
  bridge existed (or after a manual dataset edit). It reads the span from
  `python.datasetSpan()` (min/max date in `ML/salesHistory/<id>/datasets/<id>.csv`), backfills
  weather, rebuilds, trains. Idempotent.

`BE/services/python.js` exports `rebuildStoreHistory(opts)`,
`datasetPath(storeId)`, and `datasetSpan(storeId)` to support these.

**Consequence of the old gap (now closed):** an import previously wrote the
dataset and reported `status: "success"` while leaving `raw/` and `processed/`
empty, so the store could not forecast. That is fixed — any upload now produces
the full chain, and `/rebuild` retro-fixes existing stores.

**One panel, one press.** The Daily Sales Log on Data Entry shows what the till
recorded (pre-filled, editable) and on submit publishes the day, hands it to the
ML history, and retrains. The pre-fill is *derived* (`sales[id] ?? till[id]`),
never seeded into state, so a refetch cannot clobber an edit.

**A day can be logged once.** A date already present in the dataset returns
**409 `already_logged`**. The dataset is the record of which days are done, so
there is no separate marker to drift — and an imported day is closed too.
`GET /sales/daily` reports `logged` / `can_submit` / `blocked_reason` so the UI
locks itself.

**Training is gated on `MIN_DAYS_TO_TRAIN` (7) distinct history days.** Below
that every lag column is zero-padded and a fitted model is just a mean
predictor, so the log saves without training and the response says
`training_skipped`. `GET /sales/daily` exposes `history_days` / `will_train`.

`store.dailySales` = `{date, updated_at, posted_at, entries[]}`. Checkout
accumulates into it; it is **not** cleared by the log (the log reads it for
pre-fill), so a stale staged day is surfaced via `is_stale_day` instead.

`BE/services/storeDataset.js` owns the CSV: hand-rolled RFC-4180 subset, ids
sanitised to `[A-Za-z0-9_-]`, upsert by `date::item_id`, per-store write lock.
`ML/src/import_sales.py` writes the same format from an upload, so the two must
stay in step — the e2e test round-trips a Python-written file through the JS
reader.

Managers may set their own `itemId` when creating a menu item
(`resolveItemId()` in `routes/stores.js`), validated `[A-Za-z0-9_-]{1,32}` and
unique per store, so it can match their POS export. It is **not** editable
afterwards — it is the join key with sales rows.

Both `pos.js` and `sales.js` have a **local-date** helper — never
`toISOString().slice(0,10)`, which is the UTC date and still yesterday for a
UTC+7 store until 07:00.

`forecast.js` decides "no history yet" via `python.hasStoreHistory(storeId)`
(an existence check on the ML history file), not from the store document.

## Weather is fetched, never typed
Each store carries `location { city, province, lat, lon, timezone }`, chosen
from the fixed list in `BE/config/locations.js` (28 Indonesian cities, three
timezones). `BE/services/weather.js` wraps Open-Meteo's archive API — free, no
key, back to 1940, and it already serves *today*, so one endpoint covers both
same-day entry and backfill.

`POST /sales/entry` fetches automatically when the body carries no `weather`;
passing one is an **override** and is recorded with `source: "manual"` rather
than `"open-meteo"`. A fetch failure never blocks a sale — the day is logged
with null weather and `weather.error` explains why.

Two rules that are easy to get wrong:
- **`timezone` is mandatory.** Open-Meteo aggregates a day over the *local*
  calendar day, so a WITA store fetched with the Jakarta offset shifts by an
  hour against `localDate()` in `pos.js`/`sales.js`.
- **Do not use the API's `weather_code` for the label.** It is the *most severe
  hour* of the day, not the typical one — it moves 69% of days onto a different
  label than the most-common hour, and reports a 15-hour-clear day as "dense
  drizzle". The rain axis comes from `precipitation_sum`; the code only splits
  dry days into `cerah` vs `berawan`.
- **`temperature` is the daily MAX, not the mean.** The generator's per-label
  bands (`panas_extreme` 33–38 °C) only line up with a daily high, so the mean
  would emit "panas_extreme, 29.3 °C" — never seen in training.

Thresholds live at the top of `BE/services/weather.js`.

## Critical gotchas
- **Changing the FEATURES list requires retraining.** 24 features today
  (`date.dayOfTheWeek`, `is_holiday`, `date.month`, `date.day`, `hijri_month`,
  `hijri_day`, `weather`, `temperature`, `item_id`, `item_type`, 5 lags, 6
  rolling, 3 stockout indicators). Mismatched feature counts fail with a
  LightGBM shape error.
- **Use `data/raw/historical_sales.csv`, not `feature_matrix.csv`, for anything
  needing `stockout_flag` or `item_name`.** The feature matrix only keeps the
  model's input columns + `units_sold` + `date`.
- **A store's history CSV has 37 columns but three are permanently empty.**
  `store_paths.history_columns()` copies the header from the *global synthetic*
  history, so `holiday_name`, `active_events`, and `base_demand` come along even
  though nothing ever fills them for a real store. The `mult` provenance columns
  (`gregorian_mult`, `hijri_mult`, `weather_demand_mult`) were removed — they were
  never consumed by any model or predictor. The 14 `lag_*`/`rolling_*` columns
  are empty on day 1 and fill from day 2 onward. Don't write code that assumes
  any of them are present.
- **A schema change does not clean existing documents.** Mongoose strict mode
  stops *writing* a removed field but leaves it in the doc, and `.lean()`
  queries still return it. Dropping a field means an explicit `$unset` —
  `dailySales` (array→object) and `dailySalesHistory` both needed one.
- **`item_id` label codes are rebuilt from `sorted(unique)` on every
  `append_daily_log`.** Adding a menu item can shift existing codes and
  silently re-point the trained model's splits. Pin the encoder before this
  bites.
- **`weather` and `item_id` are label-encoded but treated as *numeric* by
  LightGBM.** `lgb.Dataset(...)` is built without `categorical_feature`, and
  `_build_label_maps` sorts alphabetically, so the codes impose a fake ordering
  — `berawan=0 < cerah=1 < hujan_deras=2 < hujan_ringan=3 < panas_extreme=4`.
  Nothing in that sequence is semantically ordered. The model has enough
  capacity (31 leaves, 100 rounds) to carve the values back out, so it is not
  fatal, but one-hot is the correct encoding for these two and is the natural
  change to make alongside any weather rework.
- Prices are IDR; FE formats with `Intl` `id-ID` (2101 → "2.101").
  Tax is 10% PPN in `BE/routes/pos.js`.
- `Stores.products[].productId` refs a `Products` model that does not exist,
  and the field is written but never read.

## Dormant / stale (do not trust)
- `/account/profile|stores|stock` are **commented out** in `routes/account.js`,
  but `FE/lib/api.js` still exposes `accountProfile`/`accountStores`/
  `accountStock`/`setStockLevel` and nothing calls them. The "stock vs
  tomorrow's forecast requirement" feature is dormant.
- `README.md`, `API_ENDPOINTS.md` (truncated to a summary table) and
  `/health`'s `persistence: "json-file"` are all behind the code.
- `evaluate.py` and `train_base.py` use pre-refactor feature names and will
  KeyError.
- `TopNavBar` hardcodes "Connected" and the date "Aug 26, 2026".
