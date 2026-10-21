/**
 * Entry-screen effect (WebGL1, no dependencies).
 *
 * Big ink lettering on cream. Moving the pointer splashes liquid ink around it;
 * inside the ink the lettering is shown as raised 3D type whose material keeps
 * changing (chrome, ceramic, iridescent, foam, gold, latex).
 *
 * The ink is a metaball field: short-lived splash droplets are drawn as soft
 * blobs into a small 2D canvas, which the shader warps with flowing noise and
 * thresholds — giving thick, liquid shapes with wavy edges.
 */

type RGB = [number, number, number]

type InkRevealOptions = {
  canvas: HTMLCanvasElement
  /** text lines for landscape / portrait screens */
  lines: { wide: string[]; narrow: string[] }
  font: string // e.g. 'Anton'
  colors: { bg: RGB; ink: RGB }
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uText;   // sharp lettering (r)
uniform sampler2D uBlur;   // blurred lettering -> height map (r)
uniform sampler2D uField;  // ink trail field (r)
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uBg;
uniform vec3 uInk;
uniform vec2 uLight;
uniform float uStyleA;
uniform float uStyleB;
uniform float uMix;
uniform vec3 uFlood;       // centre (px, gl coords) + radius (px)
uniform float uFade;       // 0 = materials visible, 1 = all ink
uniform float uBevel;      // sample distance for the bevel normal, in canvas px

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float voronoi(vec2 x) {
  vec2 n = floor(x), f = fract(x);
  float md = 8.0;
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 g = vec2(float(i), float(j));
      vec2 r = g + hash2(n + g) - f;
      md = min(md, dot(r, r));
    }
  return sqrt(md);
}
vec3 palette(float t) {
  return vec3(0.55, 0.4, 0.75) + vec3(0.45, 0.35, 0.3) * cos(6.2831 * (vec3(1.0, 1.0, 1.0) * t + vec3(0.0, 0.33, 0.67)));
}

float bl(vec2 uv) { return texture2D(uBlur, uv).r; }

vec3 material(float s, vec3 n, float h, vec2 p, float t) {
  vec3 L = normalize(vec3(uLight, 0.9));
  float diff = max(dot(n, L), 0.0);
  vec3 R = reflect(-L, n);
  float spec = pow(max(R.z, 0.0), 28.0);
  vec3 env = reflect(vec3(0.0, 0.0, -1.0), n);
  float rim = pow(1.0 - n.z, 2.0);

  if (s < 0.5) { // chrome
    float band = 0.5 + 0.5 * sin(env.y * 7.0 + env.x * 3.0 + t * 0.7);
    vec3 c = mix(vec3(0.06), vec3(0.97), smoothstep(0.25, 0.75, band));
    return c * (0.55 + 0.45 * diff) + spec * 1.3 + vec3(0.04, 0.03, 0.02);
  } else if (s < 1.5) { // terracotta ceramic
    vec3 base = vec3(0.78, 0.38, 0.25);
    return base * (0.35 + 0.75 * diff) + spec * 0.7 + rim * vec3(0.25, 0.12, 0.08);
  } else if (s < 2.5) { // iridescent violet
    vec3 base = palette(dot(n.xy, vec2(0.6, 0.4)) * 1.4 + t * 0.12 + h * 0.3);
    return base * (0.4 + 0.7 * diff) + spec * 1.1 + rim * 0.35;
  } else if (s < 3.5) { // foam / bubbles
    float v = voronoi(p * 34.0 + vec2(0.0, t * 0.4));
    float bubble = smoothstep(0.05, 0.45, v);
    vec3 base = mix(vec3(0.62, 0.6, 0.6), vec3(0.98, 0.97, 0.95), bubble);
    float glint = smoothstep(0.32, 0.36, v) * (1.0 - smoothstep(0.36, 0.42, v));
    return base * (0.55 + 0.5 * diff) + glint * 0.35 + spec * 0.5;
  } else if (s < 4.5) { // gold
    float band = 0.5 + 0.5 * sin(env.y * 5.0 - env.x * 2.0 + t * 0.5);
    vec3 c = mix(vec3(0.35, 0.2, 0.05), vec3(1.0, 0.85, 0.5), smoothstep(0.2, 0.85, band));
    return c * (0.5 + 0.6 * diff) + spec * vec3(1.0, 0.9, 0.7) * 1.2;
  }
  // glossy pink latex
  vec3 base = vec3(0.93, 0.45, 0.56);
  return base * (0.35 + 0.7 * diff) + spec * 1.4 + rim * vec3(0.35, 0.1, 0.2);
}

void main() {
  vec2 uv = vUv;
  float glyph = texture2D(uText, uv).r;
  float aspect = uRes.x / uRes.y;

  // ink trail: soft blobs summed, wobbled with noise, then thresholded -> gooey edges
  // flowing domain warp makes the blob edges wavy and liquid instead of round
  vec2 q = uv * vec2(aspect, 1.0) * 5.0;
  vec2 warp = vec2(noise(q + uTime * 0.6), noise(q + vec2(7.3, 2.1) - uTime * 0.5)) - 0.5;
  float field = texture2D(uField, uv + warp * 0.05).r;
  if (uFlood.z > 0.0) {
    float d = distance(gl_FragCoord.xy, uFlood.xy);
    field += (1.0 - smoothstep(uFlood.z - 140.0, uFlood.z, d)) * 2.0;
  }
  float mask = smoothstep(0.485, 0.515, field); // crisp ink edge, no grey haze while it dries

  vec3 base = mix(uBg, uInk, glyph);
  if (mask < 0.001) { gl_FragColor = vec4(base, 1.0); return; }

  vec3 inside = uInk;
  if (glyph > 0.001 && uFade < 0.999) {
    vec2 px = uBevel / uRes;
    float hx = bl(uv + vec2(px.x, 0.0)) - bl(uv - vec2(px.x, 0.0));
    float hy = bl(uv + vec2(0.0, px.y)) - bl(uv - vec2(0.0, px.y));
    float h = bl(uv);
    // domed profile: steep at the edges, rounded on top -> reads as inflated / bevelled 3D type
    vec3 n = normalize(vec3(-hx * 3.2, -hy * 3.2, 0.55 + h * 0.45));
    vec2 p = uv * vec2(aspect, 1.0);
    vec3 a = material(uStyleA, n, h, p, uTime);
    vec3 b = material(uStyleB, n, h, p, uTime);
    vec3 m = mix(a, b, uMix) * mix(0.55, 1.0, smoothstep(0.0, 0.6, h)); // soft ambient occlusion at the edges
    m = mix(m, uInk, uFade);
    inside = mix(uInk, m, glyph);
  }
  gl_FragColor = vec4(mix(base, inside, mask), 1.0);
}`

type Drop = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number }

const STYLE_COUNT = 6
const STYLE_SECONDS = 2.6
const FIELD_SCALE = 1 / 3 // ink-field resolution relative to CSS pixels
const MAX_DROPS = 500

export class InkReveal {
  private gl: WebGLRenderingContext
  private prog: WebGLProgram
  private texText: WebGLTexture
  private texBlur: WebGLTexture
  private texField: WebGLTexture
  private field = document.createElement('canvas')
  private fctx: CanvasRenderingContext2D
  private sprite = document.createElement('canvas')
  private u: Record<string, WebGLUniformLocation | null> = {}
  private raf = 0
  private t0 = performance.now()
  private last = performance.now()
  private w = 0
  private h = 0
  private dpr = 1
  private pointer = { x: -1, y: -1, has: false }
  private light = { x: 0.3, y: 0.4 }
  private drops: Drop[] = []
  private flood = { x: 0, y: 0, r: 0 }
  private fade = 0
  private bevel = 8
  private destroyed = false
  private resizeTimer = 0

  static supported() {
    try {
      const c = document.createElement('canvas')
      return !!c.getContext('webgl')
    } catch {
      return false
    }
  }

  constructor(private opts: InkRevealOptions) {
    const gl = opts.canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false })
    if (!gl) throw new Error('WebGL unavailable')
    this.gl = gl
    this.fctx = this.field.getContext('2d')!
    this.prog = this.program()
    this.texText = this.texture()
    this.texBlur = this.texture()
    this.texField = this.texture()
    this.makeSprite()
    this.resize()
    window.addEventListener('pointermove', this.onMove, { passive: true })
    window.addEventListener('resize', this.onResize)
    this.raf = requestAnimationFrame(this.frame)
    if (import.meta.env.DEV) (window as unknown as { __ink?: InkReveal }).__ink = this
  }

  /** Flood the screen with ink from a point (CSS px). Resolves when covered. */
  floodFrom(x: number, y: number, duration = 0.85) {
    return new Promise<void>((resolve) => {
      const start = performance.now()
      const full = Math.hypot(Math.max(x, this.w - x), Math.max(y, this.h - y)) * this.dpr + 160
      this.flood.x = x * this.dpr
      this.flood.y = (this.h - y) * this.dpr
      const step = () => {
        const p = Math.min(1, (performance.now() - start) / (duration * 1000))
        const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
        this.flood.r = e * full
        if (p < 1 && !this.destroyed) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
  }

  /** Fade the material lettering into plain ink (used right after the flood). */
  fadeToInk(duration = 0.45) {
    return new Promise<void>((resolve) => {
      const start = performance.now()
      const step = () => {
        this.fade = Math.min(1, (performance.now() - start) / (duration * 1000))
        if (this.fade < 1 && !this.destroyed) requestAnimationFrame(step)
        else resolve()
      }
      requestAnimationFrame(step)
    })
  }

  destroy() {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    window.clearTimeout(this.resizeTimer)
    window.removeEventListener('pointermove', this.onMove)
    window.removeEventListener('resize', this.onResize)
    this.gl.getExtension('WEBGL_lose_context')?.loseContext()
  }

  /* ───────── setup ───────── */

  private program() {
    const gl = this.gl
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!
      gl.shaderSource(sh, src)
      gl.compileShader(sh)
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh) ?? 'shader error')
      return sh
    }
    const p = gl.createProgram()!
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT))
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? 'link error')
    gl.useProgram(p)
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW) // one big triangle
    const loc = gl.getAttribLocation(p, 'aPos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    for (const name of ['uText', 'uBlur', 'uField', 'uRes', 'uTime', 'uBg', 'uInk', 'uLight', 'uStyleA', 'uStyleB', 'uMix', 'uFlood', 'uFade', 'uBevel'])
      this.u[name] = gl.getUniformLocation(p, name)
    gl.uniform1i(this.u.uText, 0)
    gl.uniform1i(this.u.uBlur, 1)
    gl.uniform1i(this.u.uField, 2)
    return p
  }

  private texture() {
    const gl = this.gl
    const t = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, t)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return t
  }

  private upload(tex: WebGLTexture, unit: number, src: HTMLCanvasElement) {
    const gl = this.gl
    gl.activeTexture(gl.TEXTURE0 + unit)
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
  }

  /** Soft round brush, pre-rendered once and stamped along the pointer path. */
  private makeSprite() {
    const sp = this.sprite
    sp.width = sp.height = 64
    const c = sp.getContext('2d')!
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = g
    c.fillRect(0, 0, 64, 64)
  }

  private onResize = () => {
    window.clearTimeout(this.resizeTimer)
    this.resizeTimer = window.setTimeout(() => this.resize(), 120)
  }

  private resize() {
    const { canvas } = this.opts
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.75)
    canvas.width = Math.round(this.w * this.dpr)
    canvas.height = Math.round(this.h * this.dpr)
    this.gl.viewport(0, 0, canvas.width, canvas.height)
    this.field.width = Math.ceil(this.w * FIELD_SCALE)
    this.field.height = Math.ceil(this.h * FIELD_SCALE)
    this.drawText()
  }

  /** Render the lettering (sharp + blurred height map) into textures sized to the canvas. */
  private drawText() {
    const { canvas, font } = this.opts
    const W = canvas.width
    const H = canvas.height
    const lines = (this.w / this.h > 1 ? this.opts.lines.wide : this.opts.lines.narrow).map((l) => l.toUpperCase())

    const sharp = document.createElement('canvas')
    sharp.width = W
    sharp.height = H
    const c = sharp.getContext('2d')!
    c.fillStyle = '#000'
    c.fillRect(0, 0, W, H)
    c.font = `400 100px ${font}`
    const widest = Math.max(...lines.map((l) => c.measureText(l).width)) / 100
    const lh = 0.94
    const size = Math.min((W * (this.w < 640 ? 0.88 : 0.8)) / widest, (H * 0.72) / (lines.length * lh))
    c.font = `400 ${size}px ${font}`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillStyle = '#fff'
    const top = H / 2 - ((lines.length - 1) * size * lh) / 2
    lines.forEach((l, i) => c.fillText(l, W / 2, top + i * size * lh + size * 0.04))

    const radius = size * 0.09
    this.bevel = size * 0.04
    this.upload(this.texText, 0, sharp)
    this.upload(this.texBlur, 1, blurred(sharp, radius))
  }

  /* ───────── ink ───────── */

  private onMove = (e: PointerEvent) => {
    if (this.pointer.has) this.splash(this.pointer.x, this.pointer.y, e.clientX, e.clientY)
    this.pointer = { x: e.clientX, y: e.clientY, has: true }
  }

  /**
   * Splash droplets along the pointer segment (CSS px). They inherit some of the
   * pointer's velocity and fan out sideways, so fast strokes throw long tendrils.
   */
  private splash(x0: number, y0: number, x1: number, y1: number) {
    const dx = x1 - x0
    const dy = y1 - y0
    const dist = Math.hypot(dx, dy)
    if (dist < 0.5 || dist > 160) return // ignore jumps (pointer re-entering the window, etc.)
    const scale = Math.min(this.w, this.h) / 900
    const speed = Math.min(dist, 60)
    const nx = -dy / dist // perpendicular to the stroke
    const ny = dx / dist
    const count = Math.min(12, Math.ceil(dist / 7))
    for (let i = 0; i < count; i++) {
      if (this.drops.length >= MAX_DROPS) this.drops.shift()
      const t = Math.random()
      const side = (Math.random() - 0.5) * 2
      const kind = Math.random()
      // body: fat droplets that stay near the path · tendrils: thin ones flung ahead and sideways
      const tendril = kind < 0.28
      const splat = kind > 0.94
      const fling = tendril ? 0.5 + Math.random() * 0.5 : 0.12
      const spread = tendril ? 0.22 : 0.08
      const size = splat ? 1.7 : tendril ? 0.45 : 1
      this.drops.push({
        x: x0 + dx * t,
        y: y0 + dy * t,
        vx: dx * fling * Math.random() + nx * side * speed * spread,
        vy: dy * fling * Math.random() + ny * side * speed * spread,
        r: (40 + speed * 0.7) * scale * size * (0.6 + Math.random() * 0.6),
        life: 0,
        max: (tendril ? 0.7 : 1.0) + Math.random() * 0.6,
      })
    }
  }

  /** Move + age the droplets, then draw the field from scratch (ink only exists where it was just splashed). */
  private stepField(dt: number) {
    const f = this.fctx
    const k = FIELD_SCALE
    f.globalCompositeOperation = 'source-over'
    f.globalAlpha = 1
    f.fillStyle = '#000'
    f.fillRect(0, 0, this.field.width, this.field.height)
    f.globalCompositeOperation = 'lighter'
    const drag = Math.pow(0.92, dt * 60)
    const live: Drop[] = []
    for (const d of this.drops) {
      d.life += dt
      if (d.life >= d.max) continue
      d.vx *= drag
      d.vy = d.vy * drag + 0.04 * dt * 60 // a slight sag, like heavy liquid
      d.x += d.vx * dt * 60
      d.y += d.vy * dt * 60
      // fade the intensity (not the size): the thresholded shape then shrinks smoothly to nothing, no specks
      const p = d.life / d.max
      f.globalAlpha = p < 0.1 ? p / 0.1 : 1 - (p - 0.1) / 0.9
      const s = d.r * 2 * k
      f.drawImage(this.sprite, d.x * k - s / 2, d.y * k - s / 2, s, s)
      live.push(d)
    }
    this.drops = live
    f.globalAlpha = 1
    this.upload(this.texField, 2, this.field)
  }

  /* ───────── render loop ───────── */

  private frame = (now: number) => {
    if (this.destroyed) return
    const dt = Math.min(0.05, (now - this.last) / 1000)
    this.last = now
    const t = (now - this.t0) / 1000
    const gl = this.gl

    if (this.pointer.has) {
      this.light.x += ((this.pointer.x / this.w - 0.5) * -1.6 - this.light.x) * 0.08
      this.light.y += ((0.5 - this.pointer.y / this.h) * -1.6 - this.light.y) * 0.08
    }
    this.stepField(dt)

    const cycle = t / STYLE_SECONDS
    const a = Math.floor(cycle) % STYLE_COUNT
    const frac = cycle - Math.floor(cycle)
    const mix = frac > 0.75 ? (frac - 0.75) / 0.25 : 0
    const { bg, ink } = this.opts.colors

    gl.useProgram(this.prog)
    gl.uniform2f(this.u.uRes, this.opts.canvas.width, this.opts.canvas.height)
    gl.uniform1f(this.u.uTime, t)
    gl.uniform3f(this.u.uBg, bg[0], bg[1], bg[2])
    gl.uniform3f(this.u.uInk, ink[0], ink[1], ink[2])
    gl.uniform2f(this.u.uLight, this.light.x, this.light.y)
    gl.uniform1f(this.u.uStyleA, a)
    gl.uniform1f(this.u.uStyleB, (a + 1) % STYLE_COUNT)
    gl.uniform1f(this.u.uMix, mix * mix * (3 - 2 * mix))
    gl.uniform3f(this.u.uFlood, this.flood.x, this.flood.y, this.flood.r)
    gl.uniform1f(this.u.uFade, this.fade)
    gl.uniform1f(this.u.uBevel, this.bevel)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    this.raf = requestAnimationFrame(this.frame)
  }
}

/** Gaussian-ish blur of a canvas: ctx.filter where supported, otherwise a down/up-scale chain. */
function blurred(src: HTMLCanvasElement, radius: number) {
  const out = document.createElement('canvas')
  out.width = src.width
  out.height = src.height
  const o = out.getContext('2d')!
  // engines without canvas filters (older Safari) don't expose the property at all
  if (typeof o.filter === 'string') {
    o.filter = `blur(${radius}px)`
    o.drawImage(src, 0, 0)
    o.filter = 'none'
    return out
  }
  // fallback: shrink then grow twice — bilinear sampling makes a soft blur
  let cur: HTMLCanvasElement = src
  for (const f of [radius / 3, radius]) {
    const small = document.createElement('canvas')
    small.width = Math.max(1, Math.round(src.width / f))
    small.height = Math.max(1, Math.round(src.height / f))
    const sc = small.getContext('2d')!
    sc.imageSmoothingQuality = 'high'
    sc.drawImage(cur, 0, 0, small.width, small.height)
    const big = document.createElement('canvas')
    big.width = src.width
    big.height = src.height
    const bc = big.getContext('2d')!
    bc.imageSmoothingQuality = 'high'
    bc.drawImage(small, 0, 0, big.width, big.height)
    cur = big
  }
  return cur
}
