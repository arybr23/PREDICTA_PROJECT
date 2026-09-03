import os
import pandas as pd

def build_feature_matrix(
    input_path="data/raw/historical_sales.csv",
    output_path="data/processed/feature_matrix.csv"
):
    # 1. Check if raw data exists
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Raw data file not found at '{input_path}'. Run generate_mock_data.py first.")

    # 2. Load raw sales dataset
    df = pd.read_csv(input_path)
    df['date'] = pd.to_datetime(df['date'])
    
    # 3. Sort by item and date to ensure correct time-series alignment
    df = df.sort_values(['item_id', 'date']).reset_index(drop=True)

    # 4. Feature Engineering: Calculate lag variables per menu item
    # lag_1: Sales from previous day (t-1)
    df['lag_1'] = df.groupby('item_id')['units_sold'].shift(1)
    
    # lag_7: Sales from same day last week (t-7)
    df['lag_7'] = df.groupby('item_id')['units_sold'].shift(7)
    
    # rolling_7_avg: Moving average of past 7 days (excluding current day)
    df['rolling_7_avg'] = df.groupby('item_id')['units_sold'].transform(
        lambda x: x.shift(1).rolling(window=7).mean()
    )

    # 5. Drop initial NaN rows created by 7-day shift operations
    df_clean = df.dropna().reset_index(drop=True)

    # 6. Save processed feature matrix
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df_clean.to_csv(output_path, index=False)
    
    print(f"Feature matrix successfully created! Saved {len(df_clean)} rows to '{output_path}'.")

if __name__ == "__main__":
    build_feature_matrix()