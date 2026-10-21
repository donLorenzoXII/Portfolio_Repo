import { useRef, type ReactNode } from 'react'
import { contact } from '../../content/contact'
import { footer, site } from '../../content/site'
import { useGsap } from '../../hooks/useGsap'
import { scrollToTarget, useLenis } from '../../hooks/useLenis'
import { useReducedMotion } from '../../hooks/useMediaQuery'
import { gsap } from '../../lib/gsap'
import { Arrow, CopyIcon, InstagramIcon, LinkedInIcon, MailIcon, PhoneIcon, PinIcon } from '../ui/Icons'
import { Magnetic } from '../ui/Magnetic'
import { SplitChars } from '../ui/SplitLines'
import { useToast } from '../ui/Toast'

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    return ok
  }
}

function Row({ icon, label, children, action }: { icon: ReactNode; label: string; children: ReactNode; action?: ReactNode }) {
  return (
    <li data-row className="grid grid-cols-[28px_1fr_auto] items-center gap-4 border-t border-cream/15 py-5 md:grid-cols-[40px_160px_1fr_auto] md:py-6">
      <span className="text-terra">{icon}</span>
      <span className="label hidden text-cream/50 md:block">{label}</span>
      <div className="min-w-0 truncate text-base md:text-xl">{children}</div>
      {action}
    </li>
  )
}

export function Contact({ compact = false }: { compact?: boolean }) {
  const root = useRef<HTMLElement>(null)
  const toast = useToast()
  const lenis = useLenis()
  const reduced = useReducedMotion()

  useGsap(
    () => {
      if (reduced) return
      // content rises out of the dark as the footer scrolls in
      gsap.fromTo(
        '[data-footer-inner]',
        { yPercent: -18, opacity: 0.2 },
        { yPercent: 0, opacity: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 25%', scrub: 0.6 } },
      )
      gsap.from('[data-char]', {
        yPercent: 110,
        opacity: 0,
        duration: 1,
        stagger: 0.025,
        ease: 'expo.out',
        scrollTrigger: { trigger: '[data-headline]', start: 'top 80%' },
      })
      gsap.from('[data-row]', {
        opacity: 0,
        y: 24,
        duration: 1,
        stagger: 0.07,
        scrollTrigger: { trigger: '[data-rows]', start: 'top 85%' },
      })
    },
    [reduced],
    root,
  )

  const copyEmail = async () => {
    const ok = await copy(contact.email)
    toast(ok ? 'Email copied to clipboard' : contact.email)
  }

  return (
    <footer ref={root} id="contact" className={`relative overflow-hidden bg-ink text-cream ${compact ? 'pt-20 md:pt-28' : 'mt-24 pt-24 md:mt-40 md:pt-40'}`}>
      <div className="container-x will-change-transform" data-footer-inner>
        <p className="label mb-10 flex items-center gap-3 text-cream/70">
          <span className="num text-sm">{compact ? '—' : '04'}</span>
          <span className="h-px w-10 bg-cream/30" />
          {footer.label}
        </p>

        <h2 data-headline aria-label={`${footer.headline.lead} ${footer.headline.accent}`} className="font-serif text-[length:var(--fs-h1)] leading-[0.9] tracking-[-0.02em]">
          <SplitChars text={footer.headline.lead} className="block" />
          <SplitChars text={footer.headline.accent} className="block italic text-terra" />
        </h2>

        <div className="mt-10 flex flex-col gap-8 md:mt-14 md:flex-row md:items-center md:justify-between">
          <p className="max-w-md text-cream/60">{footer.sub}</p>
          <Magnetic>
            <a
              href={`mailto:${contact.email}`}
              className="label inline-flex items-center rounded-full border border-cream/30 px-8 py-4 transition-colors duration-500 hover:border-terra hover:bg-terra"
            >
              Start a project
            </a>
          </Magnetic>
        </div>

        <ul data-rows className="mt-16 border-b border-cream/15 md:mt-24">
          <Row
            icon={<MailIcon />}
            label="Email"
            action={
              <button
                type="button"
                onClick={copyEmail}
                className="label flex items-center gap-2 rounded-full px-3 py-2 text-cream/70 hover:text-cream"
                aria-label={`Copy email address ${contact.email}`}
              >
                <CopyIcon size={16} /> <span className="hidden sm:inline">Copy</span>
              </button>
            }
          >
            <button type="button" onClick={copyEmail} className="link-draw text-left" data-cursor="COPY">
              {contact.email}
            </button>
          </Row>
          <Row icon={<PhoneIcon />} label="Phone">
            <a href={contact.phoneHref} className="link-draw">
              {contact.phone}
            </a>
          </Row>
          <Row icon={<PinIcon />} label="Location">
            {contact.location}
          </Row>
          {contact.socials.map((s) => (
            <Row
              key={s.label}
              icon={s.label === 'LinkedIn' ? <LinkedInIcon /> : <InstagramIcon />}
              label={s.label}
              action={
                <Magnetic strength={0.5}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${s.label} (opens in a new tab)`}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-cream/25 transition-colors duration-500 hover:border-terra hover:bg-terra md:h-12 md:w-12"
                  >
                    <Arrow direction="up-right" className="w-6" />
                  </a>
                </Magnetic>
              }
            >
              <a href={s.href} target="_blank" rel="noopener noreferrer" className="link-draw">
                {s.handle}
              </a>
            </Row>
          ))}
        </ul>

        <div className="label flex flex-col gap-4 py-8 text-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p className="hidden md:block">Designed &amp; built in {site.location}</p>
          <button type="button" onClick={() => scrollToTarget(lenis, 0)} className="link-draw self-start text-cream sm:self-auto">
            Back to top ↑
          </button>
        </div>
      </div>
    </footer>
  )
}
