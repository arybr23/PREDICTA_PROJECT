# PREDICTA — UI/UX Design System Specification

## 🎨 Color Palette & Tokens

| Token              | Hex Code  | Role               | Usage                                                      |
| :----------------- | :-------- | :----------------- | :--------------------------------------------------------- |
| `color-primary`    | `#0F766E` | Deep Culinary Teal | Main brand accent, primary CTA buttons, active tab states  |
| `color-accent`     | `#F59E0B` | Warm Amber         | Context tags, alerts, stockout warnings, metric highlights |
| `color-bg`         | `#F9FAFB` | Soft Neutral Gray  | Application page background (reduces kitchen glare)        |
| `color-surface`    | `#FFFFFF` | Pure White         | Elevated cards, modal containers, data tables              |
| `color-border`     | `#E5E7EB` | Muted Gray         | 1px card borders, table dividers, input field outlines     |
| `color-text-main`  | `#111827` | Charcoal           | Primary body text, page titles, high-contrast metrics      |
| `color-text-muted` | `#6B7280` | Mid Gray           | Table headers, secondary subtitles, timestamp badges       |

---

## 🔤 Typography Specification

- **Font Family:** `Plus Jakarta Sans`, sans-serif
- **Scale & Hierarchy:**

| Level              | Size            | Weight            | Line Height | Application                                          |
| :----------------- | :-------------- | :---------------- | :---------- | :--------------------------------------------------- |
| **Display / Hero** | `36pt` – `40pt` | `700` (Bold)      | `1.1`       | Main Dashboard Key Figures (e.g., "185 Total Items") |
| **Heading 1**      | `28pt`          | `700` (Bold)      | `1.2`       | Primary Page Titles                                  |
| **Heading 2**      | `20pt`          | `600` (Semi-Bold) | `1.3`       | Section Headers, Card Titles                         |
| **Subhead / Tag**  | `14pt` – `16pt` | `500` (Medium)    | `1.4`       | Table Column Headers, Context Badges                 |
| **Body**           | `14pt`          | `400` (Regular)   | `1.5`       | Standard Text, Form Labels, Input Values             |
| **Caption / Data** | `12pt` – `13pt` | `400` (Regular)   | `1.4`       | System Timestamps, Secondary Micro-Metrics           |

---

## 📱 Layout & Responsiveness

### Core Design Strategy

- **Approach:** Mobile-First design pattern.
- **Touch Target Minimum:** `48px` x `48px` for all interactive buttons and inputs.
- **Component Geometry:** `12px` border radius (`rounded-xl`), `1px` crisp border, subtle drop shadow (`shadow-sm`).

### Viewport Adaptations

- **Mobile Viewport (`< 768px`) — Kitchen Floor Mode:**
  - Single-column vertical stack for single-handed navigation.
  - Sticky Hero Forecast Card fixed at top of viewport.
  - Full-width input fields for rapid end-of-day data logging.

- **Desktop / Tablet Viewport (`≥ 768px`) — Management Dashboard:**
  - Multi-column responsive grid system.
  - **Twin-Card Split View (Homepage):**
    - _Left:_ Dynamic Ingredient Procurement Matrix (_Ingredient \| Weight \| Unit_).
    - _Right:_ Menu Item Sales Volume (Horizontal bar charts).
  - Bottom horizontal status row tracking sync logs, AI calibration metrics, and cost savings.

---

## 📄 Key Screen Components

### Page 1: Homepage (Main Dashboard)

1. **Top Navigation Bar:** App title, connection status, timestamp badge.
2. **Tomorrow's Core Forecast (Hero Card):** Large `40pt` metric displaying projected volume + environmental tags (weather, holidays).
3. **Required Ingredients List:** Structured table converting total predicted demand into raw metric weights.
4. **Predicted Sales Breakdown:** Itemized progress bars for individual menu volume.
5. **Operational Metrics Bar:** Row of 3 mini-cards tracking food waste reduction %, cost savings, and adaptation health.

### Page 2: Data Entry & Adaptation Portal

1. **Daily Log Form:** Input fields for actual end-of-day sales figures.
2. **Stockout Indicator Toggle:** Binary flag (`Yes`/`No`) per item to capture un-censored demand spikes.
3. **Recipe Template Builder:** Mapping interface connecting `Menu_ID` to raw `Ingredient_ID` multipliers.
4. **AI Adaptation Progress Badge:** Visual indicator showing current training depth (e.g., "Day 7 — Personalization Active").

### Page 3: Point of Sale (POS) & Cashier Interface

1. **Category Navigation Bar:** Horizontal filter tabs (All Items, Food, Drinks, Snacks) for rapid menu navigation on touchscreens.
2. **Interactive Menu Grid:** Touch-friendly item cards displaying prices, item icons, real-time stock availability, and dynamic active selection states.
3. **Live Order Receipt Sidebar:** Itemized cart manager featuring quantity stepper controls (+ / -), auto-calculated subtotal breakdowns, and an instant order-clearing action.
4. **Mid-Shift Stockout Quick-Flag:** Per-item alert toggle allowing cashiers to flag items as "Sold Out" instantly to record un-censored demand events in the database.
5. **Express Checkout Action Bar:** Prominent, high-contrast primary checkout button displaying the running grand total and triggering real-time sales transactions.

### Page 4: Account Profile Page

1. **Profile:** On the top of the page, give vertical box containing photo profile, username and firm name in the bottom of the username (small font).
2. **Store List:** (under the profile box) Clear list of several store that is hold by the firms, give details as closed or open currently.
3. **Stock management:** (side by side with the store list) give list for existing ingridients in the firm's storage. Give details as amount of each ingridients.
