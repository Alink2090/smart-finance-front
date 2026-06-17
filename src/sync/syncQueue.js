/**
 * syncQueue.js — File d'attente des opérations offline
 *
 * Structure d'un item :
 *   queue_id   : auto-increment (clé primaire)
 *   store      : 'transactions' | 'budgets' | 'categories'
 *   operation  : 'create' | 'update' | 'delete'
 *   local_id   : référence à l'objet dans son store
 *   payload    : données à envoyer au backend
 *   status     : 'pending' | 'processing' | 'failed'
 *   attempts   : nombre de tentatives
 *   created_at : ISO string
 *   error      : dernier message d'erreur
 */
import { openDB, getAll, put, idbTx } from '../indexeddb/db.js'

const QUEUE_STORE = 'sync_queue'
const MAX_ATTEMPTS = 3

/** Ajoute une opération dans la queue */
export async function enqueue(item) {
  await openDB()
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(QUEUE_STORE, 'readwrite')
    const store = tx.objectStore(QUEUE_STORE)
    const req   = store.add({
      ...item,
      status:     'pending',
      attempts:   0,
      created_at: new Date().toISOString(),
      error:      null,
    })
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
}

/** Retourne tous les items en attente (status = pending) */
export async function getPendingItems() {
  const all = await getAll(QUEUE_STORE)
  return all
    .filter(i => i.status === 'pending' || i.status === 'failed')
    .sort((a, b) => a.queue_id - b.queue_id) // ordre FIFO
}

/** Compte les items en attente (pour l'indicateur UI) */
export async function getPendingCount() {
  const items = await getPendingItems()
  return items.length
}

/** Marque un item comme réussi → suppression de la queue */
export async function markDone(queueId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(QUEUE_STORE, 'readwrite')
    const req = tx.objectStore(QUEUE_STORE).delete(queueId)
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

/** Marque un item comme échoué (incrémente attempts, log l'erreur) */
export async function markFailed(queueId, errorMsg) {
  const db = await openDB()
  const item = await new Promise((resolve, reject) => {
    const tx  = db.transaction(QUEUE_STORE, 'readonly')
    const req = tx.objectStore(QUEUE_STORE).get(queueId)
    req.onsuccess = () => resolve(req.result)
    req.onerror   = () => reject(req.error)
  })
  if (!item) return

  const attempts = (item.attempts ?? 0) + 1
  await put(QUEUE_STORE, {
    ...item,
    attempts,
    status: attempts >= MAX_ATTEMPTS ? 'failed' : 'pending',
    error:  errorMsg,
  })
}

/** Vide la queue (après sync complète ou reset) */
export async function clearQueue() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(QUEUE_STORE, 'readwrite')
    const req = tx.objectStore(QUEUE_STORE).clear()
    req.onsuccess = () => resolve()
    req.onerror   = () => reject(req.error)
  })
}

/** Déduplique la queue : si plusieurs updates sur le même local_id → garde le dernier */
export async function deduplicateQueue() {
  const all = await getAll(QUEUE_STORE)
  const seen = new Map() // local_id → last item
  // On parcourt dans l'ordre FIFO
  for (const item of all.sort((a, b) => a.queue_id - b.queue_id)) {
    if (item.operation === 'delete') {
      // Un delete annule tous les updates précédents sur ce local_id
      seen.set(item.local_id, item)
    } else if (item.operation === 'update') {
      const prev = seen.get(item.local_id)
      // Garde seulement si pas de delete et on prend le plus récent
      if (!prev || prev.operation !== 'delete') seen.set(item.local_id, item)
    } else {
      // create → toujours garde
      if (!seen.has(item.local_id)) seen.set(item.local_id, item)
    }
  }
  // Supprime les doublons
  const db = await openDB()
  const tx  = db.transaction(QUEUE_STORE, 'readwrite')
  const store = tx.objectStore(QUEUE_STORE)
  for (const item of all) {
    const canonical = seen.get(item.local_id)
    if (!canonical || item.queue_id !== canonical.queue_id) {
      store.delete(item.queue_id)
    }
  }
  return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error) })
}
