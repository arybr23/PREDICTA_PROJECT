# PREDICTA — Dashboard

AI-powered demand forecasting dashboard for restaurants, cafés, and bakeries. Built with React, TypeScript, Tailwind CSS, and Lucide icons, styled in an enterprise product-design language (Linear / Stripe / Vercel-inspired) with a custom orange (`#FA8112`) brand accent.

## Getting started

```bash
npm install
npm run dev
```

Open the printed local URL (defaults to http://localhost:5173). The layout targets desktop only, centered around 1440–1600px, and is not optimized for tablet/mobile.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and produce a production build in `dist/`
- `npm run preview` — preview the production build locally

## Project structure

```
src/
  components/
    layout/          Navbar, Sidebar
    dashboard/        The six dashboard-specific cards
    ui/                Reusable primitives: Card, CardHeader, StatusBadge,
                        ProgressBar, MetricCard, NavigationItem
  pages/
    Dashboard.tsx      Composes the full dashboard screen
  types/
    index.ts           Shared TypeScript interfaces
  data/
    mockData.ts         Mock data conforming to the types above (swap for
                        real API data without touching any component)
  lib/
    cn.ts               Tiny class-name join helper (no external dep)
```

## Design tokens

Colors, type scale, radii, and shadows are defined once in `tailwind.config.js`
(`primary`, `primary-light`, `success`, `warning`, `danger`, the `text-*`
scale, `rounded-card`, `shadow-soft`) and consumed everywhere via Tailwind
utility classes — no hardcoded hex values inside components.

## Extending

- Swap `src/data/mockData.ts` for a real API call (e.g. React Query) — every
  component already receives its data via props.
- Add new sidebar entries by pushing to the `navItems` array; icons resolve
  by name from `lucide-react` inside `NavigationItem`.
- New metric tiles can reuse `components/ui/MetricCard.tsx` the same way the
  three bottom-row cards do.
