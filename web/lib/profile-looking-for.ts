const PROFILE_GOALS = [
  "Long-term partner",
  "Meaningful dates",
  "Friendship first",
  "Still exploring",
  "Casual dating",
]

export function getProfileLookingFor(seed?: string) {
  const source = seed || "profile"
  const total = source
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return PROFILE_GOALS[total % PROFILE_GOALS.length]
}
