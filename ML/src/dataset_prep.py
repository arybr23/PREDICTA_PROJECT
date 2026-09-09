import os
import json
import pandas as pd

SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SRC_DIR)

RAW_DIR = os.path.join(ML_DIR, "data", "raw")
PROCESSED_DIR = os.path.join(ML_DIR, "data", "processed")

FEATURE_COLUMNS = [
    # Lag features
    "lag_1", "lag_2", "lag_3", "lag_7", "lag_14",
    # Rolling features
    "rolling_3_mean", "rolling_3_std",
    "rolling_7_mean", "rolling_7_std",
    "rolling_14_mean", "rolling_14_std",
    # Stockout lags
    "lag_1_stockout", "lag_7_stockout", "stockout_last_7",
    # Calendar
    "date.is_weekend", "is_holiday", "date.month", "date.day",
    "hijri_month", "hijri_day",
    # Weather + temperature
    "weather", "temperature",
    # Product
    "item_id",
]

TARGET_COLUMN = "units_sold"

LABEL_ENCODE_COLUMNS = ["weather", "item_id", "item_category"]


def _build_label_maps(df: pd.DataFrame) -> dict:
    """Create sorted label → int mappings for each string column."""
    label_maps = {}
    for col in LABEL_ENCODE_COLUMNS:
        if col in df.columns:
            unique_vals = sorted(df[col].dropna().unique())
            label_maps[col] = {val: i for i, val in enumerate(unique_vals)}
    return label_maps


def _apply_label_encoding(df: pd.DataFrame, label_maps: dict) -> pd.DataFrame:
    """Replace string columns with integer labels."""
    for col, mapping in label_maps.items():
        if col in df.columns:
            df[col] = df[col].map(mapping).astype("Int64")
    return df


def _save_label_maps(label_maps: dict, path: str):
    """Save label maps to JSON."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(label_maps, f, indent=2, ensure_ascii=False)
    print(f"  Label maps saved → {path}")


def _load_label_maps(path: str) -> dict:
    with open(path) as f:
        return json.load(f)


def _prep_common(df: pd.DataFrame, label_maps: dict) -> pd.DataFrame:
    """Shared preprocessing: rename, label-encode, drop NaN lag rows."""
    rename_map = {
        "lag_1_units":  "lag_1",
        "lag_2_units":  "lag_2",
        "lag_3_units":  "lag_3",
        "lag_7_units":  "lag_7",
        "lag_14_units": "lag_14",
    }
    df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})
    df = _apply_label_encoding(df, label_maps)

    lag_cols = [c for c in df.columns if c.startswith("lag_") or c.startswith("rolling_")]
    before = len(df)
    df = df.dropna(subset=lag_cols).reset_index(drop=True)
    print(f"  Dropped {before - len(df)} NaN rows → {len(df)} rows")
    return df


def build_feature_matrix(
    input_path: str = None,
    output_path: str = None,
    label_map_path: str = None,
):
    input_path = input_path or os.path.join(RAW_DIR, "historical_sales.csv")
    output_path = output_path or os.path.join(PROCESSED_DIR, "feature_matrix.csv")
    label_map_path = label_map_path or os.path.join(PROCESSED_DIR, "label_encoders.json")

    if not os.path.exists(input_path):
        print(f"Raw data not found at '{input_path}'. Run generate_mock_data.py first.")
        return None

    df = pd.read_csv(input_path)
    df["date"] = pd.to_datetime(df["date"])
    print(f"Loaded {len(df)} rows from {input_path}")

    df = df.sort_values(["item_id", "date"]).reset_index(drop=True)

    label_maps = _build_label_maps(df)
    df = _prep_common(df, label_maps)
    _save_label_maps(label_maps, label_map_path)

    available_features = [c for c in FEATURE_COLUMNS if c in df.columns]
    missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
    if missing:
        print(f"Warning: missing columns: {missing}")

    keep_cols = available_features + [TARGET_COLUMN]
    if "date" in df.columns:
        keep_cols.append("date")

    df_out = df[keep_cols].copy()

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df_out.to_csv(output_path, index=False)
    print(f"Feature matrix saved: {len(df_out)} rows, {len(df_out.columns)} cols → {output_path}")
    return df_out


def build_train_test(
    train_input: str = None,
    test_input: str = None,
    train_output: str = None,
    test_output: str = None,
    label_map_path: str = None,
):
    train_input = train_input or os.path.join(RAW_DIR, "train.csv")
    test_input = test_input or os.path.join(RAW_DIR, "test.csv")
    train_output = train_output or os.path.join(PROCESSED_DIR, "train.csv")
    test_output = test_output or os.path.join(PROCESSED_DIR, "test.csv")
    label_map_path = label_map_path or os.path.join(PROCESSED_DIR, "label_encoders.json")

    # Build label maps from full raw data for consistency
    raw_path = os.path.join(RAW_DIR, "historical_sales.csv")
    if os.path.exists(raw_path):
        raw_df = pd.read_csv(raw_path)
        label_maps = _build_label_maps(raw_df)
    else:
        label_maps = {}

    for label, inp, out in [("train", train_input, train_output),
                             ("test", test_input, test_output)]:
        if not os.path.exists(inp):
            print(f"{label} not found at '{inp}'. Skipping.")
            continue

        df = pd.read_csv(inp)
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values(["item_id", "date"]).reset_index(drop=True)
        df = _prep_common(df, label_maps)

        os.makedirs(os.path.dirname(out), exist_ok=True)
        df.to_csv(out, index=False)
        print(f"  {label} saved → {out}")


def decode_predictions(pred_df: pd.DataFrame, label_map_path: str = None) -> pd.DataFrame:
    """Utility: convert integer-encoded columns back to original strings."""
    label_map_path = label_map_path or os.path.join(PROCESSED_DIR, "label_encoders.json")
    label_maps = _load_label_maps(label_map_path)

    df = pred_df.copy()
    for col, mapping in label_maps.items():
        if col in df.columns:
            inv_map = {v: k for k, v in mapping.items()}
            df[col] = df[col].map(inv_map)
    return df


if __name__ == "__main__":
    build_feature_matrix()
    build_train_test()
