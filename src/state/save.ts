import type { GameState } from './types'

const KEY = 'sundered.save.v1'

// Only persist serializable state fields (never functions/actions).
const STATE_KEYS: (keyof GameState)[] = [
  'mode', 'started', 'player', 'items', 'inventory', 'skills', 'titles', 'classes', 'npcs',
  'companions', 'factions', 'locations', 'rifts', 'quests', 'armorSets', 'assets',
  'currentLocation', 'worldTime', 'weather', 'events', 'narration', 'scene', 'combat',
  'activeDialogueNpc', 'cheat', 'settings', 'dialogueNode', 'pendingChoice', 'flags', 'saveVersion',
]

export function saveGame(state: GameState): void {
  try {
    const out: Partial<GameState> = {}
    for (const k of STATE_KEYS) (out as Record<string, unknown>)[k] = state[k]
    // never persist an open modal scene/combat mid-crash cleanly; keep as-is
    localStorage.setItem(KEY, JSON.stringify(out))
  } catch {
    /* storage may be unavailable */
  }
}

export function loadGame(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<GameState>
    if (!data.started) return null
    return data
  } catch {
    return null
  }
}

export function hasSave(): boolean {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return false
    const data = JSON.parse(raw) as Partial<GameState>
    return !!data.started
  } catch {
    return false
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
