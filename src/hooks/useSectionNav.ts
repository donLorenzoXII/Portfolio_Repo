import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { scrollToTarget, useLenis } from './useLenis'

/** Navigate to a home-page section from anywhere (scrolls, or routes home first). */
export function useSectionNav() {
  const lenis = useLenis()
  const location = useLocation()
  const navigate = useNavigate()
  return useCallback(
    (hash: string) => {
      if (location.pathname === '/') scrollToTarget(lenis, hash)
      else navigate('/', { state: { scrollTo: hash } })
    },
    [lenis, location.pathname, navigate],
  )
}
