// Feedback (thumbs up/down) fra den live app.
// =========================================================================
//  >>> SÆT DIN BACKEND HER <<<  (indtil da bufres ALT i browserens localStorage,
//  så intet går tabt — du kan flush'e senere når lageret er valgt).
//
//  Option A — Supabase (anbefalet):
//    1) Lav et gratis projekt + en tabel:  (kør i Supabase SQL-editor)
//         create table feedback (
//           id bigint generated always as identity primary key,
//           atom_id text, niveau text, vote text, kommentar text,
//           begreb text, fag text, session text, app_version text,
//           ts timestamptz default now()
//         );
//         alter table feedback enable row level security;
//         create policy "anon insert" on feedback for insert to anon with check (true);
//    2) Sæt i en .env-fil i spled-app-roden:
//         VITE_FEEDBACK_URL=https://<projekt>.supabase.co/rest/v1/feedback
//         VITE_FEEDBACK_KEY=<din anon public key>
//
//  Option B — Vercel serverless: lav api/feedback.js der gemmer i Vercel KV/Postgres,
//    og sæt:  VITE_FEEDBACK_URL=/api/feedback   (lad VITE_FEEDBACK_KEY være tom)
// =========================================================================
const BACKEND_URL = import.meta.env.VITE_FEEDBACK_URL || ''
const BACKEND_KEY = import.meta.env.VITE_FEEDBACK_KEY || ''
const APP_VERSION = 'mvp-1027'

const BUFFER_KEY = 'spled_feedback_buffer'
const VOTES_KEY = 'spled_votes'
const SESSION_KEY = 'spled_session'

function ls(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* privat-tilstand: ignorér */ }
}

function sessionId() {
  let s = null
  try { s = localStorage.getItem(SESSION_KEY) } catch { /* ignore */ }
  if (!s) {
    s = (crypto?.randomUUID?.() || `s-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    save(SESSION_KEY, s)
    // gem som ren streng, ikke JSON
    try { localStorage.setItem(SESSION_KEY, s) } catch { /* ignore */ }
  }
  return s
}

export function getVote(atomId) {
  const v = ls(VOTES_KEY, {})
  return v[atomId] || null
}
function setVote(atomId, vote) {
  const v = ls(VOTES_KEY, {})
  v[atomId] = vote
  save(VOTES_KEY, v)
}

function bufferItem(item) {
  const buf = ls(BUFFER_KEY, [])
  buf.push(item)
  save(BUFFER_KEY, buf)
}

// Best-effort: send bufrede items til backenden (hvis konfigureret). Rydder ved succes.
export async function flush() {
  if (!BACKEND_URL) return
  const buf = ls(BUFFER_KEY, [])
  if (!buf.length) return
  const headers = { 'Content-Type': 'application/json' }
  if (BACKEND_KEY) { // Supabase-stil
    headers.apikey = BACKEND_KEY
    headers.Authorization = `Bearer ${BACKEND_KEY}`
    headers.Prefer = 'return=minimal'
  }
  const tilbage = []
  for (const item of buf) {
    try {
      const r = await fetch(BACKEND_URL, { method: 'POST', headers, body: JSON.stringify(item) })
      if (!r.ok) tilbage.push(item)
    } catch { tilbage.push(item) }
  }
  save(BUFFER_KEY, tilbage)
}

// Kaldes fra kortet. Gemmer lokalt (så UI viser aktiv stemme) + bufrer + forsøger flush.
export function sendFeedback({ atomId, niveau, vote, kommentar = '', begreb = '', fag = '' }) {
  setVote(atomId, vote)
  bufferItem({
    atom_id: atomId, niveau, vote, kommentar, begreb, fag,
    session: sessionId(), app_version: APP_VERSION, ts: new Date().toISOString(),
  })
  flush().catch(() => {})
}
