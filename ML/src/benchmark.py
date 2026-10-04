"""Backtest the active model against a naive baseline over recent history.

The dashboard's operational metrics (waste reduction, cost savings) need real
numbers, not placeholders. Over-preparing is what creates food waste, so the
metric that matters is *over*-prediction: how many units we would have bought
or cooked above what actually sold.

Baseline: "repeat the average of the last 7 days" — what a store would do
without a model.

Usage:
    python benchmark.py [--days 30] [--model model_2years.model]
"""

import os
import sys
import json
import argparse
import warnings
from datetime import datetime

import numpy as np
import pandas as pd
import lightgbm as lgb

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from calendar_utils import build_calendar_context, parse_date  # noqa: E402
from store_paths import history_path  # noqa: E402
from predict import (  # noqa: E402
    build_row,
    load_encoders,
    resolve_model,
)

warnings.filterwarnings("ignore")

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


def main():
    parser = argparse.ArgumentParser(description="Backtest forecast vs naive baseline")
    parser.add_argument("--days", type=int, default=30, help="Number of recent days to test")
    parser.add_argument("--model", default=None,
                        help="Model filename in the store's ML/salesHistory/<id>/models/ dir (or ML/models/ for offline models)")
    parser.add_argument("--store", default=None,
                        help="Backtest one store's own history and model")
    args = parser.parse_args()

    # A store history grows one day at a time, so it backtests over whatever it
    # has instead of demanding the offline dataset's 20+ day cushion.
    min_dates = 3 if args.store else args.days + 20
    min_prior = 3 if args.store else 15

    raw_path = history_path(args.store)
    if not os.path.exists(raw_path):
        fail(f"No sales history for store '{args.store}'" if args.store
             else "Historical sales data missing")

    model_path, model_name = resolve_model(args.model, args.store)
    encoders = load_encoders(args.store)
    item_encoding = encoders.get("item_id", {})
    category_encoding = encoders.get("item_category", {})
    weather_map = encoders.get("weather", {})

    try:
        model = lgb.Booster(model_file=model_path)
    except Exception as exc:  # noqa: BLE001
        fail(f"Failed to load model {model_name}: {exc}")

    df = pd.read_csv(raw_path)
    df = df.sort_values(["item_id", "date"]).reset_index(drop=True)

    all_dates = sorted(df["date"].unique())
    if len(all_dates) < min_dates:
        fail("Not enough history to benchmark")

    test_dates = all_dates[-args.days:]

    rows = []
    actuals = []
    naive_preds = []

    for sku, history in df.groupby("item_id", sort=True):
        code = item_encoding.get(sku)
        if code is None:
            continue

        history = history.sort_values("date").reset_index(drop=True)
        dates = history["date"].tolist()
        units = history["units_sold"].astype(float).tolist()
        stockouts = history["stockout_flag"].astype(float).tolist()
        weathers = history["weather"].tolist()
        temps = history["temperature"].astype(float).tolist()
        categories = history["item_category"].tolist() if "item_category" in history.columns else []

        index_by_date = {d: i for i, d in enumerate(dates)}

        for target in test_dates:
            i = index_by_date.get(target)
            if i is None or i < min_prior:
                continue

            prior_units = units[:i]
            prior_stockouts = stockouts[:i]
            actual = units[i]

            ctx = build_calendar_context(parse_date(target))
            weather_code = weather_map.get(weathers[i], list(weather_map.values())[0] if weather_map else 0)
            temp = temps[i]
            if not np.isfinite(temp):
                temp = 0.0

            cat = categories[i] if categories else None
            type_code = category_encoding.get(cat, 0) if cat else 0

            rows.append(
                build_row(
                    prior_units,
                    prior_stockouts,
                    int(code),
                    int(type_code),
                    ctx,
                    weather_code,
                    temp,
                )
            )
            actuals.append(actual)
            naive_preds.append(float(np.mean(prior_units[-7:])))

    if not rows:
        fail("No comparable rows found for benchmarking")

    X = pd.DataFrame(rows)[FEATURES]
    model_preds = np.clip(model.predict(X), 0, None)
    actuals = np.asarray(actuals, dtype=float)
    naive_preds = np.asarray(naive_preds, dtype=float)

    def mae(pred):
        return float(np.mean(np.abs(actuals - pred)))

    def mape(pred):
        mask = actuals > 0
        if not mask.any():
            return 0.0
        return float(np.mean(np.abs((actuals[mask] - pred[mask]) / actuals[mask])) * 100)

    def overage(pred):
        """Mean units prepared above what actually sold — the waste proxy."""
        return float(np.mean(np.maximum(0.0, pred - actuals)))

    model_mae = mae(model_preds)
    naive_mae = mae(naive_preds)
    model_over = overage(model_preds)
    naive_over = overage(naive_preds)

    waste_reduction = ((naive_over - model_over) / naive_over * 100) if naive_over > 0 else 0.0
    accuracy = max(0.0, 100.0 - mape(model_preds))

    print(json.dumps({
        "status": "success",
        "model": model_name,
        "window_days": args.days,
        "comparisons": int(len(actuals)),
        "model_mae": round(model_mae, 2),
        "naive_mae": round(naive_mae, 2),
        "mae_improvement_pct": round(((naive_mae - model_mae) / naive_mae * 100) if naive_mae else 0.0, 2),
        "accuracy_pct": round(accuracy, 2),
        "model_overage_units": round(model_over, 2),
        "naive_overage_units": round(naive_over, 2),
        "waste_reduction_pct": round(max(0.0, waste_reduction), 2),
        "overstock_units_avoided_per_day": round(max(0.0, naive_over - model_over), 2),
        "generated_at": datetime.now().isoformat(timespec="seconds"),
    }))


if __name__ == "__main__":
    main()
