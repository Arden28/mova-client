"use client"

import * as React from "react"
import { IconPlus, IconPencil, IconTrash, IconUpload } from "@tabler/icons-react"

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
// Replace with your real staff dataset if you have one:
import { staff as seedStaffData } from "@/data/staff" // optionnel; sinon tableau vide

/* -------------------------------------------------------------------------- */
/*                              Local Staff type                               */
/* -------------------------------------------------------------------------- */

type StaffRole = "agent" | "admin"
type Staff = Omit<Person, "role" | "licenseNo"> & { role: StaffRole } // staff has avatar?: string

/* -------------------------------------------------------------------------- */
/*                          Helpers (avatar & initials)                        */
/* -------------------------------------------------------------------------- */

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? "").join("") || "?"
}

async function fileToDataURL(file: File): Promise<string> {
  // Simple guard against non-image
  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier sélectionné n'est pas une image.")
  }
  // Simple 4MB cap (optional)
  const maxBytes = 4 * 1024 * 1024
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

/* -------------------------------------------------------------------------- */
/*                       Inline Add/Edit Staff Dialog                          */
/* -------------------------------------------------------------------------- */

type AddEditStaffDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Staff | null
  onSubmit: (s: Staff) => void
}

function AddEditStaffDialog({ open, onOpenChange, editing, onSubmit }: AddEditStaffDialogProps) {
  const [form, setForm] = React.useState<Partial<Staff>>({})
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    setForm(editing ?? { role: "agent" })
  }, [editing, open])

  function set<K extends keyof Staff>(key: K, val: Staff[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await fileToDataURL(file)
      set("avatar", dataUrl as any)
      toast.success("Avatar ajouté.")
    } catch (err: any) {
      toast.error(err?.message ?? "Échec du chargement de l'avatar.")
    } finally {
      setUploading(false)
      // reset input value so selecting same file again triggers change
      e.target.value = ""
    }
  }

  function handleSubmit() {
    const id = editing?.id ?? (crypto.randomUUID() as Staff["id"])
    const payload: Staff = {
      id,
      role: (form.role as StaffRole) ?? "agent",
      name: String(form.name ?? "").trim(),
      phone: String(form.phone ?? "").trim(),
      email: form.email ? String(form.email).trim() : undefined,
      password: form.password ? String(form.password) : undefined,
      avatar: form.avatar ? String(form.avatar) : undefined,
      createdAt: editing?.createdAt ?? (undefined as any),
    }

    if (!payload.name || !payload.phone) {
      toast.error("Nom et téléphone sont obligatoires.")
      return
    }

    onSubmit(payload)
    onOpenChange(false)
    toast.success(editing ? "Membre mis à jour." : "Membre ajouté.")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Modifier le membre du staff" : "Ajouter un membre du staff"}</DialogTitle>
          <DialogDescription>Renseignez l’identité, le rôle, les coordonnées et l’avatar.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Avatar preview + uploader */}
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
                      onClick={() => set("avatar", undefined as any)}
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
                    onChange={(e) => set("avatar", e.target.value as any)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (!form.avatar) return
                      toast.success("URL d’avatar enregistrée.")
                    }}
                  >
                    Utiliser
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Nom</Label>
            <Input value={form.name ?? ""} onChange={(e) => set("name", e.target.value as any)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Téléphone</Label>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value as any)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Email (optionnel)</Label>
            <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value as any)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Rôle</Label>
            <Select value={(form.role as StaffRole) ?? "agent"} onValueChange={(v) => set("role", v as StaffRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
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

/* -------------------------------------------------------------------------- */
/*                                  Staff Page                                 */
/* -------------------------------------------------------------------------- */

const seed: Staff[] = (seedStaffData as Staff[]) ?? []

export default function StaffPage() {
  const [rows, setRows] = React.useState<Staff[]>(seed)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Staff | null>(null)
  const [openImport, setOpenImport] = React.useState(false)

  const searchable = {
    placeholder: "Rechercher nom, téléphone, email…",
    fields: ["name", "phone", "email"] as const,
  }

  const filters: FilterConfig<Staff>[] = [
    {
      id: "role",
      label: "Rôle",
      options: [
        { label: "Agent", value: "agent" },
        { label: "Admin", value: "admin" },
      ],
      accessor: (s) => s.role ?? "",
      defaultValue: "",
    },
  ]

  const columns = React.useMemo<ColumnDef<Staff>[]>(() => {
    return [
      // Name with Avatar as drawer trigger
      makeDrawerTriggerColumn<Staff>("name", {
        triggerField: "name",
        renderTrigger: (s) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-1 ring-slate-200">
              <AvatarImage src={s.avatar || ""} alt={s.name} />
              <AvatarFallback>{getInitials(s.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground truncate">{s.email ?? s.phone}</div>
            </div>
          </div>
        ),
        renderTitle: (s) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 ring-1 ring-slate-200">
              <AvatarImage src={s.avatar || ""} alt={s.name} />
              <AvatarFallback>{getInitials(s.name)}</AvatarFallback>
            </Avatar>
            <span>{s.name}</span>
          </div>
        ),
        renderBody: (s) => (
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Rôle :</span>
              <Badge variant="outline" className="px-1.5 capitalize">{s.role}</Badge>
            </div>
            <div><span className="text-muted-foreground">Téléphone :</span> {s.phone}</div>
            <div><span className="text-muted-foreground">Email :</span> {s.email ?? "—"}</div>
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

      // Email
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="block max-w-[260px] truncate">{row.original.email ?? "—"}</span>
        ),
        enableSorting: false,
      },
    ]
  }, [])

  function renderRowActions(s: Staff) {
    return (
      <>
        <DropdownMenuItem
          onClick={() => {
            setEditing(s)
            setOpen(true)
          }}
        >
          <IconPencil className="mr-2 h-4 w-4" /> Modifier
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-rose-600"
          onClick={() => {
            setRows((prev) => prev.filter((x) => x.id !== s.id))
            toast({
              variant: "destructive",
              title: "Membre supprimé",
              description: `Nom : ${s.name}`,
            })
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
          <h1 className="text-xl font-semibold">Équipe</h1>
          <p className="text-sm text-muted-foreground">
            Gestion des agents et administrateurs : accès, coordonnées, avatars.
          </p>
        </div>
      </div>

      <DataTable<Staff>
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        searchable={searchable}
        filters={filters}
        onAdd={() => {
          setEditing(null)
          setOpen(true)
        }}
        addLabel="Ajouter un membre"
        onImport={() => setOpenImport(true)}
        importLabel="Importer"
        renderRowActions={renderRowActions}
        drawer={{ triggerField: "name" }}
        onDeleteSelected={(selected) => {
          setRows((prev) => prev.filter((p) => !selected.some((s) => s.id === p.id)))
          // toast.success(`${selected.length} membre(s) supprimé(s).`)
        }}
      />

      <AddEditStaffDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSubmit={(staff) => {
          setRows((prev) => {
            const i = prev.findIndex((x) => x.id === staff.id)
            if (i === -1) return [staff, ...prev]
            const next = [...prev]
            next[i] = { ...prev[i], ...staff }
            return next
          })
          setEditing(null)
        }}
      />

      <ImportDialog<Staff>
        open={openImport}
        onOpenChange={setOpenImport}
        title="Importer le staff"
        description="Chargez un CSV/Excel, mappez les colonnes (avatar facultatif), puis validez l'import."
        fields={[
          { key: "name", label: "Nom", required: true },
          { key: "role", label: "Rôle", required: true },
          { key: "phone", label: "Téléphone", required: true },
          { key: "email", label: "Email" },
          { key: "avatar", label: "Avatar (URL ou data:…)" },
        ]}
        sampleHeaders={["name", "role", "phone", "email", "avatar"]}
        transform={(raw) => {
          const norm = (v: any) => (typeof v === "string" ? v.trim() : v)
          const name = String(norm(raw.name) ?? "")
          const phone = String(norm(raw.phone) ?? "")
          if (!name || !phone) return null

          let role = String(norm(raw.role) ?? "").toLowerCase()
          role = role === "admin" ? "admin" : "agent" // default to agent

          const email = norm(raw.email) || undefined
          const avatar = norm(raw.avatar) || undefined // can be URL or data URL

          const staff: Staff = {
            id: crypto.randomUUID() as Staff["id"],
            role: role as StaffRole,
            name,
            phone,
            email: email ? String(email) : undefined,
            avatar: avatar ? String(avatar) : undefined,
            password: undefined,
            createdAt: undefined as any,
          }
          return staff
        }}
        onConfirm={(imported) => {
          setRows((prev) => {
            // dedupe by (name, phone)
            const key = (s: Staff) => `${s.name.toLowerCase()}|${s.phone}`
            const existingKeys = new Map(prev.map((s) => [key(s), true]))
            const merged: Staff[] = [...prev]
            for (const ns of imported) {
              const k = key(ns)
              if (existingKeys.has(k)) {
                const idx = merged.findIndex((x) => key(x) === k)
                if (idx >= 0) merged[idx] = { ...merged[idx], ...ns }
              } else {
                merged.unshift(ns)
              }
            }
            return merged
          })
          toast.success(`Import réussi (${imported.length} membre${imported.length > 1 ? "s" : ""}).`)
        }}
      />
    </div>
  )
}
