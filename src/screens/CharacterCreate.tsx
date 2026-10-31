import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { Element, AttrKey } from '@/state/types'
import { useGame } from '@/state/store'
import { ORIGINS, CLASSES } from '@/data/content'
import { seedFrom } from '@/engine/rng'
import { Visual } from '@/components/Visual'
import { Panel, Divider, RarityChip, Icon } from '@/components/ui'

const ATTR_KEYS: AttrKey[] = [
  'strength', 'agility', 'vitality', 'intelligence', 'willpower', 'perception', 'endurance', 'luck',
]

export default function CharacterCreate() {
  const newGame = useGame((s) => s.newGame)
  const setMode = useGame((s) => s.setMode)

  const [name, setName] = useState('Riftborn')
  const [originId, setOriginId] = useState(ORIGINS[0].id)
  const [classId, setClassId] = useState('wanderer')

  const startingClasses = useMemo(() => CLASSES.filter((c) => c.tier <= 1), [])
  const origin = ORIGINS.find((o) => o.id === originId) ?? ORIGINS[0]

  const attributes = useMemo(() => {
    const base: Record<AttrKey, number> = {
      strength: 5, agility: 5, vitality: 5, intelligence: 5, willpower: 5, perception: 5, endurance: 5, luck: 5,
    }
    for (const [k, v] of Object.entries(origin.bonuses)) base[k as AttrKey] += v as number
    return base
  }, [origin])

  const confirm = () => newGame({ name: name.trim() || 'Riftborn', originId, classId })

  return (
    <div className="relative h-full w-full overflow-y-auto bg-[var(--color-void)] text-[var(--color-ink)]">
      <div className="mx-auto max-w-6xl px-5 py-8">
        <button
          className="mb-6 text-[0.62rem] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] transition hover:text-[var(--color-ink)]"
          onClick={() => setMode('title')}
        >
          ← Back
        </button>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl tracking-[0.14em] text-white sm:text-4xl"
        >
          FORGE THE RIFTBORN
        </motion.h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--color-ink-dim)]">
          The rift changed you on the way back. Choose what it made you into.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
          {/* LEFT: choices */}
          <div className="space-y-6">
            <Panel title="True Name">
              <div className="p-4">
                <input
                  value={name}
                  maxLength={22}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Riftborn"
                  className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-void)] px-4 py-3 font-display text-lg tracking-wide text-white outline-none transition focus:border-[var(--color-aether)]"
                />
              </div>
            </Panel>

            <Panel title="Origin — how the rift marked you">
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                {ORIGINS.map((o) => {
                  const active = o.id === originId
                  return (
                    <button
                      key={o.id}
                      onClick={() => setOriginId(o.id)}
                      className={`panel-inset flex gap-3 p-3 text-left transition ${
                        active ? 'ring-1 ring-[var(--color-aether)]' : 'hover:border-[var(--color-line-bright)]'
                      }`}
                      style={active ? { borderColor: 'var(--color-aether)' } : undefined}
                    >
                      <div className="h-16 w-16 shrink-0">
                        <Visual req={{ category: 'portrait', seed: seedFrom(o.id), element: o.element as Element }} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm text-white">{o.name}</span>
                          <span className="label capitalize text-[var(--color-aether)]">{o.element}</span>
                        </div>
                        <p className="mt-1 text-[0.72rem] leading-snug text-[var(--color-ink-dim)]">{o.blurb}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {Object.entries(o.bonuses).map(([k, v]) => (
                            <span key={k} className="rounded bg-[var(--color-void)] px-1.5 py-0.5 font-mono text-[0.58rem] uppercase text-[var(--color-vital)]">
                              +{v} {k.slice(0, 3)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </Panel>

            <Panel title="Discipline — your first shape">
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
                {startingClasses.map((c) => {
                  const active = c.id === classId
                  return (
                    <button
                      key={c.id}
                      onClick={() => setClassId(c.id)}
                      className={`panel-inset p-3 text-left transition ${
                        active ? 'ring-1 ring-[var(--color-ember)]' : 'hover:border-[var(--color-line-bright)]'
                      }`}
                      style={active ? { borderColor: 'var(--color-ember)' } : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="sword" size={15} className="text-[var(--color-ember)]" />
                        <span className="font-display text-sm text-white">{c.name}</span>
                        {c.tier === 0 && <span className="label text-[var(--color-ink-faint)]">unshaped</span>}
                      </div>
                      <p className="mt-1 text-[0.72rem] leading-snug text-[var(--color-ink-dim)]">{c.description}</p>
                    </button>
                  )
                })}
              </div>
            </Panel>
          </div>

          {/* RIGHT: live summary */}
          <div className="lg:sticky lg:top-8 lg:self-start">
            <Panel title="The Riftborn">
              <div className="p-4">
                <div className="mx-auto mb-3 h-40 w-40 overflow-hidden rounded-xl border border-[var(--color-line)]">
                  <Visual req={{ category: 'portrait', seed: seedFrom(originId), element: origin.element as Element }} />
                </div>
                <div className="text-center">
                  <div className="font-display text-xl text-white">{name.trim() || 'Riftborn'}</div>
                  <div className="mt-1 flex items-center justify-center gap-2 text-[0.7rem] text-[var(--color-ink-dim)]">
                    <span>{origin.name}</span>
                    <span className="text-[var(--color-line-bright)]">·</span>
                    <span>{CLASSES.find((c) => c.id === classId)?.name}</span>
                  </div>
                  <div className="mt-2 flex justify-center">
                    <RarityChip rarity="rare" />
                  </div>
                </div>

                <Divider label="Starting Attributes" />
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {ATTR_KEYS.map((k) => {
                    const bonus = (origin.bonuses[k] as number) ?? 0
                    return (
                      <div key={k} className="flex items-center justify-between border-b border-[var(--color-line)]/40 py-1">
                        <span className="text-[0.68rem] capitalize text-[var(--color-ink-dim)]">{k}</span>
                        <span className="font-mono text-[0.72rem] font-semibold text-white">
                          {attributes[k]}
                          {bonus > 0 && <span className="ml-1 text-[var(--color-vital)]">+{bonus}</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <button className="btn btn-primary mt-5 w-full py-3.5" onClick={confirm}>
                  Begin
                </button>
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
