import { Client, Databases, Storage, Account, Query, ID } from 'appwrite'

export { Query, ID }

const LS_KEY = 'msktlc_appwrite_cfg'

let _client    = null
let _databases = null
let _storage   = null
let _account   = null
let _cfg       = null

export function getConfig() {
  if (_cfg) return _cfg
  const saved = localStorage.getItem(LS_KEY)
  return saved ? JSON.parse(saved) : null
}

export function saveConfig(cfg) {
  localStorage.setItem(LS_KEY, JSON.stringify(cfg))
  _cfg = cfg
}

export function clearConfig() {
  localStorage.removeItem(LS_KEY)
  _client = _databases = _storage = _account = _cfg = null
}

export function initClient(cfg) {
  _cfg = cfg
  _client    = new Client().setEndpoint(cfg.endpoint).setProject(cfg.projectId)
  _databases = new Databases(_client)
  _storage   = new Storage(_client)
  _account   = new Account(_client)
  return { databases: _databases, storage: _storage, account: _account }
}

export function getDatabases() { return _databases }
export function getStorage()   { return _storage }
export function getAccount()   { return _account }

export async function login(email, password) {
  return _account.createEmailPasswordSession(email, password)
}

export async function logout() {
  await _account.deleteSession('current')
}

export async function getCurrentUser() {
  return _account.get()
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
