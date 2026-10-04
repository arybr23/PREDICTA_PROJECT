# PREDICTA — Complete API Requests & Routes Reference

## 📐 Overview

This document serves as the master API contract between the React SPA components and the Node.js Express backend server.

- **Base URL:** `http://localhost:5000/api`
- **Content-Type:** `application/json`

### Store scoping

Every data endpoint is scoped to **one store**: pass `storeId` as a query
parameter (the FE takes it from the selected store in the top bar).

- Missing / empty `storeId` → `400` with `'storeId' is required`
- A store belonging to another firm → `404`
- Non-manager calling a manager-only store route → `403`

All data a store returns (menu, sales history, transactions, stockouts,
recipe overrides, forecast, metrics) comes from that store's own document in
Mongo (`stores` collection) and its own model under
`ML/salesHistory/<id>/models/active_model.model`.
Endpoints that answer from ML return `200` with `{ "empty": true, "reason": … }`
when the store does not have the history yet.

---

## 📋 Endpoint Summary Table

| Method      | Endpoint Route       | Component / View       | Purpose                                        |
| :---------- | :------------------- | :--------------------- | :--------------------------------------------- |
| **`GET`**   | `/health`            | System Init            | Verify API server status                       |
| **`GET`**   | `/catalog`           | Data Entry (`Page 2`)  | This store's items as catalog entries          || **`GET`**   | `/forecast/tomorrow` | Dashboard (`Page 1`)   | Load tomorrow's forecast & ingredient weights  |
| **`GET`**   | `/forecast/metrics`  | Dashboard / Data Entry | Backtest accuracy, savings, adaptation day     |
| **`POST`**  | `/sales/entry`       | Data Entry (`Page 2`)  | The Daily Sales Log: publish, log & retrain    |
| **`GET`**   | `/sales/history`     | (API only)             | This store's logged days, newest first         |
| **`GET`**   | `/sales/daily`       | Data Entry (`Page 2`)  | One day's state: staged, logged, history       |
| **`GET`**   | `/sales/weather`     | Data Entry (`Page 2`)  | Weather for a store+date, fetched automatically|
| **`POST`**  | `/sales/import`      | Data Entry (`Page 2`)  | Load pre-existing sales from a csv/xlsx upload |
| **`GET`**   | `/stores/locations`  | Stores (`Page 5`)      | The fixed city list for the store dropdown     |
| **`POST`**  | `/recipes/mapping`   | Data Entry (`Page 2`)  | Map menu items to raw ingredient multipliers   |
| **`GET`**   | `/recipes/mapping`   | Data Entry (`Page 2`)  | Recipe defaults + this store's overrides       |
| **`GET`**   | `/pos/menu`          | Cashier POS (`Page 3`) | Fetch menu items, pricing, and category layout |
| **`POST`**  | `/pos/checkout`      | Cashier POS (`Page 3`) | Process real-time customer transactions        |
| **`GET`**   | `/pos/transactions`  | (API only)             | This store's recent transactions               |
| **`PATCH`** | `/pos/item-status`   | Cashier POS (`Page 3`) | Toggle mid-shift stockout events               |

---

## 🛠️ Detailed Endpoint Specifications

### 1. System Health Check

#### `GET /health`

- **Trigger Component:** App launch / System status bar
- **Payload:** None
- **Response (`200 OK`):**

```json
{
  "status": "OK",
  "message": "PREDICTA API is online",
  "timestamp": "2026-08-30T20:30:00.000Z"
}
```

---

## 🔄 How a sale reaches the dataset

One panel, one submission. `POST /sales/entry` — the **Daily Sales Log** on the
Data Entry page — does everything the day needs.

```
Cashier page                     Data Entry — Daily Sales Log
────────────                     ────────────────────────────
POST /pos/checkout
  └─ store.dailySales            GET /sales/daily
     (today's staged figures) ──►   shows what the till recorded,
                                    pre-filled and editable
                                 POST /sales/entry   ← one press
                                   ├─ ML/salesHistory/<id>/datasets/<id>.csv      (publish)
                                   ├─ ML/salesHistory/<id>/raw/…csv               (ML history)
                                   └─ retrain, once history > 7 days
```

**Why the till does not publish.** The cashier rings up orders all day; nothing
leaves the database until the figures are reviewed and saved. What the till
recorded is offered as the starting values, so the common case is check-and-save
rather than re-typing.

**A day can be logged once.** `POST /sales/entry` returns **409
`already_logged`** for a date that already has rows in the dataset, and
`GET /sales/daily` reports `logged` / `can_submit` / `blocked_reason` so the
panel locks itself rather than letting someone fill in a form that will be
refused. The dataset is the record of which days are done — no separate marker
that could drift out of step. A bulk import writes the same dataset, so an
imported day is closed too.

**Training is gated.** The model is retrained only once the store's history spans
more than `MIN_DAYS_TO_TRAIN` (7) days. Below that, every lag column is still
zero-padded, so a fitted model would just learn the mean — the log is saved and
the response reports `training_skipped` instead. `GET /sales/daily` exposes
`history_days`, `min_days_to_train` and `will_train` so the panel can say what
will happen before the button is pressed.

| Step | Endpoint | Writes |
| --- | --- | --- |
| 1. Ring up | `POST /pos/checkout?storeId=` | `store.dailySales` (staged), `store.transactions` |
| 2. Review | `GET /sales/daily?storeId=&date=` | nothing |
| 3. Log | `POST /sales/entry?storeId=` | `ML/salesHistory/<id>/datasets/<id>.csv`, `ML/salesHistory/<id>/raw/historical_sales.csv`, then retrains if eligible |

`POST /sales/post` was removed — it published the staged day without feeding the
ML history, which is exactly the split the merged log closes.


---

## 🔴 Sold-out state is shared between the two pages

There is exactly one sold-out flag per item: `store.stockouts`. Both the Cashier
page and the Data Entry page read and write it, so a switch flipped on one is
what the other shows when it loads.

| | Cashier (`/pos/menu`) | Data Entry (`/catalog`) |
| --- | --- | --- |
| Reads | `item.stockout` | `item.stockout` |
| Writes | `PATCH /pos/item-status` | `PATCH /pos/item-status` |

Both endpoints derive the flag from the same `store.stockouts` map, and both
pages write through the same endpoint, so they cannot disagree. The switch is
optimistic on both sides and rolls back if the write fails.

`/catalog` gained `stockout` for this — previously it returned the menu without
availability, which is why the Data Entry toggles used to drift: they were local
state seeded from the staged *sales* flag, a different thing entirely.

The sold-out flag also gates checkout: `POST /pos/checkout` rejects a line for a
flagged item, and `GET /forecast/tomorrow` marks it on the forecast.

**Caveat on "immediately".** The two pages are separate routes, so only one is
mounted at a time; each refetches on mount, which is what makes them agree when
you switch. Two browser tabs open side by side would need polling or a socket to
update live — that is not implemented.

---

## 🌦️ Weather is fetched, never typed

Nobody enters weather. Each store carries a `location { city, province, lat,
lon, timezone }`, set from the fixed city list in `BE/config/locations.js`, and
`POST /api/sales/entry` looks the day up automatically.

```
Stores page                    Data Entry page                Open-Meteo
───────────                    ───────────────                ──────────
pick a city  ──► store.location ──► GET /sales/weather ──────► archive API
                    (lat/lon/tz)      (preview, shown read-only)
                                      POST /sales/entry ─────► fetched again,
                                        (no weather in body)    then recorded
```

**Source.** `https://archive-api.open-meteo.com/v1/archive` — free, **no API
key**, back to 1940, and it already serves *today*, so one endpoint covers both
same-day entry and backfill. `BE/services/weather.js` wraps it with a 10 s
timeout and a cache (6 h for a past day, 30 min for today).

**`timezone` is not optional.** Open-Meteo aggregates a day over the *local*
calendar day, so a store in WITA must be fetched with `Asia/Makassar` or its day
boundaries shift an hour against the app's own local-date helpers.

**The label is not the API's `weather_code`.** That field is the *most severe
hour* of the day — measured over 733 Surakarta days, it reports a 15-hour-clear
day as "dense drizzle" if one hour drizzled, and it moves 69% of days onto a
different label than the most-common hour would. So the rain axis comes from
`precipitation_sum` (an honest daily total) and the code is used only to split
dry days into clear vs cloudy:

| Label | Rule |
| --- | --- |
| `panas_extreme` | `temperature_2m_max ≥ 33 °C` |
| `hujan_deras` | `precipitation_sum ≥ 20 mm` (≈ p90) |
| `hujan_ringan` | `precipitation_sum ≥ 1 mm` |
| `berawan` | dry, and the day's code is 2/3/45/48 |
| `cerah` | dry, otherwise |

Thresholds live at the top of `BE/services/weather.js` and are the honest place
to tune them. `temperature` is stored as the day's **maximum**, not its mean:
the generator draws each label's temperature from a per-label band
(`panas_extreme` 33–38 °C) that only lines up with a daily high, so storing the
mean would emit "panas_extreme, 29.3 °C" — a combination that never appears in
training.

**Failure is never fatal.** A store with no city, a future date, or an
unreachable API leaves the day's weather null and the sales still save. The
response reports `weather.error` so the UI can say why.

**An explicit `weather` in the body is an override**, kept for the case where the
API is wrong or a store has no city yet. It is recorded with
`weather.source: "manual"` instead of `"open-meteo"`, so manual entries stay
distinguishable in the history.

---

## 📥 Importing a store's existing sales history

A store that already has sales — in a spreadsheet, a POS export, a hand-kept log
— should not have to re-type them. `POST /api/sales/import` takes one upload and
merges it into the store's dataset.

```
Data Entry page                 Express                     ML/src/import_sales.py
───────────────                 ───────                     ─────────────────────
pick a .csv / .xlsx  ──►  multer → temp file  ──►  read (pandas + openpyxl)
"Check first" (dry run)          + menu sidecar       detect columns from headers
"Import"                     ◄──  JSON summary   ◄──  resolve products, merge
                                                      write ML/salesHistory/<id>/datasets/<id>.csv
```

**Accepted:** `.csv`, `.tsv`, `.txt`, `.xlsx`, `.xlsm`, up to 10 MB. Legacy
`.xls` is refused with an explanation rather than a generic error. Uploads land
in a temp directory and are deleted on every path, success or failure.

**Columns are detected, not required.** Headers are matched against alias lists
in English and Indonesian — `Tanggal, Kode Barang, Produk, Qty` works, as does
`date, sku, product, quantity sold`. If no header row is found, 3 columns are
read positionally as date, item_name, units_sold, and 5 as date, item_id,
item_name, units_sold, stockout. Anything else is refused rather than guessed.

**Dates** accept `YYYY-MM-DD`, `DD/MM/YYYY`, `DD-MM-YYYY`, `DD.MM.YYYY`,
`YYYY/MM/DD`, `MM/DD/YYYY` and Excel serial numbers. Day-first is assumed when
both readings are possible, and the count of such rows is reported back.

**Products** are matched by `item_id` first, then by `item_name`
(case-insensitive), against the store's menu. Rows that match neither are
**reported, never dropped and never invented** — the response lists them under
`unmatched_items`. This is why a manager can set their own item IDs on the Menu
page: aligning them with their POS export is what makes the match work.

**Rows are upserted** by `date` + `item_id`, so re-importing a corrected file
replaces values instead of duplicating days.

**`dryRun=true`** parses and reports without writing, which is what the "Check
first" button uses.

This backfills the store's dataset and then derives the rest of the chain: after a
successful import, `runPostImportBridge` backfills weather, rebuilds the history
under `ML/salesHistory/<id>/raw/`, builds the feature matrix under
`ML/salesHistory/<id>/processed/`, and retrains the model once there are more than
`MIN_DAYS_TO_TRAIN` (7) days. It does not touch `store.dailySales`, which stays
reserved for the cashier's staged day. A store imported before this bridge existed
can be caught up with `POST /api/sales/rebuild`.



