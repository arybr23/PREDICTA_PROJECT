import os
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_mock_sales_data(num_days=90, output_path="data/raw/historical_sales.csv"):
    np.random.seed(42) # For reproducible mock data
    
    # 1. Define active menu items
    menu_items = [
        {"item_id": "M01", "name": "Nasi Goreng Spesial", "base_demand": 100},
        {"item_id": "M02", "name": "Mie Goreng Ayam", "base_demand": 70},
        {"item_id": "M03", "name": "Es Teh Manis", "base_demand": 150}
    ]
    
    start_date = datetime.now() - timedelta(days=num_days)
    data = []

    for day_offset in range(num_days):
        current_date = start_date + timedelta(days=day_offset)
        date_str = current_date.strftime("%Y-%m-%d")
        
        is_weekend = 1 if current_date.weekday() >= 5 else 0
        is_rainy = np.random.choice([0, 1], p=[0.7, 0.3]) # 30% chance of rain
        
        for item in menu_items:
            # Calculate synthetic demand with weekend boost and random noise
            weekend_multiplier = 1.3 if is_weekend else 1.0
            rain_multiplier = 0.85 if is_rainy else 1.0
            
            noise = np.random.normal(0, 10) # Random variance
            calculated_demand = int((item["base_demand"] * weekend_multiplier * rain_multiplier) + noise)
            calculated_demand = max(10, calculated_demand) # Ensure non-negative
            
            # Simulate occasional stockout (10% probability)
            stockout_flag = np.random.choice([0, 1], p=[0.9, 0.1])
            units_sold = int(calculated_demand * 0.75) if stockout_flag else calculated_demand
            
            data.append({
                "date": date_str,
                "item_id": item["item_id"],
                "item_name": item["name"],
                "units_sold": units_sold,
                "stockout_flag": stockout_flag,
                "is_weekend": is_weekend,
                "is_rainy": is_rainy
            })

    # 2. Convert to DataFrame
    df = pd.DataFrame(data)
    
    # 3. Save to ML/data/raw directory
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Mock data generated successfully! Saved {len(df)} rows to '{output_path}'.")

if __name__ == "__main__":
    generate_mock_sales_data(720)