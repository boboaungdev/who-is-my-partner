"use client"

import React, { useState } from "react"
import {
  Heart,
  RotateCcw,
  Send,
  Sparkles,
  ThumbsDown,
  Trash2,
  Users,
  X,
} from "lucide-react"

import UserCard, { type User } from "./UserCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  getProfileKey,
  getSavedRequestedProfiles,
  REQUESTED_PROFILES_EVENT,
  saveRequestedProfiles,
} from "@/lib/profile-requests"

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

export default function SwipeDeck({
  getCountryFlagUrl,
  getLanguages,
  users,
  onLoadMore,
  onViewProfile,
}: {
  getCountryFlagUrl?: (user: DeckUser) => string | undefined
  getLanguages?: (user: DeckUser) => string[]
  users: DeckUser[]
  onLoadMore?: () => void
  onViewProfile?: (user: User) => void
}) {
  const [idx, setIdx] = useState(0)
  const [likedUsers, setLikedUsers] = useState<User[]>([])
  const [passedUsers, setPassedUsers] = useState<User[]>([])
  const [historyView, setHistoryView] = useState<"likes" | "passes" | null>(
    null
  )
  const [restored, setRestored] = useState(false)

  const safeUsers = users.filter(isCardUser)
  const current = safeUsers[idx]
  const completion = safeUsers.length
    ? Math.round(((idx + 1) / safeUsers.length) * 100)
    : 0

  const historyUsers = historyView === "likes" ? likedUsers : passedUsers
  const historyTitle =
    historyView === "likes" ? "Liked profiles" : "Passed profiles"

  React.useEffect(() => {
    if (idx >= safeUsers.length) setIdx(0)
  }, [idx, safeUsers.length])

  React.useEffect(() => {
    setLikedUsers(getSavedProfiles("wimp:liked-users:v1"))
    setPassedUsers(getSavedProfiles("wimp:passed-users:v1"))
    setRestored(true)
  }, [])

  React.useEffect(() => {
    if (!restored) return
    saveProfiles("wimp:liked-users:v1", likedUsers)
  }, [likedUsers, restored])

  React.useEffect(() => {
    if (!restored) return
    saveProfiles("wimp:passed-users:v1", passedUsers)
  }, [passedUsers, restored])

  function next(action?: "like" | "pass") {
    if (action === "like" && current) {
      setLikedUsers((users) => addUniqueProfile(users, current))
      setPassedUsers((users) => removeProfile(users, current))
    }
    if (action === "pass" && current) {
      setPassedUsers((users) => addUniqueProfile(users, current))
      setLikedUsers((users) => removeProfile(users, current))
    }

    const nextIndex = idx + 1
    if (nextIndex >= safeUsers.length) {
      setIdx(0)
      onLoadMore?.()
    } else {
      setIdx(nextIndex)
    }
  }

  if (!safeUsers.length) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted">
          <Users className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">No profiles available</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Try opening your preferences and widening the deck.
        </p>
        <Button onClick={onLoadMore} className="mt-5">
          Load more
        </Button>
      </Card>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="mx-auto w-full max-w-[480px] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Profile {idx + 1} of {safeUsers.length}
            </p>
            <h1 className="text-2xl font-semibold">Your curated deck</h1>
          </div>
          <Badge variant="warm" className="gap-1">
            <Sparkles className="size-3" />
            Live
          </Badge>
        </div>

        <Progress value={completion} />

        <UserCard
          countryFlagUrl={getCountryFlagUrl?.(current)}
          languages={getLanguages?.(current) ?? []}
          onProfileClick={() => onViewProfile?.(current)}
          user={current}
        />

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => next("pass")}
            className="h-12 gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
          >
            <ThumbsDown className="size-4" />
            Pass
          </Button>
          <Button
            variant="secondary"
            size="icon-lg"
            onClick={() => next()}
            aria-label="Skip profile"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            size="lg"
            onClick={() => next("like")}
            className="h-12 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Heart className="size-4" />
            Like
          </Button>
        </div>
      </section>

      <aside className="grid grid-cols-2 gap-3 self-start">
        <StatCard
          active={historyView === "passes"}
          label="Passes"
          onClick={() => setHistoryView("passes")}
          value={String(passedUsers.length)}
        />
        <StatCard
          active={historyView === "likes"}
          label="Likes"
          onClick={() => setHistoryView("likes")}
          tone="good"
          value={String(likedUsers.length)}
        />
      </aside>

      <Dialog
        open={historyView !== null}
        onOpenChange={(open) => {
          if (!open) setHistoryView(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{historyTitle}</DialogTitle>
            <DialogDescription>
              {historyUsers.length} profile
              {historyUsers.length === 1 ? "" : "s"} saved here.
            </DialogDescription>
          </DialogHeader>
          <HistoryList
            users={historyUsers}
            getCountryFlagUrl={getCountryFlagUrl}
            onRemove={(user) => {
              if (historyView === "likes") {
                setLikedUsers((users) => removeProfile(users, user))
              } else {
                setPassedUsers((users) => removeProfile(users, user))
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
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

function getSavedProfiles(key: string) {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(key)
    const users = raw ? JSON.parse(raw) : []
    return Array.isArray(users) ? users.filter(isCardUser) : []
  } catch {
    return []
  }
}

function saveProfiles(key: string, users: User[]) {
  try {
    localStorage.setItem(key, JSON.stringify(users))
  } catch {
    // ignore storage failures
  }
}

function StatCard({
  active,
  label,
  onClick,
  value,
  tone,
}: {
  active?: boolean
  label: string
  onClick?: () => void
  value: string
  tone?: "good" | "warm"
}) {
  const content = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1.5 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold">{value}</p>
        <span
          className={
            tone === "good"
              ? "size-2.5 rounded-full bg-emerald-500"
              : tone === "warm"
                ? "size-2.5 rounded-full bg-amber-500"
                : "size-2.5 rounded-full bg-muted-foreground/35"
          }
        />
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={[
          "w-full rounded-lg text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/40",
          active ? "ring-3 ring-primary/20" : "",
        ].join(" ")}
      >
        <Card className="p-3">{content}</Card>
      </button>
    )
  }

  return (
    <Card className="p-3">
      {content}
    </Card>
  )
}

function HistoryList({
  getCountryFlagUrl,
  onRemove,
  users,
}: {
  getCountryFlagUrl?: (user: User) => string | undefined
  onRemove: (user: User) => void
  users: User[]
}) {
  return (
    <div className="min-h-0">
      {users.length ? (
        <ScrollArea className="h-[min(30rem,calc(100svh-12rem))] pr-3">
          <div className="space-y-2">
            {users.map((user, index) => (
              <ProfileRow
                key={`${user.login?.uuid ?? user.name.first}-${index}`}
                countryFlagUrl={getCountryFlagUrl?.(user)}
                onRemove={() => onRemove(user)}
                user={user}
              />
            ))}
          </div>
        </ScrollArea>
      ) : (
        <p className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
          No profiles clicked yet.
        </p>
      )}
    </div>
  )
}

function ProfileRow({
  countryFlagUrl,
  onRemove,
  user,
}: {
  countryFlagUrl?: string
  onRemove: () => void
  user: User
}) {
  const profileKey = getProfileKey(user)
  const [requestedProfiles, setRequestedProfiles] = useState<string[]>(() =>
    getSavedRequestedProfiles()
  )
  const requested = requestedProfiles.includes(profileKey)
  const name = `${user.name.first} ${user.name.last}`
  const location = [user.location.city, user.location.country]
    .filter(Boolean)
    .join(", ")

  React.useEffect(() => {
    function syncRequestedProfiles() {
      setRequestedProfiles(getSavedRequestedProfiles())
    }

    window.addEventListener(REQUESTED_PROFILES_EVENT, syncRequestedProfiles)
    return () =>
      window.removeEventListener(REQUESTED_PROFILES_EVENT, syncRequestedProfiles)
  }, [])

  function toggleRequest() {
    const next = requested
      ? requestedProfiles.filter((key) => key !== profileKey)
      : [...requestedProfiles, profileKey]

    saveRequestedProfiles(next)
    setRequestedProfiles(next)
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-2.5 sm:flex-row sm:items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={user.picture.large}
        alt={name}
        className="size-11 shrink-0 rounded-full object-cover"
      />
      <div className="min-w-0 self-stretch sm:self-auto">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs capitalize text-muted-foreground">
          {user.gender ? `${user.gender} / ` : ""}
          {countryFlagUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={countryFlagUrl}
              alt=""
              className="mr-1 inline h-3 w-5 rounded-[2px] object-cover align-[-1px]"
            />
          ) : null}
          {location}
        </p>
      </div>
      <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
        <Button
          type="button"
          variant={requested ? "secondary" : "outline"}
          size="sm"
          onClick={toggleRequest}
          className="min-w-0 flex-1 gap-1.5 sm:flex-none"
        >
          {requested ? (
            <X className="size-3.5" />
          ) : (
            <Send className="size-3.5" />
          )}
          <span className="truncate">
            {requested ? "Cancel request" : "Send request"}
          </span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label={`Remove ${name}`}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  )
}
