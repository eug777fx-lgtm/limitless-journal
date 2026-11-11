// Liquid paint, drawn live on the GPU. Original LIMITLESS art: thick monochrome paint that
// slowly flows, with brush grooves and wet highlights. Moving the pointer drags through it.
import React from 'react'

const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'
const FRAG = `
precision highp float;
uniform vec2 R; uniform float T; uniform vec2 M; uniform vec2 V; uniform vec2 RANGE; uniform float HL; uniform float SEED; uniform float ZOOM; uniform float PULL;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h(i), h(i + vec2(1., 0.)), u.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), u.x), u.y); }
float fbm(vec2 p){ float v = 0., a = .5; mat2 r = mat2(.8, .6, -.6, .8);
  for (int i = 0; i < 5; i++) { v += a * n(p); p = r * p * 2.03; a *= .5; } return v; }
float field(vec2 p){
  vec2 q = vec2(fbm(p + vec2(0., T * .022)), fbm(p + vec2(5.2, 1.3) - T * .018));
  vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + T * .03), fbm(p + 3.2 * q + vec2(8.3, 2.8) - T * .026));
  return fbm(p + 3.4 * r);
}
void main(){
  vec2 uv = gl_FragCoord.xy / R; float asp = R.x / R.y;
  vec2 p = vec2(uv.x * asp * .62, uv.y) * ZOOM + SEED;
  vec2 m = vec2(M.x * asp * .62, M.y) * ZOOM + SEED;
  vec2 d = p - m; float g = exp(-dot(d, d) * 5.5 / (ZOOM * ZOOM * .35));
  float ang = g * PULL; float c = cos(ang), s = sin(ang);
  p = m + mat2(c, -s, s, c) * d - V * g * 1.4;
  float e = .0035 * ZOOM;
  float f = field(p), fx = field(p + vec2(e, 0.)), fy = field(p + vec2(0., e));
  vec2 grad = vec2(fx - f, fy - f) / e;
  float k = 46.;
  float groove = sin(f * k);
  // thick ribbons of paint with darker gaps between strokes
  float band = abs(fract(f * 4.2 + .13) - .5) * 2.;
  float ribbon = smoothstep(.06, .32, band);
  vec2 gn = grad * (.07 + .03 * cos(f * k) * k * .05) + grad * (1. - ribbon) * .05;
  vec3 N = normalize(vec3(-gn, 1.));
  vec3 Ld = normalize(vec3(-.45, .6, .8));
  float dif = clamp(dot(N, Ld), 0., 1.);
  float spe = pow(clamp(dot(reflect(-Ld, N), vec3(0., 0., 1.)), 0., 1.), 24.);
  float tone = smoothstep(.28, .78, f);
  tone = tone * .62 + dif * .26 + groove * .07;
  tone *= mix(.35, 1., ribbon);
  float v = mix(RANGE.x, RANGE.y, clamp(tone, 0., 1.)) + spe * HL;
  gl_FragColor = vec4(vec3(clamp(v, 0., 1.)), 1.);
}`

const still = () => document.documentElement.getAttribute('data-motion') === 'off' || matchMedia('(prefers-reduced-motion: reduce)').matches

// phones get a lighter version: fewer pixels and fewer frames, so scrolling and page switches stay smooth
const PHONE = typeof matchMedia !== 'undefined' && (matchMedia('(pointer: coarse)').matches || matchMedia('(max-width: 760px)').matches)

export default function Ink({ range = [0.86, 0.985], highlight = 0.12, zoom = 1.5, scale = 0.5, pull = 1.4, seed = 3.1, follow = 'window', className = '', fps = 30, phoneFps = 12, phoneScale = 0.28 }) {
  const ref = React.useRef(null)
  const opts = React.useRef({}); opts.current = { range, highlight, zoom, scale: PHONE ? Math.min(scale, phoneScale) : scale, pull, seed, gap: 1000 / (PHONE ? phoneFps : fps) }
  React.useEffect(() => {
    const cv = ref.current; if (!cv) return
    const gl = cv.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' })
    if (!gl) { cv.style.display = 'none'; return }
    const sh = (type, src) => { const x = gl.createShader(type); gl.shaderSource(x, src); gl.compileShader(x); return x }
    const pr = gl.createProgram()
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(pr)
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) { cv.style.display = 'none'; return }
    gl.useProgram(pr)
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const U = Object.fromEntries(['R', 'T', 'M', 'V', 'RANGE', 'HL', 'SEED', 'ZOOM', 'PULL'].map((k) => [k, gl.getUniformLocation(pr, k)]))

    let W = 1, H = 1
    const size = () => {
      const r = cv.getBoundingClientRect(), sc = opts.current.scale * Math.min(PHONE ? 1.5 : 2, devicePixelRatio || 1)
      W = cv.width = Math.max(2, Math.round(r.width * sc)); H = cv.height = Math.max(2, Math.round(r.height * sc))
      gl.viewport(0, 0, W, H)
    }
    size()
    let lastW = 0, lastH = 0
    const ro = new ResizeObserver(() => { const r = cv.getBoundingClientRect(); if (Math.abs(r.width - lastW) < 2 && Math.abs(r.height - lastH) < 80) return; lastW = r.width; lastH = r.height; size(); if (!running) draw(performance.now()) }); ro.observe(cv)

    // pointer: target follows the mouse, the paint eases toward it
    const target = { x: 0.5, y: -2 }, cur = { x: 0.5, y: -2 }, vel = { x: 0, y: 0 }
    const move = (e) => {
      const r = cv.getBoundingClientRect()
      target.x = (e.clientX - r.left) / r.width
      target.y = 1 - (e.clientY - r.top) / r.height
    }
    const fine = false // the paint moves on its own; the pointer does not push it

    const t0 = performance.now() - 40000
    // give page switches the whole phone for a moment
    let hold = 0
    const onNav = () => { hold = performance.now() + (PHONE ? 500 : 250) }
    addEventListener('hashchange', onNav)
    let raf = 0, last = 0, running = false, visible = true
    const draw = (now) => {
      const o = opts.current
      const px = cur.x, py = cur.y
      cur.x += (target.x - cur.x) * 0.08; cur.y += (target.y - cur.y) * 0.08
      vel.x = vel.x * 0.9 + (cur.x - px) * 2.2; vel.y = vel.y * 0.9 + (cur.y - py) * 2.2
      gl.uniform2f(U.R, W, H); gl.uniform1f(U.T, (now - t0) / 1000 * 1.7)
      gl.uniform2f(U.M, cur.x, cur.y); gl.uniform2f(U.V, vel.x, vel.y)
      gl.uniform2f(U.RANGE, o.range[0], o.range[1]); gl.uniform1f(U.HL, o.highlight)
      gl.uniform1f(U.SEED, o.seed); gl.uniform1f(U.ZOOM, o.zoom); gl.uniform1f(U.PULL, fine ? o.pull : 0)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const frame = (now) => {
      raf = requestAnimationFrame(frame)
      if (now - last < opts.current.gap || now < hold) return
      last = now; draw(now)
    }
    const start = () => { if (running || still() || document.hidden || !visible) return; running = true; raf = requestAnimationFrame(frame) }
    const stop = () => { running = false; cancelAnimationFrame(raf) }
    const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop() })
    io.observe(cv)
    const vis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', vis)
    draw(performance.now()); start()
    return () => { stop(); removeEventListener('hashchange', onNav); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', vis); removeEventListener('pointermove', move); const ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext() }
  }, [])
  return <canvas ref={ref} className={'paint ' + className} aria-hidden="true" />
}

// A glass droplet that trails the cursor and bends the scene behind it
export function Bubble() {
  const ref = React.useRef(null)
  React.useEffect(() => {
    if (!matchMedia('(pointer: fine)').matches || still()) return
    const el = ref.current; if (!el) return
    const t = { x: innerWidth / 2, y: innerHeight / 2 }, c = { ...t }
    let raf = 0, shown = false
    const move = (e) => { t.x = e.clientX; t.y = e.clientY; if (!shown) { shown = true; c.x = t.x; c.y = t.y; el.style.opacity = '1' } }
    const leave = () => { shown = false; el.style.opacity = '0' }
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const dx = t.x - c.x, dy = t.y - c.y
      c.x += dx * 0.09; c.y += dy * 0.09
      const sp = Math.min(1, Math.hypot(dx, dy) / 220)
      const a = Math.atan2(dy, dx)
      el.style.transform = `translate3d(${c.x}px, ${c.y}px, 0) translate(-50%, -50%) rotate(${a}rad) scale(${1 + sp * 0.28}, ${1 - sp * 0.18})`
    }
    addEventListener('pointermove', move, { passive: true }); document.addEventListener('pointerleave', leave)
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave) }
  }, [])
  return <div ref={ref} className="sk-bubble" aria-hidden="true" />
}
