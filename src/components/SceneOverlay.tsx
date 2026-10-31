import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/state/store'
import { Visual } from './Visual'
import { RarityChip } from './ui'
import { rarity as rInfo } from '@/engine/rarity'
import type { Scene } from '@/state/types'

type Cat = 'location' | 'item' | 'portrait' | 'skill' | 'rift'

function entityReq(scene: Scene) {
  const st = useGame.getState()
  if (!scene.entityId) return null
  const cat: Cat =
    scene.entityType === 'item' ? 'item' : scene.entityType === 'location' || scene.entityType === 'rift' ? (scene.entityType === 'rift' ? 'rift' : 'location') : scene.entityType === 'skill' ? 'skill' : 'portrait'
  if (scene.entityType === 'item') {
    const it = st.items[scene.entityId]
    if (it) return { category: 'item' as Cat, seed: it.seed, element: it.element, rarity: it.rarity, kind: it.kind, subtype: it.weaponType ?? it.armorType }
  }
  if (scene.entityType === 'location') {
    const l = st.locations[scene.entityId]
    if (l) return { category: 'location' as Cat, seed: l.seed, element: 'none' as const, biome: l.biome, danger: l.danger }
  }
  if (scene.entityType === 'rift') {
    const l = st.locations[scene.entityId]
    return { category: 'rift' as Cat, seed: l?.seed ?? scene.seed, element: 'void' as const, tier: 4 }
  }
  if (scene.entityType === 'npc') {
    const n = st.npcs[scene.entityId]
    if (n) return { category: 'portrait' as Cat, seed: n.seed, element: 'shadow' as const, boss: n.isBoss }
  }
  if (scene.entityType === 'skill') {
    const s = st.skills[scene.entityId]
    if (s) return { category: 'skill' as Cat, seed: s.seed, element: s.element, rarity: scene.rarity }
  }
  return { category: cat, seed: scene.seed, element: 'aether' as const }
}

const KIND_STYLES: Record<string, { accent: string; sub: string }> = {
  loot: { accent: 'var(--color-legendary, #ffb020)', sub: 'DISCOVERY' },
  divine: { accent: 'var(--color-r-divine)', sub: 'DIVINE ARTIFACT DISCOVERED' },
  concept: { accent: '#ffffff', sub: 'CONCEPTUAL AWAKENING' },
  ascension: { accent: 'var(--color-r-divine)', sub: 'ASCENSION' },
  rift: { accent: 'var(--color-void)', sub: 'RIFT DETECTED' },
  boss: { accent: 'var(--color-blood)', sub: 'A THREAT AWAKENS' },
  class: { accent: 'var(--color-aether)', sub: 'EVOLUTION' },
  title: { accent: 'var(--color-warn)', sub: 'TITLE ACQUIRED' },
  death: { accent: 'var(--color-blood)', sub: 'THE GREY TAKES YOU' },
  story: { accent: 'var(--color-aether)', sub: 'PROGRESSION' },
  companion: { accent: 'var(--color-vital)', sub: 'A BOND FORMS' },
  world: { accent: 'var(--color-ember)', sub: 'THE WORLD REACTS' },
  system: { accent: '#7b3dff', sub: 'SYSTEM OVERRIDE' },
}

export function SceneOverlay() {
  const scene = useGame((s) => s.scene)
  const sceneAction = useGame((s) => s.sceneAction)
  const dismiss = useGame((s) => s.dismissScene)
  const reduce = useGame((s) => s.settings.reduceMotion)
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (!scene) return
    setRevealed(0)
    const lines = scene.lines?.length ?? 0
    if (lines === 0) return
    const speed = reduce ? 120 : 520
    const timers: number[] = []
    for (let i = 0; i < lines; i++) {
      timers.push(window.setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), 700 + i * speed))
    }
    return () => timers.forEach(clearTimeout)
  }, [scene, reduce])

  if (!scene) return null
  const style = KIND_STYLES[scene.kind] ?? KIND_STYLES.story
  const ri = scene.rarity ? rInfo(scene.rarity) : null
  const accent = ri && ri.glow > 0.5 ? ri.color : style.accent
  const req = entityReq(scene)
  const isReality = scene.kind === 'concept' || scene.kind === 'system' || scene.rarity === 'conceptual' || scene.rarity === 'absolute'
  const grand = ['ascension', 'divine', 'concept', 'boss', 'rift', 'system'].includes(scene.kind) || (ri?.glow ?? 0) >= 0.7

  return (
    <AnimatePresence>
      <motion.div
        key={scene.id}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.05 : 0.5 }}
      >
        {/* backdrop */}
        <motion.div
          className="absolute inset-0"
          style={{ background: `radial-gradient(120% 100% at 50% 45%, ${accent}22, rgba(2,2,6,0.94) 60%, #010104)` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
        {isReality && (
          <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.04) 4px)' }} />
        )}
        <div className="absolute inset-0 scene-vignette pointer-events-none" />

        {/* content */}
        <motion.div
          className="relative z-10 w-full max-w-2xl mx-4 flex flex-col items-center text-center"
          initial={{ scale: reduce ? 1 : 0.94, y: reduce ? 0 : 18 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ duration: reduce ? 0.05 : 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.p
            className="label mb-3"
            style={{ color: accent, letterSpacing: '0.4em' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {style.sub}
          </motion.p>

          {/* entity artwork */}
          {req && (
            <motion.div
              className={`relative mb-6 ${grand ? 'w-72' : 'w-56'} ${req.category === 'location' || req.category === 'rift' ? 'aspect-video w-[36rem] max-w-full' : 'aspect-square'} ${!reduce ? 'anim-float' : ''}`}
              initial={{ opacity: 0, scale: 0.8, filter: 'blur(12px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ delay: 0.3, duration: reduce ? 0.05 : 0.9 }}
              style={{ boxShadow: `0 0 60px -10px ${accent}, 0 20px 60px -20px #000` }}
            >
              <Visual req={req} />
              <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: `inset 0 0 40px -8px ${accent}88`, border: `1px solid ${accent}66` }} />
            </motion.div>
          )}

          <motion.h1
            className="font-display text-4xl md:text-6xl font-black text-shadow-deep leading-tight"
            style={{ color: '#fff', textShadow: `0 0 30px ${accent}, 0 2px 20px #000` }}
            initial={{ opacity: 0, letterSpacing: reduce ? '0.05em' : '0.3em' }}
            animate={{ opacity: 1, letterSpacing: '0.02em' }}
            transition={{ delay: 0.4, duration: reduce ? 0.05 : 0.9 }}
          >
            {scene.title}
          </motion.h1>

          {scene.subtitle && (
            <motion.p
              className="mt-3 text-lg font-display"
              style={{ color: accent }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              {scene.subtitle}
              {scene.rarity && <RarityChip rarity={scene.rarity} className="ml-3 align-middle" />}
            </motion.p>
          )}

          {scene.body && (
            <motion.p
              className="mt-5 max-w-xl text-[var(--color-ink-dim)] leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              {scene.body}
            </motion.p>
          )}

          {scene.lines && scene.lines.length > 0 && (
            <div className="mt-5 space-y-1.5">
              {scene.lines.map((line, i) => (
                <motion.p
                  key={i}
                  className="font-mono text-sm"
                  style={{ color: accent }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={i < revealed ? { opacity: 1, x: 0 } : { opacity: 0 }}
                >
                  {line}
                </motion.p>
              ))}
            </div>
          )}

          <motion.div
            className="mt-9 flex flex-wrap gap-3 justify-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 + (scene.lines?.length ?? 0) * 0.15 }}
          >
            {(scene.choices ?? [{ label: 'Continue', action: 'dismiss' }]).map((c, i) => (
              <button
                key={i}
                className={i === 0 ? 'btn btn-primary min-w-36' : 'btn min-w-28'}
                style={i === 0 ? { background: `linear-gradient(180deg, ${accent}, ${accent}88)`, borderColor: accent } : undefined}
                onClick={() => (c.action === 'dismiss' ? dismiss() : sceneAction(c.action, c.payload))}
              >
                {c.label}
              </button>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
