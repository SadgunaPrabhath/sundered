import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/state/store'
import { RARITIES } from '@/engine/rarity'
import { ELEMENTS, WEAPON_TYPES, ARMOR_SLOTS } from '@/engine/factories'
import { Icon } from './ui'
import type { AttrKey, CheatFlags, CheatTier, Element, EquipSlot, Rarity } from '@/state/types'

const TIER_ORDER: CheatTier[] = ['debug', 'admin', 'root', 'archon', 'reality', 'conceptual', 'author', 'omnipotent', 'unknown']
const TIER_LABEL: Record<CheatTier, string> = {
  locked: 'LOCKED', debug: 'DEBUG', admin: 'ADMIN', root: 'ROOT', archon: 'ARCHON', reality: 'REALITY',
  conceptual: 'CONCEPTUAL', author: 'AUTHOR', omnipotent: 'OMNIPOTENT', unknown: '???',
}
const TIER_DESC: Record<CheatTier, string> = {
  locked: 'no access', debug: 'read the seams', admin: 'edit the surface', root: 'rewrite the rules',
  archon: 'command the systems', reality: 'edit reality itself', conceptual: 'delete ideas',
  author: 'the world is a document', omnipotent: 'there are no rules left', unknown: 'an option that should not exist',
}

const ATTRS: AttrKey[] = ['strength', 'agility', 'vitality', 'intelligence', 'willpower', 'perception', 'endurance', 'luck']
const CURRENCIES = ['gold', 'souls', 'essence', 'riftShards', 'divineCoins', 'voidFragments', 'conceptualEssence'] as const
const CONCEPTS = ['Distance', 'Time', 'Death', 'Gravity', 'Memory', 'Fear', 'Names', 'Fate', 'Nothingness', 'Causality']

type Tab = 'access' | 'player' | 'arsenal' | 'world' | 'reality' | 'presets' | 'snapshots' | 'log'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel-inset p-3.5 mb-3">
      <h4 className="label mb-2.5" style={{ color: 'var(--color-r-abyssal)' }}>{title}</h4>
      {children}
    </div>
  )
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-3 py-2 rounded-lg border transition text-left text-sm"
      style={{ borderColor: on ? 'var(--color-vital)' : 'var(--color-line)', background: on ? 'color-mix(in srgb, var(--color-vital) 12%, transparent)' : 'transparent' }}
    >
      <span className={on ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]'}>{label}</span>
      <span className="font-mono text-[0.65rem]" style={{ color: on ? 'var(--color-vital)' : 'var(--color-ink-faint)' }}>{on ? 'ON' : 'OFF'}</span>
    </button>
  )
}

function ActBtn({ label, onClick, danger, primary }: { label: string; onClick: () => void; danger?: boolean; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="btn text-[0.66rem] py-1.5 px-2.5"
      style={danger ? { borderColor: 'var(--color-blood)', color: 'var(--color-blood)' } : primary ? { borderColor: 'var(--color-r-abyssal)', color: 'var(--color-r-abyssal)' } : undefined}
    >
      {label}
    </button>
  )
}

export function SystemOverride({ onClose }: { onClose: () => void }) {
  const s = useGame()
  const [tab, setTab] = useState<Tab>('access')
  const tier = s.cheat.tier
  const tierIdx = TIER_ORDER.indexOf(tier)
  const glitch = tierIdx >= 2 // root+
  const dimensional = tierIdx >= 4 // reality+
  const authorMode = tierIdx >= 6

  // weapon generator local form
  const [wName, setWName] = useState('')
  const [wType, setWType] = useState('Soul Blade')
  const [wRarity, setWRarity] = useState<Rarity>('legendary')
  const [wElement, setWElement] = useState<Element>('void')
  const [wConcept, setWConcept] = useState('')
  const [wSentient, setWSentient] = useState(false)
  const [wLore, setWLore] = useState('')

  const [aSlot, setASlot] = useState<EquipSlot>('chest')
  const [aRarity, setARarity] = useState<Rarity>('legendary')
  const [aElement, setAElement] = useState<Element>('void')

  const [locName, setLocName] = useState('')
  const [locType, setLocType] = useState('landmark')
  const [locDanger, setLocDanger] = useState(3)

  const [riftTier, setRiftTier] = useState(4)
  const [npcBoss, setNpcBoss] = useState(false)
  const [npcName, setNpcName] = useState('')

  const [statVals, setStatVals] = useState<number>(999)
  const [qName, setQName] = useState('')
  const [qDesc, setQDesc] = useState('')
  const [qReward, setQReward] = useState('')

  const accentTier = tierIdx >= 6 ? '#ffffff' : tierIdx >= 4 ? '#8affff' : tierIdx >= 2 ? '#7b3dff' : 'var(--color-r-abyssal)'

  const canProbe = tierIdx < TIER_ORDER.length - 1
  const nextTier = TIER_ORDER[tierIdx + 1]

  const flagList: { key: keyof CheatFlags; label: string }[] = [
    { key: 'godMode', label: 'God Mode' },
    { key: 'immortal', label: 'Immortality' },
    { key: 'infiniteHp', label: 'Infinite HP' },
    { key: 'infiniteMana', label: 'Infinite Mana' },
    { key: 'infiniteStamina', label: 'Infinite Stamina' },
    { key: 'noCooldowns', label: 'No Cooldowns' },
    { key: 'oneShot', label: 'One-Shot Kill' },
    { key: 'noStatusEffects', label: 'No Debuffs' },
    { key: 'autoLoot', label: 'Auto-Loot' },
  ]

  const tabs: { id: Tab; label: string; icon: string; minTier?: number }[] = [
    { id: 'access', label: 'Access', icon: 'code' },
    { id: 'player', label: 'Player', icon: 'star' },
    { id: 'arsenal', label: 'Arsenal', icon: 'sword' },
    { id: 'world', label: 'World', icon: 'map', minTier: 1 },
    { id: 'reality', label: 'Reality', icon: 'spark', minTier: 4 },
    { id: 'presets', label: 'Presets', icon: 'gear' },
    { id: 'snapshots', label: 'Snapshots', icon: 'shield' },
    { id: 'log', label: 'Log', icon: 'eye' },
  ]

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
        {dimensional && (
          <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(138,255,255,0.06) 3px)' }} />
        )}
        <motion.div
          initial={{ scale: 0.96, y: 12 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="relative w-full max-w-5xl h-[88vh] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: authorMode ? 'linear-gradient(160deg, #0a0a12, #050508)' : 'linear-gradient(160deg, #0c0716, #060309)',
            border: `1px solid ${accentTier}66`,
            boxShadow: `0 0 80px -20px ${accentTier}, inset 0 0 60px -30px ${accentTier}`,
          }}
        >
          {/* header */}
          <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: `${accentTier}44` }}>
            <div className="flex items-center gap-3">
              <motion.div animate={glitch ? { x: [0, -1, 1, 0], opacity: [1, 0.7, 1] } : {}} transition={{ repeat: Infinity, duration: 0.4, repeatDelay: 2 }}>
                <h2 className="font-display text-xl font-black tracking-[0.3em]" style={{ color: accentTier, textShadow: `0 0 20px ${accentTier}` }}>
                  SYSTEM OVERRIDE
                </h2>
              </motion.div>
              <span className="label px-2 py-0.5 rounded" style={{ border: `1px solid ${accentTier}55`, color: accentTier }}>
                {TIER_LABEL[tier]} · {TIER_DESC[tier]}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[0.6rem] text-[var(--color-ink-faint)]">overrides: {s.cheat.overrideCount}</span>
              <button className="btn py-1.5 px-3" onClick={onClose}>Close</button>
            </div>
          </div>

          {/* consequence warning bar */}
          {s.cheat.adminArc > 0 && (
            <div className="px-5 py-1.5 text-center font-mono text-[0.65rem]" style={{ background: 'color-mix(in srgb, var(--color-blood) 14%, transparent)', color: 'var(--color-blood)' }}>
              {s.cheat.adminArc >= 3 ? 'THE ADMINISTRATOR IS AWARE OF YOU.' : s.cheat.adminArc >= 2 ? 'Something is beginning to notice.' : 'That variable does not belong to you.'}
            </div>
          )}

          <div className="flex flex-1 min-h-0">
            {/* tabs */}
            <div className="w-40 shrink-0 border-r p-2 space-y-1 overflow-y-auto" style={{ borderColor: `${accentTier}33` }}>
              {tabs.filter((t) => (t.minTier ?? 0) <= tierIdx).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition"
                  style={{
                    background: tab === t.id ? `${accentTier}1e` : 'transparent',
                    color: tab === t.id ? accentTier : 'var(--color-ink-dim)',
                    border: `1px solid ${tab === t.id ? accentTier + '55' : 'transparent'}`,
                  }}
                >
                  <Icon name={t.icon} size={15} /> {t.label}
                </button>
              ))}
              <div className="pt-2 mt-2 border-t" style={{ borderColor: `${accentTier}22` }}>
                <p className="label px-1 mb-1">Consequences</p>
                <div className="flex gap-1 px-1">
                  {(['off', 'low', 'medium', 'high'] as const).map((lv) => (
                    <button key={lv} onClick={() => s.cheatSetConsequences(lv)} className="flex-1 py-1 rounded text-[0.55rem] font-mono uppercase"
                      style={{ background: s.cheat.consequences === lv ? `${accentTier}33` : 'var(--color-void)', color: s.cheat.consequences === lv ? accentTier : 'var(--color-ink-faint)', border: '1px solid var(--color-line)' }}>
                      {lv[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* content */}
            <div className="flex-1 overflow-y-auto p-4">
              {tab === 'access' && (
                <>
                  <Section title="Access Levels">
                    <p className="text-sm text-[var(--color-ink-dim)] mb-3">You have discovered {s.cheat.discoveredTiers.length} of {TIER_ORDER.length} layers of access. Deeper access rewrites more fundamental laws — and draws more attention.</p>
                    <div className="grid grid-cols-3 gap-2">
                      {TIER_ORDER.map((t) => {
                        const discovered = s.cheat.discoveredTiers.includes(t)
                        const active = s.cheat.tier === t
                        return (
                          <button key={t} disabled={!discovered} onClick={() => s.cheatSetTier(t)}
                            className="p-2.5 rounded-lg text-left disabled:opacity-40"
                            style={{ border: `1px solid ${active ? accentTier : 'var(--color-line)'}`, background: active ? `${accentTier}1e` : 'var(--color-void)' }}>
                            <div className="font-display text-sm tracking-widest" style={{ color: discovered ? accentTier : 'var(--color-ink-faint)' }}>{discovered ? TIER_LABEL[t] : '??????'}</div>
                            <div className="text-[0.62rem] text-[var(--color-ink-faint)]">{discovered ? TIER_DESC[t] : 'undiscovered'}</div>
                          </button>
                        )
                      })}
                    </div>
                  </Section>
                  <Section title="Probe Deeper">
                    {canProbe ? (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-[var(--color-ink-dim)]">Force a connection to a deeper layer. This is not supposed to work.</p>
                        <button className="btn btn-primary" style={{ background: `linear-gradient(180deg, ${accentTier}, ${accentTier}88)`, borderColor: accentTier }}
                          onClick={() => s.cheatUnlock(nextTier)}>Probe → {TIER_LABEL[nextTier]}</button>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-ink-dim)]">There is nothing deeper. You have reached the layer that should not exist.</p>
                    )}
                  </Section>
                  {s.cheat.achievements.length > 0 && (
                    <Section title="System Achievements">
                      <div className="flex flex-wrap gap-2">
                        {s.cheat.achievements.map((a) => (
                          <span key={a} className="font-mono text-[0.6rem] px-2 py-1 rounded" style={{ border: `1px solid ${accentTier}55`, color: accentTier }}>{a.replace(/_/g, ' ').toUpperCase()}</span>
                        ))}
                      </div>
                    </Section>
                  )}
                </>
              )}

              {tab === 'player' && (
                <>
                  <Section title="Invulnerability & Resources">
                    <div className="grid grid-cols-2 gap-2">
                      {flagList.map((f) => (
                        <Toggle key={f.key} label={f.label} on={!!s.cheat.flags[f.key]} onClick={() => s.cheatToggle(f.key)} />
                      ))}
                    </div>
                  </Section>
                  <Section title="Attributes">
                    <div className="flex items-center gap-2 mb-2">
                      <input type="number" value={statVals} onChange={(e) => setStatVals(+e.target.value)} className="w-24 bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1 font-mono text-sm" />
                      <ActBtn label="Set All" onClick={() => s.cheatAllStats(statVals)} primary />
                      <ActBtn label="×2" onClick={() => s.cheatMultStats(2)} />
                      <ActBtn label="×10" onClick={() => s.cheatMultStats(10)} />
                      <ActBtn label="Randomize" onClick={() => s.cheatRandomStats()} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {ATTRS.map((k) => (
                        <div key={k} className="flex items-center justify-between gap-2">
                          <span className="text-[0.72rem] text-[var(--color-ink-dim)] capitalize w-24">{k}</span>
                          <span className="font-mono text-xs w-10 text-right">{s.player.attributes[k]}</span>
                          <input type="number" defaultValue={s.player.attributes[k]} onBlur={(e) => s.cheatSetStat(k, +e.target.value)}
                            className="w-16 bg-[var(--color-void)] border border-[var(--color-line)] rounded px-1.5 py-0.5 font-mono text-xs" />
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section title="Level & XP">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm">Lv {s.player.level}</span>
                      <ActBtn label="+1 Level" onClick={() => s.cheatSetLevel(s.player.level + 1)} />
                      <ActBtn label="Set 50" onClick={() => s.cheatSetLevel(50)} />
                      <ActBtn label="Set 99" onClick={() => s.cheatSetLevel(99)} />
                      <ActBtn label="+1000 XP" onClick={() => s.cheatAddXp(1000)} />
                      <span className="label ml-2">XP Multiplier</span>
                      {[1, 2, 10, 100, 1000].map((m) => (
                        <button key={m} onClick={() => s.cheatSetFlag('xpMultiplier', m)} className="btn text-[0.6rem] py-1 px-2" style={s.cheat.flags.xpMultiplier === m ? { borderColor: accentTier, color: accentTier } : undefined}>{m}x</button>
                      ))}
                    </div>
                  </Section>
                  <Section title="Currencies">
                    <div className="grid grid-cols-2 gap-2">
                      {CURRENCIES.map((c) => (
                        <div key={c} className="flex items-center justify-between gap-2">
                          <span className="text-[0.72rem] text-[var(--color-ink-dim)] capitalize w-28">{c}</span>
                          <span className="font-mono text-xs w-16 text-right">{s.player.currencies[c]}</span>
                          <ActBtn label="+1k" onClick={() => s.cheatSetCurrency(c, s.player.currencies[c] + 1000)} />
                          <ActBtn label="MAX" onClick={() => s.cheatSetCurrency(c, 999999)} />
                        </div>
                      ))}
                    </div>
                  </Section>
                  <Section title="Skills & Titles & Class">
                    <div className="flex flex-wrap gap-2">
                      <ActBtn label="Unlock All Skills" onClick={() => s.cheatUnlockAllSkills()} primary />
                      <ActBtn label="Unlock All Titles" onClick={() => s.cheatUnlockAllTitles()} primary />
                      <ActBtn label="Ascension Override → CONCEPTUAL" onClick={() => s.cheatAscendMax()} primary />
                    </div>
                  </Section>
                </>
              )}

              {tab === 'arsenal' && (
                <>
                  <Section title="Weapon Generator">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input placeholder="Name (blank = generated)" value={wName} onChange={(e) => setWName(e.target.value)} className="col-span-2 bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm" />
                      <select value={wType} onChange={(e) => setWType(e.target.value)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm">
                        {WEAPON_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <select value={wRarity} onChange={(e) => setWRarity(e.target.value as Rarity)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm">
                        {RARITIES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </select>
                      <select value={wElement} onChange={(e) => setWElement(e.target.value as Element)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm">
                        {ELEMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <input placeholder="Concept (e.g. Distance)" value={wConcept} onChange={(e) => setWConcept(e.target.value)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm" />
                      <input placeholder="Custom lore (optional)" value={wLore} onChange={(e) => setWLore(e.target.value)} className="col-span-2 bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm" />
                    </div>
                    <div className="flex items-center justify-between">
                      <Toggle label="Sentient" on={wSentient} onClick={() => setWSentient(!wSentient)} />
                      <button className="btn btn-primary ml-3" style={{ background: `linear-gradient(180deg, ${accentTier}, ${accentTier}88)`, borderColor: accentTier }}
                        onClick={() => s.cheatSpawnWeapon({ name: wName || undefined, weaponType: wType, rarity: wRarity, element: wElement, concept: wConcept || undefined, sentient: wSentient, lore: wLore || undefined })}>
                        Generate Weapon
                      </button>
                    </div>
                  </Section>
                  <Section title="Armor Generator">
                    <div className="flex flex-wrap items-center gap-2">
                      <select value={aSlot} onChange={(e) => setASlot(e.target.value as EquipSlot)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm">
                        {ARMOR_SLOTS.map((sl) => <option key={sl} value={sl}>{sl}</option>)}
                      </select>
                      <select value={aRarity} onChange={(e) => setARarity(e.target.value as Rarity)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm">
                        {RARITIES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </select>
                      <select value={aElement} onChange={(e) => setAElement(e.target.value as Element)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm">
                        {ELEMENTS.map((e) => <option key={e} value={e}>{e}</option>)}
                      </select>
                      <button className="btn btn-primary" style={{ background: `linear-gradient(180deg, ${accentTier}, ${accentTier}88)`, borderColor: accentTier }}
                        onClick={() => s.cheatSpawnArmor({ slot: aSlot, rarity: aRarity, element: aElement })}>Generate Armor</button>
                    </div>
                  </Section>
                  <Section title="Loot & Drop Rates">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="label">Guaranteed rarity on next drops</span>
                      <select value={s.cheat.flags.guaranteedRarity ?? ''} onChange={(e) => s.cheatSetFlag('guaranteedRarity', (e.target.value || null) as Rarity | null)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm">
                        <option value="">off</option>
                        {RARITIES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
                      </select>
                      <span className="label ml-2">Loot ×</span>
                      {[1, 2, 3, 5].map((m) => (
                        <button key={m} onClick={() => s.cheatSetFlag('lootMultiplier', m)} className="btn text-[0.6rem] py-1 px-2" style={s.cheat.flags.lootMultiplier === m ? { borderColor: accentTier, color: accentTier } : undefined}>{m}x</button>
                      ))}
                    </div>
                  </Section>
                </>
              )}

              {tab === 'world' && (
                <>
                  <Section title="Spawn Location">
                    <div className="flex flex-wrap items-center gap-2">
                      <input placeholder="Name (optional)" value={locName} onChange={(e) => setLocName(e.target.value)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm" />
                      <select value={locType} onChange={(e) => setLocType(e.target.value)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm">
                        {['town', 'village', 'dungeon', 'temple', 'ruins', 'wild', 'landmark', 'realm', 'secret'].map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <label className="label">danger {locDanger}</label>
                      <input type="range" min={1} max={5} value={locDanger} onChange={(e) => setLocDanger(+e.target.value)} />
                      <button className="btn btn-primary" style={{ background: `linear-gradient(180deg, ${accentTier}, ${accentTier}88)`, borderColor: accentTier }}
                        onClick={() => s.cheatSpawnLocation({ name: locName || undefined, type: locType as never, danger: locDanger })}>Generate</button>
                    </div>
                  </Section>
                  <Section title="Tear a Rift">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="label">tier {riftTier}</label>
                      <input type="range" min={1} max={9} value={riftTier} onChange={(e) => setRiftTier(+e.target.value)} />
                      <button className="btn btn-primary" style={{ background: `linear-gradient(180deg, ${accentTier}, ${accentTier}88)`, borderColor: accentTier }}
                        onClick={() => s.cheatSpawnRift({ tier: riftTier, element: 'void' })}>Spawn Rift</button>
                    </div>
                  </Section>
                  <Section title="Spawn Entity">
                    <div className="flex flex-wrap items-center gap-2">
                      <input placeholder="Name (optional)" value={npcName} onChange={(e) => setNpcName(e.target.value)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm" />
                      <Toggle label="As Boss" on={npcBoss} onClick={() => setNpcBoss(!npcBoss)} />
                      <button className="btn btn-primary" style={{ background: `linear-gradient(180deg, ${accentTier}, ${accentTier}88)`, borderColor: accentTier }}
                        onClick={() => s.cheatSpawnNpc({ name: npcName || undefined, boss: npcBoss, level: s.player.level })}>Spawn</button>
                    </div>
                  </Section>
                  <Section title="Weather & Events">
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['ash-fall', 'blood moon', 'void storm', 'divine rain', 'meteor shower', 'aurora', 'eclipse', 'dimensional storm'].map((w) => (
                        <ActBtn key={w} label={w} onClick={() => s.cheatSetWeather(w)} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[['Dragon Invasion', 'A shadow crosses the sun. Wings the size of towns.'], ['Rift Apocalypse', 'Every rift in the Reach opens at once.'], ['God Descent', 'Something enormous decides to become visible.'], ['Reality Fracture', 'A seam in the world catches, and tears.']].map(([t, d]) => (
                        <ActBtn key={t} label={t} onClick={() => s.cheatWorldEvent(t, d)} />
                      ))}
                    </div>
                  </Section>
                  <Section title="Reveal">
                    <ActBtn label="Reveal Entire Map" onClick={() => s.cheatRevealMap()} primary />
                  </Section>
                  <Section title="Author a Quest">
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input placeholder="Quest name" value={qName} onChange={(e) => setQName(e.target.value)} className="col-span-2 bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm" />
                      <input placeholder="Description" value={qDesc} onChange={(e) => setQDesc(e.target.value)} className="col-span-2 bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm" />
                      <input placeholder="Reward" value={qReward} onChange={(e) => setQReward(e.target.value)} className="bg-[var(--color-void)] border border-[var(--color-line)] rounded px-2 py-1.5 text-sm" />
                      <button className="btn btn-primary" style={{ background: `linear-gradient(180deg, ${accentTier}, ${accentTier}88)`, borderColor: accentTier }}
                        onClick={() => qName && s.cheatCreateQuest({ name: qName, description: qDesc || 'An authored quest.', reward: qReward || 'unknown', difficulty: 3 })}>Create</button>
                    </div>
                  </Section>
                </>
              )}

              {tab === 'reality' && (
                <>
                  <Section title="Concept Override">
                    <p className="text-sm text-[var(--color-ink-dim)] mb-3">Reach into the source of the world and revoke an idea. Reality will comply. Something will notice.</p>
                    <div className="flex flex-wrap gap-2">
                      {CONCEPTS.map((c) => (
                        <button key={c} onClick={() => s.cheatConceptOverride(c)} className="btn text-[0.66rem] py-1.5 px-3"
                          style={s.cheat.conceptOverrides.includes(c) ? { borderColor: '#fff', color: '#fff', textDecoration: 'line-through' } : { borderColor: '#8affff55', color: '#8affff' }}>
                          Revoke {c}
                        </button>
                      ))}
                    </div>
                  </Section>
                  <Section title="Chaos">
                    <div className="flex flex-wrap gap-2">
                      <ActBtn label="Seed Chaos" onClick={() => s.cheatChaos()} danger />
                      <ActBtn label="New Game +" onClick={() => s.cheatNewGamePlus()} danger />
                    </div>
                  </Section>
                  {authorMode && (
                    <Section title="Author Mode">
                      <p className="text-sm text-[var(--color-ink-dim)]">The world is a document open before you. Every system on every tab now answers instantly and without cost. There are no more requirements — only choices.</p>
                    </Section>
                  )}
                </>
              )}

              {tab === 'presets' && (
                <Section title="Override Presets">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['casual-god', 'Casual God', '∞ HP/Mana · 2× XP'],
                      ['loot-god', 'Loot God', 'Legendary drops · 3× loot'],
                      ['one-punch', 'One Punch', '999 stats · one-shot'],
                      ['immortal', 'Immortal', 'No death · no debuffs'],
                      ['chaos', 'Chaos', 'Randomize everything'],
                      ['author', 'Author', 'All systems unlocked'],
                      ['reality-breaker', 'Reality Breaker', 'Delete Distance · god mode'],
                    ].map(([id, name, desc]) => (
                      <button key={id} onClick={() => s.cheatPreset(id)} className="panel-inset p-3 text-left hover:border-[var(--color-r-abyssal)] transition" style={{ borderColor: 'var(--color-line)' }}>
                        <div className="font-display tracking-widest text-sm" style={{ color: accentTier }}>{name}</div>
                        <div className="text-[0.65rem] text-[var(--color-ink-faint)] mt-0.5">{desc}</div>
                      </button>
                    ))}
                  </div>
                </Section>
              )}

              {tab === 'snapshots' && (
                <>
                  <Section title="Reality Snapshots">
                    <p className="text-sm text-[var(--color-ink-dim)] mb-3">Save the current state of reality. Revert if an edit goes wrong.</p>
                    <div className="flex gap-2 mb-3">
                      <ActBtn label="Take Snapshot" onClick={() => s.cheatSnapshot()} primary />
                      <ActBtn label="Undo Last Override" onClick={() => s.cheatUndoLast()} danger />
                    </div>
                    <div className="space-y-2">
                      {s.cheat.snapshots.length === 0 && <p className="text-sm text-[var(--color-ink-faint)]">No snapshots yet.</p>}
                      {s.cheat.snapshots.map((snap) => (
                        <div key={snap.id} className="flex items-center justify-between panel-inset px-3 py-2">
                          <span className="font-mono text-xs">{snap.label}</span>
                          <div className="flex gap-2">
                            <ActBtn label="Revert" onClick={() => s.cheatRevert(snap.id)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                </>
              )}

              {tab === 'log' && (
                <Section title="System Override Log">
                  <div className="space-y-1 font-mono text-[0.68rem]">
                    {s.cheat.log.length === 0 && <p className="text-[var(--color-ink-faint)]">No overrides recorded.</p>}
                    {s.cheat.log.map((l) => (
                      <div key={l.id} className="flex gap-3 py-0.5 border-b border-[var(--color-line)]/40">
                        <span className="text-[var(--color-ink-faint)]">{String(Math.floor(l.time / 60) % 24).padStart(2, '0')}:{String(l.time % 60).padStart(2, '0')}</span>
                        <span style={{ color: accentTier }}>[{TIER_LABEL[l.tier]}]</span>
                        <span className="text-[var(--color-ink-dim)]">{l.text}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
