// src/app/pages/ReservationsMap.tsx
"use client"

import * as React from "react"
import mapboxgl from "mapbox-gl"
import { Link } from "react-router-dom"
import { toast } from "sonner"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Map as MapIcon, ListChecks, ArrowLeft, Search as SearchIcon, Pencil, X } from "lucide-react"

import reservationApi, { type UIReservation } from "@/api/reservation"
import AddEditReservationDialog from "@/components/reservation/AddEditReservation"
import busApi, { type UIBus } from "@/api/bus"

// Prefer env, fallback to your dev token
const MAPBOX_TOKEN = "pk.eyJ1IjoiYXJkZW4tYm91ZXQiLCJhIjoiY21maWgyY3dvMGF1YTJsc2UxYzliNnA0ZCJ9.XC5hXXwEa-NCUPpPtBdWCA"

mapboxgl.accessToken = MAPBOX_TOKEN

type Waypoint = { lat: number; lng: number; label?: string }

export default function ReservationsMapPage() {
  const [rows, setRows] = React.useState<UIReservation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [buses, setBuses] = React.useState<UIBus[]>([])
  const [query, setQuery] = React.useState("")
  const [openList, setOpenList] = React.useState(false)

  // Edit dialog
  const [editing, setEditing] = React.useState<UIReservation | null>(null)
  const [openEdit, setOpenEdit] = React.useState(false)

  // Marker selection
  const [selected, setSelected] = React.useState<UIReservation | null>(null)

  // Map refs/state
  const mapRef = React.useRef<mapboxgl.Map | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const markersRef = React.useRef<mapboxgl.Marker[]>([])
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [mapError, setMapError] = React.useState<string | null>(null)

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
    // Basic support check (avoids blank if WebGL disabled)
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
        center: [36.8219, -1.2921], // Nairobi default
        zoom: 10,
        maxZoom: 19,
        accessToken: MAPBOX_TOKEN,
      })
      mapRef.current = map

      map.on("load", () => {
        setMapLoaded(true)
        map.resize()
      })

      // surface any style/token errors
      map.on("error", (e) => {
        const msg = (e?.error as Error)?.message || "Mapbox error"
        setMapError(msg)
      })

      // Geolocation (best-effort)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => map.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 12 }),
          () => {}
        )
      }

      // Keep map sized correctly if container changes
      const ro = new ResizeObserver(() => {
        try { map.resize() } catch {}
      })
      ro.observe(containerRef.current)

      return () => {
        ro.disconnect()
        map.remove()
        mapRef.current = null
      }
    } catch (e: any) {
      setMapError(e?.message ?? "Impossible d'initialiser la carte.")
    }
  }, [])

  // Filtered rows for markers/search
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [
        r.code,
        r.passenger?.name,
        r.passenger?.phone,
        r.route?.from,
        r.route?.to,
        ...(r.busIds ?? []),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [rows, query])

  // Draw markers + safe fit
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    // clear previous markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const allLngLat: mapboxgl.LngLatLike[] = []

    filtered.forEach((r) => {
      const wps = (r as any).waypoints as Waypoint[] | undefined
      if (!wps || wps.length < 1) return

      // start marker (A)
      const start = wps[0]
      const el = document.createElement("div")
      el.className =
        "rounded-full bg-primary text-primary-foreground text-[11px] px-2 py-1 shadow ring-1 ring-black/10"
      el.textContent = "A"

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([start.lng, start.lat])
        .addTo(map)

      marker.getElement().style.cursor = "pointer"
      marker.getElement().addEventListener("click", () => setSelected(r))

      markersRef.current.push(marker)
      allLngLat.push([start.lng, start.lat])

      // end marker (B)
      if (wps.length > 1) {
        const end = wps[wps.length - 1]
        const elB = document.createElement("div")
        elB.className =
          "rounded-full bg-secondary text-secondary-foreground text-[11px] px-2 py-1 shadow ring-1 ring-black/10"
        elB.textContent = "B"
        const markerB = new mapboxgl.Marker({ element: elB })
          .setLngLat([end.lng, end.lat])
          .addTo(map)
        markerB.getElement().style.cursor = "pointer"
        markerB.getElement().addEventListener("click", () => setSelected(r))
        markersRef.current.push(markerB)
        allLngLat.push([end.lng, end.lat])
      }
    })

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
        if (safePadding > 0) {
          map.fitBounds(bounds, { padding: safePadding, maxZoom: 14, duration: 600 })
        } else {
          const center = bounds.getCenter()
          map.easeTo({ center, zoom: 12, duration: 500 })
        }
      } catch {
        const center = bounds.getCenter()
        try { map.easeTo({ center, zoom: 12, duration: 500 }) } catch {}
      }
    })
  }, [filtered, mapLoaded])

  // Resize when sheets open/close so the map can re-measure its canvas
  React.useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const t = setTimeout(() => {
      try { map.resize() } catch {}
    }, 250)
    return () => clearTimeout(t)
  }, [openList, selected])

  /* -------------------------- Small helpers & UI -------------------------- */

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
            mapRef.current.easeTo({ center: [wps[0].lng, wps[0].lat], zoom: Math.max(mapRef.current.getZoom(), 13) })
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="font-medium">{r.code}</div>
          <Badge variant="outline" className="capitalize">{r.status}</Badge>
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

  return (
  <div className="relative h-full w-full min-h-0">
      {/* Inline error banner (token/style issues etc.) */}
      {mapError && (
        <div className="absolute inset-x-0 top-0 z-30 m-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
          <div className="text-sm">{mapError}</div>
        </div>
      )}

      {/* Top bar (lightweight) */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 flex w-[min(720px,calc(100vw-2rem))] flex-wrap gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border bg-background/95 p-2 shadow">
          <MapIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Réservations · Carte</span>
          <Separator orientation="vertical" className="mx-1 h-5" />
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (code, passager, trajet, bus...)"
              className="w-[260px] pl-8"
            />
          </div>
          <Sheet open={openList} onOpenChange={setOpenList}>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="ml-1">
                <ListChecks className="mr-2 h-4 w-4" />
                Lister
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[380px] sm:w-[420px]">
              <SheetHeader>
                <SheetTitle>Réservations ({filtered.length})</SheetTitle>
                <SheetDescription>Parcourez et sélectionnez pour centrer la carte et voir les détails.</SheetDescription>
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

          <Button asChild size="sm" variant="ghost" className="ml-1">
            <Link to="/reservations">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour à la liste
            </Link>
          </Button>
        </div>
      </div>

      {/* Map container (bg as visual fallback while style loads) */}
    <div
      ref={containerRef}
      className="absolute inset-0 bg-muted"
      style={{ minHeight: "100vh" }} // safety fallback in odd environments
    />

      {/* Selected reservation details (left sheet) */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="left" className="w-[380px] sm:w-[440px]">
          <SheetHeader>
            <div className="flex items-center justify-between">
              <SheetTitle>Détails</SheetTitle>
              <Button size="icon" variant="ghost" onClick={() => setSelected(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          {selected && (
            <div className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>{selected.code}</span>
                    <Badge variant="outline" className="capitalize">{selected.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-muted-foreground">
                    {selected.route?.from ?? "—"} → {selected.route?.to ?? "—"}
                  </div>
                  <div>
                    Passager: <span className="font-medium">{selected.passenger?.name ?? "—"}</span>
                    <div className="text-muted-foreground text-xs">{selected.passenger?.phone ?? "—"}</div>
                  </div>
                  <div>
                    Bus: {(selected.busIds ?? []).map((id) => busPlateById.get(id) ?? id).join(", ") || "—"}
                  </div>
                  <div>Sièges: {selected.seats ?? "—"}</div>
                  <div>Total: {typeof selected.priceTotal === "number" ? `${selected.priceTotal.toLocaleString("fr-FR")} FCFA` : "—"}</div>
                  {(selected as any).distanceKm ? (
                    <div>Distance: {(selected as any).distanceKm.toLocaleString("fr-FR")} km</div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => {
                    setEditing(selected)
                    setOpenEdit(true)
                  }}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit dialog reusing your existing Add/Edit component */}
      <AddEditReservationDialog
        open={openEdit}
        onOpenChange={(v) => setOpenEdit(v)}
        editing={editing}
        onSubmit={async (res) => {
          // optimistic update
          setRows((xs) => xs.map((x) => (x.id === res.id ? { ...x, ...res } : x)))
          try {
            const saved = await reservationApi.update(res.id, res)
            setRows((xs) => xs.map((x) => (x.id === res.id ? saved.data : x)))
            toast.success("Réservation mise à jour.")
            setEditing(null)
          } catch (e: any) {
            toast.error(e?.message ?? "Échec de la mise à jour.")
          }
        }}
        trips={[]}
        buses={buses as unknown as any[]}
      />
    </div>
  )
}
