---
source: Context7 API + GitHub releases (recharts/recharts)
library: Recharts
package: recharts
topic: charts-v3-usage
fetched: 2026-08-02T00:00:00Z
official_docs: https://recharts.org
---

# Recharts v3 (latest: 3.10.1, 2026-07-25) — Chart usage

## Install

```bash
bun add recharts
```

Latest is **v3.10.1** (stable). v3 minimums: React ≥16.8, TypeScript ≥5.x, Node ≥18, TS target `es6`. Removed deps: `recharts-scale` and `react-smooth` (bundled internally now).

## Imports (v3 — same top-level package, no path changes)

```ts
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, Label, LabelList,
  ResponsiveContainer, Rectangle,
} from 'recharts'
```

All components export from the main `recharts` package. No subpath imports required.

## ResponsiveContainer

```tsx
<ResponsiveContainer width="100%" height={400}>
  <BarChart data={data}>
    {/* ... */}
  </BarChart>
</ResponsiveContainer>
```

- Standard props: `width` (percent or px), `height`, `minWidth`, `minHeight`, `aspect`, `debounce`.
- v3 removed `ref.current.current` (the old double-ref). HTML attributes passthrough added in 3.9.
- Also available: `responsive` prop on charts directly (3.x), and hooks `useChartWidth`/`useChartHeight` inside any chart.

## Basic charts

### AreaChart

```tsx
<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Area type="monotone" dataKey="income" stroke="#8884d8" fill="#8884d8" />
    <Area type="monotone" dataKey="expenses" stroke="#82ca9d" fill="#82ca9d" />
  </AreaChart>
</ResponsiveContainer>
```

### BarChart

```tsx
<BarChart data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Legend />
  <Bar dataKey="pv" fill="#8884d8" radius={[4, 4, 0, 0]} />
  <Bar dataKey="uv" fill="#82ca9d" radius={[4, 4, 0, 0]} />
</BarChart>
```

### LineChart

```tsx
<LineChart data={data}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="balance" stroke="#8884d8" dot={false} />
</LineChart>
```

### PieChart (donut)

```tsx
<PieChart width={400} height={400}>
  <Pie
    data={data}
    dataKey="value"
    nameKey="name"
    cx="50%" cy="50%"
    innerRadius={60}          // <— donut (omit or 0 for solid pie)
    outerRadius={80}
    cornerRadius={4}
    paddingAngle={2}
  >
    {data.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
    <Label value="Total" position="center" />
  </Pie>
  <Tooltip />
  <Legend />
</PieChart>
```

- Donut = `innerRadius` + `outerRadius` on `<Pie>`.
- `dataKey` is the value field; `nameKey` is the label field.
- Labels: `<Label position="center">` inside `<Pie>`, or `label` prop on Pie.

## Waterfall chart (two approaches)

### Approach A (canonical v3): range dataKey `[bottom, top]` + custom shape

```tsx
import { Bar, BarChart, CartesianGrid, Rectangle, Tooltip, XAxis, YAxis } from 'recharts'

// Precompute a [bottom, top] pair per row from a running total:
//   const waterfallRange = [barBottom, barTop]  // e.g. [runningTotal, runningTotal + value]
const data = [
  { name: 'Start', waterfallRange: [0, 1000], isTotal: true },
  { name: 'Income', waterfallRange: [1000, 2500] },
  { name: 'Expenses', waterfallRange: [1900, 2500] },
  { name: 'End', waterfallRange: [0, 1900], isTotal: true },
]

const WaterfallBar = (props) => {
  const color = props.payload?.isTotal ? '#1565C0' : (props.payload?.waterfallRange[1] - props.payload?.waterfallRange[0] >= 0 ? '#4CAF50' : '#F44336')
  return <Rectangle {...props} fill={color} />
}

<BarChart data={data}>
  <CartesianGrid strokeDasharray="3 3" vertical={false} />
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Bar dataKey="waterfallRange" shape={WaterfallBar} isAnimationActive={false} />
</BarChart>
```

Key facts: range `[bottom, top]` values position the bar vertically (no stacked bars needed). No connecting lines exist for Bar components (`connectNulls` is Line/Area-only). Use `isAnimationActive={false}` to avoid animation glitches.

### Approach B (classic): stacked bars with invisible base

```tsx
<BarChart data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  {/* invisible base bar */}
  <Bar dataKey="base" stackId="w" fill="transparent" stroke="none" />
  {/* visible delta bar — same stackId stacks on top of base */}
  <Bar dataKey="delta" stackId="w" fill="#8884d8" />
</BarChart>
```

`stackId`: two Bars with the same `stackId` (and axes) are stacked together.

## Tooltip customization

```tsx
function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p>Income: {payload[0].value}</p>
      <p>Expenses: {payload[1].value}</p>
    </div>
  )
}

<Tooltip content={<CustomTooltip />} />
```

- Custom content receives `{ active, payload, label }`. v3 note: the type is **`TooltipContentProps`** (renamed from `TooltipProps` in v3), and `label` is `undefined | string | number`.
- `payload` is an array of `{ name, value, color, dataKey, payload }` per visible series.

## v3 breaking changes (v2 → v3) — see v3-migration file
