"""Per-store data and model locations.

Every forecast script accepts ``--store STORE_ID``. With a store id all of a
store's ML artifacts live under one per-identifier root so each category is its
own sub-folder:

    ML/salesHistory/<storeId>/datasets/<storeId>.csv   (plain sales record)
    ML/salesHistory/<storeId>/raw/historical_sales.csv  (40-column history)
    ML/salesHistory/<storeId>/processed/feature_matrix.csv
    ML/salesHistory/<storeId>/processed/label_encoders.json
    ML/salesHistory/<storeId>/models/active_model.model

so one store never reads another store's data. Without a store id the historical
global layout (``ML/data/{raw,processed}`` and ``ML/models``) is used, which
keeps the offline training scripts (train_base, generate_mock_data, ...) working
unchanged.
"""

import csv
import os
import re

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SRC_DIR)

# Per-store ML artifacts now live under one per-identifier root so every
# category (datasets, raw history, processed features, models) is co-located:
#
#     ML/salesHistory/<storeId>/datasets/<storeId>.csv
#     ML/salesHistory/<storeId>/raw/historical_sales.csv
#     ML/salesHistory/<storeId>/processed/feature_matrix.csv
#     ML/salesHistory/<storeId>/processed/label_encoders.json
#     ML/salesHistory/<storeId>/models/active_model.model
SALES_HISTORY_ROOT = os.path.join(ML_DIR, "salesHistory")

# Global / offline layout is unchanged — the offline training scripts
# (train_base, generate_mock_data, train_multiple_models_*, evaluate) keep
# writing here, and the per-store scripts never read from it.
RAW_DIR = os.path.join(ML_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(ML_DIR, "data", "processed")
MODELS_DIR = os.path.join(ML_DIR, "models")

GLOBAL_HISTORY = os.path.join(RAW_DIR, "historical_sales.csv")

HISTORY_FILE = "historical_sales.csv"
FEATURE_MATRIX_FILE = "feature_matrix.csv"
ENCODERS_FILE = "label_encoders.json"

# Column layout of a store history file. The global history's header wins when
# it exists so both layouts stay identical; this list is the fallback.
FALLBACK_COLUMNS = [
    "date", "date.weekday", "date.day", "date.month", "date.year",
    "date.is_weekend", "hijri_date", "hijri_year", "hijri_month", "hijri_day",
    "is_holiday", "holiday_name", "active_events", "weather", "temperature",
    "item_id", "item_name", "item_category", "base_demand",
    "available_inventory", "true_demand",
    "stockout_flag", "units_sold", "lag_1_units", "lag_2_units", "lag_3_units",
    "lag_7_units", "lag_14_units", "rolling_3_mean", "rolling_3_std",
    "rolling_7_mean", "rolling_7_std", "rolling_14_mean", "rolling_14_std",
    "lag_1_stockout", "lag_7_stockout", "stockout_last_7",
]

_STORE_ID_RE = re.compile(r"[^A-Za-z0-9_-]")


def sanitize_store_id(store_id):
    """Keep store ids filesystem-safe (they come in from the API layer)."""
    cleaned = _STORE_ID_RE.sub("", str(store_id or "").strip())
    if not cleaned:
        raise ValueError("store id is empty")
    return cleaned


def store_root(store_id):
    """Root directory for one store's ML artifacts: ML/salesHistory/<storeId>."""
    sid = sanitize_store_id(store_id)
    return os.path.join(SALES_HISTORY_ROOT, sid)


def store_paths(store_id=None):
    """Resolve the raw/processed/model roots for one store (or the global set)."""
    if not store_id:
        return {
            "global": True,
            "raw": RAW_DIR,
            "processed": PROCESSED_DIR,
            "models": MODELS_DIR,
        }

    root = store_root(store_id)
    return {
        "global": False,
        "raw": os.path.join(root, "raw"),
        "processed": os.path.join(root, "processed"),
        "models": os.path.join(root, "models"),
    }


def dataset_path(store_id):
    """Per-store dataset CSV: ML/salesHistory/<storeId>/datasets/<storeId>.csv."""
    sid = sanitize_store_id(store_id)
    return os.path.join(store_root(store_id), "datasets", f"{sid}.csv")


def history_path(store_id=None):
    return os.path.join(store_paths(store_id)["raw"], HISTORY_FILE)


def feature_matrix_path(store_id=None):
    return os.path.join(store_paths(store_id)["processed"], FEATURE_MATRIX_FILE)


def encoders_path(store_id=None):
    return os.path.join(store_paths(store_id)["processed"], ENCODERS_FILE)


def models_dir(store_id=None):
    return store_paths(store_id)["models"]


def history_columns():
    """Header used to bootstrap a fresh store history file."""
    if os.path.exists(GLOBAL_HISTORY):
        try:
            with open(GLOBAL_HISTORY, newline="") as handle:
                return next(csv.reader(handle))
        except (OSError, StopIteration):
            pass
    return list(FALLBACK_COLUMNS)


def bootstrap_history(path):
    """Create an empty history CSV (header only) so the first log can be appended."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if not os.path.exists(path):
        with open(path, "w", newline="") as handle:
            csv.writer(handle).writerow(history_columns())
    return path
