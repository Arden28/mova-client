// src/pages/Reservations.tsx
"use client"

import * as React from "react"
import { IconPencil, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/data-table"
import { makeDrawerTriggerColumn } from "@/components/data-table-helpers"
import type { FilterConfig, GroupByConfig } from "@/components/data-table"

import ImportDialog from "@/components/common/ImportDialog"
import AddEditReservationDialog from "@/components/reservation/AddEditReservation"

// API clients
import reservationApi, { type UIReservation, type ReservationStatus } from "@/api/reservation"
import busApi, { type UIBus } from "@/api/bus"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { MapIcon } from "lucide-react"

/* ------------------------------- i18n helpers ------------------------------ */

type EventType =
  | "none" | "school_trip" | "university_trip" | "educational_tour" | "student_transport"
  | "wedding" | "funeral" | "birthday" | "baptism" | "family_meeting"
  | "conference" | "seminar" | "company_trip" | "business_mission" | "staff_shuttle"
  | "football_match" | "sports_tournament" | "concert" | "festival" | "school_competition"
  | "tourist_trip" | "group_excursion" | "pilgrimage" | "site_visit" | "airport_transfer"
  | "election_campaign" | "administrative_mission" | "official_trip" | "private_transport"
  | "special_event" | "simple_rental"

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  cancelled: "Annulée",
}

type PayState = "paid" | "pending" | "failed" | "none"
const PAYMENT_LABELS: Record<PayState, string> = {
  paid: "Payé",
  pending: "En attente",
  failed: "Échoué",
  none: "Aucun",
}

const EVENT_LABELS: Record<EventType, string> = {
  none: "Aucun",
  school_trip: "Sortie scolaire",
  university_trip: "Voyage universitaire",
  educational_tour: "Visite pédagogique",
  student_transport: "Transport d’étudiants",
  wedding: "Mariage",
  funeral: "Funérailles",
  birthday: "Anniversaire",
  baptism: "Baptême",
  family_meeting: "Retrouvailles familiales",
  conference: "Conférence",
  seminar: "Séminaire",
  company_trip: "Voyage d’entreprise",
  business_mission: "Mission professionnelle",
  staff_shuttle: "Navette du personnel",
  football_match: "Match de football",
  sports_tournament: "Tournoi sportif",
  concert: "Concert",
  festival: "Festival",
  school_competition: "Compétition scolaire",
  tourist_trip: "Voyage touristique",
  group_excursion: "Excursion de groupe",
  pilgrimage: "Pèlerinage",
  site_visit: "Visite de site",
  airport_transfer: "Transfert aéroport",
  election_campaign: "Campagne électorale",
  administrative_mission: "Mission administrative",
  official_trip: "Voyage officiel",
  private_transport: "Transport privé",
  special_event: "Événement spécial",
  simple_rental: "Location simple",
}

const frStatus = (s?: ReservationStatus | null) => (s ? (STATUS_LABELS[s] ?? s) : "—")
const frEvent = (e?: string | null) => (e ? (EVENT_LABELS[e as EventType] ?? e) : "—")
const frPayment = (p: PayState) => PAYMENT_LABELS[p] ?? p

/* ------------------------------- date utils -------------------------------- */

/**
 * Robust parser:
 * - If string includes 'Z' or ±HH:MM, parse as ISO (UTC/offset) and let JS convert to local.
 * - Else if it matches local "YYYY-MM-DD[ T]HH:mm[:ss][.ffffff]" → build a local Date (no TZ shift).
 * - Else if only "YYYY-MM-DD" → local midnight of that day.
 */
function parseSmartDate(input?: string): Date | null {
  if (!input) return null
  const s = input.trim()

  // ISO with timezone (Z or ±HH:MM) → trust the offset
  if (/[zZ]|[+\-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s)
    return isNaN(d.getTime()) ? null : d
  }

  // Local datetime: YYYY-MM-DD[ T]HH:mm[:ss][.ffffff]
  const mLocal = s.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,6}))?)?)?$/
  )
  if (mLocal) {
    const [, y, mo, d, hh = "00", mm = "00", ss = "00"] = mLocal
    return new Date(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss)
    )
  }

  // Fallback
  const d = new Date(s.replace("T", " "))
  return isNaN(d.getTime()) ? null : d
}

const fmtMoney = (v?: number) => (typeof v === "number" ? `${v.toLocaleString("fr-FR")} FCFA` : "—")

const friendlyDateTime = (iso?: string) => {
  const d = parseSmartDate(iso)
  if (!d) return "—"
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d)
}

const dateHeaderLabel = (iso?: string) => {
  const d = parseSmartDate(iso)
  if (!d) return "—"
  return d.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

const shortDatetime = (iso?: string) => {
  const d = parseSmartDate(iso)
  if (!d) return "—"
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(d)
}

/* ------------------------------- payments ---------------------------------- */

function derivePaymentStatus(): "paid" | "pending" | "failed" | "none" {
  return "none"
}

/* --------------------------------- Page ----------------------------------- */

export default function ReservationPage() {
  const [rows, setRows] = React.useState<UIReservation[]>([])
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UIReservation | null>(null)
  const [openImport, setOpenImport] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  const [buses, setBuses] = React.useState<UIBus[]>([])

  const reload = React.useCallback(async () => {
    try {
      setLoading(true)
      const [resvRes, busRes] = await Promise.all([
        reservationApi.list({ with: ["buses"], per_page: 100 }),
        busApi.list({ per_page: 500 }),
      ])
      setRows(resvRes.data.rows)
      setBuses(busRes.data.rows)
    } catch (e: any) {
      toast.error(e?.message ?? "Échec du chargement des réservations.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => { reload() }, [reload])

  // Sort by createdAt DESC
  const rowsSorted = React.useMemo(() => {
    const by = (x?: string) => (x ? parseSmartDate(x)?.getTime() ?? 0 : 0)
    return [...rows].sort((a, b) => by(b.createdAt) - by(a.createdAt))
  }, [rows])

  const busPlateById = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const b of buses) {
      if (!b?.id) continue
      m.set(String(b.id), b.plate ?? String(b.id))
    }
    return m
  }, [buses])

  const searchable = {
    placeholder: "Rechercher code, passager, téléphone, départ, arrivée…",
    fields: ["code", "passenger.name", "passenger.phone", "route.from", "route.to"] as (keyof UIReservation)[],
  }

  const statusOptions = (Object.keys(STATUS_LABELS) as ReservationStatus[]).map(v => ({
    label: STATUS_LABELS[v],
    value: v,
  }))
  const eventOptions = (Object.entries(EVENT_LABELS) as [EventType, string][]).map(([value, label]) => ({ value, label }))

  const filters: FilterConfig<UIReservation>[] = [
    { id: "status", label: "Statut réservation", options: statusOptions, accessor: (r) => r.status ?? "", defaultValue: "" },
    { id: "event", label: "Événement", options: eventOptions, accessor: (r) => r.event ?? "", defaultValue: "" },
    {
      id: "payment",
      label: "Paiement",
      options: [
        { label: PAYMENT_LABELS.paid, value: "paid" },
        { label: PAYMENT_LABELS.pending, value: "pending" },
        { label: PAYMENT_LABELS.failed, value: "failed" },
        { label: PAYMENT_LABELS.none, value: "none" },
      ],
      accessor: () => "none",
      defaultValue: "",
    },
  ]

  const columns = React.useMemo<ColumnDef<UIReservation>[]>(() => [
    makeDrawerTriggerColumn<UIReservation>("code", {
      triggerField: "code",
      renderTitle: (r) => r.code,
      renderBody: (r) => {
        const pstat = derivePaymentStatus()
        const busPlates = (r.busIds ?? []).map((id) => busPlateById.get(String(id)) ?? String(id))
        const dist = (r as UIReservation & { distanceKm?: number }).distanceKm
        return (
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Statut :</span>
              <Badge variant="outline" className="px-1.5 capitalize">{frStatus(r.status)}</Badge>
            </div>

            {!!r.event && (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Événement :</span>
                <Badge variant="outline" className="px-1.5">{frEvent(r.event)}</Badge>
              </div>
            )}

            <div className="grid gap-1">
              <span className="text-muted-foreground">Passager</span>
              <div>Nom : {r.passenger?.name ?? "—"}</div>
              <div>Tél. : {r.passenger?.phone ?? "—"}</div>
              <div>Email : {r.passenger?.email ?? "—"}</div>
            </div>

            <div className="grid gap-1">
              <span className="text-muted-foreground">Trajet</span>
              <div>{r.route?.from ?? "—"} → {r.route?.to ?? "—"}</div>
              <div> Date : {friendlyDateTime(r.tripDate)} </div>
              {!!dist && <div>Distance : {dist.toLocaleString("fr-FR")} km</div>}
            </div>

            <div className="grid gap-1">
              <div>Sièges : {r.seats ?? "—"}</div>
              <div>Total : {fmtMoney(r.priceTotal)}</div>
              <div>Bus : {busPlates.length ? busPlates.join(", ") : "—"}</div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Paiement :</span>
              <Badge variant="outline" className="px-1.5 capitalize">{frPayment(pstat)}</Badge>
            </div>

            <div className="text-xs text-muted-foreground">Créée le {shortDatetime(r.createdAt)}</div>
          </div>
        )
      },
    }),

    // Date (friendly)
    { id: "tripDate", header: "Date", cell: ({ row }) => friendlyDateTime(row.original.tripDate) },

    { id: "passenger", header: "Passager", cell: ({ row }) => (
        <div className="max-w-[240px] truncate">
          {row.original.passenger?.name ?? "—"}
          <div className="text-xs text-muted-foreground">{row.original.passenger?.phone ?? "—"}</div>
        </div>
      ),
      enableSorting: false,
    },

    { id: "route", header: "Itinéraire", cell: ({ row }) => (
        <span className="block max-w-[260px] truncate">
          {row.original.route?.from ?? "—"} → {row.original.route?.to ?? "—"}
        </span>
      ),
      enableSorting: false,
    },

    { accessorKey: "seats", header: () => <div className="w-full text-right">Sièges</div>,
      cell: ({ row }) => <div className="w-full text-right">{row.original.seats ?? "—"}</div> },

    { id: "buses", header: "Bus", cell: ({ row }) => {
        const plates = (row.original.busIds ?? []).map((id) => busPlateById.get(String(id)) ?? String(id))
        return <div className="max-w-[260px] truncate text-right">{plates.length ? plates.join(", ") : "—"}</div>
      },
      enableSorting: false,
    },

    { accessorKey: "event", header: "Événement",
      cell: ({ row }) => <Badge variant="outline" className="px-1.5">{frEvent(row.original.event)}</Badge> },

    { id: "total", header: () => <div className="w-full text-right">Total</div>,
      cell: ({ row }) => <div className="w-full text-right">{fmtMoney(row.original.priceTotal)}</div> },

    { accessorKey: "status", header: "Statut",
      cell: ({ row }) => <Badge variant="outline" className="px-1.5 capitalize">{frStatus(row.original.status)}</Badge> },

    { id: "paymentStatus", header: "Paiement",
      cell: () => <Badge variant="outline" className="px-1.5 capitalize">{frPayment("none")}</Badge> },
  ], [busPlateById])

  const groupBy: GroupByConfig<UIReservation>[] = [
    { id: "date", label: "Date", accessor: (r) => dateHeaderLabel(r.tripDate) },
    { id: "client", label: "Clients", accessor: (r) => r.passenger?.name ?? "—" },
    { id: "event", label: "Événements", accessor: (r) => frEvent(r.event) },
  ]

  function renderRowActions(r: UIReservation) {
    const isCancelled = r.status === "cancelled"
    return (
      <>
        <DropdownMenuItem onClick={() => { setEditing(r); setOpen(true) }}>Modifier</DropdownMenuItem>
        {!isCancelled && (
          <DropdownMenuItem onClick={async () => {
            const prev = rows
            setRows((xs) => xs.map((x) => (x.id === r.id ? { ...x, status: "cancelled" } : x)))
            try {
              await reservationApi.setStatus(r.id, "cancelled")
              toast("Réservation annulée")
              await reload()
            } catch (e: any) {
              setRows(prev)
              toast.error(e?.message ?? "Échec de l’annulation.")
            }
          }}>Annuler</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-rose-600" onClick={async () => {
          const prev = rows
          setRows((xs) => xs.filter((x) => x.id !== r.id))
          try {
            await reservationApi.remove(r.id)
            toast("Réservation supprimée")
            await reload()
          } catch (e: any) {
            setRows(prev)
            toast.error(e?.message ?? "Échec de la suppression.")
          }
        }}>Supprimer</DropdownMenuItem>
      </>
    )
  }

  const getRowId = (r: UIReservation) => String(r.id)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Réservations</h1>
          <p className="text-sm text-muted-foreground">Suivez les réservations, paiements et voyages planifiés.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/map/reservations"><MapIcon className="mr-2 h-4 w-4" />Vue carte</Link>
        </Button>
      </div>

      <DataTable<UIReservation>
        data={rowsSorted}
        columns={columns}
        getRowId={getRowId}
        searchable={searchable}
        filters={filters}
        loading={loading}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Ajouter"
        onImport={() => setOpenImport(true)}
        importLabel="Importer"
        renderRowActions={renderRowActions}
        groupBy={groupBy}
        initialView="list"
        pageSizeOptions={[10, 20, 50]}
        onDeleteSelected={async (selected) => {
          if (selected.length === 0) return
          const prev = rows
          setRows((xs) => xs.filter((x) => !selected.some((s) => s.id === x.id)))
          try {
            await Promise.all(selected.map((s) => reservationApi.remove(s.id)))
            await reload()
            toast(`${selected.length} réservation(s) supprimée(s).`)
          } catch (e: any) {
            setRows(prev)
            toast.error("Échec sur la suppression groupée.")
          }
        }}
      />

      <AddEditReservationDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSubmit={async (res) => {
          if (editing) {
            const prev = rows
            setRows((xs) => xs.map((x) => (x.id === res.id ? { ...x, ...res } : x)))
            try {
              const apiRes = await reservationApi.update(res.id, res)
              setRows((xs) => xs.map((x) => (x.id === res.id ? apiRes.data : x)))
              toast("Réservation mise à jour.")
              await reload()
            } catch (e: any) {
              setRows(prev)
              toast.error(e?.message ?? "Échec de la mise à jour.")
            } finally {
              setEditing(null)
            }
          } else {
            const tempId = res.id
            setRows((xs) => [res, ...xs])
            try {
              const apiRes = await reservationApi.create(res)
              setRows((xs) => xs.map((x) => (x.id === tempId ? apiRes.data : x)))
              toast("Réservation ajoutée.")
              await reload()
            } catch (e: any) {
              setRows((xs) => xs.filter((x) => x.id !== tempId))
              toast.error(e?.message ?? "Échec de la création.")
            }
          }
        }}
        trips={[]}
        buses={buses as unknown as any[]}
      />

      <ImportDialog<UIReservation>
        open={openImport}
        onOpenChange={setOpenImport}
        title="Importer des réservations"
        description="Chargez un CSV/Excel, mappez les colonnes, puis validez l'import."
        fields={[
          { key: "code", label: "Code" },
          { key: "tripDate", label: "Date du trajet (YYYY-MM-DD HH:mm[:ss][.ffffff][Z|±HH:MM])", required: true },
          { key: "route.from", label: "Départ", required: true },
          { key: "route.to", label: "Arrivée", required: true },
          { key: "passenger.name", label: "Passager · Nom", required: true },
          { key: "passenger.phone", label: "Passager · Téléphone", required: true },
          { key: "passenger.email", label: "Passager · Email" },
          { key: "seats", label: "Sièges", required: true },
          { key: "busIds", label: "Bus IDs (uuid,uuid,…)" },
          { key: "priceTotal", label: "Total (FCFA)" },
          { key: "status", label: "Statut (pending/confirmed/cancelled)" },
        ]}
        sampleHeaders={[
          "code","tripDate","from","to","passenger_name","passenger_phone","passenger_email","seats","busIds","priceTotal","status",
        ]}
        transform={(raw) => {
          const g = (k: string) => {
            switch (k) {
              case "route.from": return raw["route.from"] ?? raw["from"]
              case "route.to": return raw["route.to"] ?? raw["to"]
              case "passenger.name": return raw["passenger.name"] ?? raw["passenger_name"]
              case "passenger.phone": return raw["passenger.phone"] ?? raw["passenger_phone"]
              case "passenger.email": return raw["passenger.email"] ?? raw["passenger_email"]
              default: return raw[k]
            }
          }
          const code = String((raw.code ?? "") || `BZV-${String(Math.floor(Math.random()*1e6)).padStart(6,"0")}`)
          const tripDate = String(g("tripDate") ?? "").trim()
          const from = String(g("route.from") ?? "").trim()
          const to = String(g("route.to") ?? "").trim()
          const name = String(g("passenger.name") ?? "").trim()
          const phone = String(g("passenger.phone") ?? "").trim()
          const email = (g("passenger.email") ? String(g("passenger.email")).trim() : undefined) as string | undefined
          if (!tripDate || !from || !to || !name || !phone) return null
          const seatsNum = Number(raw.seats ?? 1)
          const totalNum = Number(raw.priceTotal ?? 0)
          let status = String(raw.status ?? "pending").toLowerCase()
          if (!["pending", "confirmed", "cancelled"].includes(status)) status = "pending"
          const busIdsVal = raw.busIds ? String(raw.busIds).split(",").map((s: string) => s.trim()).filter(Boolean) : []
          const res: UIReservation = {
            id: crypto.randomUUID(),
            code,
            tripDate,
            route: { from, to },
            passenger: { name, phone, email },
            seats: isNaN(seatsNum) ? 1 : seatsNum,
            busIds: busIdsVal,
            priceTotal: isNaN(totalNum) ? 0 : totalNum,
            status: status as ReservationStatus,
            createdAt: new Date().toISOString(),
          }
          return res
        }}
        onConfirm={async (imported) => {
          const prev = rows
          setRows((xs) => [...imported, ...xs])
          try {
            const created = await Promise.all(imported.map((r) => reservationApi.create(r).then((x) => x.data)))
            const key = (r: UIReservation) =>
              r.code ? `code:${r.code}` : `npd:${(r.passenger?.name ?? "").toLowerCase()}|${r.passenger?.phone}|${r.tripDate}`
            setRows((xs) => {
              const withoutTemps = xs.filter((x) => !imported.some((t) => key(t) === key(x)))
              return [...created, ...withoutTemps]
            })
            await reload()
            toast.success(`Import réussi (${created.length} réservation${created.length > 1 ? "s" : ""}).`)
          } catch (e: any) {
            setRows(prev)
            toast.error("Échec de l'import.")
          }
        }}
      />
    </div>
  )
}
