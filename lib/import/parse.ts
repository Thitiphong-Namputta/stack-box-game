import Papa from 'papaparse'
import type { ParsedFile } from './types'

export async function parseCSV(file: File): Promise<ParsedFile> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        resolve({
          headers: results.meta.fields ?? [],
          rows: (results.data as Record<string, string>[]).map((data, i) => ({
            rowNumber: i + 2,
            data,
          })),
          errors: results.errors.map((e) => `Row ${e.row ?? '?'}: ${e.message}`),
        })
      },
      error: (err) => {
        resolve({ headers: [], rows: [], errors: [err.message] })
      },
    })
  })
}

/** Parse XLSX via the server-side API route (ExcelJS is Node-only) */
export async function parseXLSX(file: File): Promise<ParsedFile> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch('/api/import/xlsx', { method: 'POST', body: formData })
  if (!res.ok) {
    const msg = await res.text().catch(() => 'Unknown error')
    return { headers: [], rows: [], errors: [`Server error: ${msg}`] }
  }
  return res.json() as Promise<ParsedFile>
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'csv') return parseCSV(file)
  if (ext === 'xlsx' || ext === 'xls') return parseXLSX(file)
  return { headers: [], rows: [], errors: [`ไม่รองรับไฟล์ประเภท .${ext}`] }
}
