import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { loginLink, nav, site } from '../../content/site'
import { contact } from '../../content/contact'
import { useLenis } from '../../hooks/useLenis'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { useSectionNav } from '../../hooks/useSectionNav'

const ease = [0.65, 0, 0.35, 1] as const
const easeOut = [0.22, 1, 0.36, 1] as const

/**
 * Fixed navigation. On the hero (home, top of page) the links are shown in full;
 * everywhere else they fold into a burger that opens a full-screen menu panel.
 */
export function Nav({ hidden = false }: { hidden?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  const [open, setOpen] = useState(false)
  const desktop = useMediaQuery('(min-width: 768px)')
  const goTo = useSectionNav()
  const lenis = useLenis()
  const location = useLocation()
  const burger = useRef<HTMLButtonElement>(null)
  const firstLink = useRef<HTMLAnchorElement>(null)
  const viaKeyboard = useRef(false)

  const onHome = location.pathname === '/'
  const collapsed = !desktop || !onHome || pastHero

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60)
      setPastHero(window.scrollY > window.innerHeight * 0.55)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.pathname])

  useEffect(() => setOpen(false), [location.pathname])

  useEffect(() => {
    if (!open) return
    lenis?.stop()
    document.documentElement.style.overflow = 'hidden'
    // move focus into the menu only for keyboard users (avoids a stray focus ring on mouse clicks)
    const t = window.setTimeout(() => viaKeyboard.current && firstLink.current?.focus({ preventScroll: true }), 500)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      lenis?.start()
      document.documentElement.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      burger.current?.focus({ preventScroll: true })
    }
  }, [open, lenis])

  const click = (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    const wasOpen = open
    setOpen(false)
    // let the panel close before scrolling
    window.setTimeout(() => goTo(href), wasOpen ? 600 : 0)
  }

  return (
    <>
      <motion.header
        initial={false}
        animate={{ y: hidden ? '-110%' : '0%' }}
        transition={{ duration: 0.6, ease }}
        className="container-x fixed inset-x-0 top-0 z-[77] flex h-[var(--nav-h)] items-center justify-between text-cream mix-blend-difference"
      >
        {/* wordmark: only at the top of the page (and while the menu is open) */}
        <motion.div
          initial={false}
          animate={scrolled && !open ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease }}
          style={{ pointerEvents: scrolled && !open ? 'none' : 'auto' }}
        >
          <Link
            to="/"
            className="group flex items-baseline gap-2"
            aria-label={`${site.name} — ${site.navTitle}, home`}
            tabIndex={scrolled && !open ? -1 : 0}
            onClick={(e) => onHome && click(e, '#top')}
          >
            <span className="font-serif text-xl leading-none tracking-tight md:text-2xl">{site.navTitle}</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cream transition-transform duration-500 group-hover:scale-150" />
          </Link>
        </motion.div>

        <div className="relative flex items-center">
          {/* full links on the hero — fade up and out when they fold into the burger */}
          <nav aria-label="Primary" className="hidden md:block" aria-hidden={collapsed}>
            <ul className="flex items-center gap-10">
              {nav.map((item, i) => {
                const order = collapsed ? nav.length - 1 - i : i // fold right-to-left, unfold left-to-right
                return (
                  <motion.li
                    key={item.href}
                    initial={false}
                    animate={collapsed ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease, delay: order * 0.04 + (collapsed ? 0 : 0.2) }}
                    style={{ pointerEvents: collapsed ? 'none' : 'auto' }}
                  >
                    <a href={item.href} onClick={(e) => click(e, item.href)} className="label link-draw" tabIndex={collapsed ? -1 : 0}>
                      <span className="mr-1.5 opacity-60">0{i + 1}</span>
                      {item.label}
                    </a>
                  </motion.li>
                )
              })}
              <motion.li
                initial={false}
                animate={collapsed ? { opacity: 0, y: -6 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease, delay: collapsed ? 0 : 0.2 + nav.length * 0.04 }}
                style={{ pointerEvents: collapsed ? 'none' : 'auto' }}
              >
                <Link to={loginLink.to} className="label link-draw flex items-center gap-1.5 opacity-70 hover:opacity-100" tabIndex={collapsed ? -1 : 0}>
                  <LockIcon />
                  {loginLink.label}
                </Link>
              </motion.li>
            </ul>
          </nav>

          {/* burger → × */}
          <motion.button
            ref={burger}
            type="button"
            onClick={(e) => {
              viaKeyboard.current = e.detail === 0 // Enter/Space fire a click with detail 0
              setOpen((o) => !o)
            }}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            initial={false}
            animate={collapsed || open ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.35, ease, delay: collapsed && !open ? 0.2 : 0 }}
            style={{ pointerEvents: collapsed || open ? 'auto' : 'none' }}
            tabIndex={collapsed || open ? 0 : -1}
            className="-mr-3 flex h-12 items-center gap-3 px-3 md:absolute md:-right-3 md:mr-0"
          >
            <span className="label hidden w-12 overflow-hidden text-right sm:block">
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={open ? 'close' : 'menu'}
                  className="block"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease }}
                >
                  {open ? 'Close' : 'Menu'}
                </motion.span>
              </AnimatePresence>
            </span>
            <span className="relative block h-4 w-7" aria-hidden="true">
              {[-1, 1].map((dir) => (
                <motion.span
                  key={dir}
                  className="absolute left-0 top-1/2 -mt-[0.75px] block h-[1.5px] w-full bg-current"
                  initial={false}
                  animate={
                    open
                      ? { y: 0, rotate: dir * 45, scaleX: 1 }
                      : collapsed
                        ? { y: dir * 4, rotate: 0, scaleX: 1 }
                        : { y: dir * 4, rotate: 0, scaleX: 0 }
                  }
                  transition={{ duration: 0.45, ease, delay: collapsed && !open && !hidden ? 0.15 : 0 }}
                />
              ))}
            </span>
          </motion.button>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            id="site-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="container-x fixed inset-0 z-[75] flex flex-col bg-ink pt-[var(--nav-h)] text-cream will-change-transform"
            initial={{ y: '-100%' }}
            animate={{ y: '0%', transition: { duration: 0.7, ease } }}
            exit={{ y: '-100%', transition: { duration: 0.6, ease, delay: 0.1 } }}
          >
            <ul className="mt-6 flex flex-1 flex-col justify-center md:mt-0">
              {nav.map((item, i) => (
                <motion.li
                  key={item.href}
                  className="border-t border-cream/15 py-3 md:py-4"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut, delay: 0.35 + i * 0.06 } }}
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                >
                  <a
                    ref={i === 0 ? firstLink : undefined}
                    href={item.href}
                    onClick={(e) => click(e, item.href)}
                    className="group flex items-baseline gap-5 font-serif text-[13vw] leading-[1.05] transition-colors duration-300 hover:text-terra sm:text-7xl md:text-8xl"
                  >
                    <span className="font-sans text-xs tracking-label text-terra">0{i + 1}</span>
                    <span className="transition-transform duration-500 ease-expo group-hover:translate-x-3">{item.label}</span>
                  </a>
                </motion.li>
              ))}
              <motion.li
                className="border-t border-cream/15 py-3 md:py-4"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut, delay: 0.35 + nav.length * 0.06 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <Link
                  to={loginLink.to}
                  onClick={() => setOpen(false)}
                  className="group flex items-baseline gap-5 font-serif text-[13vw] leading-[1.05] text-cream/55 transition-colors duration-300 hover:text-terra sm:text-7xl md:text-8xl"
                >
                  <span className="font-sans text-xs tracking-label text-terra">0{nav.length + 1}</span>
                  <span className="flex items-baseline gap-4 transition-transform duration-500 ease-expo group-hover:translate-x-3">
                    {loginLink.label}
                    <span className="self-center">
                      <LockIcon size={22} />
                    </span>
                  </span>
                </Link>
              </motion.li>
            </ul>
            <motion.div
              className="label flex flex-wrap justify-between gap-x-6 gap-y-2 border-t border-cream/15 py-6 text-cream/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.6 } }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <a href={`mailto:${contact.email}`} className="normal-case tracking-normal hover:text-cream">
                {contact.email}
              </a>
              <span>
                {site.role} — {site.location}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}
