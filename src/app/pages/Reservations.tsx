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
import type { FilterConfig, GroupByConfig  } from "@/components/data-table"

import ImportDialog from "@/components/common/ImportDialog"
import AddEditReservationDialog from "@/components/reservation/AddEditReservation"

// API clients
import reservationApi, { type UIReservation, type ReservationStatus } from "@/api/reservation"
import busApi, { type UIBus } from "@/api/bus"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { MapIcon } from "lucide-react"

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
// No payments API yet — default to “none”
function derivePaymentStatus(): PayState {
  return "none"
}

/* --------------------------------- Page ----------------------------------- */

export default function ReservationPage() {
  const [rows, setRows] = React.useState<UIReservation[]>([])
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UIReservation | null>(null)
  const [openImport, setOpenImport] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  // Buses from API (for plates + dialog options)
  const [buses, setBuses] = React.useState<UIBus[]>([])

  // On mount: fetch reservations + buses
  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const [resvRes, busRes] = await Promise.all([
          reservationApi.list({ with: ["buses"], per_page: 100 }), // tune per_page if needed
          busApi.list({ per_page: 500 }),
        ])
        if (!alive) return
        setRows(resvRes.data.rows)
        setBuses(busRes.data.rows)
      } catch (e: any) {
        toast.error(e?.message ?? "Échec du chargement des réservations.")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // Map busId -> plate label
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

  const filters: FilterConfig<UIReservation>[] = [
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
      accessor: () => derivePaymentStatus(),
      defaultValue: "",
    },
  ]

  const columns = React.useMemo<ColumnDef<UIReservation>[]>(() => {
    return [
      // Drawer trigger on code
      makeDrawerTriggerColumn<UIReservation>("code", {
        triggerField: "code",
        renderTitle: (r) => r.code,
        renderBody: (r) => {
          const pstat = derivePaymentStatus()
          const busPlates = (r.busIds ?? []).map((id) => busPlateById.get(id) ?? id)
          const dist = (r as UIReservation & { distanceKm?: number }).distanceKm
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
                  Date : {r.tripDate ? new Date(r.tripDate).toLocaleDateString("fr-FR") : "—"}
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
        cell: () => {
          const pstat = derivePaymentStatus()
          return <Badge variant="outline" className="px-1.5 capitalize">{pstat}</Badge>
        },
      },
    ]
  }, [busPlateById])

  
  const groupBy: GroupByConfig<UIReservation>[] = [
    {
      id: "client",
      label: "Clients",
      accessor: (r: UIReservation) => r.passenger?.name ?? "—",
    },
  ]

  /* --------------------------- Row action handlers -------------------------- */

  function renderRowActions(r: UIReservation) {
    const isCancelled = r.status === "cancelled"
    return (
      <>
        <DropdownMenuItem onClick={() => { setEditing(r); setOpen(true) }}>
          <IconPencil className="mr-2 h-4 w-4" /> Modifier
        </DropdownMenuItem>

        {!isCancelled && (
          <DropdownMenuItem
            onClick={async () => {
              // optimistic status change
              const prev = rows
              setRows((xs) => xs.map((x) => (x.id === r.id ? { ...x, status: "cancelled" } as UIReservation : x)))
              try {
                await reservationApi.setStatus(r.id, "cancelled")
                toast("Réservation annulée")
              } catch (e: any) {
                setRows(prev)
                toast.error(e?.message ?? "Échec de l’annulation.")
              }
            }}
          >
            Annuler
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-rose-600"
          onClick={async () => {
            // optimistic delete (soft-delete)
            const prev = rows
            setRows((xs) => xs.filter((x) => x.id !== r.id))
            try {
              await reservationApi.remove(r.id)
              toast("Réservation supprimée")
            } catch (e: any) {
              setRows(prev)
              toast.error(e?.message ?? "Échec de la suppression.")
            }
          }}
        >
          <IconTrash className="mr-2 h-4 w-4" /> Supprimer
        </DropdownMenuItem>
      </>
    )
  }
  
  // getRowId (typed id param if you use it elsewhere)
  const getRowId = (r: UIReservation) => String(r.id)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Réservations</h1>
          <p className="text-sm text-muted-foreground">Suivez les réservations, paiements et voyages planifiés.</p>
        </div>

        {/* Switch to map layout */}
        <Button asChild variant="outline">
          <Link to="/map/reservations">
            <MapIcon className="mr-2 h-4 w-4" />
            Vue carte
          </Link>
        </Button>
      </div>

      <DataTable<UIReservation>
        data={rows}
        columns={columns}
        getRowId={getRowId}
        searchable={{ placeholder: "Rechercher code, passager, téléphone, départ, arrivée…", fields: ["code"] }}
        filters={filters}
        loading={loading}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Ajouter"
        onImport={() => setOpenImport(true)}
        importLabel="Importer"
        renderRowActions={renderRowActions}
        groupBy={groupBy}
        initialView="list"
        // drawer={{ triggerField: "code" }}
        pageSizeOptions={[10, 20, 50]}
        onDeleteSelected={async (selected) => {
          if (selected.length === 0) return
          const prev = rows
          setRows((xs) => xs.filter((x) => !selected.some((s) => s.id === x.id)))
          try {
            await Promise.all(selected.map((s) => reservationApi.remove(s.id)))
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
            // optimistic update
            const prev = rows
            setRows((xs) => xs.map((x) => (x.id === res.id ? { ...x, ...res } : x)))
            try {
              const apiRes = await reservationApi.update(res.id, res)
              // server is source of truth (may compute fields)
              setRows((xs) => xs.map((x) => (x.id === res.id ? apiRes.data : x)))
              toast("Réservation mise à jour.")
            } catch (e: any) {
              setRows(prev)
              toast.error(e?.message ?? "Échec de la mise à jour.")
            } finally {
              setEditing(null)
            }
          } else {
            // optimistic add with temp id
            const tempId = res.id
            const temp = { ...res }
            setRows((xs) => [temp, ...xs])
            try {
              const apiRes = await reservationApi.create(res)
              // swap temp by server row
              setRows((xs) => xs.map((x) => (x.id === tempId ? apiRes.data : x)))
              toast("Réservation ajoutée.")
            } catch (e: any) {
              setRows((xs) => xs.filter((x) => x.id !== tempId))
              toast.error(e?.message ?? "Échec de la création.")
            }
          }
        }}
        // The dialog only needs id + plate; we pass the full list anyway
        trips={[]} // no trips API wired yet; keep empty array
        buses={buses as unknown as any[]} // used for MultiSelect (id+plate)
      />

      <ImportDialog<UIReservation>
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
          // Optimistic batch add, then POST each
          const prev = rows
          setRows((xs) => [...imported, ...xs])
          try {
            const created = await Promise.all(imported.map((r) => reservationApi.create(r).then((x) => x.data)))
            // Replace temps by server rows (match by code+tripDate+phone as fallback)
            const key = (r: UIReservation) =>
              r.code ? `code:${r.code}` : `npd:${(r.passenger?.name ?? "").toLowerCase()}|${r.passenger?.phone}|${r.tripDate}`
            setRows((xs) => {
              const withoutTemps = xs.filter((x) => !imported.some((t) => key(t) === key(x)))
              return [...created, ...withoutTemps]
            })
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
