import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Page } from '../components/layout/Transitions'
import { Hero } from '../components/sections/Hero'
import { ContentWheel } from '../components/sections/ContentWheel/ContentWheel'
import { About } from '../components/sections/About'
import { Showreel } from '../components/sections/Showreel'
import { Contact } from '../components/sections/Contact'
import { scrollToTarget, useLenis } from '../hooks/useLenis'
import { ScrollTrigger } from '../lib/gsap'
import { RETURN_KEY } from '../lib/constants'


export default function Home() {
  const location = useLocation()
  const lenis = useLenis()

  // Arriving from a nav link on another page, or returning from a project.
  // Read once on mount (state initialiser) so StrictMode's double effect can't lose it.
  const [target] = useState<string | undefined>(() => {
    const fromState = (location.state as { scrollTo?: string } | null)?.scrollTo
    try {
      return fromState ?? sessionStorage.getItem(RETURN_KEY) ?? undefined
    } catch {
      return fromState
    }
  })
  useEffect(() => {
    try {
      sessionStorage.removeItem(RETURN_KEY)
    } catch {
      /* ignore */
    }
    if (!target) return
    const t = window.setTimeout(() => {
      ScrollTrigger.refresh()
      scrollToTarget(lenis, target, true)
    }, 80)
    return () => window.clearTimeout(t)
  }, [target, lenis])

  useEffect(() => {
    document.title = 'Lorenzo Reimann — Marketing & Design'
  }, [])

  return (
    <Page>
      <Hero />
      <ContentWheel />
      <About />
      <Showreel />
      <Contact />
    </Page>
  )
}
