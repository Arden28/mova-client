"use client"

import * as React from "react"
import { IconPencil, IconPower, IconTrash } from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
// import { useToast } from "@/components/ui/sonner"
import { toast } from "sonner"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, makeDrawerTriggerColumn } from "@/components/data-table"
import type { FilterConfig } from "@/components/data-table"

import AddEditBusDialog from "@/components/bus/AddEditBusDialog"
import type { Bus, Person } from "@/types"
import { buses } from "@/data/buses"
import { people } from "@/data/buses" // ajustez le chemin si nécessaire
import ImportDialog from "@/components/common/ImportDialog"

const seed = buses

export default function BusesPage() {
  // const { toast } = useToast()

  const [rows, setRows] = React.useState<Bus[]>(seed)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Bus | null>(null)

  const [openImport, setOpenImport] = React.useState(false)

  // If you want to resolve persons by name -> id from the file:
  const personNameToId = React.useMemo(() => {
    const m = new Map<string, Person["id"]>()
    for (const p of people as Person[]) m.set((p.name || "").trim().toLowerCase(), p.id)
    return m
  }, [])

  // Index personnes: id -> Person
  const personById = React.useMemo(() => {
    const map = new Map<Person["id"], Person>()
    for (const p of people as Person[]) map.set(p.id, p)
    return map
  }, [])

  const getPersonName = (id?: Person["id"]) =>
    id ? personById.get(id)?.name ?? "—" : "—"

  const searchable = {
    placeholder: "Rechercher immatriculation, modèle…",
    fields: ["plate", "model"] as (keyof Bus)[], // cast to mutable array
  };

  const filters: FilterConfig<Bus>[] = [
    {
      id: "status",
      label: "Statut",
      options: [
        { label: "Actif", value: "active" },
        { label: "Inactif", value: "inactive" },
        { label: "Maintenance", value: "maintenance" },
      ],
      accessor: (b) => b.status ?? "",
      defaultValue: "",
    },
  ]

  const columns = React.useMemo<ColumnDef<Bus>[]>(() => {
    return [
      // Colonne principale cliquable (ouvre le tiroir)
      makeDrawerTriggerColumn<Bus>("plate", {
        triggerField: "plate",
        renderTitle: (b) => b.plate,
        renderBody: (b) => (
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Capacité :</span> {b.capacity}
            </div>
            <div>
              <span className="text-muted-foreground">Propriétaire :</span>{" "}
              {getPersonName(b.operatorId)}
            </div>
            <div>
              <span className="text-muted-foreground">Chauffeur :</span>{" "}
              {getPersonName(b.assignedDriverId)}
            </div>
            <div>
              <span className="text-muted-foreground">Modèle :</span>{" "}
              {b.model ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Année :</span>{" "}
              {b.year ?? "—"}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Statut :</span>
              <Badge variant="outline" className="px-1.5 capitalize">
                {b.status ?? "—"}
              </Badge>
            </div>
          </div>
        ),
      }),

      // Capacité (alignée à droite)
      {
        accessorKey: "capacity",
        header: () => <div className="w-full text-right">Capacité</div>,
        cell: ({ row }) => (
          <div className="w-full text-right">{row.original.capacity}</div>
        ),
      },

      // Propriétaire (nom)
      {
        id: "owner",
        header: "Propriétaire",
        cell: ({ row }) => (
          <span className="block max-w-[240px] truncate">
            {getPersonName(row.original.operatorId)}
          </span>
        ),
        enableSorting: false,
      },

      // Chauffeur (nom)
      {
        id: "driver",
        header: "Chauffeur",
        cell: ({ row }) => (
          <span className="block max-w-[240px] truncate">
            {getPersonName(row.original.assignedDriverId)}
          </span>
        ),
        enableSorting: false,
      },

      // Statut
      {
        accessorKey: "status",
        header: "Statut",
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 capitalize">
            {row.original.status ?? "—"}
          </Badge>
        ),
      },
    ]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personById])

  function renderRowActions(b: Bus) {
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
          onClick={() => {
            setRows((prev) =>
              prev.map((x) =>
                x.id === b.id
                  ? { ...x, status: isActive ? "inactive" : "active" }
                  : x
              )
            )
            toast(isActive ? "Bus désactivé" : "Bus activé")
          }}
        >
          {isActive ? (
            "Désactiver"
          ) : (
            <>
              <IconPower className="mr-2 h-4 w-4" /> Activer
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-rose-600"
          onClick={() => {
            setRows((prev) => prev.filter((x) => x.id !== b.id))
            toast("Bus supprimé")
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
          <h1 className="text-xl font-semibold">Bus</h1>
          <p className="text-sm text-muted-foreground">
            Gérez le parc, la capacité, les chauffeurs et l’état du service.
          </p>
        </div>
      </div>

      <DataTable<Bus>
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        searchable={searchable}
        filters={filters}
        onAdd={() => {
          setEditing(null)
          setOpen(true)
        }}
        addLabel="Ajouter un bus"
        onImport={() => setOpenImport(true)}
        importLabel="Importer"
        renderRowActions={renderRowActions}
        drawer={{ triggerField: "plate" }}
        
        onDeleteSelected={(selected) => {
          setRows(prev => prev.filter(b => !selected.some(s => s.id === b.id)))
          // (optional) toast
          // toast.success(`${selected.length} bus supprimé(s).`)
        }}
      />

      <AddEditBusDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        people={people}
        onSubmit={(bus) => {
          setRows((prev) => {
            const i = prev.findIndex((x) => x.id === bus.id)
            if (i === -1) return [bus, ...prev]
            const next = [...prev]
            next[i] = { ...prev[i], ...bus }
            return next
          })
          setEditing(null)
          // Toast de succès déjà géré dans le dialog
        }}
      />

      <ImportDialog<Bus>
        open={openImport}
        onOpenChange={setOpenImport}
        title="Importer des bus"
        description="Chargez un CSV/Excel, mappez les colonnes, puis validez l'import."
        fields={[
          { key: "plate", label: "Immatriculation", required: true },
          { key: "model", label: "Modèle" },
          { key: "capacity", label: "Capacité" },
          { key: "year", label: "Année" },
          { key: "status", label: "Statut" },
          { key: "operatorId", label: "Propriétaire (nom ou ID)" },
          { key: "assignedDriverId", label: "Chauffeur (nom ou ID)" },
        ]}
        // optional: help auto-map (not mandatory)
        sampleHeaders={[
          "plate", "model", "capacity", "year", "status", "owner", "driver", "operatorId", "assignedDriverId"
        ]}
        transform={(raw) => {
          // Clean/normalize + infer ids by name
          const norm = (v: string | null | undefined) => (typeof v === "string" ? v.trim() : v);

          const plate = String(norm(raw.plate) ?? "").toUpperCase()
          if (!plate) return null

          const model = norm(raw.model) ?? ""
          const capacityNum = raw.capacity != null ? Number(raw.capacity) : undefined
          const yearNum = raw.year != null ? Number(raw.year) : undefined

          let status = String(norm(raw.status) ?? "").toLowerCase()
          if (!["active", "inactive", "maintenance"].includes(status)) {
            // soft-default if unknown
            status = "inactive"
          }

          // owner/driver can be provided as ID or as name—try both
          const toPersonId = (v: string | null | undefined): Person["id"] | undefined => {
            if (!v) return undefined
            const s = String(v).trim()
            // looks like an id?
            // your Person["id"] type might be string/number—adapt as needed
            if (personById.get(s as string)) return s as string | undefined
            // else try by name
            const idByName = personNameToId.get(s.toLowerCase())
            return idByName
          }

          const operatorId = toPersonId(raw.operatorId ?? raw.owner)
          const assignedDriverId = toPersonId(raw.assignedDriverId ?? raw.driver)

          // Build Bus (ensure it matches your Bus type exactly)
          const bus: Bus = {
            id: crypto.randomUUID(),              // generate new ids for imports
            plate,
            model: model || undefined,
            capacity: capacityNum ?? 0,
            year: yearNum || undefined,
            status: status as Bus["status"],
            operatorId,
            assignedDriverId,
            // add other Bus fields with defaults if you have any
          }
          return bus
        }}
        onConfirm={(imported) => {
          setRows((prev) => {
            // simple dedupe by plate (keeps existing row if same plate)
            const existingByPlate = new Map(prev.map((b) => [b.plate, b]))
            const merged: Bus[] = [...prev]
            for (const nb of imported) {
              if (existingByPlate.has(nb.plate)) {
                // update existing
                const idx = merged.findIndex((x) => x.plate === nb.plate)
                if (idx >= 0) merged[idx] = { ...merged[idx], ...nb }
              } else {
                merged.unshift(nb)
              }
            }
            return merged
          })
        }}
      />

    </div>
  )
}
