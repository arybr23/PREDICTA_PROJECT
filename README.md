# PREDICTA

Demand forecasting and ingredient planning for Indonesian minimarkets.

Predict tomorrow's per-item sales, turn that into a raw-ingredient shopping
list, and let the model adapt as the store logs real end-of-day figures.

The domain twist: demand here is driven by **two calendars at once** (Gregorian
and Hijri — Ramadan and Eid are real demand events), and sales are **censored
by stockouts**. When an item sells out you observe inventory, not demand, so
the model tracks stockout history as a first-class feature.

---

## Architecture

```
[ React SPA ]  ──HTTP/JSON──►  [ Express API ]  ──child_process──►  [ Python / LightGBM ]
  FE/  :5173                     BE/  :5000                          ML/src/predict.py
                                    │
                                    └──► BE/data/store.json  (JSON persistence)
```

Three independently runnable modules:

| Module | Stack | Role |
| --- | --- | --- |
| `ML/` | Python 3.9, LightGBM, pandas | Synthetic data generation, feature engineering, training, forecasting, backtesting |
| `BE/` | Node.js, Express 4, Mongoose | REST API, catalog + recipes, spawns the Python layer, persists state |
| `FE/` | React 19, Vite 8, Tailwind 4 | Dashboard, Data Entry, Cashier POS, Account Profile |

---

## Quick start

```bash
# 1. Python environment (once)
npm run ml:setup

# 2. Generate data and train the models (once, ~1 min)
npm run ml:generate
npm run ml:prep
npm run ml:train

# 3. Run the app
npm run dev          # starts BE on :5000 and FE on :5173
```

Then open **http://localhost:5173**.

The backend also runs standalone: `npm run dev:be` (or `cd BE && node server.js`).

> `npm run dev` uses `&` to run both servers, which works on macOS/Linux. On
> Windows, run `dev:be` and `dev:fe` in two terminals.

### Environment

`BE/.env` is optional — copy `BE/.env.example`:

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `MONGO_URI` | unset | **Unset is fine** — the API falls back to `BE/data/store.json` |
| `PYTHON_BIN` | `ML/venv/bin/python` | Override the interpreter |
| `FORECAST_CACHE_MS` | `60000` | Forecast cache lifetime |
| `BENCHMARK_CACHE_MS` | `600000` | Backtest cache lifetime |

`FE` talks to `http://localhost:5000/api` by default; override with
`VITE_API_URL`.

---

## API

Base URL: `http://localhost:5000/api`

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API + Python + Mongo status |
| `GET` | `/catalog` | 25 products with prices, icons and recipe BOMs |
| `GET` | `/forecast/tomorrow` | Tomorrow's forecast, menu breakdown, ingredient list |
| `GET` | `/forecast/metrics` | Accuracy, waste reduction, savings, adaptation state |
| `POST` | `/sales/entry` | Log end-of-day sales → updates history → retrains the model |
| `GET` | `/sales/history` | Days already logged |
| `GET` `POST` | `/recipes/mapping` | Read / override a menu item's bill of materials |
| `GET` | `/pos/menu` | Menu with live stockout flags |
| `POST` | `/pos/checkout` | Process a transaction |
| `PATCH` | `/pos/item-status` | Flag an item sold out mid-shift |
| `GET` | `/pos/transactions` | Recent orders |
| `GET` | `/account/profile` | Signed-in user + firm summary |
| `GET` | `/account/stores` | Outlets with open/closed status |
| `GET` | `/account/stock` | On-hand ingredients vs tomorrow's requirement |
| `PATCH` | `/account/stock` | Adjust an on-hand quantity |

Query params for `/forecast/tomorrow`: `date`, `weather`, `temperature`,
`model`, `refresh` (bypass cache).

---

## Pages

| Route | Page | Data source |
| --- | --- | --- |
| `/` | Dashboard | `/forecast/tomorrow` + `/forecast/metrics` |
| `/data-entry` | Data Entry & Adaptation | `/catalog`, `/recipes/mapping`, `POST /sales/entry` |
| `/cashier` | Point of Sale | `/pos/menu`, `/pos/checkout`, `/pos/item-status` |
| `/account` | Account Profile | `/account/profile`, `/account/stores`, `/account/stock` |

All four are live against the API. The stock table on the Account page is the
one worth a look: it compares on-hand ingredients against **tomorrow's forecast
requirement**, so it answers "what do I need to buy?" rather than just listing
quantities, and flags each row short / low / ok.

---

## The adaptation loop

```
Submit daily log   →   append_daily_log.py   →   rebuild feature matrix
   (Data Entry)         folds sales into           (lag / rolling /
                        historical_sales.csv        stockout features)
                                │
                                ▼
                     incremental_train.py  →  models/active_model.model
                        (10 rounds @ lr 0.03,
                         init from best offline model)
                                │
                                ▼
                     predict.py prefers active_model.model
```

`predict.py` resolves its model in this order:
1. `--model` argument
2. `models/active_model.model` (adapted to this store's own data)
3. Best horizon model by MAE from `data/processed/data_size_models_comparison.csv`

---

## Model performance

Six horizon models are trained each run and compared on a fixed 7-day holdout
(`ML/data/processed/data_size_models_comparison.csv`). Typical result — more
history wins, and weather features matter a lot:

| Horizon | MAE | Accuracy |
| --- | --- | --- |
| 2 years | ~11.7 | ~82% |
| 1 year | ~13.1 | ~81% |
| 3 months | ~11.8 | ~84% |
| 1 week | ~15.1 | ~81% |

Against a naive "average of the last 7 days" baseline the model is roughly
**46% more accurate** and cuts over-preparation (the waste proxy) by about
**49%** — see `npm run ml:benchmark`.

---

## Known gaps

- **No authentication.** `/account/profile` serves a single hardcoded account
  from `BE/config/firm.js`. There is no login, session, or per-user scoping —
  every request sees the same firm. `Accounts` has a `passwordHash` field that
  nothing populates.
- **Stock seed data is synthetic.** `initialStock()` gives each ingredient a
  deterministic 0.4–9 days of cover so the short/low/ok spread is realistic.
  Replace it with real counts.
- **Persistence is a JSON file.** `BE/services/store.js` is the single seam to
  swap in MongoDB; the models are already written.
- **`Stores.js` embeds ML features** (`hijriDate`, `weather`, lag-style
  history) in the document. Worth deciding whether Mongo stores raw
  observations and the ML layer derives features, or vice versa.
- **`Stores.js` refs a `Products` model that does not exist.**
- **Weather is not forecast.** `/forecast/tomorrow` accepts a `weather` param
  and otherwise assumes `cerah`; wiring a real weather feed would improve
  accuracy, since weather is one of the strongest features.
- **`recharts` sits in the root `package.json` but is unused** — the
  dashboard draws its bars with plain divs. Either use it or drop it.
