import { Rng } from './rng'
import { rollRarity, rarity as rInfo } from './rarity'
import { createWeapon, createArmor, createConsumable, ELEMENTS, WEAPON_TYPES, ARMOR_SLOTS } from './factories'
import type { Item, Rarity, Element } from '@/state/types'

export interface LootContext {
  level: number
  depth: number // danger / rift tier
  luck: number
  seed: number
  count?: number
  guaranteedRarity?: Rarity | null
  multiplier?: number
  elementBias?: Element
}

export function rollLoot(ctx: LootContext): Item[] {
  const rng = new Rng(ctx.seed)
  const items: Item[] = []
  const baseCount = ctx.count ?? 1 + (rng.chance(0.4) ? 1 : 0)
  const count = Math.max(1, Math.round(baseCount * (ctx.multiplier ?? 1)))
  for (let i = 0; i < count; i++) {
    const r = rollRarity(() => rng.next(), ctx.luck, ctx.depth, ctx.guaranteedRarity ?? null)
    const element = ctx.elementBias && rng.chance(0.6) ? ctx.elementBias : rng.pick(ELEMENTS)
    const kindRoll = rng.next()
    const salt = `${ctx.seed}_${i}_${r}`
    if (kindRoll < 0.12 && rInfo(r).order < 4) {
      items.push(createConsumable(rng.pick(['Ash Draught', 'Rift Salve', 'Warden\'s Ration', 'Vial of Stillness']), r, 'Restores health and steadies the will.', salt))
    } else if (kindRoll < 0.55) {
      items.push(createWeapon({ rarity: r, element, level: ctx.level, weaponType: rng.pick(WEAPON_TYPES), seedKey: salt }))
    } else {
      items.push(createArmor({ rarity: r, element, level: ctx.level, slot: rng.pick(ARMOR_SLOTS), seedKey: salt }))
    }
  }
  return items
}

export function rollCurrency(ctx: LootContext): { gold: number; souls: number; riftShards: number } {
  const rng = new Rng(ctx.seed ^ 0x9e3779b9)
  const mult = ctx.multiplier ?? 1
  return {
    gold: Math.round(rng.int(5, 25) * (1 + ctx.level * 0.3) * mult),
    souls: Math.round(rng.int(1, 6) * (1 + ctx.depth * 0.5) * mult),
    riftShards: ctx.depth >= 3 ? Math.round(rng.int(1, 3) * mult) : 0,
  }
}
