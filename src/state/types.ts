// ============================================================
// THE SUNDERED — Core type models
// Every generated entity carries a stable id for visual continuity.
// ============================================================

export type Rarity =
  | 'broken'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'
  | 'divine'
  | 'sacred'
  | 'ancient'
  | 'transcendent'
  | 'abyssal'
  | 'celestial'
  | 'primordial'
  | 'conceptual'
  | 'absolute'
  | 'unknown'

export type Element =
  | 'none'
  | 'fire'
  | 'frost'
  | 'storm'
  | 'earth'
  | 'shadow'
  | 'light'
  | 'blood'
  | 'void'
  | 'aether'
  | 'time'
  | 'gravity'
  | 'entropy'
  | 'concept'

export type AttrKey =
  | 'strength'
  | 'agility'
  | 'vitality'
  | 'intelligence'
  | 'willpower'
  | 'perception'
  | 'endurance'
  | 'luck'

export type Attributes = Record<AttrKey, number>

export type CurrencyKey =
  | 'gold'
  | 'souls'
  | 'essence'
  | 'riftShards'
  | 'divineCoins'
  | 'voidFragments'
  | 'conceptualEssence'

export type Currencies = Record<CurrencyKey, number>

export type EquipSlot =
  | 'weapon'
  | 'offhand'
  | 'helmet'
  | 'chest'
  | 'shoulders'
  | 'gloves'
  | 'legs'
  | 'boots'
  | 'cloak'
  | 'belt'
  | 'ring1'
  | 'ring2'
  | 'necklace'
  | 'artifact'
  | 'relic'

export type ItemKind = 'weapon' | 'armor' | 'artifact' | 'relic' | 'consumable' | 'material'

export interface Ability {
  id: string
  name: string
  kind: 'passive' | 'active' | 'ultimate' | 'hidden'
  description: string
  element?: Element
  power?: number
  cost?: number
  cooldown?: number
  concept?: string
}

export interface Item {
  id: string
  kind: ItemKind
  name: string
  slot?: EquipSlot
  weaponType?: string
  armorType?: string
  rarity: Rarity
  element: Element
  level: number
  itemLevel: number
  stats: Partial<Attributes>
  damage?: number
  armor?: number
  abilities: Ability[]
  lore: string
  origin: string
  value: number
  weight: number
  favorite?: boolean
  locked?: boolean
  sentient?: boolean
  sentience?: { name: string; mood: number; lines: string[] }
  curse?: string
  blessing?: string
  concept?: string
  setId?: string
  evolvesTo?: string
  evolutionStage?: number
  hiddenProperty?: string
  discovered: number // timestamp
  firstDiscovery?: boolean
  quantity?: number
  seed: number // visual seed
  visualStyle?: string
}

export interface ArmorSet {
  id: string
  name: string
  pieces: string[]
  bonuses: { count: number; description: string }[]
}

export type SkillState = { level: number; unlocked: boolean }

export interface Skill {
  id: string
  name: string
  kind: 'active' | 'passive' | 'ultimate' | 'conceptual'
  element: Element
  description: string
  cost: number
  cooldown: number
  power: number
  targets?: number
  range?: number
  duration?: number
  concept?: string
  tier: number
  seed: number
}

export interface Title {
  id: string
  name: string
  description: string
  effect: string
  rarity: Rarity
  hidden?: boolean
  bonuses?: Partial<Attributes>
}

export type AscensionStage =
  | 'mortal'
  | 'awakened'
  | 'ascended'
  | 'transcendent'
  | 'divine'
  | 'celestial'
  | 'primordial'
  | 'conceptual'
  | 'unknown'

export interface ClassDef {
  id: string
  name: string
  tier: number
  description: string
  evolvesTo?: string[]
  hidden?: boolean
  grants?: string[] // skill ids
}

export interface Player {
  name: string
  origin: string
  classId: string
  className: string
  classPath: string[] // history of class evolution
  level: number
  xp: number
  xpToNext: number
  ascension: AscensionStage
  ascensionProgress: number
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  stamina: number
  maxStamina: number
  attributes: Attributes
  attrPoints: number
  currencies: Currencies
  skills: Record<string, SkillState>
  titles: string[]
  activeTitles: string[]
  traits: string[]
  equipment: Partial<Record<EquipSlot, string>> // itemId
  potential: number
  karma: number
  soul: number
  seed: number
  absorbed: string[] // absorbed ability ids
}

export interface NPC {
  id: string
  name: string
  role: string
  appearance: string
  personality: string
  background: string
  goal: string
  fear: string
  faction: string
  trust: number
  loyalty: number
  affection: number
  hostility: number
  memories: string[]
  secrets: string[]
  inventory: string[]
  isCompanion?: boolean
  isEnemy?: boolean
  isMerchant?: boolean
  isBoss?: boolean
  level: number
  seed: number
  location?: string
}

export interface Companion extends NPC {
  classId: string
  className: string
  skills: string[]
  relationship: number
  personalQuest?: string
  hiddenForm?: string
  cLevel: number
}

export interface Faction {
  id: string
  name: string
  description: string
  reputation: number
  standing: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied' | 'exalted'
  atWarWith: string[]
  alliedWith: string[]
  secrets: string[]
}

export interface LocationNode {
  id: string
  name: string
  type: 'town' | 'village' | 'dungeon' | 'rift' | 'boss' | 'temple' | 'ruins' | 'wild' | 'realm' | 'secret' | 'landmark'
  region: string
  biome: string
  danger: number // 1..5
  population?: string
  faction?: string
  weather: string
  description: string
  threats: string[]
  secrets: string[]
  discovered: boolean
  visited: boolean
  x: number
  y: number
  connections: string[]
  enemies?: string[]
  npcs?: string[]
  boss?: string
  loot?: string[]
  seed: number
  actions?: string[]
}

export interface Rift {
  id: string
  name: string
  tier: number
  environment: string
  rules: string[]
  modifiers: string[]
  enemies: string[]
  boss?: string
  timeLimit?: number
  hiddenCondition?: string
  rewards: string[]
  secrets: string[]
  collapsing?: boolean
  seed: number
}

export interface QuestObjective {
  id: string
  description: string
  done: boolean
}

export interface Quest {
  id: string
  name: string
  giver?: string
  description: string
  objectives: QuestObjective[]
  reward: string
  difficulty: number
  status: 'available' | 'active' | 'complete' | 'failed'
  hidden?: boolean
  arc?: string
  seed: number
}

// ---------- Combat ----------
export interface Combatant {
  id: string
  name: string
  hp: number
  maxHp: number
  mana: number
  maxMana: number
  attack: number
  defense: number
  speed: number
  element: Element
  intent?: string
  buffs: StatusEffect[]
  debuffs: StatusEffect[]
  isPlayer?: boolean
  isBoss?: boolean
  phase?: number
  maxPhase?: number
  seed: number
  npcId?: string
  abilities?: string[]
}

export interface StatusEffect {
  id: string
  name: string
  kind: 'buff' | 'debuff'
  duration: number
  potency: number
  description: string
}

export interface CombatState {
  active: boolean
  enemies: Combatant[]
  player: Combatant
  turn: number
  order: string[]
  log: CombatLogEntry[]
  cooldowns: Record<string, number>
  rewardPool?: string[]
  onWinArc?: string
  fled?: boolean
  location?: string
}

export interface CombatLogEntry {
  id: string
  text: string
  kind: 'player' | 'enemy' | 'system' | 'crit' | 'heal' | 'death' | 'concept'
}

// ---------- Scenes / cinematic ----------
export type SceneKind =
  | 'loot'
  | 'ascension'
  | 'rift'
  | 'concept'
  | 'boss'
  | 'divine'
  | 'class'
  | 'title'
  | 'death'
  | 'story'
  | 'companion'
  | 'world'
  | 'system' // cheat / override reveal

export interface Scene {
  id: string
  kind: SceneKind
  title: string
  subtitle?: string
  body?: string
  entityId?: string // item / boss / location for artwork
  entityType?: 'item' | 'location' | 'npc' | 'skill' | 'rift'
  lines?: string[]
  choices?: SceneChoice[]
  rarity?: Rarity
  seed: number
  dismissable?: boolean
}

export interface SceneChoice {
  label: string
  action: string
  payload?: unknown
}

// ---------- World events ----------
export interface WorldEvent {
  id: string
  title: string
  description: string
  kind: string
  time: number
  severity: number
}

// ---------- Narrative feed ----------
export type NarrationTone = 'normal' | 'important' | 'major' | 'ominous' | 'system'
export interface Narration {
  id: string
  text: string
  tone: NarrationTone
  time: number
  actions?: { label: string; action: string; payload?: unknown }[]
}

// ---------- Generated asset ----------
export interface GeneratedAsset {
  id: string
  type: string
  name: string
  imagePrompt: string
  imageUrl?: string
  seed: number
  createdAt: number
}

// ---------- Cheat / System Override ----------
export type CheatTier =
  | 'locked'
  | 'debug'
  | 'admin'
  | 'root'
  | 'archon'
  | 'reality'
  | 'conceptual'
  | 'author'
  | 'omnipotent'
  | 'unknown'

export interface CheatFlags {
  godMode: boolean
  immortal: boolean
  infiniteHp: boolean
  infiniteMana: boolean
  infiniteStamina: boolean
  noCooldowns: boolean
  oneShot: boolean
  infiniteResources: boolean
  autoLoot: boolean
  guaranteedRarity: Rarity | null
  xpMultiplier: number
  lootMultiplier: number
  freezeStats: boolean
  walkThroughWorld: boolean // reveal whole map
  noStatusEffects: boolean
  chaosMode: boolean
}

export interface CheatLogEntry {
  id: string
  time: number
  text: string
  tier: CheatTier
}

export interface RealitySnapshot {
  id: string
  label: string
  time: number
  data: string // serialized state
}

export interface CheatState {
  unlocked: boolean
  tier: CheatTier
  discoveredTiers: CheatTier[]
  flags: CheatFlags
  log: CheatLogEntry[]
  snapshots: RealitySnapshot[]
  overrideCount: number
  consequences: 'off' | 'low' | 'medium' | 'high'
  adminArc: number // 0 = dormant, escalates as overrides pile up
  achievements: string[]
  conceptOverrides: string[] // concepts the player has removed/edited
}

// ---------- Top-level game state ----------
export type GameMode =
  | 'title'
  | 'create'
  | 'intro'
  | 'explore'
  | 'combat'
  | 'inventory'
  | 'map'
  | 'dialogue'

export interface GameState {
  mode: GameMode
  started: boolean
  player: Player
  items: Record<string, Item>
  inventory: string[] // itemIds
  skills: Record<string, Skill>
  titles: Record<string, Title>
  classes: Record<string, ClassDef>
  npcs: Record<string, NPC>
  companions: Record<string, Companion>
  factions: Record<string, Faction>
  locations: Record<string, LocationNode>
  rifts: Record<string, Rift>
  quests: Record<string, Quest>
  armorSets: Record<string, ArmorSet>
  assets: Record<string, GeneratedAsset>
  currentLocation: string
  worldTime: number // in-world minutes
  weather: string
  events: WorldEvent[]
  narration: Narration[]
  scene: Scene | null
  combat: CombatState | null
  activeDialogueNpc: string | null
  cheat: CheatState
  settings: Settings
  dialogueNode?: DialogueNode | null
  pendingChoice?: WorldChoice | null
  flags: Record<string, boolean | number | string>
  saveVersion: number
}

export interface Settings {
  animationIntensity: 'low' | 'normal' | 'high'
  reduceMotion: boolean
  highContrast: boolean
  textSpeed: 'slow' | 'normal' | 'fast' | 'instant'
  music: boolean
  sfx: boolean
  performanceMode: boolean
}

export interface DialogueNode {
  npcId: string
  text: string
  options: { label: string; action: string; payload?: unknown }[]
}

export interface WorldChoice {
  id: string
  prompt: string
  options: { label: string; description?: string; action: string; payload?: unknown }[]
}
