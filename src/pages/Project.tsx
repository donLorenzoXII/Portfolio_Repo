import { useEffect, useLayoutEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getNextProject, getProject, projects, type GalleryItem } from '../content/projects'
import { Page, usePageTransition } from '../components/layout/Transitions'
import { Arrow } from '../components/ui/Icons'
import { Magnetic } from '../components/ui/Magnetic'
import { SplitLines } from '../components/ui/SplitLines'
import { Contact } from '../components/sections/Contact'
import { useGsap } from '../hooks/useGsap'
import { useReducedMotion } from '../hooks/useMediaQuery'
import { gsap } from '../lib/gsap'
import { RETURN_KEY } from '../lib/constants'
import NotFound from './NotFound'

const spanClass: Record<NonNullable<GalleryItem['span']>, string> = {
  wide: 'md:col-span-6 aspect-[16/10]',
  tall: 'md:col-span-3 aspect-[3/4]',
  square: 'md:col-span-3 aspect-square',
}

export default function ProjectPage() {
  const { slug } = useParams()
  const project = getProject(slug)
  if (!project) return <NotFound />
  return <ProjectView key={project.slug} slug={project.slug} />
}

function ProjectView({ slug }: { slug: string }) {
  const project = getProject(slug)!
  const next = getNextProject(slug)
  const index = projects.findIndex((p) => p.slug === slug)
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const { releaseExpand, kind } = usePageTransition()
  const arrivedByExpand = useRef(kind === 'expand')

  const root = useRef<HTMLDivElement>(null)
  const heroImg = useRef<HTMLImageElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    document.title = `${project.title} — Lorenzo Reimann`
  }, [project.title])

  // Hand over from the expanding card once our header image is ready
  useEffect(() => {
    const img = heroImg.current
    if (!img) return releaseExpand()
    let done = false
    const release = () => {
      if (done) return
      done = true
      releaseExpand()
    }
    if (img.complete) img.decode().then(release, release)
    else img.addEventListener('load', release, { once: true })
    const t = window.setTimeout(release, 1500)
    return () => window.clearTimeout(t)
  }, [releaseExpand])

  // Header intro
  useLayoutEffect(() => {
    if (reduced) return
    const ctx = gsap.context(() => {
      const delay = arrivedByExpand.current ? 0.25 : 0.75
      gsap.from('[data-head-line]', { yPercent: 110, duration: 1.4, stagger: 0.1, delay })
      gsap.from('[data-head-fade]', { opacity: 0, y: 16, duration: 1, stagger: 0.08, delay: delay + 0.2 })
      if (!arrivedByExpand.current) gsap.from(heroImg.current, { scale: 1.15, duration: 2, ease: 'expo.out', delay: 0.3 })
    }, root)
    return () => ctx.revert()
  }, [reduced])

  // Scroll reveals
  useGsap(
    () => {
      if (reduced) return
      gsap.to(heroImg.current, {
        yPercent: 12,
        ease: 'none',
        scrollTrigger: { trigger: '[data-header]', start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.utils.toArray<HTMLElement>('[data-reveal-img]').forEach((el) => {
        const img = el.querySelector('img, video')
        gsap.from(el, { y: 60, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } })
        if (img) gsap.from(img, { scale: 1.2, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' } })
      })
      gsap.from('[data-line]', { yPercent: 110, duration: 1.2, stagger: 0.08, scrollTrigger: { trigger: '[data-intro]', start: 'top 80%' } })
      gsap.from('[data-fade]', { opacity: 0, y: 24, duration: 1.2, stagger: 0.08, scrollTrigger: { trigger: '[data-intro]', start: 'top 75%' } })
    },
    [reduced],
    root,
  )

  // Teaser plays only while visible
  useEffect(() => {
    const v = video.current
    if (!v || reduced) return
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? v.play().catch(() => {}) : v.pause()), { threshold: 0.3 })
    io.observe(v)
    return () => io.disconnect()
  }, [reduced])

  const back = (e: React.MouseEvent) => {
    e.preventDefault()
    try {
      sessionStorage.setItem(RETURN_KEY, '#work')
    } catch {
      /* ignore */
    }
    navigate('/')
  }

  const meta = [
    { label: 'Category', value: project.category },
    { label: 'Year', value: project.year },
    project.client && { label: 'Client', value: project.client },
    project.role && { label: 'Role', value: project.role },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <Page>
      <div ref={root}>
        {/* ───────── header: the card expands into this ───────── */}
        <header data-header className="relative h-[100svh] min-h-[520px] overflow-hidden bg-ink text-cream">
          <img
            ref={heroImg}
            src={project.hero}
            alt={`${project.title} — cover`}
            {...{ fetchpriority: "high" }}
            className="absolute inset-0 h-full w-full object-cover will-change-transform"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-ink/30" />

          <div className="container-x absolute inset-x-0 top-[calc(var(--nav-h)+0.75rem)] flex items-center justify-between">
            <a href="/" onClick={back} className="label link-draw flex items-center gap-3" data-head-fade>
              <Arrow direction="left" className="w-8" /> All work
            </a>
            <p className="label" data-head-fade>
              <span className="text-terra">{String(index + 1).padStart(2, '0')}</span> / {String(projects.length).padStart(2, '0')}
            </p>
          </div>

          <div className="container-x absolute inset-x-0 bottom-0 pb-8 md:pb-12">
            <div className="label mb-4 flex flex-wrap gap-x-8 gap-y-2 text-cream/80 md:mb-6" data-head-fade>
              <span>{project.category}</span>
              <span>{project.year}</span>
            </div>
            <h1 className="font-serif text-[length:var(--fs-h1)] leading-[0.88] tracking-[-0.02em]">
              {project.title.split(' ').map((w, i) => (
                <span key={i} className="line-mask mr-[0.2em] inline-block align-top">
                  <span data-head-line className={`inline-block ${i % 2 === 1 ? 'italic' : ''}`}>
                    {w}
                  </span>
                </span>
              ))}
            </h1>
          </div>
        </header>

        {/* ───────── intro ───────── */}
        <section data-intro className="container-x grid gap-12 py-20 md:grid-cols-12 md:py-32">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 self-start md:col-span-4 md:grid-cols-1">
            {meta.map((m) => (
              <div key={m.label} className="border-t border-hair pt-3" data-fade>
                <dt className="label text-stone">{m.label}</dt>
                <dd className="mt-1">{m.value}</dd>
              </div>
            ))}
          </dl>
          <div className="md:col-span-7 md:col-start-6">
            <SplitLines
              as="p"
              lines={[project.excerpt]}
              className="font-serif text-3xl leading-[1.15] md:text-5xl"
            />
            <div className="mt-10 space-y-5 text-stone md:columns-2 md:gap-10 md:space-y-0">
              {project.description.map((para, i) => (
                <p key={i} data-fade className="mb-5 break-inside-avoid">
                  {para}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* ───────── full-width motion ───────── */}
        <section className="container-x" aria-label="Project teaser">
          <div data-reveal-img className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-card)] bg-ink md:aspect-[21/9]">
            <video
              ref={video}
              src={project.teaser}
              poster={project.cover}
              muted
              loop
              playsInline
              preload="metadata"
              controls={reduced}
              aria-label={`${project.title} teaser video (muted)`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        </section>

        {/* ───────── gallery ───────── */}
        <section className="container-x py-20 md:py-32" aria-label="Gallery">
          <div className="mb-10 flex items-end justify-between border-b border-hair pb-4">
            <h2 className="label">Gallery</h2>
            <p className="label text-stone">{String(project.gallery.length).padStart(2, '0')} images</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:gap-6">
            {project.gallery.map((g, i) => (
              <figure key={g.src} data-reveal-img className={`relative overflow-hidden rounded-[var(--radius-card)] bg-hair ${spanClass[g.span ?? 'square']}`}>
                {g.type === 'video' ? (
                  <video
                    src={g.src}
                    muted
                    loop
                    playsInline
                    autoPlay={!reduced}
                    controls={reduced}
                    preload="metadata"
                    aria-label={g.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <img src={g.src} alt={g.alt} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                )}
                <figcaption className="label absolute bottom-3 left-3 text-[9px] text-cream mix-blend-difference">
                  {String(i + 1).padStart(2, '0')}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ───────── next project ───────── */}
        <section className="border-t border-hair">
          <Link to={`/projects/${next.slug}`} className="container-x group relative flex flex-col gap-6 overflow-hidden py-16 md:py-24" data-cursor="NEXT">
            <div className="flex items-center justify-between">
              <span className="label text-stone">Next project</span>
              <span className="label">{next.category} — {next.year}</span>
            </div>
            <div className="flex items-end justify-between gap-6">
              <span className="font-serif text-[length:var(--fs-h2)] leading-[0.9] transition-transform duration-700 ease-expo group-hover:translate-x-3">
                {next.title}
              </span>
              <Magnetic>
                <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-ink transition-colors duration-500 group-hover:border-terra group-hover:bg-terra group-hover:text-cream md:h-24 md:w-24">
                  <Arrow className="w-8 md:w-10" />
                </span>
              </Magnetic>
            </div>
            <img
              src={next.cover}
              alt=""
              loading="lazy"
              aria-hidden="true"
              className="pointer-events-none absolute right-[22%] top-1/2 hidden w-44 -translate-y-1/2 rotate-6 scale-90 rounded-[var(--radius-card)] opacity-0 shadow-2xl transition-all duration-700 ease-expo group-hover:rotate-3 group-hover:scale-100 group-hover:opacity-100 lg:block"
            />
          </Link>
          <div className="container-x pb-10">
            <a href="/" onClick={back} className="label link-draw inline-flex items-center gap-3">
              <Arrow direction="left" className="w-8" /> Back to all work
            </a>
          </div>
        </section>

        <Contact compact />
      </div>
    </Page>
  )
}
