import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { useIntro } from '../../hooks/useIntro'
import { useLenis } from '../../hooks/useLenis'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { site } from '../../content/site'
import { sound } from '../../lib/sound'
import { InkReveal } from './intro/inkReveal'

/**
 * Entry screen: only the lettering. Moving the mouse splashes ink that uncovers it in
 * changing 3D materials. Clicking floods the screen with ink, which then opens like
 * an aperture straight onto the landing page.
 */
export function Loader() {
  const { showLoader, reveal } = useIntro()
  const [gone, setGone] = useState(!showLoader)
  const [entering, setEntering] = useState(false)
  const [webgl] = useState(() => InkReveal.supported())
  const reduced = useReducedMotion()
  const lenis = useLenis()
  const root = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const engine = useRef<InkReveal | null>(null)
  const useInk = webgl && !reduced

  // lock scrolling while the entry screen is up
  useEffect(() => {
    if (gone) return
    lenis?.stop()
    document.documentElement.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    return () => {
      lenis?.start()
      document.documentElement.style.overflow = ''
    }
  }, [gone, lenis])

  // the ink / 3D-material effect
  useEffect(() => {
    if (gone || !useInk || !canvas.current) return
    let cancelled = false
    let eng: InkReveal | null = null
    document.fonts.load('400 100px Anton').finally(() => {
      if (cancelled || !canvas.current) return
      try {
        eng = new InkReveal({
          canvas: canvas.current,
          lines: site.introEnter,
          font: 'Anton',
          colors: { bg: [243 / 255, 237 / 255, 228 / 255], ink: [26 / 255, 26 / 255, 26 / 255] },
        })
        engine.current = eng
      } catch {
        /* falls back to the plain lettering below */
      }
    })
    return () => {
      cancelled = true
      eng?.destroy()
      engine.current = null
    }
  }, [gone, useInk])

  const enter = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (entering) return
    setEntering(true)
    sound.unlock()
    const keyboard = e.detail === 0
    const x = keyboard ? window.innerWidth / 2 : e.clientX
    const y = keyboard ? window.innerHeight / 2 : e.clientY
    window.setTimeout(() => sound.whoosh(1.1), 30)

    const eng = engine.current
    if (eng) {
      // ink floods out from the click and swallows the lettering
      await eng.floodFrom(x, y, 0.7)
      await eng.fadeToInk(0.25)
    }
    // then the ink opens like an aperture onto the landing page
    reveal()
    window.setTimeout(() => sound.bloom(), 30)
    const el = root.current
    if (!el) return setGone(true)
    if (reduced) {
      gsap.to(el, { opacity: 0, duration: 0.4, ease: 'none', onComplete: () => setGone(true) })
      return
    }
    gsap.set(el, { '--hole': '0vmax', '--hx': `${x}px`, '--hy': `${y}px` })
    gsap
      .timeline({ onComplete: () => setGone(true) })
      .to(el, { '--hole': '150vmax', duration: 1.1, ease: 'expo.inOut' }, 0)
      .fromTo('[data-iris]', { scale: 0, opacity: 1 }, { scale: 1, duration: 1.1, ease: 'expo.inOut' }, 0)
      .to('[data-iris]', { opacity: 0, duration: 0.35, ease: 'none' }, 0.75)
  }

  if (gone) return null

  const label = site.introEnter.narrow.join(' ')
  // the hole opens where you clicked
  const mask = 'radial-gradient(circle at var(--hx, 50%) var(--hy, 50%), transparent var(--hole, 0px), #000 calc(var(--hole, 0px) + 1px))'

  return (
    <div
      ref={root}
      className="fixed inset-0 z-[90]"
      role="dialog"
      aria-modal="true"
      aria-label={`${site.name} — Portfolio`}
    >
      <div className="absolute inset-0 bg-ink" style={{ WebkitMaskImage: mask, maskImage: mask }}>
        <button
          type="button"
          data-no-sound
          data-cursor="ENTER"
          autoFocus
          onClick={enter}
          aria-label={`${label} — enter the portfolio`}
          className="absolute inset-0 block h-full w-full outline-none"
        >
          {useInk ? (
            <canvas ref={canvas} aria-hidden="true" className="absolute inset-0 h-full w-full bg-cream" />
          ) : (
            <span
              aria-hidden="true"
              className={`flex h-full w-full flex-col items-center justify-center bg-cream font-display text-[13vw] uppercase leading-[0.94] text-ink transition-colors duration-500 sm:text-[9vw] ${entering ? 'bg-ink text-ink' : ''}`}
            >
              {site.introEnter.narrow.map((l) => (
                <span key={l}>{l}</span>
              ))}
            </span>
          )}
        </button>
      </div>

      {/* thin terracotta ring riding the edge of the opening aperture (sized to its final radius, scaled from 0) */}
      <span
        data-iris
        aria-hidden="true"
        className="pointer-events-none absolute h-[300vmax] w-[300vmax] scale-0 rounded-full border border-terra/70"
        style={{ left: 'calc(var(--hx, 50%) - 150vmax)', top: 'calc(var(--hy, 50%) - 150vmax)' }}
      />
    </div>
  )
}
