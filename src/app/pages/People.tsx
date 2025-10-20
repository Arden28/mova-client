// src/pages/People.tsx
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
import { DataTable, makeDrawerTriggerColumn } from "@/components/data-table"
import type { FilterConfig } from "@/components/data-table"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import peopleApi, { type Person, type PersonRole } from "@/api/people"
import { ApiError } from "@/api/apiService"

/* ----------------------------- Avatar utilities ----------------------------- */

function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?"
}

async function fileToDataURL(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Le fichier sélectionné n'est pas une image.")
  const maxBytes = 4 * 1024 * 1024 // 4MB
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

/* -------------------------- Add / Edit Person dialog ------------------------ */

type AddEditPersonDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  editing: Person | null
  onSubmit: (p: Person & { password?: string }) => void
}

function AddEditPersonDialog({ open, onOpenChange, editing, onSubmit }: AddEditPersonDialogProps) {
  const [form, setForm] = React.useState<Partial<Person & { password?: string }>>({})
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    setForm(editing ?? { role: "driver" })
  }, [editing, open])

  function set<K extends keyof (Person & { password?: string })>(key: K, val: (Person & { password?: string })[K]) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await fileToDataURL(file)
      set("avatar", dataUrl as any) // preview; will be skipped on submit if it's a data: URL
      toast.success("Avatar ajouté (prévisualisation).")
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Échec du chargement de l'avatar.")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  function handleSubmit() {
    const payload: Person & { password?: string } = {
      id: editing?.id ?? crypto.randomUUID(),
      role: (form.role as PersonRole) ?? "driver",
      name: String(form.name ?? "").trim(),
      // phone is OPTIONAL on backend
      phone: form.phone ? String(form.phone).trim() : undefined,
      email: form.email ? String(form.email).trim() : undefined,
      licenseNo: form.licenseNo ? String(form.licenseNo).trim() : undefined,
      avatar: form.avatar ? String(form.avatar) : undefined,
      createdAt: editing?.createdAt ?? undefined,
      status: editing?.status ?? undefined,
      password: form.password ? String(form.password) : undefined,
    }

    if (!payload.name) {
      toast.error("Le nom est obligatoire.")
      return
    }
    // If avatar is a data URL, Laravel `url` rule will reject it — skip sending it.
    if (payload.avatar && payload.avatar.startsWith("data:")) {
      toast.error("L’avatar doit être une URL publique (http/https). Le data: URL est seulement pour la prévisualisation.")
      delete (payload as any).avatar
    }

    onSubmit(payload)
    onOpenChange(false)
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
                  <Input id="avatarUrl" placeholder="https://…" value={form.avatar ?? ""} onChange={(e) => set("avatar", e.target.value as any)} />
                  <Button type="button" variant="secondary" size="sm" onClick={() => form.avatar && toast.success("URL d’avatar enregistrée.")}>
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
            <Select value={(form.role as PersonRole) ?? "driver"} onValueChange={(v) => set("role", v as PersonRole)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">Chauffeur</SelectItem>
                <SelectItem value="owner">Propriétaire</SelectItem>
                <SelectItem value="conductor">Receveur</SelectItem>
                {/* Admin not allowed by backend */}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>N° de permis (chauffeurs)</Label>
            <Input value={form.licenseNo ?? ""} onChange={(e) => set("licenseNo", e.target.value as any)} placeholder="Ex: DL-123456" />
          </div>

          {/* Password only on create (optionnel) */}
          {!editing && (
            <div className="grid gap-1.5">
              <Label>Mot de passe (optionnel)</Label>
              <Input type="password" value={(form as any).password ?? ""} onChange={(e) => set("password", e.target.value as any)} />
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

/* ------------------------------- People page -------------------------------- */

export default function PeoplePage() {
  const [rows, setRows] = React.useState<Person[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Person | null>(null)
  const [openImport, setOpenImport] = React.useState(false)

  const reload = React.useCallback(async () => {
    try {
      setLoading(true)
      const res = await peopleApi.list({ per_page: 100 })
      setRows(res.data.rows)
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
    return () => { alive = false }
  }, [reload])

  const searchable = {
    placeholder: "Rechercher nom, téléphone, email…",
    fields: ["name", "phone", "email", "licenseNo"] as (keyof Person)[],
  }

  const filters: FilterConfig<Person>[] = [
    {
      id: "role",
      label: "Rôle",
      options: [
        { label: "Chauffeur", value: "driver" },
        { label: "Propriétaire", value: "owner" },
        { label: "Receveur", value: "conductor" },
      ],
      accessor: (p) => p.role ?? "",
      defaultValue: "",
    },
  ]

  const columns = React.useMemo<ColumnDef<Person>[]>(() => {
    return [
      makeDrawerTriggerColumn<Person>("name", {
        triggerField: "name",
        renderTrigger: (p) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 ring-1 ring-slate-200">
              <AvatarImage src={p.avatar || undefined} alt={p.name} />
              <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{p.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {p.email ?? p.phone ?? "—"}
              </div>
            </div>
          </div>
        ),
        renderTitle: (p) => (
          <div className="flex items-center gap-3">
            <Avatar className="h-11 w-11 ring-1 ring-slate-200">
              <AvatarImage src={p.avatar || undefined} alt={p.name} />
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
            <div><span className="text-muted-foreground">Téléphone :</span> {p.phone ?? "—"}</div>
            <div><span className="text-muted-foreground">Email :</span> {p.email ?? "—"}</div>
            <div><span className="text-muted-foreground">Permis :</span> {p.licenseNo ?? "—"}</div>
          </div>
        ),
      }),
      {
        accessorKey: "role",
        header: "Rôle",
        cell: ({ row }) => (
          <Badge variant="outline" className="px-1.5 capitalize">
            {row.original.role}
          </Badge>
        ),
      },
      {
        accessorKey: "phone",
        header: () => <div className="w-full text-right">Téléphone</div>,
        cell: ({ row }) => <div className="w-full text-right">{row.original.phone ?? "—"}</div>,
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="block max-w-[260px] truncate">{row.original.email ?? "—"}</span>
        ),
        enableSorting: false,
      },
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

  /* ------------------------- Row action handlers ------------------------- */

  const isServerId = (id: string) => /^\d+$/.test(id)

  function renderRowActions(p: Person) {
    return (
      <>
        <DropdownMenuItem onClick={() => { setEditing(p); setOpen(true) }}>
          <IconPencil className="mr-2 h-4 w-4" /> Modifier
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-rose-600"
          onClick={async () => {
            const prev = rows
            setRows((r) => r.filter((x) => x.id !== p.id))
            try {
              if (isServerId(p.id)) {
                await peopleApi.remove(p.id)
                toast("Personne supprimée.")
              } else {
                toast("Élément local supprimé.")
              }
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
        loading={loading}
        onAdd={() => { setEditing(null); setOpen(true) }}
        addLabel="Ajouter une personne"
        onImport={() => setOpenImport(true)}
        importLabel="Importer"
        renderRowActions={renderRowActions}
        drawer={{ triggerField: "name" }}
        onDeleteSelected={async (selected) => {
          if (selected.length === 0) return
          const prev = rows
          setRows((r) => r.filter((p) => !selected.some((s) => s.id === p.id)))
          try {
            await Promise.all(
              selected
                .filter(s => isServerId(s.id))
                .map(s => peopleApi.remove(s.id))
            )
            toast(`${selected.length} personne(s) supprimée(s).`)
          } catch (e) {
            setRows(prev)
            showValidationErrors(e)
          }
        }}
      />

      <AddEditPersonDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSubmit={async (person) => {
          if (editing) {
            const prev = rows
            setRows((r) => r.map(x => x.id === person.id ? { ...x, ...person } : x))
            try {
              await peopleApi.update(person.id, person)
              await reload() // ensure canonical server data (ids, avatar_url, etc.)
              toast("Profil mis à jour.")
            } catch (e) {
              setRows(prev)
              showValidationErrors(e)
            } finally {
              setEditing(null)
            }
          } else {
            const tempId = person.id
            setRows((r) => [person, ...r])
            try {
              await peopleApi.create(person)
              await reload() // replace temp with server row
              toast("Personne ajoutée.")
            } catch (e) {
              setRows((r) => r.filter(x => x.id !== tempId))
              showValidationErrors(e)
            }
          }
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
          { key: "phone", label: "Téléphone" }, // optional
          { key: "email", label: "Email" },
          { key: "licenseNo", label: "N° de permis (chauffeurs)" },
          { key: "avatar", label: "Avatar (URL ou data:…)" },
        ]}
        sampleHeaders={["name", "role", "phone", "email", "license_no", "avatar"]}
        transform={(raw) => {
          const norm = (v: string | null | undefined) => (typeof v === "string" ? v.trim() : v)

          const name = String(norm(raw.name) ?? "")
          if (!name) return null

          let role = String(norm(raw.role) ?? "").toLowerCase()
          const allowed = new Set<PersonRole>(["driver", "owner", "conductor"])
          if (!allowed.has(role as PersonRole)) role = "driver"

          // Use nullish coalescing consistently to avoid mixing with ||.
          const phone = (norm(raw.phone) ?? undefined) as string | undefined
          const email = (norm(raw.email) ?? undefined) as string | undefined
          const licenseNo = ((norm((raw as any).license_no) ?? norm((raw as any).licenseNo)) ?? undefined) as string | undefined
          const avatar = (norm(raw.avatar) ?? undefined) as string | undefined

          const person: Person = {
            id: crypto.randomUUID(),
            role: role as PersonRole,
            name,
            phone,
            email,
            licenseNo,
            avatar,
            createdAt: undefined,
            status: "active",
          }
          return person
        }}
        onConfirm={async (imported) => {
          const prev = rows
          setRows((r) => [...imported, ...r])
          try {
            await Promise.all(imported.map(p => peopleApi.create(p)))
            await reload()
            toast(`Import réussi (${imported.length} personne${imported.length > 1 ? "s" : ""}).`)
          } catch (e) {
            setRows(prev)
            showValidationErrors(e)
          }
        }}
      />
    </div>
  )
}
