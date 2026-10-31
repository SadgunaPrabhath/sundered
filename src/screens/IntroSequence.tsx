import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGame } from '@/state/store'
import { Visual } from '@/components/Visual'

interface Beat {
  lines: string[]
  element: 'void' | 'shadow' | 'fire' | 'aether'
  seed: number
}

const BEATS: Beat[] = [
  { lines: ['Once, the world of Vael was whole.'], element: 'aether', seed: 11 },
  { lines: ['Then the sky split.', 'Reality tore into a thousand bleeding rifts.'], element: 'void', seed: 42 },
  { lines: ['Most who fell through never returned.', 'You did.', 'You came back… changed.'], element: 'shadow', seed: 77 },
  { lines: ['They call your kind the Riftborn.', 'Marked. Feared. Necessary.'], element: 'fire', seed: 123 },
  { lines: ['You wake in the ash of the First Reach,', 'at the last lit hearth in a broken world.'], element: 'void', seed: 200 },
]

export default function IntroSequence() {
  const reduceMotion = useGame((s) => s.settings.reduceMotion)
  const travelTo = useGame((s) => s.travelTo)
  const setMode = useGame((s) => s.setMode)
  const narrate = useGame((s) => s.narrate)

  const [i, setI] = useState(0)
  const isLast = i >= BEATS.length - 1
  const beat = BEATS[i]

  const advance = () => {
    if (isLast) return
    setI((n) => Math.min(BEATS.length - 1, n + 1))
  }

  const enter = () => {
    travelTo('loc_ashen_hearth')
    setMode('explore')
    narrate('The hearth-fire gutters. Somewhere beyond the walls, the rift keeps bleeding. Your story begins.', 'important')
  }

  useEffect(() => {
    if (isLast) return
    const t = setTimeout(advance, reduceMotion ? 2200 : 5200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, isLast, reduceMotion])

  const dur = reduceMotion ? 0.2 : 1.4

  return (
    <div
      className="relative h-full w-full cursor-pointer overflow-hidden bg-[var(--color-void)] text-[var(--color-ink)]"
      onClick={advance}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35 }}
          exit={{ opacity: 0 }}
          transition={{ duration: dur }}
          className="absolute inset-0"
        >
          <Visual req={{ category: 'rift', seed: beat.seed, element: beat.element, tier: 5 }} rounded={false} className="h-full w-full" />
        </motion.div>
      </AnimatePresence>
      <div className="absolute inset-0 scene-vignette" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -14 }}
            transition={{ duration: dur, ease: 'easeOut' }}
            className="max-w-2xl"
          >
            {beat.lines.map((line, idx) => (
              <motion.p
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reduceMotion ? 0 : 0.5 + idx * 0.8, duration: dur }}
                className="font-display text-2xl leading-relaxed tracking-wide text-white text-shadow-deep sm:text-3xl"
              >
                {line}
              </motion.p>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-16 left-0 right-0 flex flex-col items-center gap-4">
          {isLast ? (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduceMotion ? 0 : 1.6, duration: 1 }}
              className="btn btn-primary px-8 py-3.5"
              onClick={(e) => {
                e.stopPropagation()
                enter()
              }}
            >
              Enter the First Reach
            </motion.button>
          ) : (
            <span className="label animate-pulse text-[var(--color-ink-faint)]">click to continue</span>
          )}

          <div className="flex gap-1.5">
            {BEATS.map((_, idx) => (
              <span
                key={idx}
                className="h-1 rounded-full transition-all duration-500"
                style={{
                  width: idx === i ? 22 : 8,
                  background: idx <= i ? 'var(--color-aether)' : 'var(--color-line)',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
