# PREDICTA — Complete API Requests & Routes Reference

## 📐 Overview

This document serves as the master API contract between the React SPA components and the Node.js Express backend server.

- **Base URL:** `http://localhost:5000/api`
- **Content-Type:** `application/json`

---

## 📋 Endpoint Summary Table

| Method      | Endpoint Route       | Component / View       | Purpose                                        |
| :---------- | :------------------- | :--------------------- | :--------------------------------------------- |
| **`GET`**   | `/health`            | System Init            | Verify API server status                       |
| **`GET`**   | `/forecast/tomorrow` | Dashboard (`Page 1`)   | Load tomorrow's forecast & ingredient weights  |
| **`POST`**  | `/sales/entry`       | Data Entry (`Page 2`)  | Submit end-of-day sales & trigger ML retrain   |
| **`POST`**  | `/recipes/mapping`   | Data Entry (`Page 2`)  | Map menu items to raw ingredient multipliers   |
| **`GET`**   | `/pos/menu`          | Cashier POS (`Page 3`) | Fetch menu items, pricing, and category layout |
| **`POST`**  | `/pos/checkout`      | Cashier POS (`Page 3`) | Process real-time customer transactions        |
| **`PATCH`** | `/pos/item-status`   | Cashier POS (`Page 3`) | Toggle mid-shift stockout events               |

---

## 🛠️ Detailed Endpoint Specifications

### 1. System Health Check

#### `GET /health`

- **Trigger Component:** App launch / System status bar
- **Payload:** None
- **Response (`200 OK`):**

```json
{
  "status": "OK",
  "message": "PREDICTA API is online",
  "timestamp": "2026-08-30T20:30:00.000Z"
}
```
