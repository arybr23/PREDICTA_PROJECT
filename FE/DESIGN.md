# 🎨 PREDICTA UI/UX Layout Architecture Blueprint (DESIGN.md)

This document maps out the precise plaintext interface layout wireframes and component hierarchies for the **PREDICTA** adaptive inventory dashboard ecosystem. The structural wireframes below match the layout architecture featuring a fixed left-side management sidebar and a main modular viewport frame.

---

## 🏗️ Master Global Frame Layout

Every page inherits this universal grid wrapper to maintain operational consistency across the application viewports.

```plaintext
+-----------------------------------------------------------------------------------------------+
| PREDICTA                  | [Page Title]  Last updated: Today, 06:00 AM   [ Kedai Kopi Utama v] |
+---------------------------+-------------------------------------------------------------------+
|                           |                                                                   |
|  (o) Dashboard            |                                                                   |
|  (o) Forecast             |                                                                   |
|  (o) Stocks               |                ( MAIN MODULAR SCROLLABLE VIEWPORT )               |
|  (o) Reports              |                                                                   |
|  (o) Profile              |                                                                   |
|                           |                                                                   |
|                           |                                                                   |
|  (?) Help                 |                                                                   |
|  [-> Logout               |                                                                   |
+---------------------------+-------------------------------------------------------------------+
```

---

## 🎛️ Page 1: Dashboard (The Command Center)

The entry landing dashboard designed for immediate scannability. It surfaces the core macro metrics, inventory alerts, and primary impact metrics linked to **UN SDG 12**.

### 1.1 Wireframe Layout

```plaintext
+-----------------------------------------------------------------------------------------------+
| PREDICTA                  | Dashboard  Last updated: Today, 06:00 AM      [ Kedai Kopi Utama v] |
+---------------------------+-------------------------------------------------------------------+
|                           |                                                                   |
| >[o] Dashboard            |   +-----------------------------------------------------------+   |
|                           |   |                      Tomorrow's Core Forecast             |   |
|  (o) Forecast             |   |                              185                          |   |
|                           |   |                          Total Items                      |   |
|  (o) Stocks               |   |            [ 🌦️ Overcast Saturday (+12% baseline traffic) ] |   |
|                           |   +-----------------------------------------------------------+   |
|  (o) Reports              |                                                                   |
|                           |   +-----------------------------+ +---------------------------+   |
|  (o) Profile              |   | [x] Required Stocks       > | | [o] Predicted Item Sales  > |   |
|                           |   |                             | |                           |   |
|                           |   | ITEM        VOLUME   STATUS | | ITEM             ORDERS   |   |
|                           |   | --------------------------- | | ------------------------- |   |
|                           |   | Wheat Flour 12.5 kg [InStk] | | Nasi Goreng Spec. 65 Ord  |   |
|                           |   | Fresh Milk  24.0 L  [ReStk] | | Ayam Geprek       50 Ord  |   |
|  (?) Help                 |   | Frying Oil  5.0 L   [InStk] | | Es Teh Manis     70 Ord  |   |
|                           |   +-----------------------------+ +---------------------------+   |
|  [-> Logout               |                                                                   |
|                           |   +-----------------------------------------------------------+   |
|                           |   | Eco-Impact & Financial Sustainability Summary (UN SDG 12) |   |
|                           |   | Waste Reduced: [||||||||||||||.....] 78% | Saved: Rp450k  |   |
|                           |   +-----------------------------------------------------------+   |
+---------------------------+-------------------------------------------------------------------+
```

### 1.2 Component Specifications

- **Hero Forecast Card:** Sets text hierarchy to **36pt Bold** for the primary total sum ("185"). Employs a desaturated orange accent block context pills for high contrast weather/event signaling.
- **Twin-Column Resource Split:** Splitting the workspace evenly using modular bounding containers. The left side handles stock items with quick text color status tokens (`In Stock` / `Restock Needed`). The right section showcases individual item volumes mapped with a visual horizontal tracking fill layout element.
- **Bottom SDG Impact Module:** Single block layout detailing cumulative metrics regarding food waste optimization and financial resources retained.

---

## 📈 Page 2: Forecast (The Predictive Deep-Dive)

Surfaces data insights driving the model behind the scenes. This component provides total transparency regarding feature weights, confidence metrics, and individual recipe targets.

### 2.1 Wireframe Layout

```plaintext
+-----------------------------------------------------------------------------------------------+
| PREDICTA                  | Forecast  Last updated: Today, 06:00 AM       [ Kedai Kopi Utama v] |
+---------------------------+-------------------------------------------------------------------+
|                           |                                                                   |
|  (o) Dashboard            |   +-----------------------------------------------------------+   |
|                           |   |                Tomorrow's Forecast Details                |   |
| >[o] Forecast             |   |                         185 Items                         |   |
|                           |   |           [ 🌦️ Overcast Saturday (+12% baseline) ]        |   |
|  (o) Stocks               |   |   [|||||||||||||||||||||||||||||||] 94% Confidence        |   |
|                           |   +-----------------------------------------------------------+   |
|  (o) Reports              |                                                                   |
|                           |   +-----------------------------------------------------------+   |
|  (o) Profile              |   | Feature Influence Chart (LightGBM Driver Weights)         |   |
|                           |   | - Baseline Demand  [=======================] 150          |   |
|                           |   | - Payday Surge     [====] +25                             |   |
|                           |   | - Weather Anomaly  [==] +10                               |   |
|                           |   +-----------------------------------------------------------+   |
|                           |                                                                   |
|                           |   +-----------------------------------------------------------+   |
|                           |   | Production Targets                                        |   |
|                           |   |                                                           |   |
|                           |   | Menu Item           Predicted Demand    Change            |   |
|                           |   | ----------------------------------------------            |   |
|  (?) Help                 |   | Nasi Goreng Spec.   85 Portions         +12% (Payday)     |   |
|                           |   | Ayam Geprek         60 Portions         -5%  (Rain)       |   |
|  [-> Logout               |   | Es Teh Manis        40 Portions         Stable            |   |
|                           |   +-----------------------------------------------------------+   |
|                           |                                                                   |
|                           |   +-----------------------------------------------------------+   |
|                           |   | [               Review Required Stocks ->               ] |   |
|                           |   +-----------------------------------------------------------+   |
+---------------------------+-------------------------------------------------------------------+
```

### 2.2 Component Specifications

- **Confidence Bar Module:** Sub-card asset rendering data parameters inside the hero element, giving judges visibility into algorithmic predictability ratings using historical lags (Lag-1 to Lag-7).
- **Feature Influence Chart:** High-density text horizontal bar chart demonstrating variables driving LightGBM weights (`is_ramadan`, `payday_cycle`, `weather_rain`).
- **Production Targets Grid:** Data matrices rendering item specifications inside a crisp layout text grid framework set to **12pt–13pt**.

---

## 📦 Page 3: Stocks (Inventory Balance & Procurement Engine)

Transitions forecast logic into inventory assets. It compares structural store values against model indicators to build automated supply list configurations.

### 3.1 Wireframe Layout

```plaintext
+-----------------------------------------------------------------------------------------------+
| PREDICTA                  | Stocks  Last updated: Today, 06:00 AM         [ Kedai Kopi Utama v] |
+---------------------------+-------------------------------------------------------------------+
|                           |                                                                   |
|  (o) Dashboard            |   +-----------------------------------------------------------+   |
|  (o) Forecast             |   | Active Stock Balance Matrix                               |   |
|                           |   |                                                           |   |
| >[o] Stocks               |   | INGREDIENT   CURRENT STOCK   PREDICTED NEED  STATUS       |   |
|                           |   | ---------------------------------------------------       |   |
|  (o) Reports              |   | Wheat Flour  5.0 kg          12.5 kg         [🔴 Shortage]|   |
|                           |   | Fresh Milk   30.0 L          24.0 L          [🟢 Safe]    |   |
|  (o) Profile              |   | Frying Oil   1.5 L           5.0 L           [🔴 Shortage]|   |
|                           |   | Chicken Meat 2.0 kg          25.0 kg         [🔴 Shortage]|   |
|                           |   +-----------------------------------------------------------+   |
|                           |                                                                   |
|                           |   +-----------------------------------------------------------+   |
|                           |   | Smart Procurement Generator                               |   |
|                           |   |                                                           |   |
|                           |   | [!] Automated Shopping List (Purchase = Need - Current):  |   |
|  (?) Help                 |   |   [ ] Buy 7.5 kg Wheat Flour                              |   |
|                           |   |   [ ] Buy 3.5 L Frying Oil                                |   |
|  [-> Logout               |   |   [ ] Buy 23.0 kg Chicken Meat                            |   |
|                           |   |                                                           |   |
|                           |   | [   Export Shopping Checklist   ]   [ Print Invoice ]     |   |
|                           |   +-----------------------------------------------------------+   |
+---------------------------+-------------------------------------------------------------------+
```

### 3.2 Component Specifications

- **Real-Time Balance Matrix:** Clean row alignment processing variable structures. Employs conditional alerts: `🔴 Shortage Risk` when physical stocks fall below target threshold values, and `🟢 Safe` for compliant ratios.
- **Smart Procurement Generator:** Isolated functional panel rendering automatic check-boxes calculation blocks based on calculated baseline deficiencies to streamline warehouse purchasing routines.

---

## 📊 Page 4: Reports & Live Sales POS (Real-Time Terminal & Closed-Loop)

Acts as both a real-time point-of-sale terminal for cashiers during operational hours and the central closed-loop feedback ledger for the machine learning model.

### 4.1 Wireframe Layout

```plaintext
+-----------------------------------------------------------------------------------------------+
| PREDICTA                  | Reports & Live Sales  Last updated: Just now  [ Kedai Kopi Utama v] |
+---------------------------+-------------------------------------------------------------------+
|                           |                                                                   |
|  (o) Dashboard            |   +-----------------------------+ +---------------------------+   |
|  (o) Forecast             |   | Quick Cashier POS Terminal  | | Real-Time Live Sales Feed |   |
|                           |   |                             | |                           |   |
|  (o) Stocks               |   | [ + Nasi Goreng Spec ]      | | 12:45 PM - 2x Nasi Goreng |   |
|                           |   | [ + Ayam Geprek      ]      | | 12:42 PM - 1x Ayam Geprek |   |
| >[o] Reports              |   | [ + Es Teh Manis     ]      | | 12:38 PM - 3x Es Teh Manis|   |
|                           |   |                             | |                           |   |
|  (o) Profile              |   | Total Today: 142 Items      | | Today's Revenue: Rp1.2M   |   |
|                           |   +-----------------------------+ +---------------------------+   |
|                           |                                                                   |
|                           |   +-----------------------------------------------------------+   |
|                           |   | Closed-Loop Adaptive Tracking (Actual vs Predicted)       |   |
|                           |   |  Val ^     /--\     _--_                                  |   |
|  (?) Help                 |   |      | --*----*---*----* (Live actuals plotted real-time) |   |
|                           |   |      +-------------------------> Time                     |   |
|  [-> Logout               |   |        D1   D3   D5   [D7 Milestone]   D14                |   |
|                           |   +-----------------------------------------------------------+   |
|                           |                                                                   |
|                           |   +-----------------------------------------------------------+   |
|                           |   | Nightly Closing Reconciliation & Context Flags             |   |
|                           |   | [x] Heavy Evening Rain   [ ] Local Event   [x] Payday Active|   |
|                           |   | [         Run Nightly LightGBM Training Loop         ]    |   |
|                           |   +-----------------------------------------------------------+   |
+---------------------------+-------------------------------------------------------------------+
```

### 4.2 Component Specifications

- **Quick Cashier POS Terminal:** One-tap action buttons designed for cashiers to instantly record individual transactions as they happen on the kitchen/counter floor.
- **Real-Time Live Sales Feed:** Streaming transaction ledger updating automatically with timestamps, total item counts, and cumulative revenue.
- **Closed-Loop Adaptive Graph:** Plots real-time accumulated actual sales against predicted baseline curves, featuring the **Day 7 Calibration Milestone**.
- **Nightly Closing Module:** End-of-day verification block where managers confirm environmental flags (`weather_anomalies`, `holiday_flags`) before triggering the incremental LightGBM retraining pipeline (`init_model`).

---

## 🏪 Page 5: Profile (The Operational Engine Setup)

Handles basic management properties, infrastructure components, recipe rules, and runtime states.

### 5.1 Wireframe Layout

```plaintext
+-----------------------------------------------------------------------------------------------+
| PREDICTA                  | Profile  Last updated: Today, 06:00 AM        [ Kedai Kopi Utama v] |
+---------------------------+-------------------------------------------------------------------+
|                           |                                                                   |
|  (o) Dashboard            |   +-----------------------------+ +---------------------------+   |
|  (o) Forecast             |   | UMKM Merchant Profile       | | AI Model Diagnostics Hub  |   |
|                           |   | Name:     Kedai Kopi Utama  | | Phase:     Closed-Loop    |   |
|  (o) Stocks               |   | Type:     Culinary / Cafe   | | Uptime:    14 Days        |   |
|                           |   | Location: Surakarta, Indo   | | MAPE Error: 4.82%         |   |
|  (o) Reports              |   +-----------------------------+ +---------------------------+   |
|                           |                                                                   |
| >[o] Profile              |   +-----------------------------------------------------------+   |
|                           |   | Recipe Inventory Mapping Matrix                           |   |
|                           |   |                                                           |   |
|                           |   | MENU ITEM          MAPPED INGREDIENT    UNIT RATIO        |   |
|                           |   | --------------------------------------------------        |   |
|                           |   | Nasi Goreng Spec.  White Rice           200 grams         |   |
|  (?) Help                 |   | Nasi Goreng Spec.  Chicken Egg          1 unit            |   |
|                           |   | Ayam Geprek        Chicken Meat         250 grams         |   |
|  [-> Logout               |   +-----------------------------------------------------------+   |
+---------------------------+-------------------------------------------------------------------+
```

### 5.2 Component Specifications

- **AI Diagnostics Hub:** Displays performance metrics, showcasing engine health parameters and active $MAPE$ deviation levels.
- **Recipe Mapping Matrix:** The logic database where users configure recipe ratios. These values allow the system to map menu counts directly to raw asset weights inside the **Stocks** engine.
