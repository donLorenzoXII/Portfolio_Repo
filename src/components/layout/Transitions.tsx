import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

type TransitionKind = 'none' | 'curtain' | 'expand'

type ExpandState = { rect: DOMRect; cover: string; hero: string; done: () => void }

type Ctx = {
  kind: TransitionKind
  setKind: (k: TransitionKind) => void
  /** Grow a card into a full-viewport header, then call `done` (usually navigate). */
  expandFrom: (s: ExpandState) => void
  /** Called by the destination page once its header media is in place. */
  releaseExpand: () => void
  expanding: boolean
}

const TransitionCtx = createContext<Ctx>({
  kind: 'none',
  setKind: () => {},
  expandFrom: () => {},
  releaseExpand: () => {},
  expanding: false,
})
export const usePageTransition = () => useContext(TransitionCtx)

const easeInOut = [0.76, 0, 0.24, 1] as const

export function TransitionProvider({ children }: { children: ReactNode }) {
  const [kind, setKind] = useState<TransitionKind>('none')
  const [expand, setExpand] = useState<ExpandState | null>(null)
  const [held, setHeld] = useState(false)
  const releaseTimer = useRef<number>()

  const expandFrom = useCallback((s: ExpandState) => {
    setKind('expand')
    setHeld(true)
    setExpand(s)
    // safety: never leave the overlay stuck
    window.clearTimeout(releaseTimer.current)
    releaseTimer.current = window.setTimeout(() => setHeld(false), 4000)
  }, [])

  const releaseExpand = useCallback(() => {
    window.clearTimeout(releaseTimer.current)
    setHeld(false)
  }, [])

  const value = useMemo(
    () => ({ kind, setKind, expandFrom, releaseExpand, expanding: !!expand && held }),
    [kind, expandFrom, releaseExpand, expand, held],
  )

  return (
    <TransitionCtx.Provider value={value}>
      {children}
      <AnimatePresence onExitComplete={() => setExpand(null)}>
        {expand && held && <ExpandOverlay key="expand" state={expand} />}
      </AnimatePresence>
    </TransitionCtx.Provider>
  )
}

function ExpandOverlay({ state }: { state: ExpandState }) {
  const { rect, cover, hero, done } = state
  const vw = window.innerWidth
  const vh = window.innerHeight
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed z-[85] overflow-hidden bg-ink"
      initial={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height, borderRadius: 14 }}
      animate={{ top: 0, left: 0, width: vw, height: vh, borderRadius: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeOut' } }}
      transition={{ duration: 0.95, ease: easeInOut }}
      onAnimationComplete={(def) => {
        // only fire for the expand animation, not the exit fade
        if (typeof def === 'object' && def && 'top' in def) done()
      }}
    >
      <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <motion.img
        src={hero}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.45 }}
      />
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/10 to-ink/30"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
    </motion.div>
  )
}

/** Page wrapper: curtain wipe in/out, or nothing when a card expand is running. */
export function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  const { kind, setKind } = usePageTransition()
  // Once this page has mounted with whatever transition brought it here,
  // default every following navigation (incl. browser back) to the curtain.
  useEffect(() => {
    const t = window.setTimeout(() => setKind('curtain'), 60)
    return () => window.clearTimeout(t)
  }, [setKind])
  return (
    <motion.main
      id="main"
      className={className}
      custom={kind}
      initial="initial"
      animate="enter"
      exit="exit"
      variants={{
        initial: { opacity: 1 },
        enter: { opacity: 1 },
        exit: (k: TransitionKind) => ({ opacity: 1, transition: { duration: k === 'curtain' ? 0.7 : 0 } }),
      }}
    >
      {children}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[80] bg-ink"
        custom={kind}
        variants={{
          initial: (k: TransitionKind) => ({ scaleY: k === 'curtain' ? 1 : 0, transformOrigin: '50% 0%' }),
          enter: { scaleY: 0, transformOrigin: '50% 0%', transition: { duration: 0.8, ease: easeInOut, delay: 0.1 } },
          exit: (k: TransitionKind) =>
            k === 'curtain'
              ? { scaleY: 1, transformOrigin: '50% 100%', transition: { duration: 0.7, ease: easeInOut } }
              : { scaleY: 0, transition: { duration: 0 } },
        }}
      />
    </motion.main>
  )
}
