"use client"

import React, { useState } from "react"
import {
  Heart,
  MessageCircle,
  RotateCcw,
  Send,
  SkipForward,
  Trash2,
  Users,
  X,
} from "lucide-react"

import UserCard, { type User } from "./UserCard"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  getProfileKey,
  getSavedRequestedProfiles,
  REQUESTED_PROFILES_EVENT,
  saveRequestedProfiles,
} from "@/lib/profile-requests"
import {
  getLatestRequestStatus,
  REQUEST_NOTIFICATIONS_EVENT,
  scheduleFakeRequestOutcome,
} from "@/lib/request-notifications"
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
  const [requestedProfiles, setRequestedProfiles] = useState<string[]>([])
  const [historyView, setHistoryView] = useState<"likes" | "requests" | null>(
    null
  )
  const [clearLikesOpen, setClearLikesOpen] = useState(false)
  const [clearRequestsOpen, setClearRequestsOpen] = useState(false)
  const [restored, setRestored] = useState(false)
  const [seenProfileKeys, setSeenProfileKeys] = useState<string[]>([])
  const onLoadMoreRef = React.useRef(onLoadMore)
  const lastAutoLoadUserCountRef = React.useRef(0)

  const safeUsers = users.filter(isCardUser)
  const hiddenProfileKeys = React.useMemo(
    () => new Set([...likedUsers.map(getProfileKey), ...seenProfileKeys]),
    [likedUsers, seenProfileKeys]
  )
  const deckUsers = safeUsers.filter(
    (user) => !hiddenProfileKeys.has(getProfileKey(user))
  )
  const current = deckUsers[idx]
  const stackUsers = getStackUsers(deckUsers, idx)

  const requestedUsers = safeUsers.filter((user) =>
    requestedProfiles.includes(getProfileKey(user))
  )
  const historyUsers = historyView === "likes" ? likedUsers : requestedUsers
  const historyTitle =
    historyView === "likes" ? "Liked profiles" : "Requested profiles"

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
    setRequestedProfiles(getSavedRequestedProfiles())
    setRestored(true)
  }, [])

  React.useEffect(() => {
    function syncRequestedProfiles() {
      setRequestedProfiles(getSavedRequestedProfiles())
    }

    window.addEventListener(REQUESTED_PROFILES_EVENT, syncRequestedProfiles)
    return () =>
      window.removeEventListener(REQUESTED_PROFILES_EVENT, syncRequestedProfiles)
  }, [])

  React.useEffect(() => {
    if (!restored) return
    saveProfiles("wimp:liked-users:v1", likedUsers)
  }, [likedUsers, restored])

  function next(action?: "like" | "skip") {
    if (action === "like" && current) {
      setLikedUsers((users) => addUniqueProfile(users, current))
    }

    if (current) {
      const currentKey = getProfileKey(current)
      setSeenProfileKeys((keys) =>
        keys.includes(currentKey) ? keys : [...keys, currentKey]
      )
    }

    setIdx(0)
    if (deckUsers.length <= AUTO_LOAD_THRESHOLD) {
      onLoadMore?.()
    }
  }

  function restartViewedProfiles() {
    setSeenProfileKeys([])
    setIdx(0)
  }

  function clearLikedProfiles() {
    setLikedUsers([])
    setSeenProfileKeys([])
    setIdx(0)
    try {
      localStorage.setItem("wimp:liked-users:v1", "[]")
    } catch {
      // ignore storage failures
    }
  }

  function clearRequestedProfiles() {
    setRequestedProfiles([])
    saveRequestedProfiles([])
  }

  if (!safeUsers.length) {
    return <DeckSkeleton />
  }

  if (!deckUsers.length) {
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="mx-auto w-full max-w-xl text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-xl font-semibold">No fresh profiles</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Profiles you already viewed are hidden from the deck.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={restartViewedProfiles}
              className="gap-2"
            >
              <RotateCcw className="size-4" />
              Start over
            </Button>
          </div>
        </Card>

        <aside className="grid grid-cols-2 gap-3 self-start">
          <StatCard
            active={historyView === "requests"}
            label="Requested"
            onClick={() => setHistoryView("requests")}
            value={String(requestedUsers.length)}
          />
          <StatCard
            active={historyView === "likes"}
            label="Likes"
            onClick={() => setHistoryView("likes")}
            tone="good"
            value={String(likedUsers.length)}
          />
        </aside>

        <HistoryDialog
          getCountryFlagUrl={getCountryFlagUrl}
          historyTitle={historyTitle}
          historyUsers={historyUsers}
          historyView={historyView}
          onClose={() => setHistoryView(null)}
          onProfileClick={(user) => {
            setHistoryView(null)
            onViewProfile?.(user)
          }}
          onRemove={(user) => {
            if (historyView === "likes") {
              setLikedUsers((users) => removeProfile(users, user))
            }
          }}
          onClearLikes={() => setClearLikesOpen(true)}
          onClearRequests={() => setClearRequestsOpen(true)}
        />
        <ClearHistoryDialog
          actionLabel="Clear liked"
          description="This will remove every profile from your Likes list. Those profiles can appear in your deck again."
          open={clearLikesOpen}
          title="Clear liked profiles?"
          onConfirm={clearLikedProfiles}
          onOpenChange={setClearLikesOpen}
        />
        <ClearHistoryDialog
          actionLabel="Clear requested"
          description="This will remove every profile from your Requested list."
          open={clearRequestsOpen}
          title="Clear requested profiles?"
          onConfirm={clearRequestedProfiles}
          onOpenChange={setClearRequestsOpen}
        />
      </div>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="mx-auto w-full max-w-[480px] space-y-4">
        <div className="text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            You may like
          </p>
        </div>

        <div className="relative mx-auto h-[620px] w-full max-w-[560px] overflow-hidden sm:h-[650px]">
          {stackUsers.map((item) => (
            <UserCard
              key={`${getProfileKey(item.user)}-${item.position}`}
              className={cn(
                "absolute top-0 w-[min(26rem,82vw)] transition-all duration-500 ease-out motion-safe:will-change-transform",
                getStackClass(item.position)
              )}
              countryFlagUrl={getCountryFlagUrl?.(item.user)}
              homeCountry={getHomeCountry?.(item.user)}
              languages={getLanguages?.(item.user) ?? []}
              onProfileClick={() => onViewProfile?.(item.user)}
              onRequestSent={() => next("skip")}
              showActions={item.position === "active"}
              user={item.user}
            />
          ))}
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => next("skip")}
            className="h-12 gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
          >
            <SkipForward className="size-4" />
            Skip
          </Button>
          <Button
            variant="secondary"
            size="icon-lg"
            onClick={() => next()}
            aria-label="Refresh profile"
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
          active={historyView === "requests"}
          label="Requested"
          onClick={() => setHistoryView("requests")}
          value={String(requestedUsers.length)}
        />
        <StatCard
          active={historyView === "likes"}
          label="Likes"
          onClick={() => setHistoryView("likes")}
          tone="good"
          value={String(likedUsers.length)}
        />
      </aside>

      <HistoryDialog
        getCountryFlagUrl={getCountryFlagUrl}
        historyTitle={historyTitle}
        historyUsers={historyUsers}
        historyView={historyView}
        onClose={() => setHistoryView(null)}
        onProfileClick={(user) => {
          setHistoryView(null)
          onViewProfile?.(user)
        }}
        onRemove={(user) => {
          if (historyView === "likes") {
            setLikedUsers((users) => removeProfile(users, user))
          }
        }}
        onClearLikes={() => setClearLikesOpen(true)}
        onClearRequests={() => setClearRequestsOpen(true)}
      />
      <ClearHistoryDialog
        actionLabel="Clear liked"
        description="This will remove every profile from your Likes list. Those profiles can appear in your deck again."
        open={clearLikesOpen}
        title="Clear liked profiles?"
        onConfirm={clearLikedProfiles}
        onOpenChange={setClearLikesOpen}
      />
      <ClearHistoryDialog
        actionLabel="Clear requested"
        description="This will remove every profile from your Requested list."
        open={clearRequestsOpen}
        title="Clear requested profiles?"
        onConfirm={clearRequestedProfiles}
        onOpenChange={setClearRequestsOpen}
      />
    </div>
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

function HistoryDialog({
  getCountryFlagUrl,
  historyTitle,
  historyUsers,
  historyView,
  onClose,
  onClearLikes,
  onClearRequests,
  onProfileClick,
  onRemove,
}: {
  getCountryFlagUrl?: (user: User) => string | undefined
  historyTitle: string
  historyUsers: User[]
  historyView: "likes" | "requests" | null
  onClose: () => void
  onClearLikes: () => void
  onClearRequests: () => void
  onProfileClick: (user: User) => void
  onRemove: (user: User) => void
}) {
  const canClear = historyUsers.length > 0
  const clearLabel = historyView === "likes" ? "Clear liked" : "Clear requested"
  const onClear = historyView === "likes" ? onClearLikes : onClearRequests

  return (
    <Dialog
      open={historyView !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-7">
            <div>
              <DialogTitle>{historyTitle}</DialogTitle>
              <DialogDescription>
                {historyUsers.length} profile
                {historyUsers.length === 1 ? "" : "s"} saved here.
              </DialogDescription>
            </div>
            {historyView && canClear ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClear}
                className="gap-1.5"
              >
                <Trash2 className="size-3.5" />
                {clearLabel}
              </Button>
            ) : null}
          </div>
        </DialogHeader>
        <HistoryList
          users={historyUsers}
          getCountryFlagUrl={getCountryFlagUrl}
          canRemoveRows={historyView === "likes"}
          onProfileClick={onProfileClick}
          onRemove={onRemove}
        />
      </DialogContent>
    </Dialog>
  )
}

function ClearHistoryDialog({
  actionLabel,
  description,
  onConfirm,
  onOpenChange,
  open,
  title,
}: {
  actionLabel: string
  description: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  open: boolean
  title: string
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="gap-1.5">
            <Trash2 className="size-3.5" />
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function HistoryList({
  canRemoveRows,
  getCountryFlagUrl,
  onProfileClick,
  onRemove,
  users,
}: {
  canRemoveRows: boolean
  getCountryFlagUrl?: (user: User) => string | undefined
  onProfileClick: (user: User) => void
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
                canRemove={canRemoveRows}
                onProfileClick={() => onProfileClick(user)}
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
  canRemove,
  countryFlagUrl,
  onProfileClick,
  onRemove,
  user,
}: {
  canRemove: boolean
  countryFlagUrl?: string
  onProfileClick: () => void
  onRemove: () => void
  user: User
}) {
  const profileKey = getProfileKey(user)
  const [requestedProfiles, setRequestedProfiles] = useState<string[]>(() =>
    getSavedRequestedProfiles()
  )
  const [requestStatus, setRequestStatus] = useState<
    "accepted" | "rejected" | undefined
  >()
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

  React.useEffect(() => {
    function syncRequestStatus() {
      setRequestStatus(getLatestRequestStatus(profileKey))
    }

    syncRequestStatus()
    window.addEventListener(REQUEST_NOTIFICATIONS_EVENT, syncRequestStatus)
    return () =>
      window.removeEventListener(REQUEST_NOTIFICATIONS_EVENT, syncRequestStatus)
  }, [profileKey])

  function toggleRequest() {
    if (requestStatus) return

    const next = requested
      ? requestedProfiles.filter((key) => key !== profileKey)
      : [...requestedProfiles, profileKey]

    saveRequestedProfiles(next)
    setRequestedProfiles(next)
    if (!requested) scheduleFakeRequestOutcome(user)
  }

  const requestButton = getRequestButtonState(requestStatus, requested)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onProfileClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onProfileClick()
        }
      }}
      className="flex cursor-pointer flex-col gap-3 rounded-md border bg-muted/30 p-2.5 outline-none transition hover:bg-muted/45 focus-visible:ring-3 focus-visible:ring-ring/40 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={user.picture.large}
          alt={name}
          className="size-11 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0">
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
      </div>
      <div
        className="flex w-full gap-2 sm:ml-auto sm:w-auto"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <Button
          type="button"
          variant={requestButton.variant}
          size="sm"
          onClick={toggleRequest}
          disabled={requestButton.disabled}
          className="min-w-0 flex-1 gap-1.5 sm:flex-none"
        >
          {requestButton.icon}
          <span className="truncate">{requestButton.label}</span>
        </Button>
        {canRemove ? (
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
        ) : null}
      </div>
    </div>
  )
}

function getRequestButtonState(
  status: "accepted" | "rejected" | undefined,
  requested: boolean
) {
  if (status === "accepted") {
    return {
      disabled: false,
      icon: <MessageCircle className="size-3.5" />,
      label: "Message",
      variant: "default" as const,
    }
  }

  if (status === "rejected") {
    return {
      disabled: true,
      icon: <X className="size-3.5" />,
      label: "Rejected",
      variant: "secondary" as const,
    }
  }

  if (requested) {
    return {
      disabled: false,
      icon: <X className="size-3.5" />,
      label: "Cancel request",
      variant: "secondary" as const,
    }
  }

  return {
    disabled: false,
    icon: <Send className="size-3.5" />,
    label: "Send request",
    variant: "outline" as const,
  }
}
