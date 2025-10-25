// src/components/reservation/AddEditReservationSheet.tsx
"use client"

import * as React from "react"
import { toast } from "sonner"
import type { UIReservation } from "@/api/reservation"
import type { Bus } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from "@/components/ui/sheet"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

type MultiSelectOption = { label: string; value: string }

function MultiSelectBuses({
  value,
  onChange,
  options,
  placeholder = "Sélectionner des bus",
}: {
  value: string[]
  onChange: (ids: string[]) => void
  options: MultiSelectOption[]
  placeholder?: string
}) {
  const [open, setOpen] = React.useState(false)
  const selected = new Set(value)
  function toggle(val: string) {
    const next = new Set(selected)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    onChange(Array.from(next))
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex min-h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm",
            "hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <div className="flex min-h-6 flex-wrap items-center gap-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              value.map((v) => {
                const opt = options.find((o) => o.value === v)
                return (
                  <Badge key={v} variant="secondary" className="px-2">
                    {opt?.label ?? v}
                  </Badge>
                )
              })
            )}
          </div>
          <span className="ml-3 text-xs text-muted-foreground">{open ? "Fermer" : "Ouvrir"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[420px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Chercher un bus…" />
          <CommandList>
            <CommandEmpty>Aucun résultat.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => {
                const active = selected.has(opt.value)
                return (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                    className="flex items-center justify-between"
                  >
                    <span>{opt.label}</span>
                    {active ? (
                      <span className="text-xs text-primary">Sélectionné</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Ajouter</span>
                    )}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: UIReservation | null
  onSubmit: (r: UIReservation) => void
  buses: Bus[]
}

export default function AddEditReservationSheet({
  open,
  onOpenChange,
  editing,
  onSubmit,
  buses,
}: Props) {
  const [form, setForm] = React.useState<Partial<UIReservation>>({})
  const [busIds, setBusIds] = React.useState<string[]>([])

  const busOptions = React.useMemo<MultiSelectOption[]>(() => {
    const uniq: Record<string, boolean> = {}
    return (buses ?? [])
      .filter((b: any) => !!b?.id)
      .filter((b: any) => (uniq[b.id] ? false : (uniq[b.id] = true)))
      .map((b: any) => ({ label: b.plate || b.id, value: b.id }))
  }, [buses])

  React.useEffect(() => {
    setForm(editing ?? {})
    setBusIds((editing?.busIds as string[]) ?? [])
  }, [editing, open])

  function setField<K extends keyof UIReservation>(key: K, val: UIReservation[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function setNested(path: string, val: string) {
    setForm((prev) => {
      const next = { ...prev } as any
      const parts = path.split(".")
      let cur = next
      for (let i = 0; i < parts.length - 1; i++) {
        cur[parts[i]] = cur[parts[i]] ?? {}
        cur = cur[parts[i]]
      }
      cur[parts[parts.length - 1]] = val
      return next
    })
  }

  function handleSave() {
    if (!form) return
    if (!form.passenger?.name || !form.passenger?.phone) {
      toast.error("Nom et téléphone du passager sont obligatoires.")
      return
    }
    const payload: UIReservation = {
      ...(editing as UIReservation),
      ...form,
      busIds,
    }
    onSubmit(payload)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="
          w-[min(100vw,1000px)]
          sm:w-[720px]
          md:w-[860px]
          lg:w-[980px]
          p-0
          flex flex-col
        "
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>{editing ? "Modifier la réservation" : "Ajouter une réservation"}</SheetTitle>
          <SheetDescription className="text-sm">
            Mettez à jour les infos de réservation. Les changements de trajet se font sur la carte.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {/* Top context */}
          {editing && (
            <div className="mt-3 grid gap-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{editing.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  {editing.route?.from ?? "—"} → {editing.route?.to ?? "—"}
                </span>
                <span className="ml-auto font-medium">{editing.code}</span>
              </div>
              {Array.isArray((editing as any).waypoints) && (editing as any).waypoints.length > 1 && (
                <div className="text-xs text-muted-foreground">
                  {((editing as any).waypoints as any[]).length} points • distance estimée{" "}
                  {typeof (editing as any).distanceKm === "number"
                    ? `${(editing as any).distanceKm.toLocaleString("fr-FR")} km`
                    : "—"}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-6 sm:grid-cols-2 mt-6">
            {/* Passenger */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Passager</h3>
              <div className="grid gap-2">
                <div className="grid gap-1.5">
                  <Label>Nom</Label>
                  <Input
                    value={form.passenger?.name ?? ""}
                    onChange={(e) => setNested("passenger.name", e.target.value)}
                    placeholder="Nom et prénom"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Téléphone</Label>
                  <Input
                    value={form.passenger?.phone ?? ""}
                    onChange={(e) => setNested("passenger.phone", e.target.value)}
                    placeholder="+242 …"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Email (optionnel)</Label>
                  <Input
                    value={form.passenger?.email ?? ""}
                    onChange={(e) => setNested("passenger.email", e.target.value)}
                    placeholder="email@exemple.com"
                  />
                </div>
              </div>
            </div>

            {/* Booking */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Détails réservation</h3>
              <div className="grid gap-2">
                <div className="grid gap-1.5">
                  <Label>Date du trajet</Label>
                  <Input
                    type="date"
                    value={(form.tripDate as any) ?? (editing?.tripDate ?? "")}
                    onChange={(e) => setField("tripDate" as any, e.target.value as any)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label>Sièges</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.seats ?? editing?.seats ?? 1}
                    onChange={(e) => setField("seats", Number(e.target.value) as any)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label>Total (FCFA)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.priceTotal ?? editing?.priceTotal ?? 0}
                    onChange={(e) => setField("priceTotal", Number(e.target.value) as any)}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label>Statut</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["pending", "confirmed", "cancelled"].map((s) => (
                      <Button
                        key={s}
                        type="button"
                        variant={(form.status ?? editing?.status ?? "pending") === s ? "default" : "outline"}
                        onClick={() => setField("status", s as any)}
                      >
                        {s === "pending" && "En attente"}
                        {s === "confirmed" && "Confirmée"}
                        {s === "cancelled" && "Annulée"}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Buses - full width on small */}
            <div className="space-y-3 sm:col-span-2">
              <h3 className="text-sm font-medium text-muted-foreground">Affectation des bus</h3>
              <MultiSelectBuses
                value={busIds}
                onChange={setBusIds}
                options={busOptions}
                placeholder="Sélectionner des bus"
              />
              <p className="text-xs text-muted-foreground">
                Les bus proviennent de votre parc (libellés = plaques).
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Astuce : pour modifier le trajet ou les arrêts, utilisez directement la carte (cliquez/drag sur les
            marqueurs).
          </div>
        </div>

        <SheetFooter className="border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
