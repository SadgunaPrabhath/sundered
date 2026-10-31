// ============================================================
// The World Engine. Interprets natural player input and returns
// structured world updates (narration + encounters + discoveries).
// Rule-based + procedural so it runs with zero API keys.
// Swap LocalWorldEngine for an LLM-backed provider behind
// NarrativeProvider without changing the store.
// ============================================================
import { Rng, seedFrom, uid } from './rng'
import { createLocation, createNPC } from './factories'
import type { GameState, LocationNode, NPC, Element } from '@/state/types'

export interface WorldTurnResult {
  narration: { text: string; tone: 'normal' | 'important' | 'major' | 'ominous' | 'system' }[]
  discoveredLocation?: LocationNode
  encounter?: { enemyIds: string[]; reason: string }
  spawnNpc?: NPC
  loot?: boolean
  advanceTime?: number
  weather?: string
  sceneKind?: 'rift' | 'concept' | 'story'
}

export interface NarrativeProvider {
  respond(input: string, state: GameState): WorldTurnResult
}

const AMBIENT = [
  'The ash keeps falling, soft as snow, indifferent as time.',
  'Somewhere far off, the sky makes a sound like tearing cloth.',
  'You feel watched, though nothing moves.',
  'The ground remembers footsteps that were not yours.',
  'A cold wind carries the smell of a sea that dried up an age ago.',
  'For a moment the light flickers, as if the world forgot to keep rendering it.',
]

export class LocalWorldEngine implements NarrativeProvider {
  respond(input: string, state: GameState): WorldTurnResult {
    const text = input.toLowerCase().trim()
    const loc = state.locations[state.currentLocation]
    const rng = new Rng(seedFrom(input + state.worldTime + state.currentLocation))
    const out: WorldTurnResult = { narration: [], advanceTime: 10 }

    const has = (...words: string[]) => words.some((w) => text.includes(w))

    // ---- movement / discovery ----
    if (has('tower', 'citadel', 'fortress', 'castle') && !state.locations['loc_black_sky']?.discovered) {
      out.narration.push({ text: 'You lift your eyes to the horizon. A black fortress hangs in the sky above the dead wood, tethered to nothing.', tone: 'major' })
      out.narration.push({ text: 'It should have fallen an age ago. It has not.', tone: 'ominous' })
      const l = { ...state.locations['loc_black_sky'], discovered: true }
      out.discoveredLocation = l
      return out
    }

    if (has('rift', 'tear', 'the sky') && loc?.type !== 'rift') {
      out.narration.push({ text: 'You turn toward the violet light bleeding from the First Tear. Even at this distance, your teeth ache.', tone: 'important' })
      out.sceneKind = undefined
      return out
    }

    if (has('walk', 'go', 'head', 'travel', 'explore', 'wander', 'venture')) {
      // chance to discover a new procedural location
      if (rng.chance(0.5)) {
        const l = createLocation({
          x: Math.max(5, Math.min(95, loc.x + rng.int(-20, 20))),
          y: Math.max(5, Math.min(95, loc.y + rng.int(-20, 20))),
          danger: Math.min(5, (loc.danger ?? 1) + rng.int(-1, 1)),
          seedKey: input + state.worldTime,
        })
        l.discovered = true
        l.connections = [state.currentLocation]
        out.discoveredLocation = l
        out.narration.push({ text: `You press on across the ${loc.biome}. The land opens, and something resolves out of the haze.`, tone: 'normal' })
        out.narration.push({ text: `You have discovered ${l.name}.`, tone: 'important' })
        if (rng.chance(0.4)) out.encounter = { enemyIds: [rng.pick(['husk', 'wraith'])], reason: 'Movement drew something out of the grey.' }
        return out
      }
      out.narration.push({ text: `You move through the ${loc.biome}. ${rng.pick(AMBIENT)}`, tone: 'normal' })
      if (rng.chance(0.35)) out.encounter = { enemyIds: [rng.pick(['husk', 'wraith'])], reason: 'Something was waiting on the path.' }
      return out
    }

    // ---- search ----
    if (has('search', 'look for', 'loot', 'examine', 'inspect the ground', 'dig')) {
      out.narration.push({ text: `You search the ${loc.biome}, turning over ash and old stone.`, tone: 'normal' })
      if (rng.chance(0.55)) {
        out.loot = true
        out.narration.push({ text: 'Your fingers close on something half-buried.', tone: 'important' })
      } else {
        out.narration.push({ text: rng.pick(['Nothing but dust and the bones of small dead things.', 'Whatever was here is long gone.']), tone: 'normal' })
      }
      return out
    }

    // ---- observe ----
    if (has('observe', 'watch', 'wait', 'listen', 'look around', 'study')) {
      out.narration.push({ text: `You go still and let the ${loc.biome} speak. ${rng.pick(AMBIENT)}`, tone: 'normal' })
      if (loc.secrets.length) out.narration.push({ text: `You notice something the hurried would miss: ${loc.secrets[0]}.`, tone: 'important' })
      return out
    }

    // ---- talk ----
    if (has('talk', 'speak', 'ask', 'call out', 'shout', 'greet')) {
      const npcHere = (loc.npcs ?? []).map((id) => state.npcs[id]).filter(Boolean)
      if (npcHere.length) {
        const n = npcHere[0]
        out.narration.push({ text: `${n.name} turns toward you. "${rng.pick(['Speak, then.', 'You again.', 'Careful what you ask for out here.'])}"`, tone: 'normal' })
      } else if (rng.chance(0.3)) {
        const n = createNPC({ seedKey: input + state.worldTime, location: state.currentLocation })
        n.location = state.currentLocation
        out.spawnNpc = n
        out.narration.push({ text: `A figure you hadn't noticed answers from the haze. They call themselves ${n.name}.`, tone: 'important' })
      } else {
        out.narration.push({ text: 'Only the wind answers, and it has nothing kind to say.', tone: 'normal' })
      }
      return out
    }

    // ---- rest ----
    if (has('rest', 'sleep', 'camp', 'wait until', 'recover')) {
      out.narration.push({ text: 'You make what shelter you can and let your body remember how to heal.', tone: 'normal' })
      out.advanceTime = 240
      return out
    }

    // ---- attack / provoke ----
    if (has('attack', 'fight', 'kill', 'draw', 'strike', 'challenge')) {
      out.encounter = { enemyIds: [rng.pick(['husk', 'wraith', 'drowned-knight'])], reason: 'You went looking for a fight. It found you first.' }
      out.narration.push({ text: 'You bare steel. The grey answers.', tone: 'important' })
      return out
    }

    // ---- default: atmospheric acknowledgement ----
    out.narration.push({ text: rng.pick(AMBIENT), tone: 'normal' })
    out.narration.push({ text: rng.pick(['The world waits for you to decide.', 'Nothing changes. Everything is about to.', 'You could go anywhere from here.']), tone: 'normal' })
    return out
  }
}

export const worldEngine = new LocalWorldEngine()

export function formatWorldTime(minutes: number): string {
  const totalHours = Math.floor(minutes / 60)
  const day = Math.floor(totalHours / 24) + 1
  const hour = totalHours % 24
  const min = minutes % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Day ${day} · ${pad(hour)}:${pad(min)}`
}

export const uidn = uid
export type { Element }
