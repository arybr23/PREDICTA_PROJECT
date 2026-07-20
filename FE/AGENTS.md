<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Project Structure

```
.
├── app/
│   ├── favicon.ico
│   ├── globals.css              # Tailwind v4 design tokens & global styles
│   ├── layout.tsx               # Root layout (Plus Jakarta Sans font)
│   ├── page.tsx                 # Home → redirects to /pages/dashboard
│   └── pages/                   # All routes live here
│       ├── dashboard/
│       │   ├── page.tsx
│       │   └── components/      # Dashboard-specific components
│       │       ├── EstimatedCostSavedCard.tsx
│       │       ├── PredictedItemSalesCard.tsx
│       │       ├── RequiredIngredientsCard.tsx
│       │       ├── TomorrowForecastCard.tsx
│       │       ├── UtilityOptimizationCard.tsx
│       │       └── WasteMitigationCard.tsx
│       ├── forecast/page.tsx    # Placeholder
│       ├── forecast/page.tsx    # Placeholder
│       ├── ingredients/page.tsx # Placeholder
│       ├── reports/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx   # Shared shell (Sidebar + Navbar + content)
│   │   ├── Navbar.tsx
│   │   └── Sidebar.tsx           # Uses next/link + usePathname
│   └── ui/
│       ├── Card.tsx
│       ├── CardHeader.tsx
│       ├── MetricCard.tsx
│       ├── NavigationItem.tsx    # Link or button mode
│       ├── ProgressBar.tsx
│       └── StatusBadge.tsx
├── data/
│   └── mockData.ts
├── lib/
│   └── cn.ts
├── public/
├── types/
│   └── index.ts
├── AGENTS.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

# Routes

| URL                    | File                               | Status                         |
| ---------------------- | ---------------------------------- | ------------------------------ |
| `/`                    | `app/page.tsx`                     | Redirects → `/pages/dashboard` |
| `/pages/dashboard`     | `app/pages/dashboard/page.tsx`     | ✅ Live                        |
| `/pages/forecast`      | `app/pages/forecast/page.tsx`      | 🚧 Placeholder                 |
| `/pages/ingredients`   | `app/pages/ingredients/page.tsx`   | 🚧 Placeholder                 |
| `/pages/menu-analysis` | `app/pages/menu-analysis/page.tsx` | 🚧 Placeholder                 |
| `/pages/reports`       | `app/pages/reports/page.tsx`       | 🚧 Placeholder                 |
| `/pages/settings`      | `app/pages/settings/page.tsx`      | 🚧 Placeholder                 |
