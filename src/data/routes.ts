import type { Route, Stop } from "@/types";

export const stops: Stop[] = [
  { id: "s1", name: "Marché Total", city: "Brazzaville", orderIndex: 1 },
  { id: "s2", name: "Poto-Poto", city: "Brazzaville", orderIndex: 2 },
  { id: "s3", name: "Ouenze", city: "Brazzaville", orderIndex: 3 },
  { id: "s4", name: "Talangai", city: "Brazzaville", orderIndex: 4 },
  { id: "s5", name: "Moungali", city: "Brazzaville", orderIndex: 5 },
  { id: "s6", name: "Mfilou", city: "Brazzaville", orderIndex: 6 },
];

export const routes: Route[] = [
  {
    id: "rt1",
    code: "BZV-001",
    originStopId: "s1",
    destinationStopId: "s4",
    distanceKm: 12,
    durationEstimate: 30,
    stops: [stops[0], stops[1], stops[2], stops[3]],
  },
  {
    id: "rt2",
    code: "BZV-002",
    originStopId: "s5",
    destinationStopId: "s6",
    distanceKm: 8,
    durationEstimate: 20,
    stops: [stops[4], stops[5]],
  },
];
