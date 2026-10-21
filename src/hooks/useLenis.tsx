import Lenis from 'lenis'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { gsap, ScrollTrigger } from '../lib/gsap'
import { useReducedMotion } from './useMediaQuery'

const LenisContext = createContext<Lenis | null>(null)

export function LenisProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion()
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    if (reduced) return
    const instance = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) })
    instance.on('scroll', ScrollTrigger.update)
    const raf = (time: number) => instance.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
    setLenis(instance)
    return () => {
      gsap.ticker.remove(raf)
      instance.destroy()
      setLenis(null)
    }
  }, [reduced])

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>
}

export const useLenis = () => useContext(LenisContext)

/** Scroll to a selector or y position — via Lenis when active, native otherwise. */
export function scrollToTarget(lenis: Lenis | null, target: string | number, immediate = false) {
  if (lenis) {
    lenis.scrollTo(target as string, { immediate, offset: 0, duration: 1.4, force: true })
    return
  }
  const y = typeof target === 'number' ? target : (document.querySelector(target)?.getBoundingClientRect().top ?? 0) + window.scrollY
  window.scrollTo({ top: y, behavior: immediate ? 'auto' : 'smooth' })
}
