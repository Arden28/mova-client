"use client"

import * as React from "react"
import { IconPlus, IconPencil, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, makeDrawerTriggerColumn } from "@/components/data-table"
import type { FilterConfig } from "@/components/data-table"

import ImportDialog from "@/components/common/ImportDialog"
import AddEditReservationDialog from "@/components/reservation/AddEditReservation"

import type { Reservation, Trip, Payment, Bus } from "@/types"
import { reservations as seedReservations, trips, payments } from "@/data/reservations"
import { buses } from "@/data/buses"

/* ------------------------------- utilities -------------------------------- */

const fmtMoney = (v?: number) => (typeof v === "number" ? `${v.toLocaleString("fr-FR")} FCFA` : "—")

const shortDatetime = (iso?: string) => {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(d)
  } catch {
    return iso
  }
}

type PayState = "paid" | "pending" | "failed" | "none"
function derivePaymentStatus(bookingId: string, byBooking: Map<string, Payment[]>) {
  const list = byBooking.get(bookingId) ?? []
  if (!list.length) return "none" as PayState
  if (list.some((p) => p.status === "paid")) return "paid"
  if (list.some((p) => p.status === "pending")) return "pending"
  if (list.some((p) => p.status === "failed")) return "failed"
  return "none"
}

/* --------------------------------- Page ----------------------------------- */

export default function ReservationPage() {
  const [rows, setRows] = React.useState<Reservation[]>(seedReservations)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Reservation | null>(null)
  const [openImport, setOpenImport] = React.useState(false)

  // Map busId -> plate (label)
  const busPlateById = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const b of buses as Bus[]) {
      if (!b?.id) continue
      const plate = (b as any)?.plate || b.id
      m.set(b.id, plate)
    }
    return m
  }, [])

  const paymentsByBooking = React.useMemo(() => {
    const m = new Map<string, Payment[]>()
    for (const p of payments) {
      const arr = m.get(p.bookingId) ?? []
      arr.push(p)
      m.set(p.bookingId, arr)
    }
    return m
  }, [])

  const searchable = {
    placeholder: "Rechercher code, passager, téléphone, départ, arrivée…",
    fields: ["code", "passenger.name", "passenger.phone", "route.from", "route.to"] as any,
  }

  const filters: FilterConfig<Reservation>[] = [
    {
      id: "status",
      label: "Statut réservation",
      options: [
        { label: "En attente", value: "pending" },
        { label: "Confirmée", value: "confirmed" },
        { label: "Annulée", value: "cancelled" },
      ],
      accessor: (r) => r.status ?? "",
      defaultValue: "",
    },
    {
      id: "payment",
      label: "Paiement",
      options: [
        { label: "Payé", value: "paid" },
        { label: "En attente", value: "pending" },
        { label: "Échoué", value: "failed" },
        { label: "Aucun", value: "none" },
      ],
      accessor: (r) => (derivePaymentStatus(r.id, paymentsByBooking) ?? "") as string,
      defaultValue: "",
    },
  ]

  const columns = React.useMemo<ColumnDef<Reservation>[]>(() => {
    return [
      // Drawer trigger on code
      makeDrawerTriggerColumn<Reservation>("code", {
        triggerField: "code",
        renderTitle: (r) => r.code,
        renderBody: (r) => {
          const pstat = derivePaymentStatus(r.id, paymentsByBooking)
          const busPlates = (r.busIds ?? []).map((id) => busPlateById.get(id) ?? id)
          const dist = (r as any)?.distanceKm as number | undefined
          return (
            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Statut :</span>
                <Badge variant="outline" className="px-1.5 capitalize">{r.status}</Badge>
              </div>

              <div className="grid gap-1">
                <span className="text-muted-foreground">Passager</span>
                <div>Nom : {r.passenger?.name ?? "—"}</div>
                <div>Tél. : {r.passenger?.phone ?? "—"}</div>
                <div>Email : {r.passenger?.email ?? "—"}</div>
              </div>

              <div className="grid gap-1">
                <span className="text-muted-foreground">Trajet</span>
                <div>{r.route?.from ?? "—"} → {r.route?.to ?? "—"}</div>
                <div>
                  Date : {r.tripDate ? new Date(r.tripDate).toLocaleDateString("fr-FR") : "—"} {r.tripId ? `· Voyage #${r.tripId}` : ""}
                </div>
                {!!dist && <div>Distance : {dist.toLocaleString("fr-FR")} km</div>}
              </div>

              <div className="grid gap-1">
                <div>Sièges : {r.seats ?? "—"}</div>
                <div>Total : {fmtMoney(r.priceTotal)}</div>
                <div>Bus : {busPlates.length ? busPlates.join(", ") : "—"}</div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Paiement :</span>
                <Badge variant="outline" className="px-1.5 capitalize">{pstat}</Badge>
              </div>

              <div className="text-xs text-muted-foreground">Créée le {shortDatetime(r.createdAt)}</div>
            </div>
          )
        },
      }),

      // Passager
      {
        id: "passenger",
        header: "Passager",
        cell: ({ row }) => (
          <div className="max-w-[240px] truncate">
            {row.original.passenger?.name ?? "—"}
            <div className="text-xs text-muted-foreground">{row.original.passenger?.phone ?? "—"}</div>
          </div>
        ),
        enableSorting: false,
      },

      // Itinéraire
      {
        id: "route",
        header: "Itinéraire",
        cell: ({ row }) => (
          <span className="block max-w-[260px] truncate">
            {row.original.route?.from ?? "—"} → {row.original.route?.to ?? "—"}
          </span>
        ),
        enableSorting: false,
      },

      // Sièges
      {
        accessorKey: "seats",
        header: () => <div className="w-full text-right">Sièges</div>,
        cell: ({ row }) => <div className="w-full text-right">{row.original.seats ?? "—"}</div>,
      },

      // Bus (plates)
      {
        id: "buses",
        header: "Bus",
        cell: ({ row }) => {
          const plates = (row.original.busIds ?? []).map((id) => busPlateById.get(id) ?? id)
          return (
            <div className="max-w-[260px] truncate text-right">
              {plates.length ? plates.join(", ") : "—"}
            </div>
          )
        },
        enableSorting: false,
      },

      // Total
      {
        id: "total",
        header: () => <div className="w-full text-right">Total</div>,
        cell: ({ row }) => <div className="w-full text-right">{fmtMoney(row.original.priceTotal)}</div>,
      },

      // Statut
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 capitalize">{row.original.status}</Badge>
        ),
      },

      // Paiement
      {
        id: "paymentStatus",
        header: "Paiement",
        cell: ({ row }) => {
          const pstat = derivePaymentStatus(row.original.id, paymentsByBooking)
          return <Badge variant="outline" className="px-1.5 capitalize">{pstat}</Badge>
        },
      },
    ]
  }, [paymentsByBooking, busPlateById])

  function renderRowActions(r: Reservation) {
    const isCancelled = r.status === "cancelled"
    return (
      <>
        <DropdownMenuItem
          onClick={() => {
            setEditing(r)
            setOpen(true)
          }}
        >
          <IconPencil className="mr-2 h-4 w-4" /> Modifier
        </DropdownMenuItem>

        {!isCancelled && (
          <DropdownMenuItem
            onClick={() => {
              setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: "cancelled" } : x)))
              toast({ title: "Réservation annulée", description: `Code : ${r.code}` })
            }}
          >
            Annuler
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-rose-600"
          onClick={() => {
            setRows((prev) => prev.filter((x) => x.id !== r.id))
            toast({ variant: "destructive", title: "Réservation supprimée", description: `Code : ${r.code}` })
          }}
        >
          <IconTrash className="mr-2 h-4 w-4" /> Supprimer
        </DropdownMenuItem>
      </>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Réservations</h1>
          <p className="text-sm text-muted-foreground">Suivez les réservations, paiements et voyages planifiés.</p>
        </div>
      </div>

      <DataTable<Reservation>
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        searchable={searchable}
        filters={filters}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Ajouter"
        onImport={() => setOpenImport(true)}
        importLabel="Importer"
        renderRowActions={renderRowActions}
        drawer={{ triggerField: "code" }}
        onDeleteSelected={(selected) => {
          setRows((prev) => prev.filter((x) => !selected.some((s) => s.id === x.id)))
        }}
      />

      <AddEditReservationDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSubmit={(res) => {
          setRows((prev) => {
            const i = prev.findIndex((x) => x.id === res.id)
            if (i === -1) return [res, ...prev]
            const next = [...prev]
            next[i] = { ...prev[i], ...res }
            return next
          })
          setEditing(null)
        }}
        trips={trips as Trip[]}
        buses={buses as Bus[]}
      />

      {/* Import dialog unchanged from your previous version (kept for brevity) */}
      <ImportDialog<Reservation>
        open={openImport}
        onOpenChange={setOpenImport}
        title="Importer des réservations"
        description="Chargez un CSV/Excel, mappez les colonnes, puis validez l'import."
        fields={[
          { key: "code", label: "Code" },
          { key: "tripDate", label: "Date du trajet (YYYY-MM-DD)", required: true },
          { key: "route.from", label: "Départ", required: true },
          { key: "route.to", label: "Arrivée", required: true },
          { key: "passenger.name", label: "Passager · Nom", required: true },
          { key: "passenger.phone", label: "Passager · Téléphone", required: true },
          { key: "passenger.email", label: "Passager · Email" },
          { key: "seats", label: "Sièges", required: true },
          { key: "busIds", label: "Bus IDs (b1,b3,…)" },
          { key: "priceTotal", label: "Total (FCFA)" },
          { key: "status", label: "Statut (pending/confirmed/cancelled)" },
          { key: "tripId", label: "Voyage ID (optionnel)" },
        ]}
        sampleHeaders={[
          "code","tripDate","from","to","passenger_name","passenger_phone","passenger_email","seats","busIds","priceTotal","status","tripId",
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
          const tripId = raw.tripId ? String(raw.tripId).trim() : undefined
          const res: Reservation = {
            id: crypto.randomUUID() as Reservation["id"],
            code,
            tripDate,
            route: { from, to },
            passenger: { name, phone, email },
            seats: isNaN(seatsNum) ? 1 : seatsNum,
            busIds: busIdsVal,
            priceTotal: isNaN(totalNum) ? 0 : totalNum,
            status: status as Reservation["status"],
            createdAt: new Date().toISOString(),
            tripId,
          }
          return res
        }}
        onConfirm={(imported) => {
          setRows((prev) => {
            const key = (r: Reservation) => r.code ? `code:${r.code}` : `npd:${(r.passenger?.name ?? "").toLowerCase()}|${r.passenger?.phone}|${r.tripDate}`
            const existing = new Map(prev.map((r) => [key(r), true]))
            const merged: Reservation[] = [...prev]
            for (const nr of imported) {
              const k = key(nr)
              if (existing.has(k)) {
                const idx = merged.findIndex((x) => key(x) === k)
                if (idx >= 0) merged[idx] = { ...merged[idx], ...nr }
              } else {
                merged.unshift(nr)
              }
            }
            return merged
          })
          toast.success(`Import réussi (${imported.length} réservation${imported.length > 1 ? "s" : ""}).`)
        }}
      />
    </div>
  )
}
