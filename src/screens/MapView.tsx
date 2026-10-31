import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '@/state/store'
import { Visual } from '@/components/Visual'
import { Icon, Divider } from '@/components/ui'
import type { LocationNode } from '@/state/types'

const TYPE_STYLE: Record<LocationNode['type'], { color: string; icon: string; label: string }> = {
  town: { color: 'var(--color-vital)', icon: 'flag', label: 'Settlement' },
  village: { color: 'var(--color-vital)', icon: 'flag', label: 'Village' },
  dungeon: { color: 'var(--color-ember)', icon: 'skull', label: 'Dungeon' },
  rift: { color: 'var(--color-aether)', icon: 'spark', label: 'Rift' },
  boss: { color: 'var(--color-blood)', icon: 'skull', label: 'Threat' },
  temple: { color: 'var(--color-r-divine)', icon: 'star', label: 'Temple' },
  ruins: { color: 'var(--color-ink-dim)', icon: 'map', label: 'Ruins' },
  wild: { color: 'var(--color-ink-dim)', icon: 'eye', label: 'Wilds' },
  realm: { color: 'var(--color-r-celestial)', icon: 'spark', label: 'Realm' },
  secret: { color: 'var(--color-r-conceptual)', icon: 'eye', label: '???' },
  landmark: { color: 'var(--color-r-legendary)', icon: 'star', label: 'Landmark' },
}

function dangerPips(danger: number, color = 'var(--color-blood)') {
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full"
          style={{ background: i < danger ? color : 'var(--color-line)' }}
        />
      ))}
    </span>
  )
}

export default function MapView() {
  const locations = useGame((s) => s.locations)
  const currentLocation = useGame((s) => s.currentLocation)
  const travelTo = useGame((s) => s.travelTo)
  const setMode = useGame((s) => s.setMode)

  const [selected, setSelected] = useState<string | null>(null)

  const discovered = useMemo(() => Object.values(locations).filter((l) => l.discovered), [locations])

  const connections = useMemo(() => {
    const seen = new Set<string>()
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = []
    for (const l of discovered) {
      for (const cId of l.connections) {
        const c = locations[cId]
        if (!c || !c.discovered) continue
        const key = [l.id, cId].sort().join('|')
        if (seen.has(key)) continue
        seen.add(key)
        lines.push({ x1: l.x, y1: l.y, x2: c.x, y2: c.y })
      }
    }
    return lines
  }, [discovered, locations])

  const sel = selected ? locations[selected] : null

  return (
    <div className="h-full flex flex-col p-3 gap-3 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg">World Map</h2>
          <p className="label">The First Reach · {discovered.length} locations charted</p>
        </div>
        <button onClick={() => setMode('explore')} className="btn">
          ← Return
        </button>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-3 overflow-hidden">
        {/* MAP */}
        <div className="panel flex-1 relative overflow-hidden min-h-[320px]">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(120% 100% at 30% 20%, color-mix(in srgb, var(--color-aether) 10%, transparent), transparent 60%), radial-gradient(100% 100% at 80% 90%, color-mix(in srgb, var(--color-ember) 8%, transparent), transparent 55%), var(--color-void)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                'linear-gradient(var(--color-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-line) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          {/* connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
            {connections.map((c, i) => (
              <line
                key={i}
                x1={c.x1}
                y1={c.y1}
                x2={c.x2}
                y2={c.y2}
                stroke="var(--color-line-bright)"
                strokeWidth={0.3}
                strokeDasharray="1.2 1.2"
                opacity={0.6}
              />
            ))}
          </svg>

          {/* markers */}
          {discovered.map((loc) => {
            const style = TYPE_STYLE[loc.type]
            const isCurrent = loc.id === currentLocation
            const isSel = loc.id === selected
            return (
              <button
                key={loc.id}
                onClick={() => setSelected(loc.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2 group"
                style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
              >
                <span
                  className={`relative flex items-center justify-center w-8 h-8 rounded-full border transition-transform group-hover:scale-110 ${
                    isCurrent ? 'anim-pulse-ring' : ''
                  }`}
                  style={{
                    color: style.color,
                    borderColor: isSel ? style.color : `${style.color}77`,
                    background: 'color-mix(in srgb, var(--color-abyss) 85%, transparent)',
                    boxShadow: isSel || isCurrent ? `0 0 16px -2px ${style.color}` : undefined,
                    ['--rc' as string]: style.color,
                  } as React.CSSProperties}
                >
                  <Icon name={style.icon} size={15} />
                  {isCurrent && (
                    <span
                      className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--color-void)]"
                      style={{ background: 'var(--color-aether-bright)' }}
                    />
                  )}
                </span>
                <span
                  className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap text-[0.6rem] font-display px-1.5 py-0.5 rounded bg-[var(--color-abyss)]/80 border border-[var(--color-line)] opacity-80 group-hover:opacity-100"
                  style={{ color: isCurrent ? 'var(--color-aether-bright)' : 'var(--color-ink-dim)' }}
                >
                  {loc.name}
                </span>
              </button>
            )
          })}

          {/* legend */}
          <div className="absolute bottom-2 left-2 glass rounded-lg px-2.5 py-1.5 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: 'var(--color-aether-bright)' }} />
            <span className="label">You are here</span>
          </div>
        </div>

        {/* INSPECTION */}
        <div className="lg:w-80 shrink-0">
          <AnimatePresence mode="wait">
            {sel ? (
              <motion.div
                key={sel.id}
                className="panel overflow-hidden"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="h-40 relative">
                  <Visual
                    req={{ category: 'location', seed: sel.seed, element: 'none', biome: sel.biome, danger: sel.danger }}
                    rounded={false}
                  />
                  <div className="absolute inset-0 scene-vignette" />
                  <div className="absolute bottom-2 left-3 right-3">
                    <div className="label">{TYPE_STYLE[sel.type].label} · {sel.region}</div>
                    <h3 className="font-display text-lg leading-tight text-shadow-deep">{sel.name}</h3>
                  </div>
                </div>
                <div className="p-3 space-y-2.5 max-h-[calc(100vh-420px)] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="label">Danger</span>
                    {dangerPips(sel.danger)}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="label">Weather</span>
                    <span className="text-xs capitalize text-[var(--color-ink-dim)]">{sel.weather}</span>
                  </div>
                  {sel.population && (
                    <div className="flex items-center justify-between">
                      <span className="label">Population</span>
                      <span className="text-xs text-[var(--color-ink-dim)]">{sel.population}</span>
                    </div>
                  )}
                  {sel.faction && (
                    <div className="flex items-center justify-between">
                      <span className="label">Faction</span>
                      <span className="text-xs text-[var(--color-ink-dim)]">{sel.faction}</span>
                    </div>
                  )}

                  <p className="text-[0.78rem] text-[var(--color-ink-dim)] leading-relaxed italic">{sel.description}</p>

                  {sel.threats.length > 0 && (
                    <>
                      <Divider label="Known Threats" />
                      <ul className="space-y-1">
                        {sel.threats.map((t, i) => (
                          <li key={i} className="text-[0.72rem] text-[var(--color-ink-dim)] flex gap-1.5">
                            <span className="text-[var(--color-blood)]">▸</span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {sel.secrets.length > 0 && (
                    <>
                      <Divider label="Discovered Secrets" />
                      <ul className="space-y-1">
                        {sel.secrets.map((t, i) => (
                          <li key={i} className="text-[0.72rem] flex gap-1.5" style={{ color: 'var(--color-r-conceptual)' }}>
                            <span>◆</span>
                            {t}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => {
                        travelTo(sel.id)
                        setMode('explore')
                      }}
                      disabled={sel.id === currentLocation}
                      className="btn btn-primary flex-1"
                    >
                      {sel.id === currentLocation ? 'You are here' : 'Travel'}
                    </button>
                    <button onClick={() => setSelected(null)} className="btn">
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                className="panel h-full flex flex-col items-center justify-center p-6 text-center min-h-[200px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="text-[var(--color-ink-faint)] mb-2">
                  <Icon name="map" size={28} />
                </div>
                <p className="text-sm text-[var(--color-ink-dim)]">Select a location to inspect it.</p>
                <p className="text-[0.68rem] text-[var(--color-ink-faint)] mt-1">Unknown regions remain hidden until discovered.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
