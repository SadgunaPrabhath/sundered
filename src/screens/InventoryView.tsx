import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGame } from '@/state/store'
import { Visual } from '@/components/Visual'
import { RarityChip, RarityText, Icon, StatRow, Divider } from '@/components/ui'
import { rarity } from '@/engine/rarity'
import type { EquipSlot, Item } from '@/state/types'

const EQUIP_SLOTS: EquipSlot[] = [
  'weapon', 'helmet', 'chest', 'shoulders', 'gloves', 'legs', 'boots',
  'cloak', 'belt', 'ring1', 'ring2', 'necklace', 'artifact', 'relic',
]

type KindFilter = 'all' | 'weapon' | 'armor' | 'artifact' | 'consumable' | 'material'
type SortKey = 'rarity' | 'level' | 'name' | 'recent'

const KIND_FILTERS: KindFilter[] = ['all', 'weapon', 'armor', 'artifact', 'consumable', 'material']

function itemVisualReq(item: Item) {
  return {
    category: 'item' as const,
    seed: item.seed,
    element: item.element,
    rarity: item.rarity,
    kind: item.kind,
    subtype: item.weaponType || item.armorType,
  }
}

function slotLabel(slot: EquipSlot): string {
  if (slot === 'ring1') return 'Ring I'
  if (slot === 'ring2') return 'Ring II'
  return slot.charAt(0).toUpperCase() + slot.slice(1)
}

export default function InventoryView() {
  const items = useGame((s) => s.items)
  const inventory = useGame((s) => s.inventory)
  const equipment = useGame((s) => s.player.equipment)
  const equip = useGame((s) => s.equip)
  const removeItem = useGame((s) => s.removeItem)
  const toggleFavorite = useGame((s) => s.toggleFavorite)
  const toggleLock = useGame((s) => s.toggleLock)

  const [search, setSearch] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [sort, setSort] = useState<SortKey>('rarity')
  const [favOnly, setFavOnly] = useState(false)
  const [inspectId, setInspectId] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const list = useMemo(() => {
    const arr = inventory.map((id) => items[id]).filter(Boolean) as Item[]
    let out = arr.filter((it) => {
      if (kind !== 'all' && it.kind !== kind) return false
      if (favOnly && !it.favorite) return false
      if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
    out = [...out].sort((a, b) => {
      switch (sort) {
        case 'rarity':
          return rarity(b.rarity).order - rarity(a.rarity).order || b.itemLevel - a.itemLevel
        case 'level':
          return b.itemLevel - a.itemLevel
        case 'name':
          return a.name.localeCompare(b.name)
        case 'recent':
          return (b.discovered ?? 0) - (a.discovered ?? 0)
      }
    })
    return out
  }, [inventory, items, kind, favOnly, search, sort])

  const inspected = inspectId ? items[inspectId] : null

  return (
    <div className="h-full flex flex-col md:flex-row gap-3 p-3 overflow-hidden">
      {/* ---------- EQUIPMENT DOLL ---------- */}
      <div className="panel p-3 md:w-64 shrink-0 overflow-y-auto">
        <h3 className="label mb-2">Equipment</h3>
        <div className="space-y-1.5">
          {EQUIP_SLOTS.map((slot) => {
            const eqId = equipment[slot]
            const it = eqId ? items[eqId] : undefined
            const ri = it ? rarity(it.rarity) : null
            return (
              <button
                key={slot}
                onClick={() => it && setInspectId(it.id)}
                disabled={!it}
                className="w-full flex items-center gap-2.5 p-1.5 rounded-lg panel-inset text-left hover:border-[var(--color-line-bright)] transition-colors disabled:opacity-60"
                style={ri && ri.order >= 5 ? ({ ['--rc' as string]: ri.color, borderColor: `${ri.color}55` } as React.CSSProperties) : undefined}
              >
                <div className="w-10 h-10 shrink-0 rounded-md overflow-hidden bg-[var(--color-void)] border border-[var(--color-line)]">
                  {it && <Visual req={itemVisualReq(it)} rounded={false} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="label leading-none">{slotLabel(slot)}</div>
                  {it ? (
                    <div className="text-[0.72rem] font-display truncate mt-0.5">
                      <RarityText rarity={it.rarity}>{it.name}</RarityText>
                    </div>
                  ) : (
                    <div className="text-[0.68rem] text-[var(--color-ink-faint)] mt-0.5">— empty —</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ---------- GRID ---------- */}
      <div className="panel flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-[var(--color-line)] space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the pack…"
                className="w-full bg-[var(--color-void)] border border-[var(--color-line)] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[var(--color-aether)] text-[var(--color-ink)]"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-[var(--color-void)] border border-[var(--color-line)] rounded-lg px-2.5 py-1.5 text-xs font-mono outline-none focus:border-[var(--color-aether)] text-[var(--color-ink-dim)]"
            >
              <option value="rarity">Rarity ↓</option>
              <option value="level">Item Level ↓</option>
              <option value="name">Name A–Z</option>
              <option value="recent">Recent</option>
            </select>
            <button
              onClick={() => setFavOnly((v) => !v)}
              className={`btn !py-1.5 ${favOnly ? '!border-[var(--color-legendary)] !text-[var(--color-r-legendary)]' : ''}`}
              title="Favorites only"
            >
              <Icon name="star" size={14} />
            </button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {KIND_FILTERS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`px-2.5 py-1 rounded-md text-[0.62rem] font-mono uppercase tracking-widest transition-colors ${
                  kind === k
                    ? 'bg-[var(--color-aether)]/20 text-[var(--color-aether-bright)] border border-[var(--color-aether)]/50'
                    : 'text-[var(--color-ink-faint)] border border-[var(--color-line)] hover:text-[var(--color-ink-dim)]'
                }`}
              >
                {k}
              </button>
            ))}
            <span className="ml-auto label">{list.length} items</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {list.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-full border border-[var(--color-line)] flex items-center justify-center mb-3 text-[var(--color-ink-faint)]">
                <Icon name="bag" size={26} />
              </div>
              <p className="font-display text-[var(--color-ink-dim)]">Your pack is empty.</p>
              <p className="text-xs text-[var(--color-ink-faint)] mt-1 max-w-xs">
                The world is full of things that want to be found.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5">
              {list.map((it) => {
                const ri = rarity(it.rarity)
                const strong = ri.order >= 5
                return (
                  <button
                    key={it.id}
                    onClick={() => setInspectId(it.id)}
                    className={`group relative panel-inset p-2 text-left transition-all hover:-translate-y-0.5 ${strong ? 'rarity-glow' : ''}`}
                    style={{ ['--rc' as string]: ri.color, borderColor: `${ri.color}44` } as React.CSSProperties}
                  >
                    <div className="absolute top-1.5 right-1.5 z-10 flex gap-1">
                      {it.favorite && <span className="text-[var(--color-r-legendary)] text-[0.7rem]">★</span>}
                      {it.locked && <span className="text-[var(--color-ink-faint)] text-[0.7rem]">🔒</span>}
                    </div>
                    <div className="aspect-square w-full rounded-md overflow-hidden mb-1.5 bg-[var(--color-void)]">
                      <Visual req={itemVisualReq(it)} rounded={false} />
                    </div>
                    <div className="text-[0.72rem] font-display leading-tight truncate">
                      <RarityText rarity={it.rarity}>{it.name}</RarityText>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <RarityChip rarity={it.rarity} />
                      <span className="font-mono text-[0.58rem] text-[var(--color-ink-faint)]">iLv {it.itemLevel}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------- INSPECTION ---------- */}
      <AnimatePresence>
        {inspected && (
          <ItemInspect
            key={inspected.id}
            item={inspected}
            onClose={() => {
              setInspectId(null)
              setConfirmDiscard(false)
            }}
            onEquip={() => inspected.slot && equip(inspected.id)}
            onFavorite={() => toggleFavorite(inspected.id)}
            onLock={() => toggleLock(inspected.id)}
            onDiscard={() => {
              if (inspected.locked) return
              if (!confirmDiscard) {
                setConfirmDiscard(true)
                return
              }
              removeItem(inspected.id)
              setInspectId(null)
              setConfirmDiscard(false)
            }}
            confirmDiscard={confirmDiscard}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ItemInspect({
  item,
  onClose,
  onEquip,
  onFavorite,
  onLock,
  onDiscard,
  confirmDiscard,
}: {
  item: Item
  onClose: () => void
  onEquip: () => void
  onFavorite: () => void
  onLock: () => void
  onDiscard: () => void
  confirmDiscard: boolean
}) {
  const ri = rarity(item.rarity)
  const line = item.sentience?.lines?.length
    ? item.sentience.lines[Math.floor(item.seed) % item.sentience.lines.length]
    : null
  const stats = Object.entries(item.stats).filter(([, v]) => (v ?? 0) !== 0)

  return (
    <motion.div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 glass"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="panel w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        style={{ ['--rc' as string]: ri.color } as React.CSSProperties}
        initial={{ scale: 0.94, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row">
          {/* art */}
          <div className="sm:w-64 shrink-0 p-4">
            <div className={`aspect-square rounded-xl overflow-hidden ${ri.order >= 5 ? 'rarity-glow' : 'border border-[var(--color-line)]'}`}>
              <Visual req={itemVisualReq(item)} rounded={false} />
            </div>
            {ri.order >= 7 && (
              <div className="mt-2 text-center text-[0.6rem] font-mono tracking-widest uppercase" style={{ color: ri.color }}>
                ◆ First Discovery ◆
              </div>
            )}
          </div>
          {/* details */}
          <div className="flex-1 p-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="font-display text-xl leading-tight">
                  <RarityText rarity={item.rarity}>{item.name}</RarityText>
                </h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <RarityChip rarity={item.rarity} />
                  <span className="label">
                    {item.weaponType || item.armorType || item.kind}
                    {item.slot ? ` · ${slotLabel(item.slot)}` : ''}
                  </span>
                </div>
              </div>
              <button onClick={onClose} className="text-[var(--color-ink-faint)] hover:text-[var(--color-ink)] text-lg leading-none px-1">
                ✕
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              {item.concept && (
                <span className="px-2 py-0.5 rounded-md text-[0.6rem] font-mono uppercase tracking-widest text-[var(--color-r-conceptual)] border border-[var(--color-r-conceptual)]/40">
                  Concept · {item.concept}
                </span>
              )}
              {item.element !== 'none' && (
                <span className="px-2 py-0.5 rounded-md text-[0.6rem] font-mono uppercase tracking-widest text-[var(--color-aether-bright)] border border-[var(--color-aether)]/40">
                  {item.element}
                </span>
              )}
            </div>

            <Divider label="Stats" />
            <div className="grid grid-cols-2 gap-x-4">
              <StatRow label="Item Level" value={item.itemLevel} />
              <StatRow label="Req. Level" value={item.level} />
              {item.damage != null && <StatRow label="Damage" value={item.damage} accent="var(--color-ember)" />}
              {item.armor != null && <StatRow label="Armor" value={item.armor} accent="var(--color-mana)" />}
              <StatRow label="Value" value={`${item.value}g`} />
              <StatRow label="Weight" value={item.weight.toFixed(1)} />
              {stats.map(([k, v]) => (
                <StatRow key={k} label={k} value={`+${v}`} accent="var(--color-vital)" />
              ))}
            </div>

            {item.abilities.length > 0 && (
              <>
                <Divider label="Abilities" />
                <div className="space-y-2">
                  {item.abilities.map((ab) => (
                    <div key={ab.id} className="panel-inset p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-sm">{ab.kind === 'hidden' ? '??? ' : ab.name}</span>
                        <span className="label">{ab.kind}</span>
                      </div>
                      <p className="text-[0.72rem] text-[var(--color-ink-dim)] mt-0.5">
                        {ab.kind === 'hidden' ? '???' : ab.description}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {item.sentient && (
              <>
                <Divider label="Sentient" />
                <div className="panel-inset p-2.5 border-[var(--color-r-mythic)]/40">
                  <div className="label" style={{ color: 'var(--color-r-mythic)' }}>
                    It calls itself {item.sentience?.name ?? item.name}
                  </div>
                  {line && <p className="text-[0.78rem] italic mt-1 text-[var(--color-ink)]">{line}</p>}
                </div>
              </>
            )}

            {(item.curse || item.blessing) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.blessing && (
                  <span className="px-2 py-0.5 rounded-md text-[0.62rem] text-[var(--color-r-divine)] border border-[var(--color-r-divine)]/40">
                    Blessing · {item.blessing}
                  </span>
                )}
                {item.curse && (
                  <span className="px-2 py-0.5 rounded-md text-[0.62rem] text-[var(--color-blood)] border border-[var(--color-blood)]/40">
                    Curse · {item.curse}
                  </span>
                )}
              </div>
            )}

            <Divider label="Lore" />
            <p className="text-sm italic text-[var(--color-ink-dim)] leading-relaxed">{item.lore}</p>
            <p className="text-[0.68rem] text-[var(--color-ink-faint)] mt-1.5">Origin: {item.origin}</p>

            {ri.order >= 7 && (
              <p className="mt-2 text-[0.7rem] font-mono tracking-wide" style={{ color: ri.color }}>
                UNKNOWN PROPERTY: {item.hiddenProperty ?? '???'}
              </p>
            )}

            <div className="flex flex-wrap gap-2 mt-5">
              {item.slot && (
                <button onClick={onEquip} className="btn btn-primary flex-1 min-w-[100px]">
                  Equip
                </button>
              )}
              <button onClick={onFavorite} className="btn">
                {item.favorite ? '★ Unfavorite' : '☆ Favorite'}
              </button>
              <button onClick={onLock} className="btn">
                {item.locked ? 'Unlock' : 'Lock'}
              </button>
              <button
                onClick={onDiscard}
                disabled={item.locked}
                className={`btn ${confirmDiscard ? '!border-[var(--color-blood)] !text-[var(--color-blood)]' : ''}`}
              >
                {item.locked ? 'Locked' : confirmDiscard ? 'Confirm?' : 'Discard'}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
