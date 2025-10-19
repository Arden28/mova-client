"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { readSpreadsheet } from "@/lib/spreadsheet"

type FieldOption = {
  /** internal object key */
  key: string
  /** Human label (fr) shown to the user */
  label: string
  /** optional hint */
  hint?: string
  /** whether required for a valid row */
  required?: boolean
}

/** Result of the mapping step */
type Mapping = Record<string, string | ""> // objectKey -> columnHeader

type ImportDialogProps<T extends Record<string, any>> = {
  open: boolean
  onOpenChange: (v: boolean) => void

  /** Which fields can be mapped */
  fields: FieldOption[]

  /** Called with parsed + validated items */
  onConfirm: (rows: T[]) => void

  /** Optional sample to help auto-detect */
  sampleHeaders?: string[]

  /** Optional validator/transformer per row */
  transform?: (raw: Record<string, any>) => T | null

  /** Dialog copy (fr) for reuse */
  title?: string
  description?: string
  submitLabel?: string
  nextLabel?: string
  backLabel?: string
  parseErrorLabel?: string
  requiredErrorLabel?: string
}

type Step = "upload" | "map" | "preview"

export default function ImportDialog<T extends Record<string, any>>({
  open,
  onOpenChange,

  fields,
  onConfirm,
  sampleHeaders = [],
  transform,

  title = "Importer des données",
  description = "Importez un fichier CSV ou Excel, mappez les colonnes, puis validez.",
  submitLabel = "Importer",
  nextLabel = "Suivant",
  backLabel = "Retour",
  parseErrorLabel = "Impossible de lire ce fichier. Vérifiez le format.",
  requiredErrorLabel = "Certains champs obligatoires ne sont pas renseignés.",
}: ImportDialogProps<T>) {
  const [step, setStep] = React.useState<Step>("upload")
  const [file, setFile] = React.useState<File | null>(null)
  const [headers, setHeaders] = React.useState<string[]>([])
  const [rows, setRows] = React.useState<Record<string, any>[]>([])
  const [mapping, setMapping] = React.useState<Mapping>({})
  const [preview, setPreview] = React.useState<T[]>([])
  const [loading, setLoading] = React.useState(false)
  const IGNORE = "__IGNORE__"

  React.useEffect(() => {
    if (!open) {
      // Reset on close to keep it fresh for next usage
      setStep("upload")
      setFile(null)
      setHeaders([])
      setRows([])
      setMapping({})
      setPreview([])
      setLoading(false)
    }
  }, [open])

  function autoGuessMapping(hs: string[]): Mapping {
    const m: Mapping = {}
    const norm = (s: string) =>
      s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[_-]+/g, " ")

    for (const f of fields) {
      const candidates = [f.label, f.key, ...(sampleHeaders || [])]
        .filter(Boolean)
        .map(norm)

      const found = hs.find((h) => {
        const H = norm(h)
        return candidates.some((c) => H.includes(c))
      })
      m[f.key] = found ?? ""
    }
    return m
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setLoading(true)
    try {
      const { rows: parsedRows, headers: parsedHeaders } = await readSpreadsheet(f)
      if (!parsedHeaders.length || !parsedRows.length) {
        toast.error(parseErrorLabel)
        setLoading(false)
        return
      }
      setRows(parsedRows)
      setHeaders(parsedHeaders)
      // auto-map
      setMapping(autoGuessMapping(parsedHeaders))
      setStep("map")
    } catch (err) {
      console.error(err)
      toast.error(parseErrorLabel)
    } finally {
      setLoading(false)
    }
  }

  function setMap(key: string, header: string) {
    const val = header === IGNORE ? "" : header
    setMapping((prev) => ({ ...prev, [key]: val }))
  }

  function validateAndPreview() {
    // Check required fields exist in mapping
    const missRequired = fields.some((f) => f.required && !mapping[f.key])
    if (missRequired) {
      toast.error(requiredErrorLabel)
      return
    }

    // Build preview
    const out: T[] = []
    for (const r of rows) {
      const rawObj: Record<string, any> = {}
      for (const f of fields) {
        const col = mapping[f.key]
        rawObj[f.key] = col ? r[col] : undefined
      }
      const finalRow = transform ? transform(rawObj) : (rawObj as T)
      if (finalRow) out.push(finalRow)
    }
    setPreview(out)
    setStep("preview")
  }

  function handleConfirm() {
    if (!preview.length) {
      toast.error("Aucune ligne valide.")
      return
    }
    onConfirm(preview)
    toast.success(`Import réussi (${preview.length} ligne${preview.length > 1 ? "s" : ""}).`)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Step: upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <Label htmlFor="file">Fichier (CSV, XLSX, XLS)</Label>
            <Input
              id="file"
              type="file"
              accept=".csv, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              Astuce : la première ligne doit contenir les en-têtes de colonnes.
            </p>
          </div>
        )}

        {/* Step: map */}
        {step === "map" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Associez chaque champ à une colonne du fichier importé.
            </p>
            <ScrollArea className="h-[320px] rounded-md border p-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map((f) => (
                  <div key={f.key} className="space-y-2">
                    <Label>
                      {f.label} {f.required && <span className="text-rose-600">*</span>}
                    </Label>
                    <Select
                      value={mapping[f.key] ?? ""}
                      onValueChange={(v) => setMap(f.key, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une colonne…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={IGNORE}>— Ignorer —</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" onClick={() => setStep("upload")}>
                {backLabel}
              </Button>
              <Button onClick={validateAndPreview}>{nextLabel}</Button>
            </div>
          </div>
        )}

        {/* Step: preview */}
        {step === "preview" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Vérifiez un aperçu des premières lignes.
            </p>
            <div className="rounded-md border">
              <div className="grid grid-cols-12 gap-2 p-2 text-xs font-medium text-muted-foreground">
                {fields.map((f) => (
                  <div key={f.key} className="col-span-3 truncate">{f.label}</div>
                ))}
              </div>
              <Separator />
              <ScrollArea className="h-[300px]">
                {preview.slice(0, 50).map((row, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2 text-sm border-b">
                    {fields.map((f) => (
                      <div key={f.key} className="col-span-3 truncate">
                        {String(row[f.key] ?? "—")}
                      </div>
                    ))}
                  </div>
                ))}
                {preview.length > 50 && (
                  <p className="px-2 py-2 text-xs text-muted-foreground">
                    … {preview.length - 50} ligne(s) supplémentaire(s) masquées.
                  </p>
                )}
              </ScrollArea>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep("map")}>
                {backLabel}
              </Button>
              <Button onClick={handleConfirm}>{submitLabel}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
