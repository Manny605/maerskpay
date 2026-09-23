import { createClient } from '@supabase/supabase-js'

const LS_KEY = 'msktlc_supabase_cfg'

// Valeurs par défaut lues depuis .env (VITE_SUPABASE_*) — surchargeables via l'écran de config
export const DEFAULT_CONFIG = {
  url:      import.meta.env.VITE_SUPABASE_URL      || '',
  anonKey:  import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  bucketId: import.meta.env.VITE_SUPABASE_BUCKET   || 'maersk-docs',
}

let _client = null
let _cfg    = null

export function getConfig() {
  if (_cfg) return _cfg
  const saved = localStorage.getItem(LS_KEY)
  if (saved) return JSON.parse(saved)
  return DEFAULT_CONFIG.url && DEFAULT_CONFIG.anonKey ? DEFAULT_CONFIG : null
}

export function saveConfig(cfg) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg))
  _cfg = cfg
}

export function clearConfig() {
  localStorage.removeItem(LS_KEY)
  _client = _cfg = null
}

export function initClient(cfg) {
  _cfg    = cfg
  _client = createClient(cfg.url, cfg.anonKey)
  return _client
}

export function getClient() { return _client }

// Renvoie data ou lève l'erreur Supabase — évite de répéter { data, error } partout
export async function unwrap(promise) {
  const { data, error } = await promise
  if (error) throw error
  return data
}

export async function login(email, password) {
  return unwrap(_client.auth.signInWithPassword({ email, password }))
}

export async function logout() {
  await unwrap(_client.auth.signOut())
}

export async function getCurrentUser() {
  const { user } = await unwrap(_client.auth.getUser())
  if (!user) throw new Error('Non connecté')
  return user
}

// ── OPERATORS & ENTRIES ─────────────────────────
export const OPERATORS = [
  { id: 'mauritel', name: 'Mauritel', color: 'mauritel',
    entries: [{ id: 'm1', site: 'NKC', company: null }] },
  { id: 'rimatel',  name: 'Rimatel',  color: 'rimatel',
    entries: [{ id: 'r1', site: 'NKC', company: null }, { id: 'r2', site: 'NDB', company: null }] },
  { id: 'mattel',   name: 'Mattel',   color: 'mattel',
    entries: [
      { id: 't1', site: 'NKC', company: 'Maerskline' },
      { id: 't2', site: 'NKC', company: 'Maersk Logistics' }
    ]
  },
]

export const STATUS_LABELS = {
  missing:    'Non reçue',
  pending:    'Non payée',
  processing: 'En cours',
  paid:       'Payée',
}

export const DOC_LABELS = {
  invoice: 'Facture',
  payment: 'Avis paiement',
  cheque:  'Chèque déchargé',
}

export const MONTHS = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
]

export function entryName(e) {
  return e.company ? `${e.site} — ${e.company}` : e.site
}

export function docId(opId, entryId, month, year) {
  return `${opId}-${entryId}-${month}-${year}`
}

export function fmtAmt(n) {
  const num = Number(n)
  if (!isFinite(num)) return ''
  const neg = num < 0
  const abs = Math.abs(num)
  let [intPart, decPart = ''] = abs.toFixed(3).split('.')
  decPart = decPart.replace(/0+$/, '')
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  const result = decPart ? `${intPart},${decPart}` : intPart
  return neg ? `-${result}` : result
}
