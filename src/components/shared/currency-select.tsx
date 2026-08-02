import { CURRENCIES, type CurrencyCode } from "@/types"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCY_LABELS } from "@/types"

export function CurrencySelect({
  value,
  onChange,
  id,
}: {
  value: CurrencyCode
  onChange: (c: CurrencyCode) => void
  id?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as CurrencyCode)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CURRENCIES.map((c) => (
          <SelectItem key={c} value={c}>
            {c} — {CURRENCY_LABELS[c]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
