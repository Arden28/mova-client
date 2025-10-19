import type { Trip } from "@/types";

export const trips: Trip[] = [
  {
    id: "t1",
    busId: "b1",
    routeId: "rt1",
    driverId: "p2",
    departureTime: "2025-10-18T07:30:00Z",
    arrivalTime: "2025-10-18T08:00:00Z",
    status: "scheduled",
    pricePerSeat: 1000,
    availableSeats: 20,
    createdAt: "2025-10-16T09:00:00Z",
  },
  {
    id: "t2",
    busId: "b2",
    routeId: "rt2",
    driverId: "p3",
    departureTime: "2025-10-18T09:00:00Z",
    arrivalTime: "2025-10-18T09:20:00Z",
    status: "scheduled",
    pricePerSeat: 800,
    availableSeats: 18,
    createdAt: "2025-10-16T09:30:00Z",
  },
];
