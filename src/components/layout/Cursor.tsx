import { useEffect, useRef, useState } from 'react'
import { gsap } from '../../lib/gsap'
import { useIsTouch } from '../../hooks/useMediaQuery'

type Mode = 'default' | 'link' | 'label'

/**
 * Dot + trailing ring. Elements opt into a label with data-cursor="VIEW" etc.
 * Links/buttons grow the ring. Not rendered on touch devices.
 */
export function Cursor() {
  const isTouch = useIsTouch()
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>('default')
  const [label, setLabel] = useState('')
  const [visible, setVisible] = useState(false)
  const [pressed, setPressed] = useState(false)

  useEffect(() => {
    if (isTouch) return
    const root = document.documentElement
    root.classList.add('has-cursor')

    const dotX = gsap.quickSetter(dot.current, 'x', 'px')
    const dotY = gsap.quickSetter(dot.current, 'y', 'px')
    const ringX = gsap.quickTo(ring.current, 'x', { duration: 0.5, ease: 'power3.out' })
    const ringY = gsap.quickTo(ring.current, 'y', { duration: 0.5, ease: 'power3.out' })
    const bubX = gsap.quickTo(bubble.current, 'x', { duration: 0.35, ease: 'power3.out' })
    const bubY = gsap.quickTo(bubble.current, 'y', { duration: 0.35, ease: 'power3.out' })

    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      dotX(e.clientX)
      dotY(e.clientY)
      ringX(e.clientX)
      ringY(e.clientY)
      bubX(e.clientX)
      bubY(e.clientY)
      setVisible(true)
    }
    const over = (e: PointerEvent) => {
      const t = e.target as Element | null
      const labelled = t?.closest<HTMLElement>('[data-cursor]')
      if (labelled && labelled.dataset.cursor) {
        setMode('label')
        setLabel(labelled.dataset.cursor)
        return
      }
      if (t?.closest('a, button, [role="button"], input, textarea, select, label')) {
        setMode('link')
        return
      }
      setMode('default')
    }
    const leaveWindow = (e: PointerEvent) => {
      if (!e.relatedTarget) setVisible(false)
    }
    const down = () => setPressed(true)
    const up = () => setPressed(false)

    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerout', leaveWindow)
    window.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    return () => {
      root.classList.remove('has-cursor')
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerout', leaveWindow)
      window.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
    }
  }, [isTouch])

  // Labels can change while hovering (e.g. PLAY → PAUSE)
  useEffect(() => {
    if (isTouch) return
    const obs = new MutationObserver(() => {
      const el = document.querySelectorAll(':hover')
      const last = el[el.length - 1]?.closest<HTMLElement>('[data-cursor]')
      if (last?.dataset.cursor) setLabel(last.dataset.cursor)
    })
    obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-cursor'] })
    return () => obs.disconnect()
  }, [isTouch])

  if (isTouch) return null

  const ringScale = mode === 'link' ? 1.7 : mode === 'label' ? 0 : 1
  const press = pressed ? 0.8 : 1

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[100]" style={{ opacity: visible ? 1 : 0, transition: 'opacity .3s' }}>
      <div className="mix-blend-difference">
        <div ref={ring} className="fixed left-0 top-0 will-change-transform">
          <div
            className="-ml-[18px] -mt-[18px] h-9 w-9 rounded-full border border-cream transition-transform duration-500 ease-expo"
            style={{ transform: `scale(${ringScale * press})` }}
          />
        </div>
        <div ref={dot} className="fixed left-0 top-0 will-change-transform">
          <div
            className="-ml-[3px] -mt-[3px] h-1.5 w-1.5 rounded-full bg-cream transition-transform duration-300"
            style={{ transform: `scale(${mode === 'label' ? 0 : 1})` }}
          />
        </div>
      </div>
      <div ref={bubble} className="fixed left-0 top-0 will-change-transform">
        <div
          className="label -ml-11 -mt-11 flex h-[88px] w-[88px] items-center justify-center rounded-full bg-terra text-[10px] font-semibold text-cream transition-[transform,opacity] duration-500 ease-expo"
          style={{ transform: `scale(${mode === 'label' ? press : 0.2})`, opacity: mode === 'label' ? 1 : 0 }}
        >
          {label}
        </div>
      </div>
    </div>
  )
}
