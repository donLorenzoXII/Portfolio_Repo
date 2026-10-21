/**
 * Tiny synthesized sound kit (Web Audio API — no audio files).
 * Browsers only allow audio after a user gesture, so nothing plays until
 * `sound.unlock()` has been called from a click / key handler.
 */

// Sound is ON by default on every visit; muting only lasts for the current visit.
const STORAGE_KEY = 'lr-sound'

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let lastTick = 0
let muted = readMuted()
const listeners = new Set<(muted: boolean) => void>()

function readMuted() {
  try {
    localStorage.removeItem(STORAGE_KEY) // older builds remembered "off" across visits
    return sessionStorage.getItem(STORAGE_KEY) === 'off'
  } catch {
    return false
  }
}

function ready(): AudioContext | null {
  if (!ctx || !master || muted || ctx.state !== 'running') return null
  return ctx
}

function noiseBuffer(c: AudioContext) {
  if (noise) return noise
  noise = c.createBuffer(1, c.sampleRate, c.sampleRate)
  const data = noise.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  return noise
}

/** Gain node with an attack → exponential decay envelope, connected to `dest`. */
function env(c: AudioContext, dest: AudioNode, peak: number, attack: number, decay: number, at = c.currentTime) {
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.linearRampToValueAtTime(peak, at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay)
  g.connect(dest)
  return g
}

function tone(type: OscillatorType, from: number, to: number, peak: number, attack: number, decay: number, dest?: AudioNode) {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(from, t)
  if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay)
  o.connect(env(c, dest ?? master!, peak, attack, decay, t))
  o.start(t)
  o.stop(t + attack + decay + 0.05)
}

function burst(filter: BiquadFilterType, freq: number, peak: number, decay: number, q = 1) {
  const c = ready()
  if (!c) return
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuffer(c)
  const f = c.createBiquadFilter()
  f.type = filter
  f.frequency.value = freq
  f.Q.value = q
  src.connect(f)
  f.connect(env(c, master!, peak, 0.002, decay, t))
  src.start(t, Math.random() * 0.5)
  src.stop(t + decay + 0.05)
}

export const sound = {
  /** Create / resume the audio context. Call from inside a user gesture. */
  unlock() {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return
    if (!ctx) {
      ctx = new AudioContext()
      master = ctx.createGain()
      master.gain.value = 0.7
      master.connect(ctx.destination)
    }
    if (ctx.state === 'suspended') void ctx.resume()
  },

  get muted() {
    return muted
  },
  setMuted(value: boolean) {
    muted = value
    try {
      sessionStorage.setItem(STORAGE_KEY, value ? 'off' : 'on')
    } catch {
      /* private mode */
    }
    listeners.forEach((fn) => fn(muted))
  },
  subscribe(fn: (muted: boolean) => void) {
    listeners.add(fn)
    return () => void listeners.delete(fn)
  },

  /** Soft UI click for buttons and links. */
  click() {
    tone('sine', 1500, 700, 0.09, 0.002, 0.07)
    burst('bandpass', 3200, 0.035, 0.03, 1.2)
  },

  /** Gentle mechanical tick as a wheel card passes the centre. */
  tick() {
    const c = ready()
    if (!c || c.currentTime - lastTick < 0.035) return
    lastTick = c.currentTime
    tone('triangle', 2300 + Math.random() * 300, 1800, 0.045, 0.001, 0.025)
    burst('highpass', 4500, 0.02, 0.015)
  },

  /* ───────── entry ───────── */

  /** Airy swell as the ink floods the screen. */
  whoosh(duration = 2.2) {
    const c = ready()
    if (!c) return
    const t = c.currentTime
    const src = c.createBufferSource()
    src.buffer = noiseBuffer(c)
    src.loop = true
    const f = c.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 2.5
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(1800, t + duration * 0.6)
    f.frequency.exponentialRampToValueAtTime(400, t + duration)
    const g = c.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.05, t + duration * 0.5)
    g.gain.linearRampToValueAtTime(0.0001, t + duration)
    src.connect(f)
    f.connect(g)
    g.connect(master!)
    src.start(t)
    src.stop(t + duration + 0.1)
  },

  /** Warm chord that blooms as the hero is revealed. */
  bloom() {
    const c = ready()
    if (!c) return
    const t = c.currentTime
    const f = c.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.setValueAtTime(600, t)
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.8)
    f.connect(master!)
    ;[220, 277.18, 329.63, 440, 659.25].forEach((freq, i) => {
      ;[-4, 4].forEach((detune) => {
        const o = c.createOscillator()
        o.type = i === 0 ? 'triangle' : 'sine'
        o.frequency.value = freq
        o.detune.value = detune
        const g = c.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.linearRampToValueAtTime(0.022, t + 0.35 + i * 0.04)
        g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6)
        o.connect(g)
        g.connect(f)
        o.start(t)
        o.stop(t + 2.7)
      })
    })
  },
}
