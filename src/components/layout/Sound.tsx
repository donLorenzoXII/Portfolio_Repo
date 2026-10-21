import { useEffect, useState } from 'react'
import { sound } from '../../lib/sound'
import { useIntro } from '../../hooks/useIntro'

/** Plays a soft click for every link / button press, and unlocks audio on the first interaction. */
export function SoundEffects() {
  useEffect(() => {
    const unlock = () => sound.unlock()
    const onClick = (e: MouseEvent) => {
      const t = e.target as Element | null
      if (t?.closest('[data-no-sound]')) return
      if (t?.closest('a, button, [role="button"], summary, label')) sound.click()
    }
    window.addEventListener('pointerdown', unlock, { passive: true })
    window.addEventListener('keydown', unlock)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      document.removeEventListener('click', onClick, true)
    }
  }, [])
  return null
}

/** Small "Sound on / off" toggle with animated equaliser bars, bottom-left. */
export function SoundToggle() {
  const [muted, setMuted] = useState(sound.muted)
  const { revealed } = useIntro()
  useEffect(() => sound.subscribe(setMuted), [])

  return (
    <button
      type="button"
      data-no-sound
      onClick={() => {
        sound.unlock()
        sound.setMuted(!muted)
        if (muted) window.setTimeout(() => sound.click(), 30) // confirm it's back on
      }}
      aria-pressed={!muted}
      aria-label={muted ? 'Turn sound on' : 'Turn sound off'}
      className="label fixed bottom-5 left-[var(--gutter)] z-[60] flex items-center gap-3 text-cream mix-blend-difference transition-opacity duration-700 md:bottom-7"
      style={{ opacity: revealed ? 1 : 0, pointerEvents: revealed ? 'auto' : 'none' }}
    >
      <span className="flex h-3 items-end gap-[2px]" aria-hidden="true">
        {[0.55, 1, 0.75, 0.4].map((h, i) => (
          <span
            key={i}
            className="block w-[2px] origin-bottom bg-current"
            style={{
              height: '100%',
              transform: `scaleY(${muted ? 0.18 : h})`,
              transition: 'transform .4s',
              animation: muted ? 'none' : `eq 1.${i + 1}s ease-in-out ${i * 0.12}s infinite alternate`,
            }}
          />
        ))}
      </span>
      <span className="hidden sm:inline">Sound {muted ? 'off' : 'on'}</span>
    </button>
  )
}
