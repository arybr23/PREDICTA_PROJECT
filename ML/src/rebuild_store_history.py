"""Derive a store's ML files from its dataset.

The dataset (ML/salesHistory/<storeId>/datasets/<storeId>.csv) is the plain
sales record: date, item, units, stockout. Everything the model needs beyond that
— the calendar context, the censored-demand estimate, the lag and rolling
windows, the label encoders — is derived here.

    dataset  ──►  salesHistory/<id>/raw/historical_sales.csv        (40 columns)
             ──►  salesHistory/<id>/processed/feature_matrix.csv
                  salesHistory/<id>/processed/label_encoders.json

This is the bridge the import needs: uploading a store's back-catalogue fills
the dataset, and this turns that into something the forecast can actually use.

Usage:
    python rebuild_store_history.py --store STR-4418
    python rebuild_store_history.py --store STR-4418 --weather /tmp/weather.json
    python rebuild_store_history.py --store STR-4418 --skip-features

`--weather` points at a JSON map of date -> {weather, temperature}. The dataset
has no weather column, so without it those two columns are left blank — the
store still trains, it just loses the weather signal.

Rebuilding is idempotent: the history is written from scratch every run, so it
can be re-run after a correction without producing duplicates.
"""

import argparse
import json
import os
import sys

import numpy as np
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from calendar_utils import build_calendar_context, parse_date  # noqa: E402
from dataset_prep import build_feature_matrix  # noqa: E402
from generate_mock_data import _compute_lag_rolling  # noqa: E402
from store_paths import (  # noqa: E402
    bootstrap_history,
    dataset_path,
    encoders_path,
    feature_matrix_path,
    history_columns,
    history_path,
)

# Matches append_daily_log.py: a stockout censors demand, so the real demand is
# estimated above what actually sold.
STOCKOUT_DEMAND_LIFT = 1.20


def fail(message, **extra):
    payload = {"status": "error", "message": message}
    payload.update(extra)
    print(json.dumps(payload))
    sys.exit(1)


def read_dataset(store_id):
    path = dataset_path(store_id)
    if not os.path.exists(path):
        fail(
            f"No dataset for store '{store_id}'",
            hint="Import a sales file, or log a day, before rebuilding",
            path=path,
        )

    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    required = {"date", "item_id", "units_sold"}
    missing = required - set(df.columns)
    if missing:
        fail(f"Dataset is missing columns: {sorted(missing)}", path=path)

    return df, path


def build_history(dataset, weather_map, category_by_item=None):
    """One row per (date, item) with the full 40-column layout."""
    category_by_item = category_by_item or {}
    rows = []
    skipped = {"bad_date": 0, "bad_units": 0}

    for record in dataset.to_dict("records"):
        parsed = parse_date(record.get("date"))
        if parsed is None:
            skipped["bad_date"] += 1
            continue

        try:
            units = int(float(record.get("units_sold") or 0))
        except (TypeError, ValueError):
            skipped["bad_units"] += 1
            continue

        stockout = 1 if str(record.get("stockout", "0")).strip() in ("1", "true", "True") else 0
        date_str = parsed.strftime("%Y-%m-%d")
        ctx = build_calendar_context(parsed)

        # A stockout means demand was censored: inventory capped sales below
        # real demand, so estimate the true figure above what was observed.
        true_demand = int(round(units * STOCKOUT_DEMAND_LIFT)) if stockout else units
        inventory = units if stockout else int(round(units * 1.5)) or 1

        supplied = weather_map.get(date_str) or {}

        rows.append({
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
            "holiday_name": "",
            "active_events": "",
            "weather": supplied.get("weather", ""),
            "temperature": supplied.get("temperature", ""),
            "item_id": str(record.get("item_id", "")).strip(),
            "item_name": str(record.get("item_name", "")).strip(),
            # The dataset has no category, so take it from the store's menu when
            # one was supplied. Purely descriptive — the model never sees it.
            "item_category": (
                str(record.get("item_category", "")).strip()
                or category_by_item.get(str(record.get("item_id", "")).strip(), "")
            ),
            # Generator-only provenance. Nothing fills these for a real store;
            # they exist because the header is copied from the global history.
            "base_demand": "",
            "available_inventory": inventory,
            "true_demand": true_demand,
            "stockout_flag": stockout,
            "units_sold": units,
        })

    if not rows:
        fail("No usable rows in the dataset", skipped=skipped)

    frame = pd.DataFrame(rows)

    # The lag windows are the one part that must be computed across the whole
    # series at once, so it is done after the frame exists.
    lags = _compute_lag_rolling(frame.copy())
    frame = frame.merge(lags, on=["item_id", "date"], how="left")

    # Only keep the columns the canonical header declares, in that order, so the
    # file matches what append_daily_log and dataset_prep expect.
    columns = history_columns()
    for column in columns:
        if column not in frame.columns:
            frame[column] = ""
    return frame[columns], skipped


def main():
    parser = argparse.ArgumentParser(description="Derive a store's ML files from its dataset")
    parser.add_argument("--store", required=True, help="Store id")
    parser.add_argument("--weather", default=None,
                        help="JSON file: {\"YYYY-MM-DD\": {\"weather\", \"temperature\"}}")
    parser.add_argument("--menu", default=None,
                        help="JSON file: {\"items\":[{\"itemId\",\"name\",\"category\"}]}")
    parser.add_argument("--skip-features", action="store_true",
                        help="Write the history only, not the feature matrix")
    args = parser.parse_args()

    store_id = "".join(c for c in str(args.store) if c.isalnum() or c in "-_")
    if not store_id:
        fail("store id is empty")

    weather_map = {}
    if args.weather and os.path.exists(args.weather):
        with open(args.weather, encoding="utf-8") as handle:
            weather_map = json.load(handle)

    category_by_item = {}
    if args.menu and os.path.exists(args.menu):
        with open(args.menu, encoding="utf-8") as handle:
            for item in json.load(handle).get("items", []):
                if item.get("itemId") and item.get("category"):
                    category_by_item[str(item["itemId"])] = str(item["category"])

    dataset, dataset_path = read_dataset(store_id)

    raw_path = history_path(store_id)
    bootstrap_history(raw_path)

    frame, skipped = build_history(dataset, weather_map, category_by_item)

    # Rewrite from scratch rather than merging: this is a derived file, and a
    # stale row from a previous dataset would otherwise survive forever.
    frame.to_csv(raw_path, index=False)

    weather_days = int((frame["weather"].astype(str).str.strip() != "").sum())

    feature_rows = None
    if not args.skip_features:
        built = build_feature_matrix(
            input_path=raw_path,
            output_path=feature_matrix_path(store_id),
            label_map_path=encoders_path(store_id),
            # A store history can be short; pad the missing lag windows rather
            # than dropping the rows it does have.
            fill_missing=True,
        )
        feature_rows = int(len(built)) if built is not None else None

    dates = sorted(frame["date"].unique())

    print(json.dumps({
        "status": "success",
        "store_id": store_id,
        "dataset": dataset_path,
        "history": raw_path,
        "rows": int(len(frame)),
        "days": len(dates),
        "items": int(frame["item_id"].nunique()),
        "date_from": dates[0] if dates else None,
        "date_to": dates[-1] if dates else None,
        "weather_days": weather_days,
        "weather_supplied": len(weather_map),
        "skipped": skipped,
        "feature_matrix_rows": feature_rows,
        "history_columns": len(frame.columns),
    }))


if __name__ == "__main__":
    main()
