/**
 * userDB.js — Stockage du profil utilisateur + snapshots analytics
 * Utilisé pour afficher des données cohérentes en mode hors ligne.
 */
import { put, get } from './db.js'

const STORE = 'user'

export const saveProfile        = (data)  => put(STORE, { key: 'profile', ...data, saved_at: new Date().toISOString() })
export const getProfile         = ()       => get(STORE, 'profile')

export const saveDashboard      = (data)  => put(STORE, { key: 'dashboard_snapshot', data, saved_at: new Date().toISOString() })
export const getDashboard       = ()       => get(STORE, 'dashboard_snapshot')

export const saveMonthly        = (data)  => put(STORE, { key: 'monthly_snapshot', data, saved_at: new Date().toISOString() })
export const getMonthly         = ()       => get(STORE, 'monthly_snapshot')

export const saveCategoryExp    = (data)  => put(STORE, { key: 'category_snapshot', data, saved_at: new Date().toISOString() })
export const getCategoryExp     = ()       => get(STORE, 'category_snapshot')
