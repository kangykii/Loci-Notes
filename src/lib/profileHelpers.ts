import { normalizeUserHandle } from '../services/friendService'

export function avatarTextColor(backgroundColor: string) {
  return backgroundColor.toLowerCase() === '#f4f4f2' ? '#1A1A1A' : '#F4F4F2'
}

export function normalizeInitials(value: string) {
  return value.replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase()
}

export function initialsFromName(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const initials = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[words.length - 1][0]}`
  return normalizeInitials(initials)
}

export function createBaseHandleFromDisplayName(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  const [firstName] = words
  const lastInitial = words.length > 1 ? words[words.length - 1][0] : ''
  return normalizeUserHandle(`${firstName}${lastInitial}`).replace(/[._-]+/g, '')
}
