"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ProfileBadge } from "@/lib/profile-badges"

export default function ProfileStatusIcons({
  badges,
  iconClassName = "size-5",
  seed,
}: {
  badges: ProfileBadge[]
  iconClassName?: string
  seed?: string | null
}) {
  if (badges.length === 0) return null

  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {badges.map((badge) => (
        <ProfileStatusButton
          key={badge.tone}
          badge={badge}
          iconClassName={iconClassName}
          seed={seed}
        />
      ))}
    </span>
  )
}

function ProfileStatusButton({
  badge,
  iconClassName,
  seed,
}: {
  badge: ProfileBadge
  iconClassName: string
  seed?: string | null
}) {
  const Icon = badge.Icon
  const isVerified = badge.tone === "verified"
  const stats = getBadgeStats(badge, seed)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${badge.label} stats`}
          title={badge.label}
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-sm outline-none transition hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/40",
            isVerified ? "text-primary" : "text-amber-500"
          )}
        >
          <Icon
            className={cn("fill-current", iconClassName)}
            fill={isVerified ? "var(--primary)" : "currentColor"}
            stroke={isVerified ? "var(--primary-foreground)" : "currentColor"}
            strokeWidth={isVerified ? 3 : 2}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-64 p-0">
        <div className="border-b p-3">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex",
                isVerified ? "text-primary" : "text-amber-500"
              )}
            >
              <Icon
                className="size-5 fill-current"
                fill={isVerified ? "var(--primary)" : "currentColor"}
                stroke={
                  isVerified ? "var(--primary-foreground)" : "currentColor"
                }
                strokeWidth={isVerified ? 3 : 2}
              />
            </span>
            <p className="text-sm font-semibold">{badge.label}</p>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {stats.detail}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 p-3">
          <StatusStat label={stats.primaryLabel} value={stats.primaryValue} />
          <StatusStat label={stats.secondaryLabel} value={stats.secondaryValue} />
        </div>
      </PopoverContent>
    </Popover>
  )
}

function StatusStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/35 p-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function getBadgeStats(badge: ProfileBadge, seed?: string | null) {
  const score = getSeedScore(seed)

  if (badge.tone === "vip") {
    return {
      detail: "Priority profile with higher discovery placement.",
      primaryLabel: "Boost",
      primaryValue: `${82 + (score % 16)}%`,
      secondaryLabel: "Tier",
      secondaryValue: "VIP",
    }
  }

  return {
    detail: "Profile identity passed the app verification check.",
    primaryLabel: "Trust",
    primaryValue: `${90 + (score % 10)}%`,
    secondaryLabel: "Status",
    secondaryValue: "Checked",
  }
}

function getSeedScore(seed?: string | null) {
  return Array.from(seed || "profile").reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0
  )
}
