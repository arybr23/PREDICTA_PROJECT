# PREDICTA — External Backend Setup Guide

This guide walks you through getting real credentials for **Supabase** (file storage)
and **MongoDB Atlas** (cloud database), and plugging them into `BE/.env`.

---

## 1. Supabase — File Storage for Datasets & Models

### 1.1 Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign up / log in.
2. Click **"New project"**.
3. Choose an organization, give the project a name (e.g. `predicta-storage`),
   and pick a region close to your users (e.g. `Southeast Asia (Singapore)`).
4. Set a database password (save it — you will not see it again).
5. Wait ~2 minutes for the project to provision.

### 1.2 Get the Project URL

Once the project dashboard loads:

1. In the left sidebar, click **Project Settings** (gear icon, bottom).
2. Click **API** in the settings submenu.
3. Look for **"Project URL"** — copy the full URL, e.g.:
   ```
   https://qunlrxpvixiqphpbhzdk.supabase.co
   ```
   This goes into `BE/.env` as `SUPABASE_URL`.

### 1.3 Get the Service Role Key (NOT the anon key)

On the same **API** settings page:

| Section | What it says | What you copy |
|---|---|---|
| `anon public` | "client-side, limited rights" | **Do NOT use this** |
| `service_role secret` | "server-side, full admin rights" | **This is what you want** |

**Why the service role key?**
- The `anon` key is for browsers / frontend apps. It is restricted by Row-Level
  Security (RLS) and cannot bypass upload limits or delete files freely.
- The `service_role` key is for your **backend server**. It has full access to
  Storage and can upload, download, list, and delete without RLS restrictions.

Copy the `service_role secret` value and paste it into `BE/.env` as `SUPABASE_KEY`.

> **Security note:** Never commit `SUPABASE_KEY` to git. It is already in
> `BE/.env`, and `BE/.gitignore` should ignore `.env`.

### 1.4 Create the Storage Bucket

1. In the left sidebar, click **Storage**.
2. Click **"New bucket"**.
3. Name it exactly: `predicta-storage`
4. Turn **"Public bucket"** OFF (files should only be accessible via signed URLs
   or through your backend).
5. Click **Save**.

The bucket name `predicta-storage` is already the default in `BE/.env` as
`SUPABASE_BUCKET`. If you name it differently, update `SUPABASE_BUCKET` to match.

### 1.5 Fill `BE/.env`

```env
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_KEY=<your-service-role-key>
SUPABASE_BUCKET=predicta-storage
```

### 1.6 Install the client library

```bash
cd BE
npm install @supabase/supabase-js
```

### 1.7 Test the connection

Start the backend and hit the health endpoint:

```bash
cd BE && npm start
# In another terminal:
curl http://localhost:5000/api/health
```

You should see `"supabase": { "configured": true, ... }` in the response.

---

## 2. MongoDB Atlas — Cloud Database

### 2.1 Create a MongoDB Atlas account & cluster

1. Go to [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) and sign up.
2. Choose the **free tier (M0)** — it is enough for development and small production
   loads. Pick a cloud provider and region close to your users.
3. Name the cluster (e.g. `predicta-cluster`).
4. Click **Create Deployment** and wait ~3 minutes.

### 2.2 Create a Database User

Atlas does **not** use your Atlas login password for the database. You need a
separate database user:

1. In the Atlas dashboard, click **Database Access** in the left sidebar.
2. Click **"Add New Database User"**.
3. Choose **Password** authentication.
4. Username: `predicta_app` (or any name you prefer).
5. Password: generate a strong one and **save it** — Atlas will not show it again.
6. Under **Database User Privileges**, choose **"Read and write to any database"**.
7. Click **Add User**.

> **Important:** This username + password is what goes into the connection URL,
> not your Atlas login email/password.

### 2.3 Allow Network Access

By default Atlas blocks all connections. You must whitelist your IP:

1. Click **Network Access** in the left sidebar.
2. Click **"Add IP Address"**.
3. For development: click **"Allow access from anywhere"** (adds `0.0.0.0/0`).
   For production: add only your server's IP.
4. Click **Confirm**.

### 2.4 Get the Connection String

1. Go back to **Database** → click **"Connect"** on your cluster.
2. Choose **"Drivers"** (not MongoDB Compass or Shell).
3. Select **Node.js** as the driver.
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://predicta_app:<db_password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   ```
5. Replace `<db_password>` with the password you created in step 2.2.
6. Add the database name `predicta_db` before the `?`:
   ```
   mongodb+srv://predicta_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/predicta_db?retryWrites=true&w=majority&appName=Cluster0
   ```

### 2.5 Fill `BE/.env`

```env
# Comment out or remove the local URL:
# MONGO_URL=mongodb://127.0.0.1:27017/predicta_db

# Add the Atlas connection:
MONGO_ATLAS_URL=mongodb+srv://predicta_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/predicta_db?retryWrites=true&w=majority&appName=Cluster0
```

`BE/config/db.js` automatically picks `MONGO_ATLAS_URL` when it is set,
falling back to `MONGO_URL` only when Atlas is absent.

### 2.6 Test the connection

```bash
cd BE && npm start
# In another terminal:
curl http://localhost:5000/api/health
```

You should see `"mongo": { "state": "connected", "mode": "atlas", ... }`.

---

## 3. Quick Reference — What Each Env Variable Does

| Variable | Where from | What it does |
|---|---|---|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL | Base URL of your Supabase project |
| `SUPABASE_KEY` | Supabase → Project Settings → API → `service_role secret` | Backend auth token (full Storage access) |
| `SUPABASE_BUCKET` | You create it in Supabase → Storage | Bucket name for file storage |
| `MONGO_ATLAS_URL` | Atlas → Connect → Drivers → Node.js connection string | Cloud MongoDB connection (SRV format) |
| `MONGO_COMPASS_URL` | Same as Atlas, but direct host:port format | Direct connection (if SRV fails) |
| `MONGO_URL` | Local install: `mongodb://127.0.0.1:27017/predicta_db` | Local dev fallback |
| `ML_API_URL` | `http://127.0.0.1:5001` | ML HTTP service (`npm run ml:api`). Leave as is; if the service is down the API falls back to spawning the scripts itself |

---

## 4. Troubleshooting

### Supabase: "Supabase is not configured"
- Check that `SUPABASE_URL` starts with `https://` and ends with `.supabase.co`.
- Check that `SUPABASE_KEY` is the **service_role** key, not the `anon` key.
- Verify the bucket `predicta-storage` exists in Supabase → Storage.

### Supabase: "Bucket not found"
- The bucket name in `BE/.env` (`SUPABASE_BUCKET`) must exactly match the bucket
  name you created in Supabase.

### MongoDB Atlas: "Authentication failed"
- You are probably using your Atlas login password instead of the **database user**
  password created in step 2.2. They are different.
- Check that the database user has "Read and write to any database" privileges.

### MongoDB Atlas: "Connection refused"
- Check Network Access → your IP is whitelisted.
- The connection string might be missing the database name (`/predicta_db`).

### Forecasts are slow, or `/api/health` shows `python.reachable: false`
- The ML HTTP service is not running: start it with `npm run ml:api`.
- Nothing is broken when it is down — every ML call falls back to spawning
  `ML/src/*.py`, just slower (a fresh Python process per request).
- Check the address: the API uses `ML_API_URL` from `BE/.env`
  (default `http://127.0.0.1:5001`).

---

## 5. Security Checklist

- [ ] `.env` is in `.gitignore` (never commit secrets).
- [ ] Supabase `service_role` key is never exposed to the frontend.
- [ ] Atlas database password is strong and unique.
- [ ] Atlas Network Access is restricted to known IPs in production.
- [ ] Supabase bucket is **not** public (Public bucket = OFF).
