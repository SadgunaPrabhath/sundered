// ============================================================
// Entity factories — procedurally generate fully-typed game
// entities. Used by loot rolls, world generation, and the
// SYSTEM OVERRIDE spawner alike, so a cheat-spawned weapon is
// structurally identical to a looted one.
// ============================================================
import { Rng, stableId, seedFrom, uid } from './rng'
import { rarity as rInfo, nextRarity } from './rarity'
import { buildImagePrompt } from './visuals'
import type {
  Ability,
  ArmorSet,
  Element,
  EquipSlot,
  GeneratedAsset,
  Item,
  LocationNode,
  NPC,
  Rarity,
  Rift,
  Skill,
  Attributes,
  AttrKey,
} from '@/state/types'

export const ELEMENTS: Element[] = [
  'none', 'fire', 'frost', 'storm', 'earth', 'shadow', 'light', 'blood', 'void', 'aether', 'time', 'gravity', 'entropy', 'concept',
]

export const WEAPON_TYPES = [
  'Sword', 'Greatsword', 'Dagger', 'Spear', 'Lance', 'Axe', 'Scythe', 'Bow', 'Crossbow',
  'Staff', 'Wand', 'Grimoire', 'Gauntlet', 'Claws', 'Whip', 'Chain', 'Twin Blades',
  'Halberd', 'Warhammer', 'Mace', 'Glaive', 'Soul Blade',
]

export const ARMOR_SLOTS: EquipSlot[] = [
  'helmet', 'chest', 'shoulders', 'gloves', 'legs', 'boots', 'cloak', 'belt', 'ring1', 'necklace',
]


// name fragments per element for flavour
const PREFIX: Record<string, string[]> = {
  fire: ['Ember', 'Ash', 'Cinder', 'Pyre', 'Molten', 'Solar'],
  frost: ['Frost', 'Glacial', 'Winter', 'Rime', 'Hoar', 'Permafrost'],
  storm: ['Storm', 'Thunder', 'Gale', 'Tempest', 'Squall'],
  earth: ['Stone', 'Iron', 'Mountain', 'Terra', 'Granite'],
  shadow: ['Shadow', 'Umbral', 'Nightfall', 'Dusk', 'Gloom'],
  light: ['Dawn', 'Radiant', 'Sun', 'Halo', 'Lumen'],
  blood: ['Blood', 'Crimson', 'Sanguine', 'Gore', 'Vein'],
  void: ['Void', 'Null', 'Abyss', 'Hollow', 'Rift'],
  aether: ['Aether', 'Astral', 'Star', 'Ether', 'Prism'],
  time: ['Chrono', 'Age', 'Hour', 'Epoch', 'Timeless'],
  gravity: ['Grave', 'Sink', 'Weight', 'Fold', 'Well'],
  entropy: ['Wither', 'Decay', 'Rot', 'Fray', 'Unmaking'],
  concept: ['Concept', 'Idea', 'Axiom', 'Truth', 'Name'],
  none: ['Old', 'Worn', 'Plain', 'Wandering', 'Grey'],
}
const SUFFIX = ['fang', 'edge', 'wing', 'bane', 'song', 'weep', 'wind', 'call', 'reach', 'thorn', 'veil', 'grasp', 'oath', 'sorrow']
const TITLES_OF = ['of the Fallen', 'of Nine Deaths', 'of the Last King', 'of Hollow Light', 'of the Sundering', 'of Forgotten Names', 'of the Deep', 'of Broken Vows']

const CONCEPTS = ['Distance', 'Time', 'Death', 'Gravity', 'Memory', 'Silence', 'Fear', 'Truth', 'Names', 'Entropy', 'Fate', 'Nothingness', 'Existence', 'Severance']

function abilityFor(rng: Rng, element: Element, ri: ReturnType<typeof rInfo>, isUlt = false): Ability {
  const verbs = ['Cleave', 'Rend', 'Devour', 'Sunder', 'Erase', 'Bind', 'Shatter', 'Consume', 'Judge', 'Unmake']
  const noun = rng.pick(['Wave', 'Fang', 'Veil', 'Storm', 'Verdict', 'Requiem', 'Echo', 'Collapse', 'Gospel'])
  const name = isUlt ? `${rng.pick(verbs)} the ${noun}` : `${element === 'none' ? 'Strike' : cap(element)} ${noun}`
  return {
    id: uid('ab'),
    name,
    kind: isUlt ? 'ultimate' : rng.chance(0.5) ? 'active' : 'passive',
    element,
    description: isUlt
      ? `Unleashes ${element} devastation across all foes, scaling with the wielder's will.`
      : `Channels ${element} force on strike, ${rng.pick(['igniting', 'freezing', 'draining', 'marking', 'fracturing'])} the target.`,
    power: Math.round((isUlt ? 40 : 15) * ri.statMult),
    cost: isUlt ? 40 : 10,
    cooldown: isUlt ? 5 : 2,
  }
}

function statBlock(rng: Rng, ri: ReturnType<typeof rInfo>, level: number, keys: AttrKey[]): Partial<Attributes> {
  const out: Partial<Attributes> = {}
  const n = Math.min(keys.length, 1 + Math.floor(ri.order / 3))
  for (const k of rng.picks(keys, n)) {
    out[k] = Math.round((rng.int(2, 6) + level * 0.5) * ri.statMult)
  }
  return out
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export interface WeaponOpts {
  name?: string
  weaponType?: string
  rarity: Rarity
  element?: Element
  level: number
  lore?: string
  concept?: string
  sentient?: boolean
  curse?: string
  blessing?: string
  evolutionStage?: number
  seedKey?: string
}

export function createWeapon(opts: WeaponOpts): Item {
  const element = opts.element ?? 'none'
  const wt = opts.weaponType ?? 'Sword'
  const ri = rInfo(opts.rarity)
  const isConcept = opts.rarity === 'conceptual' || opts.rarity === 'absolute' || !!opts.concept
  const nameSeed = opts.name ?? genWeaponName(element, ri.order, isConcept, opts.seedKey ?? uid())
  const id = stableId('weapon', nameSeed, opts.seedKey ?? String(opts.level))
  const seed = seedFrom(id)
  const rng = new Rng(seed)
  const abilities: Ability[] = []
  if (ri.order >= 2) abilities.push(abilityFor(rng, element, ri))
  if (ri.order >= 5) abilities.push(abilityFor(rng, element, ri, true))
  if (ri.order >= 8) abilities.push({ ...abilityFor(rng, element, ri), kind: 'hidden', name: 'Unknown Property', description: '???' })
  const dmg = Math.round((10 + opts.level * 4) * ri.statMult)
  const concept = opts.concept ?? (isConcept ? rng.pick(CONCEPTS) : undefined)
  return {
    id,
    kind: 'weapon',
    name: nameSeed,
    slot: 'weapon',
    weaponType: wt,
    rarity: opts.rarity,
    element,
    level: opts.level,
    itemLevel: opts.level + ri.order,
    stats: statBlock(rng, ri, opts.level, ['strength', 'agility', 'intelligence', 'perception', 'willpower']),
    damage: dmg,
    abilities,
    lore: opts.lore ?? genWeaponLore(rng, nameSeed, element, ri.label, concept),
    origin: rng.pick(['Forged in the Sundering', 'Recovered from a dead realm', 'Left by an unknown wielder', 'Bled from a fallen god', 'Written into being']),
    value: Math.round(dmg * 6 * (1 + ri.order)),
    weight: rng.float(1, 12),
    sentient: opts.sentient ?? (ri.order >= 9 && rng.chance(0.4)),
    sentience: (opts.sentient ?? (ri.order >= 9 && rng.chance(0.4)))
      ? { name: genWeaponName(element, ri.order, false, id + 'soul'), mood: 0, lines: genSentientLines(rng) }
      : undefined,
    curse: opts.curse,
    blessing: opts.blessing,
    concept,
    evolvesTo: undefined,
    evolutionStage: opts.evolutionStage ?? 0,
    hiddenProperty: ri.order >= 7 ? '???' : undefined,
    discovered: Date.now(),
    seed,
    visualStyle: element,
  }
}

function genSentientLines(rng: Rng): string[] {
  return rng.picks(
    [
      'It hungers.',
      'The blade remembers the last hand that held it.',
      '"More. Give me more."',
      '"You are not my first. You will not be my last."',
      '"I remember being whole."',
      '"Do not sheath me while I am still thirsty."',
    ],
    3
  )
}

export function genWeaponName(element: Element, order: number, concept: boolean, salt: string): string {
  const rng = new Rng(seedFrom(salt))
  if (concept) {
    const c = rng.pick(CONCEPTS)
    return rng.pick([`Null`, `The Blade That Ends ${c}`, `${c}'s End`, `Unwritten`, `The Last ${c}`, `${c}breaker`])
  }
  const pre = rng.pick(PREFIX[element] ?? PREFIX.none)
  const suf = rng.pick(SUFFIX)
  const name = `${pre}${suf}`
  if (order >= 5 && rng.chance(0.5)) return `${name} ${rng.pick(TITLES_OF)}`
  return name
}

function genWeaponLore(rng: Rng, name: string, element: Element, rarity: string, concept?: string): string {
  if (concept) return `Not a weapon that cuts things — a weapon that removes the concept of ${concept.toLowerCase()} from what it touches.`
  const templates = [
    `${name} was carried through the Sundering and never dulled.`,
    `They say ${name} chooses its wielder, and mourns them when they fall.`,
    `A ${rarity.toLowerCase()} relic humming with ${element === 'none' ? 'forgotten' : element} power.`,
    `Forged from the ${rng.pick(['bones', 'breath', 'silence', 'last light'])} of a dying realm.`,
  ]
  return rng.pick(templates)
}

// ---------------- ARMOR ----------------
export interface ArmorOpts {
  name?: string
  slot?: EquipSlot
  armorType?: string
  rarity: Rarity
  element?: Element
  level: number
  setId?: string
  lore?: string
  seedKey?: string
}

export function createArmor(opts: ArmorOpts): Item {
  const element = opts.element ?? 'none'
  const ri = rInfo(opts.rarity)
  const slot = opts.slot ?? 'chest'
  const at = opts.armorType ?? 'Medium'
  const name = opts.name ?? genArmorName(element, slot, at, opts.seedKey ?? uid())
  const id = stableId('armor', name, opts.seedKey ?? slot)
  const seed = seedFrom(id)
  const rng = new Rng(seed)
  const armorVal = Math.round((6 + opts.level * 3) * ri.statMult)
  const abilities: Ability[] = []
  if (ri.order >= 4) abilities.push(abilityFor(rng, element, ri))
  return {
    id,
    kind: slot === 'ring1' || slot === 'ring2' || slot === 'necklace' ? 'artifact' : 'armor',
    name,
    slot,
    armorType: at,
    rarity: opts.rarity,
    element,
    level: opts.level,
    itemLevel: opts.level + ri.order,
    stats: statBlock(rng, ri, opts.level, ['vitality', 'endurance', 'willpower', 'strength', 'luck']),
    armor: armorVal,
    abilities,
    lore: opts.lore ?? `${name}, ${rInfo(opts.rarity).label.toLowerCase()} protection woven with ${element === 'none' ? 'plain' : element} threads.`,
    origin: rng.pick(['Salvaged from the deadlands', 'Blessed by a hollow saint', 'Stolen from a sleeping god', 'Grown, not made']),
    value: Math.round(armorVal * 5 * (1 + ri.order)),
    weight: rng.float(2, 20),
    setId: opts.setId,
    discovered: Date.now(),
    seed,
    visualStyle: element,
  }
}

function genArmorName(element: Element, slot: EquipSlot, at: string, salt: string): string {
  const rng = new Rng(seedFrom(salt))
  const pre = rng.pick(PREFIX[element] ?? PREFIX.none)
  const piece = cap(slot.replace(/[12]/, ''))
  return `${pre} ${at} ${piece}`
}

// ---------------- CONSUMABLE / MATERIAL ----------------
export function createConsumable(name: string, rarity: Rarity, effect: string, seedKey?: string): Item {
  const id = stableId('item', name, seedKey ?? '')
  const seed = seedFrom(id)
  return {
    id,
    kind: 'consumable',
    name,
    rarity,
    element: 'none',
    level: 1,
    itemLevel: 1,
    stats: {},
    abilities: [{ id: uid('ab'), name, kind: 'active', description: effect }],
    lore: effect,
    origin: 'Common find',
    value: 10 * (1 + rInfo(rarity).order),
    weight: 0.2,
    quantity: 1,
    discovered: Date.now(),
    seed,
  }
}

// ---------------- SKILL ----------------
export function createSkill(opts: {
  name?: string
  element?: Element
  kind?: Skill['kind']
  tier?: number
  concept?: string
  seedKey?: string
}): Skill {
  const element = opts.element ?? 'none'
  const tier = opts.tier ?? 1
  const name = opts.name ?? genSkillName(element, opts.kind === 'conceptual' || !!opts.concept, opts.seedKey ?? uid())
  const id = stableId('skill', name, opts.seedKey ?? String(tier))
  const seed = seedFrom(id)
  const rng = new Rng(seed)
  const kind = opts.kind ?? (tier >= 4 ? 'ultimate' : rng.chance(0.3) ? 'passive' : 'active')
  return {
    id,
    name,
    kind,
    element,
    description: opts.concept
      ? `A conceptual technique: it does not deal damage — it revokes ${opts.concept.toLowerCase()} from the target.`
      : `${cap(element)} technique that ${rng.pick(['strikes', 'shields', 'drains', 'accelerates', 'binds'])} with tier-${tier} force.`,
    cost: (kind === 'ultimate' ? 40 : 12) + tier * 4,
    cooldown: kind === 'ultimate' ? 6 : 2,
    power: Math.round((12 + tier * 10) * (kind === 'ultimate' ? 2.2 : 1)),
    targets: kind === 'ultimate' ? 99 : rng.int(1, 3),
    range: rng.int(1, 5),
    duration: kind === 'passive' ? 0 : rng.int(1, 4),
    concept: opts.concept,
    tier,
    seed,
  }
}

function genSkillName(element: Element, concept: boolean, salt: string): string {
  const rng = new Rng(seedFrom(salt))
  if (concept) return rng.pick(['The Right to Burn', 'Severance', 'Unmake', 'Cease', 'The Last Word', 'Deletion'])
  const pre = rng.pick(PREFIX[element] ?? PREFIX.none)
  return `${pre} ${rng.pick(['Lance', 'Nova', 'Ward', 'Rupture', 'Cascade', 'Verdict', 'Storm', 'Requiem'])}`
}

// ---------------- NPC / BOSS ----------------
const FIRST = ['Seraphine', 'Kael', 'Vaine', 'Orin', 'Lysa', 'Draven', 'Mira', 'Thorne', 'Isolde', 'Garrick', 'Nyx', 'Cassius', 'Wren', 'Sable', 'Corvin']
const BOSS_NAMES = ['The Abyssal Knight', 'Maw of the Deep', 'The Hollow Choir', 'Vareth, the Unwritten', 'The Grave Sovereign', 'Null-Warden', 'The Last King', 'Echo of a Dead God']

export function createNPC(opts: {
  name?: string
  role?: string
  faction?: string
  element?: Element
  boss?: boolean
  level?: number
  location?: string
  merchant?: boolean
  seedKey?: string
}): NPC {
  const boss = opts.boss ?? false
  const name = opts.name ?? (boss ? new Rng(seedFrom(opts.seedKey ?? uid())).pick(BOSS_NAMES) : new Rng(seedFrom(opts.seedKey ?? uid())).pick(FIRST))
  const id = stableId(boss ? 'boss' : 'npc', name, opts.seedKey ?? '')
  const seed = seedFrom(id)
  const rng = new Rng(seed)
  return {
    id,
    name,
    role: opts.role ?? (boss ? 'World Threat' : opts.merchant ? 'Merchant' : rng.pick(['Wanderer', 'Guard', 'Scholar', 'Outcast', 'Priest', 'Smith'])),
    appearance: rng.pick(['cloaked and scarred', 'radiant and cold', 'ragged, eyes too bright', 'towering, wreathed in shadow', 'small, unremarkable, watchful']),
    personality: rng.pick(['guarded', 'zealous', 'weary', 'cruel', 'kind but broken', 'unreadable']),
    background: rng.pick(['Survived the first Sundering.', 'Lost everything to a rift.', 'Once served a fallen crown.', 'Remembers a world that no longer exists.']),
    goal: rng.pick(['to close the rifts', 'to become whole', 'to find someone lost', 'to end the world quietly', 'to be remembered']),
    fear: rng.pick(['being forgotten', 'the deep', 'their own power', 'the Administrator']),
    faction: opts.faction ?? 'unaligned',
    trust: 0,
    loyalty: 0,
    affection: 0,
    hostility: boss ? 100 : 0,
    memories: [],
    secrets: rng.picks(['knows a hidden rift', 'carries a conceptual shard', 'is not who they claim', 'has met the Administrator'], 2),
    inventory: [],
    isBoss: boss,
    isMerchant: opts.merchant,
    isEnemy: boss,
    level: opts.level ?? (boss ? 20 : rng.int(1, 10)),
    seed,
    location: opts.location,
  }
}

// ---------------- LOCATION ----------------
const BIOMES = ['dead forest', 'ashen waste', 'floating ruins', 'frozen sea', 'void expanse', 'sunken city', 'crystal peaks', 'blood marsh', 'astral steppe', 'hollow valley']

export function createLocation(opts: {
  name?: string
  type?: LocationNode['type']
  biome?: string
  danger?: number
  x?: number
  y?: number
  element?: Element
  seedKey?: string
}): LocationNode {
  const type = opts.type ?? 'wild'
  const biome = opts.biome ?? new Rng(seedFrom(opts.seedKey ?? uid())).pick(BIOMES)
  const name = opts.name ?? genLocationName(type, biome, opts.seedKey ?? uid())
  const id = stableId('loc', name, opts.seedKey ?? '')
  const seed = seedFrom(id)
  const rng = new Rng(seed)
  return {
    id,
    name,
    type,
    region: 'The First Reach',
    biome,
    danger: opts.danger ?? rng.int(1, 5),
    population: type === 'town' ? `${rng.int(200, 4000)} souls` : type === 'village' ? `${rng.int(20, 200)} souls` : 'unknown',
    faction: undefined,
    weather: rng.pick(['ash-fall', 'still', 'stormlight', 'rift-haze', 'eclipse', 'aurora']),
    description: genLocationDesc(rng, name, biome, type),
    threats: rng.picks(['prowling husks', 'a rift bleeding nearby', 'territorial beasts', 'unquiet dead', 'collapsing ground'], 2),
    secrets: [],
    discovered: false,
    visited: false,
    x: opts.x ?? rng.int(10, 90),
    y: opts.y ?? rng.int(10, 90),
    connections: [],
    seed,
    actions: defaultActions(type),
  }
}

function defaultActions(type: LocationNode['type']): string[] {
  const base = ['observe', 'search', 'map']
  if (type === 'town' || type === 'village') return ['enter', ...base, 'rest', 'trade']
  if (type === 'dungeon') return ['enter', ...base]
  if (type === 'rift') return ['approach', 'observe', 'search']
  if (type === 'boss') return ['approach', 'observe']
  return ['enter', ...base]
}

function genLocationName(type: LocationNode['type'], _biome: string, salt: string): string {
  const rng = new Rng(seedFrom(salt))
  const adj = rng.pick(['Black', 'Hollow', 'Last', 'Broken', 'Silent', 'Weeping', 'Ashen', 'Forgotten', 'Sunken', 'Pale'])
  const noun =
    type === 'town'
      ? rng.pick(['Hearth', 'Refuge', 'Hold', 'Market', 'Watch'])
      : type === 'dungeon'
      ? rng.pick(['Depths', 'Catacomb', 'Vault', 'Warren', 'Descent'])
      : type === 'rift'
      ? rng.pick(['Tear', 'Wound', 'Breach', 'Fracture'])
      : type === 'temple'
      ? rng.pick(['Sanctum', 'Shrine', 'Cathedral'])
      : rng.pick(['Reach', 'Expanse', 'Fields', 'Wastes', 'Spire', 'Citadel'])
  return `The ${adj} ${noun}`
}

function genLocationDesc(rng: Rng, name: string, biome: string, type: LocationNode['type']): string {
  return `${name} sprawls across the ${biome}. ${rng.pick([
    'The air tastes of iron and old grief.',
    'Something ancient sleeps beneath it.',
    'The light here arrives a moment too late.',
    'Ruins lean against a sky that never fully brightens.',
    'What lived here left in a hurry — or did not leave at all.',
  ])} ${type === 'rift' ? 'A rift bleeds violet at its heart.' : ''}`
}

// ---------------- RIFT ----------------
export function createRift(opts: { name?: string; tier?: number; element?: Element; seedKey?: string }): Rift {
  const tier = opts.tier ?? 1
  const element = opts.element ?? 'void'
  const name = opts.name ?? genRiftName(element, opts.seedKey ?? uid())
  const id = stableId('rift', name, opts.seedKey ?? String(tier))
  const seed = seedFrom(id)
  const rng = new Rng(seed)
  return {
    id,
    name,
    tier,
    environment: rng.pick(['inverted sky', 'endless stair', 'drowned cathedral', 'frozen moment', 'city of mirrors', 'garden of teeth']),
    rules: rng.picks(['gravity reverses at the core', 'the dead do not stay dead', 'time runs sideways', 'names are forgotten here', 'wounds do not close'], 2),
    modifiers: rng.picks(['+50% enemy speed', 'no healing', 'double loot', 'enemies respawn', 'perception halved'], 2),
    enemies: [],
    timeLimit: tier >= 3 ? rng.int(300, 900) : undefined,
    hiddenCondition: rng.chance(0.5) ? 'Reach the core without being seen' : undefined,
    rewards: rng.picks(['rift shards', 'a sealed weapon', 'conceptual essence', 'a companion'], 2),
    secrets: rng.chance(0.5) ? ['A door that should not exist'] : [],
    seed,
  }
}

function genRiftName(_element: Element, salt: string): string {
  const rng = new Rng(seedFrom(salt))
  return `The ${rng.pick(['Frozen', 'Blood', 'Dream', 'Void', 'Grave', 'Mirror', 'Infinite', 'Hollow', 'Weeping'])} Rift`
}

// ---------------- Weapon evolution ----------------
export function evolveWeapon(item: Item): Item {
  const newRarity = nextRarity(item.rarity)
  const stage = (item.evolutionStage ?? 0) + 1
  const evolved = createWeapon({
    name: `${item.name}${stage === 1 ? '' : ' ✦'}`,
    weaponType: item.weaponType,
    rarity: newRarity,
    element: item.element,
    level: item.level + 5,
    concept: item.concept,
    sentient: item.sentient,
    curse: item.curse,
    blessing: item.blessing,
    evolutionStage: stage,
    seedKey: item.id + '_evo' + stage,
  })
  // preserve identity where meaningful
  evolved.lore = item.lore + ' It has awakened further.'
  return evolved
}

// ---------------- Asset record ----------------
export function assetFor(entity: {
  id: string
  type: string
  name: string
  element?: Element
  rarity?: Rarity
  kind?: string
  subtype?: string
  biome?: string
  lore?: string
  seed: number
}): GeneratedAsset {
  return {
    id: entity.id,
    type: entity.type,
    name: entity.name,
    imagePrompt: buildImagePrompt(
      {
        seed: entity.seed,
        category: entity.type as never,
        element: entity.element ?? 'none',
        rarity: entity.rarity,
        kind: entity.kind,
        subtype: entity.subtype,
        biome: entity.biome,
      },
      entity.name,
      entity.lore
    ),
    seed: entity.seed,
    createdAt: Date.now(),
  }
}

// Build an armor set definition from an id + names.
export function buildArmorSet(id: string, name: string, pieceIds: string[], bonuses: ArmorSet['bonuses']): ArmorSet {
  return { id, name, pieces: pieceIds, bonuses }
}
