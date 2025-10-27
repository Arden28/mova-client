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
import api from "@/api/apiService"

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
  /** When present, shows a section inside the sheet to jump back to itinerary editing on the map. */
  onEditItinerary?: () => void
}

type VehicleType = "hiace" | "coaster"
type EventType =
  | "none"
  | "school_trip"
  | "university_trip"
  | "educational_tour"
  | "student_transport"
  | "wedding"
  | "funeral"
  | "birthday"
  | "baptism"
  | "family_meeting"
  | "conference"
  | "seminar"
  | "company_trip"
  | "business_mission"
  | "staff_shuttle"
  | "football_match"
  | "sports_tournament"
  | "concert"
  | "festival"
  | "school_competition"
  | "tourist_trip"
  | "group_excursion"
  | "pilgrimage"
  | "site_visit"
  | "airport_transfer"
  | "election_campaign"
  | "administrative_mission"
  | "official_trip"
  | "private_transport"
  | "special_event"
  | "simple_rental";

type QuoteResponse = { currency: string; client_payable: number; bus_payable: number }

export default function AddEditReservationSheet({
  open,
  onOpenChange,
  editing,
  onSubmit,
  buses,
  onEditItinerary,
}: Props) {
  const [form, setForm] = React.useState<Partial<UIReservation>>({})
  const [busIds, setBusIds] = React.useState<string[]>([])
  const [vehicleType, setVehicleType] = React.useState<VehicleType>("hiace")
  const [eventType, setEventType] = React.useState<EventType>("none")
  const [quoting, setQuoting] = React.useState(false)

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
    // Hydrate vehicle/event if present in editing (optional extensions)
    const vt = (editing as any)?.vehicleType as VehicleType | undefined
    if (vt) setVehicleType(vt)
    const ev = (editing as any)?.eventType as EventType | undefined
    if (ev) setEventType(ev)
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
    const base: UIReservation = {
      ...(editing as UIReservation),
      ...form,
      busIds,
      ...(vehicleType ? ({ vehicleType } as any) : {}),
      ...(eventType ? ({ eventType } as any) : {}),
    }

    // minimal validation
    if (!base?.passenger?.name || !base?.passenger?.phone) {
      toast.error("Nom et téléphone du passager sont obligatoires.")
      return
    }
    if (!base?.route?.from || !base?.route?.to || !(base as any)?.waypoints?.length) {
      toast.error("L’itinéraire n’est pas défini. Cliquez sur « Modifier l’itinéraire » pour le compléter.")
      return
    }

    onSubmit(base)
    onOpenChange(false)
  }

  const distanceKm =
    typeof (editing as any)?.distanceKm === "number"
      ? (editing as any).distanceKm
      : typeof form?.distanceKm === "number"
      ? (form as any).distanceKm
      : undefined

  // --- Automatic quoting (like the dialog) ---
  const busesCount = Math.max(1, (busIds?.length ?? (editing?.busIds?.length ?? 0)) || 1)
  React.useEffect(() => {
    let cancel = false
    const canQuote =
      vehicleType &&
      eventType !== undefined &&
      Number.isFinite(distanceKm as number) &&
      (distanceKm ?? 0) >= 0 &&
      busesCount >= 1

    if (!canQuote) return

    const t = setTimeout(async () => {
      setQuoting(true)
      try {
        const payload = {
          vehicle_type: vehicleType,
          distance_km: Number(distanceKm ?? 0),
          event: eventType,
          buses: busesCount,
        }
        const res = await api.post<QuoteResponse, typeof payload>("/quote", payload)
        if (cancel) return
        setField("priceTotal", res.data.client_payable as any)
      } catch (e: any) {
        if (!cancel) toast.error(e?.message ?? "Échec du calcul du tarif.")
      } finally {
        if (!cancel) setQuoting(false)
      }
    }, 400)

    return () => {
      cancel = true
      clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleType, eventType, distanceKm, busesCount])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="
          w-[min(100vw,1400px)]
          sm:w-[980px]
          md:w-[1180px]
          lg:w-[1320px]
          xl:w-[1400px]
          p-0
          flex flex-col
        "
      >
        <SheetHeader className="px-6 pt-6">
          <SheetTitle>{editing ? "Modifier la réservation" : "Ajouter une réservation"}</SheetTitle>
          <SheetDescription className="text-sm">
            Mettez à jour les infos de réservation. Les changements d’itinéraire se font sur la carte (voir la section «
            Modifier l’itinéraire » ci-dessous).
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-4">
          {/* Context + distance */}
          {editing && (
            <div className="mt-3 grid gap-3 rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="capitalize">{editing.status}</Badge>
                <span className="text-sm text-muted-foreground">
                  {editing.route?.from ?? "—"} → {editing.route?.to ?? "—"}
                </span>
                <span className="ml-auto font-medium">{editing.code}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {(editing as any)?.waypoints?.length ?? 0} points • distance estimée{" "}
                {typeof distanceKm === "number" ? `${distanceKm.toLocaleString("fr-FR")} km` : "—"}
              </div>
            </div>
          )}

          {/* Edit itinerary section */}
          {onEditItinerary && (
            <>
              <div className="mt-4 rounded-md border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">Modifier l’itinéraire</div>
                    <div className="text-xs text-muted-foreground">
                      Cliquez pour revenir sur la carte, ajuster les arrêts et revenir ici pour finaliser.
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={onEditItinerary}>
                    Éditer sur la carte
                  </Button>
                </div>
              </div>
              <Separator className="my-4" />
            </>
          )}

          {/* Two-column core fields (no status or buses here) */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left column */}
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
                  <Label>Distance totale (km)</Label>
                  <Input value={typeof distanceKm === "number" ? distanceKm : 0} readOnly />
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
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Véhicules & tarification</h3>
              <div className="grid gap-2">
                <div className="grid gap-1.5">
                  <Label>Type de véhicule</Label>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm capitalize"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  >
                    <option value="hiace">hiace</option>
                    <option value="coaster">coaster</option>
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <Label>Évènement</Label>
                  <select
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                  >
                    <option value="none">Aucun</option>
                    <option value="school_trip">Voyage scolaire</option>
                    <option value="university_trip">Voyage universitaire</option>
                    <option value="educational_tour">Visite éducative</option>
                    <option value="student_transport">Transport étudiant</option>
                    <option value="wedding">Mariage</option>
                    <option value="funeral">Funérailles</option>
                    <option value="birthday">Anniversaire</option>
                    <option value="baptism">Baptême</option>
                    <option value="family_meeting">Réunion de famille</option>
                    <option value="conference">Conférence</option>
                    <option value="seminar">Séminaire</option>
                    <option value="company_trip">Voyage d’entreprise</option>
                    <option value="business_mission">Mission professionnelle</option>
                    <option value="staff_shuttle">Navette du personnel</option>
                    <option value="football_match">Match de football</option>
                    <option value="sports_tournament">Tournoi sportif</option>
                    <option value="concert">Concert</option>
                    <option value="festival">Festival</option>
                    <option value="school_competition">Compétition scolaire</option>
                    <option value="tourist_trip">Voyage touristique</option>
                    <option value="group_excursion">Excursion de groupe</option>
                    <option value="pilgrimage">Pèlerinage</option>
                    <option value="site_visit">Visite de site</option>
                    <option value="airport_transfer">Transfert aéroport</option>
                    <option value="election_campaign">Campagne électorale</option>
                    <option value="administrative_mission">Mission administrative</option>
                    <option value="official_trip">Voyage officiel</option>
                    <option value="private_transport">Transport privé</option>
                    <option value="special_event">Événement spécial</option>
                    <option value="simple_rental">Location simple</option>
                  </select>

                </div>

                <div className="grid gap-1.5">
                  <Label>Total (FCFA)</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      value={form.priceTotal ?? editing?.priceTotal ?? 0}
                      onChange={(e) => setField("priceTotal", Number(e.target.value) as any)}
                      className="pr-16"
                    />
                    <div className="pointer-events-none absolute inset-y-0 right-0 grid w-16 place-items-center text-xs text-muted-foreground">
                      {quoting ? "…calc" : "FCFA"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FULL-WIDTH: Status */}
          <div className="mt-6">
            <Label className="mb-2 block">Statut</Label>
            <div className="grid grid-cols-3 gap-2">
              {["pending", "confirmed", "cancelled"].map((s) => (
                <Button
                  key={s}
                  type="button"
                  variant={(form.status ?? editing?.status ?? "pending") === s ? "default" : "outline"}
                  onClick={() => setField("status", s as any)}
                  className="capitalize"
                >
                  {s === "pending" && "En attente"}
                  {s === "confirmed" && "Confirmée"}
                  {s === "cancelled" && "Annulée"}
                </Button>
              ))}
            </div>
          </div>

          {/* FULL-WIDTH: Buses */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-muted-foreground">Affectation des bus</h3>
            <MultiSelectBuses
              value={busIds}
              onChange={setBusIds}
              options={busOptions}
              placeholder="Sélectionner des bus"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Les bus proviennent de votre parc (libellés = plaques).
            </p>
          </div>

          <Separator className="my-6" />

          {/* Passenger */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Passager</h3>
            <div className="grid gap-4 lg:grid-cols-2">
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
              <div className="grid gap-1.5 lg:col-span-2">
                <Label>Email (optionnel)</Label>
                <Input
                  value={form.passenger?.email ?? ""}
                  onChange={(e) => setNested("passenger.email", e.target.value)}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Astuce : l’itinéraire se modifie sur la carte (bouton « Éditer sur la carte » ci-dessus).
          </div>
        </div>

        <SheetFooter className="border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={quoting}>Enregistrer</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
