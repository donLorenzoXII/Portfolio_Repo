import { useEffect, useLayoutEffect, useRef } from 'react'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { site } from '../../content/site'
import { useIntro } from '../../hooks/useIntro'
import { useIsTouch, useReducedMotion } from '../../hooks/useMediaQuery'
import { useSectionNav } from '../../hooks/useSectionNav'

const FULL = `${site.firstName} ${site.lastName}`

function Name({ outline = false }: { outline?: boolean }) {
  const chars = (text: string) =>
    [...text].map((c, i) => (
      <span key={i} data-hero-char className={c === ' ' ? 'w-[0.22em]' : ''}>
        {c === ' ' ? ' ' : c}
      </span>
    ))
  const cls = outline ? 'hero-outline' : 'text-ink'
  return (
    <>
      <div className={`hero-name hero-name--single ${cls}`} aria-hidden="true">
        <span className="hero-line hero-line--full">{chars(FULL)}</span>
      </div>
      <div className={`hero-name hero-name--stacked ${cls}`} aria-hidden="true">
        <span className="hero-line hero-line--a">{chars(site.firstName)}</span>
        <span className="hero-line hero-line--b">{chars(site.lastName)}</span>
      </div>
    </>
  )
}

export function Hero() {
  const { revealed } = useIntro()
  const reduced = useReducedMotion()
  const isTouch = useIsTouch()
  const goTo = useSectionNav()

  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const circle = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLDivElement>(null)
  const photo = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const intro = useRef<gsap.core.Timeline>()

  // Build the intro timeline (paused) before first paint so nothing flashes
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
      if (reduced) {
        tl.from('[data-hero-fade]', { opacity: 0, duration: 0.6, ease: 'none' })
      } else {
        const charIn = { yPercent: 105, duration: 1.3, stagger: 0.045 }
        // each name block (single / stacked, solid / outline) staggers independently but in sync
        gsap.utils.toArray<HTMLElement>('.hero-name').forEach((n) => tl.from(n.querySelectorAll('[data-hero-char]'), charIn, 0))
        tl.from('[data-hero-photo]', { y: () => window.innerHeight * 0.35, opacity: 0, duration: 1.6 }, 0.25)
          .from('[data-hero-mask]', { opacity: 0, duration: 0.8, ease: 'power2.out' }, 1.2)
          .from('[data-hero-circle]', { scale: 0.4, opacity: 0, duration: 1.6 }, 0.35)
          .from('[data-hero-corner]', { opacity: 0, y: 12, duration: 1, stagger: 0.08 }, 0.9)
      }
      intro.current = tl
    }, root)
    return () => ctx.revert()
  }, [reduced])

  useEffect(() => {
    if (revealed) intro.current?.play()
  }, [revealed, reduced])

  // Mouse parallax: one ticker drives all layers, so the masked outline stays registered
  useEffect(() => {
    if (reduced || isTouch) return
    const target = { x: 0, y: 0 }
    const cur = { x: 0, y: 0 }
    const move = (e: PointerEvent) => {
      target.x = (e.clientX / window.innerWidth) * 2 - 1
      target.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    const set = (el: HTMLElement | null, x: number, y: number) => {
      if (el) el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`
    }
    const tick = () => {
      cur.x += (target.x - cur.x) * 0.06
      cur.y += (target.y - cur.y) * 0.06
      const tx = cur.x * -18, ty = cur.y * -10 // text
      const px = cur.x * 10, py = cur.y * 6 // photo
      set(text.current, tx, ty)
      set(photo.current, px, py)
      set(frame.current, tx - px, ty - py)
      set(circle.current, cur.x * 26, cur.y * 16)
    }
    window.addEventListener('pointermove', move, { passive: true })
    gsap.ticker.add(tick)
    return () => {
      window.removeEventListener('pointermove', move)
      gsap.ticker.remove(tick)
    }
  }, [reduced, isTouch])

    useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      // the portrait recedes (drifts down + shrinks) while the wheel slides up over it
      gsap.to(stage.current, {
        yPercent: 18,
        scale: 0.88,
        transformOrigin: '50% 100%',
        ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      })
    }, root)
    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [reduced])

  const src = (ext: string) => [800, 1400, 2000].map((w) => `${site.photo.base}-${w}.${ext} ${w}w`).join(', ')
  const sizes = '(max-aspect-ratio: 1/1) 113vw, 68vh'

  return (
    <section ref={root} id="top" className="hero relative h-[100svh] min-h-[560px] overflow-hidden" aria-labelledby="hero-title">
      <h1 id="hero-title" className="sr-only">
        {site.name} — {site.role}, {site.location}
      </h1>

      <div ref={stage} className="absolute inset-0 will-change-transform">
        {/* terracotta accent disc behind the head */}
        <div
          ref={circle}
          aria-hidden="true"
          className="absolute will-change-transform"
          style={{
            width: 'calc(var(--ph) * 0.5)',
            height: 'calc(var(--ph) * 0.5)',
            left: 'calc(50% - var(--ph) * 0.25)',
            bottom: 'calc(var(--ph) * 0.42)',
          }}
          data-hero-fade
        >
          <div data-hero-circle className="h-full w-full rounded-full bg-terra" />
        </div>

        {/* 1 — solid name, behind the photo */}
        <div ref={text} data-layer="solid" className="absolute inset-0 will-change-transform" data-hero-fade>
          <Name />
        </div>

        {/* 2 — the photo, plus 3 — outlined name masked to the photo's silhouette */}
        <div ref={photo} className="hero-photo will-change-transform">
          <div data-hero-photo data-hero-fade className="absolute inset-0">
            <picture>
              <source type="image/avif" srcSet={src('avif')} sizes={sizes} />
              <img
                src={`${site.photo.base}-1400.webp`}
                srcSet={src('webp')}
                sizes={sizes}
                alt={site.photo.alt}
                width={1500}
                height={2000}
                {...{ fetchpriority: "high" }}
                decoding="async"
                className="h-full w-full object-contain object-bottom [filter:drop-shadow(0_30px_50px_rgb(26_26_26/0.16))]"
              />
            </picture>
          </div>
          <div data-hero-mask className="hero-mask" style={{ ['--mask' as string]: `url(${site.photo.mask})` }}>
            <div ref={frame} className="hero-frame will-change-transform" data-layer="outline">
              <Name outline />
            </div>
          </div>
        </div>

        {/* soft fade into the page */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[16%] bg-gradient-to-t from-cream via-cream/70 to-transparent" />
      </div>

      {/* fixed fade on the section's bottom edge: as the stage sinks on scroll, the photo dissolves
          into the page here instead of being cut off by the section boundary */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-gradient-to-t from-cream from-[18%] via-cream/75 via-[48%] to-transparent" />

      {/* corner captions */}
      <div className="label container-x pointer-events-none absolute inset-x-0 top-[calc(var(--nav-h)+0.5rem)] flex items-start justify-between">
        <p data-hero-corner className="flex items-center gap-3">
          <span className="text-terra">✳</span> {site.role}
        </p>
      </div>
      <div className="label container-x absolute inset-x-0 bottom-5 flex items-end justify-end md:bottom-7">
        <button
          data-hero-corner
          type="button"
          onClick={() => goTo('#work')}
          className="pointer-events-auto flex items-center gap-3 uppercase"
          aria-label="Scroll to selected work"
        >
          Scroll
          <span className="relative block h-8 w-px overflow-hidden bg-ink/15">
            <span className="absolute inset-0 animate-[scroll-line_2s_ease-in-out_infinite] bg-ink" />
          </span>
        </button>
      </div>
    </section>
  )
}
