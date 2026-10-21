import { AnimatePresence, MotionConfig } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { Cursor } from './components/layout/Cursor'
import { Grain } from './components/layout/Grain'
import { Nav } from './components/layout/Nav'
import { ScrollProgress } from './components/layout/ScrollProgress'
import { SoundEffects, SoundToggle } from './components/layout/Sound'
import { TransitionProvider, usePageTransition } from './components/layout/Transitions'
import { Loader } from './components/sections/Loader'
import { ToastProvider } from './components/ui/Toast'
import { IntroProvider, useIntro } from './hooks/useIntro'
import { LenisProvider, scrollToTarget, useLenis } from './hooks/useLenis'
import { ScrollTrigger } from './lib/gsap'
import Home from './pages/Home'
import ProjectPage from './pages/Project'
import NotFound from './pages/NotFound'

// the CMS is a separate bundle, fetched only when someone opens /login or /admin
const AdminApp = lazy(() => import('./admin/AdminApp'))
const isCmsPath = (path: string) => path === '/login' || path.startsWith('/admin')

function AnimatedRoutes() {
  const location = useLocation()
  const lenis = useLenis()
  const { kind, expanding } = usePageTransition()
  const { revealed } = useIntro()

  return (
    <>
      <a href="#main" className="label sr-only z-[200] bg-ink px-4 py-3 text-cream focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      <Nav hidden={!revealed || expanding} />
      <AnimatePresence
        mode="wait"
        custom={kind}
        onExitComplete={() => {
          scrollToTarget(lenis, 0, true)
          window.scrollTo(0, 0)
          requestAnimationFrame(() => ScrollTrigger.refresh())
        }}
      >
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/projects/:slug" element={<ProjectPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
    </>
  )
}

export default function App() {
  const { pathname } = useLocation()
  if (isCmsPath(pathname)) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-[#F6F3EE]" />}>
        <AdminApp />
      </Suspense>
    )
  }
  return <Site />
}

function Site() {
  return (
    <MotionConfig reducedMotion="user">
    <IntroProvider>
      <LenisProvider>
        <TransitionProvider>
          <ToastProvider>
            <AnimatedRoutes />
            <Loader />
            <ScrollProgress />
            <SoundEffects />
            <SoundToggle />
            <Grain />
            <Cursor />
          </ToastProvider>
        </TransitionProvider>
      </LenisProvider>
    </IntroProvider>
    </MotionConfig>
  )
}
