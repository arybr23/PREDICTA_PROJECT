# ML/salesHistory — per-store ML data

Every store's ML artifacts live under one per-identifier root, with each category
in its own sub-folder:

```
ML/salesHistory/<storeId>/
  datasets/<storeId>.csv        # plain sales record (5 columns)
  raw/historical_sales.csv      # 40-column feature history
  processed/feature_matrix.csv  # model input (25 columns)
  processed/label_encoders.json # weather/item_id encoders
  models/active_model.model     # the store's trained model
```

Store ids are unique (enforced by the `Stores` schema and by
`generateStoreId`'s collision check in `BE/routes/stores.js`), so the folder name
is a stable key. A store can only ever be handed its own files — see
`BE/services/storeDataset.js` and `ML/src/store_paths.py`, which sanitise the id
to `[A-Za-z0-9_-]` before touching the filesystem.

## Format

One row per item per day, which is the grain the forecasting pipeline trains on:

```csv
date,item_id,item_name,units_sold,stockout
2026-10-04,P01,Nasi Goreng Spesial,42,0
2026-10-04,P08,Es Teh Manis,88,1
```

| Column | Meaning |
| --- | --- |
| `date` | Local date of the sale, `YYYY-MM-DD` |
| `item_id` | The store menu item's `itemId` — the same key the ML uses as `item_id` |
| `item_name` | Display name, carried for readability |
| `units_sold` | Total units of this item sold that day |
| `stockout` | `1` when the item was flagged sold out, i.e. demand was censored |

## Written by

Two writers, both producing the same format:

1. **`POST /api/sales/entry`** — the **Daily Sales Log** on the Data Entry page.
   This is the normal path, and it also feeds the ML history and retrains the
   model in the same submission.
2. **`ML/src/import_sales.py`** (via `POST /api/sales/import`) — bulk-loads a
   store's pre-existing sales from an uploaded `.csv` or `.xlsx`, for stores that
   were already trading before they joined the app.

The cashier's checkout button (`POST /api/pos/checkout`) deliberately does *not*
touch these files. It stages the sale in `store.dailySales` in MongoDB, the Data
Entry page displays those staged figures via `GET /api/sales/daily` and offers
them as the starting values, and only when the user saves the log do they land
here. The dataset is therefore a reviewed record, not a running tally of whatever
the till rang up.

## A day is logged once

A date that already has rows here is closed: `POST /api/sales/entry` refuses a
second submission for it with **409 `already_logged`**. This file is the record
of which days are done, so there is no separate marker that could drift out of
step — and a day written by the importer is closed too.

To replace a whole day, re-import it (the import upserts); the daily log will not
overwrite one.

Rows are **upserted** by `date` + `item_id`, so a retry after a failed write
converges on the same file rather than double-counting. Rows are kept sorted by
`date`, then `item_id`.

Writes are serialised per store in the Node layer, so two concurrent writes on
the same store cannot interleave a read-modify-write and lose rows.

## Read by

The dataset (`datasets/<storeId>.csv`) is the source for everything downstream.
`ML/src/rebuild_store_history.py` reads it and derives the store's history and
feature matrix — this is the bridge the import uses, so uploading a back-catalogue
fills the raw and processed folders automatically. The history and feature matrix
are then read by the forecast:

| File | Written by | Read by |
| --- | --- | --- |
| `datasets/<storeId>.csv` | `POST /api/sales/entry`, `ML/src/import_sales.py` (import) | `rebuild_store_history.py` |
| `raw/historical_sales.csv` | `rebuild_store_history.py` (also `append_daily_log.py` from the daily log) | `predict.py`, `benchmark.py` |
| `processed/feature_matrix.csv` | `rebuild_store_history.py` | `incremental_train.py` |
| `models/active_model.model` | `incremental_train.py` | `predict.py`, `benchmark.py` |
