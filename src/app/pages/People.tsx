"use client"

import * as React from "react"
import { IconPencil, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

import type { ColumnDef } from "@tanstack/react-table"
import { DataTable, makeDrawerTriggerColumn } from "@/components/data-table"
import type { FilterConfig } from "@/components/data-table"

import ImportDialog from "@/components/common/ImportDialog"

import type { Person } from "@/types"
// Replace this with your actual data source
import { people as seedPeople } from "@/data/buses" // ajustez le chemin si nécessaire

/* --------------------------------- Dialog UI -------------------------------- */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

/* ----------------------------- Avatar utilities ----------------------------- */

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

async function fileToDataURL(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier sélectionné n'est pas une image.")
  }
  const maxBytes = 4 * 1024 * 1024 // 4MB
  if (file.size > maxBytes) {
    throw new Error("Image trop volumineuse (4 Mo max).")
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Impossible de lire l'image."))
    reader.readAsDataURL(file)
  })
}

/* -------------------------- Add / Edit Person dialog ------------------------ */

type AddEditPersonDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Person | null
  onSubmit: (p: Person) => void
}

type Role = "driver" | "owner" | "admin";

function AddEditPersonDialog({ open, onOpenChange, editing, onSubmit }: AddEditPersonDialogProps) {
  const [form, setForm] = React.useState<Partial<Person>>({})
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    setForm(editing ?? { role: "driver" as Person["role"] })
  }, [editing, open])

  function set<K extends keyof Person>(key: K, val: Person[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await fileToDataURL(file)
      set("avatar", dataUrl as string | undefined)
      toast.success("Avatar ajouté.")
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message)
      } else {
        toast.error("Échec du chargement de l'avatar.")
      }
    } finally {
      setUploading(false)
      e.target.value = "" // allow re-selecting same file
    }
  }

  function handleSubmit() {
    const id = editing?.id ?? (crypto.randomUUID() as Person["id"])
    const payload: Person = {
      id,
      role: (form.role as Person["role"]) ?? "driver",
      name: String(form.name ?? "").trim(),
      phone: String(form.phone ?? "").trim(),
      email: form.email ? String(form.email).trim() : undefined,
      password: form.password ? String(form.password) : undefined,
      licenseNo: form.licenseNo ? String(form.licenseNo).trim() : undefined,
      avatar: form.avatar ? String(form.avatar) : undefined,
      createdAt: editing?.createdAt ?? (undefined as string | undefined),
    }

    if (!payload.name || !payload.phone) {
      toast.error("Nom et téléphone sont obligatoires.")
      return
    }
    if (!payload.role) {
      toast.error("Rôle requis.")
      return
    }

    onSubmit(payload)
    onOpenChange(false)
    toast.success(editing ? "Profil mis à jour." : "Personne ajoutée.")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier la personne" : "Ajouter une personne"}</DialogTitle>
          <DialogDescription>
            Renseignez les informations d’identité, de contact, le rôle et l’avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Avatar row */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 ring-1 ring-slate-200">
              <AvatarImage src={form.avatar || ""} alt={String(form.name ?? "")} />
              <AvatarFallback>{getInitials(String(form.name ?? ""))}</AvatarFallback>
            </Avatar>
            <div className="grid gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="avatar">Avatar (PNG/JPG, &lt; 4 Mo)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="avatar"
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                    disabled={uploading}
                    className="max-w-xs"
                  />
                  {form.avatar && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => set("avatar", undefined as string | undefined)}
                    >
                      Retirer
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="avatarUrl">Ou coller une URL d’image</Label>
                <div className="flex gap-2">
                  <Input
                    id="avatarUrl"
                    placeholder="https://…"
                    value={form.avatar ?? ""}
                    onChange={(e) => set("avatar", e.target.value as string | undefined)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => form.avatar && toast.success("URL d’avatar enregistrée.")}
                  >
                    Utiliser
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Nom</Label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value as string)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Téléphone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value as string)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Email (optionnel)</Label>
            <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value as string)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Rôle</Label>
            <Select value={(form.role as string) ?? "driver"} onValueChange={(v) => set("role", v as Role)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">Chauffeur</SelectItem>
                <SelectItem value="owner">Propriétaire</SelectItem>
                <SelectItem value="conductor">Receveur</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>N° de permis (chauffeurs)</Label>
            <Input
              value={form.licenseNo ?? ""}
              onChange={(e) => set("licenseNo", e.target.value as string)}
              placeholder="Ex: DL-123456"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit}>{editing ? "Enregistrer" : "Ajouter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ------------------------------- People page -------------------------------- */

const seed = (seedPeople as Person[]) ?? []

export default function PeoplePage() {
  const [rows, setRows] = React.useState<Person[]>(seed)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Person | null>(null)
  const [openImport, setOpenImport] = React.useState(false)

  const searchable = {
    placeholder: "Rechercher nom, téléphone, email…",
    fields: ["name", "phone", "email", "licenseNo"] as  (keyof Person)[],
  }

  const filters: FilterConfig<Person>[] = [
    {
      id: "role",
      label: "Rôle",
      options: [
        { label: "Chauffeur", value: "driver" },
        { label: "Propriétaire", value: "owner" },
        { label: "Receveur", value: "conductor" },
        { label: "Admin", value: "admin" },
      ],
      accessor: (p) => p.role ?? "",
      defaultValue: "",
    },
  ]

  const columns = React.useMemo<ColumnDef<Person>[]>(() => {
    return [
      // Drawer trigger = Avatar + name
      makeDrawerTriggerColumn<Person>("name", {
        triggerField: "name",
        renderTrigger: (p) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-1 ring-slate-200">
              <AvatarImage src={p.avatar || ""} alt={p.name} />
              <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {p.email ?? p.phone}
              </div>
            </div>
          </div>
        ),
        renderTitle: (p) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 ring-1 ring-slate-200">
              <AvatarImage src={p.avatar || ""} alt={p.name} />
              <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
            </Avatar>
            <span>{p.name}</span>
          </div>
        ),
        renderBody: (p) => (
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rôle :</span>
              <Badge variant="outline" className="px-1.5 capitalize">{p.role}</Badge>
            </div>
            <div><span className="text-muted-foreground">Téléphone :</span> {p.phone}</div>
            <div><span className="text-muted-foreground">Email :</span> {p.email ?? "—"}</div>
            <div><span className="text-muted-foreground">Permis :</span> {p.licenseNo ?? "—"}</div>
          </div>
        ),
      }),

      // Rôle
      {
        accessorKey: "role",
        header: "Rôle",
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 capitalize">
            {row.original.role}
          </Badge>
        ),
      },

      // Téléphone (aligné à droite)
      {
        accessorKey: "phone",
        header: () => <div className="w-full text-right">Téléphone</div>,
        cell: ({ row }) => <div className="w-full text-right">{row.original.phone}</div>,
      },

      // Email (troncature)
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="block max-w-[260px] truncate">{row.original.email ?? "—"}</span>
        ),
        enableSorting: false,
      },

      // Permis
      {
        accessorKey: "licenseNo",
        header: "Permis",
        cell: ({ row }) => (
          <span className="block max-w-[200px] truncate">{row.original.licenseNo ?? "—"}</span>
        ),
        enableSorting: false,
      },
    ]
  }, [])

  function renderRowActions(p: Person) {
    return (
      <>
        <DropdownMenuItem
          onClick={() => {
            setEditing(p)
            setOpen(true)
          }}
        >
          <IconPencil className="mr-2 h-4 w-4" /> Modifier
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-rose-600"
          onClick={() => {
            setRows((prev) => prev.filter((x) => x.id !== p.id))
            toast("Personne supprimée")
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
          <h1 className="text-xl font-semibold">Chauffeurs & Propriétaires</h1>
          <p className="text-sm text-muted-foreground">
            Onboarding des chauffeurs, gestion des permis et contrats des propriétaires.
          </p>
        </div>
      </div>

      <DataTable<Person>
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        searchable={searchable}
        filters={filters}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Ajouter une personne"
        onImport={() => setOpenImport(true)}
        importLabel="Importer"
        renderRowActions={renderRowActions}
        drawer={{ triggerField: "name" }}
        onDeleteSelected={(selected) => {
          setRows((prev) => prev.filter((p) => !selected.some((s) => s.id === p.id)))
          // toast.success(`${selected.length} personne(s) supprimée(s).`)
        }}
      />

      <AddEditPersonDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSubmit={(person) => {
          setRows((prev) => {
            const i = prev.findIndex((x) => x.id === person.id)
            if (i === -1) return [person, ...prev]
            const next = [...prev]
            next[i] = { ...prev[i], ...person }
            return next
          })
          setEditing(null)
        }}
      />

      <ImportDialog<Person>
        open={openImport}
        onOpenChange={setOpenImport}
        title="Importer des personnes"
        description="Chargez un CSV/Excel, mappez les colonnes (avatar facultatif), puis validez l'import."
        fields={[
          { key: "name", label: "Nom", required: true },
          { key: "role", label: "Rôle", required: true },
          { key: "phone", label: "Téléphone", required: true },
          { key: "email", label: "Email" },
          { key: "licenseNo", label: "N° de permis (chauffeurs)" },
          { key: "avatar", label: "Avatar (URL ou data:…)" },
        ]}
        sampleHeaders={["name", "role", "phone", "email", "licenseNo", "avatar"]}
        transform={(raw) => {
          const norm = (v: string | null | undefined) => (typeof v === "string" ? v.trim() : v)

          const name = String(norm(raw.name) ?? "")
          const phone = String(norm(raw.phone) ?? "")
          if (!name || !phone) return null

          let role = String(norm(raw.role) ?? "").toLowerCase()
          const allowed = new Set(["driver", "owner", "conductor", "admin"])
          if (!allowed.has(role)) role = "driver"

          const email = norm(raw.email) || undefined
          const licenseNo = norm(raw.licenseNo) || undefined
          const avatar = norm(raw.avatar) || undefined // URL or data URL

          const person: Person = {
            id: crypto.randomUUID() as Person["id"],
            role: role as Person["role"],
            name,
            phone,
            email: email ? String(email) : undefined,
            licenseNo: licenseNo ? String(licenseNo) : undefined,
            avatar: avatar ? String(avatar) : undefined,
          }
          return person
        }}
        onConfirm={(imported) => {
          setRows((prev) => {
            // simple dedupe by (name, phone)
            const key = (p: Person) => `${p.name.toLowerCase()}|${p.phone}`
            const existingKeys = new Map(prev.map((p) => [key(p), true]))
            const merged: Person[] = [...prev]
            for (const np of imported) {
              const k = key(np)
              if (existingKeys.has(k)) {
                const idx = merged.findIndex((x) => key(x) === k)
                if (idx >= 0) merged[idx] = { ...merged[idx], ...np }
              } else {
                merged.unshift(np)
              }
            }
            return merged
          })
          toast.success(`Import réussi (${imported.length} personne${imported.length > 1 ? "s" : ""}).`)
        }}
      />
    </div>
  )
}
