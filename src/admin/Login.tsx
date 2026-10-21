import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from './api'
import { Button } from './ui'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'Sign in — Portfolio CMS'
    // already signed in → straight to the dashboard
    api.me().then(() => navigate('/admin', { replace: true }), () => {})
  }, [navigate])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.login(username.trim(), password)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-[#F6F3EE] font-sans text-ink lg:grid-cols-[1.1fr_1fr]">
      {/* brand panel */}
      <section className="relative hidden overflow-hidden bg-ink p-12 text-cream lg:flex lg:flex-col lg:justify-between">
        <a href="/" className="label text-cream/60 hover:text-cream">
          ← Back to the site
        </a>
        <div>
          <p className="label mb-6 text-terra">Portfolio CMS</p>
          <h1 className="font-serif text-6xl leading-[0.95] xl:text-7xl">
            Edit your
            <br />
            <span className="italic text-terra">creative world</span>
          </h1>
          <p className="mt-6 max-w-sm text-sm text-cream/60">Projects, texts, images and videos — change them here and they go live on your portfolio as soon as you save.</p>
        </div>
        <p className="label text-cream/40">Lorenzo Reimann · Marketing &amp; Design</p>
        <span aria-hidden="true" className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-cream/10" />
        <span aria-hidden="true" className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-terra/20 blur-2xl" />
      </section>

      {/* form */}
      <section className="flex items-center justify-center px-5 py-16">
        <form onSubmit={submit} className="w-full max-w-sm" noValidate>
          <a href="/" className="label mb-10 inline-block text-stone hover:text-ink lg:hidden">
            ← Back to the site
          </a>
          <h2 className="font-serif text-4xl">Sign in</h2>
          <p className="mt-2 text-sm text-stone">Use your CMS account to manage the portfolio.</p>

          <div className="mt-8 space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-semibold text-ink/80">
                Username
              </label>
              <input
                id="username"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11 w-full rounded-lg border border-[#E2DBD0] bg-white px-3 text-sm focus:border-terra focus:outline-none focus:ring-2 focus:ring-terra/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-ink/80">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-lg border border-[#E2DBD0] bg-white px-3 pr-16 text-sm focus:border-terra focus:outline-none focus:ring-2 focus:ring-terra/20"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-2 my-auto h-7 rounded px-2 text-xs font-medium text-stone hover:text-ink"
                  aria-pressed={show}
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>

          <p role="alert" aria-live="assertive" className="mt-4 min-h-[1.25rem] text-sm text-red-700">
            {error}
          </p>

          <Button type="submit" variant="primary" className="mt-2 h-11 w-full" disabled={busy || !username || !password}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </section>
    </main>
  )
}
