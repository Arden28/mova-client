"use client"

import * as React from "react"
import mapboxgl from "mapbox-gl"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Map as MapIcon,
  ListChecks,
  ArrowLeft,
  Search as SearchIcon,
  Undo2,
  Save,
  X,
  MapPin,
  Loader2,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react"

import reservationApi, { type UIReservation } from "@/api/reservation"
import busApi, { type UIBus } from "@/api/bus"
import AddEditReservationSheet from "@/components/reservation/AddEditReservationSheet"

// Prefer env, fallback to your dev token
const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYXJkZW4tYm91ZXQiLCJhIjoiY21maWgyY3dvMGF1YTJsc2UxYzliNnA0ZCJ9.XC5hXXwEa-NCUPpPtBdWCA"
mapboxgl.accessToken = MAPBOX_TOKEN

type Waypoint = { lat: number; lng: number; label?: string }

/* ------------------------------ Directions API ---------------------------- */
type DirectionsResult = {
  geometry: GeoJSON.LineString | null
  distanceKm: number | null
}

async function getDrivingRoute(pts: Waypoint[], token: string): Promise<DirectionsResult> {
  if (!token || pts.length < 2) return { geometry: null, distanceKm: null }
  const coords = pts.map((p) => `${p.lng},${p.lat}`).join(";")
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coords}.json?geometries=geojson&overview=full&language=fr&access_token=${token}`
  const r = await fetch(url)
  if (!r.ok) return { geometry: null, distanceKm: null }
  const j = await r.json()
  const route = j?.routes?.[0]
  if (!route?.geometry) return { geometry: null, distanceKm: null }
  const km = typeof route.distance === "number" ? Math.round((route.distance / 1000) * 100) / 100 : null
  return { geometry: route.geometry as GeoJSON.LineString, distanceKm: km }
}

const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

/* ------------------------------ Geocoding (CG) ---------------------------- */
const CG_BBOX: [number, number, number, number] = [11.1, -5.5, 18.8, 3.8]
type GeoResult = { label: string; lat: number; lng: number }

async function geocodeForwardCG(
  q: string,
  map: mapboxgl.Map | null,
  token: string
): Promise<GeoResult[]> {
  if (!q || !token) return []
  const center = map?.getCenter()
  const prox = center ? `&proximity=${center.lng},${center.lat}` : ""
  const bbox = `&bbox=${CG_BBOX.join(",")}`
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${token}&limit=8&language=fr&fuzzyMatch=true${prox}${bbox}&country=CG` +
    `&types=address,street,place,locality,neighborhood,poi`

  const r = await fetch(url)
  if (!r.ok) return []
  const j: { features?: { place_name?: string; center?: [number, number] }[] } = await r.json()
  return (j.features ?? [])
    .filter((f) => Array.isArray(f.center) && typeof f.center[0] === "number" && typeof f.center[1] === "number")
    .map((f) => ({
      label: f.place_name || "Lieu",
      lng: f.center![0],
      lat: f.center![1],
    }))
}

export default function ReservationsMapPage() {
  const [rows, setRows] = React.useState<UIReservation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [buses, setBuses] = React.useState<UIBus[]>([])
  const [query, setQuery] = React.useState("")
  const [openList, setOpenList] = React.useState(false)

  // Selection
  const [selected, setSelected] = React.useState<UIReservation | null>(null)

  // Big sheet
  const [openEditSheet, setOpenEditSheet] = React.useState(false)
  const [editing, setEditing] = React.useState<UIReservation | null>(null)

  // Route edit mode
  const [routeEditMode, setRouteEditMode] = React.useState(false)
  const [draftWps, setDraftWps] = React.useState<Waypoint[] | null>(null)
  const [draftDistanceKm, setDraftDistanceKm] = React.useState<number | null>(null)

  // Creation flow flag
  const [creatingNew, setCreatingNew] = React.useState(false)

  // Map refs/state
  const mapRef = React.useRef<mapboxgl.Map | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const markersRef = React.useRef<mapboxgl.Marker[]>([])
  const popupRef = React.useRef<mapboxgl.Popup | null>(null)
  const clickHandlerRef = React.useRef<((e: mapboxgl.MapMouseEvent) => void) | null>(null)
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [mapError, setMapError] = React.useState<string | null>(null)

  // Route overlay for selected/draft
  const routeSourceId = React.useRef(`route-src-${Math.random().toString(36).slice(2)}`)
  const routeLayerId = React.useRef(`route-lyr-${Math.random().toString(36).slice(2)}`)

  // Debounce directions
  const routeDebounceRef = React.useRef<number | null>(null)

  // Toolbar (main) open/close
  const [toolbarOpen, setToolbarOpen] = React.useState(false)

  // Place Search FAB & bar
  const [placeBarOpen, setPlaceBarOpen] = React.useState(false)
  const [placeQuery, setPlaceQuery] = React.useState("")
  const [placeResults, setPlaceResults] = React.useState<GeoResult[]>([])
  const [placeLoading, setPlaceLoading] = React.useState(false)
  const searchMarkerRef = React.useRef<mapboxgl.Marker | null>(null)

  // Waypoints side panel (for sorting/renaming while editing)
  const [showWpPanel, setShowWpPanel] = React.useState(false)

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoading(true)
        const [resv, b] = await Promise.all([
          reservationApi.list({ per_page: 500 }),
          busApi.list({ per_page: 500 }),
        ])
        if (!alive) return
        setRows(resv.data.rows ?? [])
        setBuses(b.data.rows ?? [])
      } catch (e: any) {
        toast.error(e?.message ?? "Échec du chargement.")
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!mapboxgl.supported?.()) {
      setMapError("Mapbox GL is not supported in this browser/device.")
      return
    }
    if (!containerRef.current || mapRef.current) return
    if (!MAPBOX_TOKEN) {
      setMapError("Mapbox token manquant. Configurez VITE_MAPBOX_TOKEN.")
      return
    }

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [15.2832, -4.2667], // Brazzaville approx
        zoom: 12, // closer initial view
        maxZoom: 19,
        accessToken: MAPBOX_TOKEN,
      })
      mapRef.current = map

      map.on("load", () => {
        setMapLoaded(true)
        map.resize()
      })

      map.on("error", (e) => {
        const msg = (e?.error as Error)?.message || "Mapbox error"
        setMapError(msg)
      })

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => map.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 12 }),
          () => {}
        )
      }

      const ro = new ResizeObserver(() => {
        try {
          map.resize()
        } catch {}
      })
      ro.observe(containerRef.current)

      return () => {
        ro.disconnect()
        popupRef.current?.remove()
        if (clickHandlerRef.current) {
          map.off("click", clickHandlerRef.current as any)
          clickHandlerRef.current = null
        }
        searchMarkerRef.current?.remove()
        map.remove()
        mapRef.current = null
      }
    } catch (e: any) {
      setMapError(e?.message ?? "Impossible d'initialiser la carte.")
    }
  }, [])

  // Filtered rows
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.code, r.passenger?.name, r.passenger?.phone, r.route?.from, r.route?.to, ...(r.busIds ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [rows, query])

  const activeWps: Waypoint[] | undefined = React.useMemo(() => {
    if (routeEditMode && draftWps) return draftWps
    const wps = (selected as any)?.waypoints as Waypoint[] | undefined
    return wps
  }, [routeEditMode, draftWps, selected])

  /* ----------------------------- Marker rendering ----------------------------- */
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []
    popupRef.current?.remove()
    popupRef.current = null

    const allLngLat: mapboxgl.LngLatLike[] = []

    if (selected && activeWps?.length) {
      activeWps.forEach((w) => allLngLat.push([w.lng, w.lat]))

      // Start ("De")
      const start = activeWps[0]
      const elDe = document.createElement("div")
      elDe.className =
        "rounded-full bg-primary text-primary-foreground text-[11px] px-2 py-1 shadow ring-1 ring-black/10"
      elDe.textContent = "De"
      const mDe = new mapboxgl.Marker({ element: elDe, draggable: routeEditMode })
        .setLngLat([start.lng, start.lat])
        .addTo(map)
      if (routeEditMode) {
        mDe.on("dragend", () => {
          const pos = mDe.getLngLat()
          setDraftWps((prev) => {
            if (!prev) return prev
            const next = [...prev]
            next[0] = { ...(next[0] || {}), lat: pos.lat, lng: pos.lng }
            return next
          })
        })
      }
      markersRef.current.push(mDe)

      // Intermediates
      if (activeWps.length > 2) {
        for (let i = 1; i < activeWps.length - 1; i++) {
          const wp = activeWps[i]
          const el = document.createElement("div")
          el.className =
            "rounded-full bg-muted text-foreground text-[10px] px-1.5 py-0.5 shadow ring-1 ring-black/10"
          el.textContent = alpha[i + 1] ?? String(i + 1)
          const m = new mapboxgl.Marker({ element: el, draggable: routeEditMode })
            .setLngLat([wp.lng, wp.lat])
            .addTo(map)
          if (routeEditMode) {
            const idx = i
            m.on("dragend", () => {
              const pos = m.getLngLat()
              setDraftWps((prev) => {
                if (!prev) return prev
                const next = [...prev]
                next[idx] = { ...(next[idx] || {}), lat: pos.lat, lng: pos.lng }
                return next
              })
            })
          }
          markersRef.current.push(m)
        }
      }

      // End ("Ar")
      if (activeWps.length > 1) {
        const end = activeWps[activeWps.length - 1]
        const elAr = document.createElement("div")
        elAr.className =
          "rounded-full bg-secondary text-secondary-foreground text-[11px] px-2 py-1 shadow ring-1 ring-black/10"
        elAr.textContent = "Ar"
        const mAr = new mapboxgl.Marker({ element: elAr, draggable: routeEditMode })
          .setLngLat([end.lng, end.lat])
          .addTo(map)
        if (routeEditMode) {
          const idx = activeWps.length - 1
          mAr.on("dragend", () => {
            const pos = mAr.getLngLat()
            setDraftWps((prev) => {
              if (!prev) return prev
              const next = [...prev]
              next[idx] = { ...(next[idx] || {}), lat: pos.lat, lng: pos.lng }
              return next
            })
          })
        }
        markersRef.current.push(mAr)
      }

      // Popup (view mode)
      if (!routeEditMode && start) {
        const card = document.createElement("div")
        card.className =
          "w-[280px] sm:w-[320px] rounded-lg border bg-background shadow-lg overflow-hidden pointer-events-auto"
        card.innerHTML = `
          <div class="p-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <div class="text-sm text-muted-foreground">${selected.route?.from ?? "—"} → ${selected.route?.to ?? "—"}</div>
                <div class="mt-1 font-medium">${selected.code}</div>
              </div>
              <span class="inline-flex items-center rounded-full border px-2 py-0.5 text-xs capitalize">${selected.status}</span>
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div><span class="font-medium text-foreground">Sièges:</span> ${selected.seats ?? "—"}</div>
              <div><span class="font-medium text-foreground">Total:</span> ${
                typeof selected.priceTotal === "number" ? `${selected.priceTotal.toLocaleString("fr-FR")} FCFA` : "—"
              }</div>
              <div class="col-span-2"><span class="font-medium text-foreground">Bus:</span> ${
                (selected.busIds ?? []).join(", ") || "—"
              }</div>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              <button id="popup-edit-route" class="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Éditer l’itinéraire</button>
              <button id="popup-infos" class="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Infos</button>
              <button id="popup-close" class="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-accent">Fermer</button>
            </div>
          </div>
        `

        const map = mapRef.current!
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 16,
          anchor: "bottom",
          className: "z-30",
          maxWidth: "none",
        })
          .setDOMContent(card)
          .setLngLat([start.lng, start.lat])
          .addTo(map)

        popupRef.current = popup

        card.querySelector<HTMLButtonElement>("#popup-edit-route")?.addEventListener("click", () => {
          const wps = (selected as any)?.waypoints as Waypoint[] | undefined
          setDraftWps(wps ? JSON.parse(JSON.stringify(wps)) : [])
          setRouteEditMode(true)
          setShowWpPanel(true)
        })
        card.querySelector<HTMLButtonElement>("#popup-infos")?.addEventListener("click", () => {
          setEditing(selected)
          setOpenEditSheet(true)
        })
        card.querySelector<HTMLButtonElement>("#popup-close")?.addEventListener("click", () => {
          popupRef.current?.remove()
          popupRef.current = null
          setSelected(null)
        })
      }
    } else {
      // LIST VIEW: show "De" for each reservation
      filtered.forEach((r) => {
        const wps = (r as any).waypoints as Waypoint[] | undefined
        if (!wps || wps.length < 1) return
        wps.forEach((w) => allLngLat.push([w.lng, w.lat]))

        const start = wps[0]
        const elDe = document.createElement("div")
        elDe.className =
          "rounded-full bg-primary text-primary-foreground text-[11px] px-2 py-1 shadow ring-1 ring-black/10"
        elDe.textContent = "De"

        const mDe = new mapboxgl.Marker({ element: elDe }).setLngLat([start.lng, start.lat]).addTo(map)
        mDe.getElement().style.cursor = "pointer"
        mDe.getElement().addEventListener("click", () => setSelected(r))
        markersRef.current.push(mDe)
      })
    }

    // Fit bounds safely
    if (!allLngLat.length) return
    if (allLngLat.length === 1) {
      const [lng, lat] = allLngLat[0] as [number, number]
      requestAnimationFrame(() => {
        try {
          map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13), duration: 500 })
        } catch {}
      })
      return
    }
    const bounds = new mapboxgl.LngLatBounds(
      allLngLat[0] as [number, number],
      allLngLat[0] as [number, number]
    )
    allLngLat.forEach((c) => bounds.extend(c as [number, number]))

    const container = map.getContainer()
    const w = container.clientWidth
    const h = container.clientHeight
    const basePadding = 60
    const maxPad = Math.max(0, Math.floor(Math.min(w, h) / 2 - 4))
    const safePadding = Math.min(basePadding, maxPad)

    requestAnimationFrame(() => {
      try {
        if (safePadding > 0) map.fitBounds(bounds, { padding: safePadding, maxZoom: 16, duration: 600 })
        else map.easeTo({ center: bounds.getCenter(), zoom: 13.5, duration: 500 })
      } catch {
        try {
          map.easeTo({ center: bounds.getCenter(), zoom: 13.5, duration: 500 })
        } catch {}
      }
    })
  }, [filtered, selected, mapLoaded, routeEditMode, activeWps])

  /* ---------------------- Selected/draft route overlay (driving) ------------- */
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const srcId = routeSourceId.current
    const lyrId = routeLayerId.current

    const ensure = () => {
      if (!map.getSource(srcId)) {
        const empty: GeoJSON.FeatureCollection<GeoJSON.LineString> = { type: "FeatureCollection", features: [] }
        map.addSource(srcId, { type: "geojson", data: empty })
      }
      if (!map.getLayer(lyrId)) {
        map.addLayer({
          id: lyrId,
          type: "line",
          source: srcId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-width": 5, "line-color": "#2563eb", "line-opacity": 0.9 },
        })
      }
    }

    const clear = () => {
      const src = map.getSource(srcId) as mapboxgl.GeoJSONSource | undefined
      if (src) src.setData({ type: "FeatureCollection", features: [] })
    }

    const wps = activeWps
    if ((!selected && !creatingNew) || !wps || wps.length < 2) {
      clear()
      return
    }

    if (routeDebounceRef.current) window.clearTimeout(routeDebounceRef.current)
    routeDebounceRef.current = window.setTimeout(async () => {
      try {
        ensure()
        const { geometry, distanceKm } = await getDrivingRoute(wps, MAPBOX_TOKEN)
        const src = map.getSource(srcId) as mapboxgl.GeoJSONSource | undefined
        if (!src) return
        const data: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
          type: "FeatureCollection",
          features: geometry ? [{ type: "Feature", geometry, properties: {} }] : [],
        }
        src.setData(data)
        if (routeEditMode) setDraftDistanceKm(distanceKm ?? null)
      } catch {}
    }, 300)

    return () => {
      if (routeDebounceRef.current) window.clearTimeout(routeDebounceRef.current)
    }
  }, [activeWps, selected, mapLoaded, routeEditMode, creatingNew])

  /* ---------------------- Map click handler (edit mode) ---------------------- */
  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return

    if (clickHandlerRef.current) {
      map.off("click", clickHandlerRef.current as any)
      clickHandlerRef.current = null
    }

    if (!routeEditMode) return

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat
      setDraftWps((prev) => {
        const next = prev ? [...prev] : []
        next.push({ lat, lng, label: `Point ${next.length + 1}` })
        return next
      })
    }

    map.on("click", onClick as any)
    clickHandlerRef.current = onClick

    return () => {
      if (clickHandlerRef.current) {
        map.off("click", clickHandlerRef.current as any)
        clickHandlerRef.current = null
      }
    }
  }, [routeEditMode])

  // Resize on UI changes
  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const t = setTimeout(() => {
      try {
        map.resize()
      } catch {}
    }, 260)
    return () => clearTimeout(t)
  }, [openList, selected, openEditSheet, routeEditMode, toolbarOpen, placeBarOpen, showWpPanel])

  /* -------------------------- Helpers -------------------------- */
  const busPlateById = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const b of buses) if (b?.id) m.set(String(b.id), b.plate ?? String(b.id))
    return m
  }, [buses])

  function RowItem({ r }: { r: UIReservation }) {
    return (
      <button
        className="w-full text-left rounded-md border p-3 hover:bg-accent"
        onClick={() => {
          setSelected(r)
          setOpenList(false)
          const wps = (r as any).waypoints as Waypoint[] | undefined
          if (wps?.length && mapRef.current) {
            mapRef.current.easeTo({
              center: [wps[0].lng, wps[0].lat],
              zoom: Math.max(mapRef.current.getZoom(), 13),
            })
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="font-medium">{r.code}</div>
          <Badge variant="outline" className="capitalize">
            {r.status}
          </Badge>
        </div>
        <div className="mt-1 text-sm text-muted-foreground truncate">
          {r.route?.from ?? "—"} → {r.route?.to ?? "—"}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Bus: {(r.busIds ?? []).map((id) => busPlateById.get(id) ?? id).join(", ") || "—"} · Sièges: {r.seats ?? "—"}
        </div>
      </button>
    )
  }

  /* ----------------------- Waypoints side panel (edit) ---------------------- */
  function updateWpLabel(i: number, v: string) {
    setDraftWps((prev) => {
      if (!prev) return prev
      const next = [...prev]
      next[i] = { ...next[i], label: v }
      return next
    })
  }
  function removeWp(i: number) {
    setDraftWps((prev) => {
      if (!prev) return prev
      const next = [...prev]
      next.splice(i, 1)
      return next
    })
  }
  function moveWp(i: number, dir: -1 | 1) {
    setDraftWps((prev) => {
      if (!prev) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const next = [...prev]
      const tmp = next[i]
      next[i] = next[j]
      next[j] = tmp
      return next
    })
  }

  // Commit/cancel edit helpers
  async function saveDraftRoute() {
    // Creating new: confirm itinerary -> open sheet prefilled
    if (creatingNew) {
      if (!draftWps || draftWps.length < 2) {
        toast.error("Ajoutez au moins un départ et une arrivée.")
        return
      }
      const id = crypto.randomUUID()
      const code = `BZV-${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`
      const fromLabel = draftWps[0]?.label || "Départ"
      const toLabel = draftWps[draftWps.length - 1]?.label || "Arrivée"

      const payload: UIReservation = {
        id,
        code,
        tripDate: new Date().toISOString().slice(0, 10),
        route: { from: fromLabel, to: toLabel },
        passenger: { name: "", phone: "" },
        seats: 1,
        busIds: [],
        priceTotal: 0,
        status: "pending",
        createdAt: new Date().toISOString(),
        ...(draftDistanceKm != null ? ({ distanceKm: draftDistanceKm } as any) : {}),
        ...(draftWps ? ({ waypoints: draftWps } as any) : {}),
      }

      setEditing(payload)
      setOpenEditSheet(true)
      setRouteEditMode(false)
      setCreatingNew(false)
      setShowWpPanel(false)
      return
    }

    // Editing existing
    if (!selected || !draftWps?.length) {
      setRouteEditMode(false)
      setDraftWps(null)
      setShowWpPanel(false)
      return
    }
    const updated: UIReservation = {
      ...selected,
      ...(draftDistanceKm != null ? ({ distanceKm: draftDistanceKm } as any) : {}),
      ...(draftWps ? ({ waypoints: draftWps } as any) : {}),
      route: {
        from: draftWps[0]?.label ?? selected.route?.from ?? "Départ",
        to: draftWps[draftWps.length - 1]?.label ?? selected.route?.to ?? "Arrivée",
      },
    }

    setRows((xs) => xs.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)))
    setSelected(updated)

    try {
      await reservationApi.update(updated.id, updated)
      toast.success("Itinéraire enregistré.")
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l’enregistrement de l’itinéraire.")
    }

    setRouteEditMode(false)
    setDraftWps(null)
    setShowWpPanel(false)
  }

  function cancelDraftRoute() {
    setRouteEditMode(false)
    setDraftWps(null)
    setDraftDistanceKm(null)
    setCreatingNew(false)
    setShowWpPanel(false)
  }

  function undoLastPoint() {
    setDraftWps((prev) => {
      if (!prev || prev.length === 0) return prev
      const next = [...prev]
      next.pop()
      return next
    })
  }

  function recenterToDraft() {
    const map = mapRef.current
    if (!map) return
    const wps = (routeEditMode ? draftWps : activeWps) ?? []
    if (wps.length === 0) return
    if (wps.length === 1) {
      map.easeTo({ center: [wps[0].lng, wps[0].lat], zoom: Math.max(map.getZoom(), 13), duration: 400 })
      return
    }
    const b = new mapboxgl.LngLatBounds([wps[0].lng, wps[0].lat], [wps[0].lng, wps[0].lat])
    wps.forEach((p) => b.extend([p.lng, p.lat]))
    map.fitBounds(b, { padding: 60, maxZoom: 15, duration: 500 })
  }

  /* -------------------------- Place search logic --------------------------- */
  React.useEffect(() => {
    const q = placeQuery.trim()
    if (!placeBarOpen) {
      setPlaceResults([])
      setPlaceLoading(false)
      return
    }
    if (!q) {
      setPlaceResults([])
      setPlaceLoading(false)
      return
    }
    const id = window.setTimeout(async () => {
      setPlaceLoading(true)
      try {
        const res = await geocodeForwardCG(q, mapRef.current, MAPBOX_TOKEN)
        setPlaceResults(res)
      } finally {
        setPlaceLoading(false)
      }
    }, 300)
    return () => window.clearTimeout(id)
  }, [placeQuery, placeBarOpen])

  function focusResult(r: GeoResult) {
    const map = mapRef.current
    if (!map) return
    searchMarkerRef.current?.remove()
    const el = document.createElement("div")
    el.className = "grid place-items-center rounded-full bg-white ring-1 ring-black/10 shadow size-8"
    const dot = document.createElement("div")
    dot.className = "size-3 rounded-full bg-primary"
    el.appendChild(dot)
    const mk = new mapboxgl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(map)
    searchMarkerRef.current = mk
    map.easeTo({ center: [r.lng, r.lat], zoom: Math.max(map.getZoom(), 15), duration: 600 })
  }

  /* -------------------------- Creation FAB handler -------------------------- */
  function startCreationFlow() {
    setSelected(null)
    popupRef.current?.remove()
    setDraftWps([])
    setDraftDistanceKm(null)
    setRouteEditMode(true)
    setCreatingNew(true)
    setShowWpPanel(true)
    toast("Cliquez sur la carte pour ajouter le départ, l’arrivée et les étapes.")
  }

  return (
    <div className="relative h-full w-full min-h-0">
      {/* Inline error banner */}
      {mapError && (
        <div className="absolute inset-x-0 top-0 z-30 m-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
          <div className="text-sm">{mapError}</div>
        </div>
      )}

      {/* MAIN FAB + Animated Toolbar */}
      <div className="absolute left-4 top-4 z-20">
        {!toolbarOpen && (
          <button
            type="button"
            aria-label="Ouvrir la barre"
            onClick={() => setToolbarOpen(true)}
            className="grid size-12 place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <MapIcon className="h-5 w-5 text-foreground" />
          </button>
        )}

        <AnimatePresence>
          {toolbarOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto mt-0 flex w-[90vw] max-w-[720px] items-center gap-2 rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur supports-[backdrop-filter]:backdrop-blur"
            >
              <div className="flex items-center gap-2 pl-1 pr-1">
                <div className="grid size-8 place-items-center rounded-full bg-white ring-1 ring-black/10">
                  <MapIcon className="h-4 w-4" />
                </div>
              </div>

              <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

              {/* Search in reservations */}
              <div className="relative min-w-0 flex-1">
                <SearchIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher (code, passager, trajet, bus...)"
                  className="w-full pl-8"
                />
              </div>

              {/* List sheet trigger */}
              <Sheet open={openList} onOpenChange={setOpenList}>
                <SheetTrigger asChild>
                  <Button size="icon" variant="outline" className="shrink-0">
                    <ListChecks className="h-4 w-4" />
                    <span className="sr-only">Ouvrir la liste</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[380px] sm:w-[420px]">
                  <SheetHeader>
                    <SheetTitle>Réservations ({filtered.length})</SheetTitle>
                    <SheetDescription>
                      Parcourez et sélectionnez pour centrer la carte et voir les détails.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-4 space-y-2">
                    <ScrollArea className="h-[calc(100vh-12rem)] pr-2">
                      {loading && <div className="text-sm text-muted-foreground">Chargement…</div>}
                      {!loading && filtered.length === 0 && (
                        <div className="text-sm text-muted-foreground">Aucun résultat.</div>
                      )}
                      {!loading && filtered.map((r) => <RowItem key={r.id} r={r} />)}
                    </ScrollArea>
                  </div>
                </SheetContent>
              </Sheet>

              {/* Back to list */}
              <Button asChild size="sm" variant="ghost" className="shrink-0">
                <Link to="/reservations" className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Retour à la liste</span>
                </Link>
              </Button>

              {/* Close toolbar */}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Fermer"
                className="ml-1 shrink-0"
                onClick={() => setToolbarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECOND FAB: place search */}
      <div className="absolute left-4 top-20 z-20">
        {!placeBarOpen && (
          <button
            type="button"
            aria-label="Ouvrir la recherche de lieux"
            onClick={() => setPlaceBarOpen(true)}
            className="grid size-12 place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <SearchIcon className="h-5 w-5 text-foreground" />
          </button>
        )}

        <AnimatePresence>
          {placeBarOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: -8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="pointer-events-auto mt-0 w-[90vw] max-w-[720px] rounded-xl border bg-background/95 p-2 shadow-lg backdrop-blur supports-[backdrop-filter]:backdrop-blur"
            >
              <div className="flex items-center gap-2">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-white ring-1 ring-black/10">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="relative min-w-0 flex-1">
                  <SearchIcon className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={placeQuery}
                    onChange={(e) => setPlaceQuery(e.target.value)}
                    placeholder="Chercher un lieu dans le Congo-Brazzaville (rue, adresse, ville…)"
                    className="w-full pl-8"
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Fermer"
                  className="shrink-0"
                  onClick={() => {
                    setPlaceBarOpen(false)
                    setPlaceQuery("")
                    setPlaceResults([])
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="relative">
                <div className="absolute left-0 right-0 z-10 mt-2 rounded-md border bg-popover p-1 shadow">
                  {placeLoading && (
                    <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recherche…
                    </div>
                  )}
                  {!placeLoading && placeQuery && placeResults.length === 0 && (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Aucun résultat (essayez un autre libellé).
                    </div>
                  )}
                  {!placeLoading &&
                    placeResults.map((r, i) => (
                      <button
                        key={`${r.lng}-${r.lat}-${i}`}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                        onClick={() => focusResult(r)}
                      >
                        <MapPin className="h-4 w-4 opacity-70" />
                        <span className="truncate">{r.label}</span>
                      </button>
                    ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* THIRD FAB: New reservation (under place search FAB) */}
      <div className="absolute left-4 top-36 z-20">
        <button
          type="button"
          aria-label="Nouvelle réservation"
          onClick={startCreationFlow}
          className="grid size-12 place-items-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <Plus className="h-5 w-5 text-foreground" />
        </button>
      </div>

      {/* Floating Route Editor Toolbar (editing/creation) */}
      {routeEditMode && (
        <div className="absolute left-4 top-[168px] z-20 w-[min(680px,calc(100vw-2rem))]">
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background/95 p-2 shadow">
            <Badge variant="secondary" className="px-2">
              {draftWps?.length ?? 0} points
            </Badge>
            <Badge variant="outline" className="px-2">
              {(draftDistanceKm ?? 0).toLocaleString("fr-FR")} km
            </Badge>

            <Separator orientation="vertical" className="mx-1 h-5" />

            <Button size="sm" variant="outline" onClick={undoLastPoint}>
              <Undo2 className="mr-2 h-4 w-4" />
              Annuler le dernier
            </Button>
            <Button size="sm" variant="outline" onClick={recenterToDraft}>
              Recentrer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowWpPanel((v) => !v)}
            >
              {showWpPanel ? "Masquer" : "Voir"} les points
            </Button>

            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={cancelDraftRoute}>
                <X className="mr-2 h-4 w-4" />
                Annuler
              </Button>
              <Button size="sm" onClick={saveDraftRoute}>
                <Save className="mr-2 h-4 w-4" />
                {creatingNew ? "Confirmer l’itinéraire" : "Enregistrer l’itinéraire"}
              </Button>
            </div>
          </div>
          <div className="mt-2 rounded-md border bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            Astuce : cliquez sur la carte pour ajouter un arrêt, faites glisser les marqueurs pour ajuster. Utilisez
            « Annuler le dernier » pour retirer le dernier point. Ouvrez « Voir les points » pour renommer / réordonner.
          </div>
        </div>
      )}

      {/* Waypoints side panel (rename/sort/delete) */}
      {routeEditMode && showWpPanel && (
        <div className="absolute z-20 left-4 top-[260px] w-[min(520px,calc(100vw-2rem))] rounded-lg border bg-background/95 p-3 shadow">
          <div className="mb-2 text-sm font-medium">Points de l’itinéraire</div>
          <div className="max-h-[40vh] overflow-y-auto">
            {(draftWps ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">Cliquez sur la carte pour ajouter des points.</div>
            )}
            {(draftWps ?? []).map((wp, idx) => (
              <div key={`${wp.lat}-${wp.lng}-${idx}`} className="mb-2 flex items-center gap-2">
                <Badge variant="secondary" className="shrink-0">
                  {alpha[idx] ?? idx + 1}
                </Badge>
                <Input
                  value={wp.label ?? ""}
                  onChange={(e) => updateWpLabel(idx, e.target.value)}
                  className="flex-1"
                />
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="ghost" onClick={() => moveWp(idx, -1)} disabled={idx === 0}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => moveWp(idx, +1)}
                    disabled={idx === (draftWps?.length ?? 0) - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeWp(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0 bg-muted" style={{ minHeight: "100vh" }} />

      {/* Big Add/Edit sheet */}
      <AddEditReservationSheet
        open={openEditSheet}
        onOpenChange={(v) => {
          setOpenEditSheet(v)
          // if closing sheet during creation without saving, reset creation flags
          if (!v && creatingNew) {
            setCreatingNew(false)
          }
        }}
        editing={editing}
        onSubmit={async (res) => {
          // create or update depending on presence in list
          const exists = rows.some((r) => r.id === res.id)
          if (exists) {
            // optimistic
            setRows((xs) => xs.map((x) => (x.id === res.id ? { ...x, ...res } : x)))
            try {
              const saved = await reservationApi.update(res.id, res)
              setRows((xs) => xs.map((x) => (x.id === res.id ? saved.data : x)))
              toast.success("Réservation mise à jour.")
              setEditing(null)
              setSelected((s) => (s && s.id === res.id ? saved.data : s))
            } catch (e: any) {
              toast.error(e?.message ?? "Échec de la mise à jour.")
            }
          } else {
            try {
              const created = await reservationApi.create(res)
              setRows((xs) => [created.data, ...xs])
              toast.success("Réservation ajoutée.")
              setEditing(null)
              setSelected(created.data)
            } catch (e: any) {
              toast.error(e?.message ?? "Échec de la création.")
            }
          }
          setCreatingNew(false)
        }}
        buses={buses as unknown as any[]}
        onEditItinerary={() => {
          if (!editing) return
          // jump back to map editor with current itinerary
          const wps = (editing as any).waypoints as Waypoint[] | undefined
          setDraftWps(wps ? JSON.parse(JSON.stringify(wps)) : [])
          setDraftDistanceKm((editing as any)?.distanceKm ?? null)
          setRouteEditMode(true)
          setCreatingNew(false)
          setShowWpPanel(true)
          setOpenEditSheet(false)
          setSelected(editing) // keep context on map (optional)
        }}
      />
    </div>
  )
}
