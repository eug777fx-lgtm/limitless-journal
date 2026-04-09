import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts'
import {
  LayoutDashboard, BookOpen, ClipboardList, Settings2,
  Lightbulb, Check, BarChart2, Plus, CalendarDays,
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
/* ─── Bottom nav (desktop: hidden) ─── */
.bottom-nav  { display: none; }
* { -webkit-overflow-scrolling: touch; }
/* ─── Light mode overrides ─── */
[data-mode="light"] .bottom-nav { background: rgba(248,248,248,0.98) !important; border-top-color: #e0e0e0 !important; }
/* ─── Mobile ─── */
@media (max-width: 768px) {
  /* Sidebar / nav */
  .app-sidebar { display: none !important; }
  .bottom-nav  {
    display: flex !important;
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
    background: rgba(10,10,10,0.97);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid #1e1e1e;
    justify-content: space-around; align-items: center;
    padding: 4px 0 max(8px, env(safe-area-inset-bottom));
    height: 52px; box-sizing: content-box;
  }
  /* Mobile logo header */
  .mobile-header {
    display: flex !important; align-items: center; gap: 10px;
    padding: 14px 16px; position: sticky; top: 0; z-index: 50;
    background: rgba(8,8,8,0.90);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid #161616;
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
  /* Page padding — bottom clears fixed nav + safe area */
  .page-wrap { padding: 20px 16px !important; padding-bottom: calc(90px + env(safe-area-inset-bottom)) !important; overflow-x: hidden !important; max-width: 100vw !important; box-sizing: border-box !important; }
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

const DEFAULT_COUNTRY = COUNTRIES.find(c => c.name === 'Aruba')

// ─── Auth Page ────────────────────────────────────────────────
function AuthPage({ onAuth }) {
  const [tab, setTab]           = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [country, setCountry]     = useState(DEFAULT_COUNTRY)
  const [phoneNum, setPhoneNum]   = useState('')
  const [error, setError]       = useState('')
  const [message, setMessage]   = useState('')
  const [loading, setLoading]   = useState(false)

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
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        const phone = phoneNum ? `${country.code} ${phoneNum}` : null
        if (data.session) {
          await supabase.from('profiles').upsert({
            id: data.session.user.id,
            first_name: firstName || null,
            last_name:  lastName  || null,
            phone:      phone,
          }, { onConflict: 'id' })
          onAuth(data.session)
        } else {
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
                          {c.flag} {c.name} {c.code}
                        </option>
                      ))}
                    </select>
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 10px', color: '#555', fontSize: '13px', flexShrink: 0, borderRight: '1px solid #1c1c1c', whiteSpace: 'nowrap' }}>
                      {country.flag} {country.code}
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
            <div className="auth-pw" style={{ marginBottom: '22px' }}>
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

            <button
              style={{ ...btn, width: '100%', padding: '12px', opacity: loading ? 0.6 : 1 }}
              onClick={submit}
              disabled={loading}
            >
              {loading ? '...' : tab === 'login' ? 'Log In' : 'Create Account'}
            </button>
          </div>
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

// ─── Bottom Nav (mobile) ──────────────────────────────────────
function BottomNav({ page, setPage }) {
  const items = [
    { id: 'dashboard', Icon: LayoutDashboard, label: 'Home'    },
    { id: 'trades',    Icon: BookOpen,        label: 'Trades'  },
    { id: 'news',      Icon: CalendarDays,    label: 'News'    },
    { id: 'plan',      Icon: ClipboardList,   label: 'Plan'    },
    { id: 'settings',  Icon: Settings2,       label: 'More'    },
  ]
  return (
    <div className="bottom-nav">
      {items.map(({ id, Icon, label }) => {
        const active = page === id
        return (
          <button
            key={id}
            onClick={() => setPage(id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              background: 'transparent', border: 'none', padding: '4px 6px',
              color: active ? '#ffffff' : '#555',
              fontSize: '9px', fontFamily: 'inherit', cursor: 'pointer',
              flex: 1, minHeight: '44px', justifyContent: 'center',
              transition: 'color 0.15s', letterSpacing: '0.02em',
            }}
          >
            <Icon size={18} />
            <span style={{ fontWeight: active ? '600' : '400' }}>{label}</span>
          </button>
        )
      })}
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

// ─── Dashboard ────────────────────────────────────────────────
function Dashboard({ trades, onAddTrade, loading }) {
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

      {/* P&L curve + Calendar */}
      <div className="chart-grid">
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ ...lbl, color: '#999' }}>Cumulative P&L</div>
            <div style={{ fontSize: '12px', color: totalPnl >= 0 ? '#aaffa0' : '#ff8080', fontWeight: '700', letterSpacing: '-0.3px' }}>
              {totalPnl >= 0 ? '+' : '−'}${Math.abs(Math.round(totalPnl)).toLocaleString()} MTD
            </div>
          </div>
          <div style={chartVisible ? { animation: `chartReveal ${ANIM_MS}ms ease-out both` } : { clipPath: 'inset(0 100% 0 0)' }}>
            <ResponsiveContainer width="100%" height={190}>
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

const NEWS_CACHE_KEY = 'news_cache_v1'
const NEWS_CACHE_TTL = 60 * 60 * 1000 // 1 hour

function NewsCalendar() {
  const [events,       setEvents]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [useFallback,  setUseFallback]  = useState(false)
  const [cachedAt,     setCachedAt]     = useState(null)
  const [impactFilter, setImpactFilter] = useState('All')
  const [currFilter,   setCurrFilter]   = useState('All')

  const fetchNews = async () => {
    setLoading(true)
    setUseFallback(false)
    const PROXIES = [
      'https://api.allorigins.win/raw?url=https%3A%2F%2Fnfs.faireconomy.media%2Fff_calendar_thisweek.json',
      'https://corsproxy.io/?https://nfs.faireconomy.media/ff_calendar_thisweek.json',
      'https://thingproxy.freeboard.io/fetch/https://nfs.faireconomy.media/ff_calendar_thisweek.json',
    ]
    let data = null
    for (const url of PROXIES) {
      try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const parsed = await res.json()
        if (Array.isArray(parsed) && parsed.length > 0) {
          data = parsed
          break
        }
      } catch { /* try next */ }
    }
    if (data) {
      const ts = Date.now()
      try { localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ ts, data })) } catch {}
      setEvents(data)
      setCachedAt(ts)
    } else {
      setEvents(NEWS_FALLBACK)
      setUseFallback(true)
    }
    setLoading(false)
  }

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NEWS_CACHE_KEY)
      if (raw) {
        const { ts, data } = JSON.parse(raw)
        if (Date.now() - ts < NEWS_CACHE_TTL && Array.isArray(data) && data.length > 0) {
          setEvents(data)
          setCachedAt(ts)
          setLoading(false)
          return
        }
      }
    } catch {}
    fetchNews()
  }, [])

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

  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px' }}>News Calendar</h1>
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

      {/* Empty */}
      {filtered.length === 0 && (
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
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', letterSpacing: '0.04em', marginBottom: '10px' }}>Live feed temporarily unavailable</div>
          <button
            onClick={() => { try { localStorage.removeItem(NEWS_CACHE_KEY) } catch {} fetchNews() }}
            style={{ background: 'transparent', border: '1px solid var(--card-border)', color: 'var(--text-md)', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
          >Retry</button>
        </div>
      )}

      {!useFallback && cachedAt && (
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
function TradingPlan() {
  const today    = new Date().toISOString().slice(0, 10)
  const CK       = `checklist_${today}`
  const RK       = 'trading_rules'

  const defaultChecks = { bias: false, liquidity: false, entryModel: false, risk: false, news: false, emotional: false }
  const defaultRules  = { sessionTime: '', setupModel: '', entryConfirmations: '', riskPerTrade: '', rulesBefore: '' }

  const [checks, setChecks] = useState(() => {
    try { const s = localStorage.getItem(CK); return s ? JSON.parse(s) : defaultChecks } catch { return defaultChecks }
  })
  const [rules, setRules] = useState(() => {
    try { const s = localStorage.getItem(RK); return s ? JSON.parse(s) : defaultRules } catch { return defaultRules }
  })
  const [rulesSaved, setRulesSaved] = useState(false)

  const toggle = (key) => setChecks(prev => {
    const next = { ...prev, [key]: !prev[key] }
    localStorage.setItem(CK, JSON.stringify(next))
    return next
  })

  const saveRules = () => {
    localStorage.setItem(RK, JSON.stringify(rules))
    setRulesSaved(true)
    setTimeout(() => setRulesSaved(false), 2000)
  }

  const checkItems = [
    { key: 'bias',       label: 'Bias confirmed'       },
    { key: 'liquidity',  label: 'Liquidity identified'  },
    { key: 'entryModel', label: 'Entry model valid'     },
    { key: 'risk',       label: 'Risk acceptable'       },
    { key: 'news',       label: 'News/events checked'   },
    { key: 'emotional',  label: 'Emotional state good'  },
  ]
  const done = Object.values(checks).filter(Boolean).length
  const allDone = done === checkItems.length
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
            {done}/{checkItems.length} {allDone ? '✓' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {checkItems.map(item => {
            const on = checks[item.key]
            return (
              <div
                key={item.key}
                onClick={() => toggle(item.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '11px 14px', borderRadius: '10px', cursor: 'pointer',
                  border: `1px solid ${on ? 'rgba(170,255,160,0.22)' : 'var(--card-border)'}`,
                  background: on ? 'rgba(170,255,160,0.05)' : 'transparent',
                  transition: 'all 0.15s', userSelect: 'none',
                }}
              >
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px', flexShrink: 0,
                  border: `1.5px solid ${on ? '#aaffa0' : 'var(--inp-border)'}`,
                  background: on ? '#aaffa0' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}>
                  {on && <Check size={11} strokeWidth={3.5} style={{ color: '#000' }} />}
                </div>
                <span style={{ fontSize: '14px', color: on ? 'var(--text-hi)' : 'var(--text-md)', fontWeight: on ? '500' : '400', transition: 'color 0.15s' }}>
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
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
        <button style={btn} onClick={saveRules}>{rulesSaved ? '✓ Rules Saved' : 'Save Rules'}</button>
      </div>
    </div>
  )
}



// ─── Settings ─────────────────────────────────────────────────
function Settings({ theme, setTheme, session, profile, setProfile, glassMode, setGlassMode }) {
  const [localFirstName, setLocalFirstName] = useState(profile?.first_name   || '')
  const [localLastName,  setLocalLastName]  = useState(profile?.last_name    || '')
  const [localPhone,     setLocalPhone]     = useState(profile?.phone        || '')
  const [localName,      setLocalName]      = useState(profile?.username     || '')
  const [localMarket,    setLocalMarket]    = useState(profile?.market_focus || '')
  const [saved,          setSaved]          = useState(false)

  useEffect(() => {
    setLocalFirstName(profile?.first_name   || '')
    setLocalLastName(profile?.last_name    || '')
    setLocalPhone(profile?.phone          || '')
    setLocalName(profile?.username        || '')
    setLocalMarket(profile?.market_focus  || '')
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

  return (
    <div className="page-wrap" style={{ animation: 'pageEnter 0.2s ease-out both' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-1px', color: 'var(--text-hi)' }}>Settings</h1>
      </div>

      {/* Theme color section */}
      <div style={{ ...card, marginBottom: '14px' }}>
        <div style={{ ...lbl, marginBottom: '12px' }}>Journal Theme</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '2px', letterSpacing: '-0.3px', color: 'var(--text-hi)' }}>Glass Mode</div>
            <div style={{ fontSize: '13px', color: 'var(--text-md)', lineHeight: 1.5 }}>Frosted glass cards with blur effect</div>
          </div>
          <div className={`toggle-track ${glassMode ? 'on' : ''}`} onClick={() => setGlassMode(!glassMode)}>
            <div className="toggle-knob" />
          </div>
        </div>
        <div style={{ height: '1px', background: 'var(--divider)', marginBottom: '20px' }} />
        <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px', letterSpacing: '-0.3px', color: 'var(--text-hi)' }}>Background Color</div>
        <div style={{ fontSize: '13px', color: 'var(--text-md)', marginBottom: '20px', lineHeight: 1.5 }}>Choose the aurora vibe of your journal</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {SWATCHES.map(s => {
            const active = theme === s.id
            return (
              <button
                key={s.id}
                onClick={() => setTheme(s.id)}
                className="theme-pill"
                style={{
                  border: active ? '1.5px solid var(--text-hi)' : '1.5px solid var(--card-border)',
                  color: active ? 'var(--text-hi)' : 'var(--text-md)',
                  fontWeight: active ? '600' : '400',
                  boxShadow: active ? `0 0 0 1px ${s.color}44` : 'none',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Profile section */}
      <div style={{ ...card, marginBottom: '14px' }}>
        <div style={{ ...lbl, marginBottom: '20px' }}>Profile</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
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
            <input value={localPhone} onChange={e => setLocalPhone(e.target.value)} style={inp} placeholder="e.g. +1 555 000 0000" />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Display Name</div>
            <input value={localName} onChange={e => setLocalName(e.target.value)} style={inp} placeholder="Username or handle" />
          </div>
          <div>
            <div style={{ ...lbl, marginBottom: '7px' }}>Market Focus</div>
            <input value={localMarket} onChange={e => setLocalMarket(e.target.value)} style={inp} placeholder="e.g. Futures · Forex" />
          </div>
        </div>
        <button style={btn} onClick={saveProfile}>
          {saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      {/* Journal Info section */}
      <div style={card}>
        <div style={{ ...lbl, marginBottom: '6px' }}>Journal Info</div>
        {[
          { k: 'App',     v: 'LIMITLESS',        badge: false },
          { k: 'Version', v: '1.0.0',            badge: false },
          { k: 'Account', v: session.user.email, badge: false },
          { k: 'Status',  v: 'Private ✓',        badge: true  },
        ].map(row => (
          <div key={row.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--divider)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-md)' }}>{row.k}</span>
            {row.badge
              ? <span style={{ ...badge(true), fontSize: '12px', padding: '4px 12px' }}>{row.v}</span>
              : <span style={{ fontSize: '13px', color: 'var(--text-hi)', fontWeight: '600' }}>{row.v}</span>
            }
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── App Shell ────────────────────────────────────────────────
export default function App() {
  const [session,        setSession]        = useState(null)
  const [authLoading,    setAuthLoading]    = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [tradesLoading,  setTradesLoading]  = useState(true)
  const [profile,        setProfile]        = useState(null)
  const [trades,         setTrades]         = useState([])
  const [page,           setPage]           = useState('dashboard')
  const [showAddTrade,   setShowAddTrade]   = useState(false)
  const [theme,          setTheme]          = useState('white')
  const [colorMode,      setColorMode]      = useState('dark')
  const [glassMode,      setGlassMode]      = useState(() => localStorage.getItem('glass_mode') === 'true')

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setProfile(null)
        setTrades([])
        setPage('dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (sess) => {
    setProfileLoading(true)
    const { data } = await supabase.from('profiles').select('*').eq('id', sess.user.id).single()
    if (data) {
      setProfile(data)
      if (data.theme)      setTheme(data.theme)
      if (data.color_mode) setColorMode(data.color_mode)
    } else {
      const { data: created } = await supabase.from('profiles').upsert({ id: sess.user.id }, { onConflict: 'id' }).select().single()
      setProfile(created || { id: sess.user.id, username: '', market_focus: '', theme: 'white' })
    }
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
    { id: 'news',      Icon: CalendarDays,    label: 'News'         },
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
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, minWidth: 0 }}>
        {/* Mobile logo header — only visible on mobile via CSS */}
        <div className="mobile-header">
          <img src="/logo2.png" alt="logo" style={{ height: '24px', display: 'block' }} />
          <span style={{ fontSize: '14px', fontWeight: '700', letterSpacing: '0.15em', color: 'var(--text-hi)' }}>LIMITLESS</span>
        </div>
        {page === 'dashboard'   && <Dashboard trades={trades} onAddTrade={goAddTrade} loading={tradesLoading} />}
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
        {page === 'news'        && <NewsCalendar />}
        {page === 'plan'        && <TradingPlan />}
        {page === 'settings'    && <Settings theme={theme} setTheme={handleSetTheme} session={session} profile={profile} setProfile={setProfile} glassMode={glassMode} setGlassMode={v => { setGlassMode(v); localStorage.setItem('glass_mode', v) }} />}
      </main>

      <BottomNav page={page} setPage={setPage} />

      <AddTradeModal
        open={showAddTrade}
        onClose={() => setShowAddTrade(false)}
        session={session}
        onTradeAdded={t => setTrades(prev => [t, ...prev])}
      />
    </div>
  )
}
