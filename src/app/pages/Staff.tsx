// src/pages/Staff.tsx
"use client"

import * as React from "react"
import { IconPencil, IconTrash } from "@tabler/icons-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import type { ColumnDef } from "@tanstack/react-table"

import { DataTable } from "@/components/data-table"
import { makeDrawerTriggerColumn } from "@/components/data-table-helpers"
import type { FilterConfig, GroupByConfig } from "@/components/data-table"

import ImportDialog from "@/components/common/ImportDialog"
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

import staffApi, { type Staff, type StaffRole } from "@/api/staff"
import { ApiError } from "@/api/apiService"

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase() ?? "").join("") || "?"
}

async function fileToDataURL(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Le fichier sélectionné n'est pas une image.")
  const maxBytes = 4 * 1024 * 1024
  if (file.size > maxBytes) throw new Error("Image trop volumineuse (4 Mo max).")
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error("Impossible de lire l'image."))
    reader.readAsDataURL(file)
  })
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

/* ------------------------- Add/Edit Dialog ------------------------- */

type AddEditStaffDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Staff | null
  onSubmit: (s: Staff & { password?: string }) => void
}

function AddEditStaffDialog({ open, onOpenChange, editing, onSubmit }: AddEditStaffDialogProps) {
  const [form, setForm] = React.useState<Partial<Staff & { password?: string }>>({})
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    setForm(editing ?? { role: "agent" })
  }, [editing, open])

  function set<K extends keyof (Staff & { password?: string })>(key: K, val: (Staff & { password?: string })[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await fileToDataURL(file)
      set("avatar", dataUrl as any) // NOTE: data: URL won't pass Laravel's `url` rule; see submit guard below.
      toast("Avatar ajouté (prévisualisation).")
    } catch (err: any) {
      toast(err?.message ?? "Échec du chargement de l'avatar.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  function handleSubmit() {
    const payload: Staff & { password?: string } = {
      id: editing?.id ?? crypto.randomUUID(),
      role: (form.role as StaffRole) ?? "agent",
      name: String(form.name ?? "").trim(),
      // phone is OPTIONAL (backend allows nullable)
      phone: form.phone ? String(form.phone).trim() : undefined,
      email: form.email ? String(form.email).trim() : undefined,
      avatar: form.avatar ? String(form.avatar) : undefined,             // maps to avatar_url on API layer
      licenseNo: form.licenseNo ? String(form.licenseNo) : undefined,    // maps to license_no on API layer
      createdAt: editing?.createdAt ?? undefined,
      status: editing?.status ?? undefined,
      password: form.password ? String(form.password) : undefined,       // only used on create
    }

    if (!payload.name) {
      toast("Le nom est obligatoire.")
      return
    }

    // Guard: if avatar is a data URL, it will fail Laravel's `url` validator.
    if (payload.avatar && payload.avatar.startsWith("data:")) {
      toast.error("L’avatar doit être une URL publique (http/https). Le data: URL est seulement pour la prévisualisation.")
      // Do not send avatar field in this case
      delete (payload as any).avatar
    }

    onSubmit(payload)
    onOpenChange(false)
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
              <AvatarImage src={form.avatar || undefined} alt={String(form.name ?? "")} />
              <AvatarFallback>{getInitials(String(form.name ?? ""))}</AvatarFallback>
            </Avatar>
            <div className="grid gap-2">
              <div className="grid gap-1.5">
                <Label htmlFor="avatar">Avatar (PNG/JPG, &lt; 4 Mo)</Label>
                <div className="flex items-center gap-2">
                  <Input id="avatar" type="file" accept="image/*" onChange={handleAvatarFile} disabled={uploading} className="max-w-xs" />
                  {form.avatar && (
                    <Button variant="outline" size="sm" onClick={() => set("avatar", undefined as any)}>
                      Retirer
                    </Button>
                  )}
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="avatarUrl">Ou coller une URL d’image</Label>
                <div className="flex gap-2">
                  <Input id="avatarUrl" placeholder="https://…" value={form.avatar ?? undefined} onChange={(e) => set("avatar", e.target.value as any)} />
                  <Button type="button" variant="secondary" size="sm" onClick={() => form.avatar && toast("URL d’avatar enregistrée.")}>
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
            <Label>Téléphone (optionnel)</Label>
            <Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value as any)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Email (optionnel)</Label>
            <Input value={form.email ?? ""} onChange={(e) => set("email", e.target.value as any)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Rôle</Label>
            <Select value={(form.role as StaffRole) ?? "agent"} onValueChange={(v) => set("role", v as any)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agent">Agent</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* License number (optionnel) */}
          <div className="grid gap-1.5">
            <Label>Numéro de licence (optionnel)</Label>
            <Input value={form.licenseNo ?? ""} onChange={(e) => set("licenseNo", e.target.value as any)} />
          </div>

          {/* Password only on create (optionnel) */}
          {!editing && (
            <div className="grid gap-1.5">
              <Label>Mot de passe (optionnel)</Label>
              <Input type="password" value={form.password ?? ""} onChange={(e) => set("password", e.target.value as any)} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit}>{editing ? "Enregistrer" : "Ajouter"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* --------------------------------- Page ----------------------------------- */

export default function StaffPage() {
  const [rows, setRows] = React.useState<Staff[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Staff | null>(null)
  const [openImport, setOpenImport] = React.useState(false)

  const reload = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await staffApi.list({ per_page: 100 })
      setRows(res.data.rows)
    } catch (e) {
      showValidationErrors(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // initial fetch
  React.useEffect(() => {
    let alive = true
    ;(async () => {
      await reload()
      if (!alive) return
    })()
    return () => { alive = false }
  }, [reload])

  const searchable = {
    placeholder: "Rechercher nom, téléphone, email…",
    fields: ["name", "phone", "email"] as (keyof Staff)[],
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

  const columns = React.useMemo<ColumnDef<Staff>[]>(() => [
    makeDrawerTriggerColumn<Staff>("name", {
      triggerField: "name",
      renderTrigger: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-1 ring-slate-200">
            <AvatarImage src={s.avatar || undefined} alt={s.name} />
            <AvatarFallback>{getInitials(s.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="truncate font-medium">{s.name}</div>
            <div className="text-xs text-muted-foreground truncate">{s.email ?? s.phone ?? "—"}</div>
          </div>
        </div>
      ),
      renderTitle: (s) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 ring-1 ring-slate-200">
            <AvatarImage src={s.avatar || undefined} alt={s.name} />
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
          <div><span className="text-muted-foreground">Téléphone :</span> {s.phone ?? "—"}</div>
          <div><span className="text-muted-foreground">Email :</span> {s.email ?? "—"}</div>
        </div>
      ),
    }),
    {
      accessorKey: "role",
      header: "Rôle",
      cell: ({ row }) => <Badge variant="outline" className="px-1.5 capitalize">{row.original.role}</Badge>,
    },
    {
      accessorKey: "phone",
      header: () => <div className="w-full text-right">Téléphone</div>,
      cell: ({ row }) => <div className="w-full text-right">{row.original.phone ?? "—"}</div>,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => <span className="block max-w-[260px] truncate">{row.original.email ?? "—"}</span>,
      enableSorting: false,
    },
  ], [])

  /* --------------------------- Row action handlers -------------------------- */

  function renderRowActions(s: Staff) {
    return (
      <>
        <DropdownMenuItem onClick={() => { setEditing(s); setOpen(true) }}>
          <IconPencil className="mr-2 h-4 w-4" /> Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-rose-600"
          onClick={async () => {
            // optimistic delete (works as you reported)
            const prev = rows
            setRows((r) => r.filter(x => x.id !== s.id))
            try {
              await staffApi.remove(s.id)
              toast("Membre supprimé.")
            } catch (e: any) {
              setRows(prev) // rollback
              showValidationErrors(e)
            }
          }}
        >
          <IconTrash className="mr-2 h-4 w-4" /> Supprimer
        </DropdownMenuItem>
      </>
    )
  }
  
  
  const groupBy: GroupByConfig<Staff>[] = [
    {
      id: "role",
      label: "Role",
      accessor: (r: Staff) => r.role ?? "—",
    },
  ]
  
    
  // getRowId (typed id param if you use it elsewhere)
  const getRowId = (r: Staff) => String(r.id)

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
        getRowId={getRowId}
        searchable={{ placeholder: "Rechercher nom, téléphone, email…", fields: ["name", "phone", "email"] }}
        filters={filters}
        loading={loading}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Ajouter un membre"
        onImport={() => setOpenImport(true)}
        importLabel="Importer"
        renderRowActions={renderRowActions}
        // drawer={{ triggerField: "name" }}
        groupBy={groupBy}
        initialView="list"
        pageSizeOptions={[10, 20, 50]}
        onDeleteSelected={async (selected) => {
          if (selected.length === 0) return
          const prev = rows
          setRows((r) => r.filter((p) => !selected.some((s) => s.id === p.id)))
          try {
            await Promise.all(selected.map(s => staffApi.remove(s.id)))
            toast(`${selected.length} membre(s) supprimé(s).`)
          } catch (e: any) {
            setRows(prev)
            showValidationErrors(e)
          }
        }}
      />

      <AddEditStaffDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSubmit={async (staff) => {
          if (editing) {
            // optimistic update
            const prev = rows
            setRows((r) => r.map(x => x.id === staff.id ? { ...x, ...staff } : x))
            try {
              await staffApi.update(staff.id, staff)
              // ✅ Refresh from server to ensure we show canonical fields (avatar_url etc.)
              await reload()
              toast("Membre mis à jour.")
            } catch (e: any) {
              setRows(prev)
              showValidationErrors(e)
            } finally {
              setEditing(null)
            }
          } else {
            // optimistic add (temp id until API returns real one)
            const tempId = staff.id
            const tempRow = { ...staff }
            setRows((r) => [tempRow, ...r])
            try {
              await staffApi.create(staff)
              // ✅ Refresh list to replace temp row with server row
              await reload()
              toast("Membre ajouté.")
            } catch (e: any) {
              setRows((r) => r.filter(x => x.id !== tempId))
              showValidationErrors(e)
            }
          }
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
          { key: "phone", label: "Téléphone" },                // optional now
          { key: "email", label: "Email" },
          { key: "licenseNo", label: "Numéro de licence" },    // optional
          { key: "avatar", label: "Avatar (URL ou data:…)" },
        ]}
        sampleHeaders={["name", "role", "phone", "email", "license_no", "avatar"]}
        transform={(raw) => {
          const norm = (v: string | undefined) => (typeof v === "string" ? v.trim() : v)
          const name = String(norm(raw.name) ?? "")
          if (!name) return null

          let role = String(norm(raw.role) ?? "").toLowerCase()
          role = role === "admin" ? "admin" : "agent"

          const phone = norm(raw.phone) || undefined
          const email = norm(raw.email) || undefined
          const licenseNo = (norm((raw as any).license_no) ?? norm((raw as any).licenseNo)) || undefined
          const avatar = norm(raw.avatar) || undefined

          const staff: Staff = {
            id: crypto.randomUUID(),
            role: role as StaffRole,
            name,
            phone,
            email: email ? String(email) : undefined,
            licenseNo: licenseNo ? String(licenseNo) : undefined,
            avatar: avatar ? String(avatar) : undefined,
            createdAt: undefined,
            status: "active",
          }
          return staff
        }}
        onConfirm={async (imported) => {
          // Optimistic batch create — sequential API calls
          const prev = rows
          setRows((r) => [...imported, ...r])
          try {
            await Promise.all(imported.map(s => staffApi.create(s)))
            await reload() // ✅ show canonical server rows (ids, avatar urls, etc.)
            toast(`Import réussi (${imported.length} membre${imported.length > 1 ? "s" : ""}).`)
          } catch (e: any) {
            setRows(prev)
            showValidationErrors(e)
          }
        }}
      />
    </div>
  )
}
