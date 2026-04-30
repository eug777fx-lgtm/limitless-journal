import { useState, useEffect, useRef, Fragment } from 'react'
import { createPortal } from 'react-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import {
  LayoutDashboard, BookOpen, ClipboardList, Settings2,
  Lightbulb, Check, BarChart2, Plus, CalendarDays, Layers, Target,
  Pencil, Trash2, GripVertical, Sparkles, Loader2, Shield, Users, Search, X,
  Bell, Megaphone, Link2, Download, ChevronDown, RefreshCw,
  Mail, Ban, Flag, Activity, MessageSquare, Save,
} from 'lucide-react'
import { supabase } from './lib/supabase'

// ─── Global CSS ───────────────────────────────────────────────
const ANIM_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
* { box-sizing: border-box; margin: 0; padding: 0; }
html { overflow-x: hidden; max-width: 100vw; }
body { margin: 0; padding: 0; background: var(--bg); overflow: hidden; overflow-x: hidden; max-width: 100vw; height: 100vh; }
#root { margin: 0; padding: 0; width: 100%; max-width: 100vw; height: 100vh; overflow-x: hidden; }
:root {
  --bg: #080808; --card-bg: rgba(10,10,10,0.80); --card-border: #1c1c1c;
  --sidebar-bg: rgba(6,6,6,0.96); --sidebar-border: #141414;
  --text-hi: #ffffff; --text-md: #888888; --text-lo: #666666; --text-dim: #444444;
  --inp-bg: #080808; --inp-border: #1c1c1c; --divider: #111111;
  --card-shadow: none;
}
[data-glass="true"] {
  --card-bg: rgba(255,255,255,0.04);
  --card-border: rgba(255,255,255,0.08);
  --card-shadow: 0 4px 24px rgba(0,0,0,0.3);
  --card-blur: blur(20px);
  --modal-bg: rgba(14,14,14,0.85);
  --modal-border: rgba(255,255,255,0.08);
  --sidebar-bg: rgba(6,6,6,0.75);
}
[data-glass="true"][data-mode="light"] {
  --card-bg: rgba(255,255,255,0.65);
  --card-border: rgba(0,0,0,0.08);
  --card-shadow: 0 4px 24px rgba(0,0,0,0.12);
  --modal-bg: rgba(248,248,248,0.85);
  --modal-border: rgba(0,0,0,0.08);
  --sidebar-bg: rgba(248,248,248,0.75);
}
[data-glass="false"], :root {
  --modal-bg: #0a0a0a;
  --modal-border: #1e1e1e;
}
[data-glass="true"] .modal-inner { background: var(--modal-bg) !important; border-color: var(--modal-border) !important; backdrop-filter: blur(24px) !important; -webkit-backdrop-filter: blur(24px) !important; }
[data-glass="true"] .add-modal-inner { background: var(--modal-bg) !important; border-color: var(--modal-border) !important; backdrop-filter: blur(24px) !important; -webkit-backdrop-filter: blur(24px) !important; }
[data-mode="light"] {
  --bg: #f5f5f5; --card-bg: #ffffff; --card-border: #e0e0e0;
  --sidebar-bg: rgba(248,248,248,0.98); --sidebar-border: #e0e0e0;
  --text-hi: #111111; --text-md: #555555; --text-lo: #777777; --text-dim: #aaaaaa;
  --inp-bg: #f4f4f4; --inp-border: #d0d0d0; --divider: #e8e8e8;
}
[data-mode="light"] .nav-item { color: #555 !important; }
[data-mode="light"] .nav-item:hover { color: #111 !important; background: rgba(0,0,0,0.04) !important; border-color: #d8d8d8 !important; }
[data-mode="light"] .action-btn:hover { background: rgba(0,0,0,0.04) !important; border-color: #ccc !important; color: #333 !important; }
[data-mode="light"] ::-webkit-scrollbar-thumb { background: #ccc; }
::-webkit-scrollbar { width: 3px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
input, textarea, select { font-family: inherit !important; }
input::placeholder, textarea::placeholder { color: #555 !important; }
[data-mode="light"] input::placeholder, [data-mode="light"] textarea::placeholder { color: #aaa !important; }
input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.3); }
select option { background: #0d0d0d; color: #fff; }
.nav-item:hover { background: rgba(255,255,255,0.04) !important; border-color: #222 !important; color: #aaa !important; }
.trade-row { transition: background 0.15s; }
.trade-row:hover { background: rgba(255,255,255,0.04) !important; }
[data-mode="light"] .trade-row:hover { background: rgba(0,0,0,0.03) !important; }
.action-btn:hover { background: rgba(255,255,255,0.06) !important; border-color: #2a2a2a !important; color: #aaa !important; }
.swatch:hover { transform: scale(1.08); }
.del-btn:hover { color: #ff8080 !important; border-color: rgba(255,128,128,0.2) !important; }
.cal-day-active { transition: background 0.15s, border-color 0.15s; }
.cal-day-active:hover { background: rgba(255,255,255,0.05) !important; }
[data-mode="light"] .cal-day-active:hover { background: rgba(0,0,0,0.04) !important; }
.toggle-track { width:50px; height:28px; border-radius:14px; background:#1a1a1a; border:1px solid #333; position:relative; cursor:pointer; flex-shrink:0; transition:background 0.25s, border-color 0.25s; }
.toggle-track.on { background:#ffffff; border-color:#ffffff; }
.toggle-knob { position:absolute; top:3px; left:3px; width:20px; height:20px; border-radius:50%; background:#555; transition:transform 0.25s cubic-bezier(0.4,0,0.2,1), background 0.25s; box-shadow:0 1px 4px rgba(0,0,0,0.4); }
.toggle-track.on .toggle-knob { transform:translateX(22px); background:#111; }
.theme-pill { display:flex; align-items:center; gap:8px; width:120px; height:36px; padding:0 14px; border-radius:99px; cursor:pointer; transition:all 0.15s; font-family:inherit; font-size:13px; background:transparent; }
.theme-pill:hover { background: rgba(255,255,255,0.04); }
[data-mode="light"] .theme-pill:hover { background: rgba(0,0,0,0.04); }
/* ─── Layout grids ─── */
.stat-grid   { display: grid; grid-template-columns: repeat(5,1fr); gap: 10px; margin-bottom: 16px; }
.mobile-header { display: none; }
.chart-grid  { display: grid; grid-template-columns: 3fr 2fr; gap: 12px; margin-bottom: 12px; }
.radar-grid  { display: grid; grid-template-columns: 2fr 3fr; gap: 12px; }
.ana-grid    { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.form-grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
.form-grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; }
.cal-scroll  { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.page-wrap   { padding: 36px 40px; }
* { -webkit-overflow-scrolling: touch; }
/* ─── Mobile ─── */
@media (max-width: 768px) {
  /* Sidebar / bottom nav — both hidden on mobile (replaced by hamburger) */
  .app-sidebar { display: none !important; }
  .bottom-nav  { display: none !important; }
  /* Mobile top header */
  .mobile-header {
    display: flex !important;
    position: fixed; top: 0; left: 0; right: 0; height: 56px; z-index: 100;
    align-items: center; justify-content: space-between;
    padding: 0 16px; box-sizing: border-box;
    background: rgba(10,10,10,0.95);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid #1f1f1f;
  }
  /* Grids */
  .stat-grid   { grid-template-columns: repeat(2,1fr) !important; gap: 10px !important; }
  .stat-grid > *:last-child { grid-column: span 2; }
  .chart-grid  { grid-template-columns: 1fr !important; gap: 10px !important; }
  .radar-grid  { grid-template-columns: 1fr !important; gap: 10px !important; }
  .ana-grid    { grid-template-columns: 1fr !important; gap: 10px !important; }
  .form-grid-4 { grid-template-columns: 1fr 1fr !important; }
  .form-grid-3 { grid-template-columns: 1fr !important; }
  /* Modals */
  .modal-overlay { padding: 0 !important; align-items: flex-end !important; }
  .modal-inner   { width: 100% !important; max-width: 100% !important; border-radius: 18px 18px 0 0 !important; max-height: 92vh !important; }
  /* Touch targets */
  button { min-height: 44px; }
  /* Page padding — top clears fixed header, no bottom nav */
  .page-wrap { padding: 76px 16px 24px !important; overflow-x: hidden !important; max-width: 100vw !important; box-sizing: border-box !important; }
  /* Aurora blobs — boost visibility on mobile */
  .aurora-blob { opacity: 0.4 !important; min-width: 400px !important; min-height: 400px !important; }
  /* Dashboard grid children — must not stretch past viewport */
  .chart-grid > *, .radar-grid > *, .stat-grid > * { min-width: 0; max-width: 100%; box-sizing: border-box !important; overflow-x: hidden; width: 100%; }
  /* iOS input zoom prevention (< 16px triggers zoom) */
  input, textarea, select { font-size: 16px !important; }
  /* Page transitions — no translateX on mobile to avoid layout shift */
  .page-wrap { animation: pageFadeMobile 0.15s ease-out both !important; }
  /* Glass mode — ensure backdrop-filter works on mobile */
  [data-glass="true"] .modal-inner, [data-glass="true"] .add-modal-inner { background: rgba(12,12,12,0.92) !important; }
  /* Disable hover lifts on touch devices */
  .card-lift:hover { transform: none !important; }
  .btn-scale:hover { transform: none !important; }
  /* Auth */
  .auth-outer  { margin: 10px auto !important; width: calc(100vw - 28px) !important; max-width: 440px; }
  .auth-logo-block { margin-bottom: 18px !important; }
  .auth-logo-img   { height: 56px !important; margin-bottom: 10px !important; }
  .auth-tagline    { margin-top: 4px !important; }
  .auth-form-inner { padding: 16px 18px 14px !important; }
  .auth-form-inner input { font-size: 14px !important; padding: 7px 11px !important; }
  .auth-form-inner button[type!="button"] { padding: 10px !important; }
  .auth-field  { margin-bottom: 10px !important; }
  .auth-pw     { margin-bottom: 14px !important; }
  .auth-tabs button { padding: 8px !important; font-size: 13px !important; }
}
@keyframes pageFadeMobile {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes goalPulse {
  0%, 100% { transform: scale(1);    opacity: 1;    }
  50%      { transform: scale(1.04); opacity: 0.85; }
}
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.spin { animation: spin 0.9s linear infinite; }
.check-item .check-actions { opacity: 0; transition: opacity 0.15s; }
.check-item:hover .check-actions, .check-item.editing .check-actions { opacity: 1; }
@keyframes confettiFall {
  0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
  100% { transform: translateY(120px) rotate(360deg); opacity: 0; }
}
.mobile-sidebar-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 198;
  opacity: 0; pointer-events: none;
  transition: opacity 0.28s ease;
}
.mobile-sidebar {
  position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
  background: #0d0d0d; border-right: 1px solid #1f1f1f;
  z-index: 199; display: flex; flex-direction: column;
  padding: 24px 14px; box-sizing: border-box;
  overflow-y: auto; overflow-x: hidden;
  transform: translateX(-100%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: transform;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
@media (max-width: 480px) {
  /* Stack form-grid-2 single column on phone */
  .form-grid-2 { grid-template-columns: 1fr !important; }
  /* Hide news Prev/Fcst/Act on tiny screens to keep rows clean */
  .news-row-meta { display: none !important; }
}
@media (max-width: 420px) {
  .stat-grid   { grid-template-columns: repeat(2,1fr) !important; }
  .form-grid-4 { grid-template-columns: 1fr !important; }
}
@keyframes orb1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(-20px,30px) scale(1.1); }
  66%     { transform: translate(20px,-20px) scale(0.95); }
}
@keyframes orb2 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(30px,-20px) scale(1.05); }
  66%     { transform: translate(-15px,25px) scale(1.1); }
}
@keyframes orb3 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(-15px,-25px) scale(0.95); }
  66%     { transform: translate(20px,15px) scale(1.05); }
}
@keyframes orb4 {
  0%,100% { transform: translate(0,0) scale(1); }
  33%     { transform: translate(10px,20px) scale(1.08); }
  66%     { transform: translate(-20px,-10px) scale(0.92); }
}
html { scroll-behavior: smooth; }
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);     }
}
@keyframes pageFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pageEnter {
  from { opacity: 0; transform: translateX(8px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes modalIn {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes chartReveal {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 0% 0 0); }
}
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position:  200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  border-radius: 6px;
}
.btn-scale { transition: transform 0.15s ease, opacity 0.15s !important; }
.btn-scale:hover:not(:disabled) { transform: scale(1.02) !important; }
.btn-scale:active:not(:disabled) { transform: scale(0.97) !important; }
button:active:not(:disabled) { transform: scale(0.97); }
.thumb-wrap { overflow: hidden; border-radius: 8px; }
.thumb-wrap img { transition: transform 0.2s ease !important; cursor: zoom-in !important; }
.thumb-wrap img:hover { transform: scale(1.03) !important; }
.card-lift { transition: transform 0.15s ease, box-shadow 0.15s ease !important; }
.card-lift:hover { transform: translateY(-2px) !important; }
input:focus, textarea:focus, select:focus { border-color: #444 !important; outline: none; box-shadow: 0 0 0 2px rgba(255,255,255,0.1) !important; }
[data-mode="light"] input:focus, [data-mode="light"] textarea:focus, [data-mode="light"] select:focus { border-color: #aaa !important; box-shadow: 0 0 0 2px rgba(0,0,0,0.07) !important; }
.news-filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
.news-pills { display: flex; gap: 6px; flex-shrink: 0; }
@media (max-width: 768px) {
  .news-filters { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 4px; -webkit-overflow-scrolling: touch; }
  .news-filters::-webkit-scrollbar { display: none; }
}
.add-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.75);
  backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px; box-sizing: border-box;
}
.add-modal-inner {
  background: #0d0d0d; border: 1px solid #1f1f1f;
  border-radius: 16px; width: 100%; max-width: 680px;
  max-height: 90vh; overflow-y: auto;
  animation: modalIn 0.2s ease both;
  position: relative;
}
@media (max-width: 768px) {
  .add-modal-overlay { padding: 0 !important; align-items: stretch !important; }
  .add-modal-inner { max-width: 100% !important; max-height: 100% !important; height: 100%; border-radius: 0 !important; }
}
`

// ─── Theme Config ─────────────────────────────────────────────
const THEME_COLORS = {
  white:  ['#333333', '#222222'],
  blue:   ['#0055ff', '#0033dd'],
  teal:   ['#00ccaa', '#00aa88'],
  purple: ['#7700ff', '#5500dd'],
  red:    ['#ff0033', '#dd0022'],
  pink:   ['#ff44aa', '#dd2288'],
}

const SWATCHES = [
  { id: 'white',  color: '#ffffff', label: 'White'  },
  { id: 'blue',   color: '#0066ff', label: 'Blue'   },
  { id: 'teal',   color: '#00d4aa', label: 'Teal'   },
  { id: 'purple', color: '#7c3aed', label: 'Purple' },
  { id: 'red',    color: '#ff2244', label: 'Red'    },
  { id: 'pink',   color: '#ff6eb4', label: 'Pink'   },
]

// ─── Shared Style Tokens ──────────────────────────────────────
const card = {
  background: 'var(--card-bg)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid var(--card-border)',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: 'var(--card-shadow)',
  transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
}

const lbl = {
  fontSize: '10px',
  color: 'var(--text-lo)',
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  fontWeight: '600',
  marginBottom: '4px',
}

const badge = (win) => ({
  display: 'inline-block',
  padding: '3px 9px',
  borderRadius: '99px',
  fontSize: '11px',
  fontWeight: '600',
  background: win ? 'rgba(170,255,160,0.07)' : 'rgba(255,128,128,0.07)',
  color: win ? '#aaffa0' : '#ff8080',
  border: `1px solid ${win ? 'rgba(170,255,160,0.14)' : 'rgba(255,128,128,0.14)'}`,
})

const badgeBE = {
  display: 'inline-block',
  padding: '3px 9px',
  borderRadius: '99px',
  fontSize: '11px',
  fontWeight: '600',
  background: '#ffffff15',
  color: '#999999',
  border: '1px solid #444',
}

const TH = {
  fontSize: '10px',
  color: 'var(--text-lo)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  padding: '0 14px 14px',
  textAlign: 'left',
  fontWeight: '600',
  whiteSpace: 'nowrap',
}

const TD = {
  padding: '12px 14px',
  fontSize: '13px',
  borderTop: '1px solid var(--divider)',
}

const btn = {
  background: '#fff',
  color: '#000',
  border: 'none',
  borderRadius: '10px',
  padding: '10px 20px',
  cursor: 'pointer',
  fontWeight: '700',
  fontSize: '13px',
  letterSpacing: '-0.2px',
  fontFamily: 'inherit',
  transition: 'opacity 0.15s, transform 0.15s',
}

const inp = {
  width: '100%',
  background: 'var(--inp-bg)',
  border: '1px solid var(--inp-border)',
  borderRadius: '8px',
  padding: '10px 12px',
  color: 'var(--text-hi)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  transition: 'border-color 0.15s',
}

// ─── Helpers ──────────────────────────────────────────────────
const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}


// ─── Aurora Background ────────────────────────────────────────
function AuroraBackground({ theme }) {
  const [c1, c2] = THEME_COLORS[theme] || THEME_COLORS.white
  const blob = (color, blur, anim, opacity, style) => ({
    position: 'absolute', borderRadius: '50%',
    background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
    filter: `blur(${blur}px)`,
    animation: `${anim} ease-in-out infinite`,
    opacity,
    ...style,
  })
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none' }}>
      {/* Blob 1 — top-left */}
      <div className="aurora-blob" style={blob(c1, 100, 'orb1 25s', 0.42, { top: '-10%',  left: '-10%',  width: '700px', height: '700px' })} />
      {/* Blob 2 — bottom-right */}
      <div className="aurora-blob" style={blob(c2, 120, 'orb2 30s', 0.40, { bottom: '-15%', right: '-10%', width: '800px', height: '800px' })} />
      {/* Blob 3 — center offset */}
      <div className="aurora-blob" style={blob(c1, 90,  'orb3 20s', 0.35, { top: '30%',   left: '28%',   width: '600px', height: '600px' })} />
      {/* Blob 4 — top-right, half opacity */}
      <div className="aurora-blob" style={blob(c2, 80,  'orb4 35s', 0.20, { top: '-5%',   right: '-5%',  width: '500px', height: '500px' })} />
      {/* Grain texture overlay */}
      <svg style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1, pointerEvents: 'none', opacity: 0.04 }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
          <feColorMatrix type="saturate" values="0"/>
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" opacity="0.15"/>
      </svg>
    </div>
  )
}

// ─── Countries ────────────────────────────────────────────────
const COUNTRIES = [
  { flag: '🇦🇫', name: 'Afghanistan',             code: '+93'   },
  { flag: '🇦🇱', name: 'Albania',                  code: '+355'  },
  { flag: '🇩🇿', name: 'Algeria',                  code: '+213'  },
  { flag: '🇦🇩', name: 'Andorra',                  code: '+376'  },
  { flag: '🇦🇴', name: 'Angola',                   code: '+244'  },
  { flag: '🇦🇬', name: 'Antigua & Barbuda',        code: '+1268' },
  { flag: '🇦🇷', name: 'Argentina',                code: '+54'   },
  { flag: '🇦🇲', name: 'Armenia',                  code: '+374'  },
  { flag: '🇦🇼', name: 'Aruba',                    code: '+297'  },
  { flag: '🇦🇺', name: 'Australia',                code: '+61'   },
  { flag: '🇦🇹', name: 'Austria',                  code: '+43'   },
  { flag: '🇦🇿', name: 'Azerbaijan',               code: '+994'  },
  { flag: '🇧🇸', name: 'Bahamas',                  code: '+1242' },
  { flag: '🇧🇭', name: 'Bahrain',                  code: '+973'  },
  { flag: '🇧🇩', name: 'Bangladesh',               code: '+880'  },
  { flag: '🇧🇧', name: 'Barbados',                 code: '+1246' },
  { flag: '🇧🇾', name: 'Belarus',                  code: '+375'  },
  { flag: '🇧🇪', name: 'Belgium',                  code: '+32'   },
  { flag: '🇧🇿', name: 'Belize',                   code: '+501'  },
  { flag: '🇧🇯', name: 'Benin',                    code: '+229'  },
  { flag: '🇧🇹', name: 'Bhutan',                   code: '+975'  },
  { flag: '🇧🇴', name: 'Bolivia',                  code: '+591'  },
  { flag: '🇧🇦', name: 'Bosnia & Herzegovina',     code: '+387'  },
  { flag: '🇧🇼', name: 'Botswana',                 code: '+267'  },
  { flag: '🇧🇷', name: 'Brazil',                   code: '+55'   },
  { flag: '🇧🇳', name: 'Brunei',                   code: '+673'  },
  { flag: '🇧🇬', name: 'Bulgaria',                 code: '+359'  },
  { flag: '🇧🇫', name: 'Burkina Faso',             code: '+226'  },
  { flag: '🇧🇮', name: 'Burundi',                  code: '+257'  },
  { flag: '🇨🇻', name: 'Cabo Verde',               code: '+238'  },
  { flag: '🇰🇭', name: 'Cambodia',                 code: '+855'  },
  { flag: '🇨🇲', name: 'Cameroon',                 code: '+237'  },
  { flag: '🇨🇦', name: 'Canada',                   code: '+1'    },
  { flag: '🇨🇫', name: 'Central African Republic', code: '+236'  },
  { flag: '🇹🇩', name: 'Chad',                     code: '+235'  },
  { flag: '🇨🇱', name: 'Chile',                    code: '+56'   },
  { flag: '🇨🇳', name: 'China',                    code: '+86'   },
  { flag: '🇨🇴', name: 'Colombia',                 code: '+57'   },
  { flag: '🇰🇲', name: 'Comoros',                  code: '+269'  },
  { flag: '🇨🇬', name: 'Congo',                    code: '+242'  },
  { flag: '🇨🇩', name: 'Congo (DR)',               code: '+243'  },
  { flag: '🇨🇷', name: 'Costa Rica',               code: '+506'  },
  { flag: '🇭🇷', name: 'Croatia',                  code: '+385'  },
  { flag: '🇨🇺', name: 'Cuba',                     code: '+53'   },
  { flag: '🇨🇾', name: 'Cyprus',                   code: '+357'  },
  { flag: '🇨🇿', name: 'Czech Republic',           code: '+420'  },
  { flag: '🇩🇰', name: 'Denmark',                  code: '+45'   },
  { flag: '🇩🇯', name: 'Djibouti',                 code: '+253'  },
  { flag: '🇩🇲', name: 'Dominica',                 code: '+1767' },
  { flag: '🇩🇴', name: 'Dominican Republic',       code: '+1809' },
  { flag: '🇪🇨', name: 'Ecuador',                  code: '+593'  },
  { flag: '🇪🇬', name: 'Egypt',                    code: '+20'   },
  { flag: '🇸🇻', name: 'El Salvador',              code: '+503'  },
  { flag: '🇬🇶', name: 'Equatorial Guinea',        code: '+240'  },
  { flag: '🇪🇷', name: 'Eritrea',                  code: '+291'  },
  { flag: '🇪🇪', name: 'Estonia',                  code: '+372'  },
  { flag: '🇸🇿', name: 'Eswatini',                 code: '+268'  },
  { flag: '🇪🇹', name: 'Ethiopia',                 code: '+251'  },
  { flag: '🇫🇯', name: 'Fiji',                     code: '+679'  },
  { flag: '🇫🇮', name: 'Finland',                  code: '+358'  },
  { flag: '🇫🇷', name: 'France',                   code: '+33'   },
  { flag: '🇬🇦', name: 'Gabon',                    code: '+241'  },
  { flag: '🇬🇲', name: 'Gambia',                   code: '+220'  },
  { flag: '🇬🇪', name: 'Georgia',                  code: '+995'  },
  { flag: '🇩🇪', name: 'Germany',                  code: '+49'   },
  { flag: '🇬🇭', name: 'Ghana',                    code: '+233'  },
  { flag: '🇬🇷', name: 'Greece',                   code: '+30'   },
  { flag: '🇬🇩', name: 'Grenada',                  code: '+1473' },
  { flag: '🇬🇹', name: 'Guatemala',                code: '+502'  },
  { flag: '🇬🇳', name: 'Guinea',                   code: '+224'  },
  { flag: '🇬🇼', name: 'Guinea-Bissau',            code: '+245'  },
  { flag: '🇬🇾', name: 'Guyana',                   code: '+592'  },
  { flag: '🇭🇹', name: 'Haiti',                    code: '+509'  },
  { flag: '🇭🇳', name: 'Honduras',                 code: '+504'  },
  { flag: '🇭🇺', name: 'Hungary',                  code: '+36'   },
  { flag: '🇮🇸', name: 'Iceland',                  code: '+354'  },
  { flag: '🇮🇳', name: 'India',                    code: '+91'   },
  { flag: '🇮🇩', name: 'Indonesia',                code: '+62'   },
  { flag: '🇮🇷', name: 'Iran',                     code: '+98'   },
  { flag: '🇮🇶', name: 'Iraq',                     code: '+964'  },
  { flag: '🇮🇪', name: 'Ireland',                  code: '+353'  },
  { flag: '🇮🇱', name: 'Israel',                   code: '+972'  },
  { flag: '🇮🇹', name: 'Italy',                    code: '+39'   },
  { flag: '🇯🇲', name: 'Jamaica',                  code: '+1876' },
  { flag: '🇯🇵', name: 'Japan',                    code: '+81'   },
  { flag: '🇯🇴', name: 'Jordan',                   code: '+962'  },
  { flag: '🇰🇿', name: 'Kazakhstan',               code: '+7'    },
  { flag: '🇰🇪', name: 'Kenya',                    code: '+254'  },
  { flag: '🇰🇮', name: 'Kiribati',                 code: '+686'  },
  { flag: '🇽🇰', name: 'Kosovo',                   code: '+383'  },
  { flag: '🇰🇼', name: 'Kuwait',                   code: '+965'  },
  { flag: '🇰🇬', name: 'Kyrgyzstan',               code: '+996'  },
  { flag: '🇱🇦', name: 'Laos',                     code: '+856'  },
  { flag: '🇱🇻', name: 'Latvia',                   code: '+371'  },
  { flag: '🇱🇧', name: 'Lebanon',                  code: '+961'  },
  { flag: '🇱🇸', name: 'Lesotho',                  code: '+266'  },
  { flag: '🇱🇷', name: 'Liberia',                  code: '+231'  },
  { flag: '🇱🇾', name: 'Libya',                    code: '+218'  },
  { flag: '🇱🇮', name: 'Liechtenstein',            code: '+423'  },
  { flag: '🇱🇹', name: 'Lithuania',                code: '+370'  },
  { flag: '🇱🇺', name: 'Luxembourg',               code: '+352'  },
  { flag: '🇲🇬', name: 'Madagascar',               code: '+261'  },
  { flag: '🇲🇼', name: 'Malawi',                   code: '+265'  },
  { flag: '🇲🇾', name: 'Malaysia',                 code: '+60'   },
  { flag: '🇲🇻', name: 'Maldives',                 code: '+960'  },
  { flag: '🇲🇱', name: 'Mali',                     code: '+223'  },
  { flag: '🇲🇹', name: 'Malta',                    code: '+356'  },
  { flag: '🇲🇭', name: 'Marshall Islands',         code: '+692'  },
  { flag: '🇲🇷', name: 'Mauritania',               code: '+222'  },
  { flag: '🇲🇺', name: 'Mauritius',                code: '+230'  },
  { flag: '🇲🇽', name: 'Mexico',                   code: '+52'   },
  { flag: '🇫🇲', name: 'Micronesia',               code: '+691'  },
  { flag: '🇲🇩', name: 'Moldova',                  code: '+373'  },
  { flag: '🇲🇨', name: 'Monaco',                   code: '+377'  },
  { flag: '🇲🇳', name: 'Mongolia',                 code: '+976'  },
  { flag: '🇲🇪', name: 'Montenegro',               code: '+382'  },
  { flag: '🇲🇦', name: 'Morocco',                  code: '+212'  },
  { flag: '🇲🇿', name: 'Mozambique',               code: '+258'  },
  { flag: '🇲🇲', name: 'Myanmar',                  code: '+95'   },
  { flag: '🇳🇦', name: 'Namibia',                  code: '+264'  },
  { flag: '🇳🇷', name: 'Nauru',                    code: '+674'  },
  { flag: '🇳🇵', name: 'Nepal',                    code: '+977'  },
  { flag: '🇳🇱', name: 'Netherlands',              code: '+31'   },
  { flag: '🇳🇿', name: 'New Zealand',              code: '+64'   },
  { flag: '🇳🇮', name: 'Nicaragua',                code: '+505'  },
  { flag: '🇳🇪', name: 'Niger',                    code: '+227'  },
  { flag: '🇳🇬', name: 'Nigeria',                  code: '+234'  },
  { flag: '🇰🇵', name: 'North Korea',              code: '+850'  },
  { flag: '🇲🇰', name: 'North Macedonia',          code: '+389'  },
  { flag: '🇳🇴', name: 'Norway',                   code: '+47'   },
  { flag: '🇴🇲', name: 'Oman',                     code: '+968'  },
  { flag: '🇵🇰', name: 'Pakistan',                 code: '+92'   },
  { flag: '🇵🇼', name: 'Palau',                    code: '+680'  },
  { flag: '🇵🇸', name: 'Palestine',                code: '+970'  },
  { flag: '🇵🇦', name: 'Panama',                   code: '+507'  },
  { flag: '🇵🇬', name: 'Papua New Guinea',         code: '+675'  },
  { flag: '🇵🇾', name: 'Paraguay',                 code: '+595'  },
  { flag: '🇵🇪', name: 'Peru',                     code: '+51'   },
  { flag: '🇵🇭', name: 'Philippines',              code: '+63'   },
  { flag: '🇵🇱', name: 'Poland',                   code: '+48'   },
  { flag: '🇵🇹', name: 'Portugal',                 code: '+351'  },
  { flag: '🇵🇷', name: 'Puerto Rico',              code: '+1787' },
  { flag: '🇶🇦', name: 'Qatar',                    code: '+974'  },
  { flag: '🇷🇴', name: 'Romania',                  code: '+40'   },
  { flag: '🇷🇺', name: 'Russia',                   code: '+7'    },
  { flag: '🇷🇼', name: 'Rwanda',                   code: '+250'  },
  { flag: '🇰🇳', name: 'Saint Kitts & Nevis',      code: '+1869' },
  { flag: '🇱🇨', name: 'Saint Lucia',              code: '+1758' },
  { flag: '🇻🇨', name: 'Saint Vincent',            code: '+1784' },
  { flag: '🇼🇸', name: 'Samoa',                    code: '+685'  },
  { flag: '🇸🇲', name: 'San Marino',               code: '+378'  },
  { flag: '🇸🇹', name: 'São Tomé & Príncipe',      code: '+239'  },
  { flag: '🇸🇦', name: 'Saudi Arabia',             code: '+966'  },
  { flag: '🇸🇳', name: 'Senegal',                  code: '+221'  },
  { flag: '🇷🇸', name: 'Serbia',                   code: '+381'  },
  { flag: '🇸🇨', name: 'Seychelles',               code: '+248'  },
  { flag: '🇸🇱', name: 'Sierra Leone',             code: '+232'  },
  { flag: '🇸🇬', name: 'Singapore',                code: '+65'   },
  { flag: '🇸🇰', name: 'Slovakia',                 code: '+421'  },
  { flag: '🇸🇮', name: 'Slovenia',                 code: '+386'  },
  { flag: '🇸🇧', name: 'Solomon Islands',          code: '+677'  },
  { flag: '🇸🇴', name: 'Somalia',                  code: '+252'  },
  { flag: '🇿🇦', name: 'South Africa',             code: '+27'   },
  { flag: '🇰🇷', name: 'South Korea',              code: '+82'   },
  { flag: '🇸🇸', name: 'South Sudan',              code: '+211'  },
  { flag: '🇪🇸', name: 'Spain',                    code: '+34'   },
  { flag: '🇱🇰', name: 'Sri Lanka',                code: '+94'   },
  { flag: '🇸🇩', name: 'Sudan',                    code: '+249'  },
  { flag: '🇸🇷', name: 'Suriname',                 code: '+597'  },
  { flag: '🇸🇪', name: 'Sweden',                   code: '+46'   },
  { flag: '🇨🇭', name: 'Switzerland',              code: '+41'   },
  { flag: '🇸🇾', name: 'Syria',                    code: '+963'  },
  { flag: '🇹🇼', name: 'Taiwan',                   code: '+886'  },
  { flag: '🇹🇯', name: 'Tajikistan',               code: '+992'  },
  { flag: '🇹🇿', name: 'Tanzania',                 code: '+255'  },
  { flag: '🇹🇭', name: 'Thailand',                 code: '+66'   },
  { flag: '🇹🇱', name: 'Timor-Leste',              code: '+670'  },
  { flag: '🇹🇬', name: 'Togo',                     code: '+228'  },
  { flag: '🇹🇴', name: 'Tonga',                    code: '+676'  },
  { flag: '🇹🇹', name: 'Trinidad & Tobago',        code: '+1868' },
  { flag: '🇹🇳', name: 'Tunisia',                  code: '+216'  },
  { flag: '🇹🇷', name: 'Turkey',                   code: '+90'   },
  { flag: '🇹🇲', name: 'Turkmenistan',             code: '+993'  },
  { flag: '🇹🇻', name: 'Tuvalu',                   code: '+688'  },
  { flag: '🇺🇬', name: 'Uganda',                   code: '+256'  },
  { flag: '🇺🇦', name: 'Ukraine',                  code: '+380'  },
  { flag: '🇦🇪', name: 'United Arab Emirates',     code: '+971'  },
  { flag: '🇬🇧', name: 'United Kingdom',           code: '+44'   },
  { flag: '🇺🇸', name: 'United States',            code: '+1'    },
  { flag: '🇺🇾', name: 'Uruguay',                  code: '+598'  },
  { flag: '🇺🇿', name: 'Uzbekistan',               code: '+998'  },
  { flag: '🇻🇺', name: 'Vanuatu',                  code: '+678'  },
  { flag: '🇻🇦', name: 'Vatican City',             code: '+379'  },
  { flag: '🇻🇪', name: 'Venezuela',                code: '+58'   },
  { flag: '🇻🇳', name: 'Vietnam',                  code: '+84'   },
  { flag: '🇾🇪', name: 'Yemen',                    code: '+967'  },
  { flag: '🇿🇲', name: 'Zambia',                   code: '+260'  },
  { flag: '🇿🇼', name: 'Zimbabwe',                 code: '+263'  },
]

const DEFAULT_COUNTRY = COUNTRIES.find(c => c.name === 'United States')

// ─── Auth Page ────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [tab, setTab]           = useState('signup')
  const [view, setView]         = useState('auth') // 'auth' | 'forgot'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [country, setCountry]     = useState(DEFAULT_COUNTRY)
  const [phoneNum, setPhoneNum]   = useState('')
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [inviteCode, setInviteCode] = useState(null)
  const [inviteValid, setInviteValid] = useState(null) // null | true | false

  // Detect ?invite=XXX in URL and validate it
  useEffect(() => {
    if (typeof window === 'undefined') return
    const code = new URLSearchParams(window.location.search).get('invite')
    if (!code) return
    setInviteCode(code)
    ;(async () => {
      try {
        const { data } = await supabase.from('invites').select('code,used_at').eq('code', code).maybeSingle()
        setInviteValid(!!data && !data.used_at)
      } catch { setInviteValid(false) }
    })()
  }, [])

  const goForgot = () => { setView('forgot'); setError(''); setMessage('') }
  const goAuth   = () => { setView('auth');   setError(''); setMessage('') }

  const submitForgot = async () => {
    setError('')
    setMessage('')
    if (!email.trim()) { setError('Enter your email'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://limitless-journal.vercel.app',
      })
      if (error) throw error
      setMessage('Check your email for a password reset link')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  const onForgotKey = (e) => { if (e.key === 'Enter') submitForgot() }

  const submit = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      if (tab === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuth(data.session)
      } else {
        // Re-validate invite at submit time (anti-stale)
        let autoApprove = false
        if (inviteCode) {
          const { data: inv } = await supabase.from('invites').select('code,used_at').eq('code', inviteCode).maybeSingle()
          autoApprove = !!inv && !inv.used_at
        }
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        const phone = phoneNum ? `${country.code} ${phoneNum}` : null
        if (data.session) {
          const userId = data.session.user.id
          await supabase.from('profiles').upsert({
            id: userId,
            first_name: firstName || null,
            last_name:  lastName  || null,
            phone:      phone,
            ...(autoApprove ? { status: 'approved' } : {}),
          }, { onConflict: 'id' })
          if (autoApprove) {
            await supabase.from('invites').update({ used_at: new Date().toISOString(), used_by: userId }).eq('code', inviteCode).is('used_at', null)
          }
          onAuth(data.session)
        } else {
          // Email confirm required — store invite for later application on first login
          if (autoApprove) {
            try { localStorage.setItem('pending_invite', inviteCode) } catch {}
          }
          setMessage('Account created — check your email to confirm, then log in.')
          setTab('login')
        }
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const onKey = (e) => { if (e.key === 'Enter') submit() }

  const switchTab = (t) => { setTab(t); setError(''); setMessage('') }

  const tabStyle = (active) => ({
    flex: 1,
    padding: '10px',
    background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
    border: 'none',
    borderBottom: active ? '1px solid #333' : '1px solid transparent',
    color: active ? '#fff' : '#555',
    fontSize: '13px',
    fontWeight: active ? '600' : '400',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
    borderRadius: '8px 8px 0 0',
  })

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100vw', height: '100vh',
      background: '#080808', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative',
      overflowY: 'auto',
    }}>
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />
      <AuroraBackground theme="white" />

      <div className="auth-outer" style={{ position: 'relative', zIndex: 2, width: tab === 'signup' ? '440px' : '380px', transition: 'width 0.2s', margin: '40px auto' }}>
        {/* Logo */}
        <div className="auth-logo-block" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img className="auth-logo-img" src="/logo2.png" alt="logo" style={{ height: '64px', marginBottom: '14px', display: 'block', margin: '0 auto 14px' }} />
          <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '0.22em', color: '#fff', lineHeight: 1 }}>
            LIMITLESS
          </div>
          <div className="auth-tagline" style={{ fontSize: '9px', color: '#ffffff', letterSpacing: '0.3em', marginTop: '7px', textTransform: 'uppercase', fontWeight: '600' }}>
            Private Journal
          </div>
        </div>

        {/* Card */}
        <div style={{ ...card, padding: '0', overflow: 'hidden' }}>
          {view === 'forgot' ? (
            <div className="auth-form-inner" style={{ padding: '28px 28px 24px' }}>
              <div style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.3px', color: '#fff', marginBottom: '6px' }}>Reset Password</div>
                <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.5 }}>Enter your email and we'll send you a reset link.</div>
              </div>

              {message && (
                <div style={{ background: 'rgba(170,255,160,0.05)', border: '1px solid rgba(170,255,160,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#aaffa0', marginBottom: '18px', lineHeight: 1.5 }}>
                  {message}
                </div>
              )}
              {error && (
                <div style={{ background: 'rgba(255,128,128,0.05)', border: '1px solid rgba(255,128,128,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#ff8080', marginBottom: '18px', lineHeight: 1.5 }}>
                  {error}
                </div>
              )}

              <div className="auth-field" style={{ marginBottom: '18px' }}>
                <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Email</div>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={onForgotKey}
                  style={inp}
                  autoComplete="email"
                />
              </div>

              <button
                style={{ ...btn, width: '100%', padding: '12px', opacity: loading ? 0.6 : 1, marginBottom: '14px' }}
                onClick={submitForgot}
                disabled={loading}
              >
                {loading ? '...' : 'Send Reset Link'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={goAuth}
                  style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 0', letterSpacing: '0.02em', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#aaa' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#666' }}
                >
                  ← Back to Login
                </button>
              </div>
            </div>
          ) : (
          <>
          {/* Tabs */}
          <div className="auth-tabs" style={{ display: 'flex', borderBottom: '1px solid #141414' }}>
            <button style={tabStyle(tab === 'login')}  onClick={() => switchTab('login')}>Login</button>
            <button style={tabStyle(tab === 'signup')} onClick={() => switchTab('signup')}>Sign Up</button>
          </div>

          {/* Form */}
          <div className="auth-form-inner" style={{ padding: '28px 28px 24px' }}>
            {message && (
              <div style={{ background: 'rgba(170,255,160,0.05)', border: '1px solid rgba(170,255,160,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#aaffa0', marginBottom: '18px', lineHeight: 1.5 }}>
                {message}
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(255,128,128,0.05)', border: '1px solid rgba(255,128,128,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#ff8080', marginBottom: '18px', lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            {/* Invite indicator (signup) */}
            {tab === 'signup' && inviteCode && inviteValid !== null && (
              <div style={{
                background: inviteValid ? 'rgba(170,255,160,0.05)' : 'rgba(255,217,102,0.05)',
                border: `1px solid ${inviteValid ? 'rgba(170,255,160,0.20)' : 'rgba(255,217,102,0.20)'}`,
                borderRadius: '8px', padding: '10px 14px', marginBottom: '14px',
                fontSize: '12px', color: inviteValid ? '#aaffa0' : '#ffd966',
                lineHeight: 1.5,
              }}>
                {inviteValid
                  ? `🎟️ Invite code ${inviteCode} — auto-approved on signup`
                  : `Invite code ${inviteCode} is invalid or already used`}
              </div>
            )}

            {/* Sign Up extra fields */}
            {tab === 'signup' && (
              <>
                {/* First + Last name */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  <div>
                    <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>First Name</div>
                    <input
                      type="text"
                      placeholder="Johnny"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      onKeyDown={onKey}
                      style={inp}
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Last Name</div>
                    <input
                      type="text"
                      placeholder="Smith"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      onKeyDown={onKey}
                      style={inp}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                {/* Phone with country selector */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Phone Number</div>
                  <div style={{ display: 'flex', border: '1px solid #1c1c1c', borderRadius: '8px', overflow: 'hidden', background: '#080808' }}>
                    <select
                      value={country.name}
                      onChange={e => setCountry(COUNTRIES.find(c => c.name === e.target.value))}
                      style={{
                        background: '#080808',
                        border: 'none',
                        borderRight: '1px solid #1c1c1c',
                        color: '#ccc',
                        fontSize: '13px',
                        padding: '10px 8px 10px 10px',
                        outline: 'none',
                        cursor: 'pointer',
                        flexShrink: 0,
                        width: '148px',
                        fontFamily: 'inherit',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                      }}
                    >
                      {COUNTRIES.map(c => (
                        <option key={c.name} value={c.name}>
                          {c.name} {c.code}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', color: '#555', fontSize: '13px', flexShrink: 0, borderRight: '1px solid #1c1c1c', whiteSpace: 'nowrap' }}>
                      {country.code}
                    </div>
                    <input
                      type="tel"
                      placeholder="555 1234"
                      value={phoneNum}
                      onChange={e => setPhoneNum(e.target.value)}
                      onKeyDown={onKey}
                      style={{ ...inp, border: 'none', borderRadius: 0, flex: 1, width: 'auto' }}
                      autoComplete="tel-national"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div className="auth-field" style={{ marginBottom: '14px' }}>
              <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Email</div>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={onKey}
                style={inp}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="auth-pw" style={{ marginBottom: tab === 'login' ? '8px' : '22px' }}>
              <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Password</div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={onKey}
                style={inp}
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {tab === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={goForgot}
                  style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', padding: '2px 0', letterSpacing: '0.02em', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#aaa' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#666' }}
                >
                  Forgot Password?
                </button>
              </div>
            )}

            <button
              style={{ ...btn, width: '100%', padding: '12px', opacity: loading ? 0.6 : 1 }}
              onClick={submit}
              disabled={loading}
            >
              {loading ? '...' : tab === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PnlTooltip ───────────────────────────────────────────────
function PnlTooltip({ active, payload, label: day }) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '10px', padding: '10px 14px' }}>
      <div style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>{day}</div>
      <div style={{ fontSize: '15px', fontWeight: '700', color: val >= 0 ? '#aaffa0' : '#ff8080' }}>
        {val >= 0 ? '+' : '−'}${Math.abs(val)?.toLocaleString()}
      </div>
    </div>
  )
}

// ─── Calendar Heatmap ─────────────────────────────────────────
function CalendarHeatmap({ trades, viewDate, onPrev, onNext }) {
  const [popupDay, setPopupDay] = useState(null)
  const DOW         = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  const year        = viewDate.getFullYear()
  const month       = viewDate.getMonth()
  const firstDow    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthLabel  = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // build calRaw with trade arrays per day
  const calRaw = {}
  for (const t of trades) {
    const d = new Date(t.trade_date + 'T00:00:00')
    if (d.getMonth() !== month || d.getFullYear() !== year) continue
    const day = d.getDate()
    if (!calRaw[day]) calRaw[day] = { pnl: 0, list: [] }
    calRaw[day].pnl += (t.pnl || 0)
    calRaw[day].list.push(t)
  }

  const cells = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const dayTrades = popupDay ? (calRaw[popupDay]?.list || []) : []

  const navBtn = (onClick, label) => (
    <button onClick={onClick} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px', padding: '2px 8px', fontFamily: 'inherit', lineHeight: 1, transition: 'color 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.color = '#aaa' }}
      onMouseLeave={e => { e.currentTarget.style.color = '#555' }}
    >{label}</button>
  )

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        {navBtn(onPrev, '‹')}
        <div style={{ ...lbl, color: '#999', margin: 0 }}>{monthLabel}</div>
        {navBtn(onNext, '›')}
      </div>

      {/* Day-of-week headers + cells — wrapped together so they scroll in sync */}
      <div className="cal-scroll">
      <div style={{ minWidth: '280px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px', marginBottom: '4px' }}>
        {DOW.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '9px', color: '#555', fontWeight: '600', letterSpacing: '0.05em', paddingBottom: '2px' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} style={{ borderRadius: '5px', minHeight: '42px' }} />
          const d     = calRaw[day]
          const hasT  = d?.list.length > 0
          const isPos = hasT && d.pnl > 0
          const isNeg = hasT && d.pnl < 0
          const bg    = isPos ? 'rgba(170,255,160,0.07)' : isNeg ? 'rgba(255,128,128,0.07)' : 'rgba(255,255,255,0.015)'
          const brd   = isPos ? 'rgba(170,255,160,0.16)' : isNeg ? 'rgba(255,128,128,0.16)' : '#161616'
          const tc    = isPos ? '#aaffa0' : isNeg ? '#ff8080' : '#555'
          return (
            <div
              key={i}
              onClick={() => hasT && setPopupDay(day)}
              className={hasT ? 'cal-day-active' : ''}
              style={{ background: bg, border: `1px solid ${brd}`, borderRadius: '5px', minHeight: '42px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '4px 2px', cursor: hasT ? 'pointer' : 'default' }}
            >
              <div style={{ fontSize: '9px', color: '#555', lineHeight: 1, marginBottom: '3px', fontWeight: '500' }}>{day}</div>
              {hasT && (
                <>
                  <div style={{ fontSize: '9px', color: tc, fontWeight: '700', lineHeight: 1.2, textAlign: 'center' }}>
                    {d.pnl > 0 ? '+' : '−'}${Math.abs(Math.round(d.pnl))}
                  </div>
                  <div style={{ fontSize: '8px', color: '#555', marginTop: '2px' }}>{d.list.length}t</div>
                </>
              )}
            </div>
          )
        })}
      </div>
      </div>{/* /minWidth */}
      </div>{/* /cal-scroll */}

      {/* Day popup */}
      {popupDay && (
        <div
          className="modal-overlay"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setPopupDay(null)}
        >
          <div
            className="modal-inner"
            style={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '16px', padding: '24px', width: '460px', maxHeight: '70vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.85)', animation: 'modalIn 0.2s ease both' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <div style={{ ...lbl, marginBottom: '4px', color: '#555' }}>{monthLabel}</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff', letterSpacing: '-0.5px' }}>
                  {viewDate.toLocaleDateString('en-US', { month: 'long' })} {popupDay}
                </div>
              </div>
              <button onClick={() => setPopupDay(null)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px' }}>✕</button>
            </div>
            {dayTrades.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '24px 0', textAlign: 'center' }}>
                <BookOpen size={24} color="#333" />
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#555' }}>No trades this day</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {dayTrades.map(t => (
                  <div key={t.id} style={{ background: '#111', border: '1px solid #1c1c1c', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '14px' }}>{t.symbol}</span>
                        <span style={badge(t.direction === 'Long')}>{t.direction}</span>
                      </div>
                      <span style={{ fontWeight: '700', fontSize: '14px', color: (t.pnl || 0) >= 0 ? '#aaffa0' : '#ff8080' }}>
                        {(t.pnl || 0) >= 0 ? `+$${Math.round(t.pnl)}` : `−$${Math.abs(Math.round(t.pnl))}`}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '11px', color: '#666', flexWrap: 'wrap' }}>
                      {t.session && <span>{t.session}</span>}
                      {t.rr != null && <span>R:R {Number(t.rr).toFixed(1)}</span>}
                      {t.emotional_state && <span>{t.emotional_state}</span>}
                      {t.followed_plan && (
                        <span style={{ color: t.followed_plan === 'YES' ? '#aaffa0' : t.followed_plan === 'NO' ? '#ff8080' : '#ffd080' }}>
                          Plan: {t.followed_plan}
                        </span>
                      )}
                    </div>
                    {t.notes && <div style={{ fontSize: '12px', color: '#888', marginTop: '8px', lineHeight: 1.6 }}>{t.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pending Screen ───────────────────────────────────────────
// ─── Set New Password (after clicking reset link) ─────────────
function SetNewPasswordPage({ onDone }) {
  const [pw1, setPw1]       = useState('')
  const [pw2, setPw2]       = useState('')
  const [error, setError]   = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setError(''); setMessage('')
    if (pw1.length < 6) { setError('Password must be at least 6 characters'); return }
    if (pw1 !== pw2)    { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw1 })
      if (error) throw error
      setMessage('Password updated! Redirecting…')
      setTimeout(() => { onDone?.() }, 1200)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  const onKey = (e) => { if (e.key === 'Enter') submit() }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100vw', height: '100vh',
      background: '#080808', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: 'relative', overflowY: 'auto',
    }}>
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />
      <AuroraBackground theme="white" />

      <div className="auth-outer" style={{ position: 'relative', zIndex: 2, width: '380px', margin: '40px auto' }}>
        {/* Logo */}
        <div className="auth-logo-block" style={{ textAlign: 'center', marginBottom: '36px' }}>
          <img className="auth-logo-img" src="/logo2.png" alt="logo" style={{ height: '64px', marginBottom: '14px', display: 'block', margin: '0 auto 14px' }} />
          <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '0.22em', color: '#fff', lineHeight: 1 }}>LIMITLESS</div>
          <div className="auth-tagline" style={{ fontSize: '9px', color: '#fff', letterSpacing: '0.3em', marginTop: '7px', textTransform: 'uppercase', fontWeight: '600' }}>
            Private Journal
          </div>
        </div>

        {/* Card */}
        <div style={{ ...card, padding: '0', overflow: 'hidden' }}>
          <div className="auth-form-inner" style={{ padding: '28px 28px 24px' }}>
            <div style={{ marginBottom: '18px' }}>
              <div style={{ fontSize: '17px', fontWeight: '700', letterSpacing: '-0.3px', color: '#fff', marginBottom: '6px' }}>Set New Password</div>
              <div style={{ fontSize: '12px', color: '#777', lineHeight: 1.5 }}>Enter and confirm your new password.</div>
            </div>

            {message && (
              <div style={{ background: 'rgba(170,255,160,0.05)', border: '1px solid rgba(170,255,160,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#aaffa0', marginBottom: '18px', lineHeight: 1.5 }}>
                {message}
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(255,128,128,0.05)', border: '1px solid rgba(255,128,128,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#ff8080', marginBottom: '18px', lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <div className="auth-field" style={{ marginBottom: '14px' }}>
              <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>New Password</div>
              <input
                type="password"
                placeholder="••••••••"
                value={pw1}
                onChange={e => setPw1(e.target.value)}
                onKeyDown={onKey}
                style={inp}
                autoComplete="new-password"
              />
            </div>
            <div className="auth-field" style={{ marginBottom: '20px' }}>
              <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Confirm Password</div>
              <input
                type="password"
                placeholder="••••••••"
                value={pw2}
                onChange={e => setPw2(e.target.value)}
                onKeyDown={onKey}
                style={inp}
                autoComplete="new-password"
              />
            </div>

            <button
              style={{ ...btn, width: '100%', padding: '12px', opacity: loading ? 0.6 : 1 }}
              onClick={submit}
              disabled={loading}
            >
              {loading ? '...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BannedScreen({ onLogout }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: '#080808', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />
      <AuroraBackground theme="white" />
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '40px', maxWidth: '420px' }}>
        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,128,128,0.06)', border: '1px solid rgba(255,128,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Ban size={26} color="#ff8080" />
        </div>
        <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff', marginBottom: '10px' }}>Account Suspended</div>
        <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.6, marginBottom: '24px' }}>
          Your account has been suspended. Contact support if you believe this is a mistake.
        </div>
        <button
          onClick={onLogout}
          style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', borderRadius: '99px', padding: '10px 24px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}
        >Log Out</button>
      </div>
    </div>
  )
}

function PendingScreen({ onLogout }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: '#080808', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />
      <AuroraBackground theme="white" />
      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', animation: 'pageFade 0.3s ease both' }}>
        <img src="/logo2.png" alt="logo" style={{ height: '64px', display: 'block', margin: '0 auto 16px' }} />
        <div style={{ fontSize: '22px', fontWeight: '800', letterSpacing: '0.22em', color: '#fff', lineHeight: 1 }}>LIMITLESS</div>
        <div style={{ fontSize: '9px', color: '#444', letterSpacing: '0.3em', marginTop: '7px', textTransform: 'uppercase', fontWeight: '600', marginBottom: '48px' }}>Private Journal</div>
        <div style={{ background: 'rgba(10,10,10,0.85)', border: '1px solid #1c1c1c', borderRadius: '18px', padding: '36px 44px', maxWidth: '420px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
          <div style={{ fontSize: '28px', marginBottom: '18px' }}>⏳</div>
          <div style={{ fontSize: '17px', fontWeight: '700', color: '#fff', marginBottom: '12px', letterSpacing: '-0.3px' }}>Account Pending Approval</div>
          <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.75, marginBottom: '30px' }}>
            Your account is pending approval.<br />
            You'll gain access once approved by the admin.
          </div>
          <button
            onClick={onLogout}
            style={{ background: 'transparent', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#666', fontSize: '12px', padding: '9px 28px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', letterSpacing: '0.04em' }}
            className="action-btn"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Performance Analytics ────────────────────────────────────
function PerformanceAnalytics({ trades }) {
  if (trades.length < 3) {
    return (
      <div style={{ ...card, marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', flexDirection: 'column', gap: '10px', textAlign: 'center' }}>
        <BarChart2 size={36} color="#333" />
        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-hi)' }}>No analytics yet</div>
        <div style={{ fontSize: '13px', color: 'var(--text-lo)', lineHeight: 1.6, maxWidth: '260px' }}>Log at least 3 trades to unlock performance breakdowns</div>
      </div>
    )
  }

  // ── Session win rates ──
  const SESSIONS = ['New York', 'London', 'Asian', 'Overlap']
  const sessionData = SESSIONS.map(s => {
    const ts = trades.filter(t => t.session === s)
    const ws = ts.filter(t => (t.pnl || 0) > 0)
    return { name: s, winRate: ts.length ? Math.round(ws.length / ts.length * 100) : 0, count: ts.length }
  }).filter(d => d.count > 0).sort((a, b) => b.winRate - a.winRate)

  // ── Best symbols ──
  const symMap = {}
  for (const t of trades) {
    if (!t.symbol) continue
    if (!symMap[t.symbol]) symMap[t.symbol] = { pnl: 0, n: 0 }
    symMap[t.symbol].pnl += (t.pnl || 0); symMap[t.symbol].n++
  }
  const symData = Object.entries(symMap)
    .map(([name, d]) => ({ name, pnl: Math.round(d.pnl), n: d.n }))
    .sort((a, b) => b.pnl - a.pnl).slice(0, 6)

  // ── Weekly P&L ──
  const weekMap = {}
  for (const t of trades) {
    if (!t.trade_date) continue
    const d = new Date(t.trade_date + 'T00:00:00')
    const monday = new Date(d); monday.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    const key = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    weekMap[key] = (weekMap[key] || 0) + (t.pnl || 0)
  }
  const weekData = Object.entries(weekMap).slice(-8).map(([week, pnl]) => ({ week, pnl: Math.round(pnl) }))

  // ── Monthly P&L ──
  const monthMap = {}
  for (const t of trades) {
    if (!t.trade_date) continue
    const d = new Date(t.trade_date + 'T00:00:00')
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    monthMap[key] = (monthMap[key] || 0) + (t.pnl || 0)
  }
  const monthData = Object.entries(monthMap).slice(-6).map(([month, pnl]) => ({ month, pnl: Math.round(pnl) }))

  const axTick = { fill: 'var(--text-lo)', fontSize: 10 }
  const noAxis = { axisLine: false, tickLine: false }
  const fmt = v => `$${Math.abs(v) >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`

  const HBar = ({ data, xKey, yKey, label }) => (
    <div style={card}>
      <div style={{ ...lbl, marginBottom: '14px' }}>{label}</div>
      {data.length === 0
        ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '24px 0', textAlign: 'center' }}><BarChart2 size={20} color="#333" /><div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>No data yet</div></div>
        : <ResponsiveContainer width="100%" height={Math.max(100, data.length * 38)}>
            <BarChart layout="vertical" data={data} margin={{ top: 0, right: 12, bottom: 0, left: 10 }}>
              <XAxis type="number" tick={axTick} {...noAxis} tickFormatter={xKey === 'pnl' ? fmt : v => `${v}%`} />
              <YAxis type="category" dataKey={yKey} tick={{ ...axTick, fontSize: 11 }} {...noAxis} width={60} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '8px', fontSize: '12px' }}
                formatter={(v) => [xKey === 'pnl' ? fmt(v) : `${v}%`, '']}
              />
              <Bar dataKey={xKey} radius={[0, 4, 4, 0]} maxBarSize={22}>
                {data.map((d, i) => (
                  <Cell key={i} fill={xKey === 'pnl' ? (d.pnl >= 0 ? '#aaffa0' : '#ff8080') : '#4488ff'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
      }
    </div>
  )

  const VBar = ({ data, xKey, valKey, label }) => (
    <div style={card}>
      <div style={{ ...lbl, marginBottom: '14px' }}>{label}</div>
      {data.length === 0
        ? <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '24px 0', textAlign: 'center' }}><BarChart2 size={20} color="#333" /><div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>No data yet</div></div>
        : <ResponsiveContainer width="100%" height={160}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
              <XAxis dataKey={xKey} tick={axTick} {...noAxis} />
              <YAxis tick={axTick} {...noAxis} tickFormatter={fmt} width={40} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ background: '#0d0d0d', border: '1px solid #222', borderRadius: '8px', fontSize: '12px' }}
                formatter={v => [fmt(v), 'P&L']}
              />
              <Bar dataKey={valKey} radius={[4, 4, 0, 0]} maxBarSize={32}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d[valKey] >= 0 ? '#aaffa0' : '#ff8080'} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
      }
    </div>
  )

  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ ...lbl, marginBottom: '14px', marginTop: '8px' }}>Performance Analytics</div>
      <div className="ana-grid">
        <HBar data={sessionData} xKey="winRate" yKey="name"  label="Win Rate by Session" />
        <HBar data={symData}     xKey="pnl"     yKey="name"  label="Best Performing Symbols" />
        <VBar data={weekData}    xKey="week"    valKey="pnl" label="Weekly P&L Breakdown" />
        <VBar data={monthData}   xKey="month"   valKey="pnl" label="Monthly P&L Comparison" />
      </div>
    </div>
  )
}

// ─── Psychology Tracker ───────────────────────────────────────
function PsychologyTracker({ trades }) {
  const GREEN = new Set(['Focused', 'Patient', 'Confident', 'Disciplined', 'Calm', 'Neutral'])
  const tradesWithEmotion = trades.filter(t => t.emotional_state)

  if (tradesWithEmotion.length === 0) {
    return (
      <div style={{ ...card, marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', flexDirection: 'column', gap: '10px', textAlign: 'center' }}>
        <Lightbulb size={36} color="#333" />
        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-hi)' }}>No psychology data yet</div>
        <div style={{ fontSize: '13px', color: 'var(--text-lo)', lineHeight: 1.6, maxWidth: '260px' }}>Log your emotional state on trades to see patterns here</div>
      </div>
    )
  }

  // ── Aggregate by emotion ──
  const map = {}
  for (const t of tradesWithEmotion) {
    const e = t.emotional_state
    if (!map[e]) map[e] = { wins: 0, losses: 0, pnl: 0 }
    map[e].pnl += (t.pnl || 0)
    if ((t.pnl || 0) > 0) map[e].wins++; else map[e].losses++
  }
  const emotions = Object.entries(map)
    .map(([name, d]) => ({ name, total: d.wins + d.losses, wins: d.wins, pnl: Math.round(d.pnl), winRate: Math.round(d.wins / (d.wins + d.losses) * 100) }))
    .sort((a, b) => b.total - a.total)

  const maxTotal = Math.max(...emotions.map(e => e.total), 1)

  // ── Insight ──
  const best  = [...emotions].sort((a, b) => b.winRate - a.winRate)[0]
  const worst = [...emotions].sort((a, b) => a.winRate - b.winRate)[0]
  const insight = emotions.length >= 2
    ? `You perform best when feeling ${best.name} (${best.winRate}% win rate) and worst when ${worst.name} (${worst.winRate}% win rate).`
    : `You have ${emotions[0].total} trade(s) logged with emotional state "${emotions[0].name}".`

  return (
    <div style={{ ...card, marginTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ ...lbl, marginBottom: '4px' }}>Psychology</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-hi)', letterSpacing: '-0.3px' }}>Emotional State Tracker</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
        {emotions.map(e => {
          const isGreen = GREEN.has(e.name)
          const barColor = isGreen ? '#aaffa0' : '#ff8080'
          const pct = (e.total / maxTotal) * 100
          return (
            <div key={e.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: barColor, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-hi)', fontWeight: '500' }}>{e.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-md)' }}>{e.total} trade{e.total !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: e.pnl >= 0 ? '#aaffa0' : '#ff8080' }}>
                    {e.pnl >= 0 ? '+' : '−'}${Math.abs(e.pnl)}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-md)', minWidth: '36px', textAlign: 'right' }}>{e.winRate}%</span>
                </div>
              </div>
              <div style={{ height: '5px', borderRadius: '99px', background: 'var(--inp-bg)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, borderRadius: '99px', background: barColor, opacity: 0.7, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ background: 'var(--inp-bg)', border: '1px solid var(--card-border)', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', color: 'var(--text-md)', lineHeight: 1.6, display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <Lightbulb size={14} style={{ flexShrink: 0, marginTop: '2px', opacity: 0.6 }} />
        {insight}
      </div>
    </div>
  )
}

// ─── Skeleton Loader ──────────────────────────────────────────
function Sk({ w = '100%', h = 16, style = {} }) {
  return <div className="skeleton" style={{ width: w, height: h, ...style }} />
}

function TradesSkeleton() {
  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <Sk w={50} h={10} style={{ marginBottom: '10px' }} />
          <Sk w={120} h={30} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Sk w={110} h={38} style={{ borderRadius: '10px' }} />
          <Sk w={110} h={38} style={{ borderRadius: '10px' }} />
        </div>
      </div>
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: '12px', padding: '14px 14px', borderBottom: '1px solid var(--divider)' }}>
          {[80, 60, 50, 70, 55, 55, 40].map((w, i) => <Sk key={i} w={w} h={10} />)}
        </div>
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '12px', padding: '14px 14px', borderTop: i > 0 ? '1px solid var(--divider)' : undefined, alignItems: 'center' }}>
            <Sk w={60} h={13} />
            <Sk w={45} h={20} style={{ borderRadius: '99px' }} />
            <Sk w={50} h={13} />
            <Sk w={65} h={20} style={{ borderRadius: '99px' }} />
            <Sk w={50} h={13} />
            <Sk w={40} h={13} />
            <Sk w={55} h={13} style={{ marginLeft: 'auto' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      <div style={{ marginBottom: '24px' }}>
        <Sk w={60} h={10} style={{ marginBottom: '10px' }} />
        <Sk w={160} h={32} />
      </div>
      {/* stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{ background: 'rgba(10,10,10,0.80)', border: '1px solid #1c1c1c', borderRadius: '16px', padding: '18px 20px' }}>
            <Sk w="60%" h={10} style={{ marginBottom: '12px' }} />
            <Sk w="80%" h={28} style={{ marginBottom: '10px' }} />
            <Sk w="50%" h={10} />
          </div>
        ))}
      </div>
      {/* chart + calendar */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px', marginBottom: '12px' }}>
        <div style={{ background: 'rgba(10,10,10,0.80)', border: '1px solid #1c1c1c', borderRadius: '16px', padding: '24px', height: '280px' }}>
          <Sk w="40%" h={10} style={{ marginBottom: '20px' }} />
          <Sk w="100%" h={210} />
        </div>
        <div style={{ background: 'rgba(10,10,10,0.80)', border: '1px solid #1c1c1c', borderRadius: '16px', padding: '24px', height: '280px' }}>
          <Sk w="50%" h={10} style={{ marginBottom: '16px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {[...Array(35)].map((_, i) => <Sk key={i} h={40} style={{ borderRadius: '5px' }} />)}
          </div>
        </div>
      </div>
      {/* radar + table */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '12px' }}>
        <div style={{ background: 'rgba(10,10,10,0.80)', border: '1px solid #1c1c1c', borderRadius: '16px', padding: '24px', height: '300px' }}>
          <Sk w="60%" h={10} style={{ marginBottom: '20px' }} />
          <Sk w="100%" h={230} />
        </div>
        <div style={{ background: 'rgba(10,10,10,0.80)', border: '1px solid #1c1c1c', borderRadius: '16px', padding: '24px' }}>
          <Sk w="40%" h={10} style={{ marginBottom: '20px' }} />
          {[...Array(5)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 0', borderTop: '1px solid #111' }}>
              <Sk w={60} h={13} />
              <Sk w={50} h={13} />
              <Sk w={40} h={13} />
              <Sk w={80} h={13} style={{ marginLeft: 'auto' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── useCountAnimation hook ───────────────────────────────────
const ANIM_MS = 1800

function useCountAnimation(target, duration = ANIM_MS) {
  const [value, setValue] = useState(0)
  const rafRef   = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    startRef.current = null
    const from = 0
    const to   = target
    if (from === to) { setValue(to); return }
    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / duration, 1)
      const eased    = 1 - Math.pow(1 - progress, 4) // easeOutQuart
      setValue(from + (to - from) * eased)
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
      else setValue(to)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [target, duration])

  return value
}

// ─── Monthly Goal Tracker Widget ──────────────────────────────
function GoalTrackerWidget({ monthPnl, monthlyGoal }) {
  const now = new Date()
  const daysInMonth  = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysElapsed  = now.getDate()
  const daysRemaining = daysInMonth - daysElapsed

  const pct         = monthlyGoal > 0 ? (monthPnl / monthlyGoal) * 100 : 0
  const expectedPct = (daysElapsed / daysInMonth) * 100
  const remaining   = monthlyGoal - monthPnl

  const isReached = pct >= 100
  const isLosing  = monthPnl < 0
  const isAhead   = !isLosing && !isReached && pct >= expectedPct

  const barFill =
    isReached ? 'linear-gradient(90deg, #ffd700 0%, #ffb300 100%)' :
    isLosing  ? 'linear-gradient(90deg, #ff8080 0%, #cc4444 100%)' :
    isAhead   ? 'linear-gradient(90deg, #aaffa0 0%, #00cc66 100%)' :
                'linear-gradient(90deg, #ffd966 0%, #e6a500 100%)'

  const pctColor = isReached ? '#ffd700' : isLosing ? '#ff8080' : isAhead ? '#aaffa0' : '#ffd966'

  // Animate bar from 0 to actual pct over 1.5s on mount
  const [animPct, setAnimPct] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimPct(Math.max(0, Math.min(pct, 100))), 120)
    return () => clearTimeout(t)
  }, [pct])

  return (
    <div style={{ ...card, marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
      {/* Confetti bits when goal reached */}
      {isReached && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {['#ffd700', '#aaffa0', '#ff8cb4', '#7cc9ff', '#ffb86b', '#c28cff'].map((clr, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: `${10 + i * 14}%`,
              top: '-10px',
              width: '6px', height: '10px',
              background: clr,
              borderRadius: '1px',
              animation: `confettiFall 2.6s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.18}s infinite`,
            }} />
          ))}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Target size={18} color={pctColor} />
          <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.02em', color: 'var(--text-hi)' }}>Monthly Goal</div>
        </div>
        {isReached && (
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#ffd700', animation: 'goalPulse 1.4s ease-in-out infinite' }}>
            🎯 Goal Reached!
          </div>
        )}
      </div>

      {/* Amount row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
        <div>
          <span style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', color: 'var(--text-hi)' }}>
            ${Math.round(monthPnl).toLocaleString()}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-lo)', marginLeft: '6px' }}>
            / ${monthlyGoal.toLocaleString()}
          </span>
        </div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: pctColor }}>
          {Math.round(pct)}%
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: '10px', background: '#1a1a1a', borderRadius: '99px', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          width: `${animPct}%`,
          height: '100%',
          background: barFill,
          transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
          borderRadius: '99px',
          boxShadow: isReached ? '0 0 12px rgba(255,215,0,0.5)' : 'none',
        }} />
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px', color: 'var(--text-lo)', letterSpacing: '0.02em' }}>
        <span>
          {remaining > 0
            ? `Remaining: $${Math.round(remaining).toLocaleString()}`
            : `Exceeded by $${Math.round(-remaining).toLocaleString()}`}
        </span>
        <span>{daysRemaining === 0 ? 'Last day of the month' : `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} remaining`}</span>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────
function Dashboard({ trades, onAddTrade, loading, profile, flags = {} }) {
  const [calViewDate,  setCalViewDate]  = useState(() => new Date())
  const [chartVisible, setChartVisible] = useState(false)

  // ── Computed stats (safe with empty trades array) ──
  const wins   = trades.filter(t => (t.pnl || 0) > 0)
  const losses = trades.filter(t => (t.pnl || 0) < 0)

  const totalPnl     = trades.reduce((s, t) => s + (t.pnl || 0), 0)
  const winRate      = trades.length ? Math.round((wins.length / trades.length) * 100) : 0
  const grossWins    = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLosses  = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLosses > 0 ? (grossWins / grossLosses).toFixed(2) : grossWins > 0 ? '∞' : '—'
  const avgRRNum     = wins.length ? wins.reduce((s, t) => s + (t.rr || 0), 0) / wins.length : 0
  const avgRR        = wins.length ? avgRRNum.toFixed(1) : '—'
  const avgWin       = wins.length ? Math.round(grossWins / wins.length) : 0
  const pfNum        = grossLosses > 0 ? grossWins / grossLosses : 0

  const byDate = [...trades].sort((a, b) => new Date(b.trade_date) - new Date(a.trade_date))
  let streak = 0
  for (const t of byDate) {
    if ((t.pnl || 0) > 0) streak++
    else break
  }

  // ── Animation hooks (called unconditionally before any early return) ──
  const animPnl    = useCountAnimation(loading ? 0 : totalPnl,  ANIM_MS)
  const animWR     = useCountAnimation(loading ? 0 : winRate,   ANIM_MS)
  const animAvgRR  = useCountAnimation(loading ? 0 : avgRRNum,  ANIM_MS)
  const animPF     = useCountAnimation(loading ? 0 : pfNum,     ANIM_MS)
  const animStreak = useCountAnimation(loading ? 0 : streak,    ANIM_MS)

  useEffect(() => {
    if (!loading) setChartVisible(true)
  }, [loading])

  if (loading) return <DashboardSkeleton />

  // ── P&L curve ──
  const sortedAsc = [...trades].sort((a, b) => new Date(a.trade_date) - new Date(b.trade_date))
  let cum = 0
  const dayMap = new Map()
  for (const t of sortedAsc) {
    cum += (t.pnl || 0)
    const key = formatDate(t.trade_date)
    dayMap.set(key, Math.round(cum))
  }
  const pnlCurve = [...dayMap.entries()].map(([day, pnl]) => ({ day, pnl }))

  const now = new Date()

  // ── Radar data ──
  const radarData = [
    { metric: 'Win Rate',    score: winRate },
    { metric: 'Consistency', score: 72 },
    { metric: 'P. Factor',   score: Math.min(100, Math.round(parseFloat(profitFactor) * 20 || 0)) },
    { metric: 'Drawdown',    score: 60 },
    { metric: 'Avg R:R',     score: Math.min(100, Math.round(parseFloat(avgRR) * 25 || 0)) },
    { metric: 'Recovery',    score: 65 },
  ]
  const overallScore = Math.round(radarData.reduce((s, d) => s + d.score, 0) / radarData.length)

  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const animPnlRounded    = Math.round(animPnl)
  const animWRRounded     = Math.round(animWR)
  const animStreakRounded = Math.round(animStreak)

  // ── Monthly P&L for Goal Tracker (this calendar month only) ──
  const monthPnl = trades
    .filter(t => {
      const d = new Date(t.trade_date)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    })
    .reduce((s, t) => s + (t.pnl || 0), 0)
  const goalEnabled = typeof window !== 'undefined' && localStorage.getItem('goal_tracker_enabled') === 'true'
  const monthlyGoal = Number(profile?.monthly_goal) || 0

  const stats = [
    { label: 'Net P&L',       val: `${animPnlRounded >= 0 ? '+' : '−'}$${Math.abs(animPnlRounded).toLocaleString()}`, color: totalPnl >= 0 ? '#aaffa0' : '#ff8080', shadow: totalPnl > 0 ? '0 0 20px rgba(170,255,160,0.3)' : totalPnl < 0 ? '0 0 20px rgba(255,128,128,0.3)' : 'none', sub: 'Month to date' },
    { label: 'Win Rate',       val: `${animWRRounded}%`,                                                               color: '#fff', shadow: 'none', sub: `${wins.length} / ${trades.length} trades`   },
    { label: 'Avg Win / Loss', val: wins.length ? `${animAvgRR.toFixed(1)}R` : '—',                                   color: '#fff', shadow: 'none', sub: avgWin ? `$${avgWin.toLocaleString()} avg win` : 'No wins yet' },
    { label: 'Profit Factor',  val: grossLosses > 0 ? animPF.toFixed(2) : profitFactor,                               color: '#fff', shadow: 'none', sub: 'Gross P / gross L'                           },
    { label: 'Win Streak',     val: streak > 0 ? `${animStreakRounded}W` : '—',                                       color: '#fff', shadow: 'none', sub: streak > 0 ? `${streak} in a row` : 'No active streak' },
  ]

  // ── Empty state ──
  if (trades.length === 0) {
    return (
      <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', color: '#fff' }}>Dashboard</h1>
          </div>
          <div style={{ fontSize: '11px', color: '#666', background: 'rgba(13,13,13,0.9)', border: '1px solid #1c1c1c', padding: '8px 16px', borderRadius: '8px', backdropFilter: 'blur(20px)', letterSpacing: '0.06em' }}>
            {monthLabel}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
            <BarChart2 size={44} color="#333" />
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-hi)' }}>No trades yet</div>
            <div style={{ fontSize: '13px', color: 'var(--text-lo)', lineHeight: 1.6, maxWidth: '280px' }}>
              Start journaling your first setup to see your stats here
            </div>
            <button style={{ ...btn, marginTop: '8px' }} onClick={onAddTrade}>+ Add Trade</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-1px', color: 'var(--text-hi)' }}>Dashboard</h1>
        </div>
        <div style={{ fontSize: '11px', color: '#666', background: 'rgba(13,13,13,0.9)', border: '1px solid #1c1c1c', padding: '8px 16px', borderRadius: '8px', backdropFilter: 'blur(20px)', letterSpacing: '0.06em' }}>
          {monthLabel}
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        {stats.map(s => (
          <div key={s.label} className="card-lift" style={{ ...card, padding: '18px 20px' }}>
            <div style={{ ...lbl, marginBottom: '10px', color: '#999' }}>{s.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-1px', color: s.color, textShadow: s.shadow, lineHeight: 1, marginBottom: '8px' }}>{s.val}</div>
            <div style={{ fontSize: '11px', color: '#888' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Monthly Goal Tracker */}
      {flags.monthlyGoalTracker !== false && goalEnabled && monthlyGoal > 0 && (
        <GoalTrackerWidget monthPnl={monthPnl} monthlyGoal={monthlyGoal} />
      )}

      {/* P&L curve + Calendar */}
      <div className="chart-grid">
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ ...lbl, color: '#999' }}>Cumulative P&L</div>
            <div style={{ fontSize: '12px', color: totalPnl >= 0 ? '#aaffa0' : '#ff8080', fontWeight: '700', letterSpacing: '-0.3px' }}>
              {totalPnl >= 0 ? '+' : '−'}${Math.abs(Math.round(totalPnl)).toLocaleString()} MTD
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, ...(chartVisible ? { animation: `chartReveal ${ANIM_MS}ms ease-out both` } : { clipPath: 'inset(0 100% 0 0)' }) }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pnlCurve} margin={{ top: 4, right: 4, bottom: 0, left: 10 }}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#aaffa0" stopOpacity={0.14} />
                    <stop offset="100%" stopColor="#aaffa0" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(pnlCurve.length / 6) - 1)} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${Math.abs(v) >= 1000 ? Math.round(v / 1000) + 'k' : v}`} width={36} />
                <Tooltip content={<PnlTooltip />} cursor={{ stroke: '#2a2a2a', strokeWidth: 1 }} />
                <Area type="monotone" dataKey="pnl" stroke="#aaffa0" strokeWidth={1.5} fill="url(#pnlGrad)" dot={false} activeDot={{ r: 4, fill: '#aaffa0', stroke: '#080808', strokeWidth: 2 }} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ ...card, overflowX: 'auto' }}>
          <CalendarHeatmap
            trades={trades}
            viewDate={calViewDate}
            onPrev={() => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
            onNext={() => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          />
        </div>
      </div>

      {/* Radar + Recent trades */}
      <div className="radar-grid">
        <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
          <div style={{ ...lbl, color: '#999' }}>Performance Radar</div>
          <div style={chartVisible ? { animation: `chartReveal ${ANIM_MS}ms ease-out both` } : { clipPath: 'inset(0 100% 0 0)' }}>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="56%" margin={{ top: 18, right: 42, bottom: 18, left: 42 }}>
                <PolarGrid stroke="#1e1e1e" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#666', fontSize: 9, fontFamily: 'Inter, sans-serif' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="score" dataKey="score" stroke="rgba(255,255,255,0.5)" fill="rgba(255,255,255,0.04)" strokeWidth={1.5} dot={{ fill: '#fff', r: 2.5, strokeWidth: 0 }} isAnimationActive={false} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid #111', marginTop: 'auto' }}>
            <div style={{ fontSize: '44px', fontWeight: '800', letterSpacing: '-2px', lineHeight: 1, color: '#fff' }}>{overallScore}</div>
            <div style={{ fontSize: '10px', color: '#666', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '5px', fontWeight: '600' }}>Overall Score</div>
          </div>
        </div>

        {flags.feedSection !== false && (
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ ...lbl, color: '#999' }}>Recent Trades</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Last 7 entries</div>
          </div>
          {byDate.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <BookOpen size={28} color="#333" />
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#555' }}>No trades yet</div>
              <div style={{ fontSize: '12px', color: '#444', lineHeight: 1.5 }}>Start journaling your first setup</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Date', 'Symbol', 'Dir', 'R:R', 'P&L'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {byDate.slice(0, 7).map(t => (
                  <tr key={t.id}>
                    <td style={{ ...TD, color: '#888', fontSize: '12px' }}>{formatDate(t.trade_date)}</td>
                    <td style={{ ...TD, fontWeight: '700', fontSize: '13px' }}>{t.symbol}</td>
                    <td style={TD}><span style={badge(t.direction === 'Long')}>{t.direction}</span></td>
                    <td style={{ ...TD, color: '#888', fontSize: '12px' }}>{t.rr != null ? Number(t.rr).toFixed(1) : '—'}</td>
                    <td style={{ ...TD, fontWeight: '700', whiteSpace: 'nowrap', color: (t.pnl || 0) >= 0 ? '#aaffa0' : '#ff8080', textShadow: (t.pnl || 0) > 0 ? '0 0 20px rgba(170,255,160,0.3)' : (t.pnl || 0) < 0 ? '0 0 20px rgba(255,128,128,0.3)' : 'none' }}>
                      {(t.pnl || 0) >= 0 ? `+$${Math.round(t.pnl)}` : `−$${Math.abs(Math.round(t.pnl))}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        )}
      </div>

      <PerformanceAnalytics trades={trades} />
      <PsychologyTracker    trades={trades} />
    </div>
  )
}

// ─── Instruments ─────────────────────────────────────────────
const INSTRUMENTS = {
  Futures: ['NQ', 'ES', 'YM', 'RTY', 'CL', 'GC', 'SI', 'ZB', 'ZN', 'MNQ', 'MES', 'MYM'],
  Forex:   ['EUR/USD','GBP/USD','USD/JPY','USD/CHF','AUD/USD','NZD/USD','USD/CAD','EUR/GBP','EUR/JPY','GBP/JPY','EUR/CHF','AUD/JPY','GBP/CHF','EUR/AUD','EUR/CAD','GBP/AUD','GBP/CAD','AUD/CAD','AUD/CHF','AUD/NZD','CAD/CHF','CAD/JPY','CHF/JPY','EUR/NZD','GBP/NZD','NZD/JPY','NZD/CHF','NZD/CAD','USD/MXN','USD/ZAR','USD/SEK','USD/NOK','USD/DKK','USD/SGD','USD/HKD','USD/TRY','USD/PLN','USD/CZK','USD/HUF','EUR/TRY','EUR/SEK','EUR/NOK','EUR/PLN','GBP/SEK','GBP/NOK','XAU/USD','XAG/USD'],
  Crypto:  ['BTC/USD','ETH/USD','SOL/USD','BNB/USD','XRP/USD','ADA/USD','DOGE/USD','AVAX/USD','MATIC/USD','LINK/USD','DOT/USD','LTC/USD','BCH/USD','UNI/USD','ATOM/USD'],
}

// ─── Symbol Search ────────────────────────────────────────────
function SymbolSearch({ value, onChange }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const containerRef        = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q        = search.toLowerCase()
  const filtered = Object.entries(INSTRUMENTS)
    .map(([cat, syms]) => ({ cat, syms: syms.filter(s => s.toLowerCase().includes(q)) }))
    .filter(g => g.syms.length > 0)

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ ...inp, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
      >
        <span style={{ color: value ? '#fff' : '#444' }}>{value || 'Select symbol…'}</span>
        <span style={{ color: '#555', fontSize: '10px', flexShrink: 0 }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: '#0d0d0d', border: '1px solid #222', borderRadius: '8px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
          maxHeight: '260px', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid #181818', flexShrink: 0 }}>
            <input
              autoFocus
              type="text"
              placeholder="Search symbol…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ ...inp, padding: '7px 10px', fontSize: '12px' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.map(({ cat, syms }) => (
              <div key={cat}>
                <div style={{ padding: '6px 12px 4px', fontSize: '9px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: '600', position: 'sticky', top: 0, background: '#0d0d0d' }}>
                  {cat}
                </div>
                {syms.map(s => (
                  <div
                    key={s}
                    onMouseDown={() => { onChange(s); setOpen(false); setSearch('') }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff' }}
                    onMouseLeave={e => { e.currentTarget.style.background = value === s ? 'rgba(255,255,255,0.05)' : 'transparent'; e.currentTarget.style.color = value === s ? '#fff' : '#aaa' }}
                    style={{ padding: '8px 14px', fontSize: '13px', color: value === s ? '#fff' : '#aaa', background: value === s ? 'rgba(255,255,255,0.05)' : 'transparent', cursor: 'pointer', fontWeight: value === s ? '600' : '400' }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '20px', fontSize: '12px', color: '#444', textAlign: 'center' }}>No matches</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Custom Select ────────────────────────────────────────────
function CustomSelect({ value, onChange, options, placeholder = 'Select…' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ ...inp, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
      >
        <span style={{ color: value ? '#fff' : '#444' }}>{value || placeholder}</span>
        <span style={{ color: '#555', fontSize: '10px', flexShrink: 0 }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: '#0d0d0d', border: '1px solid #222', borderRadius: '8px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.7)', overflow: 'hidden',
        }}>
          {options.map(opt => (
            <div
              key={opt}
              onMouseDown={() => { onChange(opt); setOpen(false) }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={e => { e.currentTarget.style.background = value === opt ? 'rgba(255,255,255,0.05)' : 'transparent'; e.currentTarget.style.color = value === opt ? '#fff' : '#aaa' }}
              style={{ padding: '9px 14px', fontSize: '13px', color: value === opt ? '#fff' : '#aaa', background: value === opt ? 'rgba(255,255,255,0.05)' : 'transparent', cursor: 'pointer', fontWeight: value === opt ? '600' : '400' }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Chart URL helpers ────────────────────────────────────────
function parseChartUrls(raw) {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : [raw]
  } catch {
    return [raw]
  }
}

async function uploadImages(files, userId) {
  const urls = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = file.name.split('.').pop()
    const fileName = `${userId}_${Date.now()}_${i}.${ext}`
    const { error } = await supabase.storage
      .from('trade-charts')
      .upload(fileName, file, { cacheControl: '3600', upsert: false, contentType: file.type })
    if (error) {
      console.error('Upload error:', error)
      throw new Error(error.message)
    }
    const { data: urlData } = supabase.storage.from('trade-charts').getPublicUrl(fileName)
    urls.push(urlData.publicUrl)
  }
  return urls
}

// ─── Trade Detail Modal ───────────────────────────────────────
function TradeDetailModal({ trade, onClose, onSave }) {
  const [form, setForm] = useState({
    symbol:          trade.symbol          || '',
    dir:             trade.direction       || 'Long',
    date:            trade.trade_date      || '',
    session:         trade.session         || 'New York',
    pnl:             trade.pnl != null     ? String(trade.pnl)  : '',
    rr:              trade.rr  != null     ? String(trade.rr)   : '',
    emotional_state: trade.emotional_state || '',
    trade_rating:    trade.trade_rating    || '',
    entry_reason:    trade.entry_reason    || '',
    did_correctly:   trade.did_correctly   || '',
    did_wrong:       trade.did_wrong       || '',
    followed_plan:   trade.followed_plan   || '',
    notes:           trade.notes           || '',
  })
  const [saving,    setSaving]    = useState(false)
  const [uploading, setUploading] = useState(false)
  const [chartUrls, setChartUrls] = useState(() => parseChartUrls(trade.chart_url))
  const [lightbox,  setLightbox]  = useState(null)
  const fileRef = useRef(null)

  const planColors = { YES: '#aaffa0', PARTIALLY: '#ffd080', NO: '#ff8080' }
  const ta = { ...inp, resize: 'vertical', minHeight: '78px', lineHeight: '1.65' }
  const F  = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const divider = <div style={{ height: '1px', background: '#141414', margin: '18px 0' }} />

  const save = async () => {
    setSaving(true)
    const chart_url = chartUrls.length === 0 ? null
      : chartUrls.length === 1 ? chartUrls[0]
      : JSON.stringify(chartUrls)
    const updates = {
      symbol:          form.symbol          || null,
      direction:       form.dir             || null,
      trade_date:      form.date            || null,
      session:         form.session         || null,
      pnl:             parseFloat(form.pnl) || null,
      rr:              parseFloat(form.rr)  || null,
      emotional_state: form.emotional_state || null,
      trade_rating:    form.trade_rating    || null,
      entry_reason:    form.entry_reason    || null,
      did_correctly:   form.did_correctly   || null,
      did_wrong:       form.did_wrong       || null,
      followed_plan:   form.followed_plan   || null,
      notes:           form.notes           || null,
      chart_url,
    }
    const { data, error } = await supabase.from('trades').update(updates).eq('id', trade.id).select().single()
    setSaving(false)
    if (!error) onSave(data)
  }

  const uploadCharts = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const toUpload = files.slice(0, 5 - chartUrls.length)
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const newUrls = await uploadImages(toUpload, user.id)
      setChartUrls(prev => [...prev, ...newUrls])
    } catch (err) {
      console.error('Chart upload failed:', err)
      alert(`Upload failed: ${err.message}`)
    }
    setUploading(false)
    e.target.value = ''
  }

  const removeChart = (idx) => setChartUrls(prev => prev.filter((_, i) => i !== idx))

  return createPortal(
    <>
    {lightbox && (
      <div
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setLightbox(null)}
      >
        <button
          onClick={e => { e.stopPropagation(); setLightbox(null) }}
          style={{ position: 'fixed', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '50%', background: '#fff', border: 'none', color: '#000', fontSize: '20px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
        >✕</button>
        <img src={lightbox} alt="Chart" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '10px' }} />
      </div>
    )}
    <div
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000 }}
      onClick={onClose}
    >
      <div
        style={{ position: 'relative', width: '90%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '16px', padding: '32px', boxShadow: '0 32px 100px rgba(0,0,0,0.9)', zIndex: 1001, animation: 'modalIn 0.2s ease both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff' }}>Edit Trade</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}>✕</button>
        </div>

        {/* Symbol · Direction · Date · Session */}
        <div className="form-grid-4">
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Symbol</div>
            <SymbolSearch value={form.symbol} onChange={s => setForm(f => ({ ...f, symbol: s }))} />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Direction</div>
            <CustomSelect value={form.dir} onChange={v => setForm(f => ({ ...f, dir: v }))} options={['Long', 'Short']} />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Date</div>
            <input type="date" value={form.date} onChange={F('date')} style={{ ...inp, colorScheme: 'dark' }} />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Session</div>
            <CustomSelect value={form.session} onChange={v => setForm(f => ({ ...f, session: v }))} options={['London', 'New York', 'Asian', 'Overlap']} />
          </div>
        </div>

        {divider}

        {/* P&L · R:R */}
        <div className="form-grid-2">
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>P&L ($)</div>
            <input type="number" placeholder="0.00" value={form.pnl} onChange={F('pnl')} style={inp} />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>R:R</div>
            <input type="number" placeholder="0.00" value={form.rr} onChange={F('rr')} style={inp} />
          </div>
        </div>

        {divider}

        {/* Emotional state + Rating */}
        <div className="form-grid-2" style={{ marginBottom: '18px' }}>
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Emotional State</div>
            <CustomSelect value={form.emotional_state} onChange={v => setForm(f => ({ ...f, emotional_state: v }))} options={['Focused', 'Patient', 'Confident', 'Disciplined', 'Anxious', 'Tired', 'FOMO', 'Revenge']} />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Trade Rating</div>
            <CustomSelect value={form.trade_rating} onChange={v => setForm(f => ({ ...f, trade_rating: v }))} options={['A+ Setup', 'A Setup', 'B Setup', 'C Setup']} />
          </div>
        </div>

        {/* Entry reason */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Trade Entry Reason</div>
          <textarea value={form.entry_reason} onChange={F('entry_reason')} style={ta} placeholder="Why did you take this trade?" />
        </div>

        {/* Did correctly / wrong */}
        <div className="form-grid-2" style={{ marginBottom: '18px' }}>
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>What I Did Correctly</div>
            <textarea value={form.did_correctly} onChange={F('did_correctly')} style={ta} placeholder="What went well?" />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>What I Did Wrong</div>
            <textarea value={form.did_wrong} onChange={F('did_wrong')} style={ta} placeholder="What could improve?" />
          </div>
        </div>

        {/* Followed plan */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ ...lbl, marginBottom: '10px', color: '#999' }}>Did I Follow My Plan?</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['YES', 'PARTIALLY', 'NO'].map(opt => {
              const active = form.followed_plan === opt
              const c = planColors[opt]
              return (
                <button
                  key={opt}
                  onClick={() => setForm(f => ({ ...f, followed_plan: active ? '' : opt }))}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', border: active ? `1px solid ${c}` : '1px solid #1c1c1c', background: active ? `${c}12` : 'transparent', color: active ? c : '#555', fontSize: '12px', fontWeight: active ? '700' : '500', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', letterSpacing: '0.08em' }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ ...lbl, marginBottom: '7px', color: '#999' }}>Additional Notes</div>
          <textarea value={form.notes} onChange={F('notes')} style={ta} placeholder="Any other observations..." />
        </div>

        {divider}

        {/* Chart thumbnails */}
        {chartUrls.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: chartUrls.length === 1 ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            {chartUrls.map((url, idx) => (
              <div key={idx} style={{ position: 'relative' }}>
                <div className="thumb-wrap" style={{ border: '1px solid #1c1c1c', borderRadius: '8px' }}>
                <img
                  src={url} alt={`Chart ${idx + 1}`}
                  onClick={() => setLightbox(url)}
                  style={{ width: '100%', height: chartUrls.length === 1 ? '200px' : '180px', objectFit: 'cover', display: 'block' }}
                />
                </div>
                <button
                  onClick={() => removeChart(idx)}
                  style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid #555', color: '#ccc', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', lineHeight: 1, padding: 0 }}
                >✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <div style={{ marginBottom: '22px' }}>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={uploadCharts} style={{ display: 'none' }} />
          {chartUrls.length < 5 && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ background: 'transparent', border: '1px solid #1c1c1c', color: uploading ? '#555' : '#888', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', cursor: uploading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
            >
              {uploading ? 'Uploading…' : chartUrls.length > 0 ? '+ Add more' : '↑ Upload Chart'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ ...btn, flex: 1, opacity: saving ? 0.6 : 1 }} onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button style={{ ...btn, background: 'transparent', color: '#888', border: '1px solid #1c1c1c' }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
    </>,
    document.body
  )
}

// ─── Add Trade Modal ──────────────────────────────────────────
function AddTradeModal({ open, onClose, session, onTradeAdded }) {
  const BLANK = {
    symbol: '', dir: 'Long', entry: '', exit: '', pnl: '', rr: '',
    date: '', session: 'New York',
    emotional_state: '', trade_rating: '',
    entry_reason: '', did_correctly: '', did_wrong: '',
    followed_plan: '', notes: '',
  }
  const [form,       setForm]       = useState(BLANK)
  const [mode,       setMode]       = useState('simple')
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState('')
  const [chartWarn,  setChartWarn]  = useState('')
  const [chartFiles, setChartFiles] = useState([])
  const [lightbox,   setLightbox]   = useState(null)
  const chartInputRef = useRef(null)

  const F  = key => e => setForm(f => ({ ...f, [key]: e.target.value }))
  const ta = { ...inp, resize: 'vertical', minHeight: '78px', lineHeight: '1.65' }
  const divider = <div style={{ height: '1px', background: '#1a1a1a', margin: '20px 0' }} />
  const planColors = { YES: '#aaffa0', PARTIALLY: '#ffd080', NO: '#ff8080' }

  const close = () => {
    setForm(BLANK)
    setErr('')
    setChartWarn('')
    setChartFiles([])
    setLightbox(null)
    setMode('simple')
    onClose()
  }

  const saveTrade = async () => {
    if (!form.symbol) { setErr('Symbol is required.'); return }
    setErr('')
    setChartWarn('')
    setSaving(true)

    let uploadedUrls = []
    if (chartFiles.length > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        uploadedUrls = await uploadImages(chartFiles, user.id)
      } catch (err) {
        console.error('Chart upload failed:', err)
        setChartWarn(`Image upload failed: ${err.message} — trade saved without chart.`)
      }
    }
    const chart_url = uploadedUrls.length === 0 ? null
      : uploadedUrls.length === 1 ? uploadedUrls[0]
      : JSON.stringify(uploadedUrls)

    const { data, error } = await supabase.from('trades').insert({
      user_id:         session.user.id,
      symbol:          form.symbol,
      direction:       form.dir,
      pnl:             parseFloat(form.pnl)    || null,
      rr:              parseFloat(form.rr)      || null,
      session:         form.session             || null,
      trade_date:      form.date || new Date().toISOString().split('T')[0],
      emotional_state: form.emotional_state     || null,
      trade_rating:    form.trade_rating        || null,
      entry_reason:    form.entry_reason        || null,
      did_correctly:   form.did_correctly       || null,
      did_wrong:       form.did_wrong           || null,
      followed_plan:   form.followed_plan       || null,
      notes:           form.notes               || null,
      entry:           parseFloat(form.entry)   || null,
      exit:            parseFloat(form.exit)    || null,
      chart_url,
    }).select().single()

    setSaving(false)
    if (error) { setErr(error.message); return }
    onTradeAdded(data)
    close()
  }

  if (!open) return null

  return (
    <>
    {lightbox && (
      <div
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.95)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={() => setLightbox(null)}
      >
        <button
          onClick={e => { e.stopPropagation(); setLightbox(null) }}
          style={{ position: 'fixed', top: '20px', right: '20px', width: '44px', height: '44px', borderRadius: '50%', background: '#fff', border: 'none', color: '#000', fontSize: '20px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}
        >✕</button>
        <img src={lightbox} alt="Chart" onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '10px' }} />
      </div>
    )}
    <div
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) close() }}
    >
      <div
        style={{ position: 'relative', width: '90%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '16px', padding: '32px', boxShadow: '0 32px 100px rgba(0,0,0,0.9)', zIndex: 1001, animation: 'modalIn 0.2s ease both' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', color: '#fff' }}>New Trade Entry</div>
          <button onClick={close} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}>✕</button>
        </div>

        {/* ── Mode Toggle ── */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'inline-flex', background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '3px', gap: '2px' }}>
            {['simple', 'advanced'].map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '6px 20px', borderRadius: '7px', border: 'none',
                  background: mode === m ? '#fff' : 'transparent',
                  color: mode === m ? '#000' : '#555',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  fontFamily: 'inherit', letterSpacing: '0.04em',
                  textTransform: 'capitalize', transition: 'all 0.15s',
                }}
              >{m === 'simple' ? 'Simple' : 'Advanced'}</button>
            ))}
          </div>
        </div>

        {err && (
          <div style={{ fontSize: '12px', color: '#ff8080', marginBottom: '16px', padding: '8px 12px', background: 'rgba(255,128,128,0.05)', border: '1px solid rgba(255,128,128,0.15)', borderRadius: '7px' }}>{err}</div>
        )}
        {chartWarn && (
          <div style={{ fontSize: '12px', color: '#ffd080', marginBottom: '16px', padding: '8px 12px', background: 'rgba(255,208,128,0.05)', border: '1px solid rgba(255,208,128,0.15)', borderRadius: '7px' }}>{chartWarn}</div>
        )}

          {mode === 'simple' ? (
            <>
              {/* Symbol · Direction · Date */}
              <div className="form-grid-3">
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Symbol</div>
                  <SymbolSearch value={form.symbol} onChange={s => setForm(f => ({ ...f, symbol: s }))} />
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Direction</div>
                  <CustomSelect value={form.dir} onChange={v => setForm(f => ({ ...f, dir: v }))} options={['Long', 'Short']} />
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Date</div>
                  <input type="date" value={form.date} onChange={F('date')} style={{ ...inp, colorScheme: 'dark' }} />
                </div>
              </div>

              {divider}

              {/* P&L · R:R */}
              <div className="form-grid-2">
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>P&L ($)</div>
                  <input type="number" placeholder="0.00" value={form.pnl} onChange={F('pnl')} style={inp} />
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>R:R</div>
                  <input type="number" placeholder="0.00" value={form.rr} onChange={F('rr')} style={inp} />
                </div>
              </div>

              {divider}

              {/* Notes */}
              <div>
                <textarea
                  placeholder="Quick notes..."
                  value={form.notes} onChange={F('notes')}
                  style={{ ...ta, minHeight: '72px' }}
                />
              </div>

              {divider}

              {/* Chart Upload */}
              <div>
                <input ref={chartInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                  onChange={e => { const picked = Array.from(e.target.files || []); setChartFiles(prev => [...prev, ...picked].slice(0, 5)); e.target.value = '' }}
                  style={{ display: 'none' }}
                />
                {chartFiles.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: chartFiles.length === 1 ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    {chartFiles.map((f, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <div className="thumb-wrap" style={{ border: '1px solid #1c1c1c', borderRadius: '8px' }}>
                          <img
                            src={URL.createObjectURL(f)} alt={`Chart ${idx + 1}`}
                            onClick={() => setLightbox(URL.createObjectURL(f))}
                            style={{ width: '100%', height: chartFiles.length === 1 ? '200px' : '180px', objectFit: 'cover', display: 'block' }}
                          />
                        </div>
                        <button onClick={() => setChartFiles(prev => prev.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid #555', color: '#ccc', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', lineHeight: 1, padding: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {chartFiles.length < 5 && (
                  <button onClick={() => chartInputRef.current?.click()}
                    style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px dashed #2a2a2a', borderRadius: '8px', color: '#555', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', letterSpacing: '0.04em' }}>
                    {chartFiles.length > 0 ? '+ Add more images' : '↑ Upload Chart'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Symbol · Direction · Date · Session */}
              <div className="form-grid-4">
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Symbol</div>
                  <SymbolSearch value={form.symbol} onChange={s => setForm(f => ({ ...f, symbol: s }))} />
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Direction</div>
                  <CustomSelect value={form.dir} onChange={v => setForm(f => ({ ...f, dir: v }))} options={['Long', 'Short']} />
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Date</div>
                  <input type="date" value={form.date} onChange={F('date')} style={{ ...inp, colorScheme: 'dark' }} />
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Session</div>
                  <CustomSelect value={form.session} onChange={v => setForm(f => ({ ...f, session: v }))} options={['London', 'New York', 'Asian', 'Overlap']} />
                </div>
              </div>

              {divider}

              {/* Entry · Exit · P&L · R:R */}
              <div className="form-grid-4">
                {[['Entry Price','entry'],['Exit Price','exit'],['P&L ($)','pnl'],['R:R Ratio','rr']].map(([label, key]) => (
                  <div key={key}>
                    <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>{label}</div>
                    <input type="number" placeholder="0.00" value={form[key]} onChange={F(key)} style={inp} />
                  </div>
                ))}
              </div>

              {divider}

              {/* Emotional State · Trade Rating */}
              <div className="form-grid-2">
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Emotional State</div>
                  <CustomSelect value={form.emotional_state} onChange={v => setForm(f => ({ ...f, emotional_state: v }))} options={['Focused', 'Patient', 'Confident', 'Disciplined', 'Anxious', 'Tired', 'FOMO', 'Revenge']} />
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Trade Rating</div>
                  <CustomSelect value={form.trade_rating} onChange={v => setForm(f => ({ ...f, trade_rating: v }))} options={['A+ Setup', 'A Setup', 'B Setup', 'C Setup']} />
                </div>
              </div>

              {divider}

              {/* Trade Entry Reason */}
              <div>
                <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Trade Entry Reason</div>
                <textarea
                  placeholder="4h gap bearish bias, saw market open with strong momentum, broke structure at key level..."
                  value={form.entry_reason} onChange={F('entry_reason')}
                  style={{ ...ta, minHeight: '90px' }}
                />
              </div>

              {divider}

              {/* Did Correctly · Did Wrong */}
              <div className="form-grid-2">
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>What I Did Correctly</div>
                  <textarea placeholder="Waited for confirmation, respected my stop loss, sized correctly..." value={form.did_correctly} onChange={F('did_correctly')} style={ta} />
                </div>
                <div>
                  <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>What I Did Wrong</div>
                  <textarea placeholder="Entered too early, moved stop to breakeven too soon, chased the move..." value={form.did_wrong} onChange={F('did_wrong')} style={ta} />
                </div>
              </div>

              {divider}

              {/* Did I Follow My Plan? */}
              <div>
                <div style={{ ...lbl, marginBottom: '10px', color: '#666' }}>Did I Follow My Plan?</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['YES', 'PARTIALLY', 'NO'].map(opt => {
                    const active = form.followed_plan === opt
                    const c = planColors[opt]
                    return (
                      <button
                        key={opt}
                        onClick={() => setForm(f => ({ ...f, followed_plan: active ? '' : opt }))}
                        style={{
                          flex: 1, padding: '11px', borderRadius: '10px',
                          border: active ? `1px solid ${c}` : '1px solid #1c1c1c',
                          background: active ? `${c}12` : 'transparent',
                          color: active ? c : '#555',
                          fontSize: '12px', fontWeight: active ? '700' : '500',
                          cursor: 'pointer', fontFamily: 'inherit',
                          transition: 'all 0.15s', letterSpacing: '0.08em',
                        }}
                      >{opt}</button>
                    )
                  })}
                </div>
              </div>

              {divider}

              {/* Additional Notes */}
              <div>
                <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Additional Notes</div>
                <textarea
                  placeholder="Any other observations, market context, or things to remember next time..."
                  value={form.notes} onChange={F('notes')} style={ta}
                />
              </div>

              {divider}

              {/* Chart Upload */}
              <div>
                <div style={{ ...lbl, marginBottom: '7px', color: '#666' }}>Chart Screenshots</div>
                <input ref={chartInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                  onChange={e => { const picked = Array.from(e.target.files || []); setChartFiles(prev => [...prev, ...picked].slice(0, 5)); e.target.value = '' }}
                  style={{ display: 'none' }}
                />
                {chartFiles.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: chartFiles.length === 1 ? '1fr' : '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                    {chartFiles.map((f, idx) => (
                      <div key={idx} style={{ position: 'relative' }}>
                        <div className="thumb-wrap" style={{ border: '1px solid #1c1c1c', borderRadius: '8px' }}>
                          <img
                            src={URL.createObjectURL(f)} alt={`Chart ${idx + 1}`}
                            onClick={() => setLightbox(URL.createObjectURL(f))}
                            style={{ width: '100%', height: chartFiles.length === 1 ? '200px' : '180px', objectFit: 'cover', display: 'block' }}
                          />
                        </div>
                        <button onClick={() => setChartFiles(prev => prev.filter((_, i) => i !== idx))}
                          style={{ position: 'absolute', top: '6px', right: '6px', width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid #555', color: '#ccc', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit', lineHeight: 1, padding: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                {chartFiles.length < 5 && (
                  <button onClick={() => chartInputRef.current?.click()}
                    style={{ width: '100%', padding: '12px', background: 'transparent', border: '1px dashed #2a2a2a', borderRadius: '8px', color: '#555', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', letterSpacing: '0.04em' }}>
                    {chartFiles.length > 0 ? '+ Add more images' : '↑ Upload Chart'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '26px' }}>
            <button style={{ ...btn, flex: 1, opacity: saving ? 0.6 : 1 }} onClick={saveTrade} disabled={saving}>
              {saving ? 'Saving…' : 'Save Trade'}
            </button>
            <button style={{ ...btn, background: 'transparent', color: '#888', border: '1px solid #1c1c1c' }} onClick={close}>
              Cancel
            </button>
        </div>
      </div>
    </div>
    </>
  )
}

// ─── Trade Log ────────────────────────────────────────────────
function Trades({ trades, session, onTradeAdded, onTradeDeleted, onTradeUpdated, onAddTrade, loading }) {
  if (loading) return <TradesSkeleton />
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [csvPreview, setCsvPreview]     = useState(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvSuccess, setCsvSuccess]     = useState('')
  const [csvError, setCsvError]         = useState('')
  const csvInputRef                     = useRef(null)

  const parseCSV = (text) => {
    const lines   = text.trim().split(/\r?\n/)
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase())
    return lines.slice(1)
      .map(line => {
        const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row  = {}
        headers.forEach((h, i) => { row[h] = vals[i] ?? '' })
        return {
          trade_date:    row['trade_date'] || row['date'] || '',
          symbol:        row['symbol']        || '',
          direction:     row['direction']     || '',
          pnl:           parseFloat(row['pnl'])  || null,
          rr:            parseFloat(row['rr'])   || null,
          followed_plan: row['followed_plan'] || '',
        }
      })
      .filter(r => r.symbol)
  }

  const handleCSVFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result)
      setCsvPreview(parsed)
      setCsvSuccess('')
      setCsvError('')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const importAll = async () => {
    setCsvImporting(true)
    setCsvError('')
    const rows = csvPreview.map(r => ({
      user_id:       session.user.id,
      trade_date:    r.trade_date || new Date().toISOString().split('T')[0],
      symbol:        r.symbol,
      direction:     r.direction     || null,
      pnl:           r.pnl,
      rr:            r.rr,
      followed_plan: r.followed_plan || null,
    }))
    const { data, error } = await supabase.from('trades').insert(rows).select()
    setCsvImporting(false)
    if (error) { setCsvError(error.message); return }
    data.forEach(t => onTradeAdded(t))
    setCsvSuccess(`${data.length} trade${data.length !== 1 ? 's' : ''} imported successfully.`)
    setCsvPreview(null)
  }

  const deleteTrade = async (id) => {
    await supabase.from('trades').delete().eq('id', id)
    onTradeDeleted(id)
  }

  const sorted = [...trades].sort((a, b) => new Date(b.trade_date) - new Date(a.trade_date))

  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px' }}>Trade Log</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input ref={csvInputRef} type="file" accept=".csv" onChange={handleCSVFile} style={{ display: 'none' }} />
          <button
            style={{ ...btn, background: 'transparent', color: '#888', border: '1px solid #1c1c1c' }}
            onClick={() => { setCsvPreview(null); setCsvSuccess(''); setCsvError(''); csvInputRef.current?.click() }}
          >
            ↑ Import CSV
          </button>
          <button style={btn} onClick={onAddTrade}>
            + Add Trade
          </button>
        </div>
      </div>

      {/* CSV success banner */}
      {csvSuccess && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(170,255,160,0.05)', border: '1px solid rgba(170,255,160,0.15)', borderRadius: '10px', padding: '12px 18px', marginBottom: '14px', fontSize: '13px', color: '#aaffa0' }}>
          <span>✓ {csvSuccess}</span>
          <button onClick={() => setCsvSuccess('')} style={{ background: 'transparent', border: 'none', color: '#aaffa0', cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: '0 2px', fontFamily: 'inherit' }}>✕</button>
        </div>
      )}

      {/* CSV preview */}
      {csvPreview && (
        <div style={{ ...card, marginBottom: '16px', borderColor: '#222' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div>
              <div style={{ ...lbl, color: '#999', marginBottom: '5px' }}>CSV Import Preview</div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff', letterSpacing: '-0.3px' }}>
                {csvPreview.length} trade{csvPreview.length !== 1 ? 's' : ''} found
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {csvError && <span style={{ fontSize: '12px', color: '#ff8080' }}>{csvError}</span>}
              <button
                style={{ ...btn, opacity: csvImporting || csvPreview.length === 0 ? 0.6 : 1 }}
                onClick={importAll}
                disabled={csvImporting || csvPreview.length === 0}
              >
                {csvImporting ? 'Importing…' : `Import All (${csvPreview.length})`}
              </button>
              <button
                style={{ ...btn, background: 'transparent', color: '#888', border: '1px solid #1c1c1c' }}
                onClick={() => { setCsvPreview(null); setCsvError('') }}
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Date','Symbol','Direction','P&L','R:R','Followed Plan'].map(h => <th key={h} style={TH}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {csvPreview.map((t, i) => (
                  <tr key={i} className="trade-row">
                    <td style={{ ...TD, color: '#888', fontSize: '12px' }}>{t.trade_date || '—'}</td>
                    <td style={{ ...TD, fontWeight: '700' }}>{t.symbol}</td>
                    <td style={TD}>{t.direction ? <span style={badge(t.direction === 'Long')}>{t.direction}</span> : <span style={{ color: '#555' }}>—</span>}</td>
                    <td style={{ ...TD, fontWeight: '700', color: (t.pnl ?? 0) >= 0 ? '#aaffa0' : '#ff8080' }}>
                      {t.pnl != null ? `${t.pnl >= 0 ? '+' : '−'}$${Math.abs(t.pnl)}` : '—'}
                    </td>
                    <td style={{ ...TD, color: '#888', fontSize: '12px' }}>{t.rr ?? '—'}</td>
                    <td style={{ ...TD, color: '#888', fontSize: '12px' }}>{t.followed_plan || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={card}>
        {sorted.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '64px 24px', textAlign: 'center' }}>
            <BookOpen size={36} color="#333" />
            <div style={{ fontSize: '17px', fontWeight: '700', color: 'var(--text-hi)' }}>No trades yet</div>
            <div style={{ fontSize: '13px', color: 'var(--text-lo)', lineHeight: 1.6 }}>Start journaling your first setup to see your stats here</div>
            <button style={{ ...btn, marginTop: '8px' }} onClick={onAddTrade}>+ Add Trade</button>
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '580px' }}>
              <thead>
                <tr>
                  {['Date', 'Symbol', 'Direction', 'R:R', 'P&L', 'Session', 'Result', ''].map((h, i) => (
                    <th key={i} style={TH}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(t => {
                  const pnlNum = parseFloat(t.pnl) || 0
                  const isWin  = pnlNum > 0
                  const isLoss = pnlNum < 0
                  const pnlColor  = isWin ? '#aaffa0' : isLoss ? '#ff8080' : '#888'
                  const pnlShadow = isWin ? '0 0 20px rgba(170,255,160,0.3)' : isLoss ? '0 0 20px rgba(255,128,128,0.3)' : 'none'
                  const pnlDisplay = isWin
                    ? `+$${Math.round(pnlNum).toLocaleString()}`
                    : isLoss
                    ? `−$${Math.abs(Math.round(pnlNum)).toLocaleString()}`
                    : '$0'
                  const resultLabel = isWin ? 'Win' : isLoss ? 'Loss' : 'BE'
                  const resultStyle = isWin ? badge(true) : isLoss ? badge(false) : badgeBE
                  return (
                    <tr
                      key={t.id}
                      className="trade-row"
                      onClick={() => setSelectedTrade(t)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ ...TD, color: 'var(--text-lo)', fontSize: '12px', whiteSpace: 'nowrap' }}>{formatDate(t.trade_date)}</td>
                      <td style={{ ...TD, fontWeight: '700', fontSize: '13px' }}>{t.symbol}</td>
                      <td style={TD}><span style={badge(t.direction === 'Long')}>{t.direction}</span></td>
                      <td style={{ ...TD, color: 'var(--text-md)', fontSize: '12px' }}>{t.rr != null ? Number(t.rr).toFixed(1) : '—'}</td>
                      <td style={{ ...TD, fontWeight: '700', color: pnlColor, textShadow: pnlShadow, whiteSpace: 'nowrap' }}>{pnlDisplay}</td>
                      <td style={{ ...TD, color: 'var(--text-lo)', fontSize: '12px' }}>{t.session || '—'}</td>
                      <td style={TD}><span style={resultStyle}>{resultLabel}</span></td>
                      <td style={TD}>
                        <button
                          className="del-btn"
                          onClick={e => { e.stopPropagation(); deleteTrade(t.id) }}
                          style={{ background: 'transparent', border: '1px solid transparent', color: '#444', fontSize: '11px', cursor: 'pointer', padding: '3px 8px', borderRadius: '6px', fontFamily: 'inherit', transition: 'all 0.15s' }}
                          title="Delete trade"
                        >✕</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onSave={updated => { onTradeUpdated(updated); setSelectedTrade(null) }}
        />
      )}
    </div>
  )
}

// ─── News Calendar ────────────────────────────────────────────
function NewsSkeleton() {
  const cardRow = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', padding: '13px 18px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }
  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      <div style={{ marginBottom: '24px' }}>
        <Sk w={70} h={10} style={{ marginBottom: '10px' }} />
        <Sk w={190} h={30} />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {[55, 52, 72, 52].map((w, i) => <Sk key={i} w={w} h={30} style={{ borderRadius: '99px' }} />)}
        <Sk w={100} h={30} style={{ borderRadius: '8px' }} />
      </div>
      {[4, 3, 2].map((count, gi) => (
        <div key={gi} style={{ marginBottom: '28px' }}>
          <Sk w={180} h={12} style={{ marginBottom: '12px' }} />
          {[...Array(count)].map((_, i) => (
            <div key={i} style={cardRow}>
              <Sk w={8} h={8} style={{ borderRadius: '50%', flexShrink: 0 }} />
              <Sk w={56} h={11} style={{ flexShrink: 0 }} />
              <Sk w={38} h={22} style={{ borderRadius: '6px', flexShrink: 0 }} />
              <Sk w="35%" h={13} />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '14px' }}>
                <Sk w={36} h={11} />
                <Sk w={36} h={11} />
                <Sk w={36} h={11} />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// Fallback data used when all proxies fail — realistic events for the current week
const NEWS_FALLBACK = (() => {
  const now = new Date()
  const dow = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  mon.setHours(0, 0, 0, 0)
  const dt = (daysFromMon, h, m) => {
    const d = new Date(mon); d.setDate(mon.getDate() + daysFromMon); d.setHours(h, m, 0, 0); return d.toISOString()
  }
  return [
    { title: 'CPI m/m',                     country: 'USD', date: dt(1, 8, 30),  impact: 'High',   forecast: '0.3%',    previous: '0.2%'    },
    { title: 'Core CPI m/m',                country: 'USD', date: dt(1, 8, 30),  impact: 'High',   forecast: '0.3%',    previous: '0.3%'    },
    { title: 'Unemployment Rate',            country: 'EUR', date: dt(1, 10, 0),  impact: 'Medium', forecast: '6.1%',    previous: '6.2%'    },
    { title: 'PPI m/m',                     country: 'USD', date: dt(2, 8, 30),  impact: 'Medium', forecast: '0.2%',    previous: '0.1%'    },
    { title: 'Retail Sales m/m',            country: 'GBP', date: dt(2, 9, 30),  impact: 'High',   forecast: '0.4%',    previous: '-0.3%'   },
    { title: 'Trade Balance',               country: 'USD', date: dt(3, 8, 30),  impact: 'Medium', forecast: '-$65.5B', previous: '-$68.9B' },
    { title: 'FOMC Meeting Minutes',        country: 'USD', date: dt(3, 14, 0),  impact: 'High',   forecast: '',        previous: ''        },
    { title: 'BOE Interest Rate Decision',  country: 'GBP', date: dt(3, 12, 0),  impact: 'High',   forecast: '5.25%',   previous: '5.25%'   },
    { title: 'Jobless Claims',              country: 'USD', date: dt(4, 8, 30),  impact: 'Medium', forecast: '215K',    previous: '220K'    },
    { title: 'GDP q/q',                     country: 'EUR', date: dt(4, 10, 0),  impact: 'High',   forecast: '0.3%',    previous: '0.1%'    },
    { title: 'Non-Farm Payrolls',           country: 'USD', date: dt(5, 8, 30),  impact: 'High',   forecast: '180K',    previous: '187K'    },
    { title: 'Unemployment Rate',           country: 'USD', date: dt(5, 8, 30),  impact: 'High',   forecast: '3.9%',    previous: '3.9%'    },
    { title: 'Average Hourly Earnings m/m', country: 'USD', date: dt(5, 8, 30),  impact: 'High',   forecast: '0.3%',    previous: '0.4%'    },
    { title: 'Michigan Consumer Sentiment', country: 'USD', date: dt(5, 10, 0),  impact: 'Medium', forecast: '78.0',    previous: '77.2'    },
  ]
})()

const NEWS_CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Get the Monday of a week containing the given date (or today)
const getMonday = (d = new Date()) => {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const mon = new Date(d)
  mon.setDate(d.getDate() + diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

// Format a Monday date as YYYY-MM-DD for cache keys / API params
const toDateKey = (d) => d.toISOString().split('T')[0]

// Format week range label: "Apr 7 – Apr 11, 2026"
const weekRangeLabel = (monday) => {
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const fmt = (dt) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(monday)} – ${fmt(friday)}, ${friday.getFullYear()}`
}

function NewsCalendar() {
  const thisMonday = getMonday()
  const [weekOffset,   setWeekOffset]   = useState(0)  // 0 = current week, 1 = next, etc.
  const [events,       setEvents]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [useFallback,  setUseFallback]  = useState(false)
  const [unavailable,  setUnavailable]  = useState(false)
  const [cachedAt,     setCachedAt]     = useState(null)
  const [impactFilter, setImpactFilter] = useState('All')
  const [currFilter,   setCurrFilter]   = useState('All')

  const currentMonday = new Date(thisMonday)
  currentMonday.setDate(thisMonday.getDate() + weekOffset * 7)
  const weekKey = toDateKey(currentMonday)
  const cacheKey = `news_cache_${weekKey}`

  const fetchNews = async (monday, key) => {
    setLoading(true)
    setUseFallback(false)
    setUnavailable(false)
    let data = null
    try {
      const res = await fetch(`/api/news?week=${toDateKey(monday)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const parsed = await res.json()
      if (parsed?.unavailable) {
        setUnavailable(true)
        setEvents([])
        setLoading(false)
        return
      }
      if (Array.isArray(parsed) && parsed.length > 0) data = parsed
    } catch { /* fall through to fallback */ }
    if (data) {
      const ts = Date.now()
      try { localStorage.setItem(key, JSON.stringify({ ts, data })) } catch {}
      setEvents(data)
      setCachedAt(ts)
    } else {
      setEvents(weekOffset === 0 ? NEWS_FALLBACK : [])
      setUseFallback(weekOffset === 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    setImpactFilter('All')
    setCurrFilter('All')
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const { ts, data } = JSON.parse(raw)
        if (Date.now() - ts < NEWS_CACHE_TTL && Array.isArray(data) && data.length > 0) {
          setEvents(data)
          setCachedAt(ts)
          setLoading(false)
          setUseFallback(false)
          setUnavailable(false)
          return
        }
      }
    } catch {}
    fetchNews(currentMonday, cacheKey)
  }, [weekOffset])

  const impactColor = (impact) => {
    const i = (impact || '').toLowerCase()
    if (i === 'high')    return '#ff4444'
    if (i === 'medium')  return '#ff8c00'
    if (i === 'low')     return '#ffd700'
    if (i === 'holiday') return '#ffffff'
    return '#555'
  }

  // FF date is an ISO datetime string — extract the time portion
  const formatTime = (dateStr) => {
    if (!dateStr) return 'All Day'
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return '—'
      const h = d.getHours(), m = d.getMinutes()
      if (h === 0 && m === 0) return 'All Day'
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    } catch { return '—' }
  }

  // Extract "YYYY-MM-DD" from ISO datetime for grouping
  const getDateKey = (dateStr) => {
    if (!dateStr) return 'unknown'
    try {
      const d = new Date(dateStr)
      return isNaN(d.getTime()) ? dateStr : d.toISOString().split('T')[0]
    } catch { return dateStr }
  }

  const formatDayHeader = (dateStr) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    } catch { return dateStr }
  }

  // Unique currencies
  const currencies = ['All', ...Array.from(new Set(events.map(e => e.country).filter(Boolean))).sort()]

  // Filter
  const filtered = events.filter(e => {
    if (impactFilter !== 'All' && (e.impact || '').toLowerCase() !== impactFilter.toLowerCase()) return false
    if (currFilter !== 'All' && e.country !== currFilter) return false
    return true
  })

  // Group by calendar day
  const groupMap = {}
  const groupOrder = []
  for (const e of filtered) {
    const key = getDateKey(e.date)
    if (!groupMap[key]) { groupMap[key] = { label: formatDayHeader(e.date), events: [] }; groupOrder.push(key) }
    groupMap[key].events.push(e)
  }

  const cardS = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '12px' }

  if (loading) return <NewsSkeleton />

  const MAX_OFFSET = 1 // FF only provides this week + next week
  const navBtn = (disabled) => ({
    background: 'transparent',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    color: disabled ? 'var(--text-dim)' : 'var(--text-hi)',
    width: '34px', height: '34px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit', fontSize: '16px',
    transition: 'all 0.15s',
    opacity: disabled ? 0.35 : 1,
    flexShrink: 0,
  })

  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px' }}>News Calendar</h1>
        {/* Week navigator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={navBtn(weekOffset === 0)}
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset(o => Math.max(0, o - 1))}
          >←</button>
          <div style={{
            background: 'var(--card-bg)', border: '1px solid var(--card-border)',
            borderRadius: '8px', padding: '6px 14px', fontSize: '12px',
            fontWeight: '600', color: weekOffset === 0 ? 'var(--text-hi)' : 'var(--text-md)',
            whiteSpace: 'nowrap', letterSpacing: '0.01em',
            borderColor: weekOffset === 0 ? 'rgba(255,255,255,0.15)' : 'var(--card-border)',
          }}>
            {weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : weekRangeLabel(currentMonday)}
          </div>
          <button
            style={navBtn(weekOffset >= MAX_OFFSET)}
            disabled={weekOffset >= MAX_OFFSET}
            onClick={() => setWeekOffset(o => Math.min(MAX_OFFSET, o + 1))}
          >→</button>
        </div>
      </div>
      {/* Week range label */}
      <div style={{ fontSize: '12px', color: 'var(--text-lo)', marginBottom: '20px', marginTop: '-16px' }}>
        {weekRangeLabel(currentMonday)}
      </div>

      {/* Filters */}
      <div className="news-filters">
        <div className="news-pills">
          {['All', 'High', 'Medium', 'Low'].map(f => {
            const active = impactFilter === f
            const dotColor = f !== 'All' ? impactColor(f) : null
            return (
              <button
                key={f}
                onClick={() => setImpactFilter(f)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 14px', borderRadius: '99px',
                  border: active ? '1px solid var(--text-hi)' : '1px solid var(--card-border)',
                  background: active ? 'var(--text-hi)' : 'transparent',
                  color: active ? 'var(--bg)' : 'var(--text-md)',
                  fontSize: '12px', fontWeight: active ? '700' : '400',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {dotColor && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />}
                {f}
              </button>
            )
          })}
        </div>

        <select
          value={currFilter}
          onChange={e => setCurrFilter(e.target.value)}
          style={{ ...inp, width: 'auto', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}
        >
          {currencies.map(c => <option key={c} value={c}>{c === 'All' ? 'All Currencies' : c}</option>)}
        </select>
      </div>

      {/* Empty — no data at all (next week not published yet, or unavailable) */}
      {(unavailable || (!unavailable && events.length === 0)) && (
        <div style={{ ...cardS, padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <CalendarDays size={28} color="#333" />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-hi)' }}>Next week's events haven't been published yet</div>
          <div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>Check back later in the week</div>
        </div>
      )}
      {/* Empty — filters hide all events */}
      {!unavailable && events.length > 0 && filtered.length === 0 && (
        <div style={{ ...cardS, padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <CalendarDays size={28} color="#333" />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-hi)' }}>No events found</div>
          <div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>No events match the selected filters</div>
        </div>
      )}

      {/* Day groups */}
      {groupOrder.map(key => {
        const g = groupMap[key]
        return (
          <div key={key} style={{ marginBottom: '28px' }}>
            {/* Day label */}
            <div style={{
              fontSize: '11px', fontWeight: '700', color: 'var(--text-lo)',
              letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'left',
              marginBottom: '10px', paddingBottom: '8px',
              borderBottom: '1px solid var(--divider)',
            }}>
              {g.label}
            </div>

            {/* Events */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {g.events.map((ev, i) => (
                <div
                  key={i}
                  className="trade-row"
                  style={{
                    ...cardS, padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Impact dot */}
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                    background: impactColor(ev.impact),
                    boxShadow: `0 0 5px ${impactColor(ev.impact)}55`,
                  }} />

                  {/* Time */}
                  <div style={{ fontSize: '12px', color: 'var(--text-lo)', whiteSpace: 'nowrap', minWidth: '58px', flexShrink: 0 }}>
                    {formatTime(ev.date)}
                  </div>

                  {/* Currency badge */}
                  <span style={{
                    padding: '2px 7px', borderRadius: '6px', fontSize: '11px', fontWeight: '700',
                    background: 'var(--inp-bg)', border: '1px solid var(--card-border)',
                    color: 'var(--text-md)', letterSpacing: '0.06em', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {ev.country || '—'}
                  </span>

                  {/* Event title */}
                  <div style={{ flex: 1, fontSize: '13px', fontWeight: '600', color: 'var(--text-hi)', minWidth: 0, lineHeight: 1.35, textAlign: 'left' }}>
                    {ev.title}
                  </div>

                  {/* Prev / Fcst */}
                  <div className="news-row-meta" style={{ display: 'flex', gap: '14px', flexShrink: 0 }}>
                    {[['Prev', ev.previous], ['Fcst', ev.forecast]].map(([lbl2, val]) =>
                      val != null && val !== '' ? (
                        <div key={lbl2} style={{ textAlign: 'right', minWidth: '36px' }}>
                          <div style={{ fontSize: '9px', color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>{lbl2}</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-md)' }}>{val}</div>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {useFallback && (
        <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--divider)' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '0.04em', marginBottom: '10px' }}>Live feed temporarily unavailable — showing sample data</div>
          <button
            onClick={() => { try { localStorage.removeItem(cacheKey) } catch {} fetchNews(currentMonday, cacheKey) }}
            style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-md)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >Retry</button>
        </div>
      )}

      {!useFallback && !unavailable && cachedAt && (
        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-dim)', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--divider)', letterSpacing: '0.04em' }}>
          {(() => {
            const mins = Math.round((Date.now() - cachedAt) / 60000)
            return mins < 1 ? 'Updated just now' : `Updated ${mins} minute${mins !== 1 ? 's' : ''} ago`
          })()}
        </div>
      )}
    </div>
  )
}

// ─── Trading Plan ─────────────────────────────────────────────
function TradingPlan({ flags = {} }) {
  const today    = new Date().toISOString().slice(0, 10)
  const CK       = `checklist_${today}`     // daily check state (by item id)
  const IK       = 'checklist_items'        // persistent item list
  const RK       = 'trading_rules'
  const MAX_ITEMS = 12

  const makeId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `id_${Date.now()}_${Math.random().toString(36).slice(2)}`

  const defaultItems = [
    { id: 'bias',       label: 'Bias confirmed'        },
    { id: 'liquidity',  label: 'Liquidity identified'  },
    { id: 'entryModel', label: 'Entry model valid'     },
    { id: 'risk',       label: 'Risk acceptable'       },
    { id: 'news',       label: 'News/events checked'   },
    { id: 'emotional',  label: 'Emotional state good'  },
  ]
  const defaultRules  = { sessionTime: '', setupModel: '', entryConfirmations: '', riskPerTrade: '', rulesBefore: '' }

  const [items, setItems] = useState(() => {
    try {
      const s = localStorage.getItem(IK)
      if (s) {
        const parsed = JSON.parse(s)
        if (Array.isArray(parsed) && parsed.every(it => it && it.id && typeof it.label === 'string')) return parsed
      }
    } catch {}
    return defaultItems
  })
  const [checks, setChecks] = useState(() => {
    try { const s = localStorage.getItem(CK); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const [rules, setRules] = useState(() => {
    try { const s = localStorage.getItem(RK); return s ? JSON.parse(s) : defaultRules } catch { return defaultRules }
  })
  const [rulesSaved, setRulesSaved] = useState(false)

  // Edit state
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState('')

  // Drag & drop state
  const [draggedIdx,  setDraggedIdx]  = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)

  // AI generation state
  const [generating,  setGenerating]  = useState(false)
  const [generateMsg, setGenerateMsg] = useState(null) // { type: 'success' | 'error', text: string }

  const persistItems = (next) => {
    try { localStorage.setItem(IK, JSON.stringify(next)) } catch {}
    return next
  }
  const persistChecks = (next) => {
    try { localStorage.setItem(CK, JSON.stringify(next)) } catch {}
    return next
  }

  const toggle = (id) => {
    if (editingId === id) return // don't toggle while editing
    setChecks(prev => persistChecks({ ...prev, [id]: !prev[id] }))
  }

  const startEdit = (item, e) => {
    e?.stopPropagation?.()
    setEditingId(item.id)
    setEditDraft(item.label)
  }
  const commitEdit = () => {
    const label = editDraft.trim()
    if (!label) { cancelEdit(); return }
    setItems(prev => persistItems(prev.map(it => it.id === editingId ? { ...it, label } : it)))
    setEditingId(null)
    setEditDraft('')
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft('')
  }

  const deleteItem = (id, e) => {
    e?.stopPropagation?.()
    setItems(prev => persistItems(prev.filter(it => it.id !== id)))
    setChecks(prev => { const next = { ...prev }; delete next[id]; return persistChecks(next) })
    if (editingId === id) cancelEdit()
  }

  const addItem = () => {
    if (items.length >= MAX_ITEMS) return
    const newItem = { id: makeId(), label: 'New item' }
    setItems(prev => persistItems([...prev, newItem]))
    setEditingId(newItem.id)
    setEditDraft('New item')
  }

  const saveRules = () => {
    localStorage.setItem(RK, JSON.stringify(rules))
    setRulesSaved(true)
    setTimeout(() => setRulesSaved(false), 2000)
  }

  const generateFromRules = async () => {
    const combined = [
      rules.sessionTime && `Session time: ${rules.sessionTime}`,
      rules.setupModel && `Setup / model: ${rules.setupModel}`,
      rules.entryConfirmations && `Entry confirmations: ${rules.entryConfirmations}`,
      rules.riskPerTrade && `Risk per trade: ${rules.riskPerTrade}`,
      rules.rulesBefore && `Rules before entering: ${rules.rulesBefore}`,
    ].filter(Boolean).join('\n\n')

    if (!combined.trim()) {
      setGenerateMsg({ type: 'error', text: 'Fill in at least one rule first' })
      setTimeout(() => setGenerateMsg(null), 3000)
      return
    }

    setGenerating(true)
    setGenerateMsg(null)
    try {
      const res = await fetch('/api/generate-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: combined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      const list = (data.items || []).map(label => ({ id: makeId(), label }))
      if (list.length === 0) throw new Error('No items returned')
      setItems(persistItems(list))
      setChecks(persistChecks({}))
      setGenerateMsg({ type: 'success', text: 'Checklist updated from your rules!' })
      setTimeout(() => setGenerateMsg(null), 3500)
    } catch (err) {
      setGenerateMsg({ type: 'error', text: err.message || 'Failed to generate' })
      setTimeout(() => setGenerateMsg(null), 4000)
    } finally {
      setGenerating(false)
    }
  }

  const done = items.reduce((s, it) => s + (checks[it.id] ? 1 : 0), 0)
  const allDone = items.length > 0 && done === items.length
  const ta = { ...inp, minHeight: '80px', resize: 'vertical', lineHeight: '1.65' }

  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px', color: 'var(--text-hi)' }}>Trading Plan</h1>
      </div>

      {/* Daily Checklist */}
      <div style={{ ...card, marginBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ ...lbl, marginBottom: '4px' }}>Resets Daily</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-hi)', letterSpacing: '-0.3px' }}>Pre-Trade Checklist</div>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: allDone ? '#aaffa0' : 'var(--text-md)', transition: 'color 0.3s' }}>
            {done}/{items.length} {allDone ? '✓' : ''}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map((item, idx) => {
            const on = !!checks[item.id]
            const isEditing = editingId === item.id
            return (
              <div
                key={item.id}
                className={`check-item${isEditing ? ' editing' : ''}`}
                draggable={true}
                onDragStart={(e) => {
                  if (isEditing) { e.preventDefault(); return }
                  e.dataTransfer.effectAllowed = 'move'
                  setDraggedIdx(idx)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverIdx(idx)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggedIdx === null || draggedIdx === idx) return
                  const newItems = [...items]
                  const [removed] = newItems.splice(draggedIdx, 1)
                  newItems.splice(idx, 0, removed)
                  setItems(newItems)
                  localStorage.setItem('checklist_items', JSON.stringify(newItems))
                  setDraggedIdx(null)
                  setDragOverIdx(null)
                }}
                onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null) }}
                onClick={() => !isEditing && toggle(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 12px', borderRadius: '10px',
                  cursor: isEditing ? 'default' : 'pointer',
                  border: `1px solid ${on && !isEditing ? 'rgba(170,255,160,0.22)' : 'var(--card-border)'}`,
                  borderTop: dragOverIdx === idx && draggedIdx !== idx ? '2px solid #aaffa0' : undefined,
                  background: on && !isEditing ? 'rgba(170,255,160,0.05)' : isEditing ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transition: 'opacity 0.15s, background 0.15s, border-color 0.15s, color 0.15s',
                  userSelect: 'none',
                  opacity: draggedIdx === idx ? 0.4 : 1,
                }}
              >
                {/* Drag handle */}
                <GripVertical
                  size={14}
                  color="#444"
                  style={{ flexShrink: 0, cursor: 'grab', userSelect: 'none' }}
                />

                {/* Checkbox */}
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                  border: `1.5px solid ${on ? '#aaffa0' : 'var(--inp-border)'}`,
                  background: on ? '#aaffa0' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {on && <Check size={11} strokeWidth={3.5} style={{ color: '#000' }} />}
                </div>

                {/* Label or edit input */}
                {isEditing ? (
                  <input
                    autoFocus
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEdit()
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    onBlur={commitEdit}
                    style={{
                      flex: 1, background: 'var(--inp-bg)', border: '1px solid var(--inp-border)',
                      borderRadius: '6px', color: 'var(--text-hi)', fontSize: '14px',
                      padding: '6px 10px', fontFamily: 'inherit', outline: 'none',
                      transition: 'all 0.15s',
                    }}
                  />
                ) : (
                  <span style={{ flex: 1, fontSize: '14px', color: on ? 'var(--text-hi)' : 'var(--text-md)', fontWeight: on ? '500' : '400', transition: 'color 0.15s' }}>
                    {item.label}
                  </span>
                )}

                {/* Actions */}
                <div className="check-actions" style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {isEditing ? (
                    <button
                      onClick={e => { e.stopPropagation(); commitEdit() }}
                      onMouseDown={e => e.preventDefault()}
                      style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: '#aaffa0', display: 'flex', alignItems: 'center', transition: 'color 0.15s', minHeight: 'auto' }}
                      title="Save"
                    >
                      <Check size={14} strokeWidth={2.5} />
                    </button>
                  ) : (
                    <button
                      onClick={e => startEdit(item, e)}
                      style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: '#666', display: 'flex', alignItems: 'center', transition: 'color 0.15s', minHeight: 'auto' }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#aaa' }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#666' }}
                      title="Edit"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    onClick={e => deleteItem(item.id, e)}
                    style={{ background: 'transparent', border: 'none', padding: '4px', cursor: 'pointer', color: '#555', display: 'flex', alignItems: 'center', transition: 'color 0.15s', minHeight: 'auto' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ff8080' }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#555' }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Add item */}
        {items.length < MAX_ITEMS && (
          <button
            onClick={addItem}
            style={{
              marginTop: '10px', width: '100%',
              background: 'transparent', border: '1px dashed var(--card-border)',
              borderRadius: '10px', padding: '10px',
              color: 'var(--text-lo)', fontFamily: 'inherit', fontSize: '13px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-hi)'; e.currentTarget.style.borderColor = 'var(--inp-border)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-lo)'; e.currentTarget.style.borderColor = 'var(--card-border)' }}
          >
            <Plus size={14} /> Add Item
          </button>
        )}
        {items.length >= MAX_ITEMS && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center' }}>
            Maximum {MAX_ITEMS} items
          </div>
        )}
      </div>

      {/* My Rules */}
      <div style={card}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ ...lbl, marginBottom: '4px' }}>Permanent</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-hi)', letterSpacing: '-0.3px' }}>My Rules</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '22px' }}>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Trading Session Time</div>
            <input value={rules.sessionTime} onChange={e => setRules(r => ({ ...r, sessionTime: e.target.value }))} style={inp} placeholder="e.g. 9:30 AM – 11:30 AM EST" />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Setup / Model Used</div>
            <textarea value={rules.setupModel} onChange={e => setRules(r => ({ ...r, setupModel: e.target.value }))} style={ta} placeholder="Describe your primary setup or trading model..." />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Entry Confirmations</div>
            <textarea value={rules.entryConfirmations} onChange={e => setRules(r => ({ ...r, entryConfirmations: e.target.value }))} style={ta} placeholder="What must align before you enter a trade?" />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Risk Per Trade</div>
            <input value={rules.riskPerTrade} onChange={e => setRules(r => ({ ...r, riskPerTrade: e.target.value }))} style={inp} placeholder="e.g. 1% of account, max 2 trades/day" />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Rules Before Entering</div>
            <textarea value={rules.rulesBefore} onChange={e => setRules(r => ({ ...r, rulesBefore: e.target.value }))} style={{ ...ta, minHeight: '100px' }} placeholder="Your non-negotiable rules before any trade..." />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button style={btn} onClick={saveRules}>{rulesSaved ? '✓ Rules Saved' : 'Save Rules'}</button>

          {flags.aiChecklist !== false && (
          <button
            onClick={generateFromRules}
            disabled={generating}
            style={{
              background: 'transparent',
              border: '1px solid rgba(170,255,160,0.25)',
              color: generating ? 'var(--text-lo)' : '#aaffa0',
              borderRadius: '10px', padding: '11px',
              fontFamily: 'inherit', fontSize: '13px', fontWeight: '600',
              cursor: generating ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
              opacity: generating ? 0.7 : 1,
            }}
          >
            {generating
              ? <><Loader2 size={14} className="spin" /> Generating…</>
              : <><Sparkles size={14} /> Generate Checklist from Rules</>}
          </button>
          )}

          {generateMsg && (
            <div style={{
              fontSize: '12px', textAlign: 'center', padding: '8px',
              borderRadius: '8px',
              background: generateMsg.type === 'success' ? 'rgba(170,255,160,0.08)' : 'rgba(255,128,128,0.08)',
              color: generateMsg.type === 'success' ? '#aaffa0' : '#ff8080',
              border: `1px solid ${generateMsg.type === 'success' ? 'rgba(170,255,160,0.2)' : 'rgba(255,128,128,0.2)'}`,
              transition: 'all 0.15s',
            }}>
              {generateMsg.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



// ─── Settings ─────────────────────────────────────────────────
function Settings({ theme, setTheme, session, profile, setProfile, glassMode, setGlassMode, onLogout, trades = [] }) {
  // Support ticket
  const [ticketSubj, setTicketSubj] = useState('')
  const [ticketBody, setTicketBody] = useState('')
  const [ticketState, setTicketState] = useState(null) // null | 'sending' | 'sent' | { error: string }
  const submitTicket = async () => {
    if (!ticketSubj.trim() || !ticketBody.trim()) return
    setTicketState('sending')
    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: session.user.id,
        email:   session.user.email,
        subject: ticketSubj.trim(),
        message: ticketBody.trim(),
        status:  'open',
      })
      if (error) throw error
      setTicketSubj(''); setTicketBody('')
      setTicketState('sent')
      setTimeout(() => setTicketState(null), 3000)
    } catch (e) {
      setTicketState({ error: e.message })
    }
  }

  const [localFirstName, setLocalFirstName] = useState(profile?.first_name   || '')
  const [localLastName,  setLocalLastName]  = useState(profile?.last_name    || '')
  const [localPhone,     setLocalPhone]     = useState(profile?.phone        || '')
  const [localName,      setLocalName]      = useState(profile?.username     || '')
  const [localMarket,    setLocalMarket]    = useState(profile?.market_focus || '')
  const [saved,          setSaved]          = useState(false)

  // Goal Tracker state
  const [goalEnabled, setGoalEnabled] = useState(() => localStorage.getItem('goal_tracker_enabled') === 'true')
  const [localGoal,   setLocalGoal]   = useState(profile?.monthly_goal ? String(profile.monthly_goal) : '')
  const [goalSaved,   setGoalSaved]   = useState(false)

  useEffect(() => {
    setLocalFirstName(profile?.first_name   || '')
    setLocalLastName(profile?.last_name    || '')
    setLocalPhone(profile?.phone          || '')
    setLocalName(profile?.username        || '')
    setLocalMarket(profile?.market_focus  || '')
    setLocalGoal(profile?.monthly_goal ? String(profile.monthly_goal) : '')
  }, [profile])

  const saveProfile = async () => {
    const updates = {
      first_name:   localFirstName || null,
      last_name:    localLastName  || null,
      phone:        localPhone     || null,
      username:     localName      || null,
      market_focus: localMarket    || null,
    }
    await supabase.from('profiles').update(updates).eq('id', session.user.id)
    setProfile(p => ({ ...p, ...updates }))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const toggleGoalEnabled = () => {
    const next = !goalEnabled
    setGoalEnabled(next)
    try { localStorage.setItem('goal_tracker_enabled', next ? 'true' : 'false') } catch {}
  }

  const saveGoal = async () => {
    const newGoal = parseFloat(localGoal) || 0
    try {
      await supabase.from('profiles').update({ monthly_goal: newGoal }).eq('id', session.user.id)
    } catch {}
    setProfile(p => ({ ...p, monthly_goal: newGoal }))
    // Snapshot the goal for the current month into history
    const now = new Date()
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    try {
      const h = JSON.parse(localStorage.getItem('goal_history') || '{}')
      h[key] = newGoal
      localStorage.setItem('goal_history', JSON.stringify(h))
    } catch {}
    setGoalSaved(true)
    setTimeout(() => setGoalSaved(false), 2000)
  }

  // Compute past 3 months of achieved P&L from trades + goal from history
  const pastMonths = (() => {
    const now = new Date()
    const historyGoals = (() => { try { return JSON.parse(localStorage.getItem('goal_history') || '{}') } catch { return {} } })()
    return [1, 2, 3].map(offset => {
      const target = new Date(now.getFullYear(), now.getMonth() - offset, 1)
      const y = target.getFullYear(), m = target.getMonth()
      const key = `${y}-${String(m + 1).padStart(2, '0')}`
      const achieved = (trades || [])
        .filter(t => { const d = new Date(t.trade_date); return d.getFullYear() === y && d.getMonth() === m })
        .reduce((s, t) => s + (t.pnl || 0), 0)
      const goal = Number(historyGoals[key]) || 0
      const pct = goal > 0 ? Math.round((achieved / goal) * 100) : 0
      return {
        key, goal,
        achieved: Math.round(achieved),
        pct,
        label: target.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      }
    })
  })()

  const sectionCard = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '28px', marginBottom: '16px', backdropFilter: 'var(--card-blur, none)', WebkitBackdropFilter: 'var(--card-blur, none)' }
  const sectionTitle = { fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555', marginBottom: '16px' }
  const divider = { height: '1px', background: '#1a1a1a', margin: '20px 0' }

  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px', color: 'var(--text-hi)' }}>Settings</h1>
      </div>

      {/* ── Journal Theme ── */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Journal Theme</div>
        <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '20px' }} />

        {/* Glass Mode row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#141414', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Layers size={16} color="#888" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-hi)', marginBottom: '2px' }}>Glass Mode</div>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.4 }}>Frosted glass cards with blur effect</div>
            </div>
          </div>
          <div className={`toggle-track ${glassMode ? 'on' : ''}`} onClick={() => setGlassMode(!glassMode)} style={{ flexShrink: 0 }}>
            <div className="toggle-knob" />
          </div>
        </div>

        <div style={divider} />

        {/* Background Color */}
        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-hi)', marginBottom: '4px' }}>Background Color</div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>Choose the aurora vibe of your journal</div>
        <div style={{ display: 'flex', flexWrap: 'nowrap', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {SWATCHES.map(s => {
            const active = theme === s.id
            return (
              <button
                key={s.id}
                onClick={() => setTheme(s.id)}
                className="theme-pill"
                style={{
                  border: active ? `1.5px solid #fff` : '1.5px solid #222',
                  color: active ? '#fff' : '#666',
                  fontWeight: active ? '600' : '400',
                  background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                  boxShadow: active ? `0 0 0 2px ${s.color}33` : 'none',
                  fontSize: '13px',
                  minWidth: '70px',
                  flexShrink: 0,
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Profile ── */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Profile</div>
        <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '20px' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>First Name</div>
            <input value={localFirstName} onChange={e => setLocalFirstName(e.target.value)} style={inp} placeholder="First name" />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Last Name</div>
            <input value={localLastName} onChange={e => setLocalLastName(e.target.value)} style={inp} placeholder="Last name" />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Phone</div>
            <input value={localPhone} onChange={e => setLocalPhone(e.target.value)} style={inp} placeholder="+1 555 000 0000" />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Display Name</div>
            <input value={localName} onChange={e => setLocalName(e.target.value)} style={inp} placeholder="Username or handle" />
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ ...lbl, marginBottom: '7px' }}>Market Focus</div>
          <input value={localMarket} onChange={e => setLocalMarket(e.target.value)} style={inp} placeholder="e.g. Futures · Forex · Crypto" />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={saveProfile}
            style={{ background: saved ? '#1a1a1a' : '#fff', color: saved ? '#aaffa0' : '#000', border: 'none', borderRadius: '99px', padding: '10px 24px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s', minWidth: '130px' }}
          >
            {saved ? '✓ Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* ── Goal Tracker ── */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Goal Tracker</div>
        <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '20px' }} />

        {/* Enable toggle row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#141414', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Target size={16} color="#aaffa0" />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-hi)', marginBottom: '2px' }}>Enable Monthly Goal Tracker</div>
              <div style={{ fontSize: '12px', color: '#666', lineHeight: 1.4 }}>Show monthly income goal progress on your dashboard</div>
            </div>
          </div>
          <div className={`toggle-track ${goalEnabled ? 'on' : ''}`} onClick={toggleGoalEnabled} style={{ flexShrink: 0 }}>
            <div className="toggle-knob" />
          </div>
        </div>

        {goalEnabled && (
          <>
            <div style={divider} />

            {/* Goal input */}
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-hi)', marginBottom: '4px' }}>Monthly Income Goal</div>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>Set your target profit for each month</div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '4px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: '14px', fontWeight: '600', pointerEvents: 'none' }}>$</span>
                <input
                  type="number"
                  value={localGoal}
                  onChange={e => setLocalGoal(e.target.value)}
                  placeholder="5000"
                  style={{ ...inp, paddingLeft: '28px' }}
                />
              </div>
              <button
                onClick={saveGoal}
                style={{ background: goalSaved ? '#1a1a1a' : '#fff', color: goalSaved ? '#aaffa0' : '#000', border: 'none', borderRadius: '99px', padding: '0 22px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', minWidth: '120px', transition: 'all 0.2s' }}
              >
                {goalSaved ? '✓ Saved' : 'Save Goal'}
              </button>
            </div>

            {/* Past 3 months history */}
            {pastMonths.some(m => m.goal > 0 || m.achieved !== 0) && (
              <>
                <div style={divider} />
                <div style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', marginBottom: '12px' }}>Past 3 Months</div>
                {pastMonths.map(m => {
                  const hasGoal = m.goal > 0
                  const dotColor = !hasGoal ? '#444' : m.pct >= 100 ? '#ffd700' : m.pct >= 80 ? '#aaffa0' : m.pct >= 50 ? '#ffd966' : '#ff8080'
                  return (
                    <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #141414' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-hi)' }}>{m.label}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-lo)', marginTop: '3px' }}>
                          {hasGoal
                            ? `$${m.achieved.toLocaleString()} / $${m.goal.toLocaleString()}`
                            : `$${m.achieved.toLocaleString()} · no goal set`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {hasGoal && (
                          <div style={{ fontSize: '13px', fontWeight: '700', color: dotColor }}>{m.pct}%</div>
                        )}
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, boxShadow: hasGoal ? `0 0 8px ${dotColor}66` : 'none' }} />
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Support ── */}
      <div style={sectionCard}>
        <div style={sectionTitle}>Support</div>
        <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '20px' }} />

        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-hi)', marginBottom: '4px' }}>Contact Support</div>
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '14px' }}>Submit a ticket — we'll reply by email.</div>

        <div style={{ marginBottom: '12px' }}>
          <div style={{ ...lbl, marginBottom: '7px' }}>Subject</div>
          <input value={ticketSubj} onChange={e => setTicketSubj(e.target.value)} placeholder="Brief description…" style={inp} />
        </div>
        <div style={{ marginBottom: '14px' }}>
          <div style={{ ...lbl, marginBottom: '7px' }}>Message</div>
          <textarea value={ticketBody} onChange={e => setTicketBody(e.target.value)} placeholder="Tell us what's going on. Include any details or steps to reproduce." style={{ ...inp, minHeight: '110px', resize: 'vertical', lineHeight: 1.6 }} />
        </div>

        {ticketState === 'sent' && (
          <div style={{ background: 'rgba(170,255,160,0.05)', border: '1px solid rgba(170,255,160,0.20)', color: '#aaffa0', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '14px' }}>
            ✓ Ticket submitted — we'll be in touch
          </div>
        )}
        {ticketState && typeof ticketState === 'object' && ticketState.error && (
          <div style={{ background: 'rgba(255,128,128,0.05)', border: '1px solid rgba(255,128,128,0.20)', color: '#ff8080', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '14px' }}>
            {ticketState.error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={submitTicket}
            disabled={ticketState === 'sending' || !ticketSubj.trim() || !ticketBody.trim()}
            style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '99px', padding: '10px 22px', fontSize: '13px', fontWeight: '600', cursor: ticketState === 'sending' ? 'wait' : 'pointer', fontFamily: 'inherit', minWidth: '130px', opacity: (ticketState === 'sending' || !ticketSubj.trim() || !ticketBody.trim()) ? 0.5 : 1 }}
          >
            {ticketState === 'sending' ? 'Sending…' : 'Submit Ticket'}
          </button>
        </div>
      </div>

      {/* ── Account ── */}
      <div style={{ ...sectionCard, marginBottom: 0 }}>
        <div style={sectionTitle}>Account</div>
        <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '20px' }} />

        {/* Email */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ ...lbl, marginBottom: '7px' }}>Email Address</div>
          <input
            value={session?.user?.email || ''}
            readOnly
            style={{ ...inp, color: '#555', cursor: 'default' }}
          />
        </div>

        {/* Log out */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={onLogout}
            style={{ background: 'transparent', border: '1px solid rgba(255,80,80,0.25)', borderRadius: '8px', color: '#cc4444', fontSize: '13px', fontWeight: '500', padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}
          >
            Log Out
          </button>
        </div>

        <div style={{ height: '1px', background: '#141414', marginBottom: '16px' }} />
        <div style={{ fontSize: '11px', color: '#444', letterSpacing: '0.04em' }}>
          LIMITLESS v1.0 · Private Journal
        </div>
      </div>
    </div>
  )
}

// ─── Admin Panel ──────────────────────────────────────────────
const ADMIN_EMAIL = 'eug777fx@gmail.com'

const relativeTime = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 30)        return 'just now'
  if (diff < 60)        return `${diff}s ago`
  if (diff < 3600)      return `${Math.floor(diff / 60)} min${Math.floor(diff / 60) !== 1 ? 's' : ''} ago`
  if (diff < 86400)     return `${Math.floor(diff / 3600)} hour${Math.floor(diff / 3600) !== 1 ? 's' : ''} ago`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) !== 1 ? 's' : ''} ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const makeInviteCode = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let s = ''
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function AdminPanel({ session, setPage }) {
  const [tab,          setTab]          = useState('overview') // 'overview' | 'waitlist' | 'tickets' | 'health'
  const [users,        setUsers]        = useState([])
  const [trades,       setTrades]       = useState([])
  const [invites,      setInvites]      = useState([])
  const [tickets,      setTickets]      = useState([])
  const [announcement, setAnnouncement] = useState({ text: '', active: false })
  const [annDraft,     setAnnDraft]     = useState('')
  const [annSaving,    setAnnSaving]    = useState(false)
  const [annSaved,     setAnnSaved]     = useState(false)
  const [flags,        setFlags]        = useState({ monthlyGoalTracker: true, aiChecklist: true, newsCalendar: true, feedSection: true })
  const [flagsSaving,  setFlagsSaving]  = useState(false)
  const [flagsSaved,   setFlagsSaved]   = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [filter,       setFilter]       = useState('all')
  const [search,       setSearch]       = useState('')
  const [actioning,    setActioning]    = useState(null)
  const [expandedId,   setExpandedId]   = useState(null)
  const [pendingOpen,  setPendingOpen]  = useState(false)
  const [resetMsg,     setResetMsg]     = useState(null) // { id, text }
  const [error,        setError]        = useState('')

  // Multi-select & email modal
  const [selected,    setSelected]    = useState(new Set())
  const [emailOpen,   setEmailOpen]   = useState(false)
  const [emailSubj,   setEmailSubj]   = useState('')
  const [emailBody,   setEmailBody]   = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState(null)

  // Note editing
  const [noteEditId,    setNoteEditId]    = useState(null)
  const [noteDraft,     setNoteDraft]     = useState('')

  // Waitlist sort
  const [waitSort, setWaitSort] = useState('date') // 'date' | 'name'

  // App health
  const [healthCheckedAt, setHealthCheckedAt] = useState(null)
  const [healthOk,        setHealthOk]        = useState(null)

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  useEffect(() => {
    if (!isAdmin) { setPage('dashboard'); return }
    loadData()
    const t = setInterval(loadData, 30_000) // auto-refresh every 30s
    return () => clearInterval(t)
  }, [])

  const loadData = async () => {
    setError('')
    const startedAt = Date.now()
    try {
      const [usersRes, tradesRes, invitesRes, settingsRes, ticketsRes] = await Promise.all([
        supabase.from('admin_users_view').select('*').order('created_at', { ascending: false }),
        supabase.from('trades').select('id, user_id, pnl, trade_date, created_at'),
        supabase.from('invites').select('*').order('created_at', { ascending: false }),
        supabase.from('app_settings').select('*').eq('id', 1).maybeSingle(),
        supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
      ])
      if (usersRes.error)  throw usersRes.error
      if (tradesRes.error) throw tradesRes.error
      setUsers(usersRes.data || [])
      setTrades(tradesRes.data || [])
      if (!invitesRes.error) setInvites(invitesRes.data || [])
      if (!ticketsRes.error) setTickets(ticketsRes.data || [])
      if (!settingsRes.error && settingsRes.data) {
        const ann = { text: settingsRes.data.announcement_text || '', active: !!settingsRes.data.announcement_active }
        setAnnouncement(ann)
        setAnnDraft(prev => prev || ann.text)
        if (settingsRes.data.feature_flags && typeof settingsRes.data.feature_flags === 'object') {
          setFlags(prev => ({ ...prev, ...settingsRes.data.feature_flags }))
        }
      }
      setHealthOk(true)
      setHealthCheckedAt(new Date())
    } catch (e) {
      setHealthOk(false)
      setHealthCheckedAt(new Date())
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
    void startedAt
  }

  const updateStatus = async (id, status) => {
    setActioning(id)
    try {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u))
    } catch (e) {
      setError(e.message)
    } finally {
      setActioning(null)
    }
  }

  const deleteUser = async (id) => {
    if (!confirm('Delete this user from profiles? (auth.users entry remains.)')) return
    setActioning(id)
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id)
      if (error) throw error
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (e) {
      setError(e.message)
    } finally {
      setActioning(null)
    }
  }

  const sendPasswordReset = async (email, id) => {
    if (!email) return
    setActioning(id)
    setResetMsg(null)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://limitless-journal.vercel.app',
      })
      if (error) throw error
      setResetMsg({ id, text: `Reset email sent to ${email}` })
      setTimeout(() => setResetMsg(null), 4000)
    } catch (e) {
      setError(e.message)
    } finally {
      setActioning(null)
    }
  }

  // ── Invites ──
  const generateInvite = async () => {
    const code = makeInviteCode()
    try {
      const { data, error } = await supabase.from('invites').insert({ code, created_by: session.user.id }).select().single()
      if (error) throw error
      setInvites(prev => [data, ...prev])
    } catch (e) { setError(e.message) }
  }
  const deleteInvite = async (code) => {
    try {
      const { error } = await supabase.from('invites').delete().eq('code', code)
      if (error) throw error
      setInvites(prev => prev.filter(i => i.code !== code))
    } catch (e) { setError(e.message) }
  }
  const copyInvite = async (code) => {
    const url = `${window.location.origin}/?invite=${code}`
    try { await navigator.clipboard.writeText(url) } catch {}
  }

  // ── Announcement ──
  const saveAnnouncement = async (active) => {
    setAnnSaving(true)
    try {
      const next = { announcement_text: annDraft.trim(), announcement_active: active }
      const { error } = await supabase.from('app_settings').upsert({ id: 1, ...next }, { onConflict: 'id' })
      if (error) throw error
      setAnnouncement({ text: next.announcement_text, active })
      setAnnSaved(true)
      setTimeout(() => setAnnSaved(false), 2000)
    } catch (e) { setError(e.message) }
    finally { setAnnSaving(false) }
  }

  // ── Feature flags ──
  const saveFlags = async (next) => {
    setFlagsSaving(true)
    try {
      const { error } = await supabase.from('app_settings').upsert({ id: 1, feature_flags: next }, { onConflict: 'id' })
      if (error) throw error
      setFlags(next)
      setFlagsSaved(true)
      setTimeout(() => setFlagsSaved(false), 2000)
    } catch (e) { setError(e.message) }
    finally { setFlagsSaving(false) }
  }
  const toggleFlag = (key) => saveFlags({ ...flags, [key]: !flags[key] })

  // ── User notes ──
  const startEditNote = (u) => { setNoteEditId(u.id); setNoteDraft(u.notes || '') }
  const cancelEditNote = () => { setNoteEditId(null); setNoteDraft('') }
  const saveNote = async (id) => {
    try {
      const { error } = await supabase.from('profiles').update({ notes: noteDraft || null }).eq('id', id)
      if (error) throw error
      setUsers(prev => prev.map(u => u.id === id ? { ...u, notes: noteDraft || null } : u))
      setNoteEditId(null)
      setNoteDraft('')
    } catch (e) { setError(e.message) }
  }

  // ── Multi-select + email ──
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  const selectAll = (ids) => setSelected(new Set(ids))
  const clearSelected = () => setSelected(new Set())

  const sendEmail = async () => {
    if (selected.size === 0 || !emailSubj.trim() || !emailBody.trim()) return
    const recipients = users.filter(u => selected.has(u.id) && u.email).map(u => u.email)
    if (recipients.length === 0) { setError('No selected users have email addresses'); return }
    setEmailSending(true)
    setEmailResult(null)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: recipients, subject: emailSubj.trim(), message: emailBody.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      setEmailResult({ ok: true, text: `Sent ${data.sent}/${data.total}${data.failed?.length ? ` · ${data.failed.length} failed` : ''}` })
      if (data.sent > 0 && (!data.failed || data.failed.length === 0)) {
        setTimeout(() => { setEmailOpen(false); setEmailSubj(''); setEmailBody(''); setEmailResult(null); clearSelected() }, 1500)
      }
    } catch (e) {
      setEmailResult({ ok: false, text: e.message })
    } finally {
      setEmailSending(false)
    }
  }

  // ── Bulk actions ──
  const bulkApprove = async () => {
    const ids = users.filter(u => (u.status || 'pending') === 'pending').map(u => u.id)
    if (ids.length === 0) return
    if (!confirm(`Approve all ${ids.length} pending users?`)) return
    try {
      const { error } = await supabase.from('profiles').update({ status: 'approved' }).in('id', ids)
      if (error) throw error
      setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, status: 'approved' } : u))
    } catch (e) { setError(e.message) }
  }

  // ── Tickets ──
  const updateTicketStatus = async (id, status) => {
    try {
      const { error } = await supabase.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    } catch (e) { setError(e.message) }
  }
  const replyTicket = async (ticket) => {
    const reply = prompt(`Reply to ${ticket.email}:`)
    if (!reply || !reply.trim()) return
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: ticket.email, subject: `Re: ${ticket.subject}`, message: reply.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
      await supabase.from('support_tickets').update({ admin_reply: reply.trim(), status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', ticket.id)
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, admin_reply: reply.trim(), status: 'in_progress' } : t))
    } catch (e) { setError(e.message) }
  }

  // ── CSV export ──
  const exportCSV = () => {
    const tradesByUser = new Map()
    trades.forEach(t => { tradesByUser.set(t.user_id, (tradesByUser.get(t.user_id) || 0) + 1) })
    const csvEsc = (v) => {
      const s = v == null ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const headers = ['name', 'email', 'status', 'signup_date', 'trade_count']
    const rows = users.map(u => {
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || ''
      return [name, u.email || '', u.status || 'pending', u.created_at || '', tradesByUser.get(u.id) || 0]
    })
    const csv = [headers, ...rows].map(r => r.map(csvEsc).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `limitless-users-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Stats ──
  const totalUsers    = users.length
  const pendingUsers  = users.filter(u => u.status === 'pending').length
  const approvedUsers = users.filter(u => u.status === 'approved').length
  const totalTrades   = trades.length
  const totalPnlAll   = trades.reduce((s, t) => s + (Number(t.pnl) || 0), 0)
  const todayKey      = new Date().toISOString().slice(0, 10)
  const tradesToday   = trades.filter(t => (t.trade_date || '').slice(0, 10) === todayKey).length

  // 7-day signup chart
  const signupChart = (() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0)
      const key = d.toISOString().slice(0, 10)
      const count = users.filter(u => (u.created_at || '').slice(0, 10) === key).length
      days.push({ day: d.toLocaleDateString('en-US', { weekday: 'short' }), count })
    }
    return days
  })()

  // Activity feed (signups + trades)
  const userById = new Map(users.map(u => [u.id, u]))
  const activity = [
    ...users.map(u => ({
      type: 'signup',
      ts: u.created_at,
      text: `New signup: ${[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email || 'User'}`,
    })),
    ...trades.map(t => {
      const u = userById.get(t.user_id)
      const name = u ? ([u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email || 'User') : 'Unknown'
      return { type: 'trade', ts: t.created_at || t.trade_date, text: `Trade logged by ${name}` }
    }),
  ]
    .filter(a => a.ts)
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, 10)

  // Filtering
  const term = search.trim().toLowerCase()
  const filtered = users.filter(u => {
    if (filter !== 'all' && (u.status || 'pending') !== filter) return false
    if (term) {
      const hay = `${u.first_name || ''} ${u.last_name || ''} ${u.username || ''} ${u.email || ''}`.toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })

  const formatDate = (d) => {
    if (!d) return '—'
    try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return '—' }
  }

  const initialsOf = (u) => {
    const name = u.first_name || u.username || u.email || 'U'
    return String(name).slice(0, 2).toUpperCase()
  }

  const statusBadge = (status) => {
    const s = status || 'pending'
    const cfg = s === 'approved'
      ? { bg: 'rgba(170,255,160,0.08)', border: 'rgba(170,255,160,0.25)', color: '#aaffa0', label: 'Approved' }
      : s === 'rejected'
        ? { bg: 'rgba(255,128,128,0.08)', border: 'rgba(255,128,128,0.25)', color: '#ff8080', label: 'Rejected' }
        : s === 'banned'
          ? { bg: 'rgba(80,80,80,0.15)', border: 'rgba(180,180,180,0.25)', color: '#bbb', label: 'Banned' }
          : { bg: 'rgba(255,217,102,0.08)', border: 'rgba(255,217,102,0.25)', color: '#ffd966', label: 'Pending' }
    return (
      <span style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        color: cfg.color, fontSize: '11px', fontWeight: '600',
        padding: '3px 10px', borderRadius: '99px', letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
      }}>{cfg.label}</span>
    )
  }

  const statCard = { background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '14px', padding: '18px 20px', backdropFilter: 'var(--card-blur, none)', WebkitBackdropFilter: 'var(--card-blur, none)' }

  if (!isAdmin) return null

  const pendingList = users.filter(u => u.status === 'pending')
  const maxSignupCount = Math.max(1, ...signupChart.map(d => d.count))

  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Shield size={20} color="#aaffa0" />
            <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px', color: 'var(--text-hi)' }}>Admin Panel</h1>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-lo)', letterSpacing: '0.02em' }}>Signed in as {session?.user?.email}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {/* Pending notification badge */}
          <button
            onClick={() => setPendingOpen(o => !o)}
            style={{
              background: 'transparent', border: '1px solid var(--card-border)',
              borderRadius: '8px', color: 'var(--text-md)', fontSize: '12px',
              padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px', position: 'relative',
            }}
          >
            <Bell size={14} />
            {pendingUsers > 0 && (
              <span style={{
                position: 'absolute', top: '-4px', right: '-4px',
                background: '#ffd966', color: '#000',
                fontSize: '10px', fontWeight: '700',
                minWidth: '18px', height: '18px', padding: '0 5px',
                borderRadius: '99px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{pendingUsers}</span>
            )}
          </button>
          {/* Quick approve dropdown */}
          {pendingOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 6px)', right: 0,
              width: '280px', maxHeight: '340px', overflowY: 'auto',
              background: '#0d0d0d', border: '1px solid #1f1f1f',
              borderRadius: '12px', padding: '8px', zIndex: 50,
              boxShadow: '0 12px 36px rgba(0,0,0,0.6)',
            }}>
              <div style={{ fontSize: '10px', fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', padding: '8px 10px 6px' }}>
                Pending Approvals
              </div>
              {pendingList.length === 0 ? (
                <div style={{ padding: '14px 10px', fontSize: '12px', color: '#666' }}>No pending users</div>
              ) : pendingList.map(u => {
                const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || u.email
                const busy = actioning === u.id
                return (
                  <div key={u.id} style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderRadius: '6px' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#ddd', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '1px' }}>{relativeTime(u.created_at)}</div>
                    </div>
                    <button
                      onClick={() => updateStatus(u.id, 'approved')}
                      disabled={busy}
                      style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontWeight: '700', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}
                    >Approve</button>
                  </div>
                )
              })}
            </div>
          )}
          <button
            onClick={loadData}
            style={{ background: 'transparent', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--text-md)', fontSize: '12px', padding: '7px 12px', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,128,128,0.05)', border: '1px solid rgba(255,128,128,0.15)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#ff8080', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Tab strip */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--divider)', overflowX: 'auto' }}>
        {[
          { id: 'overview', label: 'Overview',  icon: BarChart2 },
          { id: 'waitlist', label: 'Waitlist',  icon: Users, badge: pendingUsers || 0 },
          { id: 'tickets',  label: 'Tickets',   icon: MessageSquare, badge: tickets.filter(t => t.status === 'open').length },
          { id: 'health',   label: 'Health',    icon: Activity },
        ].map(t => {
          const active = tab === t.id
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                background: 'transparent', border: 'none', borderBottom: active ? '2px solid #aaffa0' : '2px solid transparent',
                color: active ? 'var(--text-hi)' : 'var(--text-md)',
                fontSize: '13px', fontWeight: active ? '700' : '500',
                padding: '10px 14px', cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
                marginBottom: '-1px',
              }}
            >
              <Icon size={14} />
              {t.label}
              {t.badge > 0 && (
                <span style={{ background: '#ffd966', color: '#000', fontSize: '10px', fontWeight: '700', minWidth: '18px', height: '16px', padding: '0 5px', borderRadius: '99px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{t.badge}</span>
              )}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <>

      {/* Stats */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginBottom: '16px' }}>
        {[
          { label: 'Total Users',      val: loading ? '—' : totalUsers.toLocaleString(),                                   color: '#fff'    },
          { label: 'Pending Approval', val: loading ? '—' : pendingUsers.toLocaleString(),                                 color: '#ffd966' },
          { label: 'Approved Users',   val: loading ? '—' : approvedUsers.toLocaleString(),                                color: '#aaffa0' },
          { label: 'Total Trades',     val: loading ? '—' : totalTrades.toLocaleString(),                                  color: '#fff'    },
          { label: 'Trades Today',     val: loading ? '—' : tradesToday.toLocaleString(),                                  color: '#fff'    },
          { label: 'Total P&L',        val: loading ? '—' : `${totalPnlAll >= 0 ? '+' : '−'}$${Math.abs(Math.round(totalPnlAll)).toLocaleString()}`, color: totalPnlAll >= 0 ? '#aaffa0' : '#ff8080' },
        ].map(s => (
          <div key={s.label} style={statCard}>
            <div style={{ ...lbl, marginBottom: '10px', color: '#999' }}>{s.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '800', letterSpacing: '-0.5px', color: s.color, lineHeight: 1 }}>
              {s.val}
            </div>
          </div>
        ))}
      </div>

      {/* Charts + Activity feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12px', marginBottom: '16px' }} className="chart-grid">
        {/* Signups bar chart */}
        <div style={statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ ...lbl, color: '#999' }}>Signups · Last 7 Days</div>
            <div style={{ fontSize: '11px', color: '#666' }}>{signupChart.reduce((s, d) => s + d.count, 0)} total</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px', height: '140px' }}>
            {signupChart.map((d, i) => {
              const h = Math.round((d.count / maxSignupCount) * 100)
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{
                      width: '100%',
                      height: `${h}%`,
                      minHeight: d.count > 0 ? '4px' : '2px',
                      background: d.count > 0 ? 'linear-gradient(180deg, #aaffa0 0%, #00cc66 100%)' : '#1a1a1a',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.5s ease',
                    }} />
                  </div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{d.day}</div>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: d.count > 0 ? '#aaffa0' : '#444' }}>{d.count}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Activity Feed */}
        <div style={statCard}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ ...lbl, color: '#999' }}>Recent Activity</div>
            <div style={{ fontSize: '10px', color: '#666' }}>auto-refresh</div>
          </div>
          {activity.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-lo)', padding: '12px 0' }}>No activity yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activity.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0, marginTop: '6px',
                    background: a.type === 'signup' ? '#ffd966' : '#aaffa0',
                    boxShadow: `0 0 6px ${a.type === 'signup' ? 'rgba(255,217,102,0.5)' : 'rgba(170,255,160,0.5)'}`,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-hi)', lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.text}</div>
                    <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{relativeTime(a.ts)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Announcement banner editor */}
      <div style={{ ...statCard, marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Megaphone size={16} color={announcement.active ? '#aaffa0' : '#666'} />
          <div style={{ ...lbl, color: '#999' }}>Announcement Banner</div>
          {announcement.active && (
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#aaffa0', letterSpacing: '0.06em', background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', borderRadius: '99px', padding: '2px 8px' }}>LIVE</span>
          )}
        </div>
        <input
          value={annDraft}
          onChange={e => setAnnDraft(e.target.value)}
          placeholder="🔥 New feature: CSV import now available!"
          style={{ ...inp, marginBottom: '10px' }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => saveAnnouncement(true)}
            disabled={annSaving || !annDraft.trim()}
            style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '99px', padding: '8px 18px', fontSize: '12px', fontWeight: '600', cursor: annSaving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: annSaving || !annDraft.trim() ? 0.5 : 1 }}
          >Save & Show</button>
          <button
            onClick={() => saveAnnouncement(false)}
            disabled={annSaving}
            style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-md)', borderRadius: '99px', padding: '8px 16px', fontSize: '12px', fontWeight: '500', cursor: annSaving ? 'wait' : 'pointer', fontFamily: 'inherit' }}
          >Hide Banner</button>
          {annSaved && <span style={{ fontSize: '12px', color: '#aaffa0' }}>✓ Saved</span>}
        </div>
      </div>

      {/* Invite Links */}
      <div style={{ ...statCard, marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Link2 size={16} color="#aaffa0" />
            <div style={{ ...lbl, color: '#999' }}>Invite Links</div>
            <span style={{ fontSize: '10px', color: '#666' }}>auto-approve on signup</span>
          </div>
          <button
            onClick={generateInvite}
            style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={13} /> Generate Invite Link
          </button>
        </div>
        {invites.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>No invite links yet — click Generate to create one.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {invites.slice(0, 8).map(inv => {
              const used = !!inv.used_at
              const usedByUser = inv.used_by ? userById.get(inv.used_by) : null
              return (
                <div key={inv.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#080808', border: '1px solid #1a1a1a', borderRadius: '8px' }}>
                  <code style={{ fontSize: '12px', fontWeight: '700', color: used ? '#666' : '#aaffa0', fontFamily: 'monospace', letterSpacing: '0.05em', flexShrink: 0 }}>{inv.code}</code>
                  <div style={{ flex: 1, minWidth: 0, fontSize: '11px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {used ? `used by ${usedByUser ? (usedByUser.email || usedByUser.username) : 'unknown'} · ${relativeTime(inv.used_at)}` : `created ${relativeTime(inv.created_at)}`}
                  </div>
                  {!used && (
                    <button
                      onClick={() => copyInvite(inv.code)}
                      style={{ background: 'transparent', border: '1px solid #2a2a2a', color: 'var(--text-md)', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', minHeight: 'auto' }}
                    >Copy</button>
                  )}
                  <button
                    onClick={() => deleteInvite(inv.code)}
                    style={{ background: 'transparent', border: 'none', color: '#555', padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', minHeight: 'auto' }}
                  ><X size={12} /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Filters + Search + Export */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all',      label: 'All',      n: users.length    },
            { id: 'pending',  label: 'Pending',  n: pendingUsers    },
            { id: 'approved', label: 'Approved', n: approvedUsers   },
            { id: 'rejected', label: 'Rejected', n: users.filter(u => u.status === 'rejected').length },
            { id: 'banned',   label: 'Banned',   n: users.filter(u => u.status === 'banned').length   },
          ].map(f => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  background: active ? 'var(--text-hi)' : 'transparent',
                  border: `1px solid ${active ? 'var(--text-hi)' : 'var(--card-border)'}`,
                  color: active ? 'var(--bg)' : 'var(--text-md)',
                  fontSize: '12px', fontWeight: active ? '700' : '500',
                  padding: '6px 14px', borderRadius: '99px',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {f.label}
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{f.n}</span>
              </button>
            )
          })}
        </div>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={13} color="#555" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ ...inp, paddingLeft: '32px', paddingRight: search ? '32px' : '12px' }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: '#666', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', minHeight: 'auto' }}
            >
              <X size={12} />
            </button>
          )}
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => { setEmailOpen(true); setEmailResult(null) }}
            style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '99px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Mail size={13} /> Email {selected.size} {selected.size === 1 ? 'User' : 'Users'}
          </button>
        )}
        <button
          onClick={exportCSV}
          style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-md)', borderRadius: '99px', padding: '7px 14px', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Users table */}
      <div style={{ ...statCard, padding: '0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-lo)', fontSize: '13px' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <Users size={28} color="#333" />
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-hi)' }}>No users found</div>
            <div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>{search ? 'Try a different search term' : 'No users match this filter'}</div>
          </div>
        ) : (
          <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr>
                  <th style={{ padding: '14px 8px 14px 16px', borderBottom: '1px solid var(--divider)', width: '24px' }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every(u => selected.has(u.id))}
                      onChange={e => e.target.checked ? selectAll(filtered.map(u => u.id)) : clearSelected()}
                      style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: '#aaffa0' }}
                    />
                  </th>
                  {['', 'User', 'Email', 'Signed Up', 'Status', 'Actions'].map((h, i) => (
                    <th key={i} style={{
                      textAlign: 'left', fontSize: '10px', fontWeight: '600',
                      letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666',
                      padding: '14px 16px', borderBottom: '1px solid var(--divider)',
                      width: i === 0 ? '24px' : undefined,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '—'
                  const busy = actioning === u.id
                  const isExpanded = expandedId === u.id
                  // Per-user stats
                  const userTrades = trades.filter(t => t.user_id === u.id)
                  const tradeCount = userTrades.length
                  const wins  = userTrades.filter(t => (Number(t.pnl) || 0) > 0).length
                  const winRate = tradeCount > 0 ? Math.round((wins / tradeCount) * 100) : 0
                  const userPnl = userTrades.reduce((s, t) => s + (Number(t.pnl) || 0), 0)
                  const lastTradeDate = userTrades.reduce((acc, t) => {
                    const d = t.trade_date || t.created_at
                    return !acc || (d && new Date(d) > new Date(acc)) ? d : acc
                  }, null)
                  return (
                    <Fragment key={u.id}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : u.id)}
                        className="trade-row"
                        style={{ borderBottom: '1px solid var(--divider)', cursor: 'pointer' }}
                      >
                        <td style={{ padding: '12px 8px 12px 16px' }} onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selected.has(u.id)}
                            onChange={() => toggleSelect(u.id)}
                            style={{ cursor: 'pointer', width: '14px', height: '14px', accentColor: '#aaffa0' }}
                          />
                        </td>
                        <td style={{ padding: '12px 8px 12px 16px' }}>
                          <ChevronDown size={14} color="#555" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#141414', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#aaa', flexShrink: 0 }}>{initialsOf(u)}</div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName}</div>
                              {u.username && fullName !== u.username && (
                                <div style={{ fontSize: '11px', color: 'var(--text-lo)', marginTop: '1px' }}>@{u.username}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-md)', whiteSpace: 'nowrap' }}>{u.email || '—'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-lo)', whiteSpace: 'nowrap' }}>{formatDate(u.created_at)}</td>
                        <td style={{ padding: '12px 16px' }}>{statusBadge(u.status)}</td>
                        <td style={{ padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {u.status !== 'approved' && (
                              <button onClick={() => updateStatus(u.id, 'approved')} disabled={busy} style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '6px', padding: '5px 11px', fontSize: '11px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}>Approve</button>
                            )}
                            {u.status !== 'rejected' && u.status !== 'banned' && (
                              <button onClick={() => updateStatus(u.id, 'rejected')} disabled={busy} style={{ background: 'rgba(255,128,128,0.06)', border: '1px solid rgba(255,128,128,0.25)', color: '#ff8080', borderRadius: '6px', padding: '5px 11px', fontSize: '11px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}>Reject</button>
                            )}
                            {u.status === 'banned' ? (
                              <button onClick={() => updateStatus(u.id, 'approved')} disabled={busy} style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '6px', padding: '5px 11px', fontSize: '11px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}>Unban</button>
                            ) : (
                              <button onClick={() => { if (confirm('Ban this user? They will be locked out until unbanned.')) updateStatus(u.id, 'banned') }} disabled={busy} style={{ background: 'rgba(80,80,80,0.15)', border: '1px solid rgba(180,180,180,0.20)', color: '#bbb', borderRadius: '6px', padding: '5px 11px', fontSize: '11px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}><Ban size={11} /> Ban</button>
                            )}
                            <button onClick={() => deleteUser(u.id)} disabled={busy} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#666', borderRadius: '6px', padding: '5px 11px', fontSize: '11px', fontWeight: '500', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}>Delete</button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr style={{ background: 'rgba(255,255,255,0.015)' }}>
                          <td colSpan={7} style={{ padding: '20px 24px', borderBottom: '1px solid var(--divider)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                              {[
                                { l: 'Trades',     v: tradeCount },
                                { l: 'Win Rate',   v: tradeCount > 0 ? `${winRate}%` : '—' },
                                { l: 'Total P&L',  v: tradeCount > 0 ? `${userPnl >= 0 ? '+' : '−'}$${Math.abs(Math.round(userPnl)).toLocaleString()}` : '—', c: userPnl >= 0 ? '#aaffa0' : '#ff8080' },
                                { l: 'Last Trade', v: lastTradeDate ? formatDate(lastTradeDate) : 'Never' },
                              ].map(s => (
                                <div key={s.l} style={{ background: '#080808', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '12px 14px' }}>
                                  <div style={{ fontSize: '10px', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px' }}>{s.l}</div>
                                  <div style={{ fontSize: '15px', fontWeight: '700', color: s.c || 'var(--text-hi)' }}>{s.v}</div>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '14px', fontSize: '12px' }}>
                              <div><span style={{ color: '#666' }}>Phone: </span><span style={{ color: 'var(--text-md)' }}>{u.phone || '—'}</span></div>
                              <div><span style={{ color: '#666' }}>Market focus: </span><span style={{ color: 'var(--text-md)' }}>{u.market_focus || '—'}</span></div>
                              <div><span style={{ color: '#666' }}>Monthly goal: </span><span style={{ color: 'var(--text-md)' }}>{u.monthly_goal ? `$${Number(u.monthly_goal).toLocaleString()}` : '—'}</span></div>
                              <div><span style={{ color: '#666' }}>User ID: </span><span style={{ color: 'var(--text-lo)', fontFamily: 'monospace', fontSize: '11px' }}>{u.id}</span></div>
                            </div>

                            {/* Notes */}
                            <div style={{ marginBottom: '14px' }}>
                              <div style={{ ...lbl, marginBottom: '7px' }}>Private Notes</div>
                              {noteEditId === u.id ? (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                                  <textarea
                                    value={noteDraft}
                                    onChange={e => setNoteDraft(e.target.value)}
                                    placeholder="Carlos — futures trader, referred by Maria…"
                                    style={{ ...inp, flex: 1, minHeight: '60px', resize: 'vertical', fontSize: '12px' }}
                                  />
                                  <button onClick={() => saveNote(u.id)} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', minHeight: 'auto' }}>Save</button>
                                  <button onClick={cancelEditNote} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#666', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', minHeight: 'auto' }}>Cancel</button>
                                </div>
                              ) : (
                                <button onClick={() => startEditNote(u)} style={{ background: 'transparent', border: '1px dashed #1f1f1f', borderRadius: '6px', padding: '8px 12px', fontSize: '12px', color: u.notes ? 'var(--text-md)' : '#555', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%', minHeight: 'auto', whiteSpace: 'pre-wrap' }}>
                                  {u.notes ? `📝 ${u.notes}` : '+ Add private note about this user'}
                                </button>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => sendPasswordReset(u.email, u.id)}
                                disabled={busy}
                                style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-md)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}
                              >Send Password Reset</button>
                              {['approved', 'pending', 'rejected'].filter(s => s !== (u.status || 'pending')).map(s => (
                                <button
                                  key={s}
                                  onClick={() => updateStatus(u.id, s)}
                                  disabled={busy}
                                  style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-md)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', textTransform: 'capitalize' }}
                                >Set {s}</button>
                              ))}
                              {resetMsg?.id === u.id && (
                                <span style={{ fontSize: '12px', color: '#aaffa0', alignSelf: 'center' }}>{resetMsg.text}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature flags */}
      <div style={{ ...statCard, marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Flag size={16} color="#aaffa0" />
          <div style={{ ...lbl, color: '#999' }}>Feature Flags</div>
          <span style={{ fontSize: '10px', color: '#666' }}>applied to all users</span>
          {flagsSaved && <span style={{ fontSize: '11px', color: '#aaffa0', marginLeft: 'auto' }}>✓ Saved</span>}
        </div>
        {[
          { key: 'monthlyGoalTracker', label: 'Monthly Goal Tracker',   desc: 'Dashboard widget for income goal progress' },
          { key: 'aiChecklist',        label: 'AI Checklist Generation', desc: 'Generate Checklist from Rules button' },
          { key: 'newsCalendar',       label: 'News Calendar',           desc: 'Economic events page + sidebar entry' },
          { key: 'feedSection',        label: 'Recent Trades Feed',      desc: 'Recent trades section on Dashboard' },
        ].map(f => {
          const on = !!flags[f.key]
          return (
            <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid #141414' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-hi)' }}>{f.label}</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{f.desc}</div>
              </div>
              <div className={`toggle-track ${on ? 'on' : ''}`} onClick={() => !flagsSaving && toggleFlag(f.key)} style={{ flexShrink: 0, opacity: flagsSaving ? 0.5 : 1 }}>
                <div className="toggle-knob" />
              </div>
            </div>
          )
        })}
      </div>

      </>}

      {/* ── Waitlist tab ── */}
      {tab === 'waitlist' && (() => {
        const pendingAll = users.filter(u => (u.status || 'pending') === 'pending')
        const sorted = [...pendingAll].sort((a, b) => {
          if (waitSort === 'name') {
            const an = (a.first_name || a.username || a.email || '').toLowerCase()
            const bn = (b.first_name || b.username || b.email || '').toLowerCase()
            return an.localeCompare(bn)
          }
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
        })
        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-hi)' }}>{pendingAll.length} awaiting approval</div>
                <select
                  value={waitSort}
                  onChange={e => setWaitSort(e.target.value)}
                  style={{ ...inp, width: 'auto', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
                >
                  <option value="date">Sort: Signup date</option>
                  <option value="name">Sort: Name</option>
                </select>
              </div>
              <button
                onClick={bulkApprove}
                disabled={pendingAll.length === 0}
                style={{ background: pendingAll.length === 0 ? 'transparent' : 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: pendingAll.length === 0 ? '#444' : '#aaffa0', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontWeight: '600', cursor: pendingAll.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Check size={13} /> Approve All Pending
              </button>
            </div>

            <div style={{ ...statCard, padding: '0', overflow: 'hidden' }}>
              {sorted.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                  <Check size={28} color="#aaffa0" />
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-hi)' }}>No pending users</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>The waitlist is clear</div>
                </div>
              ) : sorted.map(u => {
                const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '—'
                const busy = actioning === u.id
                const isEditingNote = noteEditId === u.id
                return (
                  <div key={u.id} style={{ padding: '14px 18px', borderBottom: '1px solid var(--divider)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#141414', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: '#aaa', flexShrink: 0 }}>{initialsOf(u)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-hi)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fullName}</div>
                        <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>{u.email || '—'} · signed up {relativeTime(u.created_at)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => updateStatus(u.id, 'approved')} disabled={busy} style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}>Approve</button>
                        <button onClick={() => updateStatus(u.id, 'rejected')} disabled={busy} style={{ background: 'rgba(255,128,128,0.06)', border: '1px solid rgba(255,128,128,0.25)', color: '#ff8080', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: '600', cursor: busy ? 'wait' : 'pointer', fontFamily: 'inherit', minHeight: 'auto', opacity: busy ? 0.6 : 1 }}>Reject</button>
                      </div>
                    </div>

                    {/* Notes */}
                    <div style={{ marginTop: '10px', paddingLeft: '46px' }}>
                      {isEditingNote ? (
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                          <textarea
                            value={noteDraft}
                            onChange={e => setNoteDraft(e.target.value)}
                            placeholder="Private notes (futures trader, referred by Maria, …)"
                            style={{ ...inp, flex: 1, minHeight: '60px', resize: 'vertical', fontSize: '12px' }}
                          />
                          <button onClick={() => saveNote(u.id)} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', minHeight: 'auto' }}>Save</button>
                          <button onClick={cancelEditNote} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#666', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', minHeight: 'auto' }}>Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => startEditNote(u)} style={{ background: 'transparent', border: '1px dashed #1f1f1f', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', color: u.notes ? 'var(--text-md)' : '#555', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%', minHeight: 'auto', whiteSpace: 'pre-wrap' }}>
                          {u.notes ? `📝 ${u.notes}` : '+ Add private note'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )
      })()}

      {/* ── Tickets tab ── */}
      {tab === 'tickets' && (
        <div style={{ ...statCard, padding: '0', overflow: 'hidden' }}>
          {tickets.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <MessageSquare size={28} color="#333" />
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-hi)' }}>No support tickets</div>
              <div style={{ fontSize: '12px', color: 'var(--text-lo)' }}>Submitted tickets from users will show up here</div>
            </div>
          ) : tickets.map(t => {
            const statusCfg = t.status === 'resolved' ? { c: '#aaffa0', label: 'Resolved' }
              : t.status === 'in_progress' ? { c: '#ffd966', label: 'In Progress' }
              : { c: '#ff8080', label: 'Open' }
            return (
              <div key={t.id} style={{ padding: '16px 18px', borderBottom: '1px solid var(--divider)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-hi)', marginBottom: '2px' }}>{t.subject}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>{t.email} · {relativeTime(t.created_at)}</div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: statusCfg.c, background: 'rgba(255,255,255,0.03)', border: `1px solid ${statusCfg.c}33`, borderRadius: '99px', padding: '3px 10px', whiteSpace: 'nowrap' }}>{statusCfg.label}</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-md)', lineHeight: 1.5, marginBottom: '10px', whiteSpace: 'pre-wrap' }}>{t.message}</div>
                {t.admin_reply && (
                  <div style={{ background: 'rgba(170,255,160,0.04)', border: '1px solid rgba(170,255,160,0.15)', borderRadius: '8px', padding: '10px 12px', marginBottom: '10px', fontSize: '12px', color: 'var(--text-md)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: '#aaffa0', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' }}>Your reply</div>
                    {t.admin_reply}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button onClick={() => replyTicket(t)} style={{ background: 'rgba(170,255,160,0.08)', border: '1px solid rgba(170,255,160,0.25)', color: '#aaffa0', borderRadius: '6px', padding: '5px 11px', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit', minHeight: 'auto', display: 'flex', alignItems: 'center', gap: '5px' }}><Mail size={11} /> Reply</button>
                  {['open', 'in_progress', 'resolved'].filter(s => s !== t.status).map(s => (
                    <button key={s} onClick={() => updateTicketStatus(t.id, s)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: 'var(--text-md)', borderRadius: '6px', padding: '5px 11px', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', minHeight: 'auto', textTransform: 'capitalize' }}>Mark {s.replace('_', ' ')}</button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Health tab ── */}
      {tab === 'health' && (() => {
        const dbSizeApprox = users.length + trades.length + invites.length + tickets.length
        const lastSignup = users[0]?.created_at
        const today = new Date(); today.setHours(0,0,0,0)
        const tradesTodayCount = trades.filter(t => new Date(t.created_at || t.trade_date || 0) >= today).length
        const ticketsOpen = tickets.filter(t => t.status === 'open').length
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <div style={statCard}>
              <div style={{ ...lbl, color: '#999', marginBottom: '14px' }}>Connection</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: healthOk ? '#aaffa0' : '#ff8080', boxShadow: `0 0 8px ${healthOk ? 'rgba(170,255,160,0.6)' : 'rgba(255,128,128,0.6)'}` }} />
                <div style={{ fontSize: '14px', fontWeight: '700', color: healthOk ? '#aaffa0' : '#ff8080' }}>
                  {healthOk === null ? 'Checking…' : healthOk ? 'Supabase Connected' : 'Connection error'}
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>Last checked {healthCheckedAt ? relativeTime(healthCheckedAt) : '—'}</div>
            </div>
            <div style={statCard}>
              <div style={{ ...lbl, color: '#999', marginBottom: '14px' }}>Records</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-hi)', marginBottom: '4px' }}>{dbSizeApprox.toLocaleString()}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{users.length} users · {trades.length} trades · {invites.length} invites · {tickets.length} tickets</div>
            </div>
            <div style={statCard}>
              <div style={{ ...lbl, color: '#999', marginBottom: '14px' }}>Trades Today</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-hi)', marginBottom: '4px' }}>{tradesTodayCount}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Logged since midnight</div>
            </div>
            <div style={statCard}>
              <div style={{ ...lbl, color: '#999', marginBottom: '14px' }}>Open Tickets</div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: ticketsOpen > 0 ? '#ff8080' : 'var(--text-hi)', marginBottom: '4px' }}>{ticketsOpen}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>Last signup {lastSignup ? relativeTime(lastSignup) : '—'}</div>
            </div>
            <div style={{ ...statCard, gridColumn: '1 / -1' }}>
              <div style={{ ...lbl, color: '#999', marginBottom: '8px' }}>Notes</div>
              <div style={{ fontSize: '12px', color: 'var(--text-lo)', lineHeight: 1.6 }}>
                Database size, backup history and request rate metrics are not exposed by the Supabase client SDK — view them in the Supabase Dashboard → Project Settings → Usage.
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Email compose modal ── */}
      {emailOpen && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => !emailSending && setEmailOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '560px', background: '#0d0d0d', border: '1px solid #1f1f1f', borderRadius: '16px', padding: '28px', boxShadow: '0 32px 100px rgba(0,0,0,0.9)', animation: 'modalIn 0.2s ease both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '17px', fontWeight: '800', letterSpacing: '-0.3px', color: '#fff' }}>Email {selected.size} {selected.size === 1 ? 'User' : 'Users'}</div>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Sent via Resend from your verified domain</div>
              </div>
              <button onClick={() => !emailSending && setEmailOpen(false)} style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '4px', minHeight: 'auto' }}>✕</button>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ ...lbl, marginBottom: '7px' }}>Subject</div>
              <input value={emailSubj} onChange={e => setEmailSubj(e.target.value)} placeholder="Important update from LIMITLESS…" style={inp} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ ...lbl, marginBottom: '7px' }}>Message</div>
              <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Write your message — line breaks are preserved." style={{ ...inp, minHeight: '160px', resize: 'vertical', lineHeight: 1.6 }} />
            </div>
            {emailResult && (
              <div style={{ background: emailResult.ok ? 'rgba(170,255,160,0.06)' : 'rgba(255,128,128,0.06)', border: `1px solid ${emailResult.ok ? 'rgba(170,255,160,0.25)' : 'rgba(255,128,128,0.25)'}`, color: emailResult.ok ? '#aaffa0' : '#ff8080', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', marginBottom: '14px' }}>
                {emailResult.text}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setEmailOpen(false)} disabled={emailSending} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: 'var(--text-md)', borderRadius: '99px', padding: '9px 18px', fontSize: '12px', cursor: emailSending ? 'wait' : 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={sendEmail} disabled={emailSending || !emailSubj.trim() || !emailBody.trim()} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '99px', padding: '9px 22px', fontSize: '12px', fontWeight: '700', cursor: emailSending ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px', opacity: (emailSending || !emailSubj.trim() || !emailBody.trim()) ? 0.5 : 1 }}>
                {emailSending ? <><Loader2 size={12} className="spin" /> Sending…</> : <><Mail size={12} /> Send</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

// ─── App Shell ────────────────────────────────────────────────
export default function App() {
  const [session,        setSession]        = useState(null)
  const [authLoading,    setAuthLoading]    = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [announcement, setAnnouncement] = useState(null) // { text, active }
  const [featureFlags, setFeatureFlags] = useState({ monthlyGoalTracker: true, aiChecklist: true, newsCalendar: true, feedSection: true })
  const [profileLoading, setProfileLoading] = useState(false)
  const [tradesLoading,  setTradesLoading]  = useState(true)
  const [profile,        setProfile]        = useState(null)
  const [trades,         setTrades]         = useState([])
  const [page,           setPage]           = useState('dashboard')
  const [showAddTrade,   setShowAddTrade]   = useState(false)
  const [theme,          setTheme]          = useState('white')
  const [colorMode,      setColorMode]      = useState('dark')
  const [glassMode,      setGlassMode]      = useState(() => localStorage.getItem('glass_mode') === 'true')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // ── Auth init ──
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
      if (session) {
        loadProfile(session)
        loadTrades(session)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
        setSession(session)
        setAuthLoading(false)
        return
      }
      setSession(session)
      if (!session) {
        setProfile(null)
        setTrades([])
        setPage('dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Admin access (URL /admin + Ctrl+Shift+A shortcut) ──
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
      setPage('admin')
    }
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault()
        setPage('admin')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── App-wide announcement banner ──
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const { data, error } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle()
        if (cancelled || error || !data) return
        setAnnouncement({ text: data.announcement_text || '', active: !!data.announcement_active })
        if (data.feature_flags && typeof data.feature_flags === 'object') {
          setFeatureFlags(prev => ({ ...prev, ...data.feature_flags }))
        }
      } catch {}
    }
    load()
    const t = setInterval(load, 60_000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  const loadProfile = async (sess) => {
    setProfileLoading(true)
    // Apply any pending invite stored from email-confirm signup
    let pendingInvite = null
    try { pendingInvite = localStorage.getItem('pending_invite') } catch {}

    let { data } = await supabase.from('profiles').select('*').eq('id', sess.user.id).single()
    if (!data) {
      const { data: created } = await supabase.from('profiles').upsert({ id: sess.user.id }, { onConflict: 'id' }).select().single()
      data = created || { id: sess.user.id, username: '', market_focus: '', theme: 'white' }
    }

    if (pendingInvite && data && data.status !== 'approved') {
      try {
        const { data: inv } = await supabase.from('invites').select('code,used_at').eq('code', pendingInvite).maybeSingle()
        if (inv && !inv.used_at) {
          await supabase.from('profiles').update({ status: 'approved' }).eq('id', sess.user.id)
          await supabase.from('invites').update({ used_at: new Date().toISOString(), used_by: sess.user.id }).eq('code', pendingInvite).is('used_at', null)
          data = { ...data, status: 'approved' }
        }
      } catch {}
      try { localStorage.removeItem('pending_invite') } catch {}
    }

    setProfile(data)
    if (data.theme)      setTheme(data.theme)
    if (data.color_mode) setColorMode(data.color_mode)
    setProfileLoading(false)
  }

  const loadTrades = async (sess) => {
    setTradesLoading(true)
    const { data } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', sess.user.id)
      .order('trade_date', { ascending: false })
    setTrades(data || [])
    setTradesLoading(false)
  }

  const handleSetTheme = async (t) => {
    setTheme(t)
    if (session) {
      await supabase.from('profiles').update({ theme: t }).eq('id', session.user.id)
    }
  }


  const handleAuth = (sess) => {
    setSession(sess)
    loadProfile(sess)
    loadTrades(sess)
  }

  const logout = async () => {
    await supabase.auth.signOut()
  }

  const goAddTrade = () => setShowAddTrade(true)

  const nav = [
    { id: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard'    },
    { id: 'trades',    Icon: BookOpen,        label: 'Trade Log'    },
    { id: 'plan',      Icon: ClipboardList,   label: 'Trading Plan' },
    ...(featureFlags.newsCalendar ? [{ id: 'news', Icon: CalendarDays, label: 'News' }] : []),
    { id: 'settings',  Icon: Settings2,       label: 'Settings'     },
  ]

  // Sidebar user card values
  const displayName  = profile?.username      || session?.user?.email?.split('@')[0] || 'User'
  const marketFocus  = profile?.market_focus  || 'Trader'
  const initials     = displayName.slice(0, 2).toUpperCase()

  // ── Loading ──
  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: '#080808', color: '#333', fontFamily: 'Inter, sans-serif', fontSize: '12px', letterSpacing: '0.1em' }}>
        <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />
      </div>
    )
  }

  // ── Password recovery gate (takes priority — comes from email link) ──
  if (passwordRecovery) {
    return <SetNewPasswordPage onDone={() => {
      setPasswordRecovery(false)
      // Strip recovery hash from URL and navigate to dashboard
      try { window.history.replaceState(null, '', window.location.pathname) } catch {}
      if (session) loadProfile(session)
      setPage('dashboard')
    }} />
  }

  // ── Auth gate ──
  if (!session) {
    return <AuthPage onAuth={handleAuth} />
  }

  // ── Profile loading ──
  if (profileLoading || !profile) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100vw', height: '100vh', background: '#080808', color: '#333', fontFamily: 'Inter, sans-serif', fontSize: '12px', letterSpacing: '0.1em' }}>
        <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />
      </div>
    )
  }

  // ── Banned gate (admin can still access via email match) ──
  if (profile.status === 'banned' && session?.user?.email !== ADMIN_EMAIL) {
    return <BannedScreen onLogout={logout} />
  }

  // ── Approval gate ──
  if (profile.status !== 'approved') {
    return <PendingScreen onLogout={logout} />
  }

  // ── Main app ──
  return (
    <div
      data-mode={colorMode}
      data-glass={glassMode ? 'true' : 'false'}
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        maxWidth: '100vw',
        margin: 0,
        padding: 0,
        background: 'var(--bg)',
        color: 'var(--text-hi)',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: 'hidden',
        overflowX: 'hidden',
        position: 'relative',
      }}>
      <style dangerouslySetInnerHTML={{ __html: ANIM_CSS }} />

      <AuroraBackground theme={theme} />

      {/* ── Sidebar ── */}
      <aside className="app-sidebar" style={{
        width: '230px',
        minWidth: '230px',
        flexShrink: 0,
        background: 'var(--sidebar-bg)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid var(--sidebar-border)',
        padding: '28px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
        position: 'relative',
        zIndex: 2,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
          <img src="/logo2.png" alt="logo" style={{ height: '28px', display: 'block' }} />
          <div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '0.15em', color: '#fff', lineHeight: 1 }}>
            LIMITLESS
          </div>
          <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: '600' }}>
            Private Journal
          </div>
        </div>

        {/* Add Trade button */}
        <button
          onClick={goAddTrade}
          className="btn-scale"
          style={{ ...btn, background: 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)', width: '100%', marginTop: '10px', marginBottom: '14px', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderRadius: '10px', fontSize: '13px' }}
        >
          <Plus size={16} />
          Add Trade
        </button>

        <div style={{ height: '1px', background: 'var(--divider)', margin: '2px 0 7px' }} />

        {/* Nav */}
        {nav.map(n => (
          <button
            key={n.id}
            onClick={() => setPage(n.id)}
            className="nav-item"
            style={{
              background: page === n.id ? 'rgba(255,255,255,0.05)' : 'transparent',
              border: page === n.id ? '1px solid #1e1e1e' : '1px solid transparent',
              borderLeft: page === n.id ? '2px solid rgba(255,255,255,0.4)' : '2px solid transparent',
              color: page === n.id ? '#ddd' : '#777',
              borderRadius: '10px',
              padding: '10px 14px',
              paddingLeft: '12px',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              width: '100%',
              fontFamily: 'inherit',
              fontWeight: page === n.id ? '500' : '400',
              transition: 'all 0.15s',
            }}
          >
            <n.Icon size={18} color={page === n.id ? '#fff' : '#555'} />
            {n.label}
          </button>
        ))}

        <div style={{ flex: 1 }} />

        {/* User card */}
        <div style={{ padding: '12px 13px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid #161616' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#141414', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0, color: '#777' }}>
              {initials}
            </div>
            <div>
              <div style={{ fontWeight: '600', fontSize: '13px', color: '#ccc' }}>{displayName}</div>
              <div style={{ color: '#666', fontSize: '11px', marginTop: '1px' }}>{marketFocus}</div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{ width: '100%', background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '7px', color: '#555', fontSize: '11px', padding: '6px', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', letterSpacing: '0.04em' }}
            className="action-btn"
          >
            Log out
          </button>
        </div>

        {/* Hidden admin link — only visible for the admin email */}
        {session?.user?.email === ADMIN_EMAIL && (
          <button
            onClick={() => setPage('admin')}
            style={{
              marginTop: '6px', width: '100%',
              background: 'transparent', border: 'none',
              color: page === 'admin' ? '#aaffa0' : '#2a2a2a',
              fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: 'inherit', padding: '4px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#aaffa0' }}
            onMouseLeave={e => { e.currentTarget.style.color = page === 'admin' ? '#aaffa0' : '#2a2a2a' }}
          >
            · admin ·
          </button>
        )}
      </aside>

      {/* ── Mobile top header (hidden on desktop via CSS) ── */}
      <div className="mobile-header">
        <button
          onClick={() => setMobileSidebarOpen(true)}
          style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', padding: '4px', lineHeight: 1, display: 'flex', alignItems: 'center', minHeight: '44px' }}
        >☰</button>
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', justifyContent: 'center' }}>
            <img src="/logo2.png" alt="logo" style={{ height: '22px', width: 'auto', display: 'block', flexShrink: 0 }} onError={e => { e.target.style.display = 'none' }} />
            <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.15em', color: '#fff', lineHeight: 1 }}>LIMITLESS</span>
          </div>
          <div style={{ fontSize: '9px', color: '#555', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '2px' }}>Private Journal</div>
        </div>
        <button
          onClick={goAddTrade}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid #333', borderRadius: '99px', color: '#fff', fontSize: '12px', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', minHeight: '36px', whiteSpace: 'nowrap' }}
        >+ Add</button>
      </div>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, minWidth: 0 }}>
        {announcement?.active && announcement.text && (
          <div style={{
            background: 'linear-gradient(90deg, rgba(170,255,160,0.10), rgba(170,255,160,0.04))',
            borderBottom: '1px solid rgba(170,255,160,0.2)',
            color: '#aaffa0', fontSize: '13px', fontWeight: '500',
            padding: '10px 24px', textAlign: 'center',
            letterSpacing: '0.01em', flexShrink: 0,
          }}>
            {announcement.text}
          </div>
        )}
        {page === 'dashboard'   && <Dashboard trades={trades} onAddTrade={goAddTrade} loading={tradesLoading} profile={profile} flags={featureFlags} />}
        {page === 'trades'      && (
          <Trades
            trades={trades}
            session={session}
            onTradeAdded={t => setTrades(prev => [t, ...prev])}
            onTradeDeleted={id => setTrades(prev => prev.filter(t => t.id !== id))}
            onTradeUpdated={updated => setTrades(prev => prev.map(t => t.id === updated.id ? updated : t))}
            onAddTrade={goAddTrade}
            loading={tradesLoading}
          />
        )}
        {page === 'news' && featureFlags.newsCalendar && <NewsCalendar />}
        {page === 'plan'        && <TradingPlan flags={featureFlags} />}
        {page === 'settings'    && <Settings theme={theme} setTheme={handleSetTheme} session={session} profile={profile} setProfile={setProfile} glassMode={glassMode} setGlassMode={v => { setGlassMode(v); localStorage.setItem('glass_mode', v) }} onLogout={logout} trades={trades} />}
        {page === 'admin'       && <AdminPanel session={session} setPage={setPage} />}
      </main>

      <AddTradeModal
        open={showAddTrade}
        onClose={() => setShowAddTrade(false)}
        session={session}
        onTradeAdded={t => setTrades(prev => [t, ...prev])}
      />

      {/* ── Mobile slide-in sidebar — always in DOM, CSS transition for smooth open/close ── */}
      {createPortal(
        <>
          {/* Overlay — fades in/out via opacity transition */}
          <div
            className="mobile-sidebar-overlay"
            style={{ opacity: mobileSidebarOpen ? 1 : 0, pointerEvents: mobileSidebarOpen ? 'auto' : 'none' }}
            onClick={() => setMobileSidebarOpen(false)}
          />
          {/* Sidebar — slides in/out via transform transition */}
          <div
            className="mobile-sidebar"
            style={{ transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)' }}
          >
            {/* Header row: logo + X */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <img
                  src="/logo2.png"
                  alt="logo"
                  style={{ height: '22px', width: 'auto', display: 'block', flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', letterSpacing: '0.12em', color: '#fff', lineHeight: 1 }}>LIMITLESS</div>
                  <div style={{ fontSize: '8px', color: '#555', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '2px' }}>Private Journal</div>
                </div>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#666', fontSize: '20px', cursor: 'pointer', padding: '4px', lineHeight: 1, minHeight: '36px' }}
              >✕</button>
            </div>

            <div style={{ height: '1px', background: '#1a1a1a', marginBottom: '12px' }} />

            {/* Nav items */}
            {nav.map(n => (
              <button
                key={n.id}
                onClick={() => { setMobileSidebarOpen(false); setTimeout(() => setPage(n.id), 20) }}
                className="nav-item"
                style={{
                  background: page === n.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                  border: page === n.id ? '1px solid #1e1e1e' : '1px solid transparent',
                  borderLeft: page === n.id ? '2px solid rgba(255,255,255,0.4)' : '2px solid transparent',
                  color: page === n.id ? '#ddd' : '#777',
                  borderRadius: '10px', padding: '11px 13px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  width: '100%', textAlign: 'left',
                  cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: '13px', fontWeight: page === n.id ? '600' : '400',
                  transition: 'all 0.15s', marginBottom: '2px', minHeight: '44px',
                }}
              >
                <n.Icon size={16} />
                {n.label}
              </button>
            ))}

            {/* User card at bottom */}
            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#141414', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', flexShrink: 0, color: '#777' }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: '#ccc' }}>{displayName}</div>
                  <div style={{ color: '#666', fontSize: '11px', marginTop: '1px' }}>{marketFocus}</div>
                </div>
              </div>
              <button
                onClick={() => { setMobileSidebarOpen(false); setTimeout(logout, 20) }}
                style={{ width: '100%', background: 'transparent', border: '1px solid #1c1c1c', borderRadius: '7px', color: '#555', fontSize: '11px', padding: '8px', cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em' }}
              >Log out</button>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
