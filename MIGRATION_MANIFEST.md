# Cloud Migration Manifest

Generated: 2026-10-05

---

## 1. Supabase Storage — COMPLETED ✅

All ML artifacts uploaded to bucket `predicta-storage`.

### Per-store files (STR-4418)

| File | Remote Path | Size |
|---|---|---|
| Dataset CSV | `stores/STR-4418/datasets/STR-4418.csv` | 565.3 KB |
| Raw history | `stores/STR-4418/raw/historical_sales.csv` | 4,387.0 KB |
| Feature matrix | `stores/STR-4418/processed/feature_matrix.csv` | 3,161.5 KB |
| Label encoders | `stores/STR-4418/processed/label_encoders.json` | 0.5 KB |
| Trained model | `stores/STR-4418/models/active_model.model` | 161.1 KB |

### Global data files

| File | Remote Path | Size |
|---|---|---|
| Raw history | `global/data/raw/historical_sales.csv` | 4,514.0 KB |
| Raw train | `global/data/raw/train.csv` | 3,622.9 KB |
| Raw test | `global/data/raw/test.csv` | 898.1 KB |
| Processed train | `global/data/processed/train.csv` | 3,382.5 KB |
| Processed test | `global/data/processed/test.csv` | 837.4 KB |
| Feature matrix | `global/data/processed/feature_matrix.csv` | 3,082.5 KB |
| Label encoders | `global/data/processed/label_encoders.json` | 0.6 KB |
| Model comparison | `global/data/processed/data_size_models_comparison.csv` | 0.3 KB |

### Global models

| File | Remote Path | Size |
|---|---|---|
| model_1month | `global/models/model_1month.model` | 252.8 KB |
| model_1week | `global/models/model_1week.model` | 75.2 KB |
| model_1year | `global/models/model_1year.model` | 272.4 KB |
| model_2years | `global/models/model_2years.model` | 275.3 KB |
| model_3months | `global/models/model_3months.model` | 269.7 KB |
| model_6months | `global/models/model_6months.model` | 270.5 KB |

**Total: 19 files, ~22.7 MB**

---

## 2. MongoDB Atlas — PENDING ⏳

Local data exported and ready for import. Atlas connection is not yet
configured — the `MONGO_ATLAS_URL` in `BE/.env` needs a valid connection string.

### Exported collections

| Collection | Documents | Export File |
|---|---|---|
| accounts | 3 | `BE/scripts/mongo-export/accounts.json` |
| stores | 2 | `BE/scripts/mongo-export/stores.json` |
| firms | 1 | `BE/scripts/mongo-export/firms.json` |

### To complete the migration

1. Get a working Atlas connection string (see SETUP_GUIDE.md).
2. Add it to `BE/.env`:
   ```env
   MONGO_ATLAS_URL=mongodb+srv://predicta_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/predicta_db?retryWrites=true&w=majority
   ```
3. Run:
   ```bash
   cd BE && node scripts/migrate-to-atlas.js
   ```

The import script will:
- Connect to Atlas
- Drop existing data in each collection (clean migration)
- Insert all exported documents

---

## 3. Scripts Created

| Script | Purpose |
|---|---|
| `BE/scripts/migrate-to-supabase.js` | Upload all ML files to Supabase |
| `BE/scripts/migrate-to-atlas.js` | Import JSON exports to MongoDB Atlas |
| `BE/diagnose-mongo.js` | Test MongoDB connection and decode errors |
| `BE/diagnose-supabase.js` | Test Supabase connection and verify bucket |

---

## 4. Configuration Files Updated

| File | Change |
|---|---|
| `BE/.env` | Added `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET`, `MONGO_ATLAS_URL`, `MONGO_COMPASS_URL` placeholders |
| `BE/config/db.js` | Three-tier URL resolution, retry logic, health check |
| `BE/services/supabase.js` | New — Supabase client with file storage CRUD |
| `BE/routes/index.js` | `/health` endpoint reports mongo + supabase status |
