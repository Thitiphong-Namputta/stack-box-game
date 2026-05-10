'use client'

interface Props {
  start: { x: number; y: number } | null
  current: { x: number; y: number } | null
}

export function SelectionRectangle({ start, current }: Props) {
  if (!start || !current) return null

  const left   = Math.min(start.x, current.x)
  const top    = Math.min(start.y, current.y)
  const width  = Math.abs(current.x - start.x)
  const height = Math.abs(current.y - start.y)

  if (width < 2 && height < 2) return null

  return (
    <div
      className="absolute pointer-events-none rounded-sm"
      style={{
        left,
        top,
        width,
        height,
        border: '1.5px dashed rgba(99,102,241,0.8)',
        background: 'rgba(99,102,241,0.08)',
      }}
    />
  )
}
