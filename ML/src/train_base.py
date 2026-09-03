import os
import pandas as pd
import lightgbm as lgb

# 1. Automatically locate the 'ML' root folder relative to this file
SRC_DIR = os.path.dirname(os.path.abspath(__file__))      # .../ML/src
ML_DIR = os.path.dirname(SRC_DIR)                         # .../ML

# 2. Build absolute paths to data and model output
DATA_PATH = os.path.join(ML_DIR, 'data', 'processed', 'feature_matrix.csv')
MODEL_DIR = os.path.join(ML_DIR, 'models')
MODEL_PATH = os.path.join(MODEL_DIR, 'base_model.model')

# 3. Read processed dataset
print(f"Loading feature matrix from: {DATA_PATH}")
df = pd.read_csv(DATA_PATH)

# 4. Define features and target variable
features = ['lag_1', 'lag_7', 'rolling_7_avg', 'is_weekend', 'is_rainy', 'stockout_flag']
target = 'units_sold'

X = df[features]
y = df[target]

# 5. Train LightGBM model
train_data = lgb.Dataset(X, label=y)
params = {
    'objective': 'regression',
    'metric': 'rmse',
    'learning_rate': 0.05,
    'num_leaves': 31,
    'verbose': -1
}

model = lgb.train(params, train_data, num_boost_round=100)

# 6. Ensure models directory exists and save model
os.makedirs(MODEL_DIR, exist_ok=True)
model.save_model(MODEL_PATH)

print(f"Base LightGBM model trained successfully and saved to: {MODEL_PATH}")