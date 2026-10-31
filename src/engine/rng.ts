// Deterministic seeded RNG (mulberry32) — same seed → same result forever.
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export class Rng {
  private r: () => number
  constructor(seed: number | string) {
    this.r = mulberry32(typeof seed === 'string' ? hashString(seed) : seed)
  }
  next() {
    return this.r()
  }
  int(min: number, max: number) {
    return Math.floor(this.r() * (max - min + 1)) + min
  }
  float(min: number, max: number) {
    return this.r() * (max - min) + min
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.r() * arr.length)]
  }
  picks<T>(arr: readonly T[], n: number): T[] {
    const pool = [...arr]
    const out: T[] = []
    while (out.length < n && pool.length) {
      out.push(pool.splice(Math.floor(this.r() * pool.length), 1)[0])
    }
    return out
  }
  chance(p: number) {
    return this.r() < p
  }
  shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.r() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
}

let counter = 0
export function uid(prefix = 'e'): string {
  counter = (counter + 1) % 1_000_000
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
}

// Stable slug-based id, e.g. weapon_void_fang_8f31
export function stableId(prefix: string, name: string, salt = ''): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
  const h = hashString(name + salt).toString(16).slice(0, 4)
  return `${prefix}_${slug}_${h}`
}

export function seedFrom(str: string): number {
  return hashString(str)
}
