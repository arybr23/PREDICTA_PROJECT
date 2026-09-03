import sys
import json
import pandas as pd
import lightgbm as lgb
from dataset_prep import prepare_features # Utility function to calculate lags

def run_incremental_training(new_data_path, model_path="models/active_model.model"):
    # 1. Load newly logged daily sales data
    new_df = pd.read_csv(new_data_path)
    
    # 2. Extract features and target variable
    features = ['lag_1', 'lag_7', 'rolling_7_avg', 'is_weekend', 'is_rainy', 'stockout_flag']
    target = 'units_sold'
    
    X_new = new_df[features]
    y_new = new_df[target]
    
    # 3. Create LightGBM dataset for today's data
    new_train_data = lgb.Dataset(X_new, label=y_new)
    
    # 4. Load current active model as baseline
    existing_model = lgb.Booster(model_file=model_path)
    
    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'learning_rate': 0.03, # Lower learning rate for fine-tuning
        'verbose': -1
    }
    
    # 5. Continual training: update leaf weights with today's entries
    updated_model = lgb.train(
        params,
        new_train_data,
        num_boost_round=10,       # Small number of boosting iterations for daily updates
        init_model=existing_model # Retains prior historical weights
    )
    
    # 6. Overwrite active_model.model with updated weights
    updated_model.save_model(model_path)
    
    return {"status": "success", "message": "Active model updated successfully"}

if __name__ == "__main__":
    # Expects file path of today's logged JSON/CSV passed from Node.js
    if len(sys.argv) > 1:
        daily_log_file = sys.argv[1]
        result = run_incremental_training(daily_log_file)
        print(json.dumps(result))
    else:
        print(json.dumps({"status": "error", "message": "No input daily log file provided"}))