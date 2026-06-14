import type { User } from "@/components/UserCard"

export const REQUESTED_PROFILES_STORAGE_KEY = "wimp:requested-profiles:v1"
export const REQUESTED_PROFILES_EVENT = "wimp:requested-profiles:change"

export function getProfileKey(user: User) {
  return user.login?.uuid ?? `${user.name.first}-${user.name.last}`
}

export function getSavedRequestedProfiles() {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(REQUESTED_PROFILES_STORAGE_KEY)
    const keys = raw ? JSON.parse(raw) : []
    return Array.isArray(keys)
      ? keys.filter((key): key is string => typeof key === "string")
      : []
  } catch {
    return []
  }
}

export function saveRequestedProfiles(keys: string[]) {
  try {
    localStorage.setItem(REQUESTED_PROFILES_STORAGE_KEY, JSON.stringify(keys))
    window.dispatchEvent(new CustomEvent(REQUESTED_PROFILES_EVENT))
  } catch {
    // ignore storage failures
  }
}
