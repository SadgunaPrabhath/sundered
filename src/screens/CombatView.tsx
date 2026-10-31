import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '@/state/store'
import { Visual } from '@/components/Visual'
import { Bar } from '@/components/ui'
import type { Combatant, CombatLogEntry, Element, Skill } from '@/state/types'

type ActionType = 'attack' | 'skill' | 'defend' | 'item' | 'flee'

const LOG_COLOR: Record<CombatLogEntry['kind'], string> = {
  player: 'var(--color-ink)',
  enemy: 'var(--color-blood)',
  system: 'var(--color-ink-dim)',
  crit: 'var(--color-ember)',
  heal: 'var(--color-vital)',
  death: 'var(--color-aether)',
  concept: '#ffffff',
}

export default function CombatView() {
  const combat = useGame((s) => s.combat)
  const skillMap = useGame((s) => s.skills)
  const playerSkills = useGame((s) => s.player.skills)
  const items = useGame((s) => s.items)
  const inventory = useGame((s) => s.inventory)
  const flags = useGame((s) => s.cheat.flags)

  const [targetId, setTargetId] = useState<string | null>(null)
  const [menu, setMenu] = useState<'none' | 'skill' | 'item'>('none')

  const enemies = combat?.enemies ?? []
  const livingEnemies = useMemo(() => enemies.filter((e) => e.hp > 0), [enemies])

  // Keep a valid selected target.
  useEffect(() => {
    if (!combat) return
    if (!targetId || !livingEnemies.some((e) => e.id === targetId)) {
      setTargetId(livingEnemies[0]?.id ?? null)
    }
  }, [combat, targetId, livingEnemies])

  const logRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [combat?.log.length])

  if (!combat) return null

  const player = combat.player
  const cooldowns = combat.cooldowns
  const systemOn = flags.godMode || flags.infiniteHp || flags.oneShot

  const unlockedSkills: Skill[] = Object.entries(playerSkills)
    .filter(([, st]) => st.unlocked)
    .map(([id]) => skillMap[id])
    .filter((s): s is Skill => !!s)

  const consumables = inventory
    .map((id) => items[id])
    .filter((it) => it && it.kind === 'consumable')

  const act = (type: ActionType, extra?: { skillId?: string; itemId?: string }) => {
    if (!combat.active) return
    useGame.getState().doCombat({ type, targetId: targetId ?? undefined, ...extra })
    setMenu('none')
  }

  const hasBoss = enemies.some((e) => e.isBoss)

  return (
    <div className="relative h-full w-full flex flex-col">
      <div className="pointer-events-none absolute inset-0 scene-vignette" />

      {/* header */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="label">{hasBoss ? 'Boss Encounter' : 'Combat'}</span>
          <span className="font-mono text-[0.62rem] text-[var(--color-ink-faint)]">TURN {combat.turn}</span>
        </div>
        {systemOn && (
          <span className="font-mono text-[0.55rem] tracking-[0.3em] px-2 py-0.5 rounded border border-[var(--color-aether)]/50 text-[var(--color-aether-bright)]">
            SYSTEM
          </span>
        )}
      </div>

      <div className="relative z-10 flex-1 min-h-0 flex gap-3 px-4 pb-3">
        {/* main column */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* enemies */}
          <div className={`flex-1 min-h-0 flex flex-wrap items-start justify-center gap-3 ${hasBoss ? 'pt-2' : 'pt-6'}`}>
            {enemies.map((e) => (
              <EnemyCard
                key={e.id}
                enemy={e}
                selected={targetId === e.id}
                onSelect={() => e.hp > 0 && setTargetId(e.id)}
              />
            ))}
          </div>

          {/* player */}
          <div className="panel px-4 py-3 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-display text-sm text-[var(--color-ink)]">{player.name}</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {[...player.buffs, ...player.debuffs].map((s) => (
                  <span
                    key={s.id}
                    title={s.description}
                    className="px-1.5 py-0.5 rounded text-[0.55rem] font-mono uppercase tracking-wider"
                    style={{
                      color: s.kind === 'buff' ? 'var(--color-vital)' : 'var(--color-blood)',
                      border: `1px solid ${s.kind === 'buff' ? 'var(--color-vital)' : 'var(--color-blood)'}55`,
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Bar value={player.hp} max={player.maxHp} color="var(--color-vital)" label="Vitality" height={12} />
              <Bar value={player.mana} max={player.maxMana} color="var(--color-mana)" label="Mana" height={12} />
            </div>
          </div>

          {/* action bar */}
          <div className="mt-2">
            {menu === 'none' && (
              <div className="grid grid-cols-5 gap-2">
                <button className="btn btn-primary" disabled={!combat.active} onClick={() => act('attack')}>
                  Attack
                </button>
                <button className="btn" disabled={!combat.active || unlockedSkills.length === 0} onClick={() => setMenu('skill')}>
                  Skill
                </button>
                <button className="btn" disabled={!combat.active} onClick={() => act('defend')}>
                  Defend
                </button>
                <button className="btn" disabled={!combat.active || consumables.length === 0} onClick={() => setMenu('item')}>
                  Item
                </button>
                <button className="btn btn-ember" disabled={!combat.active} onClick={() => act('flee')}>
                  Flee
                </button>
              </div>
            )}

            {menu === 'skill' && (
              <div className="panel p-2">
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="label">Choose a technique</span>
                  <button className="btn py-1 px-2" onClick={() => setMenu('none')}>
                    Back
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {unlockedSkills.map((sk) => {
                    const cd = cooldowns[sk.id] ?? 0
                    const noMana = !flags.infiniteMana && player.mana < sk.cost
                    const disabled = !combat.active || cd > 0 || noMana
                    const conceptual = sk.kind === 'conceptual' || !!sk.concept
                    return (
                      <button
                        key={sk.id}
                        disabled={disabled}
                        onClick={() => act('skill', { skillId: sk.id })}
                        className="text-left rounded-lg border px-3 py-2 transition-colors disabled:opacity-40"
                        style={{
                          borderColor: conceptual ? '#ffffff66' : 'var(--color-line-bright)',
                          background: conceptual
                            ? 'linear-gradient(180deg, rgba(160,107,255,0.12), rgba(0,0,0,0.2))'
                            : 'linear-gradient(180deg, var(--color-panel), var(--color-surface))',
                          boxShadow: conceptual ? '0 0 18px -6px var(--color-aether)' : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="font-display text-[0.8rem]"
                            style={{ color: conceptual ? '#fff' : 'var(--color-ink)', textShadow: conceptual ? '0 0 10px var(--color-aether)' : undefined }}
                          >
                            {sk.name}
                          </span>
                          <span className="font-mono text-[0.55rem] uppercase tracking-widest text-[var(--color-ink-faint)]">
                            {sk.kind}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 font-mono text-[0.6rem]">
                          <span style={{ color: noMana ? 'var(--color-blood)' : 'var(--color-mana)' }}>{sk.cost} MP</span>
                          {cd > 0 && <span className="text-[var(--color-warn)]">CD {cd}</span>}
                          {conceptual && <span className="text-white">revokes {sk.concept ?? 'a concept'}</span>}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {menu === 'item' && (
              <div className="panel p-2">
                <div className="flex items-center justify-between px-1 pb-2">
                  <span className="label">Use an item</span>
                  <button className="btn py-1 px-2" onClick={() => setMenu('none')}>
                    Back
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto">
                  {consumables.map((it) => (
                    <button
                      key={it.id}
                      disabled={!combat.active}
                      onClick={() => act('item', { itemId: it.id })}
                      className="text-left rounded-lg border border-[var(--color-line-bright)] px-3 py-2 bg-[var(--color-surface)] hover:border-[var(--color-vital)] transition-colors"
                    >
                      <div className="font-display text-[0.8rem]">{it.name}</div>
                      <div className="font-mono text-[0.6rem] text-[var(--color-ink-faint)] line-clamp-1">{it.lore}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* combat log */}
        <div className="hidden md:flex w-64 shrink-0 panel flex-col">
          <div className="px-3 pt-3 pb-2 border-b border-[var(--color-line)]">
            <span className="label">Combat Log</span>
          </div>
          <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1">
            <AnimatePresence initial={false}>
              {combat.log.map((entry) => (
                <motion.p
                  key={entry.id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[0.72rem] leading-snug"
                  style={{
                    color: LOG_COLOR[entry.kind],
                    textShadow: entry.kind === 'concept' ? '0 0 10px #fff8' : undefined,
                    fontStyle: entry.kind === 'system' ? 'italic' : undefined,
                  }}
                >
                  {entry.text}
                </motion.p>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}

function EnemyCard({ enemy, selected, onSelect }: { enemy: Combatant; selected: boolean; onSelect: () => void }) {
  const dead = enemy.hp <= 0
  const prevHp = useRef(enemy.hp)
  const [hit, setHit] = useState(false)
  useEffect(() => {
    if (enemy.hp < prevHp.current) {
      setHit(true)
      const t = setTimeout(() => setHit(false), 320)
      prevHp.current = enemy.hp
      return () => clearTimeout(t)
    }
    prevHp.current = enemy.hp
  }, [enemy.hp])

  const boss = !!enemy.isBoss

  return (
    <motion.button
      onClick={onSelect}
      disabled={dead}
      animate={hit ? { x: [0, -6, 6, -3, 0], scale: [1, 1.04, 0.98, 1] } : {}}
      transition={{ duration: 0.32 }}
      className={`relative panel text-left transition-all ${boss ? 'w-72' : 'w-44'} ${dead ? 'opacity-35 grayscale' : selected ? 'ring-2' : ''}`}
      style={{
        borderColor: selected && !dead ? 'var(--color-blood)' : undefined,
        boxShadow: selected && !dead ? '0 0 24px -8px var(--color-blood)' : boss ? '0 0 40px -14px var(--color-blood)' : undefined,
      }}
    >
      <div className={`relative ${boss ? 'h-40' : 'h-28'}`}>
        <Visual req={{ category: 'portrait', seed: enemy.seed, element: enemy.element as Element, boss }} rounded={false} />
        {dead && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="font-display tracking-widest text-[var(--color-ink-dim)] line-through">SLAIN</span>
          </div>
        )}
        {boss && enemy.maxPhase && !dead && (
          <span className="absolute top-1.5 right-1.5 font-mono text-[0.55rem] px-1.5 py-0.5 rounded bg-black/60 text-[var(--color-warn)]">
            PHASE {enemy.phase ?? 1}/{enemy.maxPhase}
          </span>
        )}
      </div>
      <div className="px-3 py-2">
        <div className={`font-display ${boss ? 'text-base' : 'text-sm'} ${dead ? 'line-through' : ''}`}>{enemy.name}</div>
        <div className="mt-1.5">
          <Bar value={Math.max(0, enemy.hp)} max={enemy.maxHp} color="var(--color-blood)" showNums height={boss ? 10 : 8} label="HP" />
        </div>
        {!dead && enemy.intent && (
          <p
            className={`mt-2 italic leading-tight ${boss ? 'text-[0.72rem] font-display tracking-wide' : 'text-[0.65rem]'}`}
            style={{ color: 'var(--color-warn)' }}
          >
            {boss ? enemy.intent.toUpperCase() : enemy.intent}
          </p>
        )}
      </div>
    </motion.button>
  )
}
