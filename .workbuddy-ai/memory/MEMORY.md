# PREDICTA — project conventions

## What it is
Demand forecasting for Indonesian minimarkets. Predict tomorrow's per-item
sales → convert to a raw-ingredient shopping list → model adapts as the store
logs real end-of-day figures.

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
ML venv: `ML/venv` (python 3.9). No MongoDB needed — `BE/data/store.json`.

## Critical gotchas
- **Changing the FEATURES list requires retraining.** The committed models
  were once 21-feature while the script said 23, and predicting failed with a
  LightGBM shape error. Retraining also lifted accuracy 63% → ~83%.
- **Use `data/raw/historical_sales.csv`, not `data/processed/feature_matrix.csv`,
  for anything needing `stockout_flag` or `item_name`.** The feature matrix
  only keeps the model's input columns + `units_sold` + `date`.
- `predict.py` picks its model: `--model` > `models/active_model.model` >
  best-MAE from `data/processed/data_size_models_comparison.csv`.
- Everything the API serves hangs off `/api` (see `BE/API_ENDPOINTS.md`).
- Prices are IDR; FE formats with `Intl` `id-ID` (so 2101 renders as "2.101").
  Tax is 10% PPN, defined in `BE/routes/pos.js`.

## Persistence seam
`BE/services/store.js` is the only place that touches storage. Swapping the
JSON file for MongoDB means reimplementing that file's exports; the
`Firms`/`Accounts`/`Stores` Mongoose models already exist.

## All four pages are wired
Dashboard, Data Entry, Cashier, Account Profile all hit the API.

The Account page's stock table is the one with a real idea in it: it compares
on-hand ingredients against **tomorrow's forecast requirement**, so it answers
"what do I need to buy?" and flags each row short/low/ok. `GET /account/stock`
degrades gracefully (returns stock with `forecast_error`) if the forecast
fails.

## Known unfinished
- **No auth.** `/account/profile` serves a single hardcoded account from
  `BE/config/firm.js`; `Accounts.passwordHash` is unused, nothing is scoped
  per user.
- Stock seed (`initialStock()`) is synthetic: deterministic 0.4–9 days cover.
- Weather is assumed `cerah` unless a caller passes it; no weather feed.
- Root `package.json` still lists an unused `recharts` dependency.
