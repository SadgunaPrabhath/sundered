import type { ReactNode } from 'react'
import { rarity as rInfo } from '@/engine/rarity'
import type { Rarity } from '@/state/types'

export function Bar({
  value,
  max,
  color,
  label,
  showNums = true,
  height = 10,
}: {
  value: number
  max: number
  color: string
  label?: string
  showNums?: boolean
  height?: number
}) {
  const pct = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-baseline mb-0.5">
          <span className="label">{label}</span>
          {showNums && (
            <span className="font-mono text-[0.65rem] text-[var(--color-ink-dim)]">
              {Math.round(value)}/{Math.round(max)}
            </span>
          )}
        </div>
      )}
      <div className="w-full rounded-full overflow-hidden bg-[var(--color-void)] border border-[var(--color-line)]" style={{ height }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)`, boxShadow: `0 0 12px -2px ${color}` }}
        />
      </div>
    </div>
  )
}

export function RarityChip({ rarity, className = '' }: { rarity: Rarity; className?: string }) {
  const ri = rInfo(rarity)
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[0.6rem] font-mono uppercase tracking-widest ${className}`}
      style={{ color: ri.color, border: `1px solid ${ri.color}55`, background: `${ri.color}12` }}
    >
      {ri.label}
    </span>
  )
}

export function RarityText({ rarity, children }: { rarity: Rarity; children?: ReactNode }) {
  const ri = rInfo(rarity)
  return (
    <span style={{ color: ri.color, textShadow: ri.glow > 0.6 ? `0 0 12px ${ri.color}88` : undefined }} className="font-display">
      {children ?? ri.label}
    </span>
  )
}

export function Panel({ children, className = '', title, right }: { children: ReactNode; className?: string; title?: string; right?: ReactNode }) {
  return (
    <div className={`panel ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between px-3.5 pt-3 pb-2 border-b border-[var(--color-line)]">
          {title && <h3 className="label">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  )
}

export function StatRow({ label, value, accent }: { label: string; value: ReactNode; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[var(--color-line)]/50 last:border-0">
      <span className="text-[0.72rem] text-[var(--color-ink-dim)] capitalize">{label}</span>
      <span className="font-mono text-[0.78rem] font-semibold" style={{ color: accent }}>
        {value}
      </span>
    </div>
  )
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <div className="h-px bg-[var(--color-line)] my-3" />
  return (
    <div className="flex items-center gap-2 my-3">
      <div className="h-px flex-1 bg-[var(--color-line)]" />
      <span className="label">{label}</span>
      <div className="h-px flex-1 bg-[var(--color-line)]" />
    </div>
  )
}

const ICONS: Record<string, string> = {
  sword: 'M14.5 3l6.5 6.5-2 2-1.5-1.5-6 6 1.5 1.5-2 2-2-2-2.5 2.5-1-1L6 19l-2-2 2.5-2.5-1-1 2-2 1.5 1.5 6-6L15.5 5l-1-1 2-2z',
  shield: 'M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z',
  bag: 'M6 7V6a6 6 0 0112 0v1h3v13a2 2 0 01-2 2H5a2 2 0 01-2-2V7h3zm2 0h8V6a4 4 0 00-8 0v1z',
  map: 'M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2zm0 2.2l6 2v13.6l-6-2V5.2z',
  star: 'M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17.8 5.9 20.4l1.5-6.8L2.2 9l6.9-.7L12 2z',
  skull: 'M12 2a9 9 0 00-9 9c0 3 1.5 5 3 6v3a2 2 0 002 2h8a2 2 0 002-2v-3c1.5-1 3-3 3-6a9 9 0 00-9-9zm-3 9a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z',
  spark: 'M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z',
  quest: 'M4 4h16v14H8l-4 4V4zm4 4v2h8V8H8zm0 4v2h6v-2H8z',
  users: 'M8 11a4 4 0 100-8 4 4 0 000 8zm8 0a3 3 0 100-6 3 3 0 000 6zM2 20a6 6 0 0112 0v1H2v-1zm14-1h6v1h-6c0-.3 0-.7 0-1z',
  flag: 'M5 3v18H3V3h2zm2 0h12l-2 4 2 4H7V3z',
  gear: 'M12 8a4 4 0 100 8 4 4 0 000-8zm9 4l-2-1 1-2-2-2-2 1-1-2h-3l-1 2-2-1-2 2 1 2-2 1v3l2 1-1 2 2 2 2-1 1 2h3l1-2 2 1 2-2-1-2 2-1v-3z',
  eye: 'M12 5c-5 0-9 4-10 7 1 3 5 7 10 7s9-4 10-7c-1-3-5-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z',
  code: 'M8 6l-6 6 6 6 1.5-1.5L5 12l4.5-4.5L8 6zm8 0l-1.5 1.5L19 12l-4.5 4.5L16 18l6-6-6-6z',
  gold: 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 5c2 0 4 1 4 3s-2 3-4 3-4 1-4 3 2 3 4 3',
}

export function Icon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d={ICONS[name] ?? ICONS.spark} />
    </svg>
  )
}
