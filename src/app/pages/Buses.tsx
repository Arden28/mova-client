"use client"

import * as React from "react"
import { IconPencil, IconPower, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import { type ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { makeDrawerTriggerColumn } from "@/components/data-table-helpers"
import type { FilterConfig, GroupByConfig } from "@/components/data-table"

import AddEditBusDialog from "@/components/bus/AddEditBusDialog"
import ImportDialog from "@/components/common/ImportDialog"

import busApi, { type UIBus, type BusStatus, type BusType } from "@/api/bus"
import peopleApi, { type Person } from "@/api/people"
import { ApiError } from "@/api/apiService"

/* --------------------- i18n / pretty label helpers --------------------- */

const BUS_STATUS_LABELS: Record<Exclude<BusStatus, undefined>, string> = {
  active: "Actif",
  inactive: "Inactif",
  maintenance: "Maintenance",
}
const frBusStatus = (s?: UIBus["status"] | null) => (s ? (BUS_STATUS_LABELS[s] ?? s) : "—")

// Common known types; fallback prettifies unknowns (title case)
const BUS_TYPE_LABELS: Record<string, string> = {
  hiace: "Hiace",
  coaster: "Coaster",
  sprinter: "Sprinter",
  coach: "Autocar",
  minibus: "Minibus",
  bus: "Bus",
}
const prettyType = (t?: string | BusType | null) => {
  if (!t) return "—"
  const key = String(t).toLowerCase()
  if (BUS_TYPE_LABELS[key]) return BUS_TYPE_LABELS[key]
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())
}

/* --------------------- typing helpers --------------------- */

const ALLOWED_BUS_TYPES = new Set<BusType>([
  "sprinter",
  "coach",
  "minibus",
  "hiace",
  "coaster",
  "bus",
])

/** Normalize an arbitrary string to a BusType (or undefined if invalid). */
function toBusType(v?: string | null): BusType | undefined {
  if (!v) return undefined
  const key = v.toLowerCase() as BusType
  return ALLOWED_BUS_TYPES.has(key) ? key : undefined
}

/* --------------------- helpers --------------------- */

const uuid = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  return "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function showValidationErrors(err: unknown) {
  const e = err as ApiError
  if (e?.payload?.errors) {
    const lines = Object.entries(e.payload.errors).map(([k, v]) => {
      const msg = Array.isArray(v) ? v[0] : v
      return `${k}: ${msg}`
    })
    if (lines.length) {
      toast.error(lines.join("\n"))
      return
    }
  }
  toast.error((e as any)?.message ?? "Erreur inconnue.")
}

/* --------------------- component --------------------- */

export default function BusesPage() {
  const [rows, setRows] = React.useState<UIBus[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<UIBus | null>(null)
  const [openImport, setOpenImport] = React.useState(false)

  // People cache for dialog dropdowns / fallbacks
  const [people, setPeople] = React.useState<Person[]>([])

  const personById = React.useMemo(() => {
    const map = new Map<Person["id"], Person>()
    people.forEach((p) => map.set(p.id, p))
    return map
  }, [people])

  const getPersonName = React.useCallback(
    (id?: string | null, fallbackName?: string | null) => {
      const safeId: string | undefined = id ?? undefined
      const safeFallback: string | undefined = fallbackName ?? undefined
      if (!safeId) return safeFallback ?? "—"
      return personById.get(safeId)?.name ?? safeFallback ?? "—"
    },
    [personById]
  )

  const reload = React.useCallback(async () => {
    try {
      setLoading(true)
      const [busRes, peopleRes] = await Promise.all([
        busApi.list({ per_page: 100, with: ["operator", "driver", "conductor"], order_by: "created_at", order_dir: "desc" }),
        peopleApi.list({ per_page: 200 }), // owner/driver/conductor
      ])
      setRows(busRes.data.rows)
      setPeople(peopleRes.data.rows)
    } catch (e) {
      showValidationErrors(e)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      await reload()
      if (!alive) return
    })()
    return () => {
      alive = false
    }
  }, [reload])

  const columns = React.useMemo<ColumnDef<UIBus>[]>(() => {
    return [
      makeDrawerTriggerColumn<UIBus>("plate", {
        triggerField: "plate",
        renderTitle: (b) => b.plate,
        renderBody: (b) => (
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Capacité :</span> {b.capacity}
            </div>
            <div>
              <span className="text-muted-foreground">Propriétaire :</span>{" "}
              {getPersonName(b.operatorId, b.operatorName)}
            </div>
            <div>
              <span className="text-muted-foreground">Chauffeur :</span>{" "}
              {getPersonName(b.assignedDriverId, b.driverName)}
            </div>
            <div>
              <span className="text-muted-foreground">Receveur :</span>{" "}
              {getPersonName(b.assignedConductorId, b.conductorName)}
            </div>
            <div>
              <span className="text-muted-foreground">Type :</span> {prettyType(b.type)}
            </div>
            <div>
              <span className="text-muted-foreground">Modèle :</span> {b.model ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Année :</span> {b.year ?? "—"}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Statut :</span>
              <Badge variant="outline" className="px-1.5 capitalize">
                {frBusStatus(b.status)}
              </Badge>
            </div>
          </div>
        ),
      }),

      {
        accessorKey: "capacity",
        header: () => <div className="w-full text-right">Capacité</div>,
        cell: ({ row }) => <div className="w-full text-right">{row.original.capacity}</div>,
      },

      {
        id: "owner",
        header: "Propriétaire",
        cell: ({ row }) => (
          <span className="block max-w-[240px] truncate">
            {getPersonName(row.original.operatorId, row.original.operatorName)}
          </span>
        ),
        enableSorting: false,
      },

      {
        id: "driver",
        header: "Chauffeur",
        cell: ({ row }) => (
          <span className="block max-w-[240px] truncate">
            {getPersonName(row.original.assignedDriverId, row.original.driverName)}
          </span>
        ),
        enableSorting: false,
      },

      {
        id: "conductor",
        header: "Receveur",
        cell: ({ row }) => (
          <span className="block max-w-[240px] truncate">
            {getPersonName(row.original.assignedConductorId, row.original.conductorName)}
          </span>
        ),
        enableSorting: false,
      },

      // Type column (pretty label)
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 capitalize">
            {prettyType(row.original.type)}
          </Badge>
        ),
      },

      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 capitalize">
            {frBusStatus(row.original.status)}
          </Badge>
        ),
      },
    ]
  }, [getPersonName])

  const searchable = React.useMemo(
    () => ({
      placeholder: "Rechercher immatriculation, modèle, type, libellé…",
      fields: ["plate", "model", "type"] as (keyof UIBus)[],
    }),
    []
  )

  // Build Type filter options dynamically from current data (typed as BusType)
  const typeFilterOptions = React.useMemo(() => {
    const set = new Set<BusType>()
    rows.forEach((b) => {
      if (b.type) set.add(b.type as BusType)
    })
    return Array.from(set)
      .sort((a, b) => prettyType(a).localeCompare(prettyType(b), "fr"))
      .map((v) => ({
        value: v,
        label: prettyType(v),
      }))
  }, [rows])

  const filters = React.useMemo<FilterConfig<UIBus>[]>(() => {
    const statusOptions = (["active", "inactive", "maintenance"] as const).map((v) => ({
      value: v,
      label: BUS_STATUS_LABELS[v],
    }))
    return [
      {
        id: "status",
        label: "Statut",
        options: statusOptions,
        accessor: (b) => b.status ?? "",
        defaultValue: "",
      },
      {
        id: "type",
        label: "Type",
        options: typeFilterOptions,
        accessor: (b) => b.type ?? "",
        defaultValue: "",
      },
    ]
  }, [typeFilterOptions])

  const groupBy: GroupByConfig<UIBus>[] = [
    {
      id: "type",
      label: "Type de bus",
      accessor: (r: UIBus) => prettyType(r.type),
      sortGroups: (a, b) => a.localeCompare(b, "fr"),
    },
    {
      id: "owner",
      label: "Propriétaire",
      accessor: (r: UIBus) => getPersonName(r.operatorId, r.operatorName),
      sortGroups: (a, b) => a.localeCompare(b, "fr"),
    },
  ]

  // getRowId (typed id param if you use it elsewhere)
  const getRowId = (r: UIBus) => String(r.id)

  const isServerUuid = (id: string) => /^[0-9a-fA-F-]{36}$/.test(id)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Bus</h1>
          <p className="text-sm text-muted-foreground">
            Gérez le parc, la capacité, les chauffeurs, receveurs et l’état du service.
          </p>
        </div>
      </div>

      <DataTable<UIBus>
        data={rows}
        columns={columns}
        getRowId={getRowId}
        searchable={searchable}
        filters={filters}
        loading={loading}
        onAdd={() => {
          setEditing(null)
          setOpen(true)
        }}
        addLabel="Ajouter un bus"
        onImport={() => setOpenImport(true)}
        importLabel="Importer"
        renderRowActions={(b) => {
          const isActive = (b.status ?? "inactive") === "active"
          return (
            <>
              <DropdownMenuItem
                onClick={() => {
                  setEditing(b)
                  setOpen(true)
                }}
              >
                <IconPencil className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={async () => {
                  // optimistic toggle + server call
                  const prev = rows
                  const nextStatus: BusStatus = isActive ? "inactive" : "active"
                  setRows((r) => r.map((x) => (x.id === b.id ? { ...x, status: nextStatus } : x)))
                  try {
                    await busApi.setStatus(b.id, nextStatus)
                    toast.success(
                      nextStatus === "active" ? "Bus activé" : "Bus désactivé",
                      { description: `Plaque : ${b.plate}` }
                    )
                  } catch (e) {
                    setRows(prev)
                    showValidationErrors(e)
                  }
                }}
              >
                <IconPower className="mr-2 h-4 w-4" />
                {isActive ? "Désactiver" : "Activer"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-rose-600"
                onClick={async () => {
                  // optimistic delete + rollback
                  const prev = rows
                  setRows((r) => r.filter((x) => x.id !== b.id))
                  try {
                    if (isServerUuid(b.id)) await busApi.remove(b.id)
                    toast.error("Bus supprimé", { description: `Plaque : ${b.plate}` })
                  } catch (e) {
                    setRows(prev)
                    showValidationErrors(e)
                  }
                }}
              >
                <IconTrash className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </>
          )
        }}
        groupBy={groupBy}
        initialView="list"
        pageSizeOptions={[10, 20, 50]}
        // drawer={{ triggerField: "plate" }}
        onDeleteSelected={async (selected) => {
          if (selected.length === 0) return
          const prev = rows
          setRows((r) => r.filter((b) => !selected.some((s) => s.id === b.id)))
          try {
            await Promise.all(
              selected.filter((s) => isServerUuid(s.id)).map((s) => busApi.remove(s.id))
            )
            toast.success(`${selected.length} bus supprimé(s).`)
          } catch (e) {
            setRows(prev)
            showValidationErrors(e)
          }
        }}
      />

      <AddEditBusDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing as any} // dialog shape matches used keys
        people={people}
        onSubmit={async (bus: any) => {
          // bus has UIBus-compatible fields (including optional type/label)
          if (editing) {
            const prev = rows
            setRows((r) => r.map((x) => (x.id === bus.id ? { ...x, ...bus } as UIBus : x)))
            try {
              await busApi.update(bus.id, bus)
              await reload()
              toast("Bus mis à jour", { description: `Plaque : ${bus.plate}` })
            } catch (e) {
              setRows(prev)
              showValidationErrors(e)
            } finally {
              setEditing(null)
            }
          } else {
            const tempId = uuid()
            const tempRow: UIBus = { id: tempId, ...bus }
            setRows((r) => [tempRow, ...r])
            try {
              await busApi.create(bus)
              await reload()
              toast.success("Bus ajouté", { description: `Plaque : ${bus.plate}` })
            } catch (e) {
              setRows((r) => r.filter((x) => x.id !== tempId))
              showValidationErrors(e)
            }
          }
        }}
      />

      <ImportDialog<Record<string, unknown>>
        open={openImport}
        onOpenChange={setOpenImport}
        title="Importer des bus"
        description="Chargez un CSV/Excel, mappez les colonnes, puis validez l'import."
        fields={[
          { key: "plate", label: "Immatriculation", required: true },
          { key: "type", label: "Type (ex: hiace, coaster)" },
          { key: "model", label: "Modèle" },
          { key: "capacity", label: "Capacité" },
          { key: "year", label: "Année" },
          { key: "status", label: "Statut" },
          { key: "operatorId", label: "Propriétaire (nom ou ID)" },
          { key: "assignedDriverId", label: "Chauffeur (nom ou ID)" },
          { key: "assignedConductorId", label: "Receveur (nom ou ID)" }, // NEW
        ]}
        sampleHeaders={[
          "plate",
          "label",
          "type",
          "model",
          "capacity",
          "year",
          "status",
          "owner",
          "driver",
          "conductor",          // names
          "operatorId",
          "assignedDriverId",
          "assignedConductorId", // IDs
        ]}
        transform={(raw) => {
          const norm = (v: unknown) => (typeof v === "string" ? v.trim() : v)

          const plate = String(norm(raw["plate"]) ?? "").toUpperCase()
          if (!plate) return null

          const typeVal = toBusType(norm(raw["type"]) as string | undefined)
          const model = (norm(raw["model"]) as string | undefined) ?? undefined

          const toNumber = (v: unknown): number | undefined => {
            if (v === null || v === undefined || v === "") return undefined
            const n = Number(v)
            return Number.isFinite(n) ? n : undefined
          }

          const capacityNum = toNumber(raw["capacity"]) ?? 0
          const yearNum = toNumber(raw["year"])

          let statusStr = String(norm(raw["status"]) ?? "").toLowerCase()
          const allowed = new Set<NonNullable<UIBus["status"]>>(["active", "inactive", "maintenance"])
          if (!allowed.has(statusStr as NonNullable<UIBus["status"]>)) statusStr = "inactive"

          const toPersonId = (v: unknown): Person["id"] | undefined => {
            if (v === null || v === undefined) return undefined
            const s = String(v).trim()
            // Prefer id match; fall back to exact name in our cached list
            if (personById.has(s as Person["id"])) return s as Person["id"]
            const lower = s.toLowerCase()
            for (const p of people) {
              if ((p.name ?? "").trim().toLowerCase() === lower) return p.id
            }
            return undefined
          }

          const operatorId = toPersonId(raw["operatorId"] ?? raw["owner"])
          const assignedDriverId = toPersonId(raw["assignedDriverId"] ?? raw["driver"])
          const assignedConductorId = toPersonId(raw["assignedConductorId"] ?? raw["conductor"]) // NEW

          const bus: UIBus = {
            id: uuid(),
            plate,
            type: typeVal,   // BusType | undefined
            model,
            capacity: capacityNum,
            year: yearNum,
            status: statusStr as UIBus["status"],
            operatorId,
            assignedDriverId,
            assignedConductorId, // NEW
          }

          return bus as unknown as Record<string, unknown>
        }}
        onConfirm={async (imported) => {
          const typed = imported as unknown as UIBus[]
          // optimistic add, then try create sequentially
          const prev = rows
          setRows((r) => [...typed, ...r])
          try {
            await Promise.all(typed.map((b) => busApi.create({ ...b, id: undefined as any })))
            await reload()
            toast.success(`${typed.length} bus importé(s).`)
          } catch (e) {
            setRows(prev)
            showValidationErrors(e)
          }
        }}
      />
    </div>
  )
}
