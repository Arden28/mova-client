import {
  IconTrendingUp,
  IconTrendingDown,
  IconCalendarEvent,
  IconUsers,
  IconCash,
  IconBuilding,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {/* Réservations totales */}
      <Card className="@container/card" data-slot="card">
        <CardHeader>
          <CardDescription>Réservations totales (30 derniers jours)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            3 245
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="size-4" />
              +8,2 %
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Réservations confirmées <IconUsers className="size-4" />
          </div>
          <div className="text-muted-foreground">
            par rapport aux 30 jours précédents
          </div>
        </CardFooter>
      </Card>

      {/* Réservations planifiées */}
      <Card className="@container/card" data-slot="card">
        <CardHeader>
          <CardDescription>Réservations planifiées (à venir)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            128
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="size-4" />
              +5,4 %
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Trajets programmés pour les prochains événements <IconCalendarEvent className="size-4" />
          </div>
          <div className="text-muted-foreground">
            incluant les réservations de groupe et les départs confirmés
          </div>
        </CardFooter>
      </Card>

      {/* Recettes brutes */}
      <Card className="@container/card" data-slot="card">
        <CardHeader>
          <CardDescription>Recettes brutes (30 jours)</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            12 450 000 FCFA
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="size-4" />
              +9,3 %
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Revenus issus des réservations <IconCash className="size-4" />
          </div>
          <div className="text-muted-foreground">
            avant partage avec les opérateurs partenaires
          </div>
        </CardFooter>
      </Card>

      {/* Partenaires et reversements */}
      <Card className="@container/card" data-slot="card">
        <CardHeader>
          <CardDescription>Partenaires & reversements dus</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            11 opérateurs · 6 320 000 FCFA
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown className="size-4" />
              -1,2 %
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Paiements à valider cette semaine <IconBuilding className="size-4" />
          </div>
          <div className="text-muted-foreground">
            selon les contrats de collaboration avec les transporteurs
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
