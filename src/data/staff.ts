
// ==============================
// Staff (Agents & Admins)
// ==============================

import type { Person } from "@/types"

// If your global Role type doesn't include "agent" | "admin",
// define a local Staff type derived from Person:
type StaffRole = "agent" | "admin"
export type Staff = Omit<Person, "role" | "licenseNo"> & { role: StaffRole }

/* -------------------------------------------------------------------------- */
/*                                   Staff                                    */
/* -------------------------------------------------------------------------- */
export const staff: Staff[] = [
  // Admins
  {
    id: "s1",
    role: "admin",
    name: "Aline Mbemba",
    phone: "+242067000111",
    email: "aline.mbemba@mova-mobility.com",
  },
  {
    id: "s2",
    role: "admin",
    name: "Patrick Loukaka",
    phone: "+242067000222",
    email: "patrick.loukaka@mova-mobility.com",
  },

  // Agents
  {
    id: "s3",
    role: "agent",
    name: "Mireille Okomo",
    phone: "+242067000333",
    email: "mireille.okomo@mova-mobility.com",
  },
  {
    id: "s4",
    role: "agent",
    name: "Gildas Makita",
    phone: "+242067000444",
    email: "gildas.makita@mova-mobility.com",
  },
  {
    id: "s5",
    role: "agent",
    name: "Prisca Mavouadi",
    phone: "+242067000555",
    email: "prisca.mavouadi@mova-mobility.com",
  },
  {
    id: "s6",
    role: "agent",
    name: "Dieudonné Ikama",
    phone: "+242067000666",
    email: "dieudonne.ikama@mova-mobility.com",
  },
  {
    id: "s7",
    role: "agent",
    name: "Romaric Kodia",
    phone: "+242067000777",
    email: "romaric.kodia@mova-mobility.com",
  },
  {
    id: "s8",
    role: "agent",
    name: "Nadia Ndinga",
    phone: "+242067000888",
    email: "nadia.ndinga@mova-mobility.com",
  },
]

/* -------------------------------------------------------------------------- */
/*                                  Helpers                                   */
/* -------------------------------------------------------------------------- */

// Quick index if you need O(1) lookups by id.
export const staffById = new Map(staff.map((s) => [s.id, s]))
