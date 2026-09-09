# PREDICTA — Advanced Synthetic Sales Data Generator

## Purpose

Upgrade the current synthetic minimarket sales generator so that it produces a more challenging and realistic demand-forecasting dataset.

The generator should simulate:

- Product-specific demand patterns
- Gregorian calendar seasonality
- Hijri calendar seasonality
- Indonesian holidays and annual events
- Random temporary events
- Random weather conditions
- Random holiday effects
- Product-specific sensitivity to contextual factors
- Long-term demand trends
- Random demand noise
- Historical stockout conditions
- The distinction between **true demand** and **observed sales**

The primary objective is to create a dataset that is sufficiently complex to challenge LightGBM while still containing meaningful patterns that a forecasting model can learn.

---

Data FLOW:

1. Generate products
   ↓
2. Generate product-specific sensitivities
   ↓
3. Generate Gregorian date
   ↓
4. Convert date to Hijri date
   ↓
5. Determine weekend
   ↓
6. Determine Indonesian holidays
   ↓
7. Generate temporary events
   ↓
8. Generate weather
   ↓
9. Generate temperature
   ↓
10. Calculate Gregorian seasonal multiplier
    ↓
11. Calculate Hijri seasonal multiplier
    ↓
12. Calculate weekend effect
    ↓
13. Calculate holiday effect
    ↓
14. Calculate event effect
    ↓
15. Calculate weather effect
    ↓
16. Calculate long-term trend
    ↓
17. Add random demand noise
    ↓
18. Calculate TRUE DEMAND
    ↓
19. Generate available inventory
    ↓
20. Determine STOCKOUT
    ↓
21. Calculate ACTUAL UNITS SOLD
    ↓
22. Store observation
    ↓
23. Generate lag and rolling features
    ↓
24. Train LightGBM
    ↓
25. Evaluate on future observations
