import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { projects } from '../../../content/projects'
import { work } from '../../../content/site'
import { gsap } from '../../../lib/gsap'
import { sound } from '../../../lib/sound'
import { useGsap } from '../../../hooks/useGsap'
import { useIsTouch, useReducedMotion } from '../../../hooks/useMediaQuery'
import { usePageTransition } from '../../layout/Transitions'
import { RETURN_KEY } from '../../../lib/constants'
import { WheelCard, type WheelCardHandle } from './WheelCard'
import { WheelCenter } from './WheelCenter'

const N = projects.length
const STEP = 26 // degrees between neighbouring cards on the arc
const HALF = N / 2

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const mod = (v: number, m: number) => ((v % m) + m) % m
/** Signed distance (in cards) from the wheel position to card i, wrapped to [-N/2, N/2) */
const wrapDelta = (i: number, rot: number) => mod(i - rot + HALF, N) - HALF

type Dims = { w: number; cardW: number; cardH: number; R: number; cx: number; cy: number; ring: number; h: number }

function measure(stageWidth: number): Dims {
  const vh = window.innerHeight
  const mobile = stageWidth < 640
  const base = Math.min(stageWidth, vh * 1.35)
  const cardW = mobile ? stageWidth * 0.46 : clamp(base * 0.175, 160, 300)
  const cardH = cardW * 1.38
  const R = cardW * 2.15
  const top = mobile ? 28 : 36
  const cy = top + R + cardH * 0.56
  const ring = R - cardH / 2 - (mobile ? 22 : 30)
  // the lower half of the hub fades out, so the stage ends just below its centre
  return { w: stageWidth, cardW, cardH, R, cx: stageWidth / 2, cy, ring, h: cy + ring * 0.15 }
}

export function ContentWheel() {
  const navigate = useNavigate()
  const { expandFrom } = usePageTransition()
  const reduced = useReducedMotion()
  const isTouch = useIsTouch()

  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const cards = useRef<(WheelCardHandle | null)[]>([])
  const [dims, setDims] = useState<Dims | null>(null)
  const [active, setActive] = useState(0)
  const [inView, setInView] = useState(false)

  // Physics state lives in a ref: rendering never goes through React per frame.
  const s = useRef({ rot: 0, target: 0, dragging: false, startX: 0, lastX: 0, lastT: 0, vel: 0, moved: 0, raf: 0, wheelTimer: 0, wheelDir: 0 })
  const dimsRef = useRef<Dims | null>(null)
  const activeRef = useRef(0)
  const openingRef = useRef(false)
  /** 0 = cards stacked, 1 = fully fanned. Driven by scroll as the wheel arrives. */
  const spreadRef = useRef(1)

  /* ───────── layout: called every frame while moving ───────── */
  const render = useCallback(() => {
    const d = dimsRef.current
    if (!d) return
    const { rot } = s.current
    const spread = spreadRef.current
    cards.current.forEach((c, i) => {
      if (!c?.root) return
      const delta = wrapDelta(i, rot)
      const ad = Math.abs(delta)
      const theta = delta * STEP * spread
      const scale = ad < 1 ? 1.08 - 0.2 * ad : Math.max(0.62, 0.88 - 0.08 * (ad - 1))
      const ry = -Math.sign(delta) * Math.min(ad, 3) * 12
      c.root.style.transform = `translate3d(${d.cx - d.cardW / 2}px, ${d.cy - d.cardH / 2}px, 0) rotate(${theta}deg) translate3d(0, ${-d.R}px, 0) rotateY(${ry}deg) scale(${scale})`
      c.root.style.zIndex = String(100 - Math.round(ad * 10))
      c.root.style.opacity = String(clamp(3.5 - ad, 0, 1) * clamp(spread * 1.6 - ad * 0.25, 0, 1))
      c.root.style.visibility = ad > 3.6 ? 'hidden' : 'visible'
      if (c.color) c.color.style.opacity = String(clamp(1 - ad * 1.25, 0, 1))
      if (c.shadow) c.shadow.style.opacity = String(clamp(1 - ad, 0, 1))
    })
    const idx = mod(Math.round(rot), N)
    if (idx !== activeRef.current) {
      activeRef.current = idx
      sound.tick() // a gentle click each time a card passes the centre
      setActive(idx)
    }
  }, [])

  const loop = useCallback(() => {
    const st = s.current
    let last = performance.now()
    const step = (now: number) => {
      const dt = Math.min(64, now - last)
      last = now
      if (!st.dragging) {
        const k = reduced ? 1 : 1 - Math.pow(1 - 0.12, dt / 16.67)
        st.rot += (st.target - st.rot) * k
        if (Math.abs(st.target - st.rot) < 0.0005) st.rot = st.target
      }
      render()
      if (st.dragging || st.rot !== st.target) st.raf = requestAnimationFrame(step)
      else st.raf = 0
    }
    if (!st.raf) st.raf = requestAnimationFrame(step)
  }, [render, reduced])

  const goTo = useCallback(
    (target: number) => {
      s.current.target = target
      loop()
    },
    [loop],
  )
  const stepBy = useCallback((n: number) => goTo(Math.round(s.current.target) + n), [goTo])
  /** Rotate to card i along the shortest path */
  const goToIndex = useCallback((i: number) => goTo(Math.round(s.current.rot + wrapDelta(i, s.current.rot))), [goTo])

  /* ───────── sizing ───────── */
  useLayoutEffect(() => {
    const el = stage.current
    if (!el) return
    const update = () => {
      const d = measure(el.clientWidth)
      dimsRef.current = d
      setDims(d)
      render()
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [render])

  useLayoutEffect(() => render(), [dims, render])
  useEffect(() => () => cancelAnimationFrame(s.current.raf), [])

  /* ───────── drag (mouse + touch) with inertia ───────── */
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const st = s.current
    const pxPerCard = () => (dimsRef.current?.cardW ?? 200) * 1.05

    const down = (e: PointerEvent) => {
      if (e.button !== 0) return
      st.dragging = true
      st.startX = st.lastX = e.clientX
      st.lastT = performance.now()
      st.vel = 0
      st.moved = 0
      loop()
    }
    const move = (e: PointerEvent) => {
      if (!st.dragging) return
      const now = performance.now()
      const dx = e.clientX - st.lastX
      st.moved = Math.max(st.moved, Math.abs(e.clientX - st.startX))
      const dCards = -dx / pxPerCard()
      st.rot += dCards
      st.target = st.rot
      const dt = Math.max(1, now - st.lastT)
      st.vel = st.vel * 0.6 + (dCards / dt) * 0.4 // cards per ms, smoothed
      st.lastX = e.clientX
      st.lastT = now
    }
    const up = () => {
      if (!st.dragging) return
      st.dragging = false
      const idle = performance.now() - st.lastT > 80 // finger rested before release → no fling
      const projected = st.rot + (idle ? 0 : clamp(st.vel * 220, -3, 3))
      goTo(Math.round(projected))
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [goTo, loop])

  /* ───────── mouse wheel: only while hovering the wheel and it's framed in view ───────── */
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const st = s.current
    const onWheel = (e: WheelEvent) => {
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const d = dimsRef.current
      if (!d || e.ctrlKey) return
      // the wheel is "in place" once the top card and the hub centre are both on screen
      const cardTop = r.top + d.cy - d.R - d.cardH * 0.55
      const framed = cardTop > -d.cardH * 0.25 && r.top + d.cy < vh + 40
      if (!framed) return // let the page scroll the wheel into place first
      // Only capture over the wheel itself (the arc of cards or the hub) — everywhere else the page scrolls
      const dx = e.clientX - r.left - d.cx
      const dy = e.clientY - r.top - d.cy
      const dist = Math.hypot(dx, dy)
      const angle = Math.abs((Math.atan2(dx, -dy) * 180) / Math.PI) // 0 = straight up
      const overHub = dist < d.ring
      const overArc = dist > d.R - d.cardH * 0.6 && dist < d.R + d.cardH * 0.62 && angle < 3 * STEP + 14
      if (!overHub && !overArc) return
      e.preventDefault()
      e.stopPropagation() // keep Lenis from also scrolling the page
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? vh : 1
      const raw = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * unit
      const inc = clamp(raw * 0.0045, -0.55, 0.55)
      if (inc === 0) return
      st.wheelDir = Math.sign(inc)
      st.target += inc
      loop()
      window.clearTimeout(st.wheelTimer)
      st.wheelTimer = window.setTimeout(() => {
        // snap in the direction of travel once the wheel settles
        goTo(st.wheelDir > 0 ? Math.ceil(st.target - 0.2) : Math.floor(st.target + 0.2))
      }, 140)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      window.clearTimeout(st.wheelTimer)
    }
  }, [goTo, loop])

  /* ───────── visibility (pauses autoplay off-screen) ───────── */
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Touch: the centred card plays its teaser
  useEffect(() => {
    if (!isTouch) return
    cards.current.forEach((c, i) => (i === active && inView && !reduced ? c?.play() : c?.stop()))
  }, [active, inView, isTouch, reduced])

  /* ───────── keyboard ───────── */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      stepBy(1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      stepBy(-1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      goToIndex(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      goToIndex(N - 1)
    }
  }

  /* ───────── open a project ───────── */
  const open = (e: React.MouseEvent<HTMLAnchorElement>, i: number) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return // new tab etc.
    e.preventDefault()
    if (s.current.moved > 6 || openingRef.current) {
      s.current.moved = 0
      return
    }
    const p = projects[i]
    const face = cards.current[i]?.face
    try {
      sessionStorage.setItem(RETURN_KEY, '#work')
    } catch {
      /* ignore */
    }
    cards.current.forEach((c) => c?.stop())
    if (reduced || !face) {
      navigate(`/projects/${p.slug}`)
      return
    }
    openingRef.current = true
    expandFrom({
      rect: face.getBoundingClientRect(),
      cover: p.cover,
      hero: p.hero,
      done: () => navigate(`/projects/${p.slug}`),
    })
  }

  /* ───────── heading reveal ───────── */
  useGsap(
    () => {
      if (reduced) {
        spreadRef.current = 1
        render()
        return
      }
      // Cards fan open from a stack, and the stage rises, as the wheel scrolls up over the hero
      const fan = { v: 0 }
      gsap.fromTo(
        fan,
        { v: 0.18 },
        {
          v: 1,
          ease: 'power2.out',
          scrollTrigger: { trigger: section.current, start: 'top bottom', end: 'top 15%', scrub: 0.9 },
          onUpdate: () => {
            spreadRef.current = fan.v
            if (!s.current.raf) render()
          },
        },
      )
      gsap.fromTo(
        stage.current,
        { y: () => window.innerHeight * 0.12 },
        { y: 0, ease: 'none', scrollTrigger: { trigger: section.current, start: 'top bottom', end: 'top 15%', scrub: 0.9 } },
      )
      gsap.from('[data-line]', {
        yPercent: 110,
        duration: 1.2,
        stagger: 0.1,
        scrollTrigger: { trigger: section.current, start: 'top 45%' },
      })
      gsap.from('[data-wheel-fade]', {
        opacity: 0,
        y: 16,
        duration: 1.2,
        stagger: 0.08,
        scrollTrigger: { trigger: section.current, start: 'top 40%' },
      })
    },
    [reduced],
    section,
  )

  const current = projects[active]

  return (
    <section
      ref={section}
      id="work"
      aria-label={work.label}
      // pulled up so the fanned cards overlap the bottom of the portrait
      className="relative z-10 -mt-[12svh] overflow-hidden md:-mt-[18svh]"
    >
      <div
        ref={stage}
        role="region"
        aria-roledescription="carousel"
        aria-label="Project wheel. Use the left and right arrow keys to rotate."
        tabIndex={0}
        onKeyDown={onKeyDown}
        data-cursor="DRAG"
        className="relative w-full touch-pan-y select-none overflow-hidden outline-none will-change-transform focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-terra/60"
        style={{ height: dims?.h ?? '80svh', perspective: 1800 }}
      >
        {dims && (
          <WheelCenter
            cx={dims.cx}
            cy={dims.cy}
            r={dims.ring}
            title={work.title}
          />
        )}
        {projects.map((p, i) => (
          <WheelCard
            key={p.slug}
            ref={(h) => {
              cards.current[i] = h
            }}
            project={p}
            index={i}
            total={N}
            onOpen={open}
            onFocusCard={goToIndex}
            hoverPlay={!isTouch && !reduced}
          />
        ))}
        {/* card size changes only on resize; transforms are applied imperatively */}
        <style>{dims ? `.wheel-card{width:${dims.cardW}px;height:${dims.cardH}px;will-change:transform,opacity}` : ''}</style>
        <p aria-live="polite" className="sr-only">
          {`Project ${active + 1} of ${N}: ${current.title}, ${current.category}`}
        </p>
      </div>

    </section>
  )
}
