import { useRef, type ReactNode } from 'react'
import { useGsap } from '../../hooks/useGsap'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { gsap } from '../../lib/gsap'

/**
 * Covers its children with a sheet of paper that, when scrolled into view, lifts at the
 * bottom-right corner and rolls itself up to the top — revealing what's underneath.
 */
export function PaperPeel({ children, className = '' }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  useGsap(
    () => {
      if (reduced) return
      const el = root.current!
      const height = () => el.offsetHeight
      gsap
        .timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } })
        // 1 · the corner curls up
        .fromTo('[data-peel-corner]', { scale: 0 }, { scale: 1, duration: 0.45, ease: 'power2.out' })
        // 2 · the sheet rolls up from the bottom: the visible paper shrinks while the roll climbs and thickens
        .addLabel('roll', '-=0.05')
        .to('[data-peel-sheet]', { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'power2.inOut' }, 'roll')
        .fromTo(
          '[data-peel-roll]',
          { y: 0, scaleY: 0.35, rotation: -7, opacity: 1 },
          { y: () => -height(), scaleY: 1, rotation: 0, duration: 1.1, ease: 'power2.inOut' },
          'roll',
        )
        .to('[data-peel-corner]', { scale: 0, duration: 0.25, ease: 'power2.in' }, 'roll')
        // 3 · the finished roll lifts off the page
        .to('[data-peel-roll]', { y: () => -height() - 14, opacity: 0, scale: 0.9, duration: 0.4, ease: 'power2.in' })
    },
    [reduced],
    root,
  )

  return (
    <div ref={root} className={`relative inline-block ${className}`}>
      {children}
      {!reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute -inset-x-3 -inset-y-2">
          {/* the paper sheet */}
          <div
            data-peel-sheet
            className="absolute inset-0 rounded-[3px] bg-[#EEE7DC] shadow-[0_1px_3px_rgb(26_26_26/0.12)]"
            style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          />
          {/* curled corner, bottom right */}
          <span
            data-peel-corner
            className="absolute bottom-0 right-0 h-7 w-7 origin-bottom-right scale-0 bg-[linear-gradient(135deg,transparent_50%,#D8CEBF_50%,#FBF8F3_78%,#E3DACC)] drop-shadow-[-2px_-2px_2px_rgb(26_26_26/0.15)]"
          />
          {/* the roll of paper that travels up */}
          <span
            data-peel-roll
            className="absolute -inset-x-1 bottom-0 h-4 origin-left rounded-full bg-[linear-gradient(to_bottom,#CFC4B3,#FBF8F3_40%,#E9E1D4_65%,#B8AC98)] opacity-0 shadow-[0_3px_5px_-1px_rgb(26_26_26/0.25)]"
          />
        </div>
      )}
    </div>
  )
}
