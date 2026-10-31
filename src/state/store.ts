import { create } from 'zustand'
import type {
  AscensionStage,
  AttrKey,
  CheatFlags,
  CheatTier,
  Companion,
  CurrencyKey,
  Element,
  EquipSlot,
  Faction,
  GameState,
  Item,
  LocationNode,
  NPC,
  Player,
  Quest,
  Rarity,
  Rift,
  Scene,
  Skill,
  Title,
} from './types'
import { Rng, seedFrom, uid } from '@/engine/rng'
import { rarity as rInfo, nextRarity, RARITIES } from '@/engine/rarity'
import {
  CLASSES,
  FACTIONS,
  ORIGINS,
  TITLES,
  ashenKingSet,
  signatureItems,
  startingWorld,
} from '@/data/content'
import {
  createArmor,
  createLocation,
  createNPC,
  createRift,
  createSkill,
  createWeapon,
  evolveWeapon,
  assetFor,
  ELEMENTS,
} from '@/engine/factories'
import { rollCurrency, rollLoot } from '@/engine/loot'
import { makeBoss, makeEnemy, playerCombatant, resolvePlayerAction } from '@/engine/combat'
import { worldEngine } from '@/engine/narrative'
import { loadGame, saveGame, clearSave } from './save'

const ASCENSION_ORDER: AscensionStage[] = [
  'mortal', 'awakened', 'ascended', 'transcendent', 'divine', 'celestial', 'primordial', 'conceptual', 'unknown',
]

function defaultFlags(): CheatFlags {
  return {
    godMode: false, immortal: false, infiniteHp: false, infiniteMana: false, infiniteStamina: false,
    noCooldowns: false, oneShot: false, infiniteResources: false, autoLoot: false, guaranteedRarity: null,
    xpMultiplier: 1, lootMultiplier: 1, freezeStats: false, walkThroughWorld: false, noStatusEffects: false,
    chaosMode: false,
  }
}

export function recompute(p: Player): Player {
  const a = p.attributes
  const maxHp = Math.round(60 + a.vitality * 11 + a.endurance * 5 + p.level * 9)
  const maxMana = Math.round(35 + a.intelligence * 8 + a.willpower * 5)
  const maxStamina = Math.round(45 + a.endurance * 6 + a.agility * 4)
  return {
    ...p,
    maxHp,
    maxMana,
    maxStamina,
    hp: Math.min(p.hp === 0 ? maxHp : p.hp, maxHp),
    mana: Math.min(p.mana === 0 ? maxMana : p.mana, maxMana),
    stamina: Math.min(p.stamina === 0 ? maxStamina : p.stamina, maxStamina),
    xpToNext: Math.round(100 * Math.pow(p.level, 1.5)),
  }
}

function freshPlayer(): Player {
  return {
    name: 'Riftborn', origin: 'ashborn', classId: 'wanderer', className: 'Wanderer', classPath: ['Wanderer'],
    level: 1, xp: 0, xpToNext: 100, ascension: 'mortal', ascensionProgress: 0,
    hp: 0, maxHp: 0, mana: 0, maxMana: 0, stamina: 0, maxStamina: 0,
    attributes: { strength: 5, agility: 5, vitality: 5, intelligence: 5, willpower: 5, perception: 5, endurance: 5, luck: 5 },
    attrPoints: 0,
    currencies: { gold: 40, souls: 0, essence: 0, riftShards: 0, divineCoins: 0, voidFragments: 0, conceptualEssence: 0 },
    skills: {}, titles: [], activeTitles: [], traits: [], equipment: {}, potential: 100, karma: 0, soul: 100,
    seed: Math.floor(Math.random() * 1e9), absorbed: [],
  }
}

function baseState(): GameState {
  return {
    mode: 'title', started: false,
    player: recompute(freshPlayer()),
    items: {}, inventory: [], skills: {}, titles: {}, classes: {}, npcs: {}, companions: {},
    factions: {}, locations: {}, rifts: {}, quests: {}, armorSets: {}, assets: {},
    currentLocation: 'loc_ashen_hearth', worldTime: 8 * 60, weather: 'ash-fall',
    events: [], narration: [], scene: null, combat: null, activeDialogueNpc: null,
    cheat: {
      unlocked: false, tier: 'locked', discoveredTiers: [], flags: defaultFlags(), log: [], snapshots: [],
      overrideCount: 0, consequences: 'low', adminArc: 0, achievements: [], conceptOverrides: [],
    },
    settings: {
      animationIntensity: 'high', reduceMotion: false, highContrast: false, textSpeed: 'normal',
      music: true, sfx: true, performanceMode: false,
    },
    dialogueNode: null, pendingChoice: null, flags: {}, saveVersion: 1,
  }
}

interface Actions {
  // lifecycle
  newGame: (opts: { name: string; originId: string; classId: string }) => void
  setMode: (m: GameState['mode']) => void
  hydrate: () => void
  saveNow: () => void
  hardReset: () => void
  // narration & scenes
  narrate: (text: string, tone?: GameState['narration'][number]['tone'], actions?: GameState['narration'][number]['actions']) => void
  setScene: (s: Scene | null) => void
  dismissScene: () => void
  sceneAction: (action: string, payload?: unknown) => void
  // exploration
  worldInput: (text: string) => void
  travelTo: (locId: string) => void
  locationAction: (action: string) => void
  revealLocation: (loc: LocationNode) => void
  // combat
  startCombat: (opts: { enemyIds?: string[]; boss?: boolean; location?: string; reason?: string; onWinArc?: string }) => void
  doCombat: (action: { type: 'attack' | 'skill' | 'defend' | 'item' | 'flee'; skillId?: string; targetId?: string; itemId?: string }) => void
  // progression
  gainXp: (amount: number) => void
  allocateAttr: (key: AttrKey, amount?: number) => void
  learnSkill: (skill: Skill) => void
  ascend: () => void
  addTitle: (id: string) => void
  toggleTitle: (id: string) => void
  evolveClass: (classId: string) => void
  // inventory
  addItem: (item: Item, opts?: { silent?: boolean }) => void
  removeItem: (id: string) => void
  equip: (itemId: string) => void
  unequip: (slot: EquipSlot) => void
  toggleFavorite: (id: string) => void
  toggleLock: (id: string) => void
  grantLoot: (ctx: { level: number; depth: number; count?: number; guaranteed?: Rarity | null; reason?: string }) => void
  addCurrency: (cur: Partial<Record<CurrencyKey, number>>) => void
  // quests
  acceptQuest: (id: string) => void
  progressQuest: (id: string, objectiveId: string) => void
  completeQuest: (id: string) => void
  // npc / faction
  setRelation: (npcId: string, field: 'trust' | 'loyalty' | 'affection' | 'hostility', value: number) => void
  addMemory: (npcId: string, memory: string) => void
  recruit: (npcId: string) => void
  setFactionRep: (factionId: string, value: number) => void
  // settings
  setSetting: <K extends keyof GameState['settings']>(k: K, v: GameState['settings'][K]) => void

  // ===== SYSTEM OVERRIDE (cheats) =====
  cheatUnlock: (tier: CheatTier, quiet?: boolean) => void
  cheatSetTier: (tier: CheatTier) => void
  cheatToggle: (flag: keyof CheatFlags) => void
  cheatSetFlag: <K extends keyof CheatFlags>(flag: K, value: CheatFlags[K]) => void
  cheatSetStat: (key: AttrKey, value: number) => void
  cheatAllStats: (value: number) => void
  cheatMultStats: (factor: number) => void
  cheatRandomStats: () => void
  cheatSetLevel: (level: number) => void
  cheatAddXp: (amount: number) => void
  cheatSetCurrency: (cur: CurrencyKey, value: number) => void
  cheatSpawnWeapon: (opts: { name?: string; weaponType?: string; rarity: Rarity; element?: Element; level?: number; concept?: string; sentient?: boolean; lore?: string }) => void
  cheatSpawnArmor: (opts: { name?: string; slot?: EquipSlot; rarity: Rarity; element?: Element; level?: number }) => void
  cheatUpgradeRarity: (itemId: string) => void
  cheatEvolveItem: (itemId: string) => void
  cheatMakeSentient: (itemId: string) => void
  cheatDuplicateItem: (itemId: string) => void
  cheatUnlockAllSkills: () => void
  cheatUnlockAllTitles: () => void
  cheatSpawnNpc: (opts: { name?: string; boss?: boolean; faction?: string; element?: Element; level?: number }) => void
  cheatSpawnLocation: (opts: { name?: string; type?: LocationNode['type']; biome?: string; danger?: number }) => void
  cheatSpawnRift: (opts: { name?: string; tier?: number; element?: Element }) => void
  cheatRevealMap: () => void
  cheatSetWeather: (weather: string) => void
  cheatWorldEvent: (title: string, description: string, kind?: string) => void
  cheatConceptOverride: (concept: string) => void
  cheatCreateQuest: (opts: { name: string; description: string; reward: string; difficulty: number; theme?: string }) => void
  cheatSnapshot: (label?: string) => void
  cheatRevert: (id: string) => void
  cheatUndoLast: () => void
  cheatPreset: (preset: string) => void
  cheatChaos: () => void
  cheatNewGamePlus: () => void
  cheatSetConsequences: (level: GameState['cheat']['consequences']) => void
  cheatAscendMax: () => void
}

type Store = GameState & Actions

// ---- helpers used across actions ----
function pushLog(get: () => Store, set: (fn: Partial<GameState>) => void, text: string) {
  const c = get().cheat
  const log = [{ id: uid('cl'), time: get().worldTime, text, tier: c.tier }, ...c.log].slice(0, 60)
  set({ cheat: { ...c, log } })
}

function registerOverride(get: () => Store, set: (p: Partial<GameState>) => void, self: Store) {
  const c = get().cheat
  const count = c.overrideCount + 1
  const achievements = [...c.achievements]
  const newAch = (id: string, name: string) => {
    if (!achievements.includes(id)) {
      achievements.push(id)
      self.narrate(`ACHIEVEMENT — ${name}`, 'system')
    }
  }
  if (count === 1) newAch('system_breach', 'SYSTEM BREACH — Used your first override.')
  let adminArc = c.adminArc
  const consequencesOn = c.consequences !== 'off'
  // Administrator arc escalation
  if (consequencesOn) {
    if (count === 12 && adminArc < 1) {
      adminArc = 1
      self.narrate('SYSTEM MESSAGE: "That variable does not belong to you."', 'system')
    } else if (count === 30 && adminArc < 2) {
      adminArc = 2
      self.narrate('SYSTEM MESSAGE: "You have altered this timeline. Something is beginning to notice."', 'system')
      self.narrate('THE ADMINISTRATOR ARC has begun.', 'ominous')
      newAch('reality_error', 'REALITY ERROR — Changed a fundamental rule.')
    } else if (count === 60 && adminArc < 3) {
      adminArc = 3
      self.narrate('SYSTEM MESSAGE: "WHY ARE YOU EDITING MY WORLD?"', 'system')
      self.narrate('THE ADMINISTRATOR is aware of you.', 'ominous')
    }
    // high-consequence instability
    if (c.consequences === 'high' && count % 8 === 0) {
      self.cheatSetWeather('void storm')
      self.narrate('Reality frays where you touched it. A void storm gathers.', 'ominous')
    }
  }
  set({ cheat: { ...get().cheat, overrideCount: count, adminArc, achievements } })
}

export const useGame = create<Store>((set, get) => ({
  ...baseState(),

  // ---------------- lifecycle ----------------
  newGame: ({ name, originId, classId }) => {
    const s = baseState()
    const origin = ORIGINS.find((o) => o.id === originId) ?? ORIGINS[0]
    const cls = CLASSES.find((c) => c.id === classId) ?? CLASSES[0]
    const player = freshPlayer()
    player.name = name || 'Riftborn'
    player.origin = origin.id
    player.classId = cls.id
    player.className = cls.name
    player.classPath = [cls.name]
    for (const [k, v] of Object.entries(origin.bonuses)) {
      player.attributes[k as AttrKey] += v as number
    }
    player.titles = [origin.startTitle]
    player.activeTitles = [origin.startTitle]

    // load content into state
    const world = startingWorld()
    const locs: Record<string, LocationNode> = {}
    for (const l of world.locations) locs[l.id] = l
    const npcs: Record<string, NPC> = {}
    for (const n of world.npcs) npcs[n.id] = n
    npcs[world.boss.id] = world.boss
    npcs[world.companion.id] = world.companion
    const quests: Record<string, Quest> = {}
    for (const q of world.quests) quests[q.id] = q
    const rifts: Record<string, Rift> = { [world.firstRift.id]: world.firstRift }

    const classes: Record<string, typeof CLASSES[number]> = {}
    for (const c of CLASSES) classes[c.id] = c
    const titles: Record<string, Title> = {}
    for (const t of TITLES) titles[t.id] = t
    const factions: Record<string, Faction> = {}
    for (const f of FACTIONS) factions[f.id] = f

    // starter skill for class
    const starterSkill = createSkill({ element: origin.element as Element, tier: 1, seedKey: 'starter_' + cls.id })
    s.skills[starterSkill.id] = starterSkill
    player.skills[starterSkill.id] = { level: 1, unlocked: true }

    // starter weapon
    const starter = createWeapon({ name: 'Riftworn Blade', weaponType: 'Sword', rarity: 'uncommon', element: origin.element as Element, level: 1, lore: 'The blade you carried out of the rift. It remembers the crossing.', seedKey: 'starter_weapon' })
    s.items[starter.id] = starter
    player.equipment.weapon = starter.id

    // signature items + set live in the world as discoverable — keep a couple in codex via assets
    const items: Record<string, Item> = { [starter.id]: starter }
    for (const it of signatureItems()) {
      items[it.id] = it
      s.assets[it.id] = assetFor({ id: it.id, type: 'item', name: it.name, element: it.element, rarity: it.rarity, kind: it.kind, subtype: it.weaponType, lore: it.lore, seed: it.seed })
    }
    const ak = ashenKingSet()
    for (const p of ak.pieces) items[p.id] = p

    Object.assign(s, {
      started: true, mode: 'intro', player: recompute(player),
      items, inventory: [], skills: s.skills, classes, titles, factions,
      npcs, locations: locs, rifts, quests, currentLocation: 'loc_ashen_hearth',
      armorSets: { [ak.set.id]: ak.set },
      assets: s.assets,
    })
    set(s)
    saveGame(get())
  },

  setMode: (m) => set({ mode: m }),

  hydrate: () => {
    const loaded = loadGame()
    if (loaded) set({ ...loaded })
  },

  saveNow: () => saveGame(get()),

  hardReset: () => {
    clearSave()
    set(baseState())
  },

  // ---------------- narration & scenes ----------------
  narrate: (text, tone = 'normal', actions) => {
    const n = { id: uid('n'), text, tone, time: get().worldTime, actions }
    set({ narration: [...get().narration, n].slice(-40) })
  },

  setScene: (scene) => set({ scene }),
  dismissScene: () => set({ scene: null }),

  sceneAction: (action, payload) => {
    const self = get()
    self.setScene(null)
    switch (action) {
      case 'equip':
        if (typeof payload === 'string') self.equip(payload)
        break
      case 'enterRift':
        self.startCombat({ enemyIds: ['wraith', 'husk'], location: get().currentLocation, reason: 'The rift spits its keepers at you.' })
        break
      case 'approachBoss':
        self.startCombat({ boss: true, location: 'loc_hollow_descent', reason: 'The Abyssal Knight rises.', onWinArc: 'descent' })
        break
      case 'recruitKael':
        self.recruit('comp_kael')
        break
      default:
        break
    }
  },

  // ---------------- exploration ----------------
  worldInput: (text) => {
    const self = get()
    if (!text.trim()) return
    self.narrate(`❯ ${text}`, 'normal')
    const result = worldEngine.respond(text, get())
    for (const n of result.narration) self.narrate(n.text, n.tone)
    if (result.weather) set({ weather: result.weather })
    if (result.advanceTime) set({ worldTime: get().worldTime + result.advanceTime })
    if (result.discoveredLocation) self.revealLocation(result.discoveredLocation)
    if (result.spawnNpc) {
      const n = result.spawnNpc
      set({ npcs: { ...get().npcs, [n.id]: n } })
      const loc = get().locations[get().currentLocation]
      if (loc) set({ locations: { ...get().locations, [loc.id]: { ...loc, npcs: [...(loc.npcs ?? []), n.id] } } })
    }
    if (result.loot) self.grantLoot({ level: get().player.level, depth: get().locations[get().currentLocation]?.danger ?? 1, reason: 'You found something.' })
    if (result.encounter) self.startCombat({ enemyIds: result.encounter.enemyIds, location: get().currentLocation, reason: result.encounter.reason })
    saveGame(get())
  },

  travelTo: (locId) => {
    const loc = get().locations[locId]
    if (!loc) return
    set({ currentLocation: locId, mode: 'explore', worldTime: get().worldTime + 30 })
    set({ locations: { ...get().locations, [locId]: { ...loc, visited: true, discovered: true } } })
    get().narrate(`You arrive at ${loc.name}. ${loc.description}`, loc.danger >= 4 ? 'ominous' : 'important')
    // ensure asset exists
    if (!get().assets[loc.id]) {
      set({ assets: { ...get().assets, [loc.id]: assetFor({ id: loc.id, type: 'location', name: loc.name, biome: loc.biome, seed: loc.seed }) } })
    }
    saveGame(get())
  },

  locationAction: (action) => {
    const self = get()
    const loc = get().locations[get().currentLocation]
    if (!loc) return
    switch (action) {
      case 'enter':
      case 'rest':
        if (action === 'rest') {
          const p = recompute({ ...get().player, hp: get().player.maxHp, mana: get().player.maxMana, stamina: get().player.maxStamina })
          set({ player: p, worldTime: get().worldTime + 240 })
          self.narrate('You rest. Your wounds close and your reserves return.', 'normal')
        } else {
          self.narrate(`You step into ${loc.name}.`, 'normal')
        }
        break
      case 'trade':
        set({ mode: 'dialogue', activeDialogueNpc: 'npc_garrick_smith' })
        break
      case 'search': {
        self.narrate(`You search ${loc.name}.`, 'normal')
        const rng = new Rng(seedFrom(loc.id + get().worldTime))
        if (rng.chance(0.6)) self.grantLoot({ level: get().player.level, depth: loc.danger })
        else self.narrate('You find nothing of worth.', 'normal')
        break
      }
      case 'observe':
        self.narrate(loc.secrets.length ? `You study ${loc.name}. ${loc.secrets[0]}.` : `You study ${loc.name}. The details resist you.`, 'normal')
        break
      case 'map':
        self.setMode('map')
        break
      case 'approach':
        if (loc.type === 'rift') {
          self.setScene({ id: uid('sc'), kind: 'rift', title: 'THE SKY HAS SPLIT', subtitle: loc.name, body: 'A rift bleeds violet before you. Tier unknown.', entityId: loc.id, entityType: 'rift', seed: loc.seed, rarity: 'epic', choices: [{ label: 'Approach', action: 'enterRift' }, { label: 'Observe', action: 'dismiss' }] })
        } else if (loc.boss) {
          self.setScene({ id: uid('sc'), kind: 'boss', title: 'SOMETHING RISES', subtitle: get().npcs[loc.boss]?.name, body: 'The dark at the bottom of the Descent stands up.', entityId: loc.boss, entityType: 'npc', seed: get().npcs[loc.boss]?.seed ?? 1, rarity: 'legendary', choices: [{ label: 'Face it', action: 'approachBoss' }, { label: 'Retreat', action: 'dismiss' }] })
        }
        break
      default:
        break
    }
    saveGame(get())
  },

  revealLocation: (loc) => {
    const existing = get().locations[loc.id]
    const merged = existing ? { ...existing, ...loc, discovered: true } : { ...loc, discovered: true }
    set({ locations: { ...get().locations, [loc.id]: merged } })
    if (!get().assets[loc.id]) {
      set({ assets: { ...get().assets, [loc.id]: assetFor({ id: loc.id, type: 'location', name: loc.name, biome: loc.biome, seed: loc.seed }) } })
    }
  },

  // ---------------- combat ----------------
  startCombat: ({ enemyIds, boss, location, reason, onWinArc }) => {
    const self = get()
    const player = get().player
    const pc = playerCombatant(player, get().items)
    const enemies = boss
      ? [makeBoss('boss_run_' + get().worldTime, 20)]
      : (enemyIds ?? ['husk']).map((id, i) => makeEnemy(id, player.level, id + i + get().worldTime))
    set({
      mode: 'combat',
      combat: { active: true, enemies, player: pc, turn: 0, order: [], log: reason ? [{ id: uid('l'), text: reason, kind: 'system' }] : [], cooldowns: {}, onWinArc, location },
    })
    if (boss) {
      const b = enemies[0]
      self.narrate(`${b.name} bars your way.`, 'ominous')
    }
  },

  doCombat: (action) => {
    const combat = get().combat
    if (!combat || !combat.active) return
    const self = get()
    const skill = action.skillId ? get().skills[action.skillId] : undefined
    const flags = get().cheat.flags
    const targetId = action.targetId ?? combat.enemies.find((e) => e.hp > 0)?.id
    if (action.type === 'item' && action.itemId) {
      const item = get().items[action.itemId]
      const heal = 40
      const newCombat = structuredClone(combat)
      newCombat.player.hp = Math.min(newCombat.player.maxHp, newCombat.player.hp + heal)
      newCombat.log.push({ id: uid('l'), text: `You use ${item?.name ?? 'an item'} and recover ${heal} HP.`, kind: 'heal' })
      set({ combat: newCombat })
      self.removeItem(action.itemId)
      return
    }
    const res = resolvePlayerAction(
      combat,
      { type: action.type, skill, targetId },
      flags,
      get().player.attributes.luck
    )
    set({ combat: res.state })
    // sync player hp/mana back to player object
    set({ player: recompute({ ...get().player, hp: res.state.player.hp, mana: res.state.player.mana }) })

    if (res.ended === 'win') {
      const c = res.state
      self.narrate('The last of them falls. Silence returns to the grey.', 'important')
      const depth = get().locations[c.location ?? get().currentLocation]?.danger ?? 1
      const isBoss = c.enemies.some((e) => e.isBoss)
      // XP
      const xp = (isBoss ? 400 : 60) + depth * 30 + c.enemies.length * 20
      self.gainXp(xp)
      self.grantLoot({ level: get().player.level, depth: isBoss ? depth + 2 : depth, count: isBoss ? 3 : 1, guaranteed: isBoss ? 'legendary' : null, reason: 'Spoils of the fight.' })
      const cur = rollCurrency({ level: get().player.level, depth, luck: get().player.attributes.luck, seed: seedFrom('cur' + get().worldTime), multiplier: get().cheat.flags.lootMultiplier })
      self.addCurrency(cur)
      // quest hooks
      if (isBoss && c.onWinArc === 'descent') {
        self.progressQuest('quest_descent', 'o2')
        self.completeQuest('quest_descent')
        if (!get().player.titles.includes('title_dungeon_breaker')) self.addTitle('title_dungeon_breaker')
      } else {
        // advance husk-clearing quest
        const q = get().quests['quest_first_steps']
        if (q?.status === 'active') self.progressQuest('quest_first_steps', 'o2')
      }
      if (!get().player.titles.includes('title_first_blood')) self.addTitle('title_first_blood')
      set({ combat: null, mode: 'explore' })
    } else if (res.ended === 'lose') {
      self.setScene({ id: uid('sc'), kind: 'death', title: 'YOU FALL', subtitle: 'But the rift is not done with you', body: 'The grey takes you. Somewhere, something makes a note of it. You wake at the Hearth, lessened but breathing.', seed: get().player.seed, choices: [{ label: 'Rise again', action: 'dismiss' }] })
      const p = recompute({ ...get().player, hp: 1, currencies: { ...get().player.currencies, gold: Math.floor(get().player.currencies.gold * 0.7) } })
      set({ player: p, combat: null, mode: 'explore', currentLocation: 'loc_ashen_hearth' })
    }
    saveGame(get())
  },

  // ---------------- progression ----------------
  gainXp: (amount) => {
    const self = get()
    const mult = get().cheat.flags.xpMultiplier
    const gain = Math.round(amount * mult)
    let p = { ...get().player, xp: get().player.xp + gain }
    self.narrate(`+${gain} XP`, 'normal')
    let leveled = 0
    while (p.xp >= p.xpToNext) {
      p.xp -= p.xpToNext
      p.level += 1
      p.attrPoints += 5
      p.ascensionProgress = Math.min(100, p.ascensionProgress + 6)
      p = recompute(p)
      leveled++
    }
    p = recompute(p)
    set({ player: p })
    if (leveled > 0) {
      // full heal on level up
      set({ player: recompute({ ...get().player, hp: get().player.maxHp, mana: get().player.maxMana, stamina: get().player.maxStamina }) })
      self.setScene({
        id: uid('sc'), kind: 'story', title: `LEVEL ${p.level}`, subtitle: `+${leveled * 5} attribute points`,
        body: 'Power settles into you. You feel the shape of what you are becoming.', seed: p.seed,
        lines: [`+${leveled * 5} attribute points to spend`, `Ascension progress: ${p.ascensionProgress}%`], choices: [{ label: 'Continue', action: 'dismiss' }],
      })
      // offer a new skill every 3 levels
      if (p.level % 3 === 0) {
        const el = ELEMENTS[(p.level + p.seed) % ELEMENTS.length]
        const sk = createSkill({ element: el as Element, tier: Math.min(4, 1 + Math.floor(p.level / 5)), seedKey: 'lvl_' + p.level })
        self.learnSkill(sk)
      }
      // ascension available
      if (p.ascensionProgress >= 100) {
        self.narrate('You stand at the threshold of Ascension. Seek the interface within your Character.', 'major')
      }
    }
  },

  allocateAttr: (key, amount = 1) => {
    const p = get().player
    if (p.attrPoints < amount) return
    const np = recompute({ ...p, attrPoints: p.attrPoints - amount, attributes: { ...p.attributes, [key]: p.attributes[key] + amount } })
    set({ player: np })
    saveGame(get())
  },

  learnSkill: (skill) => {
    const self = get()
    set({ skills: { ...get().skills, [skill.id]: skill } })
    set({ player: { ...get().player, skills: { ...get().player.skills, [skill.id]: { level: 1, unlocked: true } } } })
    self.setScene({
      id: uid('sc'), kind: skill.kind === 'conceptual' ? 'concept' : 'class', title: skill.kind === 'conceptual' ? 'CONCEPTUAL AWAKENING' : 'SKILL LEARNED',
      subtitle: skill.name, body: skill.description, entityId: skill.id, entityType: 'skill', seed: skill.seed,
      rarity: skill.kind === 'conceptual' ? 'conceptual' : 'epic', choices: [{ label: 'Embrace it', action: 'dismiss' }],
    })
  },

  ascend: () => {
    const self = get()
    const p = get().player
    if (p.ascensionProgress < 100) return
    const idx = ASCENSION_ORDER.indexOf(p.ascension)
    const next = ASCENSION_ORDER[Math.min(ASCENSION_ORDER.length - 1, idx + 1)]
    const boosted = { ...p.attributes }
    for (const k of Object.keys(boosted) as AttrKey[]) boosted[k] = Math.round(boosted[k] * 1.25 + 5)
    const np = recompute({ ...p, ascension: next, ascensionProgress: 0, attributes: boosted, potential: p.potential + 50, attrPoints: p.attrPoints + 10 })
    set({ player: np })
    const titleId = next === 'awakened' ? 'title_rift_survivor' : undefined
    if (titleId && !np.titles.includes(titleId)) self.addTitle(titleId)
    self.setScene({
      id: uid('sc'), kind: 'ascension', title: 'ASCENSION COMPLETE', subtitle: `You are now ${next.toUpperCase()}`,
      body: 'A gigantic structure of light unfolds behind you and folds into your spine.',
      lines: ['All attributes +25%', '+10 attribute points', '+50 potential', 'New title acquired'], seed: np.seed, rarity: 'divine',
      choices: [{ label: 'Descend, changed', action: 'dismiss' }],
    })
    saveGame(get())
  },

  addTitle: (id) => {
    const self = get()
    const p = get().player
    if (p.titles.includes(id)) return
    const title = get().titles[id] ?? TITLES.find((t) => t.id === id)
    if (!title) return
    let attrs = p.attributes
    if (title.bonuses) {
      attrs = { ...attrs }
      for (const [k, v] of Object.entries(title.bonuses)) attrs[k as AttrKey] += v as number
    }
    set({ player: recompute({ ...p, titles: [...p.titles, id], activeTitles: [...p.activeTitles, id].slice(-3), attributes: attrs }) })
    self.narrate(`New title acquired: "${title.name}"`, 'important')
  },

  toggleTitle: (id) => {
    const p = get().player
    const active = p.activeTitles.includes(id) ? p.activeTitles.filter((t) => t !== id) : [...p.activeTitles, id].slice(-3)
    set({ player: { ...p, activeTitles: active } })
  },

  evolveClass: (classId) => {
    const self = get()
    const cls = get().classes[classId] ?? CLASSES.find((c) => c.id === classId)
    if (!cls) return
    const p = get().player
    set({ player: { ...p, classId: cls.id, className: cls.name, classPath: [...p.classPath, cls.name] } })
    self.setScene({
      id: uid('sc'), kind: 'class', title: 'CLASS EVOLUTION', subtitle: cls.name, body: cls.description, seed: p.seed, rarity: 'legendary',
      choices: [{ label: 'Become it', action: 'dismiss' }],
    })
  },

  // ---------------- inventory ----------------
  addItem: (item, opts) => {
    const self = get()
    set({ items: { ...get().items, [item.id]: item }, inventory: [...get().inventory, item.id] })
    if (!get().assets[item.id]) {
      set({ assets: { ...get().assets, [item.id]: assetFor({ id: item.id, type: 'item', name: item.name, element: item.element, rarity: item.rarity, kind: item.kind, subtype: item.weaponType ?? item.armorType, lore: item.lore, seed: item.seed }) } })
    }
    if (!opts?.silent) {
      const ri = rInfo(item.rarity)
      if (ri.order >= 5) {
        // cinematic reveal for legendary+
        self.setScene({
          id: uid('sc'), kind: item.rarity === 'divine' || item.rarity === 'sacred' ? 'divine' : ri.order >= 14 ? 'concept' : 'loot',
          title: ri.order >= 14 ? 'IT SHOULD NOT EXIST' : ri.order >= 7 ? 'DIVINE DISCOVERY' : `${ri.label.toUpperCase()} DROP`,
          subtitle: item.name, body: item.lore, entityId: item.id, entityType: 'item', rarity: item.rarity, seed: item.seed,
          choices: [{ label: 'Equip', action: 'equip', payload: item.id }, { label: 'Store', action: 'dismiss' }],
        })
      } else {
        self.narrate(`You obtained ${item.name} (${ri.label}).`, ri.order >= 3 ? 'important' : 'normal')
      }
    }
  },

  removeItem: (id) => {
    const items = { ...get().items }
    delete items[id]
    const p = get().player
    const equipment = { ...p.equipment }
    for (const [slot, itemId] of Object.entries(equipment)) if (itemId === id) delete equipment[slot as EquipSlot]
    set({ items, inventory: get().inventory.filter((i) => i !== id), player: recompute({ ...p, equipment }) })
  },

  equip: (itemId) => {
    const self = get()
    const item = get().items[itemId]
    if (!item || !item.slot) return
    const p = get().player
    set({ player: recompute({ ...p, equipment: { ...p.equipment, [item.slot]: itemId } }) })
    self.narrate(`Equipped ${item.name}.`, 'normal')
    // ensure it's tracked in inventory list (spawned items are)
    if (!get().inventory.includes(itemId) && !Object.values(p.equipment).includes(itemId)) {
      set({ inventory: [...get().inventory, itemId] })
    }
    saveGame(get())
  },

  unequip: (slot) => {
    const p = get().player
    const equipment = { ...p.equipment }
    delete equipment[slot]
    set({ player: recompute({ ...p, equipment }) })
  },

  toggleFavorite: (id) => {
    const item = get().items[id]
    if (item) set({ items: { ...get().items, [id]: { ...item, favorite: !item.favorite } } })
  },

  toggleLock: (id) => {
    const item = get().items[id]
    if (item) set({ items: { ...get().items, [id]: { ...item, locked: !item.locked } } })
  },

  grantLoot: ({ level, depth, count, guaranteed, reason }) => {
    const self = get()
    if (reason) self.narrate(reason, 'normal')
    const items = rollLoot({
      level, depth, luck: get().player.attributes.luck, seed: seedFrom('loot' + get().worldTime + Math.random()),
      count, guaranteedRarity: guaranteed ?? get().cheat.flags.guaranteedRarity, multiplier: get().cheat.flags.lootMultiplier,
    })
    for (const it of items) self.addItem(it)
  },

  addCurrency: (cur) => {
    const p = get().player
    const currencies = { ...p.currencies }
    for (const [k, v] of Object.entries(cur)) currencies[k as CurrencyKey] += v as number
    set({ player: { ...p, currencies } })
    const parts = Object.entries(cur).filter(([, v]) => (v as number) > 0).map(([k, v]) => `+${v} ${k}`)
    if (parts.length) get().narrate(parts.join('  '), 'normal')
  },

  // ---------------- quests ----------------
  acceptQuest: (id) => {
    const q = get().quests[id]
    if (!q) return
    set({ quests: { ...get().quests, [id]: { ...q, status: 'active' } } })
    get().narrate(`Quest accepted: ${q.name}`, 'important')
  },

  progressQuest: (id, objectiveId) => {
    const q = get().quests[id]
    if (!q) return
    const objectives = q.objectives.map((o) => (o.id === objectiveId ? { ...o, done: true } : o))
    set({ quests: { ...get().quests, [id]: { ...q, objectives } } })
    if (objectives.every((o) => o.done)) get().completeQuest(id)
  },

  completeQuest: (id) => {
    const self = get()
    const q = get().quests[id]
    if (!q || q.status === 'complete') return
    set({ quests: { ...get().quests, [id]: { ...q, status: 'complete', objectives: q.objectives.map((o) => ({ ...o, done: true })) } } })
    self.narrate(`Quest complete: ${q.name}. Reward: ${q.reward}`, 'major')
    self.gainXp(80 * q.difficulty)
    // signature quest reward: Gravewind
    if (id === 'quest_descent') {
      const gw = get().items['weapon_gravewind_' + '0000']
      const sig = signatureItems().find((i) => i.name === 'Gravewind')
      if (sig && !get().inventory.includes(sig.id) && !Object.values(get().player.equipment).includes(sig.id)) {
        self.addItem(sig)
      } else if (gw) {
        self.addItem(gw)
      }
    }
  },

  // ---------------- npc / faction ----------------
  setRelation: (npcId, field, value) => {
    const n = get().npcs[npcId]
    if (!n) return
    set({ npcs: { ...get().npcs, [npcId]: { ...n, [field]: value } } })
  },

  addMemory: (npcId, memory) => {
    const n = get().npcs[npcId]
    if (!n) return
    set({ npcs: { ...get().npcs, [npcId]: { ...n, memories: [...n.memories, memory] } } })
  },

  recruit: (npcId) => {
    const self = get()
    const n = get().npcs[npcId]
    if (!n) return
    const comp: Companion = {
      ...(n as Companion),
      isCompanion: true, relationship: 20,
      classId: (n as Companion).classId ?? 'reaver', className: (n as Companion).className ?? 'Reaver',
      skills: (n as Companion).skills ?? [], cLevel: (n as Companion).cLevel ?? n.level,
    }
    set({ companions: { ...get().companions, [npcId]: comp }, npcs: { ...get().npcs, [npcId]: { ...n, isCompanion: true } } })
    self.setScene({
      id: uid('sc'), kind: 'companion', title: 'A COMPANION JOINS', subtitle: n.name, body: `${n.name} falls into step beside you. "${n.goal ? 'For now, our roads run together.' : 'Try not to die.'}"`,
      entityId: npcId, entityType: 'npc', seed: n.seed, rarity: 'epic', choices: [{ label: 'Together, then', action: 'dismiss' }],
    })
  },

  setFactionRep: (factionId, value) => {
    const f = get().factions[factionId]
    if (!f) return
    const standing = value >= 80 ? 'exalted' : value >= 40 ? 'allied' : value >= 10 ? 'friendly' : value <= -80 ? 'hostile' : value <= -40 ? 'unfriendly' : 'neutral'
    set({ factions: { ...get().factions, [factionId]: { ...f, reputation: value, standing } } })
  },

  setSetting: (k, v) => set({ settings: { ...get().settings, [k]: v } }),

  // ==========================================================
  // SYSTEM OVERRIDE
  // ==========================================================
  cheatUnlock: (tier, quiet) => {
    const c = get().cheat
    const discovered = c.discoveredTiers.includes(tier) ? c.discoveredTiers : [...c.discoveredTiers, tier]
    set({ cheat: { ...c, unlocked: true, tier: c.tier === 'locked' ? tier : c.tier, discoveredTiers: discovered } })
    if (!quiet) {
      get().narrate(`SYSTEM MESSAGE: "Something noticed you." NEW ACCESS UNLOCKED: ${tier.toUpperCase()}`, 'system')
      get().setScene({
        id: uid('sc'), kind: 'system', title: 'SYSTEM OVERRIDE', subtitle: `${tier.toUpperCase()} ACCESS GRANTED`,
        body: 'You have found a seam in the world. Behind it: the laws that hold everything together, waiting to be rewritten.',
        seed: seedFrom('sys' + tier), rarity: 'conceptual', choices: [{ label: 'Look closer', action: 'dismiss' }],
      })
    }
    pushLog(get, (p) => set(p), `${tier.toUpperCase()} access unlocked.`)
  },

  cheatSetTier: (tier) => {
    const c = get().cheat
    if (!c.discoveredTiers.includes(tier)) return
    set({ cheat: { ...c, tier } })
    pushLog(get, (p) => set(p), `Access level set to ${tier.toUpperCase()}.`)
  },

  cheatToggle: (flag) => {
    const c = get().cheat
    const value = !c.flags[flag]
    set({ cheat: { ...c, flags: { ...c.flags, [flag]: value } } })
    pushLog(get, (p) => set(p), `${String(flag)} → ${value ? 'ON' : 'OFF'}`)
    registerOverride(get, (p) => set(p), get())
  },

  cheatSetFlag: (flag, value) => {
    const c = get().cheat
    set({ cheat: { ...c, flags: { ...c.flags, [flag]: value } } })
    pushLog(get, (p) => set(p), `${String(flag)} = ${String(value)}`)
    registerOverride(get, (p) => set(p), get())
  },

  cheatSetStat: (key, value) => {
    const p = get().player
    set({ player: recompute({ ...p, attributes: { ...p.attributes, [key]: value } }) })
    pushLog(get, (pp) => set(pp), `${key} = ${value}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatAllStats: (value) => {
    const p = get().player
    const attributes = { ...p.attributes }
    for (const k of Object.keys(attributes) as AttrKey[]) attributes[k] = value
    set({ player: recompute({ ...p, attributes }) })
    pushLog(get, (pp) => set(pp), `ALL STATS = ${value}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatMultStats: (factor) => {
    const p = get().player
    const attributes = { ...p.attributes }
    for (const k of Object.keys(attributes) as AttrKey[]) attributes[k] = Math.round(attributes[k] * factor)
    set({ player: recompute({ ...p, attributes }) })
    pushLog(get, (pp) => set(pp), `STATS ×${factor}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatRandomStats: () => {
    const p = get().player
    const rng = new Rng(seedFrom('chaos' + Date.now()))
    const attributes = { ...p.attributes }
    for (const k of Object.keys(attributes) as AttrKey[]) attributes[k] = rng.int(1, 999)
    set({ player: recompute({ ...p, attributes }) })
    pushLog(get, (pp) => set(pp), 'STATS RANDOMIZED')
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatSetLevel: (level) => {
    const p = recompute({ ...get().player, level: Math.max(1, level), xp: 0, attrPoints: get().player.attrPoints + Math.max(0, (level - get().player.level)) * 5 })
    set({ player: p })
    pushLog(get, (pp) => set(pp), `LEVEL = ${level}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatAddXp: (amount) => {
    get().gainXp(amount)
    pushLog(get, (pp) => set(pp), `+${amount} XP (override)`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatSetCurrency: (cur, value) => {
    const p = get().player
    set({ player: { ...p, currencies: { ...p.currencies, [cur]: value } } })
    pushLog(get, (pp) => set(pp), `${cur} = ${value}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatSpawnWeapon: (opts) => {
    const self = get()
    const w = createWeapon({
      name: opts.name, weaponType: opts.weaponType ?? 'Sword', rarity: opts.rarity, element: opts.element ?? 'void',
      level: opts.level ?? get().player.level, concept: opts.concept, sentient: opts.sentient, lore: opts.lore,
      seedKey: 'spawn_' + (opts.name ?? '') + Date.now(),
    })
    self.narrate('SYSTEM OVERRIDE — WEAPON GENERATED', 'system')
    self.addItem(w) // triggers cinematic reveal for high rarity
    if (rInfo(w.rarity).order < 5) {
      self.setScene({
        id: uid('sc'), kind: 'system', title: 'ENTITY CREATED', subtitle: w.name, body: w.lore, entityId: w.id, entityType: 'item',
        rarity: w.rarity, seed: w.seed, choices: [{ label: 'Equip', action: 'equip', payload: w.id }, { label: 'Store', action: 'dismiss' }],
      })
    }
    pushLog(get, (pp) => set(pp), `Spawned weapon: ${w.name} (${w.rarity})`)
    if (w.rarity === 'conceptual' || w.rarity === 'absolute') {
      if (!get().cheat.achievements.includes('the_impossible')) {
        set({ cheat: { ...get().cheat, achievements: [...get().cheat.achievements, 'the_impossible'] } })
        self.narrate('ACHIEVEMENT — THE IMPOSSIBLE: obtained a Conceptual item through override.', 'system')
      }
    }
    if (!get().cheat.achievements.includes('author')) {
      set({ cheat: { ...get().cheat, achievements: [...get().cheat.achievements, 'author'] } })
      self.narrate('ACHIEVEMENT — AUTHOR: created a custom entity.', 'system')
    }
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatSpawnArmor: (opts) => {
    const self = get()
    const a = createArmor({ name: opts.name, slot: opts.slot ?? 'chest', rarity: opts.rarity, element: opts.element ?? 'void', level: opts.level ?? get().player.level, seedKey: 'spawn_arm_' + Date.now() })
    self.narrate('SYSTEM OVERRIDE — ARMOR GENERATED', 'system')
    self.addItem(a)
    pushLog(get, (pp) => set(pp), `Spawned armor: ${a.name} (${a.rarity})`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatUpgradeRarity: (itemId) => {
    const self = get()
    const item = get().items[itemId]
    if (!item) return
    const nr = nextRarity(item.rarity)
    const ri = rInfo(nr)
    const upgraded = { ...item, rarity: nr, damage: item.damage ? Math.round((item.damage / (rInfo(item.rarity).statMult || 1)) * ri.statMult) : item.damage, armor: item.armor ? Math.round((item.armor / (rInfo(item.rarity).statMult || 1)) * ri.statMult) : item.armor }
    set({ items: { ...get().items, [itemId]: upgraded } })
    self.narrate(`SYSTEM OVERRIDE — ${item.name} → ${ri.label}`, 'system')
    pushLog(get, (pp) => set(pp), `Rarity upgrade: ${item.name} → ${nr}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatEvolveItem: (itemId) => {
    const self = get()
    const item = get().items[itemId]
    if (!item || item.kind !== 'weapon') return
    const evolved = evolveWeapon(item)
    self.addItem(evolved, { silent: true })
    self.setScene({ id: uid('sc'), kind: 'system', title: 'FORCED EVOLUTION', subtitle: evolved.name, body: evolved.lore, entityId: evolved.id, entityType: 'item', rarity: evolved.rarity, seed: evolved.seed, choices: [{ label: 'Equip', action: 'equip', payload: evolved.id }, { label: 'Store', action: 'dismiss' }] })
    pushLog(get, (pp) => set(pp), `Evolved ${item.name} → ${evolved.name}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatMakeSentient: (itemId) => {
    const item = get().items[itemId]
    if (!item) return
    const rng = new Rng(item.seed)
    const updated = { ...item, sentient: true, sentience: { name: item.name, mood: 0, lines: ['"...I am awake now.", it says. "Was I always?"', '"You will not put me down easily."'] } }
    set({ items: { ...get().items, [itemId]: updated } })
    get().narrate(`${item.name} stirs. It is awake now.`, 'ominous')
    pushLog(get, (pp) => set(pp), `Made sentient: ${item.name}`)
    void rng
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatDuplicateItem: (itemId) => {
    const item = get().items[itemId]
    if (!item) return
    const copy = { ...item, id: item.id + '_dup_' + uid('d'), seed: item.seed + 1 }
    get().addItem(copy, { silent: true })
    get().narrate(`Duplicated ${item.name}.`, 'normal')
    pushLog(get, (pp) => set(pp), `Duplicated ${item.name}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatUnlockAllSkills: () => {
    const self = get()
    const skills = { ...get().skills }
    const pskills = { ...get().player.skills }
    for (const el of ELEMENTS) {
      const sk = createSkill({ element: el as Element, tier: 4, seedKey: 'unlockall_' + el })
      skills[sk.id] = sk
      pskills[sk.id] = { level: 5, unlocked: true }
    }
    const concept = createSkill({ element: 'concept', kind: 'conceptual', concept: 'Severance', seedKey: 'unlockall_concept' })
    skills[concept.id] = concept
    pskills[concept.id] = { level: 1, unlocked: true }
    set({ skills, player: { ...get().player, skills: pskills } })
    self.narrate('SYSTEM OVERRIDE — ALL SKILLS UNLOCKED', 'system')
    pushLog(get, (pp) => set(pp), 'Unlocked all skills')
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatUnlockAllTitles: () => {
    const self = get()
    for (const t of TITLES) if (!get().player.titles.includes(t.id)) self.addTitle(t.id)
    pushLog(get, (pp) => set(pp), 'Unlocked all titles')
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatSpawnNpc: (opts) => {
    const self = get()
    const n = createNPC({ name: opts.name, boss: opts.boss, faction: opts.faction, element: opts.element, level: opts.level, location: get().currentLocation, seedKey: 'spawn_npc_' + Date.now() })
    set({ npcs: { ...get().npcs, [n.id]: n } })
    const loc = get().locations[get().currentLocation]
    if (loc) set({ locations: { ...get().locations, [loc.id]: { ...loc, npcs: [...(loc.npcs ?? []), n.id], boss: opts.boss ? n.id : loc.boss } } })
    self.setScene({ id: uid('sc'), kind: 'system', title: opts.boss ? 'ENTITY CREATED' : 'NPC SPAWNED', subtitle: n.name, body: `${n.name}, ${n.role}. ${n.background}`, entityId: n.id, entityType: 'npc', seed: n.seed, rarity: opts.boss ? 'mythic' : 'rare', choices: [{ label: 'Acknowledge', action: 'dismiss' }] })
    pushLog(get, (pp) => set(pp), `Spawned ${opts.boss ? 'boss' : 'npc'}: ${n.name}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatSpawnLocation: (opts) => {
    const self = get()
    const loc = createLocation({ name: opts.name, type: opts.type, biome: opts.biome, danger: opts.danger, seedKey: 'spawn_loc_' + Date.now() })
    loc.discovered = true
    loc.connections = [get().currentLocation]
    self.revealLocation(loc)
    self.setScene({ id: uid('sc'), kind: 'system', title: 'LOCATION GENERATED', subtitle: loc.name, body: loc.description, entityId: loc.id, entityType: 'location', seed: loc.seed, rarity: 'epic', choices: [{ label: 'Travel there', action: 'dismiss' }] })
    pushLog(get, (pp) => set(pp), `Spawned location: ${loc.name}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatSpawnRift: (opts) => {
    const self = get()
    const rift = createRift({ name: opts.name, tier: opts.tier, element: opts.element, seedKey: 'spawn_rift_' + Date.now() })
    set({ rifts: { ...get().rifts, [rift.id]: rift } })
    // also drop a rift location on the map
    const loc = createLocation({ name: rift.name, type: 'rift', biome: 'void rift', danger: Math.min(5, (opts.tier ?? 1) + 1), seedKey: rift.id })
    loc.discovered = true
    loc.connections = [get().currentLocation]
    self.revealLocation(loc)
    self.setScene({ id: uid('sc'), kind: 'rift', title: 'A RIFT IS TORN OPEN', subtitle: rift.name, body: `Tier ${rift.tier}. ${rift.environment}.`, entityId: loc.id, entityType: 'rift', seed: rift.seed, rarity: 'legendary', choices: [{ label: 'It bleeds', action: 'dismiss' }] })
    pushLog(get, (pp) => set(pp), `Spawned rift: ${rift.name} (tier ${rift.tier})`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatRevealMap: () => {
    const locations = { ...get().locations }
    for (const id of Object.keys(locations)) locations[id] = { ...locations[id], discovered: true }
    set({ locations, cheat: { ...get().cheat, flags: { ...get().cheat.flags, walkThroughWorld: true } } })
    get().narrate('SYSTEM OVERRIDE — ENTIRE MAP REVEALED', 'system')
    pushLog(get, (pp) => set(pp), 'Revealed entire map')
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatSetWeather: (weather) => {
    set({ weather })
    pushLog(get, (pp) => set(pp), `Weather = ${weather}`)
  },

  cheatWorldEvent: (title, description, kind = 'custom') => {
    const self = get()
    const ev = { id: uid('ev'), title, description, kind, time: get().worldTime, severity: 3 }
    set({ events: [ev, ...get().events].slice(0, 30) })
    self.setScene({ id: uid('sc'), kind: 'world', title: 'WORLD EVENT', subtitle: title, body: description, seed: seedFrom(title), rarity: 'mythic', choices: [{ label: 'The world shudders', action: 'dismiss' }] })
    pushLog(get, (pp) => set(pp), `World event: ${title}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatConceptOverride: (concept) => {
    const self = get()
    const c = get().cheat
    set({ cheat: { ...c, conceptOverrides: [...new Set([...c.conceptOverrides, concept])] } })
    self.setScene({
      id: uid('sc'), kind: 'concept', title: 'CONCEPT OVERRIDE', subtitle: `${concept.toUpperCase()} — REVOKED`,
      body: `You reach into the source of the world and delete ${concept}. Reality does not argue. It simply complies, and something, somewhere, screams.`,
      seed: seedFrom('concept' + concept), rarity: 'conceptual', choices: [{ label: 'It is done', action: 'dismiss' }],
    })
    if (!c.achievements.includes('world_breaker')) {
      set({ cheat: { ...get().cheat, achievements: [...get().cheat.achievements, 'world_breaker'] } })
      self.narrate('ACHIEVEMENT — WORLD BREAKER: revoked a fundamental concept.', 'system')
    }
    pushLog(get, (pp) => set(pp), `Concept override: ${concept} revoked`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatCreateQuest: (opts) => {
    const self = get()
    const id = 'quest_custom_' + uid('q')
    const q: Quest = {
      id, name: opts.name, description: opts.description,
      objectives: [{ id: 'o1', description: `Pursue: ${opts.theme ?? opts.name}`, done: false }],
      reward: opts.reward, difficulty: opts.difficulty, status: 'active', seed: seedFrom(id), arc: 'authored',
    }
    set({ quests: { ...get().quests, [id]: q } })
    self.narrate(`SYSTEM OVERRIDE — QUEST CREATED: ${opts.name}`, 'system')
    pushLog(get, (pp) => set(pp), `Created quest: ${opts.name}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatSnapshot: (label) => {
    const c = get().cheat
    const { cheat, ...rest } = get()
    void cheat
    const snap = { id: uid('snap'), label: label ?? `Reality Snapshot #${c.snapshots.length + 1}`, time: Date.now(), data: JSON.stringify(rest) }
    set({ cheat: { ...c, snapshots: [snap, ...c.snapshots].slice(0, 10) } })
    pushLog(get, (pp) => set(pp), `Snapshot saved: ${snap.label}`)
  },

  cheatRevert: (id) => {
    const c = get().cheat
    const snap = c.snapshots.find((s) => s.id === id)
    if (!snap) return
    try {
      const data = JSON.parse(snap.data) as Partial<GameState>
      set({ ...data, cheat: get().cheat })
      get().narrate(`REALITY REVERTED to ${snap.label}.`, 'system')
      pushLog(get, (pp) => set(pp), `Reverted to ${snap.label}`)
    } catch {
      /* ignore */
    }
  },

  cheatUndoLast: () => {
    const c = get().cheat
    if (c.snapshots.length) get().cheatRevert(c.snapshots[0].id)
  },

  cheatPreset: (preset) => {
    const self = get()
    const setFlags = (partial: Partial<CheatFlags>) => set({ cheat: { ...get().cheat, flags: { ...get().cheat.flags, ...partial } } })
    switch (preset) {
      case 'casual-god':
        setFlags({ infiniteHp: true, infiniteMana: true, xpMultiplier: 2 })
        break
      case 'loot-god':
        setFlags({ guaranteedRarity: 'legendary', autoLoot: true, lootMultiplier: 3 })
        break
      case 'one-punch':
        setFlags({ oneShot: true })
        self.cheatAllStats(999)
        break
      case 'immortal':
        setFlags({ godMode: true, immortal: true, infiniteHp: true, noStatusEffects: true })
        break
      case 'chaos':
        setFlags({ chaosMode: true })
        self.cheatChaos()
        break
      case 'author':
        setFlags({ godMode: true, infiniteHp: true, infiniteMana: true, noCooldowns: true, oneShot: true, infiniteResources: true, guaranteedRarity: 'conceptual', xpMultiplier: 100, lootMultiplier: 5, walkThroughWorld: true })
        self.cheatUnlockAllSkills()
        break
      case 'reality-breaker':
        setFlags({ godMode: true, noCooldowns: true })
        self.cheatConceptOverride('Distance')
        break
    }
    self.narrate(`SYSTEM OVERRIDE — PRESET APPLIED: ${preset.replace('-', ' ').toUpperCase()}`, 'system')
    pushLog(get, (pp) => set(pp), `Preset: ${preset}`)
    registerOverride(get, (pp) => set(pp), get())
  },

  cheatChaos: () => {
    const self = get()
    self.cheatRandomStats()
    const rng = new Rng(seedFrom('chaos' + Date.now()))
    self.cheatSetWeather(rng.pick(['blood moon', 'void storm', 'divine rain', 'meteor shower', 'aurora', 'dimensional storm']))
    self.cheatSpawnWeapon({ rarity: rng.pick(RARITIES.slice(5).map((r) => r.key)) as Rarity, element: rng.pick(ELEMENTS) as Element })
    self.narrate('SYSTEM OVERRIDE — CHAOS SEEDED. The world stops being predictable.', 'system')
    pushLog(get, (pp) => set(pp), 'Chaos mode triggered')
  },

  cheatNewGamePlus: () => {
    // carry player power, reset world
    const self = get()
    const carriedPlayer = get().player
    const items = get().items
    const inv = get().inventory
    const world = startingWorld()
    const locs: Record<string, LocationNode> = {}
    for (const l of world.locations) locs[l.id] = l
    const npcs: Record<string, NPC> = {}
    for (const n of world.npcs) npcs[n.id] = n
    npcs[world.boss.id] = world.boss
    npcs[world.companion.id] = world.companion
    const quests: Record<string, Quest> = {}
    for (const q of world.quests) quests[q.id] = q
    set({
      locations: locs, npcs, quests, currentLocation: 'loc_ashen_hearth', mode: 'explore',
      worldTime: 8 * 60, events: [], combat: null,
      player: { ...carriedPlayer, hp: carriedPlayer.maxHp },
      items, inventory: inv,
      flags: { ...get().flags, newGamePlus: ((get().flags.newGamePlus as number) ?? 0) + 1 },
    })
    self.narrate('NEW GAME+ — the world resets. You do not.', 'major')
    pushLog(get, (pp) => set(pp), 'New Game+ triggered')
  },

  cheatSetConsequences: (level) => set({ cheat: { ...get().cheat, consequences: level } }),

  cheatAscendMax: () => {
    const self = get()
    let p = { ...get().player, ascension: 'conceptual' as AscensionStage, ascensionProgress: 100 }
    set({ player: recompute(p) })
    self.setScene({ id: uid('sc'), kind: 'ascension', title: 'ASCENSION OVERRIDE', subtitle: 'All requirements bypassed', body: 'You skip the climb entirely. You simply arrive at the summit, as if you had always been there.', seed: p.seed, rarity: 'absolute', lines: ['Ascension: CONCEPTUAL', 'Requirements: BYPASSED'], choices: [{ label: 'Stand at the peak', action: 'dismiss' }] })
    pushLog(get, (pp) => set(pp), 'Ascension override → CONCEPTUAL')
    void p
    registerOverride(get, (pp) => set(pp), get())
  },
}))
