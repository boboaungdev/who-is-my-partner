"use client"

import * as React from "react"
import {
  Bell,
  Check,
  HeartHandshake,
  LogIn,
  LogOut,
  Moon,
  Rocket,
  Settings,
  Sun,
  UserRound,
  X,
} from "lucide-react"
import { useTheme } from "next-themes"

import Avatar from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { APP_NAME } from "@/constants"
import {
  createIncomingRequestNotification,
  getSavedRequestNotifications,
  markRequestNotificationsRead,
  REQUEST_NOTIFICATIONS_EVENT,
  respondToIncomingRequest,
  type RequestNotification,
} from "@/lib/request-notifications"

type Props = {
  prefs: { name?: string; location?: string } | null
  userImage?: string | null
  onHome: () => void
  onEditProfile: () => void
  onStart: () => void
  onSignOut: () => void
}

export default function NavBar({
  prefs,
  userImage,
  onEditProfile,
  onHome,
  onStart,
  onSignOut,
}: Props) {
  return (
    <nav className="sticky top-0 z-40 border-b bg-background/88 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <button
          type="button"
          onClick={onHome}
          className="flex min-w-0 items-center gap-3 rounded-md text-left outline-none transition-opacity hover:opacity-85 focus-visible:ring-3 focus-visible:ring-ring/40"
          aria-label="Go to home"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <HeartHandshake className="size-5" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold leading-tight">{APP_NAME}</div>
            <div className="text-xs text-muted-foreground">
              Powered by BH Cozy
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {!prefs ? (
            <>
              <ThemeToggle />
              <Button onClick={onStart} className="gap-2">
                <LogIn className="size-4" />
                Start
              </Button>
            </>
          ) : (
            <>
              <NotificationBell />
              <MenuAvatar
                name={prefs.name}
                location={prefs.location}
                avatarSrc={userImage ?? undefined}
                onEditProfile={onEditProfile}
                onSignOut={onSignOut}
              />
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

function NotificationBell() {
  const [open, setOpen] = React.useState(false)
  const [notifications, setNotifications] = React.useState<
    RequestNotification[]
  >([])
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const unreadCount = notifications.filter((notification) => !notification.read)
    .length

  React.useEffect(() => {
    function syncNotifications() {
      setNotifications(getSavedRequestNotifications())
    }

    syncNotifications()
    window.addEventListener(REQUEST_NOTIFICATIONS_EVENT, syncNotifications)
    return () =>
      window.removeEventListener(
        REQUEST_NOTIFICATIONS_EVENT,
        syncNotifications
      )
  }, [])

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }

    document.addEventListener("click", onDoc)
    return () => document.removeEventListener("click", onDoc)
  }, [])

  React.useEffect(() => {
    let timeoutId: number | undefined

    function scheduleNextIncomingRequest() {
      const delay = getRandomIncomingRequestDelay()

      timeoutId = window.setTimeout(() => {
        createIncomingRequestNotification()
        scheduleNextIncomingRequest()
      }, delay)
    }

    scheduleNextIncomingRequest()

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [])

  function toggleOpen() {
    const nextOpen = !open

    setOpen(nextOpen)
    if (nextOpen && unreadCount > 0) {
      window.setTimeout(markRequestNotificationsRead, 0)
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggleOpen}
        className="relative flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
          <div className="border-b p-3">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          {notifications.length ? (
            <ScrollArea className="h-[min(22rem,calc(100svh-8rem))]">
              <div className="p-1">
                {notifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              No request updates yet.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}

function NotificationRow({
  notification,
}: {
  notification: RequestNotification
}) {
  const accepted = notification.status === "accepted"
  const pendingIncoming =
    notification.direction === "incoming" && notification.status === "pending"
  const detail =
    notification.direction === "incoming"
      ? notification.status === "pending"
        ? "Sent you a request"
        : accepted
          ? "You accepted this request"
          : "You rejected this request"
      : accepted
        ? "Accepted your request"
        : "Rejected your request"

  return (
    <div className="flex items-center gap-3 rounded-md p-2.5 hover:bg-muted">
      {notification.profileImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={notification.profileImage}
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserRound className="size-4 text-muted-foreground" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {notification.profileName}
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {pendingIncoming ? (
        <div className="flex shrink-0 gap-1">
          <Button
            type="button"
            size="icon-sm"
            aria-label={`Accept ${notification.profileName}'s request`}
            onClick={() => respondToIncomingRequest(notification.id, "accepted")}
            className="size-8"
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={`Reject ${notification.profileName}'s request`}
            onClick={() => respondToIncomingRequest(notification.id, "rejected")}
            className="size-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="size-4" />
          </Button>
        </div>
      ) : (
        <span
          className={[
            "shrink-0 rounded-full px-2 py-1 text-xs font-medium",
            accepted
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
          ].join(" ")}
        >
          {accepted ? "Accepted" : "Rejected"}
        </span>
      )}
    </div>
  )
}

function getRandomIncomingRequestDelay() {
  const minDelay = 10000
  const maxDelay = 60000

  return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay
}

function MenuAvatar({
  avatarSrc,
  name,
  onEditProfile,
  onSignOut,
}: {
  avatarSrc?: string
  location?: string
  name?: string
  onEditProfile: () => void
  onSignOut: () => void
}) {
  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const username = formatUsername(name)

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("click", onDoc)
    return () => document.removeEventListener("click", onDoc)
  }, [])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        className="rounded-full outline-none ring-offset-background transition focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2"
      >
        <Avatar src={avatarSrc} name={name} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl">
          <button
            type="button"
            className="flex w-full items-center gap-3 border-b p-3 text-left hover:bg-muted"
            onClick={() => {
              setOpen(false)
              onEditProfile()
            }}
          >
            <Avatar src={avatarSrc} name={name} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {name || "Your profile"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {username}
              </p>
            </div>
          </button>
          <div className="p-1" role="menu">
            <MenuButton
              icon={<UserRound className="size-4" />}
              label="Profile"
              onClick={() => {
                setOpen(false)
                onEditProfile()
              }}
            />
            <MenuButton icon={<Settings className="size-4" />} label="Settings" />
            <MenuButton
              description="Free"
              icon={<Rocket className="size-4" />}
              label="Upgrade plans"
            />
            <ThemeMenuButton />
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-muted"
              onClick={() => {
                setOpen(false)
                onSignOut()
              }}
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatUsername(name?: string) {
  const handle = (name ?? "user")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")

  return `@${handle || "user"}`
}

function ThemeMenuButton() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const isDark = mounted && resolvedTheme === "dark"
  const Icon = isDark ? Moon : Sun

  return (
    <div
      className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-sm hover:bg-muted"
      role="menuitem"
    >
      <span className="flex items-center gap-2">
        <Icon className="size-4" />
        Dark mode
      </span>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label="Toggle dark mode"
      />
    </div>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex size-9 items-center justify-center rounded-full text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  )
}

function useMounted() {
  return React.useSyncExternalStore(
    React.useCallback(() => () => undefined, []),
    () => true,
    () => false
  )
}

function MenuButton({
  description,
  icon,
  label,
  onClick,
}: {
  description?: string
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
      onClick={onClick}
    >
      {icon}
      <span className="min-w-0">
        <span className="block">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}
