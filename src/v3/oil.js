// Original oil painting backgrounds, painted in code.
// Each scene is a simple composition drawn small, then re-painted with thousands of
// brush strokes that sample its colours, plus impasto highlights and canvas weave.

const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const lerp = (a, b, t) => a + (b - a) * t
const vgrad = (ctx, w, y0, y1, stops) => { const g = ctx.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => g.addColorStop(o, c)); return g }
const glow = (ctx, x, y, r0, r1, c) => { const g = ctx.createRadialGradient(x, y, r0, x, y, r1); g.addColorStop(0, c); g.addColorStop(1, c.replace(/[\d.]+\)$/, '0)')); ctx.fillStyle = g; ctx.fillRect(x - r1, y - r1, r1 * 2, r1 * 2) }
function hills(ctx, w, h, y, amp, color, r, steps = 7) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, h)
  let py = y
  for (let i = 0; i <= steps; i++) { const x = (i / steps) * w; py = y + Math.sin(i * 1.3 + r() * 3) * amp; ctx.lineTo(x, py) }
  ctx.lineTo(w, h); ctx.closePath(); ctx.fill()
}
function clouds(ctx, w, h, n, y0, y1, color, r) {
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = lerp(y0, y1, r()), rw = w * (0.18 + r() * 0.3), rh = rw * (0.18 + r() * 0.12)
    ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, Math.PI * 2); ctx.fill()
  }
}

// scene: draw(ctx, w, h, r) composes the picture; flow(x, y) gives brush direction (radians)
export const SCENES = [
  {
    id: 'harbor', name: 'Golden Sea', swatch: ['#101a2e', '#c86b2c', '#f4c36a'],
    draw(c, w, h, r) {
      const hz = h * 0.58
      c.fillStyle = vgrad(c, w, 0, hz, [[0, '#0d1526'], [0.45, '#2b2a45'], [0.75, '#a3502a'], [1, '#f1b25c']]); c.fillRect(0, 0, w, hz)
      clouds(c, w, h, 9, h * 0.12, h * 0.45, 'rgba(60,44,70,0.55)', r)
      clouds(c, w, h, 6, h * 0.38, h * 0.52, 'rgba(235,150,80,0.45)', r)
      glow(c, w * 0.62, hz - h * 0.02, 4, w * 0.45, 'rgba(255,214,140,0.75)')
      c.fillStyle = vgrad(c, w, hz, h, [[0, '#6e4a3a'], [0.25, '#1f3440'], [1, '#08121a']]); c.fillRect(0, hz, w, h - hz)
      c.fillStyle = 'rgba(255,200,120,0.55)'; c.fillRect(w * 0.55, hz, w * 0.14, h * 0.35)
    },
    flow: (x, y, h) => (y < 0.58 ? 0.04 : 0) + Math.sin(x * 3) * 0.05,
  },
  {
    id: 'storm', name: 'Storm Hills', swatch: ['#1b1f22', '#56606a', '#3f5a34'],
    draw(c, w, h, r) {
      c.fillStyle = vgrad(c, w, 0, h * 0.6, [[0, '#15181c'], [0.5, '#3a4148'], [1, '#8e8d7f']]); c.fillRect(0, 0, w, h)
      clouds(c, w, h, 12, h * 0.05, h * 0.42, 'rgba(25,28,32,0.6)', r)
      glow(c, w * 0.3, h * 0.38, 2, w * 0.4, 'rgba(230,220,180,0.45)')
      hills(c, w, h, h * 0.55, h * 0.03, '#2e3b2a', r)
      hills(c, w, h, h * 0.63, h * 0.04, '#3f5a34', r)
      hills(c, w, h, h * 0.74, h * 0.05, '#2a3a22', r)
      c.fillStyle = 'rgba(190,170,90,0.35)'; c.fillRect(w * 0.15, h * 0.62, w * 0.35, h * 0.05)
    },
    flow: (x, y) => (y < 0.55 ? -0.12 + Math.sin(x * 5) * 0.12 : 0.05 + Math.sin(x * 4) * 0.08),
  },
  {
    id: 'moon', name: 'Moon Lake', swatch: ['#070d1c', '#24406b', '#c9d6e6'],
    draw(c, w, h, r) {
      const hz = h * 0.52
      c.fillStyle = vgrad(c, w, 0, hz, [[0, '#060b18'], [0.7, '#1c3157'], [1, '#3f5f86']]); c.fillRect(0, 0, w, hz)
      glow(c, w * 0.5, h * 0.24, 2, w * 0.38, 'rgba(210,225,245,0.55)')
      c.fillStyle = '#e6edf5'; c.beginPath(); c.arc(w * 0.5, h * 0.24, w * 0.055, 0, Math.PI * 2); c.fill()
      clouds(c, w, h, 6, h * 0.1, h * 0.42, 'rgba(30,48,80,0.5)', r)
      hills(c, w, h, hz - h * 0.03, h * 0.015, '#0b1424', r, 10)
      c.fillStyle = vgrad(c, w, hz, h, [[0, '#28456e'], [1, '#050a14']]); c.fillRect(0, hz, w, h - hz)
      c.fillStyle = 'rgba(220,232,245,0.4)'; c.fillRect(w * 0.45, hz, w * 0.1, h * 0.38)
      c.fillStyle = '#060b14'
      for (const side of [0, 1]) for (let i = 0; i < 5; i++) { const x = side ? w - r() * w * 0.2 : r() * w * 0.2; c.fillRect(x, h * (0.2 + r() * 0.15), w * 0.035, h) }
    },
    flow: (x, y) => (y < 0.52 ? 0.02 : 0) + Math.sin(y * 9) * 0.04,
  },
  {
    id: 'autumn', name: 'Autumn Woods', swatch: ['#1c0f08', '#8a3a12', '#e3a13f'],
    draw(c, w, h, r) {
      c.fillStyle = vgrad(c, w, 0, h, [[0, '#2a160b'], [0.35, '#7a3412'], [0.65, '#b8641e'], [1, '#2a1408']]); c.fillRect(0, 0, w, h)
      glow(c, w * 0.6, h * 0.35, 2, w * 0.5, 'rgba(255,210,120,0.6)')
      for (let i = 0; i < 14; i++) { c.fillStyle = `rgba(${30 + r() * 30},${15 + r() * 15},8,${0.6 + r() * 0.3})`; const x = r() * w; c.fillRect(x, 0, w * (0.015 + r() * 0.03), h) }
      clouds(c, w, h, 14, 0, h * 0.45, 'rgba(200,90,30,0.45)', r)
      c.fillStyle = vgrad(c, w, h * 0.78, h, [[0, '#6a2e10'], [1, '#160903']]); c.fillRect(0, h * 0.78, w, h * 0.22)
    },
    flow: (x, y) => (y < 0.75 ? 1.45 + Math.sin(x * 7) * 0.2 : 0.1),
  },
  {
    id: 'dusk', name: 'Lavender Dusk', swatch: ['#1d1630', '#7a4d86', '#f2a98c'],
    draw(c, w, h, r) {
      c.fillStyle = vgrad(c, w, 0, h * 0.6, [[0, '#1a1430'], [0.5, '#5a3b74'], [0.85, '#d9867f'], [1, '#f6c39a']]); c.fillRect(0, 0, w, h)
      clouds(c, w, h, 8, h * 0.15, h * 0.5, 'rgba(240,160,150,0.4)', r)
      hills(c, w, h, h * 0.56, h * 0.06, '#4a3a6a', r, 5)
      hills(c, w, h, h * 0.62, h * 0.05, '#3a2c55', r, 6)
      hills(c, w, h, h * 0.7, h * 0.03, '#5d4a6e', r, 8)
      c.fillStyle = vgrad(c, w, h * 0.74, h, [[0, '#7c5d8a'], [1, '#1d1428']]); c.fillRect(0, h * 0.74, w, h * 0.26)
    },
    flow: (x, y) => (y < 0.55 ? 0.03 : 0.08) + Math.sin(x * 6 + y * 3) * 0.06,
  },
  {
    id: 'velvet', name: 'Velvet', swatch: ['#120607', '#5e1420', '#c08a4a'],
    draw(c, w, h, r) {
      c.fillStyle = '#12060a'; c.fillRect(0, 0, w, h)
      for (let i = 0; i < 9; i++) {
        const x = (i / 8) * w * 1.4 - w * 0.2
        const g = c.createLinearGradient(x - w * 0.12, 0, x + w * 0.12, 0)
        g.addColorStop(0, 'rgba(40,6,12,0)'); g.addColorStop(0.5, i % 3 === 0 ? 'rgba(150,40,52,0.85)' : 'rgba(96,20,32,0.8)'); g.addColorStop(1, 'rgba(40,6,12,0)')
        c.save(); c.translate(x, 0); c.rotate(-0.18); c.fillStyle = g; c.fillRect(-w * 0.12, -h * 0.1, w * 0.24, h * 1.3); c.restore()
      }
      glow(c, w * 0.7, h * 0.2, 2, w * 0.5, 'rgba(220,160,90,0.35)')
    },
    flow: () => 1.39,
  },
]

function sample(data, w, h, x, y) {
  const xi = Math.max(0, Math.min(w - 1, x | 0)), yi = Math.max(0, Math.min(h - 1, y | 0))
  const i = (yi * w + xi) * 4
  return [data[i], data[i + 1], data[i + 2]]
}

export function paintOil(ctx, W, H, sceneId, seed) {
  const scene = SCENES.find((s) => s.id === sceneId) || SCENES[0]
  const r = rng(seed)
  // 1. small composition
  const sw = 270, sh = Math.round((H / W) * sw)
  const base = document.createElement('canvas'); base.width = sw; base.height = sh
  const b = base.getContext('2d')
  scene.draw(b, sw, sh, r)
  const data = b.getImageData(0, 0, sw, sh).data
  ctx.drawImage(base, 0, 0, W, H)
  // 2. brush strokes, coarse to fine
  const k = W / sw
  const layers = [[700, 60, 150, 22, 40], [2200, 26, 70, 9, 18], [3600, 10, 30, 3.5, 8]]
  ctx.lineCap = 'round'
  for (const [n, l0, l1, w0, w1] of layers) {
    for (let i = 0; i < n; i++) {
      const x = r() * W, y = r() * H
      const [cr, cg, cb] = sample(data, sw, sh, x / k, y / k)
      const shade = 0.88 + r() * 0.24
      const a = scene.flow(x / W, y / H) + (r() - 0.5) * 0.35
      const len = lerp(l0, l1, r()), wid = lerp(w0, w1, r())
      const dx = Math.cos(a) * len / 2, dy = Math.sin(a) * len / 2, bend = (r() - 0.5) * len * 0.25
      ctx.strokeStyle = `rgb(${Math.min(255, cr * shade) | 0},${Math.min(255, cg * shade) | 0},${Math.min(255, cb * shade) | 0})`
      ctx.globalAlpha = 0.82
      ctx.lineWidth = wid
      ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.quadraticCurveTo(x - Math.sin(a) * bend, y + Math.cos(a) * bend, x + dx, y + dy); ctx.stroke()
      // impasto: a thin lighter ridge along one side of the stroke
      if (wid > 6 && r() < 0.6) {
        ctx.globalAlpha = 0.18
        ctx.strokeStyle = `rgb(${Math.min(255, cr * 1.35 + 20) | 0},${Math.min(255, cg * 1.35 + 20) | 0},${Math.min(255, cb * 1.35 + 20) | 0})`
        ctx.lineWidth = Math.max(1.5, wid * 0.22)
        const ox = -Math.sin(a) * wid * 0.3, oy = Math.cos(a) * wid * 0.3
        ctx.beginPath(); ctx.moveTo(x - dx + ox, y - dy + oy); ctx.quadraticCurveTo(x - Math.sin(a) * bend + ox, y + Math.cos(a) * bend + oy, x + dx + ox, y + dy + oy); ctx.stroke()
      }
    }
  }
  ctx.globalAlpha = 1
  // 3. canvas weave + varnish warmth
  const img = ctx.getImageData(0, 0, W, H), d = img.data
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    const weave = ((x % 4 < 2) !== (y % 4 < 2) ? 7 : -7) + (r() - 0.5) * 14
    d[i] = d[i] + weave + 4; d[i + 1] = d[i + 1] + weave + 1; d[i + 2] = d[i + 2] + weave - 3
  }
  ctx.putImageData(img, 0, 0)
}

// ── Flat instrument badges in TradingView-style colours ────────────────
export const BADGES = {
  NQ: ['#2962FF', '#fff'], MNQ: ['#2962FF', '#fff'],
  ES: ['#F23645', '#fff'], MES: ['#F23645', '#fff'],
  YM: ['#7E57C2', '#fff'], MYM: ['#7E57C2', '#fff'],
  RTY: ['#FF9800', '#fff'], M2K: ['#FF9800', '#fff'],
  GC: ['#F7A600', '#131722'], MGC: ['#F7A600', '#131722'], XAUUSD: ['#F7A600', '#131722'],
  SI: ['#B2B5BE', '#131722'], CL: ['#131722', '#fff'],
  '6E': ['#089981', '#fff'], EURUSD: ['#089981', '#fff'],
  BTC: ['#F7931A', '#fff'],
}
export function drawBadge(ctx, sym, x, y, d) {
  const [bg, fg] = BADGES[sym] || ['#434651', '#fff']
  ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill()
  const label = sym.replace(/^M(?=NQ|ES|YM|GC|2K)/, '')
  ctx.fillStyle = fg
  ctx.font = `700 ${d * (label.length > 3 ? 0.24 : 0.36)}px Poppins, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(label, x + d / 2, y + d / 2 + 2)
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'
}
