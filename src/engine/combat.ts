// Turn-based combat resolution — pure functions operating on CombatState.
import { Rng, uid, seedFrom } from './rng'
import { ENEMY_TEMPLATES, bossTemplate } from '@/data/content'
import type { Combatant, CombatLogEntry, CombatState, Element, Player, Skill, Item } from '@/state/types'
import type { CheatFlags } from '@/state/types'

export function playerCombatant(player: Player, items: Record<string, Item>): Combatant {
  const wId = player.equipment.weapon
  const weapon = wId ? items[wId] : undefined
  const atk = player.attributes.strength + player.attributes.agility + (weapon?.damage ?? 5)
  let def = player.attributes.endurance + player.attributes.vitality
  for (const slot of Object.values(player.equipment)) {
    const it = slot ? items[slot] : undefined
    if (it?.armor) def += it.armor
  }
  return {
    id: 'player',
    name: player.name,
    hp: player.hp,
    maxHp: player.maxHp,
    mana: player.mana,
    maxMana: player.maxMana,
    attack: Math.round(atk),
    defense: Math.round(def / 2),
    speed: player.attributes.agility + 5,
    element: (weapon?.element as Element) ?? 'none',
    buffs: [],
    debuffs: [],
    isPlayer: true,
    seed: player.seed,
  }
}

export function makeEnemy(templateId: string, level: number, seedKey: string): Combatant {
  const t = ENEMY_TEMPLATES[templateId]
  const rng = new Rng(seedFrom(seedKey))
  if (!t) {
    // generic fallback enemy
    return {
      id: uid('enemy'), name: 'Rift Spawn', hp: 40 + level * 8, maxHp: 40 + level * 8,
      mana: 20, maxMana: 20, attack: 8 + level * 2, defense: 3 + level, speed: 6, element: 'void',
      intent: 'circles you warily', buffs: [], debuffs: [], seed: seedFrom(seedKey),
    }
  }
  const scale = 1 + level * 0.12
  const hp = Math.round(t.hp * scale)
  return {
    id: uid('enemy'), name: t.name, hp, maxHp: hp, mana: 20, maxMana: 20,
    attack: Math.round(t.attack * scale), defense: Math.round(t.defense * scale), speed: t.speed,
    element: t.element as Element, intent: rng.pick(t.intents), buffs: [], debuffs: [], seed: seedFrom(seedKey),
  }
}

export function makeBoss(seedKey: string, level = 20): Combatant {
  const b = bossTemplate()
  const scale = 1 + level * 0.1
  const hp = Math.round(b.hp * scale)
  return {
    id: 'boss_abyssal_knight', npcId: 'boss_abyssal_knight', name: b.name, hp, maxHp: hp,
    mana: 60, maxMana: 60, attack: Math.round(b.attack * scale), defense: Math.round(b.defense * scale),
    speed: b.speed, element: b.element as Element, intent: b.phases[0], buffs: [], debuffs: [],
    isBoss: true, phase: 1, maxPhase: 3, seed: seedFrom(seedKey), abilities: [],
  }
}

function log(text: string, kind: CombatLogEntry['kind']): CombatLogEntry {
  return { id: uid('log'), text, kind }
}

const ELEMENT_STRONG: Partial<Record<Element, Element>> = {
  fire: 'frost', frost: 'storm', storm: 'earth', earth: 'fire',
  light: 'shadow', shadow: 'light', void: 'aether', aether: 'void',
}

function elementMult(atk: Element, def: Element): number {
  if (ELEMENT_STRONG[atk] === def) return 1.5
  if (ELEMENT_STRONG[def] === atk) return 0.75
  return 1
}

export interface ActionResult {
  state: CombatState
  entries: CombatLogEntry[]
  ended: 'win' | 'lose' | null
}

// Player attacks / uses skill; then enemies act.
export function resolvePlayerAction(
  state: CombatState,
  action: { type: 'attack' | 'skill' | 'defend' | 'item' | 'flee'; skill?: Skill; targetId?: string; healAmount?: number },
  flags: CheatFlags,
  luck: number
): ActionResult {
  const rng = new Rng((state.turn + 1) * 2654435761 + (state.player.seed | 0))
  const entries: CombatLogEntry[] = []
  const s: CombatState = structuredClone(state)
  const enemies = s.enemies.filter((e) => e.hp > 0)
  const target = enemies.find((e) => e.id === action.targetId) ?? enemies[0]

  if (action.type === 'flee') {
    if (rng.chance(0.6) && !enemies.some((e) => e.isBoss)) {
      s.active = false
      s.fled = true
      entries.push(log('You break away into the ash and vanish.', 'system'))
      return { state: s, entries, ended: null }
    }
    entries.push(log('You cannot escape — they are between you and the way out.', 'system'))
  } else if (action.type === 'defend') {
    s.player.buffs.push({ id: uid('buff'), name: 'Braced', kind: 'buff', duration: 1, potency: 0.5, description: 'Incoming damage halved' })
    entries.push(log('You set your stance and brace.', 'player'))
  } else if ((action.type === 'attack' || action.type === 'skill') && target) {
    const isSkill = action.type === 'skill' && action.skill
    const basePower = isSkill ? action.skill!.power + s.player.attack * 0.5 : s.player.attack
    const atkElement = isSkill ? action.skill!.element : s.player.element
    const conceptual = isSkill && (action.skill!.kind === 'conceptual' || !!action.skill!.concept)
    const applyTo = isSkill && (action.skill!.targets ?? 1) > 1 ? enemies : [target]
    for (const tgt of applyTo) {
      if (flags.oneShot) {
        tgt.hp = 0
        entries.push(log(`SYSTEM OVERRIDE — ${tgt.name} is deleted in a single strike.`, 'concept'))
        continue
      }
      if (conceptual) {
        // conceptual attacks bypass defense and can ignore rules
        const dmg = Math.round(basePower * 2)
        tgt.hp -= dmg
        entries.push(log(`${action.skill!.name}: you revoke ${action.skill!.concept ?? 'the concept'} from ${tgt.name}. ${dmg} unanswerable damage.`, 'concept'))
        continue
      }
      const mult = elementMult(atkElement, tgt.element)
      const crit = rng.chance(0.1 + luck * 0.004)
      let dmg = Math.max(1, Math.round((basePower - tgt.defense * 0.6) * mult * (crit ? 1.8 : 1) * rng.float(0.9, 1.15)))
      tgt.hp -= dmg
      entries.push(
        log(
          `${isSkill ? action.skill!.name : 'You strike'} ${tgt.name} for ${dmg}${mult > 1 ? ' (effective!)' : mult < 1 ? ' (resisted)' : ''}${
            crit ? ' — CRITICAL' : ''
          }.`,
          crit ? 'crit' : 'player'
        )
      )
    }
    if (isSkill && !flags.infiniteMana && !flags.noCooldowns) {
      s.player.mana = Math.max(0, s.player.mana - action.skill!.cost)
      s.cooldowns[action.skill!.id] = action.skill!.cooldown
    }
  }

  // remove dead enemies
  for (const e of s.enemies) {
    if (e.hp <= 0 && !s.log.some((l) => l.text.includes(`${e.name} falls`))) {
      // boss phase transition
      if (e.isBoss && (e.phase ?? 1) < (e.maxPhase ?? 1)) {
        e.phase = (e.phase ?? 1) + 1
        e.hp = Math.round(e.maxHp * 0.5)
        const b = bossTemplate()
        e.intent = b.phases[Math.min(b.phases.length - 1, (e.phase ?? 1) - 1)]
        entries.push(log(`The ${e.name} will not stay down. Phase ${e.phase}.`, 'system'))
      } else {
        entries.push(log(`${e.name} falls.`, 'death'))
      }
    }
  }

  const aliveEnemies = s.enemies.filter((e) => e.hp > 0)
  if (aliveEnemies.length === 0) {
    s.active = false
    return { state: s, entries, ended: 'win' }
  }

  // enemies act
  for (const e of aliveEnemies) {
    const eRng = new Rng(e.seed + s.turn * 7919)
    let dmg = Math.max(1, Math.round((e.attack - s.player.defense * 0.5) * eRng.float(0.85, 1.15)))
    const braced = s.player.buffs.find((b) => b.name === 'Braced')
    if (braced) dmg = Math.round(dmg * 0.5)
    if (flags.godMode || flags.immortal) {
      entries.push(log(`${e.name} strikes — SYSTEM absorbs the blow. [GOD MODE]`, 'system'))
    } else {
      s.player.hp -= dmg
      entries.push(log(`${e.name} ${e.intent ?? 'attacks'} — ${dmg} damage.`, 'enemy'))
    }
    // set next intent
    const t = ENEMY_TEMPLATES[e.npcId ?? '']
    e.intent = e.isBoss ? e.intent : t ? eRng.pick(t.intents) : 'readies another strike'
  }

  // tick player buffs / cooldowns
  s.player.buffs = s.player.buffs.map((b) => ({ ...b, duration: b.duration - 1 })).filter((b) => b.duration > 0)
  for (const k of Object.keys(s.cooldowns)) {
    s.cooldowns[k] = Math.max(0, s.cooldowns[k] - 1)
    if (s.cooldowns[k] === 0) delete s.cooldowns[k]
  }
  if (flags.infiniteMana) s.player.mana = s.player.maxMana
  s.turn += 1

  if (s.player.hp <= 0 && !(flags.godMode || flags.immortal || flags.infiniteHp)) {
    s.player.hp = 0
    s.active = false
    return { state: s, entries, ended: 'lose' }
  }
  if (flags.infiniteHp) s.player.hp = s.player.maxHp

  s.log = [...s.log, ...entries].slice(-60)
  return { state: s, entries, ended: null }
}
