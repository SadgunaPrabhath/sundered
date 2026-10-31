import { motion } from 'framer-motion'
import { useGame } from '@/state/store'
import { hasSave, clearSave } from '@/state/save'
import { Visual } from '@/components/Visual'

export default function TitleScreen() {
  const setMode = useGame((s) => s.setMode)
  const hydrate = useGame((s) => s.hydrate)
  const saveExists = hasSave()

  const beginNew = () => setMode('create')
  const cont = () => hydrate()
  const wipe = () => {
    clearSave()
    setMode('title')
    // force a light refresh of derived UI
    setMode('title')
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[var(--color-void)] text-[var(--color-ink)]">
      {/* Ambient rift backdrop */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ duration: 3 }}
        style={{ filter: 'saturate(1.1)' }}
      >
        <Visual req={{ category: 'rift', seed: 99, element: 'void', tier: 6 }} rounded={false} className="h-full w-full" />
      </motion.div>
      <div className="absolute inset-0 scene-vignette" />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0.15, 0.3, 0.15] }}
        transition={{ duration: 8, repeat: Infinity }}
        style={{ background: 'radial-gradient(60% 50% at 50% 40%, color-mix(in srgb, var(--color-aether) 22%, transparent), transparent)' }}
      />

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1.2 }}
          className="label mb-6 tracking-[0.4em] text-[var(--color-ink-dim)]"
        >
          A Riftborn Progression RPG
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, scale: 0.94, letterSpacing: '0.5em' }}
          animate={{ opacity: 1, scale: 1, letterSpacing: '0.12em' }}
          transition={{ delay: 0.6, duration: 1.6, ease: 'easeOut' }}
          className="font-display text-6xl font-black leading-none text-shadow-deep sm:text-7xl md:text-8xl"
          style={{ color: '#fff', textShadow: '0 0 40px color-mix(in srgb, var(--color-aether) 60%, transparent)' }}
        >
          THE&nbsp;SUNDERED
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1.6 }}
          className="mt-7 max-w-xl font-display text-sm tracking-[0.28em] text-[var(--color-ink-dim)] sm:text-base"
        >
          “THE WORLD WAS NEVER MEANT TO BE WHOLE.”
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.1, duration: 1 }}
          className="mt-12 flex flex-col items-center gap-3"
        >
          <button className="btn btn-primary w-64 py-3.5 text-sm" onClick={beginNew}>
            Begin Ascension
          </button>
          {saveExists && (
            <button className="btn w-64 py-3" onClick={cont}>
              Continue
            </button>
          )}
          {saveExists && (
            <button
              className="mt-1 text-[0.62rem] font-mono uppercase tracking-[0.22em] text-[var(--color-ink-faint)] transition hover:text-[var(--color-blood)]"
              onClick={wipe}
            >
              Erase this timeline · New Game
            </button>
          )}
        </motion.div>
      </div>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 2 }}
        className="absolute bottom-4 left-0 right-0 z-10 text-center"
      >
        <p className="label text-[0.55rem] text-[var(--color-ink-faint)]">
          Runs fully offline · zero API keys · every location, weapon &amp; being rendered by a procedural visual engine
        </p>
      </motion.footer>
    </div>
  )
}
