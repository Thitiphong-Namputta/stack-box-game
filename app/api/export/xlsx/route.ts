import ExcelJS from 'exceljs'
import { auth } from '@/auth'
import type { ReportData } from '@/components/pdf/report-document'
import { computeCoG } from '@/lib/physics/center-of-gravity'
import { computeStability } from '@/lib/physics/stability'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan, containerSize, boxes }: ReportData = await req.json()
  const cog = computeCoG(boxes, containerSize)
  const stab = cog ? computeStability(cog, boxes, containerSize) : null

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Stack Box'
  workbook.created = new Date()

  const totalVol = containerSize.w * containerSize.h * containerSize.d
  const usedVol = boxes.reduce((s, b) => s + b.size.w * b.size.h * b.size.d, 0)
  const utilization = totalVol > 0 ? Math.round((usedVol / totalVol) * 100) : 0
  const totalWeight = boxes.reduce((s, b) => s + (b.weight ?? 0), 0)

  // ── Sheet 1: Summary ────────────────────────────────────────────
  const summary = workbook.addWorksheet('Summary')
  summary.columns = [
    { key: 'label', width: 28 },
    { key: 'value', width: 30 },
  ]

  const titleCell = summary.getCell('A1')
  titleCell.value = `Cargo Plan: ${plan.name ?? 'Unnamed'}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } }
  summary.mergeCells('A1:B1')

  summary.getCell('A2').value = `Generated: ${new Date().toLocaleString('th-TH')}`
  summary.getCell('A2').font = { size: 9, color: { argb: 'FF94A3B8' } }
  summary.mergeCells('A2:B2')

  const summaryData = [
    ['ขนาดตู้ (กว้าง × สูง × ลึก)', `${containerSize.w} × ${containerSize.h} × ${containerSize.d} cm`],
    ['น้ำหนักสูงสุด', containerSize.maxWeight ? `${containerSize.maxWeight.toLocaleString()} kg` : '-'],
    ['จำนวนกล่องสินค้า', `${boxes.length} ชิ้น`],
    ['น้ำหนักรวม', `${totalWeight.toLocaleString()} kg`],
    ['การใช้พื้นที่', `${utilization}%`],
    ['ปริมาตรที่ใช้ไป', `${(usedVol / 1_000_000).toFixed(3)} m³`],
    ['ปริมาตรตู้ทั้งหมด', `${(totalVol / 1_000_000).toFixed(3)} m³`],
  ]

  summaryData.forEach(([label, value], i) => {
    const row = 4 + i
    const labelCell = summary.getCell(`A${row}`)
    const valueCell = summary.getCell(`B${row}`)
    labelCell.value = label
    labelCell.font = { bold: true, size: 10 }
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    labelCell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    }
    valueCell.value = value
    valueCell.font = { size: 10 }
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
    valueCell.border = {
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    }
  })

  // ── Sheet 2: Manifest ───────────────────────────────────────────
  const manifest = workbook.addWorksheet('Manifest')
  manifest.columns = [
    { header: 'ชื่อสินค้า',     key: 'name',     width: 26 },
    { header: 'ประเภท',         key: 'category', width: 16 },
    { header: 'กว้าง (cm)',     key: 'w',        width: 13 },
    { header: 'สูง (cm)',       key: 'h',        width: 13 },
    { header: 'ลึก (cm)',       key: 'd',        width: 13 },
    { header: 'น้ำหนัก (kg)',   key: 'weight',   width: 16 },
    { header: 'ปริมาตร (m³)',   key: 'volume',   width: 16 },
  ]

  manifest.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = {
      bottom: { style: 'thin', color: { argb: 'FF1E3A8A' } },
    }
  })
  manifest.getRow(1).height = 24

  boxes.forEach((box, i) => {
    const row = manifest.addRow({
      name:     box.name,
      category: box.category ?? '-',
      w:        box.size.w,
      h:        box.size.h,
      d:        box.size.d,
      weight:   box.weight,
      volume:   +((box.size.w * box.size.h * box.size.d) / 1_000_000).toFixed(4),
    })
    const bgColor = i % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC'
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
      cell.alignment = { vertical: 'middle' }
    })
  })

  // Total row
  const totalRow = manifest.addRow({
    name:   'รวมทั้งหมด',
    weight: totalWeight,
    volume: +((usedVol / 1_000_000).toFixed(4)),
  })
  totalRow.eachCell((cell) => {
    cell.font = { bold: true }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
  })

  // ── Sheet 3: Stability ─────────────────────────────────────────
  if (stab && cog) {
    const stability = workbook.addWorksheet('Stability')
    stability.columns = [
      { key: 'label', width: 32 },
      { key: 'value', width: 24 },
    ]

    const stabTitle = stability.getCell('A1')
    stabTitle.value = 'Stability Analysis'
    stabTitle.font = { bold: true, size: 14, color: { argb: 'FF1E3A8A' } }
    stability.mergeCells('A1:B1')

    const stabData: [string, string | number][] = [
      ['Stability Score', `${stab.score.toFixed(0)} / 100`],
      ['ระดับ (Level)', stab.level.toUpperCase()],
      ['CoG X (cm)', +cog.cog.x.toFixed(1)],
      ['CoG Y (cm)', +cog.cog.y.toFixed(1)],
      ['CoG Z (cm)', +cog.cog.z.toFixed(1)],
      ['CoG Height (%)', `${stab.cogHeightPct.toFixed(0)}%`],
      ['Deviation X (%)', `${cog.deviation.pctX.toFixed(1)}%`],
      ['Deviation Z (%)', `${cog.deviation.pctZ.toFixed(1)}%`],
      ['Front Axle Weight (kg)', +stab.axleDistribution.front.weight.toFixed(0)],
      ['Rear Axle Weight (kg)', +stab.axleDistribution.rear.weight.toFixed(0)],
      ['Front/Rear Distribution', `${stab.axleDistribution.front.pct.toFixed(0)}% / ${stab.axleDistribution.rear.pct.toFixed(0)}%`],
      ['Balance', stab.axleDistribution.balanced ? 'สมดุล' : 'ไม่สมดุล'],
    ]

    stabData.forEach(([label, value], i) => {
      const row = 3 + i
      const labelCell = stability.getCell(`A${row}`)
      const valueCell = stability.getCell(`B${row}`)
      labelCell.value = label
      labelCell.font = { bold: true, size: 10 }
      labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      labelCell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
      valueCell.value = value
      valueCell.font = { size: 10 }
      valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
      valueCell.border = { bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } } }
    })

    if (stab.warnings.length > 0) {
      const warnStart = 3 + stabData.length + 1
      const warnHeader = stability.getCell(`A${warnStart}`)
      warnHeader.value = 'Stability Warnings'
      warnHeader.font = { bold: true, color: { argb: 'FF991B1B' }, size: 10 }

      stab.warnings.forEach((w, i) => {
        const warnCell = stability.getCell(`A${warnStart + 1 + i}`)
        warnCell.value = `⚠ ${w}`
        warnCell.font = { color: { argb: 'FF991B1B' }, size: 10 }
        stability.mergeCells(`A${warnStart + 1 + i}:B${warnStart + 1 + i}`)
      })
    }
  }

  // ── Export ──────────────────────────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=cargo-plan-${Date.now()}.xlsx`,
    },
  })
}
