import type { PeriodKey } from "@/types"
import { fromISODate, monthStart, shiftDays, toISODate } from "@/lib/utils"

export interface PeriodRange {
  from: string
  to: string
}

/** Resolve a period preset to an inclusive date range. */
export function getPeriodRange(key: PeriodKey, today: string = toISODate(new Date())): PeriodRange {
  const d = fromISODate(today)
  switch (key) {
    case "7d":
      return { from: shiftDays(today, -6), to: today }
    case "30d":
      return { from: shiftDays(today, -29), to: today }
    case "90d":
      return { from: shiftDays(today, -89), to: today }
    case "this_month":
      return { from: monthStart(today), to: today }
    case "this_quarter": {
      const qStart = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3, 1)
      return { from: toISODate(qStart), to: today }
    }
    case "this_year": {
      const yStart = new Date(d.getFullYear(), 0, 1)
      return { from: toISODate(yStart), to: today }
    }
  }
}

/** The range of equal length immediately preceding `range`. */
export function getPreviousRange(range: PeriodRange): PeriodRange {
  const days = Math.max(1, Math.round((fromISODate(range.to).getTime() - fromISODate(range.from).getTime()) / 86_400_000))
  return { from: shiftDays(range.from, -(days + 1)), to: shiftDays(range.from, -1) }
}

/** Month buckets from `from` to `to` inclusive, oldest first. */
export function monthBuckets(range: PeriodRange): string[] {
  const keys: string[] = []
  const cursor = new Date(fromISODate(range.from).getFullYear(), fromISODate(range.from).getMonth(), 1)
  const end = fromISODate(range.to)
  while (cursor <= end) {
    keys.push(toISODate(cursor).slice(0, 7))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return keys
}

/** N day-buckets ending at `to` (inclusive), oldest first. */
export function dayBuckets(range: PeriodRange): string[] {
  const days = Math.round((fromISODate(range.to).getTime() - fromISODate(range.from).getTime()) / 86_400_000)
  const out: string[] = []
  for (let i = 0; i <= days; i++) {
    out.push(shiftDays(range.from, i))
  }
  return out
}
