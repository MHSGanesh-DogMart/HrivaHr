/**
 * Tenant Detection Utility
 *
 * NOW  (no domain):  hrivahr.web.app/petsaathi/dashboard
 *                    → reads from URL path segment [1]
 *
 * LATER (domain):    petsaathi.hrivahr.in/dashboard
 *                    → reads from subdomain (one line change)
 */

/** Returns the company slug from the URL. e.g. "petsaathi" */
export function getTenantSlug(): string {
  // Path-based (current): /petsaathi/dashboard → "petsaathi"
  const parts = window.location.pathname.split('/').filter(Boolean)
  return parts[0] ?? ''

  // ─── When you get a domain, swap the above for this: ───
  // const host = window.location.hostname          // petsaathi.hrivahr.in
  // const parts = host.split('.')
  // return parts.length >= 3 ? parts[0] : ''       // "petsaathi"
}

/** Reserved paths that are NOT tenant slugs */
export const RESERVED_PATHS = ['register', 'super-admin', 'login', '']

/** Is the current path a tenant workspace? */
export function isTenantPath(): boolean {
  const slug = getTenantSlug()
  return !!slug && !RESERVED_PATHS.includes(slug)
}

/** Build a URL for a tenant page */
export function tenantUrl(slug: string, page = '') {
  return `/${slug}${page ? `/${page}` : ''}`
}
