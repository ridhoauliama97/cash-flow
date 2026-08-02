---
source: Context7 API — recharts/recharts 3.0 migration guide (GitHub wiki)
library: Recharts
package: recharts
topic: v3-migration
fetched: 2026-08-02T00:00:00Z
official_docs: https://recharts.org
---

# Recharts v3 — Breaking changes vs v2 (migration checklist)

Official migration guide: https://github.com/recharts/recharts/wiki/3.0-migration-guide

## Minimum requirements

- React 16.8+
- TypeScript 5.x+
- Node.js 18+
- Change TS `target` to `es6` (drops es5 polyfills / es6-module-unsupported browsers)
- `recharts-scale` removed — `getNiceTickValues` now exported directly from `recharts` package
- `react-smooth` removed — animations maintained internally

## Breaking changes (imports/API)

1. **`TooltipProps` → `TooltipContentProps`** — when passing a custom `content` to `<Tooltip>`, type it as `TooltipContentProps`. Its `label` prop type is now `undefined | string | number` (was just `string`).
2. **`ref.current.current` removed on `ResponsiveContainer`** — use the container ref directly.
3. **`activeIndex` prop removed** (Scatter, Bar, Pie, etc.) — removed entirely.
4. **`Scatter` `points` prop removed.**
5. **`Pie` `blendStroke` removed** — use `stroke="none"` instead.
6. **`alwaysShow` prop removed** from Reference components (was deprecated).
7. **`isFront` prop removed** from reference elements (did nothing since v2).
8. **`Area`: `connectNulls` now treats `null` datapoints as 0.**
9. **`Area`/`Funnel`: `animateNewValues` removed** (unused).
10. **Z-order is render order** — SVG has no z-index. If elements overlap, put `Tooltip` BEFORE `Legend` in your JSX (previously hacked).
11. **`CartesianGrid` needs `xAxisId`/`yAxisId`** to match non-default axis IDs — with a different ID than default, grid lines fail to render (deterministic grid).
12. **Multiple Y axes render alphabetically by `yAxisId`** (not render order).
13. **`XAxis`/`YAxis` axis lines now show even with no ticks** (visual change).
14. **`Legend` order default may differ** — no order is promised.
15. **`Sankey` types stricter.**
16. **`accessibilityLayer` no longer calls `onMouseMove` after keyboard input.**
17. Removed unused `ref`s from types.

## What's NEW in recent v3 minors (relevant for dashboard work)

- **3.9**: fully customizable animations (new animation props), `HTML attributes passthrough on ResponsiveContainer`, layout hooks (`useChartLayout`, `useActiveTooltipDataPoints`), Legend gets `dataKey` in payload for PieChart.
- **3.10**: `Legend` supports `position` + `offset` props (replaces `align`/`verticalAlign`), `XAxis` supports `height="auto"`, Tooltip label-based search fix.
- Waterfall canonical example: `Bar` with range `dataKey="waterfallRange"` (tuple `[bottom, top]`) + custom `shape` — no stacked approach needed (see charts-v3-usage.md).

## Practical migration notes

- Import paths are UNCHANGED (`import { BarChart, ... } from 'recharts'`) — all exports remain top-level.
- If your custom tooltip used `TooltipProps` type → rename to `TooltipContentProps`.
- Remove `activeIndex` usages.
- If using custom axis IDs, add matching `xAxisId`/`yAxisId` to `CartesianGrid`.
- For custom shapes, v3 type is `BarShapeProps` (exported) if you need the payload type.
