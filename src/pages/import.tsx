import { useRef, useState, type ChangeEvent } from "react"
import {
  CheckCircle2,
  ClipboardPaste,
  Database,
  Loader2,
  RotateCcw,
  TriangleAlert,
  Upload,
} from "lucide-react"
import { toast } from "sonner"
import { useApp } from "@/context/app-context"
import { csvTemplate, parseTransactionsCsv, type CsvParseResult } from "@/lib/csv"
import { demoSummary } from "@/lib/demo"
import { formatMoney } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/shared/page-header"
import { StatRow } from "@/components/shared/kpi-card"

export function ImportPage() {
  const { mode, addTransactions, resetDemo } = useApp()
  const [text, setText] = useState("")
  const [parsed, setParsed] = useState<CsvParseResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const content = await file.text()
    setText(content)
    setParsed(null)
    setImported(false)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleParse = () => {
    setParsed(parseTransactionsCsv(text))
    setImported(false)
  }

  const handleImport = async () => {
    if (!parsed || parsed.transactions.length === 0) return
    setImporting(true)
    try {
      await addTransactions(parsed.transactions)
      toast.success(`Imported ${parsed.transactions.length} transactions`)
      setImported(true)
    } catch {
      toast.error("Import failed — please try again")
    } finally {
      setImporting(false)
    }
  }

  const handleResetDemo = async () => {
    try {
      await resetDemo()
      toast.success("Demo data reset")
    } catch {
      toast.error("Could not reset demo data")
    }
  }

  const handleResetImport = () => {
    setText("")
    setParsed(null)
    setImported(false)
  }

  const demo = demoSummary()
  const preview = parsed?.transactions.slice(0, 10) ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Import data"
        description="Bulk-load transactions from a CSV file or pasted text."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Import CSV</CardTitle>
            <CardDescription>Headers are auto-detected; amounts and currencies are normalized.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="h-8 w-auto max-w-64 text-xs"
                onChange={(e) => void handleFile(e)}
              />
              <Button variant="outline" size="sm" onClick={() => setText(csvTemplate())}>
                Load template
              </Button>
            </div>
            <div className="grid gap-2">
              <Label className="text-sm text-muted-foreground">
                <ClipboardPaste className="mr-1 inline size-3.5" />
                Paste CSV
              </Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"date,type,description,amount,currency,category\n2026-08-01,revenue,\"Monthly retainer\",2500,USD,\"Client Services\""}
                className="min-h-40 font-mono text-xs"
              />
            </div>
            <Button onClick={handleParse} disabled={!text.trim()}>
              Parse
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-4" />
              Demo data
            </CardTitle>
            <CardDescription>A ready-made dataset to explore the app.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y">
              <StatRow label="Transactions" value={demo.transactions} />
              <StatRow label="Invoices" value={demo.invoices} />
              <StatRow label="Coverage" value={demo.period} />
            </div>
            {mode === "local" ? (
              <Button variant="outline" size="sm" onClick={() => void handleResetDemo()}>
                <RotateCcw className="size-3.5" />
                Reset demo data
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Demo reset is only available in local mode.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>Preview</span>
              <span className="text-sm font-normal text-muted-foreground">
                {parsed.transactions.length} ready
                {parsed.skipped > 0 && ` · ${parsed.skipped} skipped`}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {imported && (
              <Alert>
                <CheckCircle2 className="size-4" />
                <AlertTitle>Import complete</AlertTitle>
                <AlertDescription>
                  {parsed.transactions.length} transactions were added to your data.
                </AlertDescription>
              </Alert>
            )}
            {parsed.errors.length > 0 && (
              <Alert variant="destructive">
                <TriangleAlert className="size-4" />
                <AlertTitle>{parsed.errors.length} rows skipped</AlertTitle>
                <AlertDescription>
                  <ul className="list-inside list-disc">
                    {parsed.errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
            {preview.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Client</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell>{row.date}</TableCell>
                      <TableCell>
                        <Badge variant={row.type === "revenue" ? "default" : "secondary"}>
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-56 truncate">{row.description}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(row.amount, row.currency)}
                      </TableCell>
                      <TableCell>{row.currency}</TableCell>
                      <TableCell>{row.category}</TableCell>
                      <TableCell>{row.client ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {parsed.transactions.length > 10 && (
              <p className="text-xs text-muted-foreground">
                Showing the first 10 of {parsed.transactions.length} rows.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => void handleImport()}
                disabled={importing || imported || parsed.transactions.length === 0}
              >
                {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {imported
                  ? "Imported"
                  : `Import ${parsed.transactions.length} transactions`}
              </Button>
              {imported && (
                <Button variant="outline" size="sm" onClick={handleResetImport}>
                  Import another file
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
