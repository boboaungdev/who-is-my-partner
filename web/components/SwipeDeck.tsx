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
  const onLoadMoreRef = React.useRef(onLoadMore)
  const lastAutoLoadUserCountRef = React.useRef(0)

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
  const stackUsers = getStackUsers(deckUsers, activeIndex)

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
    <section className="mx-auto w-full max-w-[460px] space-y-3">
      <div className="text-center">
        <p className="text-sm font-semibold text-muted-foreground">
          Discover profiles
        </p>
      </div>

      <div className="relative mx-auto h-[560px] w-full max-w-[520px] overflow-hidden sm:h-[610px]">
        {stackUsers.map((item) => (
          <UserCard
            key={`${getProfileKey(item.user)}-${item.position}`}
            className={cn(
              "absolute top-0 w-[min(24rem,80vw)] transition-all duration-500 ease-out motion-safe:will-change-transform",
              getStackClass(item.position)
            )}
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
            onRequestSent={goNext}
            onSaveProfile={() => toggleSavedProfile(item.user)}
            showActions={item.position === "active"}
            showRequestMenu
            user={item.user}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 items-center gap-3">
        <Button
          variant="outline"
          size="lg"
          onClick={goPrevious}
          className="h-12 gap-2"
        >
          <ChevronLeft className="size-4" />
          Prev
        </Button>
        <Button
          size="lg"
          onClick={goNext}
          className="h-12 gap-2"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </section>
  )
}

function getStackUsers(users: User[], activeIndex: number) {
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

  return [
    { user: users[previousIndex], position: "previous" as const },
    { user: users[activeIndex], position: "active" as const },
    { user: users[nextIndex], position: "next" as const },
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
