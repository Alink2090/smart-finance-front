/**
 * settingsDB.js — Paramètres offline : PIN hash, offline_enabled, biometrie future
 *
 * Sécurité :
 *   - Le PIN n'est JAMAIS stocké en clair.
 *   - On stocke : SHA-256(userId + ":" + pin) → empêche rainbow tables cross-user.
 *   - L'userId sert de sel spécifique à l'utilisateur.
 */
import { put, get } from './db.js'

const STORE = 'settings'

/** Hash SHA-256 du PIN avec le userId comme sel */
async function hashPin(userId, pin) {
  const data    = new TextEncoder().encode(`${userId}:${pin}`)
  const hashBuf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Offline enabled ───────────────────────────────────────────────────────────
export async function setOfflineEnabled(enabled) {
  await put(STORE, { key: 'offline_enabled', value: enabled })
}
export async function isOfflineEnabled() {
  const rec = await get(STORE, 'offline_enabled')
  return rec?.value === true
}

// ── PIN ───────────────────────────────────────────────────────────────────────
export async function setPin(userId, pin) {
  const hash = await hashPin(userId, pin)
  await put(STORE, { key: 'pin_hash', hash, set_at: new Date().toISOString() })
}

export async function verifyPin(userId, pin) {
  const rec = await get(STORE, 'pin_hash')
  if (!rec?.hash) return false
  const hash = await hashPin(userId, pin)
  return hash === rec.hash
}

export async function hasPin() {
  const rec = await get(STORE, 'pin_hash')
  return !!rec?.hash
}

export async function clearPin() {
  const { idbTx } = await import('./db.js')
  await idbTx(STORE, 'readwrite', store => store.delete('pin_hash'))
}

// ── Biométrie (architecture extensible — V2) ──────────────────────────────────
// Face ID / empreinte via WebAuthn API
export async function isBiometricAvailable() {
  if (!window.PublicKeyCredential) return false
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch { return false }
}

// Placeholder : sera implémenté avec navigator.credentials.create() en V2
export async function registerBiometric(_userId) {
  throw new Error('Biométrie non implémentée — V2')
}
export async function verifyBiometric(_userId) {
  throw new Error('Biométrie non implémentée — V2')
}

// ── Timestamp dernier déverrouillage (session) ────────────────────────────────
export async function setUnlocked() {
  await put(STORE, { key: 'unlocked_at', value: new Date().toISOString() })
}
export async function getUnlockedAt() {
  const rec = await get(STORE, 'unlocked_at')
  return rec?.value ?? null
}
export async function clearUnlocked() {
  const { idbTx } = await import('./db.js')
  await idbTx(STORE, 'readwrite', store => store.delete('unlocked_at'))
}
