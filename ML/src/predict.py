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

features = ['lag_1', 'lag_7', 'rolling_7_avg', 'is_weekend', 'is_rainy', 'stockout_flag']

# 4. Generate itemized predictions
predictions = []
total_predicted_units = 0

for _, row in latest_records.iterrows():
    X_input = np.array([[
        row['lag_1'], 
        row['lag_7'], 
        row['rolling_7_avg'], 
        1,  # Example: tomorrow is weekend (1 or 0)
        0,  # Example: tomorrow is rainy (1 or 0)
        0   # Stockout flag baseline
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