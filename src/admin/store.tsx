import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { applyContent, snapshot, type EditableContent } from '../content/runtime'
import { api } from './api'

type Store = {
  draft: EditableContent
  /** Mutate a copy of the draft: update((d) => { d.contact.email = '…' }) */
  update: (fn: (draft: EditableContent) => void) => void
  dirty: boolean
  saving: boolean
  savedAt: string | null
  save: () => Promise<void>
  discard: () => void
  error: string | null
}

const Ctx = createContext<Store | null>(null)

export function useCms() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useCms outside ContentStore')
  return v
}

/** Normalise derived fields before saving. */
function prepare(d: EditableContent): EditableContent {
  const out = structuredClone(d)
  out.contact.phoneHref = `tel:${out.contact.phone.replace(/[^\d+]/g, '')}`
  return out
}

export function ContentStore({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<EditableContent>(() => snapshot())
  const [draft, setDraft] = useState<EditableContent>(() => snapshot())
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // start from what is on the server right now (another tab may have saved since the page loaded)
  useEffect(() => {
    api
      .content()
      .then((c) => {
        applyContent(c)
        const fresh = snapshot()
        setSaved(fresh)
        setDraft(fresh)
      })
      .catch(() => {})
  }, [])

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved])

  // warn before leaving the page with unsaved changes
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const update = useCallback((fn: (d: EditableContent) => void) => {
    setDraft((d) => {
      const next = structuredClone(d)
      fn(next)
      return next
    })
  }, [])

  const save = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      const ready = prepare(draft)
      const res = await api.save(ready)
      applyContent(ready)
      setSaved(ready)
      setDraft(ready)
      setSavedAt(res.savedAt)
    } catch (e) {
      setError((e as Error).message)
      throw e
    } finally {
      setSaving(false)
    }
  }, [draft])

  const discard = useCallback(() => setDraft(structuredClone(saved)), [saved])

  const value = useMemo(
    () => ({ draft, update, dirty, saving, savedAt, save, discard, error }),
    [draft, update, dirty, saving, savedAt, save, discard, error],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
