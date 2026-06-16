"use client"

import React, { useState } from "react"
import { ChevronLeft, ChevronRight, Users } from "lucide-react"

import UserCard, { type User } from "./UserCard"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getProfileKey } from "@/lib/profile-requests"
import { cn } from "@/lib/utils"

type DeckUser = {
  gender?: string
  login?: { uuid?: string }
  name?: { first?: string; last?: string }
  location?: {
    street?: { number?: number; name?: string }
    city?: string
    state?: string
    country?: string
    postcode?: string | number
    coordinates?: { latitude?: string; longitude?: string }
    timezone?: { offset?: string; description?: string }
  }
  dob?: { date?: string; age?: number }
  registered?: { date?: string; age?: number }
  picture?: { large?: string }
  email?: string
  phone?: string
  cell?: string
  nat?: string
}

const AUTO_LOAD_THRESHOLD = 10
const SEEN_PROFILES_STORAGE_KEY = "wimp:seen-profile-keys:v1"
const LIKED_PROFILES_EVENT = "wimp:liked-users:change"

export default function SwipeDeck({
  getCountryFlagUrl,
  getHomeCountry,
  getLanguages,
  users,
  onLoadMore,
  onViewProfile,
}: {
  getCountryFlagUrl?: (user: DeckUser) => string | undefined
  getHomeCountry?: (user: DeckUser) => string | undefined
  getLanguages?: (user: DeckUser) => string[]
  users: DeckUser[]
  onLoadMore?: () => void
  onViewProfile?: (user: User) => void
}) {
  const [idx, setIdx] = useState(0)
  const [likedUsers, setLikedUsers] = useState<User[]>([])
  const [restored, setRestored] = useState(false)
  const [seenProfileKeys, setSeenProfileKeys] = useState<string[]>([])
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const onLoadMoreRef = React.useRef(onLoadMore)
  const lastAutoLoadUserCountRef = React.useRef(0)
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null)

  const safeUsers = users.filter(isCardUser)
  const preferredCurrent = safeUsers[idx]
  const preferredCurrentKey = preferredCurrent
    ? getProfileKey(preferredCurrent)
    : undefined
  const hiddenProfileKeys = React.useMemo(() => {
    const hidden = new Set(seenProfileKeys)

    likedUsers.forEach((user) => {
      const profileKey = getProfileKey(user)
      if (profileKey !== preferredCurrentKey) {
        hidden.add(profileKey)
      }
    })

    return hidden
  }, [likedUsers, preferredCurrentKey, seenProfileKeys])
  const deckUsers = safeUsers.filter(
    (user) => !hiddenProfileKeys.has(getProfileKey(user))
  )
  const current =
    deckUsers.find((user) => getProfileKey(user) === preferredCurrentKey) ??
    deckUsers[idx] ??
    deckUsers[0]
  const activeIndex = current
    ? Math.max(
        0,
        deckUsers.findIndex((user) => getProfileKey(user) === getProfileKey(current))
      )
    : 0
  const dragDirection =
    dragOffset > 0 ? "previous" : dragOffset < 0 ? "next" : "next"
  const stackUsers = getStackUsers(deckUsers, activeIndex, dragDirection)

  React.useEffect(() => {
    if (idx >= deckUsers.length) setIdx(0)
  }, [idx, deckUsers.length])

  React.useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  React.useEffect(() => {
    if (safeUsers.length === 0) return
    if (deckUsers.length > AUTO_LOAD_THRESHOLD) return
    if (lastAutoLoadUserCountRef.current === safeUsers.length) return

    lastAutoLoadUserCountRef.current = safeUsers.length
    onLoadMoreRef.current?.()
  }, [deckUsers.length, safeUsers.length])

  React.useEffect(() => {
    setLikedUsers(getSavedProfiles("wimp:liked-users:v1"))
    setSeenProfileKeys(getSavedProfileKeys(SEEN_PROFILES_STORAGE_KEY))
    setRestored(true)
  }, [])

  React.useEffect(() => {
    if (!restored) return
    saveProfiles("wimp:liked-users:v1", likedUsers)
  }, [likedUsers, restored])

  React.useEffect(() => {
    if (!restored) return
    saveProfileKeys(SEEN_PROFILES_STORAGE_KEY, seenProfileKeys)
  }, [restored, seenProfileKeys])

  function markProfileSeen(user: User) {
    const profileKey = getProfileKey(user)

    setSeenProfileKeys((keys) =>
      keys.includes(profileKey) ? keys : [...keys, profileKey]
    )
  }

  function goNext() {
    if (!deckUsers.length) return
    setIdx((currentIdx) => (currentIdx + 1) % deckUsers.length)
  }

  function goPrevious() {
    if (!deckUsers.length) return
    setIdx((currentIdx) => (currentIdx - 1 + deckUsers.length) % deckUsers.length)
  }

  function toggleSavedProfile(user: User) {
    const isSaved = likedUsers.some(
      (item) => getProfileKey(item) === getProfileKey(user)
    )

    setLikedUsers((users) =>
      isSaved ? removeProfile(users, user) : addUniqueProfile(users, user)
    )
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    if (!touch) return

    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    setIsDragging(true)
    setDragOffset(0)
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current
    const touch = event.touches[0]

    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      setDragOffset(0)
      return
    }

    if (event.cancelable) {
      event.preventDefault()
    }

    setDragOffset(Math.max(-120, Math.min(120, deltaX)))
  }

  function handleTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null

    if (!start || !touch) {
      setIsDragging(false)
      setDragOffset(0)
      return
    }

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y

    setIsDragging(false)
    setDragOffset(0)

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) <= Math.abs(deltaY)) return
    if (deltaX < 0) {
      goNext()
      return
    }

    goPrevious()
  }

  if (!safeUsers.length) {
    return <DeckSkeleton />
  }

  if (!deckUsers.length) {
    return (
      <Card className="mx-auto w-full max-w-xl text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted">
          <Users className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">No fresh profiles</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Profiles you already viewed or saved are hidden from Discover.
        </p>
      </Card>
    )
  }

  return (
    <section className="mx-auto w-full max-w-[560px] space-y-3">
      <div className="text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Discover profiles
        </p>
      </div>

      <div className="mx-auto flex w-full max-w-[560px] items-center justify-center gap-3 sm:gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={goPrevious}
          className="hidden size-12 shrink-0 rounded-full border-border/70 bg-background/92 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:inline-flex"
          aria-label="Previous profile"
        >
          <ChevronLeft className="size-5" />
        </Button>

        <div
          className="relative mx-auto h-[560px] w-full max-w-[520px] overflow-hidden sm:h-[610px]"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={() => {
            touchStartRef.current = null
            setIsDragging(false)
            setDragOffset(0)
          }}
        >
          {stackUsers.map((item) => (
            <UserCard
              key={`${getProfileKey(item.user)}-${item.position}`}
              className={cn(
                "absolute top-0 w-[min(24rem,80vw)] ease-out motion-safe:will-change-transform",
                item.position === "active"
                  ? isDragging
                    ? "transition-none"
                    : "transition-transform duration-200 sm:duration-500"
                  : "transition-all duration-500",
                getStackClass(item.position)
              )}
              style={
                getCardDragStyle(
                  item.position,
                  dragOffset
                )
              }
              countryFlagUrl={getCountryFlagUrl?.(item.user)}
              homeCountry={getHomeCountry?.(item.user)}
              languages={getLanguages?.(item.user) ?? []}
              onHideProfile={() => {
                markProfileSeen(item.user)
                setIdx(0)
              }}
              onProfileClick={() => {
                onViewProfile?.(item.user)
              }}
              onSaveProfile={() => toggleSavedProfile(item.user)}
              showActions={item.position === "active"}
              showRequestMenu
              user={item.user}
            />
          ))}
        </div>

        <Button
          size="icon"
          onClick={goNext}
          className="hidden size-12 shrink-0 rounded-full shadow-[0_14px_30px_color-mix(in_oklch,var(--primary),transparent_72%)] sm:inline-flex"
          aria-label="Next profile"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <p className="px-1 text-center text-xs text-muted-foreground sm:hidden">
        Hold and swipe left or right to browse profiles.
      </p>
    </section>
  )
}

function getStackUsers(
  users: User[],
  activeIndex: number,
  dragDirection: "previous" | "next"
) {
  if (users.length <= 1) {
    return users[0] ? [{ user: users[0], position: "active" as const }] : []
  }

  const previousIndex = (activeIndex - 1 + users.length) % users.length
  const nextIndex = (activeIndex + 1) % users.length

  if (users.length === 2) {
    return [
      { user: users[activeIndex], position: "active" as const },
      { user: users[nextIndex], position: "next" as const },
    ]
  }

  const hintPosition =
    dragDirection === "previous" ? "previous" : "next"
  const hintUser =
    hintPosition === "previous" ? users[previousIndex] : users[nextIndex]

  return [
    { user: hintUser, position: hintPosition as "previous" | "next" },
    { user: users[activeIndex], position: "active" as const },
  ]
}

function getStackClass(position: "previous" | "active" | "next") {
  if (position === "previous") {
    return "left-[3%] z-10 translate-y-5 rotate-[-3deg] scale-[0.92] opacity-45 pointer-events-none"
  }
  if (position === "next") {
    return "right-[3%] z-20 translate-y-5 rotate-[3deg] scale-[0.92] opacity-45 pointer-events-none"
  }

  return "left-1/2 z-30 -translate-x-1/2 translate-y-0 rotate-0 scale-100 opacity-100 shadow-xl shadow-primary/5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-4"
}

function getCardDragStyle(
  position: "previous" | "active" | "next",
  dragOffset: number
): React.CSSProperties | undefined {
  if (position === "active") {
    if (dragOffset === 0) return undefined

    return {
      transform: `translateX(calc(-50% + ${dragOffset}px)) translateY(0px) rotate(${
        dragOffset / 18
      }deg) scale(1)`,
      opacity: Math.max(0.86, 1 - Math.abs(dragOffset) / 260),
    }
  }

  const revealProgress = Math.min(Math.abs(dragOffset) / 120, 1)

  if (position === "previous" && dragOffset > 0) {
    return {
      zIndex: 24,
      transform: `translateY(${20 - revealProgress * 12}px) rotate(${
        -3 + revealProgress * 1.5
      }deg) scale(${0.92 + revealProgress * 0.06})`,
      opacity: 0.45 + revealProgress * 0.35,
    }
  }

  if (position === "next" && dragOffset < 0) {
    return {
      zIndex: 24,
      transform: `translateY(${20 - revealProgress * 12}px) rotate(${
        3 - revealProgress * 1.5
      }deg) scale(${0.92 + revealProgress * 0.06})`,
      opacity: 0.45 + revealProgress * 0.35,
    }
  }

  return undefined
}

function DeckSkeleton() {
  return (
    <section className="mx-auto w-full max-w-[480px] space-y-4">
      <div className="text-center">
        <Skeleton className="mx-auto h-4 w-24" />
      </div>
      <Card className="mx-auto w-[min(26rem,82vw)] overflow-hidden p-0">
        <Skeleton className="h-28 w-full rounded-none" />
        <div className="-mt-16 flex flex-col items-center p-5 pt-0 text-center">
          <Skeleton className="size-36 rounded-full border-4 border-background" />
          <Skeleton className="mt-5 h-6 w-48" />
          <Skeleton className="mt-2 h-4 w-28" />
          <div className="mt-5 grid w-full gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </Card>
    </section>
  )
}

function isCardUser(user: DeckUser): user is User {
  return Boolean(
    user.name?.first &&
      user.name?.last &&
      user.location?.city &&
      user.location?.country &&
      user.picture?.large
  )
}

function addUniqueProfile(users: User[], user: User) {
  return users.some((item) => getProfileKey(item) === getProfileKey(user))
    ? users
    : [...users, user]
}

function removeProfile(users: User[], user: User) {
  return users.filter((item) => getProfileKey(item) !== getProfileKey(user))
}

function getSavedProfiles(key: string, fallbackKey?: string) {
  if (typeof window === "undefined") return []

  try {
    const raw =
      localStorage.getItem(key) ??
      (fallbackKey ? localStorage.getItem(fallbackKey) : null)
    const users = raw ? JSON.parse(raw) : []
    return Array.isArray(users) ? users.filter(isCardUser) : []
  } catch {
    return []
  }
}

function saveProfiles(key: string, users: User[]) {
  try {
    localStorage.setItem(key, JSON.stringify(users))
    if (key === "wimp:liked-users:v1") {
      window.dispatchEvent(new CustomEvent(LIKED_PROFILES_EVENT))
    }
  } catch {
    // ignore storage failures
  }
}

function getSavedProfileKeys(key: string) {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(key)
    const keys = raw ? JSON.parse(raw) : []
    return Array.isArray(keys)
      ? keys.filter((item): item is string => typeof item === "string")
      : []
  } catch {
    return []
  }
}

function saveProfileKeys(key: string, keys: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(keys))))
  } catch {
    // ignore storage failures
  }
}
