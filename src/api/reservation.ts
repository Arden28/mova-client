// src/api/reservation.ts
import api, { buildQuery } from "@/api/apiService"

/* ------------------------------- Server DTOs ------------------------------- */

export type ReservationStatus = "pending" | "confirmed" | "cancelled"
export type ReservationEvent = "none" | "wedding" | "funeral" | "church"

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

  // Some endpoints may send passenger as a nested object...
  passenger?: {
    name: string | null
    phone: string | null
    email?: string | null
  } | null

  // ...while others flatten these on the resource
  passenger_name?: string | null
  passenger_phone?: string | null
  passenger_email?: string | null

  seats: number
  price_total?: number | null
  status?: ReservationStatus | null

  event?: ReservationEvent | null

  waypoints?: WaypointDto[] | null
  distance_km?: number | null

  // Bus id now integer in DB, but the serializer could still stringify.
  buses?: Array<{
    id: number | string
    plate?: string | null
    name?: string | null
    status?: string | null
    type?: string | null
  }> | null

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
  event?: ReservationEvent
  waypoints?: UIWaypoint[]
  distanceKm?: number
  /** Frontend may keep them as strings; we'll coerce to integers in payload. */
  busIds?: Array<string | number>
  createdAt?: string
  updatedAt?: string
  deletedAt?: string | null
}

/* ------------------------------ Transforming ------------------------------ */

export function toUIReservation(r: ReservationDto): UIReservation {
  // Prefer nested passenger if provided; fall back to flattened fields otherwise.
  const nested = r.passenger ?? null
  const name = nested?.name ?? r.passenger_name ?? ""
  const phone = nested?.phone ?? r.passenger_phone ?? ""
  const email = nested?.email ?? r.passenger_email ?? undefined

  return {
    id: String(r.id),
    code: r.code ?? undefined,
    tripDate: r.trip_date,
    route: { from: r.from_location, to: r.to_location },
    passenger: {
      name: name ?? "",
      phone: phone ?? "",
      email: email ?? undefined,
    },
    seats: Number(r.seats ?? 0),
    priceTotal: r.price_total ?? undefined,
    status: (r.status ?? undefined) as ReservationStatus | undefined,
    event: (r.event ?? undefined) as ReservationEvent | undefined,
    waypoints:
      r.waypoints?.map(w => ({
        lat: Number(w.lat),
        lng: Number(w.lng),
        label: w.label ?? undefined,
      })) ?? undefined,
    distanceKm: r.distance_km ?? undefined,
    // Keep original type but stringify to maintain UI consistency, if you need that:
    busIds: r.buses?.map(b => (typeof b.id === "number" ? b.id : String(b.id))) ?? undefined,
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
const isPositiveInt = (v: unknown) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0
}

/**
 * Build a backend-compliant payload.
 * Matches UpdateReservationRequest:
 * - event: 'none'|'wedding'|'funeral'|'church'
 * - bus_ids: integer[] (nullable/array)
 */
function toPayload(body: PartialUIReservation): Record<string, unknown> {
  const p: Record<string, unknown> = {}

  // code (nullable ok)
  if (body.code !== undefined) {
    const v = strOrNull(body.code)
    p.code = v !== null ? v : null
  }

  // trip_date (required if present): only send valid dates
  if (body.tripDate !== undefined) {
    if (isIsoDate(body.tripDate)) p.trip_date = body.tripDate
  }

  // route fields (required if present): only send when non-empty
  if (body.route !== undefined) {
    const f = strOrNull(body.route?.from)
    const t = strOrNull(body.route?.to)
    if (f !== null) p.from_location = f
    if (t !== null) p.to_location = t
  }

  // passenger fields (name/phone required if present)
  if (body.passenger !== undefined) {
    const name = strOrNull(body.passenger?.name)
    const phone = strOrNull(body.passenger?.phone)
    const email = strOrNull(body.passenger?.email)

    if (name !== null) p.passenger_name = name
    if (phone !== null) p.passenger_phone = phone
    if (body.passenger?.email !== undefined) {
      // email is nullable → allow explicit null to clear it
      p.passenger_email = email
    }
  }

  // seats (required if present): only send valid numbers
  if (body.seats !== undefined) {
    const n = numOrNull(body.seats)
    if (n !== null) p.seats = n
  }

  // price_total (nullable)
  if (body.priceTotal !== undefined) {
    const n = numOrNull(body.priceTotal)
    p.price_total = n
  }

  // status (required if present)
  if (body.status !== undefined) {
    if (body.status) p.status = body.status
  }

  // event (required if present): only send valid values
  if (body.event !== undefined) {
    if (body.event) p.event = body.event // 'none' | 'wedding' | 'funeral' | 'church'
    // else omit (don't send null, backend has 'required' when present)
  }

  // waypoints: nullable|array|min:2 with required_with for items
  if (body.waypoints !== undefined) {
    if (Array.isArray(body.waypoints) && body.waypoints.length >= 2) {
      p.waypoints = body.waypoints.map(w => ({
        lat: Number(w.lat),
        lng: Number(w.lng),
        ...(w.label ? { label: String(w.label) } : {}),
      }))
    } else {
      p.waypoints = null // clear them
    }
  }

  // distance_km (nullable)
  if (body.distanceKm !== undefined) {
    const n = numOrNull(body.distanceKm)
    p.distance_km = n
  }

  // bus_ids (nullable array of INTEGERS). [] means detach all (sync to empty).
  if (body.busIds !== undefined) {
    const arr = (body.busIds ?? [])
      .map(v => Number(v))
      .filter(isPositiveInt)
    p.bus_ids = arr
  }

  return p
}

/* --------------------------------- Queries -------------------------------- */

export type ListParams = {
  search?: string
  status?: ReservationStatus | ""
  date_from?: string // YYYY-MM-DD
  date_to?: string   // YYYY-MM-DD
  // If you filter by a single bus, pass the INT id. We'll forward as-is.
  bus_id?: number | string
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
  // Ensure numeric bus_id if it looks numeric
  if (p.bus_id !== undefined) {
    const n = Number(p.bus_id)
    out.bus_id = Number.isFinite(n) ? n : p.bus_id
  }
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
  const res = await api.post<ReservationDto>(`/reservations/${id}/restore`)
  return { ...res, data: toUIReservation(res.data) }
}

async function setStatus(id: string, status: ReservationStatus) {
  const res = await api.post<ReservationDto, { status: ReservationStatus }>(`/reservations/${id}/status`, { status })
  return { ...res, data: toUIReservation(res.data) }
}

async function syncBuses(id: string, busIds: Array<string | number>) {
  const body = { bus_ids: (busIds ?? []).map(v => Number(v)).filter(isPositiveInt) }
  const res = await api.post<ReservationDto, typeof body>(`/reservations/${id}/sync-buses`, body)
  return { ...res, data: toUIReservation(res.data) }
}

async function attachBus(id: string, busId: string | number) {
  const body = { bus_id: Number(busId) }
  const res = await api.post<ReservationDto, typeof body>(`/reservations/${id}/attach-bus`, body)
  return { ...res, data: toUIReservation(res.data) }
}

async function detachBus(id: string, busId: string | number) {
  const body = { bus_id: Number(busId) }
  const res = await api.post<ReservationDto, typeof body>(`/reservations/${id}/detach-bus`, body)
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
