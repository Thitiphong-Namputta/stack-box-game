import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import { auth } from '@/auth'
import { ReportDocument } from '@/components/pdf/report-document'
import type { ReportData } from '@/components/pdf/report-document'
import { computeCoG } from '@/lib/physics/center-of-gravity'
import { computeStability } from '@/lib/physics/stability'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: ReportData = await req.json()
  const generatedAt = Date.now()
  const cog = computeCoG(payload.boxes, payload.containerSize)
  const stab = cog ? computeStability(cog, payload.boxes, payload.containerSize) : null
  const data: ReportData = { ...payload, generatedAt, cog, stab }

  const element = React.createElement(ReportDocument, { data }) as ReactElement<DocumentProps>
  const buffer = await renderToBuffer(element)

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=cargo-report-${Date.now()}.pdf`,
    },
  })
}
