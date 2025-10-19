import { IconTrendingUp, IconTrendingDown, IconBus, IconUsers, IconCash, IconStar } from "@tabler/icons-react"

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
      {/* Total Bookings */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Bookings</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            3,245
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="size-4" />
              +8.2%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Increasing weekly bookings <IconBus className="size-4" />
          </div>
          <div className="text-muted-foreground">Compared to last 30 days</div>
        </CardFooter>
      </Card>

      {/* Active Routes */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Active Routes</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            58
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingDown className="size-4" />
              -3.4%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Route updates required <IconBus className="size-4" />
          </div>
          <div className="text-muted-foreground">Some routes inactive</div>
        </CardFooter>
      </Card>

      {/* Total Revenue */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Revenue</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            $84,900
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="size-4" />
              +14.2%
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Revenue growth sustained <IconCash className="size-4" />
          </div>
          <div className="text-muted-foreground">Based on recent bookings</div>
        </CardFooter>
      </Card>

      {/* Customer Satisfaction */}
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Customer Rating</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            4.7 / 5
          </CardTitle>
          <CardAction>
            <Badge variant="outline">
              <IconTrendingUp className="size-4" />
              +0.3
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="flex gap-2 font-medium">
            Excellent service feedback <IconStar className="size-4" />
          </div>
          <div className="text-muted-foreground">From latest 1K reviews</div>
        </CardFooter>
      </Card>
    </div>
  )
}
