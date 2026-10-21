import { forwardRef, useImperativeHandle, useRef } from 'react'
import type { Project } from '../../../content/projects'

export type WheelCardHandle = {
  root: HTMLAnchorElement | null
  face: HTMLDivElement | null
  color: HTMLImageElement | null
  shadow: HTMLDivElement | null
  play: () => void
  stop: () => void
}

type Props = {
  project: Project
  index: number
  total: number
  onOpen: (e: React.MouseEvent<HTMLAnchorElement>, index: number) => void
  onFocusCard: (index: number) => void
  hoverPlay: boolean
}

/** One portrait card. All per-frame styling is applied imperatively by the wheel. */
export const WheelCard = forwardRef<WheelCardHandle, Props>(function WheelCard(
  { project, index, total, onOpen, onFocusCard, hoverPlay },
  ref,
) {
  const root = useRef<HTMLAnchorElement>(null)
  const face = useRef<HTMLDivElement>(null)
  const color = useRef<HTMLImageElement>(null)
  const shadow = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  const play = () => {
    const v = video.current
    if (!v) return
    if (!v.getAttribute('src')) v.src = project.teaser // lazy-load on first use
    v.play().catch(() => {})
  }
  const stop = () => {
    const v = video.current
    if (!v) return
    v.pause()
    v.currentTime = 0
    v.style.opacity = '0'
  }

  useImperativeHandle(ref, () => ({
    get root() { return root.current },
    get face() { return face.current },
    get color() { return color.current },
    get shadow() { return shadow.current },
    play,
    stop,
  }))

  const n = String(index + 1).padStart(2, '0')

  return (
    <a
      ref={root}
      href={`/projects/${project.slug}`}
      draggable={false}
      onClick={(e) => onOpen(e, index)}
      onFocus={() => onFocusCard(index)}
      onPointerEnter={(e) => hoverPlay && e.pointerType === 'mouse' && play()}
      onPointerLeave={(e) => hoverPlay && e.pointerType === 'mouse' && stop()}
      data-cursor="VIEW"
      aria-label={`${project.title} — ${project.category}, ${project.year}. Project ${index + 1} of ${total}`}
      className="wheel-card group absolute left-0 top-0 block select-none outline-none [-webkit-touch-callout:none]"
    >
      <div
        ref={shadow}
        aria-hidden="true"
        className="absolute inset-0 rounded-[var(--radius-card)] shadow-[0_40px_70px_-20px_rgb(26_26_26/0.55)]"
      />
      <div
        ref={face}
        className="relative h-full w-full overflow-hidden rounded-[var(--radius-card)] bg-ink ring-terra ring-offset-4 ring-offset-cream group-focus-visible:ring-2"
      >
        <img src={project.cover} alt="" draggable={false} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover grayscale" />
        <img ref={color} src={project.cover} alt="" draggable={false} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        <video
          ref={video}
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          onPlaying={(e) => (e.currentTarget.style.opacity = '1')}
          className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/0 to-ink/20" />
        <div aria-hidden="true" className="label absolute inset-x-0 top-0 flex justify-between p-3 text-[9px] text-cream/80 sm:p-4">
          <span>{n}</span>
          <span>{project.year}</span>
        </div>
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 p-3 text-cream sm:p-4">
          <p className="label text-[9px] text-cream/70">{project.category}</p>
          <p className="mt-1 font-serif text-lg leading-[1.05] sm:text-2xl">{project.title}</p>
        </div>
      </div>
    </a>
  )
})
