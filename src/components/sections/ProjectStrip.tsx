import { motion } from 'framer-motion'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { projects } from '../../content/projects'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { sound } from '../../lib/sound'

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const mod = (v: number, m: number) => ((v % m) + m) % m

/**
 * Endless horizontal carousel of the other projects, at the end of a project page.
 * The centre card is active: larger, in colour, its title shown above. Cards to the sides
 * shrink, turn grey and fade out. Drag/swipe with momentum, scroll sideways, or use ← →.
 * Tapping a side card centres it; tapping the centre card opens the project.
 */
export function ProjectStrip({ currentSlug }: { currentSlug: string }) {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const stage = useRef<HTMLDivElement>(null)
  const cards = useRef<(HTMLAnchorElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [cardW, setCardW] = useState(0)

  // the other projects, starting with the next one
  const start = projects.findIndex((p) => p.slug === currentSlug)
  const others = projects.map((_, i) => projects[(start + 1 + i) % projects.length]).filter((p) => p.slug !== currentSlug)
  const N = others.length
  const current = others[active] ?? others[0]

  // physics state lives in a ref; rendering happens imperatively, not through React
  const s = useRef({ pos: 0, target: 0, dragging: false, startX: 0, lastX: 0, lastT: 0, vel: 0, moved: 0, raf: 0, wheelTimer: 0 })
  const activeRef = useRef(0)
  const widthRef = useRef(0)

  /** Signed distance (in cards) from the centre to card i, wrapped so the row never ends. */
  const wrap = useCallback((i: number, pos: number) => mod(i - pos + N / 2, N) - N / 2, [N])

  const render = useCallback(() => {
    const w = widthRef.current
    if (!w) return
    const step = w * 1.08 // card width + gap
    cards.current.forEach((el, i) => {
      if (!el) return
      const d = wrap(i, s.current.pos)
      const ad = Math.abs(d)
      const scale = ad < 1 ? 1.12 - 0.27 * ad : Math.max(0.7, 0.85 - 0.06 * (ad - 1))
      el.style.transform = `translate3d(${d * step - w / 2}px, 0, 0) scale(${scale})`
      el.style.opacity = String(clamp(2.8 - ad, 0, 1))
      el.style.zIndex = String(100 - Math.round(ad * 10))
      el.style.visibility = ad > 2.9 ? 'hidden' : 'visible'
    })
    const idx = mod(Math.round(s.current.pos), N)
    if (idx !== activeRef.current) {
      activeRef.current = idx
      setActive(idx)
      sound.tick() // same soft click as the wheel on the home page
    }
  }, [N, wrap])

  const loop = useCallback(() => {
    const st = s.current
    let last = performance.now()
    const frame = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      if (!st.dragging) {
        st.pos += (st.target - st.pos) * (reduced ? 1 : 1 - Math.pow(0.86, dt / 16.67))
        if (Math.abs(st.target - st.pos) < 0.0005) st.pos = st.target
      }
      render()
      st.raf = st.dragging || st.pos !== st.target ? requestAnimationFrame(frame) : 0
    }
    if (!st.raf) st.raf = requestAnimationFrame(frame)
  }, [render, reduced])

  const goTo = useCallback(
    (target: number) => {
      s.current.target = target
      loop()
    },
    [loop],
  )
  const goToIndex = (i: number) => goTo(Math.round(s.current.pos + wrap(i, s.current.pos)))

  // card size follows the breakpoints
  useLayoutEffect(() => {
    const measure = () => {
      const vw = window.innerWidth
      const w = vw < 640 ? vw * 0.5 : vw < 768 ? vw * 0.3 : vw < 1024 ? vw * 0.22 : vw * 0.17
      widthRef.current = w
      setCardW(w)
      render()
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [render])
  useLayoutEffect(() => render(), [cardW, render])
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])

  // a new project page starts with its next project in the middle
  useEffect(() => {
    s.current.pos = s.current.target = 0
    activeRef.current = 0
    setActive(0)
    render()
  }, [currentSlug, render])

  // drag / swipe with momentum
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const st = s.current
    const perCard = () => widthRef.current * 1.08
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      Object.assign(st, { dragging: true, startX: e.clientX, lastX: e.clientX, lastT: performance.now(), vel: 0, moved: 0 })
      loop()
    }
    const move = (e: PointerEvent) => {
      if (!st.dragging) return
      const now = performance.now()
      const d = -(e.clientX - st.lastX) / perCard()
      st.moved = Math.max(st.moved, Math.abs(e.clientX - st.startX))
      st.pos += d
      st.target = st.pos
      st.vel = st.vel * 0.6 + (d / Math.max(1, now - st.lastT)) * 0.4
      st.lastX = e.clientX
      st.lastT = now
    }
    const up = () => {
      if (!st.dragging) return
      st.dragging = false
      const fling = performance.now() - st.lastT > 80 ? 0 : clamp(st.vel * 200, -3, 3)
      goTo(Math.round(st.pos + fling))
    }
    // sideways trackpad / shift-wheel scrolling; vertical scrolling keeps moving the page
    const wheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
      e.preventDefault()
      st.target += clamp(e.deltaX * 0.006, -0.5, 0.5)
      loop()
      window.clearTimeout(st.wheelTimer)
      st.wheelTimer = window.setTimeout(() => goTo(Math.round(st.target)), 140)
    }
    el.addEventListener('pointerdown', down)
    el.addEventListener('wheel', wheel, { passive: false })
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      el.removeEventListener('wheel', wheel)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.clearTimeout(st.wheelTimer)
    }
  }, [goTo, loop])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      goTo(Math.round(s.current.target) + (e.key === 'ArrowRight' ? 1 : -1))
    }
  }

  const onCardClick = (e: React.MouseEvent, i: number) => {
    e.preventDefault()
    if (s.current.moved > 6) return // that was a drag, not a tap
    if (i === activeRef.current) navigate(`/projects/${others[i].slug}`)
    else goToIndex(i)
  }

  const cardH = cardW * (4 / 3)

  return (
    <section aria-label="More projects" className="border-t border-hair py-14 md:py-20">
      {/* title of the centre project */}
      <div className="container-x mb-2 overflow-hidden text-center md:mb-4" aria-live="polite">
        {/* a new key per project: each title slides in fresh (no exit to wait for, so fast swipes can't stall it) */}
        <motion.div
          key={current.slug}
          initial={{ y: '70%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="label mb-2 text-stone">
            {current.category} — {current.year}
          </p>
          {/* pb gives descenders (g, y, p) room inside the clipping box */}
          <Link to={`/projects/${current.slug}`} className="inline-block pb-[0.32em] font-serif text-[length:var(--fs-h2)] leading-[0.95] transition-colors hover:text-terra">
            {current.title}
          </Link>
        </motion.div>
      </div>

      <div
        ref={stage}
        role="region"
        aria-roledescription="carousel"
        aria-label="More projects. Use the left and right arrow keys to browse."
        tabIndex={0}
        onKeyDown={onKeyDown}
        data-cursor="DRAG"
        // the sides fade out
        className="relative w-full touch-pan-y select-none overflow-hidden outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-terra/60 [mask-image:linear-gradient(to_right,transparent,#000_18%,#000_82%,transparent)]"
        style={{ height: cardW ? cardH * 1.16 : '60vw' }}
      >
        {others.map((p, i) => (
          <a
            key={p.slug}
            ref={(el) => {
              cards.current[i] = el
            }}
            href={`/projects/${p.slug}`}
            draggable={false}
            data-cursor={i === active ? 'VIEW' : ''}
            aria-label={`${p.title} — ${p.category}, ${p.year}`}
            aria-current={i === active ? 'true' : undefined}
            onClick={(e) => onCardClick(e, i)}
            className="absolute left-1/2 top-1/2 block overflow-hidden rounded-[var(--radius-card)] bg-ink will-change-transform"
            style={{ width: cardW, height: cardH, marginTop: -cardH / 2 }}
          >
            <img
              src={p.cover}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className={`absolute inset-0 h-full w-full object-cover transition-[filter] duration-500 ${i === active ? 'grayscale-0' : 'grayscale'}`}
            />
          </a>
        ))}
      </div>
    </section>
  )
}
