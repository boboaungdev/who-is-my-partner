"use client"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import type { ProfileBadge } from "@/lib/profile-badges"

export default function ProfileStatusIcons({
  badges,
  iconClassName = "size-5",
}: {
  badges: ProfileBadge[]
  iconClassName?: string
}) {
  if (badges.length === 0) return null

  return (
    <span className="inline-flex shrink-0 items-center gap-1">
      {badges.map((badge) => (
        <ProfileStatusButton
          key={badge.tone}
          badge={badge}
          iconClassName={iconClassName}
        />
      ))}
    </span>
  )
}

function ProfileStatusButton({
  badge,
  iconClassName,
}: {
  badge: ProfileBadge
  iconClassName: string
}) {
  const Icon = badge.Icon
  const isVerified = badge.tone === "verified"
  const detail = getBadgeDetail(badge)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${badge.label} badge`}
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
      <PopoverContent align="center" className="w-48 p-3">
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
            {detail}
          </p>
      </PopoverContent>
    </Popover>
  )
}

function getBadgeDetail(badge: ProfileBadge) {
  if (badge.tone === "vip") {
    return "Priority profile."
  }

  return "Verified profile."
}
