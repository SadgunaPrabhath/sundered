// ============================================================
// Initial world content for THE SUNDERED.
// Signature named entities are authored; the rest is procedural.
// ============================================================
import type {
  ClassDef,
  Companion,
  Faction,
  Item,
  LocationNode,
  NPC,
  Quest,
  Rift,
  Title,
  ArmorSet,
} from '@/state/types'
import { createWeapon, createArmor, createNPC, createRift, buildArmorSet } from '@/engine/factories'
import { seedFrom } from '@/engine/rng'

// ---------------- CLASSES (with evolution trees) ----------------
export const CLASSES: ClassDef[] = [
  { id: 'wanderer', name: 'Wanderer', tier: 0, description: 'One who fell through a rift and walked back out. Unshaped potential.', evolvesTo: ['warrior', 'mage', 'reaver', 'warden'] },
  { id: 'warrior', name: 'Warrior', tier: 1, description: 'Steel and will. The oldest answer to a broken world.', evolvesTo: ['knight', 'reaver'] },
  { id: 'mage', name: 'Mage', tier: 1, description: 'A mind that bends the leftover laws of a shattered world.', evolvesTo: ['runeblade', 'voidcaller'] },
  { id: 'reaver', name: 'Reaver', tier: 1, description: 'Kills first. Grieves never.', evolvesTo: ['void-knight'] },
  { id: 'warden', name: 'Warden', tier: 1, description: 'Stands between the living and the rift.', evolvesTo: ['knight'] },
  { id: 'knight', name: 'Knight', tier: 2, description: 'An oath given form.', evolvesTo: ['runeblade'] },
  { id: 'runeblade', name: 'Runeblade', tier: 3, description: 'Sword and spell braided into one edge.', evolvesTo: ['void-knight'] },
  { id: 'voidcaller', name: 'Voidcaller', tier: 3, description: 'Speaks to what lives between realms.', evolvesTo: ['void-knight'] },
  { id: 'void-knight', name: 'Void Knight', tier: 4, description: 'Wears the rift like armor.', evolvesTo: ['astral-executioner'], hidden: true },
  { id: 'astral-executioner', name: 'Astral Executioner', tier: 5, description: 'Carries out sentences the world never spoke.', evolvesTo: ['conceptual-sovereign'], hidden: true },
  { id: 'conceptual-sovereign', name: 'Conceptual Sovereign', tier: 6, description: 'Rules an idea. Reality negotiates.', hidden: true },
  // hidden / cheat-unlockable
  { id: 'reality-architect', name: 'Reality Architect', tier: 9, description: 'Does not play the game. Edits it.', hidden: true },
]

// ---------------- ORIGINS (character creation) ----------------
export interface Origin {
  id: string
  name: string
  blurb: string
  bonuses: Partial<Record<string, number>>
  element: string
  startTitle: string
}
export const ORIGINS: Origin[] = [
  { id: 'ashborn', name: 'Ashborn', blurb: 'You woke in the ash of a city that no longer has a name.', bonuses: { strength: 3, endurance: 2, vitality: 2 }, element: 'fire', startTitle: 'title_riftborn' },
  { id: 'voidtouched', name: 'Void-Touched', blurb: 'Something in the rift looked back at you, and left a mark.', bonuses: { intelligence: 3, willpower: 3, perception: 1 }, element: 'void', startTitle: 'title_riftborn' },
  { id: 'lastwitness', name: 'Last Witness', blurb: 'You are the only one who remembers the world as it was.', bonuses: { perception: 3, luck: 2, willpower: 2 }, element: 'aether', startTitle: 'title_riftborn' },
  { id: 'gravewalker', name: 'Gravewalker', blurb: 'You died once. It did not take.', bonuses: { vitality: 3, endurance: 3, agility: 1 }, element: 'shadow', startTitle: 'title_riftborn' },
]

// ---------------- TITLES ----------------
export const TITLES: Title[] = [
  { id: 'title_riftborn', name: 'Riftborn', description: 'You fell through, and came back wrong.', effect: '+2 Willpower', rarity: 'rare', bonuses: { willpower: 2 } },
  { id: 'title_first_blood', name: 'First Blood', description: 'You have killed in the Sundered world.', effect: '+3% damage', rarity: 'common' },
  { id: 'title_rift_survivor', name: 'Rift Survivor', description: 'You entered a rift and walked out.', effect: '+5 Vitality', rarity: 'epic', bonuses: { vitality: 5 } },
  { id: 'title_dungeon_breaker', name: 'Dungeon Breaker', description: 'Cleared a sealed depth.', effect: '+4 Strength', rarity: 'epic', bonuses: { strength: 4 } },
  { id: 'title_god_hunter', name: 'God Hunter', description: 'You struck something that called itself a god.', effect: '+8 all combat stats', rarity: 'mythic' },
  { id: 'title_nameless', name: 'The Nameless', description: 'The world has forgotten what to call you.', effect: 'NPCs cannot predict you', rarity: 'legendary', hidden: true },
  { id: 'title_refuses_fate', name: 'He Who Refuses Fate', description: 'You said no to the ending.', effect: 'Once per rift, survive lethal damage', rarity: 'divine', hidden: true },
  { id: 'title_system_breach', name: 'The One Who Broke The System', description: 'You touched the source of the world.', effect: '+??? — reality is negotiable', rarity: 'conceptual', hidden: true },
  { id: 'title_reality_error', name: "Reality's Error", description: 'You should not be possible.', effect: 'You persist through edits', rarity: 'absolute', hidden: true },
]

// ---------------- FACTIONS ----------------
export const FACTIONS: Faction[] = [
  { id: 'wardens', name: 'The Riftwardens', description: 'Sworn to seal every tear in the world. Zealous, dwindling.', reputation: 10, standing: 'neutral', atWarWith: [], alliedWith: [], secrets: ['They have failed more than they admit.'] },
  { id: 'hollow', name: 'The Hollow Court', description: 'Those who believe the world was meant to break.', reputation: -10, standing: 'unfriendly', atWarWith: ['wardens'], alliedWith: [], secrets: ['Their queen has never been seen alive.'] },
  { id: 'ashfolk', name: 'The Ashfolk', description: 'Survivors of the first Sundering, rebuilding on the bones.', reputation: 0, standing: 'neutral', atWarWith: [], alliedWith: [], secrets: [] },
  { id: 'system', name: 'The Silent Registry', description: 'An entity nobody remembers agreeing to. It keeps records.', reputation: 0, standing: 'neutral', atWarWith: [], alliedWith: [], secrets: ['It is aware of you.'] },
]

// ---------------- SIGNATURE ITEMS ----------------
export function signatureItems(): Item[] {
  const items: Item[] = []
  // legendary
  items.push(
    createWeapon({ name: 'Gravewind', weaponType: 'Greatsword', rarity: 'legendary', element: 'shadow', level: 8, lore: 'The sword that remembers every death it has caused, and whispers them at dusk.', seedKey: 'sig_gravewind' })
  )
  // mythic
  items.push(
    createWeapon({ name: 'Worldbreaker', weaponType: 'Warhammer', rarity: 'mythic', element: 'earth', level: 14, lore: 'A weapon forged from the core of a dying realm. It is heavier than grief.', seedKey: 'sig_worldbreaker' })
  )
  // divine artifact
  items.push(
    createWeapon({ name: 'Sol Invictus', weaponType: 'Sword', rarity: 'divine', element: 'light', level: 18, lore: 'A blade carrying the authority of a forgotten sun god. It refuses to be sheathed in darkness.', blessing: 'Dawnbound', seedKey: 'sig_sol' })
  )
  // conceptual
  items.push(
    createWeapon({ name: 'Null', weaponType: 'Soul Blade', rarity: 'conceptual', element: 'concept', level: 25, concept: 'Severance', lore: 'Not a sword that cuts things. A sword that removes the concept of being whole.', sentient: true, seedKey: 'sig_null' })
  )
  return items
}

// ---------------- STARTER ARMOR SET ----------------
export function ashenKingSet(): { pieces: Item[]; set: ArmorSet } {
  const pieces = [
    createArmor({ name: 'Ashen King Helm', slot: 'helmet', armorType: 'Heavy', rarity: 'epic', element: 'fire', level: 6, setId: 'ashen_king', seedKey: 'ak_helm' }),
    createArmor({ name: 'Ashen King Plate', slot: 'chest', armorType: 'Heavy', rarity: 'epic', element: 'fire', level: 6, setId: 'ashen_king', seedKey: 'ak_chest' }),
  ]
  const set = buildArmorSet('ashen_king', 'The Ashen King', pieces.map((p) => p.id), [
    { count: 2, description: '+10% Fire Resistance' },
    { count: 4, description: 'Immune to Burning' },
    { count: 6, description: 'Unlocks "Ash Resurrection"' },
    { count: 7, description: 'Transforms into the Crown of the Last King' },
  ])
  return { pieces, set }
}

// ---------------- STARTING WORLD ----------------
export function startingWorld() {
  // Locations laid out on a 0..100 map grid.
  const hearth: LocationNode = {
    id: 'loc_ashen_hearth', name: 'Ashen Hearth', type: 'town', region: 'The First Reach', biome: 'ashen waste town',
    danger: 1, population: '~900 souls', faction: 'ashfolk', weather: 'ash-fall',
    description: 'The last lit hearth in the First Reach. Refugees gather here, trading rumors and rift-shards beneath a sky that never fully clears.',
    threats: ['pickpockets', 'the occasional husk at the gate'], secrets: [], discovered: true, visited: true,
    x: 24, y: 62, connections: ['loc_dead_wood', 'loc_hollow_descent'], npcs: ['npc_seraphine', 'npc_garrick_smith', 'npc_orin_scholar'],
    seed: seedFrom('loc_ashen_hearth'), actions: ['enter', 'rest', 'trade', 'observe', 'search', 'map'],
  }
  const deadwood: LocationNode = {
    id: 'loc_dead_wood', name: 'The Weeping Wood', type: 'wild', region: 'The First Reach', biome: 'dead forest',
    danger: 2, weather: 'still',
    description: 'A forest of grey trees that bleed sap like tears. Something moves between the trunks, always just out of sight.',
    threats: ['prowling husks', 'a rift bleeding nearby'], secrets: [], discovered: true, visited: false,
    x: 42, y: 50, connections: ['loc_ashen_hearth', 'loc_black_sky', 'loc_first_rift'], enemies: ['husk', 'wraith'],
    seed: seedFrom('loc_dead_wood'), actions: ['enter', 'observe', 'search', 'map'],
  }
  const descent: LocationNode = {
    id: 'loc_hollow_descent', name: 'The Hollow Descent', type: 'dungeon', region: 'The First Reach', biome: 'sunken city dungeon',
    danger: 3, weather: 'rift-haze',
    description: 'A stairway spiraling into a drowned city that predates the Sundering. The deeper you go, the more the walls remember.',
    threats: ['unquiet dead', 'collapsing ground'], secrets: ['a sealed vault'], discovered: true, visited: false,
    x: 16, y: 40, connections: ['loc_ashen_hearth'], enemies: ['husk', 'drowned-knight'], boss: 'boss_abyssal_knight',
    loot: [], seed: seedFrom('loc_hollow_descent'), actions: ['enter', 'observe', 'search', 'map'],
  }
  const rift: LocationNode = {
    id: 'loc_first_rift', name: 'The First Tear', type: 'rift', region: 'The First Reach', biome: 'void rift',
    danger: 4, weather: 'rift-haze',
    description: 'The wound in the sky that started it all. Violet light spills from it like blood from a vein that will not close.',
    threats: ['rift beasts', 'reality slippage'], secrets: [], discovered: true, visited: false,
    x: 60, y: 34, connections: ['loc_dead_wood'], seed: seedFrom('loc_first_rift'), actions: ['approach', 'observe', 'search'],
  }
  const citadel: LocationNode = {
    id: 'loc_black_sky', name: 'The Black Sky Citadel', type: 'landmark', region: 'The First Reach', biome: 'floating ruins citadel',
    danger: 5, weather: 'eclipse',
    description: 'An ancient black fortress floating above the dead wood, tethered to nothing. It should have fallen an age ago. It has not.',
    threats: ['whatever rules it'], secrets: ['a throne with no king'], discovered: false, visited: false,
    x: 70, y: 20, connections: ['loc_dead_wood'], seed: seedFrom('loc_black_sky'), actions: ['approach', 'observe'],
  }
  const locations = [hearth, deadwood, descent, rift, citadel]

  // NPCs
  const seraphine: NPC = {
    ...createNPC({ name: 'Seraphine', role: 'Riftwarden', faction: 'wardens', level: 9, location: 'loc_ashen_hearth', seedKey: 'npc_seraphine' }),
    id: 'npc_seraphine',
    appearance: 'silver-eyed, a warden\'s grey cloak scorched at the hem',
    personality: 'guarded, sharp, quietly kind',
    background: 'The last surviving warden of the Cathedral cohort. She does not talk about the Cathedral.',
    goal: 'to seal the First Tear before it widens',
    fear: 'that sealing it will not be enough',
    secrets: ['She was there when the Cathedral fell.', 'She suspects the rifts are being opened deliberately.'],
  }
  const garrick: NPC = {
    ...createNPC({ name: 'Garrick', role: 'Smith', faction: 'ashfolk', merchant: true, level: 5, location: 'loc_ashen_hearth', seedKey: 'npc_garrick' }),
    id: 'npc_garrick_smith', isMerchant: true, personality: 'gruff, honest', role: 'Smith & Merchant',
  }
  const orin: NPC = {
    ...createNPC({ name: 'Orin', role: 'Scholar', faction: 'ashfolk', level: 4, location: 'loc_ashen_hearth', seedKey: 'npc_orin' }),
    id: 'npc_orin_scholar', personality: 'anxious, brilliant', role: 'Scholar of the Sundering',
    secrets: ['He has read a book that should not exist.', 'He has heard the Registry speak.'],
  }
  const npcs = [seraphine, garrick, orin]

  // Boss
  const boss: NPC = {
    ...createNPC({ name: 'The Abyssal Knight', boss: true, faction: 'hollow', level: 20, location: 'loc_hollow_descent', seedKey: 'boss_abyssal' }),
    id: 'boss_abyssal_knight',
    appearance: 'a suit of drowned black armor, empty, moving on a will not its own',
    background: 'It was a Riftwarden once. It went down the Descent and something came back up.',
    secrets: ['It remembers Seraphine.'],
  }

  // Companion
  const companion: Companion = {
    ...createNPC({ name: 'Kael', role: 'Reaver', faction: 'unaligned', level: 7, location: 'loc_dead_wood', seedKey: 'comp_kael' }),
    id: 'comp_kael', isCompanion: false,
    appearance: 'lean, restless, twin blades worn from use',
    personality: 'reckless, loyal once earned, hides grief behind jokes',
    background: 'Lost his sister to the First Tear. Hunts rifts looking for a way to get her back.',
    goal: 'to reach the far side of a rift and return',
    fear: 'that she is already gone',
    classId: 'reaver', className: 'Reaver', skills: [], relationship: 0, cLevel: 7,
    personalQuest: 'quest_kael_sister',
  } as Companion

  // Rift
  const firstRift: Rift = {
    ...createRift({ name: 'The First Tear', tier: 4, element: 'void', seedKey: 'rift_first' }),
    id: 'rift_first_tear',
  }

  // Quests
  const quests: Quest[] = [
    {
      id: 'quest_first_steps', name: 'What the Ash Remembers', giver: 'npc_seraphine',
      description: 'Seraphine asks you to clear the husks gathering in the Weeping Wood before they reach the Hearth.',
      objectives: [
        { id: 'o1', description: 'Enter the Weeping Wood', done: false },
        { id: 'o2', description: 'Defeat the husks', done: false },
        { id: 'o3', description: 'Return to Seraphine', done: false },
      ],
      reward: 'Warden\'s favor, gold, and a weapon', difficulty: 1, status: 'available', arc: 'awakening', seed: seedFrom('q1'),
    },
    {
      id: 'quest_descent', name: 'The Thing That Came Back Up', giver: 'npc_seraphine',
      description: 'Something wearing a warden\'s armor walks the Hollow Descent. Seraphine cannot face it. She asks you to.',
      objectives: [
        { id: 'o1', description: 'Descend into the Hollow Descent', done: false },
        { id: 'o2', description: 'Defeat the Abyssal Knight', done: false },
      ],
      reward: 'The truth about the Cathedral, and Gravewind', difficulty: 3, status: 'available', arc: 'awakening', seed: seedFrom('q2'),
    },
    {
      id: 'quest_kael_sister', name: 'The Far Side', giver: 'comp_kael',
      description: 'Kael believes his sister is alive beyond the First Tear. He will follow you if you help him look.',
      objectives: [{ id: 'o1', description: 'Approach the First Tear with Kael', done: false }],
      reward: 'Kael as a companion', difficulty: 2, status: 'available', hidden: false, arc: 'awakening', seed: seedFrom('q3'),
    },
  ]

  return { locations, npcs, boss, companion, firstRift, quests }
}

// enemy templates for combat
export interface EnemyTemplate {
  id: string
  name: string
  hp: number
  attack: number
  defense: number
  speed: number
  element: string
  intents: string[]
}
export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  husk: { id: 'husk', name: 'Ashen Husk', hp: 40, attack: 8, defense: 3, speed: 6, element: 'shadow', intents: ['claws at you', 'shrieks — you feel your resolve thin', 'lunges'] },
  wraith: { id: 'wraith', name: 'Grey Wraith', hp: 55, attack: 12, defense: 2, speed: 9, element: 'shadow', intents: ['phases toward you', 'drains warmth from the air', 'wails'] },
  'drowned-knight': { id: 'drowned-knight', name: 'Drowned Knight', hp: 90, attack: 16, defense: 8, speed: 5, element: 'frost', intents: ['raises a rusted blade', 'braces behind its shield', 'executes a slow, heavy swing'] },
}

export function bossTemplate(): { name: string; hp: number; attack: number; defense: number; speed: number; element: string; phases: string[] } {
  return {
    name: 'The Abyssal Knight', hp: 420, attack: 24, defense: 12, speed: 7, element: 'void',
    phases: ['The armor moves without a body inside.', 'THE ABYSSAL KNIGHT IS PREPARING EXECUTION.', 'It remembers your name now. That is worse.'],
  }
}
