# PREDICTA — Frontend Architecture & Technical Stack

## 📐 Overview

The PREDICTA frontend is a single-page application (SPA) built with **React** and **Vite**. Designed with a **Mobile-First** methodology, it prioritizes fast user input on the kitchen floor, rapid touchscreen sales entry for cashiers, and high data scannability for desktop management.

---

## 🛠️ Core Technology Stack

| Library / Tool        | Version               | Role                                                                 |
| :-------------------- | :-------------------- | :------------------------------------------------------------------- |
| **React.js**          | `v18.x`               | Component-based UI engine and application state management           |
| **Vite**              | `v5.x`                | High-performance frontend build tool and dev server                  |
| **React Router**      | `react-router-dom v6` | Declarative client-side routing across 3 primary views               |
| **Tailwind CSS**      | `v3.x`                | Utility-first styling engine and design system token enforcement     |
| **Bootstrap Icons**   | `bootstrap-icons`     | Vector iconography library for grid buttons, badges, and action tags |
| **Plus Jakarta Sans** | Google Fonts          | Primary font family for high-legibility typography                   |

---

## 📁 Directory Structure & Component Roles

```text
src/
├── globalComponents/      # Shared components across routes (Navbar, Footers, Modals)
├── pages/
│   ├── Dashboard/         # Page 1: Main Forecast & Monitoring Dashboard
│   │   ├── components/    # Hero Forecast Card, Ingredient Table, Sales Volume Bars
│   │   └── Dashboard.jsx  # Primary monitoring view
│   ├── DataEntry/         # Page 2: Manual Log & Adaptation Portal
│   │   ├── components/    # End-of-Day Form, Stockout Toggle, Recipe Builder
│   │   └── DataEntry.jsx  # Primary manual input view
│   └── Cashier/           # Page 3: Point of Sale (POS) Interface
│       ├── components/    # Menu Grid Buttons, Cart/Order Summary, Checkout Modal
│       └── Cashier.jsx    # Primary cashier POS view
├── App.jsx                # Router Provider and layout wrapper
├── index.css              # Global styles & Tailwind directive imports
└── main.jsx               # React DOM rendering root
```
