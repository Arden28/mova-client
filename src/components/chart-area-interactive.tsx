// components/chart-area-interactive.tsx
"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import { useIsMobile } from "@/hooks/use-mobile"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ChartConfig } from "@/components/ui/chart"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { fetchSeries } from "@/api/dashboard"

const chartConfig = {
  bookings: { label: "Réservations de bus" },
  reservations: { label: "Total des réservations", color: "var(--primary)" },
  confirmées: { label: "Confirmées", color: "var(--chart-success)" },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState<"7d"|"30d"|"90d">("30d")
  const [data, setData] = React.useState<{ date: string; reservations: number; confirmées: number }[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => { if (isMobile) setTimeRange("7d") }, [isMobile])

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await fetchSeries(timeRange)
        if (alive) setData(res.data)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [timeRange])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Performance des réservations</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">Réservations quotidiennes vs confirmées</span>
          <span className="@[540px]/card:hidden">Tendances des réservations</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(v) => v && setTimeRange(v as any)}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 derniers mois</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 derniers jours</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 derniers jours</ToggleGroupItem>
          </ToggleGroup>

          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
            <SelectTrigger className="flex w-40 @[767px]/card:hidden" size="sm" aria-label="Sélectionner une période">
              <SelectValue placeholder="30 derniers jours" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d">3 derniers mois</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="7d">7 derniers jours</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="fillReservations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" />
                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillConfirmées" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-success)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--chart-success)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const d = new Date(value + "T00:00:00")
                return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
                  }
                  indicator="dot"
                />
              }
            />
            <Area dataKey="confirmées" type="natural" fill="url(#fillConfirmées)" stroke="var(--chart-success)" stackId="a" />
            <Area dataKey="reservations" type="natural" fill="url(#fillReservations)" stroke="var(--primary)" stackId="a" />
          </AreaChart>
        </ChartContainer>
        {loading && <div className="mt-2 text-xs text-muted-foreground">Chargement…</div>}
      </CardContent>
    </Card>
  )
}
