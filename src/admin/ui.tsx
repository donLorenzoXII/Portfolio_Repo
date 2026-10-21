// Building blocks for the CMS screens: cards, fields, repeaters and the media picker.
import { useId, useRef, useState, type ReactNode } from 'react'
import { api } from './api'

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

/* ───────── layout ───────── */

export function PageHeader({ title, description, crumbs, actions }: { title: string; description?: string; crumbs?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {crumbs && <div className="mb-2 text-xs text-stone">{crumbs}</div>}
        <h1 className="font-serif text-3xl leading-tight md:text-4xl">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm text-stone">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, description, children, aside }: { title?: string; description?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E7E1D7] bg-white shadow-[0_1px_2px_rgb(26_26_26/0.04)]">
      {(title || aside) && (
        <header className="flex items-start justify-between gap-4 border-b border-[#EFEAE2] px-5 py-4 md:px-6">
          <div>
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-stone">{description}</p>}
          </div>
          {aside}
        </header>
      )}
      <div className="space-y-5 px-5 py-5 md:px-6">{children}</div>
    </section>
  )
}

export const Grid = ({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 }) => (
  <div className={cx('grid gap-5', cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3')}>{children}</div>
)

/* ───────── buttons ───────── */

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' }
export function Button({ variant = 'secondary', size = 'md', className, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terra/50 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variant === 'primary' && 'bg-terra text-white hover:bg-[#b5542f]',
        variant === 'secondary' && 'border border-[#E2DBD0] bg-white text-ink hover:bg-[#F7F4EF]',
        variant === 'ghost' && 'text-stone hover:bg-[#F1ECE4] hover:text-ink',
        variant === 'danger' && 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
        className,
      )}
    />
  )
}

export function IconButton({ label, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className="grid h-8 w-8 place-items-center rounded-md text-stone transition-colors hover:bg-[#F1ECE4] hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  )
}

/* ───────── fields ───────── */

const inputCls =
  'w-full rounded-lg border border-[#E2DBD0] bg-white px-3 py-2 text-sm text-ink placeholder:text-[#B7AFA4] transition-shadow focus:border-terra focus:outline-none focus:ring-2 focus:ring-terra/20'

function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-ink/80">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-stone">{hint}</p>}
    </div>
  )
}

export function TextInput({ label, hint, value, onChange, ...rest }: { label: string; hint?: string; value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <input id={id} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={inputCls} {...rest} />
    </Field>
  )
}

export function TextArea({ label, hint, value, onChange, rows = 4, ...rest }: { label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'>) {
  const id = useId()
  return (
    <Field label={label} hint={hint} htmlFor={id}>
      <textarea id={id} rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)} className={cx(inputCls, 'resize-y leading-relaxed')} {...rest} />
    </Field>
  )
}

/** One line of text per entry (e.g. headline lines). */
export function LinesInput({ label, hint, value, onChange }: { label: string; hint?: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <TextArea
      label={label}
      hint={hint ?? 'One line per row.'}
      rows={Math.max(2, value.length)}
      value={value.join('\n')}
      onChange={(v) => onChange(v.split('\n'))}
    />
  )
}

/** Paragraphs separated by an empty line. */
export function ParagraphsInput({ label, hint, value, onChange }: { label: string; hint?: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <TextArea
      label={label}
      hint={hint ?? 'Leave an empty line between paragraphs.'}
      rows={8}
      value={value.join('\n\n')}
      onChange={(v) => onChange(v.split(/\n\s*\n/))}
    />
  )
}

export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={inputCls}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id}>
      <div className="flex items-center gap-3">
        <input id={id} type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-1.5 flex-1 cursor-pointer accent-terra" />
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Math.max(0, Math.min(100, Number(e.target.value))))}
          aria-label={`${label} (number)`}
          className={cx(inputCls, 'w-16 text-right tabular-nums')}
        />
      </div>
    </Field>
  )
}

/* ───────── repeater ───────── */

export function Repeater<T>({
  items,
  onChange,
  render,
  create,
  addLabel,
  itemLabel,
}: {
  items: T[]
  onChange: (items: T[]) => void
  render: (item: T, set: (next: T) => void, index: number) => ReactNode
  create: () => T
  addLabel: string
  itemLabel: (item: T, index: number) => string
}) {
  const move = (from: number, to: number) => {
    const next = [...items]
    next.splice(to, 0, next.splice(from, 1)[0])
    onChange(next)
  }
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-[#EFEAE2] bg-[#FBFAF7] p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="truncate text-xs font-semibold text-stone">
              <span className="mr-2 text-terra">{String(i + 1).padStart(2, '0')}</span>
              {itemLabel(item, i)}
            </span>
            <div className="flex items-center">
              <IconButton label="Move up" disabled={i === 0} onClick={() => move(i, i - 1)}>
                <Chevron dir="up" />
              </IconButton>
              <IconButton label="Move down" disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                <Chevron dir="down" />
              </IconButton>
              <IconButton label="Remove" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <TrashIcon />
              </IconButton>
            </div>
          </div>
          {render(item, (next) => onChange(items.map((x, j) => (j === i ? next : x))), i)}
        </div>
      ))}
      <Button variant="secondary" size="sm" onClick={() => onChange([...items, create()])}>
        <PlusIcon /> {addLabel}
      </Button>
    </div>
  )
}

/* ───────── media picker ───────── */

export function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url)
}

export function MediaInput({
  label,
  hint,
  value,
  onChange,
  accept = 'image',
  aspect = 'aspect-video',
}: {
  label: string
  hint?: string
  value: string
  onChange: (url: string, type: 'image' | 'video') => void
  accept?: 'image' | 'video' | 'any'
  aspect?: string
}) {
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const mime = accept === 'image' ? 'image/*' : accept === 'video' ? 'video/*' : 'image/*,video/*'

  const send = async (file?: File) => {
    if (!file) return
    setError(null)
    setProgress(0)
    try {
      const res = await api.upload(file, setProgress)
      onChange(res.url, res.type)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setProgress(null)
    }
  }

  return (
    <Field label={label} hint={hint}>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void send(e.dataTransfer.files[0])
        }}
        className={cx(
          'group relative overflow-hidden rounded-xl border border-dashed bg-[#F7F4EF] transition-colors',
          aspect,
          over ? 'border-terra bg-terra/5' : 'border-[#DCD4C8]',
        )}
      >
        {value ? (
          isVideo(value) ? (
            <video src={value} muted loop autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-stone hover:text-ink">
            <UploadIcon />
            <span className="text-xs font-medium">Drop a file or click to upload</span>
            <span className="text-[11px] text-stone/80">{accept === 'video' ? 'MP4 or WebM' : accept === 'image' ? 'JPG, PNG, WebP or AVIF' : 'Image or video'}</span>
          </button>
        )}
        {value && (
          <div className="absolute inset-x-2 bottom-2 flex justify-end gap-1.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
            <Button size="sm" onClick={() => input.current?.click()}>
              Replace
            </Button>
            <Button size="sm" variant="danger" onClick={() => onChange('', 'image')}>
              Remove
            </Button>
          </div>
        )}
        {progress !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 backdrop-blur-sm">
            <span className="text-xs font-medium">Uploading… {Math.round(progress * 100)}%</span>
            <span className="h-1 w-2/3 overflow-hidden rounded-full bg-[#EAE3D8]">
              <span className="block h-full bg-terra transition-[width]" style={{ width: `${progress * 100}%` }} />
            </span>
          </div>
        )}
      </div>
      <input ref={input} type="file" accept={mime} className="hidden" onChange={(e) => void send(e.target.files?.[0] ?? undefined)} />
      {error && <p className="mt-1.5 text-xs text-red-700">{error}</p>}
    </Field>
  )
}

/* ───────── icons ───────── */

const I = ({ d, size = 16 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
)
export const PlusIcon = () => <I d="M12 5v14M5 12h14" />
export const TrashIcon = () => <I d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
const UploadIcon = () => <I size={22} d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
export const ExternalIcon = () => <I d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
export const Chevron = ({ dir }: { dir: 'up' | 'down' | 'right' | 'left' }) => (
  <I d={{ up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6', right: 'M9 6l6 6-6 6', left: 'M15 6l-6 6 6 6' }[dir]} />
)
