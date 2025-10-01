import {branding} from '#/lib/constants'

export function bskyTitle(page: string, unreadCountLabel?: string) {
  const unreadPrefix = unreadCountLabel ? `(${unreadCountLabel}) ` : ''
  return `${unreadPrefix}${page} — ${branding.naming.app_name}`
}
