import { useRef } from 'react'
import { about, skills } from '../../content/site'
import { useGsap } from '../../hooks/useGsap'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { gsap, ScrollTrigger } from '../../lib/gsap'
import { SplitLines } from '../ui/SplitLines'

/** Huge outlined index numeral in the hero's Anton style, sitting behind a card's content. */
const Numeral = ({ n, tone }: { n: string; tone: 'light' | 'dark' }) => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute -top-[0.1em] right-4 select-none font-display text-[clamp(7rem,16vw,15rem)] leading-none text-transparent md:right-8"
    style={{ WebkitTextStroke: `1px ${tone === 'light' ? 'rgb(var(--c-cream) / 0.18)' : 'rgb(var(--c-ink) / 0.12)'}` }}
  >
    {n}
  </span>
)

export function About() {
  const root = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()

  useGsap(
    () => {
      const bars = gsap.utils.toArray<HTMLElement>('[data-bar]')
      const counts = gsap.utils.toArray<HTMLElement>('[data-count]')
      if (reduced) {
        bars.forEach((b) => gsap.set(b, { scaleX: Number(b.dataset.bar) / 100 }))
        return
      }


      // the whole section slides up over the wheel like a sheet of paper
      gsap.fromTo(
        '[data-sheet]',
        { y: () => window.innerHeight * 0.08, scale: 0.95 },
        { y: 0, scale: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 35%', scrub: 0.8 } },
      )

      const mm = gsap.matchMedia()
      mm.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)' }, (c) => {
        const dist = c.conditions?.desktop ? 260 : 56
        // the boxes float in from opposite sides — late, long and heavily smoothed so they trail the scroll
        gsap.fromTo(
          '[data-box="left"]',
          { x: -dist, y: 90, rotate: -4, opacity: 0 },
          {
            x: 0, y: 0, rotate: 0, opacity: 1, ease: 'power3.out',
            scrollTrigger: { trigger: '[data-box="left"]', start: 'top 92%', end: 'top 32%', scrub: 1.8 },
          },
        )
        gsap.fromTo(
          '[data-box="right"]',
          { x: dist, y: 140, rotate: 4, opacity: 0 },
          {
            x: 0, y: 0, rotate: 0, opacity: 1, ease: 'power3.out',
            // starts later than the left box, so the two arrive one after the other
            scrollTrigger: { trigger: '[data-box="right"]', start: 'top 80%', end: 'top 22%', scrub: 1.8 },
          },
        )
      })

      gsap.utils.toArray<HTMLElement>('[data-box]').forEach((box) => {
        gsap.from(box.querySelectorAll('[data-line]'), {
          yPercent: 110, duration: 1.4, stagger: 0.12, delay: 0.25,
          scrollTrigger: { trigger: box, start: 'top 65%' },
        })
        gsap.from(box.querySelectorAll('[data-about-fade]'), {
          opacity: 0, y: 20, duration: 1.2, stagger: 0.08, delay: 0.45,
          scrollTrigger: { trigger: box, start: 'top 60%' },
        })
      })

      // thin terracotta bars fill + numbers count up once the list is in view
      gsap.set(bars, { scaleX: 0 })
      ScrollTrigger.create({
        trigger: '[data-skill-list]',
        start: 'top 70%',
        once: true,
        onEnter: () => {
          bars.forEach((b, i) => gsap.to(b, { scaleX: Number(b.dataset.bar) / 100, duration: 1.8, ease: 'expo.out', delay: 0.3 + i * 0.09 }))
          counts.forEach((el, i) => {
            const o = { v: 0 }
            gsap.to(o, {
              v: Number(el.dataset.count), duration: 1.8, ease: 'expo.out', delay: 0.3 + i * 0.09,
              onUpdate: () => { el.textContent = `${Math.round(o.v)}%` },
            })
          })
        },
      })
      return () => mm.revert()
    },
    [reduced],
    root,
  )

  return (
    <section ref={root} id="about" aria-label="About and skills" className="relative z-20 overflow-x-clip">
      <div
        data-sheet
        className="rounded-[32px] bg-[#E9E1D4] py-20 shadow-[0_-30px_60px_-30px_rgb(26_26_26/0.25)] will-change-transform md:rounded-[64px] md:py-32"
      >
        <div className="container-x">
          <div className="grid gap-6 md:grid-cols-12 md:gap-8">
            {/* About Me — dark card */}
            <article
              data-box="left"
              className="relative flex flex-col overflow-hidden rounded-[20px] bg-ink p-7 text-cream shadow-[0_50px_90px_-45px_rgb(26_26_26/0.7)] md:col-span-6 md:p-12 lg:col-span-5"
            >
              <Numeral n="01" tone="light" />
              <span className="label relative mb-8 flex items-center gap-3 text-cream/50">
                <span className="h-1.5 w-1.5 rounded-full bg-terra" /> About
              </span>
              <SplitLines
                lines={about.title}
                className="relative font-serif text-[length:var(--fs-h2)] leading-[0.9] tracking-[-0.01em]"
                lineClassName={(i) => (i === 1 ? 'italic text-terra' : '')}
              />
              <div className="relative mt-10 space-y-5 md:mt-14">
                {about.paragraphs.map((p, i) => (
                  <p key={i} data-about-fade className={i === 0 ? 'font-serif text-xl leading-snug md:text-2xl' : 'text-cream/60'}>
                    {p}
                  </p>
                ))}
              </div>
              <dl className="relative mt-auto grid grid-cols-3 gap-4 pt-12">
                {about.facts.map((f) => (
                  <div key={f.label} data-about-fade className="border-t border-cream/15 pt-3">
                    <dt className="label text-[10px] text-cream/45">{f.label}</dt>
                    <dd className="mt-1 text-sm">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </article>

            {/* Skills & Expertise — light raised card */}
            <article
              data-box="right"
              className="relative overflow-hidden rounded-[20px] border border-white/60 bg-[#FBF8F3] p-7 shadow-[0_50px_90px_-50px_rgb(26_26_26/0.45)] md:col-span-6 md:p-12 lg:col-span-6 lg:col-start-7 lg:mt-24"
            >
              <Numeral n="02" tone="dark" />
              <span className="label relative mb-8 flex items-center gap-3 text-stone">
                <span className="h-1.5 w-1.5 rounded-full bg-terra" /> Expertise
              </span>
              <SplitLines
                lines={skills.title}
                className="relative font-serif text-[length:var(--fs-h2)] leading-[0.9] tracking-[-0.01em]"
                lineClassName={(i) => (i === 1 ? 'italic text-terra' : '')}
              />
              <ul data-skill-list className="relative mt-10 md:mt-14">
                {skills.items.map((s, i) => (
                  <li key={s.name} className="border-t border-hair py-4 last:border-b md:py-5">
                    <div className="flex items-baseline gap-4">
                      <span className="num w-6 text-sm">{String(i + 1).padStart(2, '0')}</span>
                      <span className="label flex-1 text-[11px] text-ink md:text-xs">{s.name}</span>
                      <span data-count={s.level} className="label tabular-nums text-stone" aria-label={`${s.level} percent`}>
                        {reduced ? `${s.level}%` : '0%'}
                      </span>
                    </div>
                    <div className="relative ml-10 mt-3 h-px bg-hair" aria-hidden="true">
                      <div data-bar={s.level} className="absolute inset-y-[-0.5px] left-0 w-full origin-left bg-terra will-change-transform" />
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      </div>
    </section>
  )
}
