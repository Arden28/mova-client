import api from "@/api/apiService"

export type CardsResponse = {
  range: "7d"|"30d"|"90d"
  totals: {
    reservations: { value: number; delta_pct: number }
    planned:      { value: number; delta_pct: number }
    gross_revenue:{ value: number; delta_pct: number; currency: string }
    partners_due: { operators: number; due_amount: number; currency: string; delta_pct: number }
  }
}

export type SeriesResponse = {
  range: "7d"|"30d"|"90d"
  data: Array<{ date: string; reservations: number; confirmées: number }>
}

export async function fetchCards(range: "7d"|"30d"|"90d" = "30d") {
  const res = await api.get<CardsResponse>(`/dash/cards?range=${range}`)
  return res.data
}

export async function fetchSeries(range: "7d"|"30d"|"90d" = "30d") {
  const res = await api.get<SeriesResponse>(`/dash/series?range=${range}`)
  return res.data
}
