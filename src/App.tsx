import { useEffect, useState } from 'react'
import { useGame } from '@/state/store'
import { SceneOverlay } from '@/components/SceneOverlay'
import { SystemOverride } from '@/components/SystemOverride'
import TitleScreen from '@/screens/TitleScreen'
import CharacterCreate from '@/screens/CharacterCreate'
import IntroSequence from '@/screens/IntroSequence'
import GameShell from '@/screens/GameShell'

// Hidden discovery: typing the seam-word or the key combo opens the first crack
// in the world. Ctrl+Shift+\  (or type "override") reveals DEBUG access once.
const SEAM_WORD = 'override'

export default function App() {
  const mode = useGame((s) => s.mode)
  const started = useGame((s) => s.started)
  const cheatUnlocked = useGame((s) => s.cheat.unlocked)
  const reduceMotion = useGame((s) => s.settings.reduceMotion)
  const highContrast = useGame((s) => s.settings.highContrast)
  const [systemOpen, setSystemOpen] = useState(false)

  // discovery listener
  useEffect(() => {
    let buffer = ''
    const onKey = (e: KeyboardEvent) => {
      const s = useGame.getState()
      // combo: Ctrl+Shift+Backslash
      if (e.ctrlKey && e.shiftKey && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault()
        if (!s.cheat.unlocked) s.cheatUnlock('debug')
        else setSystemOpen((o) => !o)
        return
      }
      // seam-word buffer (ignore while typing in inputs)
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (/^[a-z]$/i.test(e.key)) {
        buffer = (buffer + e.key.toLowerCase()).slice(-SEAM_WORD.length)
        if (buffer === SEAM_WORD && !s.cheat.unlocked && s.started) s.cheatUnlock('debug')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // load save on first mount
  useEffect(() => {
    useGame.getState().hydrate()
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
    document.documentElement.classList.toggle('high-contrast', highContrast)
  }, [reduceMotion, highContrast])

  return (
    <div className="h-full w-full overflow-hidden">
      {mode === 'title' && <TitleScreen />}
      {mode === 'create' && <CharacterCreate />}
      {mode === 'intro' && <IntroSequence />}
      {started && !['title', 'create', 'intro'].includes(mode) && <GameShell onOpenSystem={() => setSystemOpen(true)} />}

      <SceneOverlay />
      {systemOpen && cheatUnlocked && <SystemOverride onClose={() => setSystemOpen(false)} />}
    </div>
  )
}
