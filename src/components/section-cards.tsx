// components/section-cards.tsx
"use client"

import * as React from "react"
import {
  IconTrendingUp, IconTrendingDown, IconCalendarEvent, IconUsers, IconCash, IconBuilding,
} from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchCards } from "@/api/dashboard"

function DeltaBadge({ pct }: { pct: number }) {
  const up = pct >= 0
  const Icon = up ? IconTrendingUp : IconTrendingDown
  return (
    <Badge variant="outline">
      <Icon className="size-4" />
      {pct > 0 ? `+${pct} %` : `${pct} %`}
    </Badge>
  )
}

export function SectionCards() {
  const [loading, setLoading] = React.useState(true)
  const [data, setData] = React.useState<Awaited<ReturnType<typeof fetchCards>> | null>(null)

  React.useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const d = await fetchCards("30d")
        if (alive) setData(d)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  const t = data?.totals
  const fmtInt = (n?: number) => (n ?? 0).toLocaleString()
  const fmtMoney = (n?: number) => `${(n ?? 0).toLocaleString()} ${t?.gross_revenue.currency ?? "XAF"}`

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Réservations totales */}
      <Card className="@container/card" data-slot="card">
        <CardHeader>
          <CardDescription>Réservations totales (30 derniers jours)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? "…" : fmtInt(t?.reservations.value)}
          </CardTitle>
          <CardAction>{!loading && <DeltaBadge pct={t!.reservations.delta_pct} />}</CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Réservations confirmées <IconUsers className="size-4" />
          </div>
          <div className="text-muted-foreground">par rapport aux 30 jours précédents</div>
        </CardFooter>
      </Card>

      {/* Planifiées */}
      <Card className="@container/card" data-slot="card">
        <CardHeader>
          <CardDescription>Réservations planifiées (à venir)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? "…" : fmtInt(t?.planned.value)}
          </CardTitle>
          <CardAction>{!loading && <DeltaBadge pct={t!.planned.delta_pct} />}</CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Trajets programmés <IconCalendarEvent className="size-4" />
          </div>
          <div className="text-muted-foreground">fenêtre glissante de 30 jours</div>
        </CardFooter>
      </Card>

      {/* Recettes brutes */}
      <Card className="@container/card" data-slot="card">
        <CardHeader>
          <CardDescription>Recettes brutes (30 jours)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? "…" : fmtMoney(t?.gross_revenue.value)}
          </CardTitle>
          <CardAction>{!loading && <DeltaBadge pct={t!.gross_revenue.delta_pct} />}</CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Revenus issus des réservations <IconCash className="size-4" />
          </div>
          <div className="text-muted-foreground">avant partage partenaires</div>
        </CardFooter>
      </Card>

      {/* Partenaires & reversements */}
      <Card className="@container/card" data-slot="card">
        <CardHeader>
          <CardDescription>Partenaires & reversements dus</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {loading ? "…" : `${fmtInt(t?.partners_due.operators)} opérateurs · ${fmtMoney(t?.partners_due.due_amount)}`}
          </CardTitle>
          <CardAction>{!loading && <DeltaBadge pct={t!.partners_due.delta_pct} />}</CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Paiements à valider <IconBuilding className="size-4" />
          </div>
          <div className="text-muted-foreground">basé sur les trajets confirmés</div>
        </CardFooter>
      </Card>
    </div>
  )
}
