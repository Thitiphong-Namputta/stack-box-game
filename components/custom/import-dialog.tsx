'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle2, X, Download, ChevronRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useSceneStore, getNextColor } from '@/store/use-scene-store'
import { useBinPacking } from '@/lib/packing/use-bin-packing'
import { parseFile } from '@/lib/import/parse'
import { detectMapping, REQUIRED_FIELDS, FIELD_LABELS } from '@/lib/import/auto-detect'
import { validateRows } from '@/lib/import/validate-rows'
import { rowsToBoxes, rowsToCatalogItems } from '@/lib/import/transform-rows'
import { createCatalogItem } from '@/lib/api-client'
import type { FieldKey, ParsedRow, ValidatedRow } from '@/lib/import/types'
import { nanoid } from 'nanoid'

type WizardStep = 'upload' | 'mapping' | 'preview' | 'done'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 'plan' = add boxes to current scene; 'catalog' = save to catalog; 'both' = both */
  target?: 'plan' | 'catalog' | 'both'
}

// ── Step 1: Dropzone ────────────────────────────────────────────────

function Dropzone({ onFile }: { onFile: (file: File) => void }) {
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(ext ?? '')) return
    onFile(file)
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
      }}
      onClick={() => inputRef.current?.click()}
      className={[
        'flex flex-col items-center justify-center gap-4 p-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
        isDragOver
          ? 'border-indigo-500 bg-indigo-500/10'
          : 'an-border-outline-variant hover:border-indigo-400 hover:bg-indigo-500/5',
      ].join(' ')}
    >
      <Upload className="w-10 h-10 an-text-on-surface-muted" />
      <div className="text-center">
        <p className="text-sm font-semibold an-text-on-surface">
          ลากไฟล์มาวาง หรือคลิกเพื่อเลือก
        </p>
        <p className="text-xs an-text-on-surface-muted mt-1">รองรับ .csv, .xlsx, .xls</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />
    </div>
  )
}

// ── Step 2: Column Mapper ───────────────────────────────────────────

function ColumnMapper({
  headers,
  rows,
  mapping,
  onChange,
}: {
  headers: string[]
  rows: ParsedRow[]
  mapping: Partial<Record<FieldKey, string>>
  onChange: (m: Partial<Record<FieldKey, string>>) => void
}) {
  const ALL_FIELDS: FieldKey[] = [
    'name', 'w', 'h', 'd', 'weight', 'qty',
    'category', 'fragile', 'thisSideUp', 'nonStackable', 'cannotBeStackedOn',
    'maxStackWeight', 'hazmat', 'priority', 'temperature',
  ]
  const sampleRow = rows[0]?.data ?? {}

  return (
    <div className="overflow-auto max-h-80">
      <table className="w-full text-xs">
        <thead>
          <tr className="an-text-on-surface-muted border-b border-an-outline-variant">
            <th className="text-left py-2 pr-3 font-semibold w-4">Required</th>
            <th className="text-left py-2 pr-3 font-semibold">Field</th>
            <th className="text-left py-2 pr-3 font-semibold">Column จากไฟล์</th>
            <th className="text-left py-2 font-semibold">ตัวอย่างข้อมูล</th>
          </tr>
        </thead>
        <tbody>
          {ALL_FIELDS.map((field) => {
            const isRequired = REQUIRED_FIELDS.includes(field)
            const selected = mapping[field] ?? ''
            const sample = selected ? sampleRow[selected] ?? '' : ''
            return (
              <tr key={field} className="border-b border-an-outline-variant/30">
                <td className="py-1.5 pr-3">
                  {isRequired && <span className="text-red-500 font-bold">*</span>}
                </td>
                <td className="py-1.5 pr-3 an-text-on-surface font-medium">
                  {FIELD_LABELS[field]}
                </td>
                <td className="py-1.5 pr-3">
                  <select
                    value={selected}
                    onChange={(e) => onChange({ ...mapping, [field]: e.target.value || undefined })}
                    className="an-input rounded px-2 py-1 text-xs w-full"
                  >
                    <option value="">— ไม่เลือก —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </td>
                <td className="py-1.5 an-text-on-surface-muted font-mono truncate max-w-[120px]">
                  {sample}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Step 3: Preview Table ───────────────────────────────────────────

const PAGE_SIZE = 50

function PreviewTable({ validated }: { validated: ValidatedRow[] }) {
  const [page, setPage] = useState(0)
  const pageCount = Math.ceil(validated.length / PAGE_SIZE)
  const slice = validated.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="space-y-2">
      <div className="overflow-auto max-h-60 rounded border border-an-outline-variant">
        <table className="w-full text-xs">
          <thead className="sticky top-0 an-bg-surface-container">
            <tr className="an-text-on-surface-muted border-b border-an-outline-variant">
              <th className="text-left px-2 py-1.5 font-semibold">Row</th>
              <th className="text-left px-2 py-1.5 font-semibold">ชื่อ</th>
              <th className="text-left px-2 py-1.5 font-semibold">ขนาด (cm)</th>
              <th className="text-left px-2 py-1.5 font-semibold">น้ำหนัก</th>
              <th className="text-left px-2 py-1.5 font-semibold">จำนวน</th>
              <th className="text-left px-2 py-1.5 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((row) => (
              <tr
                key={row.rowNumber}
                className={row.errors.length > 0
                  ? 'bg-red-500/10 border-b border-red-500/20'
                  : 'border-b border-an-outline-variant/20'}
              >
                <td className="px-2 py-1 font-mono an-text-on-surface-muted">{row.rowNumber}</td>
                <td className="px-2 py-1 an-text-on-surface">{row.parsed?.name ?? row.rawData.name ?? '—'}</td>
                <td className="px-2 py-1 font-mono an-text-on-surface-muted">
                  {row.parsed ? `${row.parsed.size.w}×${row.parsed.size.h}×${row.parsed.size.d}` : '—'}
                </td>
                <td className="px-2 py-1 font-mono an-text-on-surface-muted">
                  {row.parsed ? `${row.parsed.weight} kg` : '—'}
                </td>
                <td className="px-2 py-1 font-mono an-text-on-surface-muted">
                  {row.parsed?.qty ?? '—'}
                </td>
                <td className="px-2 py-1">
                  {row.errors.length > 0 ? (
                    <span title={row.errors.join('\n')} className="text-red-500 flex items-center gap-1 cursor-help">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      {row.errors[0]}
                    </span>
                  ) : (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-xs an-text-on-surface-muted">
          <button
            type="button"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 rounded disabled:opacity-30 an-btn-outline-primary"
          >
            ← ก่อนหน้า
          </button>
          <span>{page + 1} / {pageCount}</span>
          <button
            type="button"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 rounded disabled:opacity-30 an-btn-outline-primary"
          >
            ถัดไป →
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main ImportDialog ───────────────────────────────────────────────

export function ImportDialog({ open, onOpenChange, target = 'both' }: ImportDialogProps) {
  const { addBox, addCatalogItemWithId } = useSceneStore()
  const { getSuggestedPosition } = useBinPacking()

  const [step, setStep] = useState<WizardStep>('upload')
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({})
  const [validated, setValidated] = useState<ValidatedRow[]>([])
  const [loading, setLoading] = useState(false)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [addToPlan, setAddToPlan] = useState(target !== 'catalog')
  const [saveToCatalog, setSaveToCatalog] = useState(target !== 'plan')
  const [summary, setSummary] = useState<{ imported: number; expanded: number; catalogSaved: number; failed: number } | null>(null)

  const reset = useCallback(() => {
    setStep('upload')
    setFileName('')
    setHeaders([])
    setRows([])
    setMapping({})
    setValidated([])
    setLoading(false)
    setParseErrors([])
    setSummary(null)
  }, [])

  const handleClose = (o: boolean) => {
    if (!o) reset()
    onOpenChange(o)
  }

  // Step 1 → 2: parse file
  const handleFile = async (file: File) => {
    setLoading(true)
    setFileName(file.name)
    const parsed = await parseFile(file)
    setLoading(false)
    if (parsed.errors.length > 0 && parsed.rows.length === 0) {
      setParseErrors(parsed.errors)
      return
    }
    setParseErrors(parsed.errors)
    setHeaders(parsed.headers)
    setRows(parsed.rows)
    setMapping(detectMapping(parsed.headers))
    setStep('mapping')
  }

  // Step 2 → 3: validate
  const handleGoPreview = () => {
    const v = validateRows(rows, mapping)
    setValidated(v)
    setStep('preview')
  }

  const isMappingComplete = REQUIRED_FIELDS.every((f) => !!mapping[f])
  const validRows = validated.filter((v) => v.errors.length === 0)
  const errorRows = validated.filter((v) => v.errors.length > 0)

  // Step 3: import
  const handleImport = async () => {
    setLoading(true)
    let catalogSaved = 0

    if (saveToCatalog) {
      const items = rowsToCatalogItems(validRows)
      await Promise.allSettled(
        items.map(async (item) => {
          try {
            const created = await createCatalogItem(item)
            addCatalogItemWithId(created)
          } catch {
            addCatalogItemWithId({ ...item, id: nanoid(8) })
          }
          catalogSaved++
        })
      )
    }

    let expanded = 0
    if (addToPlan) {
      const boxes = rowsToBoxes(validRows)
      expanded = boxes.length
      for (const box of boxes) {
        const suggested = getSuggestedPosition(box)
        if (suggested) {
          box.position = { x: suggested.x, y: suggested.y, z: suggested.z }
        }
        addBox(box)
      }
    }

    setLoading(false)
    setSummary({
      imported: validRows.length,
      expanded,
      catalogSaved,
      failed: errorRows.length,
    })
    setStep('done')
  }

  // Error report download
  const downloadErrorReport = () => {
    const errors = validated.filter((v) => v.errors.length > 0)
    const csv = [
      'Row,Name,Errors,Raw Data',
      ...errors.map((e) => [
        e.rowNumber,
        e.rawData.name ?? '',
        `"${e.errors.join('; ')}"`,
        `"${JSON.stringify(e.rawData).replace(/"/g, '""')}"`,
      ].join(',')),
    ].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `import-errors-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stepLabel: Record<WizardStep, string> = {
    upload: 'อัปโหลดไฟล์',
    mapping: 'จับคู่ Column',
    preview: 'ตรวจสอบข้อมูล',
    done: 'เสร็จสิ้น',
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="an-dialog-content sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="an-text-on-surface flex items-center gap-2">
            <FileText className="w-5 h-5 an-text-primary" />
            Import CSV / Excel
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        {step !== 'done' && (
          <div className="flex items-center gap-1 text-[10px] font-mono an-text-on-surface-muted mb-4">
            {(['upload', 'mapping', 'preview'] as WizardStep[]).map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                <span className={step === s ? 'an-text-primary font-bold' : ''}>
                  {i + 1}. {stepLabel[s]}
                </span>
                {i < 2 && <ChevronRight className="w-3 h-3" />}
              </span>
            ))}
          </div>
        )}

        {/* ── Step 1: Upload ── */}
        {step === 'upload' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16 an-text-on-surface-muted text-sm">
                กำลังอ่านไฟล์...
              </div>
            ) : (
              <Dropzone onFile={handleFile} />
            )}
            {parseErrors.length > 0 && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 space-y-1">
                {parseErrors.map((e, i) => (
                  <p key={i} className="text-xs text-red-400 flex items-start gap-1">
                    <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                    {e}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Mapping ── */}
        {step === 'mapping' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs an-text-on-surface-muted">
                ไฟล์: <span className="font-mono an-text-on-surface">{fileName}</span>
                <span className="ml-2">({rows.length} แถว, {headers.length} columns)</span>
              </p>
            </div>

            <ColumnMapper
              headers={headers}
              rows={rows}
              mapping={mapping}
              onChange={setMapping}
            />

            {!isMappingComplete && (
              <p className="text-xs text-amber-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                กรุณาเลือก column สำหรับ field ที่มี * ก่อน
              </p>
            )}

            <DialogFooter className="gap-2">
              <button type="button" onClick={() => setStep('upload')} className="px-3 py-1.5 text-sm rounded-lg an-btn-outline-primary">
                ← กลับ
              </button>
              <button
                type="button"
                onClick={handleGoPreview}
                disabled={!isMappingComplete}
                className="px-4 py-1.5 text-sm font-bold rounded-lg an-btn-autopack disabled:opacity-40"
              >
                ดูตัวอย่าง →
              </button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step 3: Preview ── */}
        {step === 'preview' && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {validRows.length} แถว OK
              </span>
              {errorRows.length > 0 && (
                <span className="text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorRows.length} แถวมีข้อผิดพลาด
                </span>
              )}
              <span className="an-text-on-surface-muted">
                จะขยายเป็น {rowsToBoxes(validRows).length} กล่อง (รวม qty)
              </span>
              {errorRows.length > 0 && (
                <button type="button" onClick={downloadErrorReport} className="flex items-center gap-1 an-text-primary hover:opacity-70 ml-auto">
                  <Download className="w-3 h-3" />
                  Error report
                </button>
              )}
            </div>

            <PreviewTable validated={validated} />

            {/* Import options */}
            <div className="space-y-2 pt-2 border-t border-an-outline-variant">
              {target !== 'catalog' && (
                <label className="flex items-center gap-2 text-sm an-text-on-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addToPlan}
                    onChange={(e) => setAddToPlan(e.target.checked)}
                    className="accent-indigo-500"
                  />
                  เพิ่มเข้า Current Plan ({rowsToBoxes(validRows).length} กล่อง)
                </label>
              )}
              {target !== 'plan' && (
                <label className="flex items-center gap-2 text-sm an-text-on-surface cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveToCatalog}
                    onChange={(e) => setSaveToCatalog(e.target.checked)}
                    className="accent-indigo-500"
                  />
                  บันทึก unique items ลง Catalog ({rowsToCatalogItems(validRows).length} รายการ)
                </label>
              )}
            </div>

            <DialogFooter className="gap-2">
              <button type="button" onClick={() => setStep('mapping')} className="px-3 py-1.5 text-sm rounded-lg an-btn-outline-primary">
                ← กลับ
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={loading || validRows.length === 0 || (!addToPlan && !saveToCatalog)}
                className="px-4 py-1.5 text-sm font-bold rounded-lg an-btn-autopack disabled:opacity-40"
              >
                {loading ? 'กำลัง Import...' : `Import ${validRows.length} แถว`}
              </button>
            </DialogFooter>
          </div>
        )}

        {/* ── Step 4: Done ── */}
        {step === 'done' && summary && (
          <div className="space-y-6 py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-lg font-bold an-text-on-surface">Import สำเร็จ</p>
              <p className="text-sm an-text-on-surface-muted">
                นำเข้า {summary.imported} แถว → {summary.expanded} กล่อง
                {summary.catalogSaved > 0 && ` · บันทึก ${summary.catalogSaved} รายการใน Catalog`}
                {summary.failed > 0 && ` · ข้าม ${summary.failed} แถวที่มีข้อผิดพลาด`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleClose(false)}
              className="px-6 py-2 text-sm font-bold rounded-lg an-btn-autopack"
            >
              ปิด
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
