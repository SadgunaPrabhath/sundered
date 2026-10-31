import type { Rarity } from '@/state/types'

export interface RarityInfo {
  key: Rarity
  label: string
  color: string
  order: number
  glow: number // 0..1 intensity of discovery spectacle
  statMult: number
  tier: 'mundane' | 'notable' | 'exotic' | 'mythic' | 'reality'
}

// Ordered from lowest to highest. Colors map to CSS vars in index.css.
export const RARITIES: RarityInfo[] = [
  { key: 'broken', label: 'Broken', color: '#5a5a68', order: 0, glow: 0, statMult: 0.4, tier: 'mundane' },
  { key: 'common', label: 'Common', color: '#b8bccb', order: 1, glow: 0.05, statMult: 1, tier: 'mundane' },
  { key: 'uncommon', label: 'Uncommon', color: '#5fd67a', order: 2, glow: 0.12, statMult: 1.3, tier: 'mundane' },
  { key: 'rare', label: 'Rare', color: '#4ba7e3', order: 3, glow: 0.3, statMult: 1.8, tier: 'notable' },
  { key: 'epic', label: 'Epic', color: '#a06bff', order: 4, glow: 0.45, statMult: 2.5, tier: 'notable' },
  { key: 'legendary', label: 'Legendary', color: '#ffb020', order: 5, glow: 0.7, statMult: 3.6, tier: 'exotic' },
  { key: 'mythic', label: 'Mythic', color: '#ff5c8a', order: 6, glow: 0.82, statMult: 5, tier: 'exotic' },
  { key: 'divine', label: 'Divine', color: '#ffe27a', order: 7, glow: 0.9, statMult: 7, tier: 'mythic' },
  { key: 'sacred', label: 'Sacred', color: '#7affd9', order: 8, glow: 0.9, statMult: 8, tier: 'mythic' },
  { key: 'ancient', label: 'Ancient', color: '#c98a3c', order: 9, glow: 0.88, statMult: 9, tier: 'mythic' },
  { key: 'transcendent', label: 'Transcendent', color: '#8affff', order: 10, glow: 0.94, statMult: 12, tier: 'mythic' },
  { key: 'abyssal', label: 'Abyssal', color: '#7b3dff', order: 11, glow: 0.95, statMult: 14, tier: 'reality' },
  { key: 'celestial', label: 'Celestial', color: '#b0e0ff', order: 12, glow: 0.96, statMult: 16, tier: 'reality' },
  { key: 'primordial', label: 'Primordial', color: '#ff8a3d', order: 13, glow: 0.98, statMult: 20, tier: 'reality' },
  { key: 'conceptual', label: 'Conceptual', color: '#ffffff', order: 14, glow: 1, statMult: 28, tier: 'reality' },
  { key: 'absolute', label: 'Absolute', color: '#ff2d6b', order: 15, glow: 1, statMult: 40, tier: 'reality' },
  { key: 'unknown', label: '???', color: '#ff2d6b', order: 16, glow: 1, statMult: 60, tier: 'reality' },
]

const BY_KEY = Object.fromEntries(RARITIES.map((r) => [r.key, r])) as Record<Rarity, RarityInfo>

export function rarity(key: Rarity): RarityInfo {
  return BY_KEY[key] ?? BY_KEY.common
}

export function rarityColor(key: Rarity): string {
  return rarity(key).color
}

export function nextRarity(key: Rarity): Rarity {
  const cur = rarity(key).order
  const found = RARITIES.find((r) => r.order === cur + 1)
  return found ? found.key : key
}

export const RARITY_ORDER: Rarity[] = RARITIES.map((r) => r.key)

// Weighted rarity roll influenced by luck and depth. Returns a rarity key.
export function rollRarity(rand: () => number, luck: number, depth: number, guaranteed?: Rarity | null): Rarity {
  if (guaranteed) return guaranteed
  // base weights decay steeply for high tiers; luck & depth push upward
  const push = Math.min(0.6, luck * 0.006 + depth * 0.02)
  const roll = Math.pow(rand(), Math.max(0.25, 1.6 - push))
  // map [0,1) → rarity index with heavy low-end bias
  const bands: [number, Rarity][] = [
    [0.34, 'common'],
    [0.58, 'uncommon'],
    [0.75, 'rare'],
    [0.87, 'epic'],
    [0.94, 'legendary'],
    [0.975, 'mythic'],
    [0.99, 'divine'],
    [0.997, 'ancient'],
    [0.9992, 'transcendent'],
    [0.9998, 'primordial'],
    [1, 'conceptual'],
  ]
  for (const [t, r] of bands) if (roll < t) return r
  return 'conceptual'
}
