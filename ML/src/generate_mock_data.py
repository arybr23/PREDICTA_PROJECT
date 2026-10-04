import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from hijridate import Hijri, Gregorian

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
np.random.seed(42)

PRODUCTS = [
    {"item_id": "P01", "name": "Nasi Goreng Spesial",    "base_demand": 95,  "category": "makanan_berat"},
    {"item_id": "P02", "name": "Mie Goreng Ayam",        "base_demand": 80,  "category": "makanan_berat"},
    {"item_id": "P03", "name": "Nasi Kuning",            "base_demand": 60,  "category": "makanan_berat"},
    {"item_id": "P04", "name": "Nasi Uduk",              "base_demand": 55,  "category": "makanan_berat"},
    {"item_id": "P05", "name": "Mie Ayam Bakso",         "base_demand": 70,  "category": "makanan_berat"},
    {"item_id": "P06", "name": "Soto Ayam",              "base_demand": 50,  "category": "makanan_berat"},
    {"item_id": "P07", "name": "Ayam Geprek",            "base_demand": 65,  "category": "makanan_berat"},
    {"item_id": "P08", "name": "Es Teh Manis",           "base_demand": 160, "category": "minuman"},
    {"item_id": "P09", "name": "Es Jeruk",               "base_demand": 110, "category": "minuman"},
    {"item_id": "P10", "name": "Kopi Hitam",             "base_demand": 90,  "category": "minuman"},
    {"item_id": "P11", "name": "Teh Anget",              "base_demand": 75,  "category": "minuman"},
    {"item_id": "P12", "name": "Jus Alpukat",            "base_demand": 45,  "category": "minuman"},
    {"item_id": "P13", "name": "Es Campur",              "base_demand": 40,  "category": "minuman"},
    {"item_id": "P14", "name": "Kerupuk",                "base_demand": 120, "category": "snack"},
    {"item_id": "P15", "name": "Kue Lumpur",             "base_demand": 35,  "category": "snack"},
    {"item_id": "P16", "name": "Pisang Goreng",          "base_demand": 55,  "category": "snack"},
    {"item_id": "P17", "name": "Lemper",                 "base_demand": 40,  "category": "snack"},
    {"item_id": "P18", "name": "Serabi",                 "base_demand": 30,  "category": "snack"},
    {"item_id": "P19", "name": "Tahu Isi",               "base_demand": 50,  "category": "snack"},
    {"item_id": "P20", "name": "Tempe Goreng",           "base_demand": 45,  "category": "snack"},
    {"item_id": "P21", "name": "Roti Bakar Coklat",      "base_demand": 35,  "category": "snack"},
    {"item_id": "P22", "name": "Telur Dadar",            "base_demand": 60,  "category": "makanan_berat"},
    {"item_id": "P23", "name": "Capcay",                 "base_demand": 45,  "category": "makanan_berat"},
    {"item_id": "P24", "name": "Nasi Goreng Seafood",    "base_demand": 40,  "category": "makanan_berat"},
    {"item_id": "P25", "name": "Bakso Urat",             "base_demand": 55,  "category": "makanan_berat"},
]

WEATHER_TYPES = {
    "cerah":    {"prob": 0.30, "temp_range": (28, 35), "demand_mult": 1.00},
    "berawan":  {"prob": 0.25, "temp_range": (25, 31), "demand_mult": 1.05},
    "hujan_ringan": {"prob": 0.25, "temp_range": (23, 28), "demand_mult": 0.85},
    "hujan_deras":  {"prob": 0.15, "temp_range": (21, 26), "demand_mult": 0.70},
    "panas_extreme": {"prob": 0.05, "temp_range": (33, 38), "demand_mult": 1.10},
}

TEMPORARY_EVENTS = [
    {"name": "Promo_Beli2Gratis1",    "prob": 0.02, "demand_mult": 1.50, "duration_range": (2, 5)},
    {"name": "Festival_Kuliner",      "prob": 0.01, "demand_mult": 1.80, "duration_range": (3, 7)},
    {"name": "Launching_Produk_Baruv","prob": 0.015,"demand_mult": 1.30, "duration_range": (1, 3)},
    {"name": "Diskon_Akhir_Tahun",    "prob": 0.01, "demand_mult": 1.60, "duration_range": (5, 14)},
    {"name": "Event_Kantor_Sebelah",  "prob": 0.02, "demand_mult": 1.25, "duration_range": (1, 2)},
    {"name": "Musim_Ujian",           "prob": 0.015,"demand_mult": 1.35, "duration_range": (7, 21)},
]

# Gregorian monthly seasonality (index 0=Jan ... 11=Dec)
GREGORIAN_MONTHLY_MULT = {
    1: 0.95, 2: 0.90, 3: 0.92, 4: 0.93, 5: 0.97, 6: 1.00,
    7: 1.08, 8: 1.10, 9: 1.05, 10: 1.00, 11: 1.03, 12: 1.12,
}

# Hijri months (approximate demand modifiers for Islamic calendar)
HIJRI_MONTHLY_MULT = {
    1: 1.00,   # Muharram
    2: 1.00,   # Safar
    3: 1.02,   # Rabi al-Awwal
    4: 1.00,   # Rabi al-Thani
    5: 1.00,   # Jumada al-Ula
    6: 1.00,   # Jumada al-Thani
    7: 1.05,   # Rajab
    8: 1.10,   # Sha'ban
    9: 1.25,   # Ramadan  (fasting, higher evening demand)
    10: 1.40,  # Shawwal  (Eid al-Fitr)
    11: 1.15,  # Dhul Qi'dah (hajj season)
    12: 1.20,  # Dhul Hijjah (Eid al-Adha)
}

# Indonesian national holidays (month, day)
ID_HOLIDAYS_GREGORIAN = [
    (1, 1),    # Tahun Baru
    (5, 1),    # Hari Buruh
    (5, 20),   # Kenaikan Isa Almasih (approx)
    (6, 1),    # Hari Lahir Pancasila
    (6, 27),   # Idul Adha (approx, varies)
    (8, 17),   # HUT RI
    (12, 25),  # Natal
]

# ---------------------------------------------------------------------------
# Sensitivity profiles per product category
# ---------------------------------------------------------------------------
# Temperature sensitivity: (optimal_temp, sensitivity_per_degree)
# Positive sensitivity → demand rises as temp rises; negative → demand falls as temp rises.
TEMP_SENSITIVITY = {
    "makanan_berat": {"optimal": 26, "slope": -0.008},
    "minuman":       {"optimal": 30, "slope":  0.020},
    "snack":         {"optimal": 27, "slope": -0.003},
}

CATEGORY_SENSITIVITY = {
    "makanan_berat": {
        "weekend":        0.25,
        "holiday":        0.15,
        "event":          0.20,
        "weather_rain":  -0.20,
        "weather_hot":    0.10,
        "ramadan_evening": 0.30,
        "trend_slope":    0.0003,
    },
    "minuman": {
        "weekend":        0.20,
        "holiday":        0.10,
        "event":          0.15,
        "weather_rain":  -0.35,
        "weather_hot":    0.40,
        "ramadan_evening": 0.10,
        "trend_slope":    0.0005,
    },
    "snack": {
        "weekend":        0.30,
        "holiday":        0.20,
        "event":          0.25,
        "weather_rain":  -0.15,
        "weather_hot":    0.05,
        "ramadan_evening": 0.35,
        "trend_slope":    0.0002,
    },
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def gregorian_to_hijri(dt: datetime) -> Hijri:
    """Convert a Gregorian datetime to a Hijri date object."""
    g = Gregorian(dt.year, dt.month, dt.day)
    h = g.to_hijri()
    return h


def get_indonesian_holidays(year: int, hijri_year: int) -> set:
    """Return a set of (month, day) tuples for Gregorian + Hijri holidays."""
    holidays = set()
    for m, d in ID_HOLIDAYS_GREGORIAN:
        holidays.add((m, d))

    # Eid al-Fitr (1 Shawwal) — approximate
    try:
        shawwal_1 = Hijri(hijri_year, 10, 1).to_gregorian()
        holidays.add((shawwal_1.month, shawwal_1.day))
    except Exception:
        pass

    # Eid al-Adha (10 Dhul Hijjah) — approximate
    try:
        dh_hijjah_10 = Hijri(hijri_year, 12, 10).to_gregorian()
        holidays.add((dh_hijjah_10.month, dh_hijjah_10.day))
    except Exception:
        pass

    # Islamic New Year (1 Muharram)
    try:
        muharram_1 = Hijri(hijri_year, 1, 1).to_gregorian()
        holidays.add((muharram_1.month, muharram_1.day))
    except Exception:
        pass

    return holidays


def generate_weather(rng: np.random.Generator) -> dict:
    """Pick a weather type from the weighted distribution."""
    types = list(WEATHER_TYPES.keys())
    probs = [WEATHER_TYPES[t]["prob"] for t in types]
    chosen = rng.choice(types, p=probs)
    info = WEATHER_TYPES[chosen]
    temp = rng.uniform(*info["temp_range"])
    return {"weather": chosen, "temp": round(temp, 1), "demand_mult": info["demand_mult"]}


def generate_events_for_date(
    rng: np.random.Generator,
    date: datetime,
    active_events: list,
) -> list:
    """Check if any new event starts today; update active_events; return active ones."""
    # Decrement durations of already-active events
    expired = [e for e in active_events if e["days_left"] <= 1]
    for e in expired:
        active_events.remove(e)
    for e in active_events:
        e["days_left"] -= 1

    # Possibly start a new event
    for evt_def in TEMPORARY_EVENTS:
        if rng.random() < evt_def["prob"]:
            duration = rng.integers(*evt_def["duration_range"])
            active_events.append({
                "name": evt_def["name"],
                "days_left": int(duration),
                "demand_mult": evt_def["demand_mult"],
            })

    return active_events


def compute_true_demand(
    base_demand: float,
    sensitivity: dict,
    temp_sensitivity: dict,
    temperature: float,
    gregorian_mult: float,
    hijri_mult: float,
    is_weekend: bool,
    is_holiday: bool,
    active_events: list,
    weather_demand_mult: float,
    weather_rain: bool,
    weather_hot: bool,
    day_offset: int,
    rng: np.random.Generator,
) -> float:
    """Combine all multipliers to compute the true demand for one product on one day."""
    demand = base_demand

    # 1. Gregorian seasonality
    demand *= gregorian_mult

    # 2. Hijri seasonality
    demand *= hijri_mult

    # 3. Weekend effect
    if is_weekend:
        demand *= (1.0 + sensitivity["weekend"])

    # 4. Holiday effect
    if is_holiday:
        demand *= (1.0 + sensitivity["holiday"])

    # 5. Event effects (cumulative)
    for evt in active_events:
        demand *= evt["demand_mult"]

    # 6. Weather effect
    if weather_rain:
        demand *= (1.0 + sensitivity["weather_rain"])
    if weather_hot:
        demand *= (1.0 + sensitivity["weather_hot"])
    demand *= weather_demand_mult

    # 7. Temperature effect (continuous)
    temp_delta = temperature - temp_sensitivity["optimal"]
    temp_mult = 1.0 + temp_sensitivity["slope"] * temp_delta
    demand *= temp_mult

    # 8. Long-term trend
    demand *= (1.0 + sensitivity["trend_slope"] * day_offset)

    # 9. Random demand noise
    noise = rng.normal(0, base_demand * 0.08)
    demand += noise

    return max(5.0, demand)


# ---------------------------------------------------------------------------
# Main generator
# ---------------------------------------------------------------------------

def generate_mock_sales_data(
    num_days: int = 720,
    output_dir: str = "data/raw",
    train_path: str = None,
    test_path: str = None,
):
    rng = np.random.default_rng(42)

    start_date = datetime.now() - timedelta(days=num_days)
    all_observations = []
    active_events = []

    # Determine Hijri year range for holiday lookup
    h_start = gregorian_to_hijri(start_date)
    current_hijri_year = h_start.year

    # Pre-generate daily data
    daily_rows = []

    for day_offset in range(num_days):
        current_date = start_date + timedelta(days=day_offset)

        # Step 3: Gregorian date
        # Step 4: Hijri date
        hijri_date = gregorian_to_hijri(current_date)
        hijri_year = hijri_date.year

        # Update Hijri year if rolled over
        if hijri_year != current_hijri_year:
            current_hijri_year = hijri_year

        # Step 5: Weekend
        is_weekend = current_date.weekday() >= 5

        # Step 6: Holidays
        holidays = get_indonesian_holidays(current_date.year, hijri_year)
        is_holiday = (current_date.month, current_date.day) in holidays

        # Step 7: Temporary events
        active_events = generate_events_for_date(rng, current_date, active_events)

        # Step 8-9: Weather & temperature
        weather = generate_weather(rng)
        is_rainy = weather["weather"] in ("hujan_ringan", "hujan_deras")
        is_hot = weather["weather"] == "panas_extreme"

        # Step 10: Gregorian seasonal multiplier
        gregorian_mult = GREGORIAN_MONTHLY_MULT.get(current_date.month, 1.0)

        # Step 11: Hijri seasonal multiplier
        hijri_mult = HIJRI_MONTHLY_MULT.get(hijri_date.month, 1.0)

        # Step 12-16 are computed per product inside the loop below

        # Step 19: Generate available inventory for each product today
        inventory_map = {}
        for product in PRODUCTS:
            # Inventory is stochastic; usually sufficient, occasionally tight
            est_demand = product["base_demand"] * gregorian_mult * hijri_mult
            inventory_factor = rng.uniform(1.40, 2.60)
            inventory_map[product["item_id"]] = max(5, int(est_demand * inventory_factor))

        # Per-product demand calculation
        for product in PRODUCTS:
            sensitivity = CATEGORY_SENSITIVITY[product["category"]]
            temp_sens = TEMP_SENSITIVITY[product["category"]]

            # Steps 10-17: compute true demand
            true_demand = compute_true_demand(
                base_demand=product["base_demand"],
                sensitivity=sensitivity,
                temp_sensitivity=temp_sens,
                temperature=weather["temp"],
                gregorian_mult=gregorian_mult,
                hijri_mult=hijri_mult,
                is_weekend=is_weekend,
                is_holiday=is_holiday,
                active_events=active_events,
                weather_demand_mult=weather["demand_mult"],
                weather_rain=is_rainy,
                weather_hot=is_hot,
                day_offset=day_offset,
                rng=rng,
            )

            # Step 18: True demand
            true_demand_rounded = round(true_demand, 2)

            # Step 19: Available inventory (already generated)
            available_inventory = inventory_map[product["item_id"]]

            # Step 20: Stockout?
            stockout = 1 if true_demand_rounded > available_inventory else 0

            # Step 21: Actual units sold
            units_sold = int(min(true_demand_rounded, available_inventory))

            # Active event names for this day
            event_names = ",".join(e["name"] for e in active_events) if active_events else ""

            # Step 22: Store observation
            row = {
                "date": current_date.strftime("%Y-%m-%d"),
                "date.weekday": current_date.weekday(),
                "date.day": current_date.day,
                "date.month": current_date.month,
                "date.year": current_date.year,
                "date.is_weekend": int(is_weekend),
                "hijri_date": f"{hijri_date.year}-{hijri_date.month:02d}-{hijri_date.day:02d}",
                "hijri_year": hijri_date.year,
                "hijri_month": hijri_date.month,
                "hijri_day": hijri_date.day,
                "is_holiday": int(is_holiday),
                "holiday_name": "",
                "active_events": event_names,
                "weather": weather["weather"],
                "temperature": weather["temp"],
                "item_id": product["item_id"],
                "item_name": product["name"],
                "item_category": product["category"],
                "base_demand": product["base_demand"],
                "available_inventory": available_inventory,
                "true_demand": true_demand_rounded,
                "stockout_flag": stockout,
                "units_sold": units_sold,
            }
            daily_rows.append(row)

    df = pd.DataFrame(daily_rows)

    # ---- Step 23: Generate lag and rolling features ----
    print("Generating lag & rolling features …")
    lag_features = _compute_lag_rolling(df)
    df = df.merge(lag_features, on=["item_id", "date"], how="left")

    # ---- Step 24-25: Train/Test split (time-based) ----
    split_idx = int(len(df) * 0.80)
    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()

    # Fill NaN from lag features with 0 for training
    train_df = train_df.fillna(0)
    test_df = test_df.fillna(0)

    # ---- Save ----
    os.makedirs(output_dir, exist_ok=True)
    full_path = os.path.join(output_dir, "historical_sales.csv")
    train_path = train_path or os.path.join(output_dir, "train.csv")
    test_path = test_path or os.path.join(output_dir, "test.csv")

    df.to_csv(full_path, index=False)
    train_df.to_csv(train_path, index=False)
    test_df.to_csv(test_path, index=False)

    print(f"Full dataset  : {len(df)} rows → {full_path}")
    print(f"Train split   : {len(train_df)} rows → {train_path}")
    print(f"Test split    : {len(test_df)} rows → {test_path}")
    print("Done.")
    return df, train_df, test_df


# ---------------------------------------------------------------------------
# Lag & rolling feature engineering (Step 23)
# ---------------------------------------------------------------------------

def _compute_lag_rolling(df: pd.DataFrame) -> pd.DataFrame:
    """Compute lag and rolling-window features per product."""
    result_parts = []

    for item_id, grp in df.groupby("item_id"):
        grp = grp.sort_values("date").copy()

        for lag in [1, 2, 3, 7, 14]:
            grp[f"lag_{lag}_units"] = grp["units_sold"].shift(lag)

        for window in [3, 7, 14]:
            grp[f"rolling_{window}_mean"] = grp["units_sold"].shift(1).rolling(window).mean()
            grp[f"rolling_{window}_std"] = grp["units_sold"].shift(1).rolling(window).std()

        grp["lag_1_stockout"] = grp["stockout_flag"].shift(1)
        grp["lag_7_stockout"] = grp["stockout_flag"].shift(7)
        grp["stockout_last_7"] = grp["stockout_flag"].shift(1).rolling(7).sum()

        result_parts.append(grp[[
            "date", "item_id",
            "lag_1_units", "lag_2_units", "lag_3_units", "lag_7_units", "lag_14_units",
            "rolling_3_mean", "rolling_3_std",
            "rolling_7_mean", "rolling_7_std",
            "rolling_14_mean", "rolling_14_std",
            "lag_1_stockout", "lag_7_stockout", "stockout_last_7",
        ]])

    return pd.concat(result_parts, ignore_index=True)


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    generate_mock_sales_data(720)
