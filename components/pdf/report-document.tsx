import path from 'path'
import { Document, Page, View, Text, Font } from '@react-pdf/renderer'
import type { CargoBox, ContainerSize } from '@/store/use-scene-store'
import type { CoGResult } from '@/lib/physics/center-of-gravity'
import type { StabilityResult } from '@/lib/physics/stability'
import { styles } from './styles'

Font.register({
  family: 'Prompt',
  fonts: [
    { src: path.join(process.cwd(), 'public', 'fonts', 'Prompt-Regular.ttf'), fontWeight: 'normal' },
    { src: path.join(process.cwd(), 'public', 'fonts', 'Prompt-Bold.ttf'), fontWeight: 'bold' },
  ],
})

export interface ReportData {
  plan: { id: string | null; name: string | null }
  containerSize: ContainerSize
  boxes: CargoBox[]
  generatedAt: number
  cog?: CoGResult | null
  stab?: StabilityResult | null
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ReportDocument({ data }: { data: ReportData }) {
  const { plan, containerSize, boxes, generatedAt, cog, stab } = data
  const totalVol = containerSize.w * containerSize.h * containerSize.d
  const usedVol = boxes.reduce((s, b) => s + b.size.w * b.size.h * b.size.d, 0)
  const utilization = totalVol > 0 ? Math.round((usedVol / totalVol) * 100) : 0
  const totalWeight = boxes.reduce((s, b) => s + (b.weight ?? 0), 0)
  const now = generatedAt

  return (
    <Document title={`Cargo Report: ${plan.name ?? 'Unnamed'}`} author="Stack Box">
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {plan.name ?? 'Cargo Plan'}
          </Text>
          <Text style={styles.subtitle}>
            Stack Box — Cargo Report  •  {formatDate(now)}
          </Text>
        </View>

        {/* Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>สรุปข้อมูลตู้สินค้า</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>ขนาดตู้ (กว้าง × สูง × ลึก)</Text>
              <Text style={styles.summaryValue}>
                {containerSize.w} × {containerSize.h} × {containerSize.d} cm
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>น้ำหนักสูงสุด</Text>
              <Text style={styles.summaryValue}>
                {containerSize.maxWeight ? `${containerSize.maxWeight.toLocaleString()} kg` : '-'}
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>จำนวนกล่องสินค้า</Text>
              <Text style={styles.summaryValue}>{boxes.length} ชิ้น</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>น้ำหนักรวม</Text>
              <Text style={styles.summaryValue}>{totalWeight.toLocaleString()} kg</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>การใช้พื้นที่</Text>
              <Text style={styles.summaryValue}>{utilization}%</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>ปริมาตรที่ใช้ไป</Text>
              <Text style={styles.summaryValue}>
                {(usedVol / 1_000_000).toFixed(3)} m³
              </Text>
            </View>
          </View>
        </View>

        {/* Manifest Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>รายการสินค้า (Manifest)</Text>
          <View style={styles.table}>
            {/* Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableHeaderCell, styles.colName]}>ชื่อสินค้า</Text>
              <Text style={[styles.tableHeaderCell, styles.colCategory]}>ประเภท</Text>
              <Text style={[styles.tableHeaderCell, styles.colDimensions]}>ขนาด (cm)</Text>
              <Text style={[styles.tableHeaderCell, styles.colWeight]}>น้ำหนัก (kg)</Text>
              <Text style={[styles.tableHeaderCell, styles.colVolume]}>ปริมาตร (m³)</Text>
            </View>

            {/* Rows */}
            {boxes.map((box, i) => {
              const vol = (box.size.w * box.size.h * box.size.d) / 1_000_000
              return (
                <View key={box.id} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                  <Text style={[styles.tableCell, styles.colName]}>{box.name}</Text>
                  <Text style={[styles.tableCell, styles.colCategory]}>{box.category ?? '-'}</Text>
                  <Text style={[styles.tableCell, styles.colDimensions]}>
                    {box.size.w}×{box.size.h}×{box.size.d}
                  </Text>
                  <Text style={[styles.tableCell, styles.colWeight]}>{box.weight}</Text>
                  <Text style={[styles.tableCell, styles.colVolume]}>{vol.toFixed(4)}</Text>
                </View>
              )
            })}
          </View>
        </View>

        {/* Stability Analysis */}
        {stab && cog && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>การวิเคราะห์ความสมดุล (Stability)</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Stability Score</Text>
                <Text style={styles.summaryValue}>{stab.score.toFixed(0)} / 100</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>ระดับ</Text>
                <Text style={styles.summaryValue}>{stab.level.toUpperCase()}</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>CoG Position (cm)</Text>
                <Text style={styles.summaryValue}>
                  ({cog.cog.x.toFixed(0)}, {cog.cog.y.toFixed(0)}, {cog.cog.z.toFixed(0)})
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>CoG Height</Text>
                <Text style={styles.summaryValue}>{stab.cogHeightPct.toFixed(0)}%</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Front/Rear Distribution</Text>
                <Text style={styles.summaryValue}>
                  {stab.axleDistribution.front.pct.toFixed(0)}% / {stab.axleDistribution.rear.pct.toFixed(0)}%
                </Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Balance</Text>
                <Text style={styles.summaryValue}>{stab.axleDistribution.balanced ? 'สมดุล' : 'ไม่สมดุล'}</Text>
              </View>
            </View>
            {stab.warnings.length > 0 && (
              <View style={{ marginTop: 8, padding: 8, backgroundColor: '#fef2f2', borderRadius: 4 }}>
                {stab.warnings.map((w, i) => (
                  <Text key={i} style={{ fontSize: 9, color: '#991b1b', fontFamily: 'Prompt' }}>
                    ⚠ {w}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Stack Box — Cargo Planner</Text>
          <Text style={styles.footerText}>
            Generated: {new Date(now).toISOString().split('T')[0]}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
