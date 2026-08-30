# PREDICTA — Technical Architecture & API Specification

## 📐 System Architecture Overview

PREDICTA is built using a decoupled single-page application (SPA) architecture. The React frontend handles user interaction and UI rendering, communicating via JSON REST endpoints with a Node.js Express backend API server. The Node.js layer interfaces with a database (MongoDB/PostgreSQL) for time-series persistence and dynamically triggers a background Python machine learning execution loop for forecasting.

```text
[ React Frontend ] ──(HTTP/JSON)──► [ Node.js API Server ] ──► [ PostgreSQL / MongoDB ]
  (3 SPA Views)                                    │
                                       (Child Process Execution)
                                                   ▼
                                     [ Python Machine Learning Loop ]
                                    (LightGBM Feature Engineering)
```
