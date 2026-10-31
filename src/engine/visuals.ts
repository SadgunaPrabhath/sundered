// ============================================================
// Procedural Visual Engine
// Generates deterministic SVG artwork from a stable seed.
// Same entity id → same seed → identical art forever (continuity).
// This is the default VisualProvider; a real image-gen API can be
// swapped behind requestImage() without touching game code.
// ============================================================
import { Rng } from './rng'
import type { Element, Rarity } from '@/state/types'
import { rarity as rarityInfo } from './rarity'

interface Palette {
  bg: [string, string]
  primary: string
  secondary: string
  accent: string
  glow: string
}

const ELEMENT_PALETTES: Record<Element, Palette> = {
  none: { bg: ['#12121f', '#05050a'], primary: '#8a8aa8', secondary: '#c8c8dc', accent: '#e8e8f5', glow: '#a0a0c0' },
  fire: { bg: ['#2a0e05', '#0a0402'], primary: '#ff6b2d', secondary: '#ffb347', accent: '#ffe08a', glow: '#ff7a3d' },
  frost: { bg: ['#06202e', '#03080f'], primary: '#4bc7e3', secondary: '#a7ecff', accent: '#e6faff', glow: '#7fe0ff' },
  storm: { bg: ['#0a1226', '#04040f'], primary: '#5c7cff', secondary: '#a7c0ff', accent: '#f0f4ff', glow: '#7c9cff' },
  earth: { bg: ['#1c1508', '#080602'], primary: '#a8863c', secondary: '#d4b96a', accent: '#f0e0a0', glow: '#c9a44c' },
  shadow: { bg: ['#12081c', '#050208'], primary: '#6b3d8a', secondary: '#a06bc0', accent: '#d0a0e8', glow: '#8a4bb0' },
  light: { bg: ['#2a2410', '#0a0803'], primary: '#ffd24b', secondary: '#fff0a7', accent: '#fffbe6', glow: '#ffe27a' },
  blood: { bg: ['#26060c', '#0a0203'], primary: '#e34b6b', secondary: '#ff8a9c', accent: '#ffd0d8', glow: '#ff5c7a' },
  void: { bg: ['#0a0616', '#020106'], primary: '#7b3dff', secondary: '#b08aff', accent: '#e0d0ff', glow: '#9b5bff' },
  aether: { bg: ['#160a26', '#06030c'], primary: '#a06bff', secondary: '#c39bff', accent: '#ece0ff', glow: '#b58aff' },
  time: { bg: ['#1c1a06', '#080702'], primary: '#c9b84b', secondary: '#e8dc8a', accent: '#fbf6d0', glow: '#d4c45c' },
  gravity: { bg: ['#0a0a12', '#020204'], primary: '#4b5c8a', secondary: '#8a9cc0', accent: '#d0d8f0', glow: '#5c6ca0' },
  entropy: { bg: ['#1c0a12', '#080306'], primary: '#c94b7b', secondary: '#e88ab0', accent: '#fbd0e0', glow: '#d45c8a' },
  concept: { bg: ['#101018', '#020204'], primary: '#ffffff', secondary: '#c0c0d8', accent: '#ffffff', glow: '#ffffff' },
}

function pal(element: Element): Palette {
  return ELEMENT_PALETTES[element] ?? ELEMENT_PALETTES.none
}

function grad(id: string, from: string, to: string, angle = 90): string {
  const rad = (angle * Math.PI) / 180
  const x2 = (0.5 + Math.cos(rad) / 2).toFixed(3)
  const y2 = (0.5 + Math.sin(rad) / 2).toFixed(3)
  return `<linearGradient id="${id}" x1="${(1 - +x2).toFixed(3)}" y1="${(1 - +y2).toFixed(
    3
  )}" x2="${x2}" y2="${y2}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`
}

function radial(id: string, from: string, to: string, cx = 50, cy = 50, r = 60): string {
  return `<radialGradient id="${id}" cx="${cx}%" cy="${cy}%" r="${r}%"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></radialGradient>`
}

function stars(rng: Rng, w: number, h: number, n: number, color: string): string {
  let s = ''
  for (let i = 0; i < n; i++) {
    const x = rng.float(0, w)
    const y = rng.float(0, h)
    const r = rng.float(0.4, 1.6)
    const o = rng.float(0.2, 0.9)
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${color}" opacity="${o.toFixed(2)}"/>`
  }
  return s
}

function rarityGlowFilter(id: string, color: string, strength: number): string {
  const dev = (2 + strength * 8).toFixed(1)
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${dev}" result="b"/><feFlood flood-color="${color}" flood-opacity="${(
    0.4 +
    strength * 0.5
  ).toFixed(2)}"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
}

// ---------------- LOCATION ----------------
export function locationArt(seed: number, biome: string, danger: number, element: Element = 'none'): string {
  const rng = new Rng(seed)
  const p = pal(element)
  const W = 640
  const H = 360
  const skyTop = p.bg[0]
  const skyBot = biome.includes('void') || biome.includes('astral') ? '#060312' : p.bg[1]
  const sunY = rng.float(60, 160)
  const sunX = rng.float(120, 520)
  const sunColor = danger >= 4 ? p.glow : p.secondary

  // mountain / structure silhouettes (layered)
  const layers: string[] = []
  const layerCount = 3
  for (let l = 0; l < layerCount; l++) {
    const baseY = 190 + l * 34
    const amp = 60 - l * 12
    let path = `M0 ${H} L0 ${baseY}`
    const steps = 8 + l * 3
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * W
      const y = baseY - rng.float(0, amp) * (0.6 + 0.4 * Math.sin(i * 1.7 + l))
      path += ` L${x.toFixed(0)} ${y.toFixed(0)}`
    }
    path += ` L${W} ${H} Z`
    const shade = l === 0 ? 0.9 : l === 1 ? 0.6 : 0.35
    const col = mix(p.bg[1], p.primary, (l / layerCount) * 0.5)
    layers.push(`<path d="${path}" fill="${col}" opacity="${shade}"/>`)
  }

  // a structure for towns/dungeons/ruins/citadels
  let structure = ''
  if (/(town|village|temple|ruin|citadel|castle|dungeon|fortress|landmark)/i.test(biome)) {
    const bx = rng.float(200, 440)
    const bw = rng.float(60, 120)
    const bh = rng.float(80, 180)
    const by = 240 - bh
    structure += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="${mix(
      p.bg[1],
      p.primary,
      0.4
    )}" stroke="${p.secondary}" stroke-opacity="0.3"/>`
    // spire
    structure += `<polygon points="${bx},${by} ${bx + bw / 2},${by - 40} ${bx + bw},${by}" fill="${p.primary}" opacity="0.7"/>`
    // windows glow
    for (let i = 0; i < 6; i++) {
      const wx = bx + rng.float(6, bw - 12)
      const wy = by + rng.float(10, bh - 16)
      structure += `<rect x="${wx.toFixed(0)}" y="${wy.toFixed(0)}" width="5" height="7" fill="${p.glow}" opacity="${rng
        .float(0.4, 1)
        .toFixed(2)}"/>`
    }
  }

  // floating shards for void/astral/rift biomes
  let floaters = ''
  if (/(void|astral|rift|sky|float|divine|celestial|dream)/i.test(biome)) {
    for (let i = 0; i < 6; i++) {
      const fx = rng.float(60, 580)
      const fy = rng.float(40, 200)
      const fs = rng.float(14, 46)
      floaters += `<polygon points="${fx},${fy - fs} ${fx + fs * 0.7},${fy} ${fx},${fy + fs} ${fx - fs * 0.7},${fy}" fill="${
        p.primary
      }" opacity="${rng.float(0.3, 0.75).toFixed(2)}"/>`
    }
  }

  const dangerHaze =
    danger >= 4
      ? `<rect width="${W}" height="${H}" fill="url(#dh)" opacity="0.35"/>`
      : ''

  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <defs>
      ${grad('sky', skyTop, skyBot, 90)}
      ${radial('sun', sunColor, 'transparent', 50, 50, 60)}
      ${radial('dh', p.glow, 'transparent', 50, 90, 80)}
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    ${stars(rng, W, 180, danger >= 3 ? 90 : 50, p.accent)}
    <circle cx="${sunX}" cy="${sunY}" r="70" fill="url(#sun)" opacity="0.8"/>
    <circle cx="${sunX}" cy="${sunY}" r="${rng.float(14, 30).toFixed(0)}" fill="${sunColor}" opacity="0.9"/>
    ${floaters}
    ${layers.join('')}
    ${structure}
    ${dangerHaze}
    <rect width="${W}" height="${H}" fill="url(#sky)" opacity="0.08"/>
  </svg>`
}

// ---------------- ITEM (weapon / armor / artifact) ----------------
export function itemArt(
  seed: number,
  kind: string,
  subtype: string,
  element: Element,
  rarity: Rarity
): string {
  const rng = new Rng(seed)
  const p = pal(element)
  const ri = rarityInfo(rarity)
  const S = 400
  const cx = S / 2
  const glow = ri.glow
  const rc = ri.color

  let shape = ''
  const st = subtype.toLowerCase()
  if (kind === 'weapon') {
    if (/great|hammer|axe|maul/.test(st)) shape = greatShape(rng, p, cx)
    else if (/bow|cross/.test(st)) shape = bowShape(rng, p, cx)
    else if (/staff|wand|grimoire|scepter/.test(st)) shape = staffShape(rng, p, cx)
    else if (/scythe|glaive|halberd|spear|lance|polearm/.test(st)) shape = polearmShape(rng, p, cx)
    else if (/dagger|claw|twin/.test(st)) shape = daggerShape(rng, p, cx)
    else shape = swordShape(rng, p, cx)
  } else if (kind === 'armor') {
    shape = armorShape(rng, p, cx, st)
  } else {
    shape = artifactShape(rng, p, cx)
  }

  // rarity aura rings
  let aura = ''
  const rings = Math.min(5, Math.round(ri.order / 3))
  for (let i = 0; i < rings; i++) {
    aura += `<circle cx="${cx}" cy="${cx}" r="${120 + i * 24}" fill="none" stroke="${rc}" stroke-opacity="${(
      0.18 -
      i * 0.03
    ).toFixed(2)}" stroke-width="1"/>`
  }
  // conceptual / absolute get a fractured overlay
  let fracture = ''
  if (ri.tier === 'reality') {
    for (let i = 0; i < 7; i++) {
      const a = rng.float(0, Math.PI * 2)
      fracture += `<line x1="${cx}" y1="${cx}" x2="${(cx + Math.cos(a) * 200).toFixed(0)}" y2="${(
        cx +
        Math.sin(a) * 200
      ).toFixed(0)}" stroke="${rc}" stroke-opacity="0.14" stroke-width="1"/>`
    }
  }

  return `<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      ${radial('ibg', mix(p.bg[0], rc, glow * 0.25), p.bg[1], 50, 45, 70)}
      ${grad('blade', p.accent, p.primary, 60)}
      ${grad('metal', p.secondary, p.bg[1], 120)}
      ${rarityGlowFilter('rg', rc, glow)}
    </defs>
    <rect width="${S}" height="${S}" fill="url(#ibg)"/>
    ${stars(rng, S, S, Math.round(20 + glow * 60), rc)}
    ${aura}
    ${fracture}
    <g filter="url(#rg)">${shape}</g>
  </svg>`
}

function swordShape(rng: Rng, p: Palette, cx: number): string {
  const tip = 60
  const guard = 268
  const w = rng.float(12, 20)
  const blade = `<polygon points="${cx},${tip} ${cx + w},${guard - 30} ${cx + w},${guard} ${cx - w},${guard} ${cx - w},${
    guard - 30
  }" fill="url(#blade)"/>`
  const fuller = `<line x1="${cx}" y1="${tip + 20}" x2="${cx}" y2="${guard - 20}" stroke="${p.bg[1]}" stroke-opacity="0.5" stroke-width="2"/>`
  const cross = `<rect x="${cx - 46}" y="${guard}" width="92" height="14" rx="4" fill="url(#metal)"/>`
  const grip = `<rect x="${cx - 8}" y="${guard + 14}" width="16" height="66" rx="6" fill="${mix(p.bg[1], p.secondary, 0.3)}"/>`
  const pommel = `<circle cx="${cx}" cy="${guard + 90}" r="13" fill="${p.secondary}"/><circle cx="${cx}" cy="${
    guard + 90
  }" r="5" fill="${p.glow}"/>`
  return blade + fuller + cross + grip + pommel
}

function greatShape(rng: Rng, p: Palette, cx: number): string {
  const w = rng.float(30, 46)
  const blade = `<polygon points="${cx},50 ${cx + w},110 ${cx + w},280 ${cx - w},280 ${cx - w},110" fill="url(#blade)"/>`
  const rune = `<circle cx="${cx}" cy="180" r="14" fill="none" stroke="${p.glow}" stroke-width="3"/>`
  const cross = `<rect x="${cx - 60}" y="280" width="120" height="18" rx="4" fill="url(#metal)"/>`
  const grip = `<rect x="${cx - 10}" y="298" width="20" height="70" rx="6" fill="${mix(p.bg[1], p.secondary, 0.3)}"/>`
  return blade + rune + cross + grip
}

function daggerShape(_rng: Rng, p: Palette, cx: number): string {
  const mk = (ox: number) => {
    const c = cx + ox
    return `<polygon points="${c},120 ${c + 10},170 ${c + 10},250 ${c - 10},250 ${c - 10},170" fill="url(#blade)"/><rect x="${
      c - 22
    }" y="250" width="44" height="10" fill="url(#metal)"/><rect x="${c - 6}" y="260" width="12" height="40" fill="${mix(
      p.bg[1],
      p.secondary,
      0.3
    )}"/>`
  }
  return mk(-42) + mk(42)
}

function polearmShape(_rng: Rng, p: Palette, cx: number): string {
  const head = `<polygon points="${cx},40 ${cx + 30},120 ${cx + 8},130 ${cx + 8},360 ${cx - 8},360 ${cx - 8},130 ${
    cx - 30
  },120" fill="url(#blade)"/>`
  const ring = `<circle cx="${cx + 24}" cy="120" r="16" fill="none" stroke="${p.glow}" stroke-width="4"/>`
  return head + ring
}

function bowShape(_rng: Rng, p: Palette, cx: number): string {
  const arc = `<path d="M${cx + 40} 70 Q${cx + 130} 200 ${cx + 40} 330" fill="none" stroke="url(#metal)" stroke-width="12" stroke-linecap="round"/>`
  const string = `<line x1="${cx + 40}" y1="70" x2="${cx + 40}" y2="330" stroke="${p.accent}" stroke-width="2"/>`
  const arrow = `<line x1="${cx - 90}" y1="200" x2="${cx + 40}" y2="200" stroke="${p.primary}" stroke-width="4"/><polygon points="${
    cx + 40
  },200 ${cx + 20},190 ${cx + 20},210" fill="${p.glow}"/>`
  return arc + string + arrow
}

function staffShape(_rng: Rng, p: Palette, cx: number): string {
  const shaft = `<rect x="${cx - 6}" y="120" width="12" height="250" rx="6" fill="url(#metal)"/>`
  const orb = `<circle cx="${cx}" cy="100" r="38" fill="url(#blade)" opacity="0.9"/><circle cx="${cx}" cy="100" r="18" fill="${p.glow}"/>`
  const claws = `<path d="M${cx - 34} 120 Q${cx} 60 ${cx + 34} 120" fill="none" stroke="${p.secondary}" stroke-width="6"/>`
  return orb + claws + shaft
}

function armorShape(_rng: Rng, p: Palette, cx: number, st: string): string {
  if (/helm/.test(st)) {
    return `<path d="M${cx - 70} 160 Q${cx} 60 ${cx + 70} 160 L${cx + 60} 300 Q${cx} 330 ${cx - 60} 300 Z" fill="url(#metal)" stroke="${
      p.primary
    }" stroke-width="3"/><rect x="${cx - 40}" y="180" width="26" height="60" rx="6" fill="${p.bg[1]}"/><rect x="${
      cx + 14
    }" y="180" width="26" height="60" rx="6" fill="${p.bg[1]}"/><circle cx="${cx}" cy="120" r="10" fill="${p.glow}"/>`
  }
  // chest / generic
  const body = `<path d="M${cx - 90} 110 L${cx - 50} 90 L${cx + 50} 90 L${cx + 90} 110 L${cx + 70} 300 L${cx} 340 L${
    cx - 70
  } 300 Z" fill="url(#metal)" stroke="${p.primary}" stroke-width="3"/>`
  const collar = `<path d="M${cx - 40} 92 Q${cx} 140 ${cx + 40} 92" fill="none" stroke="${p.secondary}" stroke-width="4"/>`
  const core = `<circle cx="${cx}" cy="190" r="26" fill="${mix(p.bg[1], p.glow, 0.5)}"/><circle cx="${cx}" cy="190" r="12" fill="${
    p.glow
  }"/>`
  let plates = ''
  for (let i = 0; i < 3; i++)
    plates += `<line x1="${cx - 60}" y1="${230 + i * 24}" x2="${cx + 60}" y2="${230 + i * 24}" stroke="${
      p.bg[1]
    }" stroke-opacity="0.6" stroke-width="3"/>`
  return body + collar + plates + core
}

function artifactShape(rng: Rng, p: Palette, cx: number): string {
  const sides = rng.int(5, 8)
  let poly = ''
  const r = 90
  const pts: string[] = []
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2
    pts.push(`${(cx + Math.cos(a) * r).toFixed(0)},${(cx + Math.sin(a) * r).toFixed(0)}`)
  }
  poly = `<polygon points="${pts.join(' ')}" fill="url(#blade)" stroke="${p.secondary}" stroke-width="2" opacity="0.9"/>`
  const core = `<circle cx="${cx}" cy="${cx}" r="30" fill="${p.glow}"/><circle cx="${cx}" cy="${cx}" r="14" fill="${p.accent}"/>`
  let orbit = ''
  for (let i = 0; i < 3; i++)
    orbit += `<ellipse cx="${cx}" cy="${cx}" rx="${110 + i * 10}" ry="${40 + i * 20}" fill="none" stroke="${
      p.primary
    }" stroke-opacity="0.3" transform="rotate(${rng.int(0, 180)} ${cx} ${cx})"/>`
  return orbit + poly + core
}

// ---------------- PORTRAIT (npc / boss / companion) ----------------
export function portraitArt(seed: number, element: Element, boss = false): string {
  const rng = new Rng(seed)
  const p = pal(element)
  const S = 400
  const cx = S / 2
  const skin = mix(p.bg[0], p.secondary, 0.3)
  const cloak = mix(p.bg[1], p.primary, boss ? 0.5 : 0.3)
  const eyeColor = boss ? p.glow : p.accent

  const hood = `<path d="M${cx - 110} 400 L${cx - 90} 210 Q${cx} 90 ${cx + 90} 210 L${cx + 110} 400 Z" fill="${cloak}" stroke="${
    p.primary
  }" stroke-opacity="0.4" stroke-width="2"/>`
  const face = `<ellipse cx="${cx}" cy="220" rx="52" ry="64" fill="${skin}"/>`
  const shadow = `<path d="M${cx - 70} 150 Q${cx} 80 ${cx + 70} 150 Q${cx + 40} 200 ${cx} 200 Q${cx - 40} 200 ${
    cx - 70
  } 150" fill="${p.bg[1]}" opacity="0.7"/>`
  const eyes = `<ellipse cx="${cx - 20}" cy="215" rx="7" ry="4" fill="${eyeColor}"/><ellipse cx="${cx + 20}" cy="215" rx="7" ry="4" fill="${eyeColor}"/>`
  const glowEyes = boss
    ? `<circle cx="${cx - 20}" cy="215" r="12" fill="${p.glow}" opacity="0.4"/><circle cx="${cx + 20}" cy="215" r="12" fill="${
        p.glow
      }" opacity="0.4"/>`
    : ''
  // boss: horns / crown
  let crown = ''
  if (boss) {
    crown = `<polygon points="${cx - 60},150 ${cx - 80},70 ${cx - 40},130" fill="${p.primary}"/><polygon points="${
      cx + 60
    },150 ${cx + 80},70 ${cx + 40},130" fill="${p.primary}"/>`
  }
  return `<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
    <defs>${radial('pbg', mix(p.bg[0], p.primary, 0.2), p.bg[1], 50, 40, 70)}</defs>
    <rect width="${S}" height="${S}" fill="url(#pbg)"/>
    ${stars(rng, S, S, boss ? 60 : 30, p.glow)}
    ${crown}
    ${hood}
    ${face}
    ${shadow}
    ${glowEyes}
    ${eyes}
  </svg>`
}

// ---------------- SKILL / ABILITY glyph ----------------
export function skillArt(seed: number, element: Element, conceptual = false): string {
  const rng = new Rng(seed)
  const p = pal(element)
  const S = 200
  const cx = S / 2
  let runes = ''
  const n = rng.int(3, 6)
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const r = 60
    const x = cx + Math.cos(a) * r
    const y = cx + Math.sin(a) * r
    runes += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="6" fill="${p.glow}" opacity="0.8"/><line x1="${cx}" y1="${cx}" x2="${x.toFixed(
      0
    )}" y2="${y.toFixed(0)}" stroke="${p.primary}" stroke-opacity="0.4"/>`
  }
  const core = conceptual
    ? `<circle cx="${cx}" cy="${cx}" r="26" fill="none" stroke="#fff" stroke-width="2"/><circle cx="${cx}" cy="${cx}" r="10" fill="#fff"/>`
    : `<circle cx="${cx}" cy="${cx}" r="24" fill="${p.glow}"/><circle cx="${cx}" cy="${cx}" r="10" fill="${p.accent}"/>`
  return `<svg viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg"><defs>${radial(
    'sbg',
    mix(p.bg[0], p.primary, 0.3),
    p.bg[1],
    50,
    50,
    70
  )}</defs><rect width="${S}" height="${S}" fill="url(#sbg)"/>${runes}${core}</svg>`
}

// ---------------- RIFT ----------------
export function riftArt(seed: number, tier: number, element: Element = 'void'): string {
  const rng = new Rng(seed)
  const p = pal(element)
  const W = 640
  const H = 360
  const cx = W / 2
  const cy = H / 2
  let tears = ''
  const rings = 4 + Math.min(6, tier)
  for (let i = 0; i < rings; i++) {
    const rx = 30 + i * (18 + tier * 2)
    const ry = 90 + i * (40 + tier * 3)
    tears += `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${p.glow}" stroke-opacity="${(
      0.5 -
      i * 0.05
    ).toFixed(2)}" stroke-width="${(3 - i * 0.3).toFixed(1)}" transform="rotate(${rng.int(-20, 20)} ${cx} ${cy})"/>`
  }
  const core = `<ellipse cx="${cx}" cy="${cy}" rx="18" ry="80" fill="${p.accent}" opacity="0.9"/><ellipse cx="${cx}" cy="${cy}" rx="8" ry="60" fill="#fff"/>`
  let bolts = ''
  for (let i = 0; i < 5 + tier; i++) {
    const a = rng.float(0, Math.PI * 2)
    const len = rng.float(60, 180)
    bolts += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * len).toFixed(0)}" y2="${(
      cy +
      Math.sin(a) * len
    ).toFixed(0)}" stroke="${p.glow}" stroke-opacity="0.3" stroke-width="1"/>`
  }
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"><defs>${radial(
    'rbg',
    p.bg[0],
    '#020106',
    50,
    50,
    75
  )}</defs><rect width="${W}" height="${H}" fill="url(#rbg)"/>${stars(rng, W, H, 120, p.glow)}${bolts}${tears}${core}</svg>`
}

// color mixing helper
function mix(a: string, b: string, t: number): string {
  const pa = hex(a)
  const pb = hex(b)
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t)
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t)
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t)
  return `#${[r, g, bl].map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`
}
function hex(h: string): [number, number, number] {
  const c = h.replace('#', '').trim()
  const s = c.length === 3 ? c.split('').map((x) => x + x).join('') : c
  return [parseInt(s.slice(0, 2), 16) || 0, parseInt(s.slice(2, 4), 16) || 0, parseInt(s.slice(4, 6), 16) || 0]
}

// ---------------- Adapter: request an image for any entity ----------------
export interface VisualRequest {
  seed: number
  category: 'location' | 'item' | 'portrait' | 'skill' | 'rift'
  element: Element
  rarity?: Rarity
  kind?: string
  subtype?: string
  biome?: string
  danger?: number
  tier?: number
  boss?: boolean
}

// Returns an inline SVG string. A real image API would return a URL here.
export function renderVisual(req: VisualRequest): string {
  switch (req.category) {
    case 'location':
      return locationArt(req.seed, req.biome ?? 'wild', req.danger ?? 1, req.element)
    case 'item':
      return itemArt(req.seed, req.kind ?? 'weapon', req.subtype ?? 'sword', req.element, req.rarity ?? 'common')
    case 'portrait':
      return portraitArt(req.seed, req.element, req.boss)
    case 'skill':
      return skillArt(req.seed, req.element, req.rarity === 'conceptual')
    case 'rift':
      return riftArt(req.seed, req.tier ?? 1, req.element)
  }
}

// Build a text image-prompt (used for asset records / future real API).
export function buildImagePrompt(req: VisualRequest, name: string, lore?: string): string {
  const parts = [
    `dark fantasy ${req.category}`,
    name,
    req.kind,
    req.subtype,
    req.rarity && `${req.rarity} rarity`,
    req.element !== 'none' && `${req.element} element`,
    req.biome,
    req.boss && 'imposing boss',
    'cinematic, volumetric light, painterly, high detail',
    lore,
  ].filter(Boolean)
  return parts.join(', ')
}
