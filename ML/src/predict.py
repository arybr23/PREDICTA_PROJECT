import os
import sys
import json
import lightgbm as lgb
import numpy as np
import pandas as pd

# 1. Dynamically locate the 'ML' root folder
SRC_DIR = os.path.dirname(os.path.abspath(__file__))      # .../ML/src
ML_DIR = os.path.dirname(SRC_DIR)                         # .../ML

# 2. Paths
MODEL_PATH = os.path.join(ML_DIR, 'models', 'base_model.model')
FEATURE_MATRIX_PATH = os.path.join(ML_DIR, 'data', 'processed', 'feature_matrix.csv')

# Verify required files exist
if not os.path.exists(MODEL_PATH) or not os.path.exists(FEATURE_MATRIX_PATH):
    print(json.dumps({
        "status": "error",
        "message": "Missing model or feature matrix file. Train the base model first!"
    }))
    sys.exit(1)

# 3. Load model & latest feature data
model = lgb.Booster(model_file=MODEL_PATH)
df = pd.read_csv(FEATURE_MATRIX_PATH)

# Get the latest available date entry for each item to forecast tomorrow
latest_records = df.sort_values('date').groupby('item_id').last().reset_index()

features = [
    'lag_1', 'lag_2', 'lag_3', 'lag_7', 'lag_14',
    'rolling_3_mean', 'rolling_3_std',
    'rolling_7_mean', 'rolling_7_std',
    'rolling_14_mean', 'rolling_14_std',
    'lag_1_stockout', 'lag_7_stockout', 'stockout_last_7',
    'date.is_weekend', 'is_holiday', 'date.month', 'date.day',
    'hijri_month', 'hijri_day',
    'weather', 'temperature',
    'item_id',
]

# 4. Generate itemized predictions
predictions = []
total_predicted_units = 0

for _, row in latest_records.iterrows():
    X_input = np.array([[
        row['lag_1'], row['lag_2'], row['lag_3'], row['lag_7'], row['lag_14'],
        row['rolling_3_mean'], row['rolling_3_std'],
        row['rolling_7_mean'], row['rolling_7_std'],
        row['rolling_14_mean'], row['rolling_14_std'],
        row['date.is_weekend'], row['is_holiday'], row['date.month'], row['date.day'],
        row['hijri_month'], row['hijri_day'],
        row['weather'], row['temperature'],
        row['item_id'],
    ]])
    
    pred_val = int(np.round(model.predict(X_input)[0]))
    pred_val = max(0, pred_val) # Prevent negative predictions
    
    predictions.append({
        "item_id": row['item_id'],
        "name": row['item_name'],
        "predicted_units": pred_val
    })
    total_predicted_units += pred_val

# 5. Output JSON payload expected by Node.js
output = {
    "status": "success",
    "total_items_predicted": total_predicted_units,
    "menu_breakdown": predictions
}

print(json.dumps(output))