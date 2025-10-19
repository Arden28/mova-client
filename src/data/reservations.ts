import type { Payment, Reservation, Trip } from "@/types";

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

export const reservations: Reservation[] = [
  {
    id: "r1",
    code: "BZV-000125",
    tripDate: "2025-10-18",
    route: { from: "Marché Total", to: "Talangai" },
    passenger: {
      name: "Clarisse M.",
      phone: "+242066789001",
      email: "clarisse@example.com",
    },
    seats: 2,
    busIds: ["b1"], // 👈 changed from busId to busIds
    priceTotal: 2000,
    status: "confirmed",
    createdAt: "2025-10-16T08:40:00Z",
    tripId: "t1",
  },
  {
    id: "r2",
    code: "BZV-000126",
    tripDate: "2025-10-18",
    route: { from: "Moungali", to: "Mfilou" },
    passenger: { name: "Jean-Pierre T.", phone: "+242067112233" },
    seats: 1,
    busIds: ["b2"], // 👈 changed from busId to busIds
    priceTotal: 800,
    status: "pending",
    createdAt: "2025-10-16T09:05:00Z",
    tripId: "t2",
  },
];

export const payments: Payment[] = [
  {
    id: "pay1",
    bookingId: "r1",
    amount: 2000,
    method: "momo",
    status: "paid",
    transactionRef: "TXN-BZV-22341",
    createdAt: "2025-10-16T09:00:00Z",
  },
  {
    id: "pay2",
    bookingId: "r2",
    amount: 800,
    method: "cash",
    status: "pending",
    createdAt: "2025-10-16T09:10:00Z",
  },
];
