import ExcelJS from "exceljs"

export async function readSpreadsheet(file: File): Promise<{
  headers: string[]
  rows: Record<string, any>[]
}> {
  const ext = file.name.split(".").pop()?.toLowerCase()

  const buffer = await file.arrayBuffer()
  const workbook = new ExcelJS.Workbook()

  if (ext === "csv") {
    const text = new TextDecoder("utf-8").decode(buffer)
    const csvRows = text
      .split(/\r?\n/)
      .map((line) => line.split(",").map((x) => x.trim()))
      .filter((r) => r.length && r.some(Boolean))
    const headers = csvRows[0]
    const dataRows = csvRows.slice(1)
    const rows = dataRows.map((r) =>
      Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""]))
    )
    return { headers, rows }
  }

  await workbook.xlsx.load(buffer)
  const ws = workbook.worksheets[0]
  if (!ws) return { headers: [], rows: [] }

  const headers: string[] = []
  const rows: Record<string, any>[] = []

  ws.eachRow((row, rowNum) => {
    const values = row.values as (string | undefined)[]
    if (rowNum === 1) {
      for (const val of values) if (val) headers.push(String(val))
    } else {
      const obj: Record<string, any> = {}
      headers.forEach((h, i) => {
        obj[h] = values[i + 1] ?? ""
      })
      rows.push(obj)
    }
  })

  return { headers, rows }
}
