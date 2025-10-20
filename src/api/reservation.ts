// src/api/reservation.ts
import api, { buildQuery } from "@/api/apiService"

/* ------------------------------- Server DTOs ------------------------------- */

export type ReservationStatus = "pending" | "confirmed" | "cancelled"

export type WaypointDto = {
  lat: number
  lng: number
  label?: string | null
}

export type ReservationDto = {
  id: string // uuid
  code?: string | null
  trip_date: string // YYYY-MM-DD
  from_location: string
  to_location: string

  passenger?: {
    name: string | null
    phone: string | null
    email?: string | null
  } | null

  seats: number
  price_total?: number | null
  status?: ReservationStatus | null

  waypoints?: WaypointDto[] | null
  distance_km?: number | null

  buses?: Array<{ id: string; plate?: string | null; name?: string | null; status?: string | null; type?: string | null }> | null

  created_at?: string | null
  updated_at?: string | null
  deleted_at?: string | null
}

/** Typical Laravel paginator */
export type Paginated<T> = {
  data: T[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

/* -------------------------------- UI Types -------------------------------- */

export type UIRoute = { from: string; to: string }
export type UIPassenger = { name: string; phone: string; email?: string }
export type UIWaypoint = { lat: number; lng: number; label?: string }

export type UIReservation = {
  id: string
  code?: string
  tripDate: string // YYYY-MM-DD
  route: UIRoute
  passenger: UIPassenger
  seats: number
  priceTotal?: number
  status?: ReservationStatus
  waypoints?: UIWaypoint[]
  distanceKm?: number
  busIds?: string[]
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

/* ------------------------------ Transforming ------------------------------ */

export function toUIReservation(r: ReservationDto): UIReservation {
  return {
    id: String(r.id),
    code: r.code ?? undefined,
    tripDate: r.trip_date,
    route: { from: r.from_location, to: r.to_location },
    passenger: {
      name: r.passenger?.name ?? "",
      phone: r.passenger?.phone ?? "",
      email: r.passenger?.email ?? undefined,
    },
    seats: Number(r.seats ?? 0),
    priceTotal: r.price_total ?? undefined,
    status: (r.status ?? undefined) as ReservationStatus | undefined,
    waypoints: r.waypoints?.map(w => ({ lat: Number(w.lat), lng: Number(w.lng), label: w.label ?? undefined })) ?? undefined,
    distanceKm: r.distance_km ?? undefined,
    busIds: r.buses?.map(b => String(b.id)) ?? undefined,
    createdAt: r.created_at ?? undefined,
    updatedAt: r.updated_at ?? undefined,
    deletedAt: r.deleted_at ?? null,
  }
}

type PartialUIReservation = Partial<UIReservation>

/* --------------------------- Coercion utilities --------------------------- */

function strOrNull(v: unknown): string | null {
  const s = typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim()
  return s ? s : null
}
function numOrNull(v: unknown): number | null {
  if (v === "" || v === undefined || v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}
function isIsoDate(v?: string) {
  return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function toPayload(body: PartialUIReservation): Record<string, unknown> {
  const p: Record<string, unknown> = {}

  // code (nullable ok)
  if (body.code !== undefined) {
    const v = strOrNull(body.code)
    if (v !== null) p.code = v
    else p.code = null // you want to clear it (nullable rule is OK)
  }

  // trip_date (required if present): don't send null, only send valid dates
  if (body.tripDate !== undefined) {
    if (isIsoDate(body.tripDate)) p.trip_date = body.tripDate
    // else: omit (let backend keep current value)
  }

  // route fields (required if present): only send when non-empty
  if (body.route !== undefined) {
    const f = strOrNull(body.route?.from)
    const t = strOrNull(body.route?.to)
    if (f !== null) p.from_location = f
    if (t !== null) p.to_location = t
    // don't send nulls here because they're 'required' when present
  }

  // passenger fields (name/phone required if present): only send when non-empty
  if (body.passenger !== undefined) {
    const name = strOrNull(body.passenger?.name)
    const phone = strOrNull(body.passenger?.phone)
    const email = strOrNull(body.passenger?.email)

    if (name !== null) p.passenger_name = name
    if (phone !== null) p.passenger_phone = phone

    // email is nullable -> allow explicit null to clear it
    if (body.passenger?.email !== undefined) {
      p.passenger_email = email // can be string or null
    }
  }

  // seats (required if present): only send valid numbers
  if (body.seats !== undefined) {
    const n = numOrNull(body.seats)
    if (n !== null) p.seats = n
    // else omit to avoid failing 'required'
  }

  // price_total (nullable): allow null to clear, otherwise send number
  if (body.priceTotal !== undefined) {
    const n = numOrNull(body.priceTotal)
    p.price_total = n // can be null per backend rule
  }

  // status (required if present): only send when non-empty valid value
  if (body.status !== undefined) {
    if (body.status) p.status = body.status // "pending" | "confirmed" | "cancelled"
    // else omit; don't send null because backend has 'required'
  }

  // waypoints: backend has 'nullable|array|min:2' + required_with on items
  if (body.waypoints !== undefined) {
    if (Array.isArray(body.waypoints) && body.waypoints.length >= 2) {
      p.waypoints = body.waypoints.map(w => ({
        lat: Number(w.lat),
        lng: Number(w.lng),
        ...(w.label ? { label: String(w.label) } : {}),
      }))
    } else {
      // You want to clear them → send null (nullable)
      p.waypoints = null
    }
  }

  // distance_km (nullable): allow null to clear; else valid number
  if (body.distanceKm !== undefined) {
    const n = numOrNull(body.distanceKm)
    p.distance_km = n
  }

  // bus_ids (nullable array). If you want to detach all buses, send [].
  if (body.busIds !== undefined) {
    const arr = (body.busIds ?? []).map(String).filter(Boolean)
    p.bus_ids = arr // [] is fine; will sync/detach all
  }

  return p
}


/* --------------------------------- Queries -------------------------------- */

export type ListParams = {
  search?: string
  status?: ReservationStatus | ""
  date_from?: string // YYYY-MM-DD
  date_to?: string   // YYYY-MM-DD
  bus_id?: string
  with?: ("buses")[]
  trashed?: "with" | "only" | "without"
  order_by?: "created_at" | "updated_at" | "trip_date" | "price_total" | "seats" | "status"
  order_dir?: "asc" | "desc"
  page?: number
  per_page?: number
}

function normalizeListParams(p?: ListParams) {
  if (!p) return undefined
  const out: Record<string, unknown> = { ...p }
  if (p.with && p.with.length) out.with = p.with.join(",")
  return out
}

/* --------------------------------- Client --------------------------------- */

async function list(params?: ListParams) {
  const qs = buildQuery(normalizeListParams(params))
  const res = await api.get<Paginated<ReservationDto>>(`/reservations${qs}`)
  return {
    ...res,
    data: {
      rows: res.data.data.map(toUIReservation),
      meta: res.data.meta ?? {
        current_page: 1,
        last_page: 1,
        per_page: res.data.data.length,
        total: res.data.data.length,
      },
    },
  }
}

async function show(id: string) {
  const res = await api.get<ReservationDto>(`/reservations/${id}`)
  return { ...res, data: toUIReservation(res.data) }
}

async function create(payload: PartialUIReservation) {
  const res = await api.post<ReservationDto, Record<string, unknown>>(`/reservations`, toPayload(payload))
  return { ...res, data: toUIReservation(res.data) }
}

async function update(id: string, payload: PartialUIReservation) {
  const res = await api.put<ReservationDto, Record<string, unknown>>(`/reservations/${id}`, toPayload(payload))
  return { ...res, data: toUIReservation(res.data) }
}

async function remove(id: string) {
  return api.delete<null>(`/reservations/${id}`)
}

async function restore(id: string) {
  // no body needed; avoid `{}` which triggers ban-types lint
  const res = await api.post<ReservationDto>(`/reservations/${id}/restore`)
  return { ...res, data: toUIReservation(res.data) }
}

async function setStatus(id: string, status: ReservationStatus) {
  const res = await api.post<ReservationDto, { status: ReservationStatus }>(`/reservations/${id}/status`, { status })
  return { ...res, data: toUIReservation(res.data) }
}

async function syncBuses(id: string, busIds: string[]) {
  const res = await api.post<ReservationDto, { bus_ids: string[] }>(`/reservations/${id}/sync-buses`, {
    bus_ids: busIds,
  })
  return { ...res, data: toUIReservation(res.data) }
}

async function attachBus(id: string, busId: string) {
  const res = await api.post<ReservationDto, { bus_id: string }>(`/reservations/${id}/attach-bus`, { bus_id: busId })
  return { ...res, data: toUIReservation(res.data) }
}

async function detachBus(id: string, busId: string) {
  const res = await api.post<ReservationDto, { bus_id: string }>(`/reservations/${id}/detach-bus`, { bus_id: busId })
  return { ...res, data: toUIReservation(res.data) }
}

async function bulkStatus(ids: string[], status: ReservationStatus) {
  const body = { ids, status }
  return api.post<{ updated: number }, typeof body>(`/reservations/bulk-status`, body)
}

export default {
  list,
  show,
  create,
  update,
  remove,
  restore,
  setStatus,
  syncBuses,
  attachBus,
  detachBus,
  bulkStatus,
}

// export type { UIReservation, UIWaypoint }
