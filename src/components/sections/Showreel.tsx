import { useEffect, useRef, useState } from 'react'
import { showreel } from '../../content/site'
import { useGsap } from '../../hooks/useGsap'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { gsap } from '../../lib/gsap'
import { MuteIcon, PauseIcon, PlayIcon, SoundIcon } from '../ui/Icons'
import { PaperPeel } from '../ui/PaperPeel'
import { SplitLines } from '../ui/SplitLines'

export function Showreel() {
  const root = useRef<HTMLElement>(null)
  const wrap = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const progress = useRef<HTMLDivElement>(null)
  const userPaused = useRef(false)
  const reduced = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  // Inset rounded card → full-bleed as you scroll
  useGsap(
    () => {
      gsap.from('[data-line]', { yPercent: 110, duration: 1.2, stagger: 0.1, scrollTrigger: { trigger: root.current, start: 'top 75%' } })
      if (reduced) return
      // headline lines drift in opposite directions and settle on the left margin
      gsap.fromTo(
        'h2 .line-mask',
        { xPercent: (i: number) => (i === 0 ? -6 : 10) },
        { xPercent: (i: number) => (i === 0 ? 4 : 0), ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 35%', scrub: 0.6 } },
      )
      const mm = gsap.matchMedia()
      mm.add('(min-aspect-ratio: 1/1)', () => {
        gsap.fromTo(
          frame.current,
          { scale: 0.62, borderRadius: 28 },
          { scale: 1, borderRadius: 0, ease: 'none', scrollTrigger: { trigger: wrap.current, start: 'top top', end: '+=90%', pin: true, scrub: 0.6 } },
        )
      })
      mm.add('(max-aspect-ratio: 1/1)', () => {
        gsap.fromTo(
          frame.current,
          { scale: 0.86, borderRadius: 20 },
          { scale: 1, borderRadius: 0, ease: 'none', scrollTrigger: { trigger: wrap.current, start: 'top bottom', end: 'center center', scrub: 0.6 } },
        )
      })
      return () => mm.revert()
    },
    [reduced],
    root,
  )

  // Autoplay (muted) only while in view, unless the visitor paused it
  useEffect(() => {
    const v = video.current
    if (!v || reduced) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !userPaused.current) v.play().catch(() => {})
        else if (!e.isIntersecting) v.pause()
      },
      { threshold: 0.4 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [reduced])

  const toggle = () => {
    const v = video.current
    if (!v) return
    if (v.paused) {
      userPaused.current = false
      v.play().catch(() => {})
    } else {
      userPaused.current = true
      v.pause()
    }
  }
  const toggleMute = () => {
    const v = video.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  return (
    <section ref={root} id="showreel" aria-labelledby="showreel-title" className="relative overflow-x-clip pt-12 md:pt-24">
      <header className="container-x mb-10 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="label mb-6 flex items-center gap-3">
            <span className="num text-sm">03</span>
            <span className="h-px w-10 bg-ink/30" />
            {showreel.label}
          </p>
          <SplitLines
            lines={showreel.title}
            className="font-serif text-[length:var(--fs-h1)] leading-[0.88] tracking-[-0.02em]"
            lineClassName={(i) => (i === 1 ? 'italic' : '')}
          />
          <span id="showreel-title" className="sr-only">
            {showreel.label}
          </span>
        </div>
        <PaperPeel className="self-start md:self-end">
          <p className="label text-stone md:text-right">
            Published in {showreel.year}
            <br />
            {showreel.tags}
          </p>
        </PaperPeel>
      </header>

      <div ref={wrap} className="relative h-[56.25vw] overflow-hidden [@media(min-aspect-ratio:1/1)]:h-[100svh]">
        <div
          ref={frame}
          className="absolute inset-0 overflow-hidden bg-ink will-change-transform"
          data-cursor={playing ? 'PAUSE' : 'PLAY'}
          onClick={toggle}
        >
          <video
            ref={video}
            src={showreel.src}
            poster={showreel.poster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Showreel video"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => {
              const v = e.currentTarget
              if (progress.current && v.duration) progress.current.style.transform = `scaleX(${v.currentTime / v.duration})`
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />

          <div className="container-x absolute inset-x-0 bottom-0 flex items-center gap-3 pb-5 text-cream md:pb-8" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? 'Pause showreel' : 'Play showreel'}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/40 backdrop-blur-sm transition-colors hover:bg-cream hover:text-ink md:h-14 md:w-14"
            >
              {playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute showreel' : 'Mute showreel'}
              aria-pressed={!muted}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/40 backdrop-blur-sm transition-colors hover:bg-cream hover:text-ink md:h-14 md:w-14"
            >
              {muted ? <MuteIcon size={18} /> : <SoundIcon size={18} />}
            </button>
            <div className="ml-3 hidden h-px flex-1 bg-cream/25 sm:block" aria-hidden="true">
              <div ref={progress} className="h-full origin-left bg-terra" style={{ transform: 'scaleX(0)' }} />
            </div>
            <span className="label ml-auto text-cream/80 sm:ml-3">{playing ? 'Playing' : 'Paused'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
