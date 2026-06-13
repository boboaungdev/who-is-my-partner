import {
  BadgeCheck,
  Star,
  type LucideIcon,
} from "lucide-react"

export type ProfileBadge = {
  label: "VIP" | "Verified"
  tone: "vip" | "verified"
  Icon: LucideIcon
}

const BADGES: ProfileBadge[] = [
  { label: "VIP", tone: "vip", Icon: Star },
  { label: "Verified", tone: "verified", Icon: BadgeCheck },
]

export function getProfileBadges(seed?: string | null): ProfileBadge[] {
  const value = seed || "profile"
  const total = Array.from(value).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  )

  return BADGES.filter((badge, index) => {
    if (badge.tone === "vip") return total % 5 === 0 || total % 7 === 0
    return (total + index) % 3 !== 0
  })
}
