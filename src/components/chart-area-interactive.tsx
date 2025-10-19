"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import type { ChartConfig } from "@/components/ui/chart"

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "Un graphique interactif des réservations de bus pour les événements"

// Données de performance (exemple réaliste)
const chartData = [
  { date: "2025-07-01", reservations: 42, confirmées: 28 },
  { date: "2025-07-02", reservations: 50, confirmées: 33 },
  { date: "2025-07-03", reservations: 48, confirmées: 36 },
  { date: "2025-07-04", reservations: 60, confirmées: 45 },
  { date: "2025-07-05", reservations: 52, confirmées: 39 },
  { date: "2025-07-06", reservations: 70, confirmées: 51 },
  { date: "2025-07-07", reservations: 85, confirmées: 63 },
  { date: "2025-07-08", reservations: 80, confirmées: 59 },
  { date: "2025-07-09", reservations: 77, confirmées: 56 },
  { date: "2025-07-10", reservations: 90, confirmées: 72 },
  { date: "2025-07-11", reservations: 95, confirmées: 78 },
  { date: "2025-07-12", reservations: 88, confirmées: 70 },
  { date: "2025-07-13", reservations: 102, confirmées: 86 },
  { date: "2025-07-14", reservations: 99, confirmées: 81 },
  { date: "2025-07-15", reservations: 108, confirmées: 90 },
  { date: "2025-07-16", reservations: 115, confirmées: 97 },
  { date: "2025-07-17", reservations: 120, confirmées: 103 },
  { date: "2025-07-18", reservations: 125, confirmées: 109 },
  { date: "2025-07-19", reservations: 132, confirmées: 115 },
  { date: "2025-07-20", reservations: 140, confirmées: 122 },
]

const chartConfig = {
  bookings: {
    label: "Réservations de bus",
  },
  reservations: {
    label: "Total des réservations",
    color: "var(--primary)",
  },
  confirmées: {
    label: "Confirmées",
    color: "var(--chart-success)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [timeRange, setTimeRange] = React.useState("30d")

  React.useEffect(() => {
    if (isMobile) setTimeRange("7d")
  }, [isMobile])

  const filteredData = chartData.slice(
    timeRange === "7d" ? -7 : timeRange === "30d" ? -30 : -90
  )

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Performance des réservations</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Réservations quotidiennes vs confirmées
          </span>
          <span className="@[540px]/card:hidden">Tendances des réservations</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">3 derniers mois</ToggleGroupItem>
            <ToggleGroupItem value="30d">30 derniers jours</ToggleGroupItem>
            <ToggleGroupItem value="7d">7 derniers jours</ToggleGroupItem>
          </ToggleGroup>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 @[767px]/card:hidden"
              size="sm"
              aria-label="Sélectionner une période"
            >
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
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillReservations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--primary)" stopOpacity={1.0} />
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
                const date = new Date(value)
                return date.toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) =>
                    new Date(value).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="confirmées"
              type="natural"
              fill="url(#fillConfirmées)"
              stroke="var(--chart-success)"
              stackId="a"
            />
            <Area
              dataKey="reservations"
              type="natural"
              fill="url(#fillReservations)"
              stroke="var(--primary)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
