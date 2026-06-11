/**
 * db.js — Couche d'accès IndexedDB pour SmartFinance
 *
 * Schéma v1 :
 *   stores     : transactions | budgets | categories | user | sync_queue | settings
 *   versioning : migration déclarative par version
 *
 * Tous les stores partagent la convention :
 *   - local_id   : clé primaire auto-incrémentée (string uuid)
 *   - server_id  : id Django côté backend (peut être null si création offline)
 *   - sync_status: 'synced' | 'pending_create' | 'pending_update' | 'pending_delete'
 *   - updated_at : ISO string — Last Write Wins
 */

const DB_NAME    = 'smartfinance_db'
const DB_VERSION = 1

let _db = null

// ── Ouvre (ou crée) la base IndexedDB ────────────────────────────────────────
export function openDB() {
  if (_db) return Promise.resolve(_db)

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = (event) => {
      const db = event.target.result

      // ── transactions ──────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'local_id' })
        txStore.createIndex('server_id',   'server_id',   { unique: false })
        txStore.createIndex('user_id',     'user_id',     { unique: false })
        txStore.createIndex('sync_status', 'sync_status', { unique: false })
        txStore.createIndex('date',        'date',        { unique: false })
        txStore.createIndex('type',        'type',        { unique: false })
      }

      // ── budgets ───────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('budgets')) {
        const bStore = db.createObjectStore('budgets', { keyPath: 'local_id' })
        bStore.createIndex('server_id',   'server_id',   { unique: false })
        bStore.createIndex('user_id',     'user_id',     { unique: false })
        bStore.createIndex('sync_status', 'sync_status', { unique: false })
      }

      // ── categories ────────────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('categories')) {
        const cStore = db.createObjectStore('categories', { keyPath: 'local_id' })
        cStore.createIndex('server_id',   'server_id',   { unique: false })
        cStore.createIndex('user_id',     'user_id',     { unique: false })
        cStore.createIndex('sync_status', 'sync_status', { unique: false })
      }

      // ── user (profil + snapshot analytics) ───────────────────────────────
      if (!db.objectStoreNames.contains('user')) {
        const uStore = db.createObjectStore('user', { keyPath: 'key' })
        // clés utilisées : 'profile' | 'dashboard_snapshot' | 'monthly_snapshot'
      }

      // ── sync_queue ─────────────────────────────────────────────────────── 
      if (!db.objectStoreNames.contains('sync_queue')) {
        const qStore = db.createObjectStore('sync_queue', {
          keyPath: 'queue_id', autoIncrement: true
        })
        qStore.createIndex('store',      'store',      { unique: false })
        qStore.createIndex('local_id',   'local_id',   { unique: false })
        qStore.createIndex('created_at', 'created_at', { unique: false })
        // Pas d'index status : on lit TOUT et on filtre en JS (queue courte)
      }

      // ── settings (PIN hash, offline_enabled, etc.) ────────────────────────
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }

    req.onsuccess  = (e) => { _db = e.target.result; resolve(_db) }
    req.onerror    = (e) => reject(e.target.error)
    req.onblocked  = ()  => console.warn('[IDB] blocked — ferme les autres onglets')
  })
}

// ── Helpers génériques ────────────────────────────────────────────────────────

/** Lance une transaction IDB et retourne une Promise<result> */
export function idbTx(storeName, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    let result
    try { result = fn(store, tx) } catch (e) { reject(e); return }
    if (result instanceof IDBRequest) {
      result.onsuccess = () => resolve(result.result)
      result.onerror   = () => reject(result.error)
    } else {
      tx.oncomplete = () => resolve(result)
      tx.onerror    = () => reject(tx.error)
    }
  }))
}

/** Retourne tous les enregistrements d'un store */
export function getAll(storeName) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx  = db.transaction(storeName, 'readonly')
    const req = tx.objectStore(storeName).getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  }))
}

/** Retourne tous les enregistrements matchant une valeur d'index */
export function getAllByIndex(storeName, indexName, value) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName, 'readonly')
    const index = tx.objectStore(storeName).index(indexName)
    const req   = index.getAll(value)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  }))
}

/** Upsert (put) un enregistrement */
export function put(storeName, record) {
  return idbTx(storeName, 'readwrite', store => store.put(record))
}

/** Supprime un enregistrement par clé primaire */
export function remove(storeName, key) {
  return idbTx(storeName, 'readwrite', store => store.delete(key))
}

/** Lit un enregistrement par clé primaire */
export function get(storeName, key) {
  return idbTx(storeName, 'readonly', store => store.get(key))
}

/** Vide entièrement un store */
export function clearStore(storeName) {
  return idbTx(storeName, 'readwrite', store => store.clear())
}

/** Génère un UUID v4 local (pas de dépendance externe) */
export function localId() {
  return 'local_' + crypto.randomUUID()
}
