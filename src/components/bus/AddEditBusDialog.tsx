// src/components/bus/AddEditBusDialog.tsx
"use client"

import * as React from "react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { toast } from "sonner"

import type { UIBus } from "@/api/bus"
import type { Person } from "@/api/people"
import type { BusStatus, BusType } from "@/api/bus"
import { cn } from "@/lib/utils"

/** Options prédéfinies */
const MODEL_OPTIONS = [
  "Toyota Coaster",
  "Isuzu NQR",
  "Isuzu NPR",
  "Scania Touring",
  "Yutong ZK",
] as const

// Must match backend values
const TYPE_OPTIONS: BusType[] = ["hiace", "coaster"]
const PROVIDERS = ["AXA", "Jubilee", "Britam", "CIC", "APA"] as const

type Id = Person["id"]

export type AddEditBusDialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSubmit: (bus: Partial<UIBus> & { id?: string }) => void
  editing?: UIBus | null
  people?: Person[]
}

export default function AddEditBusDialog({
  open,
  onOpenChange,
  onSubmit,
  editing,
  people = [],
}: AddEditBusDialogProps) {
  // ------- État (Bus) -------
  const [plate, setPlate] = React.useState("")
  const [capacity, setCapacity] = React.useState<number>(49)
  const [status, setStatus] = React.useState<BusStatus>("active")
  const [type, setType] = React.useState<BusType>("hiace")
  const [model, setModel] = React.useState<string>(MODEL_OPTIONS[0])
  const [year, setYear] = React.useState<number | "">("")
  const [mileageKm, setMileageKm] = React.useState<number | "">("")
  const [operatorId, setOperatorId] = React.useState<Id | "">("")
  const [assignedDriverId, setAssignedDriverId] = React.useState<Id | "">("")
  const [lastServiceDate, setLastServiceDate] = React.useState<string>("")

  // Assurance (optionnelle)
  const [hasInsurance, setHasInsurance] = React.useState(false)
  const [insProvider, setInsProvider] = React.useState<string>("")
  const [insPolicy, setInsPolicy] = React.useState<string>("")
  const [insValidUntil, setInsValidUntil] = React.useState<string>("")

  // Listes
  const owners = React.useMemo(() => people.filter((p) => p.role === "owner"), [people])
  const drivers = React.useMemo(() => people.filter((p) => p.role === "driver"), [people])

  // Hydratation en édition
  React.useEffect(() => {
    if (editing) {
      setPlate(editing.plate ?? "")
      setCapacity(editing.capacity ?? 49)
      setStatus((editing.status as BusStatus) ?? "active")
      setType((editing.type as BusType) ?? "hiace")
      setModel(editing.model ?? MODEL_OPTIONS[0])
      setYear(editing.year ?? "")
      setMileageKm(editing.mileageKm ?? "")
      setOperatorId((editing.operatorId as Id | undefined) ?? "")
      setAssignedDriverId((editing.assignedDriverId as Id | undefined) ?? "")
      setLastServiceDate(editing.lastServiceDate ?? "")

      const hasAnyInsurance = Boolean(
        editing.insuranceProvider || editing.insurancePolicyNumber || editing.insuranceValidUntil
      )
      setHasInsurance(hasAnyInsurance)
      setInsProvider(editing.insuranceProvider ?? "")
      setInsPolicy(editing.insurancePolicyNumber ?? "")
      setInsValidUntil(editing.insuranceValidUntil ?? "")
    } else {
      setPlate("")
      setCapacity(49)
      setStatus("active")
      setType("hiace")
      setModel(MODEL_OPTIONS[0])
      setYear("")
      setMileageKm("")
      setOperatorId("")
      setAssignedDriverId("")
      setLastServiceDate("")
      setHasInsurance(false)
      setInsProvider("")
      setInsPolicy("")
      setInsValidUntil("")
    }
  }, [editing])

  function isIsoDate(v: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(v)
  }
  function asNumberOrUndefined(v: unknown) {
    if (v === "" || v === undefined || v === null) return undefined
    const n = Number(v)
    return Number.isFinite(n) ? n : undefined
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()

    // Client-side guard: insurance_valid_until >= last_service_date (if both present)
    if (insValidUntil && lastServiceDate) {
      const a = new Date(insValidUntil)
      const b = new Date(lastServiceDate)
      if (a < b) {
        toast.error("La date de validité d’assurance doit être postérieure ou égale à la dernière révision.")
        return
      }
    }

    const payload: Partial<UIBus> & { id?: string } = {
      ...(editing?.id ? { id: editing.id } : {}),
      plate: plate.trim(),
      capacity: Number(capacity),
      status,
      type,
      model: model.trim() || undefined,
      year: year === "" ? undefined : Number(year),
      mileageKm: mileageKm === "" ? undefined : Number(mileageKm),
      // IDs must be numbers for the backend exists() rule; we convert here so the api layer can pass numbers through
      operatorId: asNumberOrUndefined(operatorId),
      assignedDriverId: asNumberOrUndefined(assignedDriverId),
      // Dates must be ISO or omitted
      lastServiceDate: lastServiceDate && isIsoDate(lastServiceDate) ? lastServiceDate : undefined,
      // Insurance (flat fields in API)
      ...(hasInsurance &&
      (insProvider.trim() || insPolicy.trim() || insValidUntil.trim())
        ? {
            insuranceProvider: insProvider.trim() || undefined,
            insurancePolicyNumber: insPolicy.trim() || undefined,
            insuranceValidUntil: insValidUntil && isIsoDate(insValidUntil) ? insValidUntil : undefined,
          }
        : {
            insuranceProvider: undefined,
            insurancePolicyNumber: undefined,
            insuranceValidUntil: undefined,
          }),
    }

    if (!payload.plate) {
      toast.error("L'immatriculation est obligatoire.")
      return
    }
    if (!payload.capacity || payload.capacity < 1) {
      toast.error("La capacité doit être un nombre positif.")
      return
    }

    onSubmit(payload)
    onOpenChange(false)
  }

  // -------------------- Helpers UI --------------------
  function SectionTitle({ children }: { children: React.ReactNode }) {
    return <h3 className="text-sm font-semibold text-foreground">{children}</h3>
  }

  // Combobox générique (select + recherche)
  function ComboBox<T extends string | number>({
    value,
    onChange,
    options,
    placeholder,
    emptyText = "Aucun résultat",
    getLabel,
    className,
  }: {
    value: T | ""
    onChange: (v: T | "") => void
    options: readonly T[]
    placeholder: string
    emptyText?: string
    getLabel?: (v: T) => string
    className?: string
  }) {
    const [open, setOpen] = React.useState(false)
    const selectedLabel =
      (value !== "" && (getLabel ? getLabel(value as T) : String(value))) || ""

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("justify-between w-full", className)}
          >
            {selectedLabel || (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="ml-2 size-4 opacity-60"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
            </svg>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[--radix-popover-trigger-width] min-w-[220px]">
          <Command>
            <CommandInput placeholder={`Rechercher ${placeholder.toLowerCase()}…`} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onChange("")
                    setOpen(false)
                  }}
                >
                  — Aucun —
                </CommandItem>
                {options.map((opt) => {
                  const label = getLabel ? getLabel(opt) : String(opt)
                  return (
                    <CommandItem
                      key={String(opt)}
                      onSelect={() => {
                        onChange(opt)
                        setOpen(false)
                      }}
                    >
                      {label}
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

  // Combobox personne (propriétaire / chauffeur)
  function PersonCombo({
    value,
    onChange,
    people,
    placeholder,
  }: {
    value: Id | ""
    onChange: (v: Id | "") => void
    people: Person[]
    placeholder: string
  }) {
    return (
      <ComboBox<Id>
        value={value}
        onChange={onChange}
        options={people.map((p) => p.id)}
        placeholder={placeholder}
        getLabel={(id) => {
          const p = people.find((x) => x.id === id)
          return p ? `${p.name} - ${p.phone ?? "-"}` : String(id)
        }}
      />
    )
  }

  // Sélecteur de date
  function DatePicker({
    value,
    onChange,
    placeholder = "Choisir une date",
  }: {
    value: string
    onChange: (v: string) => void
    placeholder?: string
  }) {
    const parsed = value ? new Date(value) : undefined
    const [open, setOpen] = React.useState(false)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="justify-between w-full"
          >
            {parsed
              ? format(parsed, "PPP", { locale: fr })
              : <span className="text-muted-foreground">{placeholder}</span>}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="ml-2 size-4 opacity-60"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.25 8.29a.75.75 0 01-.02-1.08z" clipRule="evenodd" />
            </svg>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(d) => {
              onChange(d ? format(d, "yyyy-MM-dd") : "")
              setOpen(false)
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 overflow-y-auto">
        <DialogHeader className="px-6 pt-5 pb-2">
          <DialogTitle>{editing ? "Modifier un bus" : "Ajouter un bus"}</DialogTitle>
          <DialogDescription>Saisissez les informations du bus.</DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="overflow-y-auto px-6 py-4">
          <form className="grid gap-6" onSubmit={submit}>
            {/* --- Informations principales --- */}
            <div className="grid gap-4">
              <SectionTitle>Informations principales</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="plate">Immatriculation *</Label>
                  <Input
                    id="plate"
                    value={plate}
                    onChange={(e) => setPlate(e.target.value.toUpperCase())}
                    placeholder="KDC 123A"
                    required
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="status">Statut</Label>
                  <select
                    id="status"
                    className="h-9 rounded-md border bg-background px-3 text-sm"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BusStatus)}
                  >
                    <option value="active">Actif</option>
                    <option value="inactive">Inactif</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="type">Type</Label>
                  <select
                    id="type"
                    className="h-9 rounded-md border bg-background px-3 text-sm capitalize"
                    value={type ?? "hiace"}
                    onChange={(e) => setType(e.target.value as BusType)}
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t} className="capitalize">
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <Label>Modèle</Label>
                  <ComboBox
                    value={model}
                    onChange={(v) => setModel((v as string) || "")}
                    options={MODEL_OPTIONS}
                    placeholder="Choisir le modèle"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="year">Année</Label>
                  <Input
                    id="year"
                    type="number"
                    min={1970}
                    max={new Date().getFullYear() + 1}
                    value={year}
                    onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="2020"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="capacity">Capacité *</Label>
                  <div className="relative">
                    <Input
                      id="capacity"
                      type="number"
                      min={1}
                      value={capacity}
                      onChange={(e) => setCapacity(Number(e.target.value))}
                      required
                      className="pr-16"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      places
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="mileageKm">Kilométrage</Label>
                  <div className="relative">
                    <Input
                      id="mileageKm"
                      type="number"
                      min={0}
                      value={mileageKm}
                      onChange={(e) => setMileageKm(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="120000"
                      className="pr-10"
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      km
                    </span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Dernière révision</Label>
                  <DatePicker
                    value={lastServiceDate}
                    onChange={setLastServiceDate}
                    placeholder="Choisir une date"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Affectations --- */}
            <div className="grid gap-4">
              <SectionTitle>Affectations</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Propriétaire</Label>
                  <PersonCombo
                    value={operatorId}
                    onChange={setOperatorId}
                    people={owners}
                    placeholder="Choisir le propriétaire"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Chauffeur</Label>
                  <PersonCombo
                    value={assignedDriverId}
                    onChange={setAssignedDriverId}
                    people={drivers}
                    placeholder="Choisir le chauffeur"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Assurance (optionnel) --- */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <SectionTitle>Assurance</SectionTitle>
                <div className="flex items-center gap-2">
                  <Switch
                    id="hasInsurance"
                    checked={hasInsurance}
                    onCheckedChange={setHasInsurance}
                  />
                  <Label htmlFor="hasInsurance">Activer</Label>
                </div>
              </div>

              {hasInsurance && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="grid gap-2 md:col-span-1">
                    <Label>Assureur</Label>
                    <ComboBox
                      value={insProvider}
                      onChange={(v) => setInsProvider((v as string) || "")}
                      options={PROVIDERS}
                      placeholder="Choisir l’assureur"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-1">
                    <Label htmlFor="insPolicy">N° de police</Label>
                    <Input
                      id="insPolicy"
                      value={insPolicy}
                      onChange={(e) => setInsPolicy(e.target.value)}
                      placeholder="POL-123456"
                    />
                  </div>
                  <div className="grid gap-2 md:col-span-1">
                    <Label>Valide jusqu’au</Label>
                    <DatePicker
                      value={insValidUntil}
                      onChange={setInsValidUntil}
                      placeholder="Choisir une date"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="pt-1 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit">{editing ? "Enregistrer" : "Ajouter"}</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
