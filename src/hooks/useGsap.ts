import { useLayoutEffect, type DependencyList, type RefObject } from 'react'
import { gsap } from '../lib/gsap'

/**
 * Runs GSAP code inside a gsap.context scoped to `scope`, and reverts every
 * tween + ScrollTrigger it created on unmount / when deps change.
 */
export function useGsap(
  fn: (ctx: gsap.Context) => void | (() => void),
  deps: DependencyList,
  scope?: RefObject<Element>,
) {
  useLayoutEffect(() => {
    let cleanup: void | (() => void)
    const ctx = gsap.context((self) => {
      cleanup = fn(self)
    }, scope?.current ?? undefined)
    return () => {
      cleanup?.()
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
