"""Fold a day of actual logged sales back into the historical dataset.

Reads a JSON payload (from a file argument or stdin):

    {
      "date": "2026-09-17",
      "weather": "cerah",
      "temperature": 29.0,
      "entries": [
        {"item_id": "P01", "units_sold": 88, "stockout": 0},
        {"item_id": "P02", "units_sold": 60, "stockout": 1}
      ]
    }

For each entry it upserts the (date, item_id) observation, recomputes the
lag/rolling features for every product, rewrites historical_sales.csv and
rebuilds the processed feature matrix so the next prediction uses the new data.

A stockout means demand was censored: we only observed as many sales as we had
inventory, so true demand is estimated above units sold.
"""

import os
import sys
import json
import argparse
import warnings
from datetime import datetime

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from calendar_utils import build_calendar_context, parse_date  # noqa: E402
from dataset_prep import build_feature_matrix  # noqa: E402

# Reuse the generator's feature code so stored history and training stay aligned.
from generate_mock_data import _compute_lag_rolling  # noqa: E402

warnings.filterwarnings("ignore")

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SRC_DIR)
RAW_HISTORY_PATH = os.path.join(ML_DIR, "data", "raw", "historical_sales.csv")

LAG_COLUMNS = [
    "lag_1_units", "lag_2_units", "lag_3_units", "lag_7_units", "lag_14_units",
    "rolling_3_mean", "rolling_3_std",
    "rolling_7_mean", "rolling_7_std",
    "rolling_14_mean", "rolling_14_std",
    "lag_1_stockout", "lag_7_stockout", "stockout_last_7",
]

STOCKOUT_DEMAND_LIFT = 1.20


def fail(message, **extra):
    payload = {"status": "error", "message": message}
    payload.update(extra)
    print(json.dumps(payload))
    sys.exit(1)


def load_payload(path):
    if path:
        if not os.path.exists(path):
            fail(f"Payload file not found: {path}")
        with open(path) as f:
            return json.load(f)
    return json.load(sys.stdin)


def upsert(df, payload):
    """Insert or update observations for the logged date. Returns rows touched."""
    log_date = parse_date(payload.get("date"))
    if log_date is None:
        fail("Payload is missing a valid 'date' (YYYY-MM-DD)")

    entries = payload.get("entries") or []
    if not entries:
        fail("Payload contains no 'entries'")

    ctx = build_calendar_context(log_date)
    weather = payload.get("weather")
    temperature = payload.get("temperature")

    date_str = log_date.strftime("%Y-%m-%d")
    template = df.iloc[-1].to_dict() if len(df) else {}
    touched = 0

    for entry in entries:
        sku = entry.get("item_id")
        if not sku:
            continue

        units = int(entry.get("units_sold") or 0)
        stockout = int(bool(entry.get("stockout")))

        prior = df[(df["item_id"] == sku) & (df["date"] == date_str)]

        if len(prior):
            idx = prior.index[-1]
            row = df.loc[idx].to_dict()
        else:
            history = df[df["item_id"] == sku]
            row = history.iloc[-1].to_dict() if len(history) else dict(template)
            row["date"] = date_str
            row["item_id"] = sku

        # A stockout censors demand: inventory capped sales below real demand.
        true_demand = int(round(units * STOCKOUT_DEMAND_LIFT)) if stockout else units
        inventory = units if stockout else int(round(units * 1.5)) or 1

        row.update({
            "date": date_str,
            "date.weekday": ctx["date.weekday"],
            "date.day": ctx["date.day"],
            "date.month": ctx["date.month"],
            "date.year": ctx["date.year"],
            "date.is_weekend": ctx["date.is_weekend"],
            "hijri_date": ctx["hijri_date"],
            "hijri_year": ctx["hijri_year"],
            "hijri_month": ctx["hijri_month"],
            "hijri_day": ctx["hijri_day"],
            "is_holiday": ctx["is_holiday"],
            "units_sold": units,
            "stockout_flag": stockout,
            "true_demand": true_demand,
            "available_inventory": inventory,
        })

        if weather is not None:
            row["weather"] = weather
        if temperature is not None:
            row["temperature"] = float(temperature)

        if len(prior):
            for key, value in row.items():
                df.at[idx, key] = value
        else:
            df = pd.concat([df, pd.DataFrame([row])], ignore_index=True)

        touched += 1

    return df, date_str, touched


def main():
    parser = argparse.ArgumentParser(description="Append logged sales to history")
    parser.add_argument("payload", nargs="?", help="Path to JSON payload (default: stdin)")
    parser.add_argument("--skip-features", action="store_true",
                        help="Only update history, do not rebuild the feature matrix")
    args = parser.parse_args()

    if not os.path.exists(RAW_HISTORY_PATH):
        fail("Historical sales data missing", hint="Run generate_mock_data.py first")

    payload = load_payload(args.payload)
    df = pd.read_csv(RAW_HISTORY_PATH)
    df = df.sort_values(["item_id", "date"]).reset_index(drop=True)

    df, date_str, touched = upsert(df, payload)
    if touched == 0:
        fail("No entries could be applied")

    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["item_id", "date"]).reset_index(drop=True)

    # Recompute every lag/rolling column against the updated series.
    existing = [c for c in LAG_COLUMNS if c in df.columns]
    df = df.drop(columns=existing)
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    df = df.merge(_compute_lag_rolling(df.copy()), on=["item_id", "date"], how="left")
    df = df.sort_values(["item_id", "date"]).reset_index(drop=True)

    df.to_csv(RAW_HISTORY_PATH, index=False)

    feature_rows = None
    if not args.skip_features:
        built = build_feature_matrix()
        feature_rows = int(len(built)) if built is not None else None

    output = {
        "status": "success",
        "date": date_str,
        "rows_updated": touched,
        "history_days": int(df["date"].nunique()),
        "history_rows": int(len(df)),
        "feature_matrix_rows": feature_rows,
        "updated_at": datetime.now().isoformat(timespec="seconds"),
    }
    print(json.dumps(output))


if __name__ == "__main__":
    main()
