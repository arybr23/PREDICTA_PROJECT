import os
import pandas as pd
import numpy as np
import lightgbm as lgb
from sklearn.metrics import mean_squared_error, mean_absolute_error

# 1. Paths
SRC_DIR = os.path.dirname(os.path.abspath(__file__))
ML_DIR = os.path.dirname(SRC_DIR)
DATA_PATH = os.path.join(ML_DIR, 'data', 'processed', 'feature_matrix.csv')
MODEL_PATH = os.path.join(ML_DIR, 'models', 'model_1week.model')

# 2. Load feature data
df = pd.read_csv(DATA_PATH)

features = ['lag_1', 'lag_7', 'rolling_7_avg', 'is_weekend', 'is_rainy', 'stockout_flag']
target = 'units_sold'

X = df[features]
y_true = df[target]

# 3. Load trained LightGBM model
model = lgb.Booster(model_file=MODEL_PATH)

# 4. Generate predictions across the dataset
y_pred = model.predict(X)

# 5. Calculate Metrics
rmse = np.sqrt(mean_squared_error(y_true, y_pred))
mae = mean_absolute_error(y_true, y_pred)

# Calculate Mean Absolute Percentage Error (MAPE)
mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100
accuracy_percentage = max(0, 100 - mape)

print("--- MODEL ACCURACY EVALUATION ---")
print(f"MAE  (Mean Absolute Error) : {mae:.2f} units")
print(f"RMSE (Root Mean Sq Error)  : {rmse:.2f} units")
print(f"MAPE (Mean Abs % Error)    : {mape:.2f}%")
print(f"Overall Model Accuracy     : {accuracy_percentage:.2f}%")