import type { ElementType } from 'react'

/**
 * Renders each line inside an overflow mask so it can slide up.
 * Animate the `[data-line]` children (e.g. gsap.from(…, { yPercent: 110 })).
 */
export function SplitLines({
  lines,
  as: Tag = 'h2',
  className = '',
  lineClassName = (_i: number) => '',
}: {
  lines: string[]
  as?: ElementType
  className?: string
  lineClassName?: (i: number) => string
}) {
  return (
    <Tag className={className} aria-label={lines.join(' ')}>
      {lines.map((line, i) => (
        <span key={i} className="line-mask" aria-hidden="true">
          <span data-line className={lineClassName(i)}>
            {line}
          </span>
        </span>
      ))}
    </Tag>
  )
}

/** Splits text into word-grouped character spans for char-by-char reveals. */
export function SplitChars({ text, className = '', charClassName = '' }: { text: string; className?: string; charClassName?: string }) {
  const words = text.split(' ')
  return (
    <span className={className} aria-hidden="true">
      {words.map((word, wi) => (
        <span key={wi} className="inline-block whitespace-nowrap">
          {[...word].map((ch, ci) => (
            <span key={ci} className="inline-block overflow-hidden pb-[0.24em] -mb-[0.24em] align-top">
              <span data-char className={`inline-block ${charClassName}`}>
                {ch}
              </span>
            </span>
          ))}
          {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  )
}
