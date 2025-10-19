// ==============================
// Shared Types
// ==============================
export type UUID = string;

export type Timestamp = string; // ISO datetime
export type ISODate = string;   // e.g. "2025-10-17"

export type ReservationStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export type TripStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

export type BusStatus = "active" | "maintenance" | "inactive";

export type Role = "driver" | "owner" | "conductor" | "agent" | "admin";

// ==============================
// Person / User
// ==============================
export interface Person {
  id: UUID;
  role: Role;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  password?: string;
  licenseNo?: string; // For drivers only
  createdAt?: Timestamp;
}

// ==============================
// Bus & Fleet
// ==============================

export interface InsuranceInfo {
  provider: string;
  policyNumber: string;
  validUntil: string; // ISO date
}

export interface Bus {
  id: UUID;
  plate: string;
  capacity: number;
  operatorId?: UUID;         // Link to Person (owner)
  assignedDriverId?: UUID;   // Currently assigned driver
  name?: string;             // Friendly label / fleet name
  type?: "standard" | "luxury" | "minibus";
  status?: BusStatus;        // active, maintenance, etc.
  model?: string;            // e.g., Toyota Coaster
  year?: number;             // manufacture year
  mileage?: number;          // in km
  lastServiceDate?: string;  // ISO date
  insurance?: InsuranceInfo; // optional insurance info
  createdAt?: string;        // ISO datetime
}

// ==============================
// Route & Stops
// ==============================
export interface Stop {
  id: UUID;
  name: string;
  city?: string;
  location?: { lat: number; lng: number };
  orderIndex?: number; // useful for route stops
}

export interface Route {
  id: UUID;
  code: string;
  originStopId: UUID;
  destinationStopId: UUID;
  distanceKm?: number;
  durationEstimate?: number; // in minutes
  stops?: Stop[];
}

// ==============================
// Trip & Schedule
// ==============================
export interface Trip {
  id: UUID;
  busId: UUID;
  routeId: UUID;
  driverId?: UUID;
  conductorId?: UUID;
  departureTime: Timestamp;
  arrivalTime?: Timestamp;
  status: TripStatus;
  pricePerSeat: number;
  availableSeats: number;
  createdAt: Timestamp;
}

// ==============================
// Reservation & Payment
// ==============================
export interface Reservation {
  id: UUID;
  code: string;
  tripId: UUID;
  tripDate: ISODate;
  route: { from: string; to: string };
  passenger: { name: string; phone: string; email?: string };
  seats: number;
  busIds: UUID[];
  priceTotal: number; // in XAF
  status: ReservationStatus;
  paymentId?: UUID;
  createdAt: Timestamp;
}

export interface Payment {
  id: UUID;
  bookingId: UUID;
  amount: number;
  method: "cash" | "mpesa" | "card" | "momo";
  status: "pending" | "paid" | "failed" | "refunded";
  transactionRef?: string;
  createdAt: Timestamp;
}
