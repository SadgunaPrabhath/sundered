import { useMemo } from 'react'
import { renderVisual, type VisualRequest } from '@/engine/visuals'

// Module-level cache: same request key → same SVG string, generated once.
const cache = new Map<string, string>()

function keyOf(req: VisualRequest): string {
  return [req.category, req.seed, req.element, req.rarity, req.kind, req.subtype, req.biome, req.danger, req.tier, req.boss]
    .map((v) => v ?? '')
    .join('|')
}

export function getVisual(req: VisualRequest): string {
  const k = keyOf(req)
  let svg = cache.get(k)
  if (!svg) {
    svg = renderVisual(req)
    cache.set(k, svg)
  }
  return svg
}

export function Visual({
  req,
  className = '',
  rounded = true,
}: {
  req: VisualRequest
  className?: string
  rounded?: boolean
}) {
  const svg = useMemo(() => getVisual(req), [keyOf(req)]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      className={`visual-wrap overflow-hidden ${rounded ? 'rounded-xl' : ''} ${className}`}
      style={{ lineHeight: 0 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
