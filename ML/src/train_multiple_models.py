import os
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.metrics import mean_squared_error, mean_absolute_error

# 1. Locate directories
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SRC_DIR)
DATA_PATH = os.path.join(ML_DIR, 'data', 'processed', 'feature_matrix.csv')
MODELS_DIR = os.path.join(ML_DIR, 'models')

os.makedirs(MODELS_DIR, exist_ok=True)

# 2. Load dataset
df = pd.read_csv(DATA_PATH)
df['date'] = pd.to_datetime(df['date'])
df = df.sort_values('date').reset_index(drop=True)

# 3. Reserve the last 7 days as the FIXED Test Set
max_date = df['date'].max()
test_start_date = max_date - pd.Timedelta(days=7)

train_pool = df[df['date'] < test_start_date]
test_df = df[df['date'] >= test_start_date]

features = ['lag_1', 'lag_7', 'rolling_7_avg', 'is_weekend', 'is_rainy', 'stockout_flag']
target = 'units_sold'

X_test = test_df[features]
y_test = test_df[target]

# 4. Define dataset horizons and target output filenames
time_horizons = {
    "1_week": {"days": 7, "file": "model_1week.model", "label": "1 Week"},
    "1_month": {"days": 30, "file": "model_1month.model", "label": "1 Month"},
    "3_months": {"days": 90, "file": "model_3months.model", "label": "3 Months"},
    "6_months": {"days": 180, "file": "model_6months.model", "label": "6 Months"},
    "1_year": {"days": 365, "file": "model_1year.model", "label": "1 Year"},
    "2_years": {"days": 730, "file": "model_2years.model", "label": "2 Years"}
}

results = []

print("--- TRAINING & SAVING INDIVIDUAL HORIZON MODELS ---")

for key, config in time_horizons.items():
    cutoff_date = test_start_date - pd.Timedelta(days=config["days"])
    horizon_train_df = train_pool[train_pool['date'] >= cutoff_date]
    
    if len(horizon_train_df) == 0:
        print(f"Skipping {config['label']}: Insufficient data.")
        continue

    X_train = horizon_train_df[features]
    y_train = horizon_train_df[target]

    # Train LightGBM model
    train_data = lgb.Dataset(X_train, label=y_train)
    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'learning_rate': 0.05,
        'num_leaves': 31,
        'verbose': -1
    }
    
    model = lgb.train(params, train_data, num_boost_round=100)

    # Save distinct model file
    model_save_path = os.path.join(MODELS_DIR, config["file"])
    model.save_model(model_save_path)

    # Predict on test set
    y_pred = model.predict(X_test)

    # Compute evaluation metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    acc = max(0, 100 - mape)

    results.append({
        "Model File": config["file"],
        "Horizon": config["label"],
        "Training Samples": len(horizon_train_df),
        "MAE": round(mae, 2),
        "RMSE": round(rmse, 2),
        "Accuracy (%)": round(acc, 2)
    })
    
    print(f"Saved: models/{config['file']} (Trained on {len(horizon_train_df)} rows)")

# Display and export results table
results_df = pd.DataFrame(results)
print("\n", results_df.to_string(index=False))

report_csv_path = os.path.join(ML_DIR, 'data', 'processed', 'data_size_models_comparison.csv')
results_df.to_csv(report_csv_path, index=False)
print(f"\nComparison summary saved to '{report_csv_path}'.")