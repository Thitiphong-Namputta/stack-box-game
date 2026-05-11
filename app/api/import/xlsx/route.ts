import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import type { ParsedFile } from '@/lib/import/types'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(arrayBuffer as ArrayBuffer)

    const sheet = wb.worksheets[0]
    if (!sheet) {
      return NextResponse.json<ParsedFile>({ headers: [], rows: [], errors: ['Workbook ว่างเปล่า'] })
    }

    const headerRow = sheet.getRow(1)
    const headers: string[] = []
    headerRow.eachCell((cell, col) => {
      headers[col - 1] = String(cell.value ?? '').trim()
    })

    const rows: ParsedFile['rows'] = []
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r)
      if (!row.hasValues) continue
      const data: Record<string, string> = {}
      headers.forEach((h, i) => {
        const cell = row.getCell(i + 1)
        // Handle formula cells — use .result if available
        const val = typeof cell.value === 'object' && cell.value !== null && 'result' in cell.value
          ? (cell.value as { result: unknown }).result
          : cell.value
        data[h] = String(val ?? '').trim()
      })
      rows.push({ rowNumber: r, data })
    }

    return NextResponse.json<ParsedFile>({ headers, rows, errors: [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
