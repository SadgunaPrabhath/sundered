import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/state/store'
import { Visual } from '@/components/Visual'
import { Bar, Icon } from '@/components/ui'
import { formatWorldTime } from '@/engine/narrative'
import { rarity as rInfo } from '@/engine/rarity'
import type { AttrKey, NarrationTone } from '@/state/types'
import CombatView from './CombatView'
import InventoryView from './InventoryView'
import MapView from './MapView'

const TONE: Record<NarrationTone, string> = {
  normal: 'var(--color-ink-dim)',
  important: 'var(--color-aether)',
  major: 'var(--color-warn)',
  ominous: 'var(--color-blood)',
  system: '#8a6bff',
}

const ATTR_META: { key: AttrKey; label: string; icon: string }[] = [
  { key: 'strength', label: 'Strength', icon: 'sword' },
  { key: 'agility', label: 'Agility', icon: 'spark' },
  { key: 'vitality', label: 'Vitality', icon: 'shield' },
  { key: 'intelligence', label: 'Intelligence', icon: 'star' },
  { key: 'willpower', label: 'Willpower', icon: 'flag' },
  { key: 'perception', label: 'Perception', icon: 'eye' },
  { key: 'endurance', label: 'Endurance', icon: 'users' },
  { key: 'luck', label: 'Luck', icon: 'gold' },
]

type Panel = 'character' | 'skills' | 'quests' | 'companions' | 'factions'

// ============================ EXPLORE ============================
function ExploreView() {
  const s = useGame()
  const loc = s.locations[s.currentLocation]
  const [input, setInput] = useState('')
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [s.narration.length])

  if (!loc) return null
  const asset = s.assets[loc.id]

  const submit = () => {
    if (!input.trim()) return
    s.worldInput(input)
    setInput('')
  }

  const npcsHere = (loc.npcs ?? []).map((id) => s.npcs[id]).filter(Boolean)

  const actions: { label: string; action: string; show: boolean }[] = [
    { label: 'Search', action: 'search', show: true },
    { label: 'Observe', action: 'observe', show: true },
    { label: 'Rest', action: 'rest', show: loc.type === 'town' || loc.type === 'village' },
    { label: 'Trade', action: 'trade', show: loc.type === 'town' || loc.type === 'village' },
    { label: loc.type === 'rift' ? 'Approach the Rift' : 'Approach', action: 'approach', show: loc.type === 'rift' || !!loc.boss },
  ]

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* location banner */}
      <div className="relative shrink-0 h-40 sm:h-52 rounded-xl overflow-hidden mb-3 border border-[var(--color-line)]">
        {asset && <Visual req={{ category: 'location', seed: loc.seed, element: 'none', biome: loc.biome, danger: loc.danger }} className="absolute inset-0" rounded={false} />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(3,3,8,0.95), transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="label" style={{ color: 'var(--color-ember)' }}>{loc.region} · {loc.biome}</span>
            <span className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i < loc.danger ? 'var(--color-blood)' : 'var(--color-line)' }} />
              ))}
            </span>
          </div>
          <h1 className="font-display text-3xl font-black text-shadow-deep">{loc.name}</h1>
        </div>
      </div>

      {/* narration feed */}
      <div ref={feedRef} className="flex-1 min-h-0 overflow-y-auto panel-inset p-4 space-y-2 mb-3">
        {s.narration.length === 0 && <p className="text-[var(--color-ink-faint)] italic">The grey waits. Speak, or act.</p>}
        {s.narration.map((n) => (
          <motion.p key={n.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
            className={`leading-relaxed ${n.tone === 'system' ? 'font-mono text-sm' : n.tone === 'major' ? 'font-display text-lg' : 'text-[0.95rem]'}`}
            style={{ color: TONE[n.tone] }}>
            {n.tone === 'major' && '✦ '}{n.text}
          </motion.p>
        ))}
      </div>

      {/* NPCs present */}
      {npcsHere.length > 0 && (
        <div className="shrink-0 flex flex-wrap gap-2 mb-3">
          {npcsHere.map((n) => (
            <button key={n.id} onClick={() => useGame.setState({ mode: 'dialogue', activeDialogueNpc: n.id })}
              className="flex items-center gap-2 panel-inset px-2.5 py-1.5 hover:border-[var(--color-aether)] transition">
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                <Visual req={{ category: 'portrait', seed: n.seed, element: 'shadow', boss: n.isBoss }} rounded={false} />
              </div>
              <div className="text-left">
                <div className="text-sm leading-tight">{n.name}</div>
                <div className="label leading-tight">{n.role}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* action bar */}
      <div className="shrink-0 flex flex-wrap gap-2 mb-2">
        {actions.filter((a) => a.show).map((a) => (
          <button key={a.action} className="btn py-2" onClick={() => s.locationAction(a.action)}>{a.label}</button>
        ))}
        {loc.connections.length > 0 && <button className="btn py-2" onClick={() => s.setMode('map')}><Icon name="map" size={14} className="inline mr-1" />Travel</button>}
      </div>

      {/* free-text world input */}
      <div className="shrink-0 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Do anything…  (e.g. “search the ruins”, “look for a way down”, “rest”)"
          className="flex-1 bg-[var(--color-void)] border border-[var(--color-line)] rounded-lg px-3.5 py-2.5 text-sm focus:border-[var(--color-aether)] outline-none"
        />
        <button className="btn btn-primary px-5" onClick={submit}>Act</button>
      </div>
    </div>
  )
}

// ============================ DIALOGUE ============================
function DialogueView() {
  const s = useGame()
  const npc = s.activeDialogueNpc ? s.npcs[s.activeDialogueNpc] : null
  if (!npc) {
    return <div className="flex items-center justify-center h-full text-[var(--color-ink-faint)]">No one here.</div>
  }
  const leave = () => useGame.setState({ mode: 'explore', activeDialogueNpc: null })

  const say = (line: string, response: string, effect?: () => void) => {
    s.narrate(`You: "${line}"`, 'normal')
    s.narrate(`${npc.name}: "${response}"`, 'important')
    s.addMemory(npc.id, `You spoke of ${line.slice(0, 24)}…`)
    effect?.()
  }

  const canRecruit = npc.id === 'comp_kael' && !npc.isCompanion

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-[var(--color-line)]">
          <Visual req={{ category: 'portrait', seed: npc.seed, element: 'shadow', boss: npc.isBoss }} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-black">{npc.name}</h1>
          <p className="label" style={{ color: 'var(--color-ember)' }}>{npc.role} · {s.factions[npc.faction]?.name ?? npc.faction}</p>
          <p className="text-sm text-[var(--color-ink-dim)] mt-1 max-w-md">{npc.appearance}</p>
        </div>
      </div>

      <div className="panel-inset p-4 mb-4 flex-1 min-h-0 overflow-y-auto">
        <p className="text-[var(--color-ink)] leading-relaxed italic">"{npc.personality.split('.')[0]}."</p>
        <p className="text-sm text-[var(--color-ink-dim)] mt-3">{npc.background}</p>
        {npc.memories.length > 0 && (
          <p className="text-xs text-[var(--color-ink-faint)] mt-4">They remember: {npc.memories.slice(-2).join(' · ')}</p>
        )}
      </div>

      <div className="shrink-0 grid gap-2">
        <button className="btn text-left py-2.5 px-3" onClick={() => say('What is this place?', `${npc.goal}. That is what keeps me here.`)}>Ask about this place</button>
        <button className="btn text-left py-2.5 px-3" onClick={() => say('What do you fear?', `${npc.fear}. Say nothing of it.`, () => s.setRelation(npc.id, 'trust', npc.trust + 5))}>Ask what they fear</button>
        <button className="btn text-left py-2.5 px-3" onClick={() => say('We could work together.', 'Prove you are worth the risk, Riftborn.', () => s.setRelation(npc.id, 'trust', npc.trust + 8))}>Offer alliance</button>
        {canRecruit && <button className="btn btn-primary text-left py-2.5 px-3" onClick={() => s.recruit(npc.id)}>Ask them to join you</button>}
        {npc.isMerchant && <button className="btn btn-ember text-left py-2.5 px-3" onClick={() => s.grantLoot({ level: s.player.level, depth: 1, count: 1, reason: `${npc.name} shows you their wares.` })}>Browse wares</button>}
        <button className="btn text-left py-2.5 px-3" onClick={leave}>Take your leave</button>
      </div>
    </div>
  )
}

// ============================ SIDE PANELS ============================
function CharacterPanel() {
  const s = useGame()
  const p = s.player
  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-xl font-bold">{p.name}</h3>
          <span className="label">Lv {p.level}</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-aether)' }}>{p.className}</p>
        <p className="label mt-0.5">{p.ascension.toUpperCase()} · {p.classPath.join(' → ')}</p>
      </div>

      <div className="space-y-2">
        <Bar label="XP" value={p.xp} max={p.xpToNext} color="var(--color-aether)" height={7} />
        <Bar label="Ascension" value={p.ascensionProgress} max={100} color="var(--color-r-divine)" height={7} />
      </div>

      {p.ascensionProgress >= 100 && (
        <button className="btn btn-primary w-full" style={{ background: 'linear-gradient(180deg, var(--color-r-divine), #b98a20)', borderColor: 'var(--color-r-divine)', color: '#1a1206' }} onClick={() => s.ascend()}>
          ✦ ASCEND ✦
        </button>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="label">Attributes</h4>
          {p.attrPoints > 0 && <span className="label" style={{ color: 'var(--color-vital)' }}>{p.attrPoints} points</span>}
        </div>
        <div className="space-y-1.5">
          {ATTR_META.map((a) => (
            <div key={a.key} className="flex items-center gap-2">
              <Icon name={a.icon} size={13} className="text-[var(--color-ink-faint)]" />
              <span className="text-[0.78rem] text-[var(--color-ink-dim)] flex-1">{a.label}</span>
              <span className="font-mono text-sm">{p.attributes[a.key]}</span>
              {p.attrPoints > 0 && (
                <button className="w-5 h-5 rounded flex items-center justify-center text-xs" style={{ border: '1px solid var(--color-vital)', color: 'var(--color-vital)' }} onClick={() => s.allocateAttr(a.key)}>+</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {p.activeTitles.length > 0 && (
        <div>
          <h4 className="label mb-1.5">Titles</h4>
          <div className="flex flex-wrap gap-1.5">
            {p.titles.map((tid) => {
              const t = s.titles[tid]
              if (!t) return null
              const active = p.activeTitles.includes(tid)
              return (
                <button key={tid} onClick={() => s.toggleTitle(tid)} title={t.description}
                  className="text-[0.6rem] font-mono px-2 py-1 rounded uppercase tracking-wider"
                  style={{ color: rInfo(t.rarity).color, border: `1px solid ${rInfo(t.rarity).color}${active ? 'aa' : '33'}`, background: active ? `${rInfo(t.rarity).color}18` : 'transparent' }}>
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(p.currencies).filter(([, v]) => v > 0).map(([k, v]) => (
          <div key={k} className="flex items-center justify-between panel-inset px-2 py-1">
            <span className="label capitalize">{k}</span>
            <span className="font-mono text-xs" style={{ color: 'var(--color-warn)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SkillsPanel() {
  const s = useGame()
  const skills = Object.keys(s.player.skills).map((id) => s.skills[id]).filter(Boolean)
  if (skills.length === 0) return <p className="text-[var(--color-ink-faint)] text-sm">No skills yet. Grow, and power will find you.</p>
  return (
    <div className="space-y-2">
      {skills.map((sk) => (
        <div key={sk.id} className="panel-inset p-2.5 flex gap-2.5">
          <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0">
            <Visual req={{ category: 'skill', seed: sk.seed, element: sk.element }} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold" style={{ color: sk.kind === 'conceptual' ? '#fff' : 'var(--color-aether)' }}>{sk.name}</span>
              <span className="label">{sk.kind}</span>
            </div>
            <p className="text-xs text-[var(--color-ink-dim)] leading-snug mt-0.5">{sk.description}</p>
            <div className="flex gap-3 mt-1 label">
              <span>PWR {sk.power}</span><span>COST {sk.cost}</span><span>CD {sk.cooldown}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function QuestsPanel() {
  const s = useGame()
  const quests = Object.values(s.quests).filter((q) => !q.hidden && q.status !== 'failed')
  if (quests.length === 0) return <p className="text-[var(--color-ink-faint)] text-sm">No quests.</p>
  return (
    <div className="space-y-2.5">
      {quests.map((q) => (
        <div key={q.id} className="panel-inset p-3" style={{ opacity: q.status === 'complete' ? 0.55 : 1 }}>
          <div className="flex items-center justify-between">
            <h4 className="font-display text-sm font-semibold">{q.name}</h4>
            <span className="label" style={{ color: q.status === 'complete' ? 'var(--color-vital)' : q.status === 'active' ? 'var(--color-warn)' : 'var(--color-ink-faint)' }}>{q.status}</span>
          </div>
          <p className="text-xs text-[var(--color-ink-dim)] mt-1">{q.description}</p>
          <ul className="mt-2 space-y-1">
            {q.objectives.map((o) => (
              <li key={o.id} className="text-xs flex items-center gap-2" style={{ color: o.done ? 'var(--color-vital)' : 'var(--color-ink-dim)' }}>
                <span>{o.done ? '◆' : '◇'}</span>{o.description}
              </li>
            ))}
          </ul>
          {q.status === 'available' && <button className="btn text-[0.6rem] py-1 px-2.5 mt-2" onClick={() => s.acceptQuest(q.id)}>Accept</button>}
          <p className="label mt-2">Reward: {q.reward}</p>
        </div>
      ))}
    </div>
  )
}

function CompanionsPanel() {
  const s = useGame()
  const comps = Object.values(s.companions)
  if (comps.length === 0) return <p className="text-[var(--color-ink-faint)] text-sm">You walk alone. For now.</p>
  return (
    <div className="space-y-2">
      {comps.map((c) => (
        <div key={c.id} className="panel-inset p-2.5 flex gap-2.5 items-center">
          <div className="w-11 h-11 rounded-full overflow-hidden shrink-0"><Visual req={{ category: 'portrait', seed: c.seed, element: 'shadow' }} /></div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-sm font-semibold">{c.name}</div>
            <div className="label">{c.className} · Lv {c.cLevel}</div>
            <Bar value={c.relationship} max={100} color="var(--color-vital)" height={5} showNums={false} />
          </div>
        </div>
      ))}
    </div>
  )
}

function FactionsPanel() {
  const s = useGame()
  const facs = Object.values(s.factions)
  return (
    <div className="space-y-2">
      {facs.map((f) => (
        <div key={f.id} className="panel-inset p-2.5">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm font-semibold">{f.name}</span>
            <span className="label" style={{ color: f.reputation >= 10 ? 'var(--color-vital)' : f.reputation <= -10 ? 'var(--color-blood)' : 'var(--color-ink-faint)' }}>{f.standing}</span>
          </div>
          <p className="text-xs text-[var(--color-ink-dim)] mt-1">{f.description}</p>
        </div>
      ))}
    </div>
  )
}

// ============================ SETTINGS ============================
function SettingsMenu({ onClose }: { onClose: () => void }) {
  const s = useGame()
  const toggle = (k: 'reduceMotion' | 'highContrast' | 'music' | 'sfx' | 'performanceMode') => s.setSetting(k, !s.settings[k])
  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-end p-3" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} onClick={(e) => e.stopPropagation()}
        className="relative panel glass w-72 p-4 mt-12">
        <h3 className="font-display text-lg font-bold mb-3">Settings</h3>
        <div className="space-y-2">
          {([['reduceMotion', 'Reduce Motion'], ['highContrast', 'High Contrast'], ['music', 'Music'], ['sfx', 'Sound Effects'], ['performanceMode', 'Performance Mode']] as const).map(([k, label]) => (
            <button key={k} onClick={() => toggle(k)} className="flex items-center justify-between w-full px-3 py-2 rounded-lg border text-sm"
              style={{ borderColor: s.settings[k] ? 'var(--color-vital)' : 'var(--color-line)', background: s.settings[k] ? 'color-mix(in srgb, var(--color-vital) 12%, transparent)' : 'transparent' }}>
              <span className={s.settings[k] ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink-dim)]'}>{label}</span>
              <span className="font-mono text-[0.6rem]" style={{ color: s.settings[k] ? 'var(--color-vital)' : 'var(--color-ink-faint)' }}>{s.settings[k] ? 'ON' : 'OFF'}</span>
            </button>
          ))}
          <div className="flex items-center justify-between px-3 py-2">
            <span className="label">Text Speed</span>
            <div className="flex gap-1">
              {(['slow', 'normal', 'fast', 'instant'] as const).map((sp) => (
                <button key={sp} onClick={() => s.setSetting('textSpeed', sp)} className="text-[0.55rem] font-mono uppercase px-1.5 py-1 rounded"
                  style={{ background: s.settings.textSpeed === sp ? 'var(--color-aether)33' : 'var(--color-void)', color: s.settings.textSpeed === sp ? 'var(--color-aether)' : 'var(--color-ink-faint)', border: '1px solid var(--color-line)' }}>{sp[0]}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--color-line)] space-y-2">
          <button className="btn w-full py-2" onClick={() => { s.saveNow(); onClose() }}>Save Game</button>
          <button className="btn w-full py-2" style={{ borderColor: 'var(--color-blood)', color: 'var(--color-blood)' }}
            onClick={() => { if (confirm('Return to title? Your progress is saved.')) { s.saveNow(); s.setMode('title') } }}>Return to Title</button>
        </div>
        <p className="label mt-3 text-center opacity-60">There are seams in every world. Some can be pried open.</p>
      </motion.div>
    </div>
  )
}

// ============================ SHELL ============================
export default function GameShell({ onOpenSystem }: { onOpenSystem: () => void }) {
  const s = useGame()
  const p = s.player
  const [panel, setPanel] = useState<Panel>('character')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const fullScreen = s.mode === 'combat'

  const panels: { id: Panel; label: string; icon: string }[] = [
    { id: 'character', label: 'Character', icon: 'star' },
    { id: 'skills', label: 'Skills', icon: 'spark' },
    { id: 'quests', label: 'Quests', icon: 'quest' },
    { id: 'companions', label: 'Party', icon: 'users' },
    { id: 'factions', label: 'Factions', icon: 'flag' },
  ]

  const navItems: { mode: typeof s.mode; label: string; icon: string }[] = [
    { mode: 'explore', label: 'Explore', icon: 'eye' },
    { mode: 'map', label: 'Map', icon: 'map' },
    { mode: 'inventory', label: 'Inventory', icon: 'bag' },
  ]

  return (
    <div className="h-full flex flex-col bg-[var(--color-void)]">
      {/* ===== TOP HUD ===== */}
      <header className="shrink-0 flex items-center gap-3 px-3 sm:px-4 py-2 border-b border-[var(--color-line)] glass z-30">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-[var(--color-line)]">
            <Visual req={{ category: 'portrait', seed: p.seed, element: 'aether' }} />
          </div>
          <div className="min-w-0 hidden sm:block">
            <div className="text-sm font-semibold leading-tight truncate">{p.name}</div>
            <div className="label leading-tight">{p.className} · Lv {p.level}</div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 gap-2 max-w-md">
          <Bar value={p.hp} max={p.maxHp} color="var(--color-blood)" height={8} label="HP" />
          <Bar value={p.mana} max={p.maxMana} color="var(--color-mana)" height={8} label="Mana" />
          <Bar value={p.stamina} max={p.maxStamina} color="var(--color-vital)" height={8} label="Stamina" />
        </div>

        <div className="hidden md:flex items-center gap-3 label">
          <span><Icon name="gold" size={12} className="inline text-[var(--color-warn)]" /> {p.currencies.gold}</span>
          <span>{formatWorldTime(s.worldTime)}</span>
          <span className="capitalize" style={{ color: 'var(--color-ember)' }}>{s.weather}</span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {s.cheat.unlocked && (
            <button onClick={onOpenSystem} title="System Override"
              className="btn py-1.5 px-2.5 text-[0.6rem]" style={{ borderColor: '#7b3dff', color: '#a06bff' }}>
              <Icon name="code" size={13} className="inline mr-1" />SYSTEM
            </button>
          )}
          <button className="btn py-1.5 px-2.5 text-[0.6rem]" onClick={() => s.saveNow()}>Save</button>
          <button className="btn py-1.5 px-2 text-[0.6rem]" title="Settings" onClick={() => setSettingsOpen(true)}><Icon name="gear" size={14} /></button>
        </div>
      </header>

      {settingsOpen && <SettingsMenu onClose={() => setSettingsOpen(false)} />}

      {/* ===== BODY ===== */}
      {fullScreen ? (
        <div className="flex-1 min-h-0"><CombatView /></div>
      ) : (
        <div className="flex-1 min-h-0 flex">
          {/* left nav rail */}
          <nav className="shrink-0 w-14 sm:w-16 border-r border-[var(--color-line)] flex flex-col items-center py-3 gap-1.5 glass">
            {navItems.map((n) => (
              <button key={n.mode} onClick={() => s.setMode(n.mode)} title={n.label}
                className="w-11 h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition"
                style={{ background: s.mode === n.mode ? 'color-mix(in srgb, var(--color-aether) 18%, transparent)' : 'transparent', color: s.mode === n.mode ? 'var(--color-aether)' : 'var(--color-ink-faint)', border: `1px solid ${s.mode === n.mode ? 'var(--color-aether)55' : 'transparent'}` }}>
                <Icon name={n.icon} size={18} />
                <span className="text-[0.5rem] uppercase tracking-wide">{n.label}</span>
              </button>
            ))}
          </nav>

          {/* center */}
          <main className="flex-1 min-w-0 p-3 sm:p-4 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div key={s.mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="h-full">
                {s.mode === 'explore' && <ExploreView />}
                {s.mode === 'dialogue' && <DialogueView />}
                {s.mode === 'inventory' && <InventoryView />}
                {s.mode === 'map' && <MapView />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* right contextual panel */}
          <aside className="shrink-0 w-72 lg:w-80 border-l border-[var(--color-line)] flex flex-col glass">
            <div className="shrink-0 flex border-b border-[var(--color-line)]">
              {panels.map((pn) => (
                <button key={pn.id} onClick={() => setPanel(pn.id)} title={pn.label}
                  className="flex-1 py-2.5 flex items-center justify-center transition"
                  style={{ background: panel === pn.id ? 'color-mix(in srgb, var(--color-aether) 14%, transparent)' : 'transparent', color: panel === pn.id ? 'var(--color-aether)' : 'var(--color-ink-faint)', borderBottom: `2px solid ${panel === pn.id ? 'var(--color-aether)' : 'transparent'}` }}>
                  <Icon name={pn.icon} size={16} />
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5">
              {panel === 'character' && <CharacterPanel />}
              {panel === 'skills' && <SkillsPanel />}
              {panel === 'quests' && <QuestsPanel />}
              {panel === 'companions' && <CompanionsPanel />}
              {panel === 'factions' && <FactionsPanel />}
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
