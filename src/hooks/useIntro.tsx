import { createContext, useContext, useState, type ReactNode } from 'react'

const KEY = 'lr-intro-seen'

type IntroState = { showLoader: boolean; revealed: boolean; reveal: () => void }
const IntroCtx = createContext<IntroState>({ showLoader: false, revealed: true, reveal: () => {} })

function readSeen() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** The intro loader plays once per browser session, and only when the session starts on the home page. */
// Decided once per page load (outside React so StrictMode's double render can't flip it)
// Visiting /?intro always shows it again — handy while editing the entry screen.
const FORCE = new URLSearchParams(window.location.search).has('intro')
const SHOW_LOADER = window.location.pathname === '/' && (FORCE || !readSeen())
try {
  sessionStorage.setItem(KEY, '1')
} catch {
  /* private mode */
}

export function IntroProvider({ children }: { children: ReactNode }) {
  const showLoader = SHOW_LOADER
  const [revealed, setRevealed] = useState(!showLoader)
  return <IntroCtx.Provider value={{ showLoader, revealed, reveal: () => setRevealed(true) }}>{children}</IntroCtx.Provider>
}

export const useIntro = () => useContext(IntroCtx)
