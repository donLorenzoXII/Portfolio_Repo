type Props = { cx: number; cy: number; r: number; title: string[] }

/** Dashed hub under the wheel: the section title, ringed by rotating PORTFOLIO text. */
export function WheelCenter({ cx, cy, r, title }: Props) {
  const size = r * 2
  const textR = r - Math.max(16, r * 0.09)
  const fontSize = Math.max(10, r * 0.06)
  const circ = 2 * Math.PI * textR
  // repeat the phrase as often as fits, then let textLength spread it evenly around the full circle
  const text = 'PORTFOLIO · '.repeat(Math.max(3, Math.floor(circ / (fontSize * 12.6))))
  const titleSize = Math.max(26, r * 0.15)

  return (
    <div className="pointer-events-none absolute" style={{ left: cx - r, top: cy - r, width: size, height: size }}>
      {/* the ring fades towards the sides and bottom, like the outer cards, so it stays quiet */}
      <div aria-hidden="true" className="absolute inset-0 [mask-image:radial-gradient(120%_85%_at_50%_0%,#000_30%,transparent_72%)]">
        <svg aria-hidden="true" viewBox={`${-r} ${-r} ${size} ${size}`} className="absolute inset-0 h-full w-full overflow-visible">
          <circle r={r - 1} fill="none" stroke="rgb(var(--c-stone))" strokeOpacity={0.45} strokeWidth={1} strokeDasharray="5 7" />
          <circle r={textR - fontSize * 1.4} fill="none" stroke="rgb(var(--c-hair))" strokeWidth={1} />
        </svg>
        <svg aria-hidden="true" viewBox={`${-r} ${-r} ${size} ${size}`} className="absolute inset-0 h-full w-full animate-[spin-slow_60s_linear_infinite] overflow-visible">
          <defs>
            <path id="wheel-text-path" d={`M ${-textR},0 a ${textR},${textR} 0 1,1 ${textR * 2},0 a ${textR},${textR} 0 1,1 ${-textR * 2},0`} />
          </defs>
          <text fill="rgb(var(--c-stone))" fontSize={fontSize} letterSpacing={fontSize * 0.35} fontFamily="Montserrat, sans-serif" fontWeight={500}>
            <textPath href="#wheel-text-path" textLength={circ - fontSize * 0.35} lengthAdjust="spacing">
              {text}
            </textPath>
          </text>
        </svg>
      </div>
      <div className="absolute inset-x-0 flex flex-col items-center text-center" style={{ top: r * 0.27 }}>
        <span aria-hidden="true" className="mb-3 block h-0 w-0 border-x-[5px] border-b-[7px] border-x-transparent border-b-terra" data-wheel-fade />
        <h2 className="font-serif leading-[0.95] tracking-[-0.01em]" style={{ fontSize: titleSize }} aria-label={title.join(' ')}>
          {title.map((line, i) => (
            <span key={i} className="line-mask" aria-hidden="true">
              <span data-line className={i === 1 ? 'italic text-terra' : ''}>
                {line}
              </span>
            </span>
          ))}
        </h2>
      </div>
    </div>
  )
}
