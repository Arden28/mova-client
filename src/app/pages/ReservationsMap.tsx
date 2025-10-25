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
const MAPBOX_TOKEN =
  "pk.eyJ1IjoiYXJkZW4tYm91ZXQiLCJhIjoiY21maWgyY3dvMGF1YTJsc2UxYzliNnA0ZCJ9.XC5hXXwEa-NCUPpPtBdWCA"
mapboxgl.accessToken = MAPBOX_TOKEN

type Waypoint = { lat: number; lng: number; label?: string }

// --- small utils ---
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number) {
  let t: number | undefined
  return (...args: Parameters<T>) => {
    if (t) window.clearTimeout(t)
    t = window.setTimeout(() => fn(...args), ms)
  }
}

export default function ReservationsMapPage() {
  const [rows, setRows] = React.useState<UIReservation[]>([])
  const [loading, setLoading] = React.useState(true)
  const [buses, setBuses] = React.useState<UIBus[]>([])
  const [query, setQuery] = React.useState("")
  const [openList, setOpenList] = React.useState(false)

  // Edit dialog
  const [editing, setEditing] = React.useState<UIReservation | null>(null)
  const [openEdit, setOpenEdit] = React.useState(false)

  // Selection
  const [selected, setSelected] = React.useState<UIReservation | null>(null)

  // Map refs/state
  const mapRef = React.useRef<mapboxgl.Map | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [mapLoaded, setMapLoaded] = React.useState(false)
  const [mapError, setMapError] = React.useState<string | null>(null)

  // Data source ref
  const dataRef = React.useRef<GeoJSON.FeatureCollection>({
    type: "FeatureCollection",
    features: [],
  })

  // Debouncers
  const debouncedResize = React.useMemo(
    () =>
      debounce(() => {
        try {
          mapRef.current?.resize()
        } catch {}
      }, 180),
    []
  )

  const debouncedFit = React.useMemo(
    () =>
      debounce((bounds: mapboxgl.LngLatBoundsLike) => {
        const map = mapRef.current
        if (!map) return
        try {
          const container = map.getContainer()
          const w = container.clientWidth
          const h = container.clientHeight
          const basePadding = 64
          const maxPad = Math.max(0, Math.floor(Math.min(w, h) / 2 - 4))
          const safePadding = Math.min(basePadding, maxPad)
          map.fitBounds(bounds, { padding: safePadding, maxZoom: 14, duration: 600 })
        } catch {}
      }, 120),
    []
  )

  // Load data
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

  // Init map once
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
        center: [36.8219, -1.2921], // Nairobi default
        zoom: 10,
        maxZoom: 19,
        accessToken: MAPBOX_TOKEN,
        localIdeographFontFamily: "'Noto Sans CJK', 'Arial Unicode MS', 'Segoe UI Symbol', sans-serif",
      })
      mapRef.current = map

      map.on("load", () => {
        setMapLoaded(true)

        // One source for everything (routes + waypoints)
        map.addSource("resv", { type: "geojson", data: dataRef.current })

        // ROUTE LINES
        map.addLayer({
          id: "resv-routes",
          type: "line",
          source: "resv",
          filter: ["==", ["get", "ftype"], "route"],
          paint: {
            "line-width": 3,
            "line-color": "#2563eb", // blue-600
            "line-opacity": 0.6,
          },
        })

        // WAYPOINTS (start/mid/end)
        map.addLayer({
          id: "resv-wp-start",
          type: "circle",
          source: "resv",
          filter: ["all", ["==", ["get", "ftype"], "waypoint"], ["==", ["get", "role"], "start"]],
          paint: {
            "circle-radius": 7,
            "circle-color": "#10b981", // emerald-500
            "circle-stroke-color": "#065f46",
            "circle-stroke-width": 1,
          },
        })
        map.addLayer({
          id: "resv-wp-mid",
          type: "circle",
          source: "resv",
          filter: ["all", ["==", ["get", "ftype"], "waypoint"], ["==", ["get", "role"], "mid"]],
          paint: {
            "circle-radius": 5,
            "circle-color": "#f59e0b", // amber-500
            "circle-stroke-color": "#92400e",
            "circle-stroke-width": 1,
          },
        })
        map.addLayer({
          id: "resv-wp-end",
          type: "circle",
          source: "resv",
          filter: ["all", ["==", ["get", "ftype"], "waypoint"], ["==", ["get", "role"], "end"]],
          paint: {
            "circle-radius": 7,
            "circle-color": "#ef4444", // red-500
            "circle-stroke-color": "#7f1d1d",
            "circle-stroke-width": 1,
          },
        })

        // Interactions: clicking lines OR points selects reservation
        const selectFromEvent = (e: mapboxgl.MapLayerMouseEvent) => {
          const f = e.features?.[0]
          const resvId = f?.properties?.resvId as string | undefined
          if (!resvId) return
          const r = rowsRef.current.find((x) => String(x.id) === resvId)
          if (!r) return
          setSelected(r)

          // If the feature is a waypoint, center on that exact point
          const geom = f.geometry as any
          const coords: [number, number] | undefined =
            f.layer.type === "circle" ? geom?.coordinates : undefined
          if (coords && mapRef.current) {
            mapRef.current.easeTo({ center: coords, zoom: Math.max(mapRef.current.getZoom(), 12) })
          }
        }

        map.on("click", "resv-routes", selectFromEvent)
        map.on("click", "resv-wp-start", selectFromEvent)
        map.on("click", "resv-wp-mid", selectFromEvent)
        map.on("click", "resv-wp-end", selectFromEvent)

        ;["resv-routes", "resv-wp-start", "resv-wp-mid", "resv-wp-end"].forEach((id) => {
          map.on("mouseenter", id, () => (map.getCanvas().style.cursor = "pointer"))
          map.on("mouseleave", id, () => (map.getCanvas().style.cursor = ""))
        })

        // Initial resize
        requestAnimationFrame(() => {
          try {
            map.resize()
          } catch {}
        })
      })

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

      // Debounced ResizeObserver
      const ro = new ResizeObserver(() => debouncedResize())
      ro.observe(containerRef.current)

      return () => {
        ro.disconnect()
        map.remove()
        mapRef.current = null
      }
    } catch (e: any) {
      setMapError(e?.message ?? "Impossible d'initialiser la carte.")
    }
  }, [debouncedResize])

  // Keep a ref of rows for event handlers
  const rowsRef = React.useRef(rows)
  React.useEffect(() => {
    rowsRef.current = rows
  }, [rows])

  // Filtered rows for search
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) =>
      [r.code, r.passenger?.name, r.passenger?.phone, r.route?.from, r.route?.to, ...(r.busIds ?? [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [rows, query])

  // Build GeoJSON (routes + waypoints) and fit to all points
  React.useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const features: GeoJSON.Feature[] = []
    const allLngLat: [number, number][] = []

    for (const r of filtered) {
      const wps = (r as any).waypoints as Waypoint[] | undefined
      if (!wps?.length) continue

      // Route line (entire sequence)
      const lineCoords: [number, number][] = wps.map((w) => [w.lng, w.lat])
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: lineCoords },
        properties: { ftype: "route", resvId: String(r.id) },
      })
      allLngLat.push(...lineCoords)

      // Waypoints (start/mid/end)
      wps.forEach((w, i) => {
        const role = i === 0 ? "start" : i === wps.length - 1 ? "end" : "mid"
        features.push({
          type: "Feature",
          geometry: { type: "Point", coordinates: [w.lng, w.lat] },
          properties: {
            ftype: "waypoint",
            role,
            idx: i,
            resvId: String(r.id),
            code: r.code ?? "",
          },
        })
      })
    }

    dataRef.current = { type: "FeatureCollection", features }
    const src = map.getSource("resv") as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(dataRef.current)

    // Camera
    if (!allLngLat.length) return
    if (allLngLat.length === 1) {
      const [lng, lat] = allLngLat[0]
      requestAnimationFrame(() => {
        try {
          map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 13), duration: 500 })
        } catch {}
      })
      return
    }

    const bounds = new mapboxgl.LngLatBounds(allLngLat[0], allLngLat[0])
    for (const c of allLngLat) bounds.extend(c)
    debouncedFit(bounds)
  }, [filtered, mapLoaded, debouncedFit])

  // Resize when sheets open/close so the map can re-measure its canvas (debounced)
  React.useEffect(() => {
    debouncedResize()
  }, [openList, selected, debouncedResize])

  /* -------------------------- Small helpers & UI -------------------------- */

  const busPlateById = React.useMemo(() => {
    const m = new Map<string, string>()
    for (const b of buses) if (b?.id) m.set(String(b.id), b.plate ?? String(b.id))
    return m
  }, [buses])

  function RowItem({ r }: { r: UIReservation }) {
    const wps = (r as any).waypoints as Waypoint[] | undefined
    const hasMulti = (wps?.length ?? 0) > 2
    return (
      <button
        className="group w-full text-left rounded-xl border p-3 hover:bg-accent/50 transition"
        onClick={() => {
          setSelected(r)
          setOpenList(false)
          if (wps?.length && mapRef.current) {
            const coords: [number, number][] = wps.map((w) => [w.lng, w.lat])
            const bounds = new mapboxgl.LngLatBounds(coords[0], coords[0])
            coords.forEach((c) => bounds.extend(c))
            // Fit the whole trip
            try {
              mapRef.current.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 500 })
            } catch {}
          }
        }}
      >
        <div className="flex items-center justify-between">
          <div className="font-medium flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {r.code}
            </span>
            <span className="text-muted-foreground text-xs">
              {(r.route?.from ?? "—")} → {(r.route?.to ?? "—")}
              {hasMulti && <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px]">+{(wps!.length - 2)} stops</span>}
            </span>
          </div>
          <Badge variant="outline" className="capitalize">{r.status}</Badge>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>Bus: {(r.busIds ?? []).map((id) => busPlateById.get(id) ?? id).join(", ") || "—"}</div>
          <div>Sièges: {r.seats ?? "—"}</div>
          {typeof (r as any).distanceKm === "number" && (
            <div>Distance: {(r as any).distanceKm.toLocaleString("fr-FR")} km</div>
          )}
          {typeof r.priceTotal === "number" && (
            <div>Total: {r.priceTotal.toLocaleString("fr-FR")} FCFA</div>
          )}
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

      {/* Top bar */}
      <div className="pointer-events-none absolute left-4 top-4 z-20 flex w-[min(860px,calc(100vw-2rem))] flex-wrap gap-2">
        <div className="pointer-events-auto flex items-center gap-2 rounded-xl border bg-background/95 p-2 pr-3 shadow-lg">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
            <MapIcon className="h-4 w-4" />
            <span className="text-sm font-medium">Réservations · Carte</span>
          </div>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (code, passager, trajet, bus...)"
              className="w-[300px] pl-8 rounded-full"
            />
          </div>
          <div className="ml-auto inline-flex items-center gap-2">
            <Sheet open={openList} onOpenChange={setOpenList}>
              <SheetTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-full">
                  <ListChecks className="mr-2 h-4 w-4" />
                  Lister <span className="ml-2 rounded-full bg-muted px-2 text-xs">{filtered.length}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[420px]">
                <SheetHeader>
                  <SheetTitle>Réservations ({filtered.length})</SheetTitle>
                  <SheetDescription>Parcourez et sélectionnez pour centrer la carte et voir les détails.</SheetDescription>
                </SheetHeader>
                <div className="mt-4">
                  <ScrollArea className="h-[calc(100vh-12rem)] pr-2">
                    <div className="grid gap-2">
                      {loading && <div className="text-sm text-muted-foreground">Chargement…</div>}
                      {!loading && filtered.length === 0 && (
                        <div className="text-sm text-muted-foreground">Aucun résultat.</div>
                      )}
                      {!loading && filtered.map((r) => <RowItem key={r.id} r={r} />)}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
            <Button asChild size="sm" variant="ghost" className="rounded-full">
              <Link to="/reservations">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Map container (fills page) */}
      <div
        ref={containerRef}
        className="absolute inset-0 bg-muted"
        style={{ minHeight: "100vh" }}
      />

      {/* Selected reservation details (left sheet) */}
      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent side="left" className="w-[400px]">
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
              <Card className="rounded-xl border">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-sm text-primary">
                      {selected.code}
                    </span>
                    <Badge variant="outline" className="capitalize">{selected.status}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="text-muted-foreground">
                    {selected.route?.from ?? "—"} → {selected.route?.to ?? "—"}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-muted-foreground">Passager</div>
                      <div className="font-medium">{selected.passenger?.name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{selected.passenger?.phone ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Bus</div>
                      <div>{(selected.busIds ?? []).map((id) => busPlateById.get(id) ?? id).join(", ") || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Sièges</div>
                      <div>{selected.seats ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total</div>
                      <div>
                        {typeof selected.priceTotal === "number"
                          ? `${selected.priceTotal.toLocaleString("fr-FR")} FCFA`
                          : "—"}
                      </div>
                    </div>
                    {(selected as any).distanceKm ? (
                      <div>
                        <div className="text-xs text-muted-foreground">Distance</div>
                        <div>{(selected as any).distanceKm.toLocaleString("fr-FR")} km</div>
                      </div>
                    ) : null}
                  </div>

                  {/* Waypoints preview */}
                  {Array.isArray((selected as any).waypoints) && (selected as any).waypoints.length > 0 && (
                    <div className="pt-2">
                      <div className="text-xs text-muted-foreground mb-1">Étapes ({(selected as any).waypoints.length})</div>
                      <div className="flex flex-wrap gap-1">
                        {(selected as any).waypoints.map((w: Waypoint, i: number) => (
                          <span
                            key={i}
                            className={[
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] border",
                              i === 0
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : i === (selected as any).waypoints.length - 1
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-amber-50 border-amber-200 text-amber-700",
                            ].join(" ")}
                          >
                            {i === 0 ? "A" : i === (selected as any).waypoints.length - 1 ? "B" : i}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
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
