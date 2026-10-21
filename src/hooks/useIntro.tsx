import { createContext, useContext, useState, type ReactNode } from 'react'

type IntroState = { showLoader: boolean; revealed: boolean; reveal: () => void }
const IntroCtx = createContext<IntroState>({ showLoader: false, revealed: true, reveal: () => {} })

/**
 * The entry screen ("Dive into my creative world") shows every time the home page is loaded.
 * Moving between pages inside the site doesn't bring it back — it's decided once per page load.
 */
const SHOW_LOADER = window.location.pathname === '/'

export function IntroProvider({ children }: { children: ReactNode }) {
  const showLoader = SHOW_LOADER
  const [revealed, setRevealed] = useState(!showLoader)
  return <IntroCtx.Provider value={{ showLoader, revealed, reveal: () => setRevealed(true) }}>{children}</IntroCtx.Provider>
}

export const useIntro = () => useContext(IntroCtx)
