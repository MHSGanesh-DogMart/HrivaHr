/**
 * apiConfig.ts
 * ─────────────────────────────────────────────────────────────────
 * Centralized API endpoint management for HrivaHQ.
 * Swaps between local development and live production backends.
 */

const IS_DEV = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

// --- BACKEND ROUTING PROTOCOL ---
// 1. In Dev: Proxied via vite.config.ts (points to localhost:3000)
// 2. In Production: Points to your hosted Render/Railway/Vercel instance
export const API_BASE_URL = IS_DEV 
  ? '' 
  : 'https://hrivahr.onrender.com'

export const API_ENDPOINTS = {
  INVITE: `${API_BASE_URL}/api/invite`,
}
