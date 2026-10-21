import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { api } from './api'
import { useCms } from './store'
import { Button, cx, ExternalIcon } from './ui'

const NAV = [
  { to: '/admin', label: 'Overview', end: true, icon: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z' },
  { to: '/admin/projects', label: 'Projects', icon: 'M4 6h16v12H4zM4 10h16M9 6v12' },
  { to: '/admin/about', label: 'About & Skills', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' },
  { to: '/admin/contact', label: 'Contact', icon: 'M4 6h16v12H4zM4 7l8 6 8-6' },
  { to: '/admin/general', label: 'General', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2-1-1-3-2 .5-1.5-1.5.5-2-3-1-1 2h-2l-1-2-3 1 .5 2L6 7.5 4 7 3 10l2 1v2l-2 1 1 3 2-.5 1.5 1.5-.5 2 3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z' },
]

function NavIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}

/** Sidebar + sticky save bar around every CMS screen. */
export default function Layout({ username }: { username: string }) {
  const { dirty, saving, save, discard, error, savedAt } = useCms()
  const navigate = useNavigate()
  const [flash, setFlash] = useState(false)

  const doSave = async () => {
    try {
      await save()
      setFlash(true)
      window.setTimeout(() => setFlash(false), 2400)
    } catch {
      /* error shown in the bar */
    }
  }

  // ⌘S / Ctrl+S saves
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty && !saving) void doSave()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const logout = async () => {
    if (dirty && !window.confirm('You have unsaved changes. Log out anyway?')) return
    await api.logout().catch(() => {})
    navigate('/login', { replace: true })
  }

  const status = error ? (
    <span className="text-red-700">Couldn’t save: {error}</span>
  ) : dirty ? (
    <span className="flex items-center gap-2 text-ink">
      <span className="h-2 w-2 rounded-full bg-terra" /> Unsaved changes
    </span>
  ) : flash ? (
    <span className="flex items-center gap-2 text-emerald-700">✓ Saved — live on the site</span>
  ) : (
    <span className="text-stone">{savedAt ? `Last saved ${new Date(savedAt).toLocaleTimeString()}` : 'All changes saved'}</span>
  )

  return (
    <div className="min-h-screen bg-[#F6F3EE] font-sans text-ink md:grid md:grid-cols-[248px_1fr]">
      {/* sidebar */}
      <aside className="sticky top-0 z-20 flex flex-col bg-ink text-cream md:h-screen">
        <div className="flex items-center justify-between gap-3 px-5 py-4 md:py-6">
          <a href="/" className="flex items-center gap-3" title="View site">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-terra font-serif text-sm">LR</span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">Portfolio CMS</span>
              <span className="block text-[11px] text-cream/50">lorenzoreimann</span>
            </span>
          </a>
        </div>
        <nav aria-label="CMS" className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:pb-0">
          <p className="label mb-2 hidden px-3 text-[10px] text-cream/40 md:block">Content</p>
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cx(
                  'flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive ? 'bg-cream/10 text-cream' : 'text-cream/60 hover:bg-cream/5 hover:text-cream',
                )
              }
            >
              <NavIcon d={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-cream/10 p-3 md:block">
          <a href="/" target="_blank" rel="noopener" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-cream/60 hover:bg-cream/5 hover:text-cream">
            <ExternalIcon /> View site
          </a>
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg px-3 py-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cream/10 text-[11px] uppercase">{username.slice(0, 2)}</span>
              <span className="truncate text-xs text-cream/70">{username}</span>
            </span>
            <button type="button" onClick={logout} className="text-xs text-cream/50 hover:text-cream">
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-col">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-[#E7E1D7] bg-[#F6F3EE]/90 px-5 py-3 backdrop-blur md:px-10">
          <div className="min-w-0 truncate text-sm">{status}</div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={logout} className="text-xs text-stone hover:text-ink md:hidden">
              Log out
            </button>
            <Button variant="ghost" size="sm" onClick={discard} disabled={!dirty || saving}>
              Discard
            </Button>
            <Button variant="primary" size="sm" onClick={doSave} disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save changes'}
              <kbd className="hidden rounded bg-white/20 px-1 text-[10px] font-normal lg:inline">⌘S</kbd>
            </Button>
          </div>
        </div>
        <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-8 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
