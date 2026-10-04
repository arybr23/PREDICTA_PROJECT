"""Fine-tune the forecasting model on newly logged sales.

Continual learning: start from an existing model (the adapted one if present,
otherwise the best offline horizon model) and run a small number of boosting
rounds at a low learning rate so the store's own data nudges the weights
without washing out the learned seasonal patterns.

Usage:
    python incremental_train.py [--data data/processed/feature_matrix.csv]
                                [--base model_2years.model]
                                [--out  active_model.model]
                                [--rounds 10] [--tail-days 120]
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

warnings.filterwarnings("ignore")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from store_paths import feature_matrix_path, models_dir  # noqa: E402

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SRC_DIR)

MODELS_DIR = os.path.join(ML_DIR, "models")
DATA_DIR = os.path.join(ML_DIR, "data")
FEATURE_MATRIX_PATH = os.path.join(DATA_DIR, "processed", "feature_matrix.csv")
COMPARISON_PATH = os.path.join(DATA_DIR, "processed", "data_size_models_comparison.csv")

ACTIVE_MODEL = "active_model.model"
DEFAULT_MODEL = "model_2years.model"
FRESH_ROUNDS = 60
TARGET = "units_sold"

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


def best_offline_model():
    try:
        report = pd.read_csv(COMPARISON_PATH).dropna(subset=["MAE"]).sort_values("MAE")
        for name in report["Model File"]:
            if os.path.exists(os.path.join(MODELS_DIR, name)):
                return name
    except Exception:  # noqa: BLE001
        pass
    return DEFAULT_MODEL


def main():
    parser = argparse.ArgumentParser(description="Incrementally train the forecast model")
    parser.add_argument("--data", default=None, help="CSV with engineered features")
    parser.add_argument("--base", default=None, help="Model to continue training from")
    parser.add_argument("--out", default=ACTIVE_MODEL, help="Model filename to write")
    parser.add_argument("--store", default=None,
                        help="Train on one store's own data and models")
    parser.add_argument("--rounds", type=int, default=10, help="Boosting rounds")
    parser.add_argument("--learning-rate", type=float, default=0.03)
    parser.add_argument("--tail-days", type=int, default=120,
                        help="Only train on the most recent N days (0 = all)")
    args = parser.parse_args()

    data_path = args.data or feature_matrix_path(args.store)
    models = models_dir(args.store)

    if not os.path.exists(data_path):
        fail(f"Training data not found: {data_path}")

    out_path = os.path.join(models, args.out)

    # A store never inherits an offline model (those were trained on the shared
    # catalog dataset): its first training run builds a model from scratch.
    if args.base:
        base_name = args.base
    elif os.path.exists(out_path):
        base_name = args.out
    elif args.store:
        base_name = None
    else:
        base_name = best_offline_model()

    base_path = os.path.join(models, base_name) if base_name else None
    if base_path and not os.path.exists(base_path):
        fail(f"Base model not found: {base_name}", hint="Run train_multiple_models_complete.py first")

    df = pd.read_csv(data_path)
    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        fail(f"Training data missing columns: {missing}")

    if args.tail_days and "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"])
        cutoff = df["date"].max() - pd.Timedelta(days=args.tail_days)
        df = df[df["date"] >= cutoff]

    if df.empty:
        fail("No rows available for incremental training")

    X = df[FEATURES]
    y = df[TARGET]

    params = {
        "objective": "regression",
        "metric": "rmse",
        "learning_rate": args.learning_rate,
        "verbose": -1,
    }

    try:
        if base_path:
            base_model = lgb.Booster(model_file=base_path)
            rounds_used = args.rounds
            updated = lgb.train(
                params,
                lgb.Dataset(X, label=y),
                num_boost_round=rounds_used,
                init_model=base_model,
            )
            before = base_model.predict(X)
        else:
            base_model = None
            rounds_used = max(args.rounds, FRESH_ROUNDS)
            updated = lgb.train(
                params,
                lgb.Dataset(X, label=y),
                num_boost_round=rounds_used,
            )
            # No previous model: compare against predicting the overall mean.
            before = np.full(len(y), float(np.mean(y)))
    except Exception as exc:  # noqa: BLE001
        fail(f"Training failed: {exc}")

    os.makedirs(models, exist_ok=True)
    updated.save_model(out_path)

    after = updated.predict(X)
    mae_before = float(np.mean(np.abs(y - before)))
    mae_after = float(np.mean(np.abs(y - after)))

    print(json.dumps({
        "status": "success",
        "base_model": base_name,
        "output_model": args.out,
        "rows_used": int(len(df)),
        "rounds": rounds_used,
        "mae_before": round(mae_before, 2),
        "mae_after": round(mae_after, 2),
        "improved": bool(mae_after <= mae_before),
        "trained_at": datetime.now().isoformat(timespec="seconds"),
    }))


if __name__ == "__main__":
    main()
