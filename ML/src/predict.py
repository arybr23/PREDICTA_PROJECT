"""Generate tomorrow's per-item demand forecast as JSON for the Node.js API.

Usage:
    python predict.py [--model model_2years.model] [--date YYYY-MM-DD]
                      [--weather cerah] [--temperature 29.5]

Model resolution order:
    1. --model if given
    2. models/active_model.model  (produced by incremental training)
    3. models/model_2years.model  (best offline horizon, see comparison CSV)

The lag/rolling series are read from data/raw/historical_sales.csv, which is the
source of truth: it carries units_sold AND stockout_flag, whereas the processed
feature matrix only keeps the model's input columns.

Prints a single JSON object on stdout. All diagnostics go to stderr so the
stdout stream stays parseable by the API layer.
"""

import os
import sys
import json
import argparse
import warnings
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import lightgbm as lgb

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from calendar_utils import build_calendar_context, parse_date  # noqa: E402
from store_paths import encoders_path, history_path, models_dir  # noqa: E402

warnings.filterwarnings("ignore")

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SRC_DIR)

# Global defaults, kept for callers that import these names (benchmark.py).
MODELS_DIR = os.path.join(ML_DIR, "models")
DATA_DIR = os.path.join(ML_DIR, "data")

RAW_HISTORY_PATH = os.path.join(DATA_DIR, "raw", "historical_sales.csv")
ENCODERS_PATH = os.path.join(DATA_DIR, "processed", "label_encoders.json")
COMPARISON_PATH = os.path.join(DATA_DIR, "processed", "data_size_models_comparison.csv")

DEFAULT_MODEL = "model_2years.model"
ACTIVE_MODEL = "active_model.model"
DEFAULT_WEATHER = "cerah"
DEFAULT_TEMPERATURE = 28.0

FEATURES = [
    "lag_1", "lag_2", "lag_3", "lag_7", "lag_14",
    "rolling_3_mean", "rolling_3_std",
    "rolling_7_mean", "rolling_7_std",
    "rolling_14_mean", "rolling_14_std",
    "lag_1_stockout", "lag_7_stockout", "stockout_last_7",
    "date.dayOfTheWeek", "is_holiday", "date.month", "date.day",
    "hijri_month", "hijri_day",
    "weather", "temperature",
    "item_id", "item_type",
]


def fail(message, **extra):
    payload = {"status": "error", "message": message}
    payload.update(extra)
    print(json.dumps(payload))
    sys.exit(1)


def _std(values):
    """Sample standard deviation (ddof=1) to match pandas rolling.std()."""
    arr = np.asarray(values, dtype=float)
    if len(arr) < 2:
        return 0.0
    return float(np.std(arr, ddof=1))


def load_encoders(store_id=None):
    path = encoders_path(store_id)
    if not os.path.exists(path):
        fail("Label encoders missing", hint="Run dataset_prep.py first")
    with open(path) as f:
        return json.load(f)


def best_offline_model():
    """Pick the horizon model with the lowest MAE from the comparison report."""
    try:
        report = pd.read_csv(COMPARISON_PATH)
        if "MAE" in report.columns and "Model File" in report.columns:
            report = report.dropna(subset=["MAE"]).sort_values("MAE")
            for name in report["Model File"]:
                if os.path.exists(os.path.join(MODELS_DIR, name)):
                    return name
    except Exception as exc:  # noqa: BLE001
        print(f"Could not read comparison report: {exc}", file=sys.stderr)
    return DEFAULT_MODEL


def resolve_model(requested, store_id=None):
    models = models_dir(store_id)

    if requested:
        path = os.path.join(models, requested)
        if not os.path.exists(path):
            fail(f"Requested model not found: {requested}")
        return path, requested

    # An incrementally trained model reflects the store's own logged sales,
    # so it wins over any offline horizon model.
    active = os.path.join(models, ACTIVE_MODEL)
    if os.path.exists(active):
        return active, ACTIVE_MODEL

    if store_id:
        # Stores only ever train on their own history: no offline horizon
        # model (trained on the shared catalog data) may leak in.
        fail(
            "No trained model for this store yet",
            hint="Log sales first so the store's own model can be trained",
        )

    name = best_offline_model()
    path = os.path.join(MODELS_DIR, name)
    if not os.path.exists(path):
        fail(
            "No trained model available",
            hint="Run train_multiple_models_complete.py first",
        )
    return path, name


def build_row(units, stockouts, item_code, item_type_code, target_ctx, weather_code, temperature):
    """Assemble one feature row for the target date from an item's history.

    Mirrors the generator's conventions. For a new row at position n:
        lag_k           = units_sold[n - k]
        rolling_w_mean  = mean(units_sold[n - w : n])
        lag_1_stockout  = stockout[n - 1]
        stockout_last_7 = sum(stockout[n - 7 : n])
    """
    def lag(k):
        return float(units[-k]) if len(units) >= k else 0.0

    def roll_mean(w):
        window = units[-w:] if len(units) >= w else units
        return float(np.mean(window)) if len(window) else 0.0

    def roll_std(w):
        window = units[-w:] if len(units) >= w else units
        return _std(window)

    return {
        "lag_1": lag(1),
        "lag_2": lag(2),
        "lag_3": lag(3),
        "lag_7": lag(7),
        "lag_14": lag(14),
        "rolling_3_mean": roll_mean(3),
        "rolling_3_std": roll_std(3),
        "rolling_7_mean": roll_mean(7),
        "rolling_7_std": roll_std(7),
        "rolling_14_mean": roll_mean(14),
        "rolling_14_std": roll_std(14),
        "lag_1_stockout": float(stockouts[-1]) if len(stockouts) >= 1 else 0.0,
        "lag_7_stockout": float(stockouts[-7]) if len(stockouts) >= 7 else 0.0,
        "stockout_last_7": float(sum(stockouts[-7:])),
        "date.dayOfTheWeek": target_ctx["date.weekday"],
        "is_holiday": target_ctx["is_holiday"],
        "date.month": target_ctx["date.month"],
        "date.day": target_ctx["date.day"],
        "hijri_month": target_ctx["hijri_month"],
        "hijri_day": target_ctx["hijri_day"],
        "weather": weather_code,
        "temperature": temperature,
        "item_id": item_code,
        "item_type": item_type_code,
    }


def main():
    parser = argparse.ArgumentParser(description="Forecast tomorrow's demand")
    parser.add_argument("--model", default=None,
                        help="Model filename in the store's ML/salesHistory/<id>/models/ dir (or ML/models/ for offline models)")
    parser.add_argument("--store", default=None,
                        help="Forecast from one store's own history and model")
    parser.add_argument("--date", default=None, help="Target date YYYY-MM-DD")
    parser.add_argument("--weather", default=None, help="Weather label for the target date")
    parser.add_argument("--temperature", type=float, default=None, help="Temperature in Celsius")
    args = parser.parse_args()

    raw_path = history_path(args.store)
    if not os.path.exists(raw_path):
        fail(
            f"No sales history for store '{args.store}'" if args.store
            else "Historical sales data missing",
            hint="Run generate_mock_data.py first" if not args.store
            else "Log sales for this store first",
        )

    model_path, model_name = resolve_model(args.model, args.store)
    encoders = load_encoders(args.store)

    df = pd.read_csv(raw_path)
    if df.empty:
        fail("Historical sales data is empty")
    df = df.sort_values(["item_id", "date"]).reset_index(drop=True)

    # ---- Target date -----------------------------------------------------
    last_date = parse_date(df["date"].max())
    if args.date:
        target_date = parse_date(args.date)
        if target_date is None:
            fail(f"Could not parse --date value: {args.date}")
    else:
        # Default to the day after the last observation, but never forecast a
        # date in the past when the history is stale.
        tomorrow = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        if last_date is None:
            target_date = tomorrow
        else:
            target_date = max(last_date + timedelta(days=1), tomorrow)

    ctx = build_calendar_context(target_date)

    # ---- Weather ---------------------------------------------------------
    weather_map = encoders.get("weather", {})
    weather_label = args.weather or DEFAULT_WEATHER
    if weather_label in weather_map:
        weather_code = weather_map[weather_label]
    else:
        # Unknown label: fall back to the first known code instead of crashing.
        weather_code = next(iter(weather_map.values()), 0)
        weather_label = next(iter(weather_map.keys()), weather_label)

    if args.temperature is not None:
        temperature = float(args.temperature)
    else:
        # Store histories may never have been logged with a temperature.
        temps = df["temperature"] if "temperature" in df.columns else pd.Series(dtype=float)
        temperature = (
            float(temps.dropna().tail(200).mean()) if temps.notna().any() else DEFAULT_TEMPERATURE
        )

    try:
        model = lgb.Booster(model_file=model_path)
    except Exception as exc:  # noqa: BLE001
        fail(f"Failed to load model {model_name}: {exc}")

    item_encoding = encoders.get("item_id", {})
    category_encoding = encoders.get("item_category", {})

    rows = []
    predictions = []
    for sku, history in df.groupby("item_id", sort=True):
        history = history.sort_values("date")

        code = item_encoding.get(sku)
        if code is None:
            print(f"Skipping unknown item {sku}", file=sys.stderr)
            continue

        units = history["units_sold"].astype(float).tolist()
        stockouts = history["stockout_flag"].astype(float).tolist()

        last_name = history["item_name"].iloc[-1] if "item_name" in history.columns else None
        last_category = (
            history["item_category"].iloc[-1] if "item_category" in history.columns else None
        )
        type_code = category_encoding.get(last_category, 0) if last_category else 0

        rows.append(build_row(units, stockouts, int(code), int(type_code), ctx, weather_code, temperature))
        predictions.append({
            "item_id": sku,
            "name": last_name if isinstance(last_name, str) and last_name else sku,
            "category": last_category if isinstance(last_category, str) and last_category else "",
            "code": int(code),
        })

    if not rows:
        fail("No items with known encodings found in history")

    X = pd.DataFrame(rows)[FEATURES]
    raw_preds = model.predict(X)

    for pred, item in zip(raw_preds, predictions):
        item["predicted_units"] = max(0, int(np.round(float(pred))))

    predictions.sort(key=lambda p: p["predicted_units"], reverse=True)
    total = sum(p["predicted_units"] for p in predictions)

    output = {
        "status": "success",
        "target_date": ctx["date"],
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "model": model_name,
        "history_through": last_date.strftime("%Y-%m-%d") if last_date else None,
        "history_days": int(df["date"].nunique()),
        "context": {
            "weather": weather_label,
            "temperature": round(temperature, 1),
            "is_weekend": bool(ctx["date.is_weekend"]),
            "is_holiday": bool(ctx["is_holiday"]),
            "weekday": ctx["weekday_name"],
            "hijri_date": ctx["hijri_date"],
            "hijri_month_name": ctx["hijri_month_name"],
            "is_ramadan": ctx["hijri_month"] == 9,
        },
        "total_items_predicted": total,
        "distinct_items": len(predictions),
        "menu_breakdown": predictions,
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
