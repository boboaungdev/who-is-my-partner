"use client"

import * as React from "react"
import {
  Bell,
  Bookmark,
  Check,
  Compass,
  Globe,
  HeartHandshake,
  Info,
  Link,
  LogIn,
  LogOut,
  Mail,
  MessageCircle,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { APP_NAME } from "@/constants"
import {
  createIncomingRequestNotification,
  getSavedRequestNotifications,
  markRequestNotificationsRead,
  respondToIncomingRequest,
  REQUEST_NOTIFICATIONS_EVENT,
  type RequestNotification,
} from "@/lib/request-notifications"
import { cn } from "@/lib/utils"

type SignedInTab =
  | "discover"
  | "connections"
  | "notifications"
  | "me"
  | "profile"

type Props = {
  activeTab?: SignedInTab
  prefs: { name?: string; location?: string } | null
  userImage?: string | null
  onDiscover?: () => void
  onConnections?: () => void
  onEditProfile: () => void
  onHome: () => void
  onNotifications?: () => void
  onOpenNotificationProfile?: (notification: RequestNotification) => void
  onMe?: () => void
  onProfile?: () => void
  onSaved?: () => void
  onStart: () => void
  onSignOut: () => void
  onViewProfile: () => void
}

export default function NavBar({
  activeTab = "discover",
  prefs,
  userImage,
  onDiscover,
  onConnections,
  onEditProfile,
  onHome,
  onNotifications,
  onOpenNotificationProfile,
  onMe,
  onProfile,
  onSaved,
  onStart,
  onSignOut,
  onViewProfile,
}: Props) {
  const [notifications, setNotifications] = React.useState<
    RequestNotification[]
  >([])
  const unreadCount = notifications.filter((notification) => !notification.read)
    .length

  React.useEffect(() => {
    if (!prefs) {
      setNotifications([])
      return
    }

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
  }, [prefs])

  React.useEffect(() => {
    if (!prefs) return

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
  }, [prefs])

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={onHome}
            className="flex min-w-0 items-center gap-3 rounded-2xl text-left outline-none transition-opacity hover:opacity-85 focus-visible:ring-3 focus-visible:ring-ring/40"
            aria-label="Go to home"
          >
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary),white_18%),var(--primary))] text-primary-foreground shadow-[0_12px_30px_color-mix(in_oklch,var(--primary),transparent_72%)]">
              <HeartHandshake className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold leading-tight">{APP_NAME}</div>
              <div className="text-xs text-muted-foreground">
                {prefs ? "Your matches, one swipe away" : "Powered by BH Cozy"}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {!prefs ? (
              <>
                <ThemeToggle />
                <Button onClick={onStart} className="gap-2 rounded-full px-4">
                  <LogIn className="size-4" />
                  Start
                </Button>
              </>
            ) : (
              <>
                <div className="hidden md:block">
                  <NotificationBell
                    notifications={notifications}
                    onOpenNotificationProfile={onOpenNotificationProfile}
                    unreadCount={unreadCount}
                    onOpenNotifications={onNotifications}
                  />
                </div>
                <MenuAvatar
                  name={prefs.name}
                  location={prefs.location}
                  avatarSrc={userImage ?? undefined}
                  onEditProfile={onEditProfile}
                  onSaved={onSaved}
                  onViewProfile={onViewProfile}
                  onSignOut={onSignOut}
                />
              </>
            )}
          </div>
        </div>
      </nav>

      {prefs ? (
        <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between rounded-[2rem] border border-white/60 bg-background/88 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
            <BottomNavButton
              active={activeTab === "discover"}
              icon={<Compass className="size-5" />}
              label="Discover"
              onClick={onDiscover ?? onHome}
            />
            <BottomNavButton
              active={activeTab === "connections"}
              icon={<HeartHandshake className="size-5" />}
              label="Connections"
              onClick={onConnections}
            />
            <BottomNavButton
              active={activeTab === "notifications"}
              badge={unreadCount}
              icon={<Bell className="size-5" />}
              label="Notifications"
              onClick={onNotifications}
            />
            <BottomNavButton
              active={activeTab === "me"}
              icon={<UserRound className="size-5" />}
              label="Me"
              onClick={onMe ?? onProfile ?? onViewProfile}
            />
          </div>
        </div>
      ) : null}
    </>
  )
}

function NotificationBell({
  notifications,
  onOpenNotificationProfile,
  onOpenNotifications,
  unreadCount,
}: {
  notifications: RequestNotification[]
  onOpenNotificationProfile?: (notification: RequestNotification) => void
  onOpenNotifications?: () => void
  unreadCount: number
}) {
  const [open, setOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return
      const path = e.composedPath()
      if (!path.includes(wrapperRef.current)) setOpen(false)
    }

    document.addEventListener("click", onDoc)
    return () => document.removeEventListener("click", onDoc)
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
        className="relative flex size-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-border/70 bg-popover/96 text-popover-foreground shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border/60 p-4">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted-foreground">
                Requests and replies in one place
              </p>
            </div>
            {onOpenNotifications ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-full"
                onClick={() => {
                  setOpen(false)
                  onOpenNotifications()
                }}
              >
                Open
              </Button>
            ) : null}
          </div>
          {notifications.length ? (
            <ScrollArea className="h-[min(24rem,calc(100svh-8rem))]">
              <div className="space-y-1 p-2">
                {notifications.map((notification) => (
                  <NotificationRow
                    key={notification.id}
                    notification={notification}
                    onOpenProfile={(item) => {
                      setOpen(false)
                      onOpenNotificationProfile?.(item)
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="p-5 text-sm text-muted-foreground">
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
  onOpenProfile,
}: {
  notification: RequestNotification
  onOpenProfile?: (notification: RequestNotification) => void
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
    <div
      className="flex items-center gap-3 rounded-2xl p-3 transition hover:bg-muted/70"
      role="button"
      tabIndex={0}
      onClick={() => onOpenProfile?.(notification)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpenProfile?.(notification)
        }
      }}
    >
      {notification.profileImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={notification.profileImage}
          alt=""
          className="size-11 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted">
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
        <div
          className="flex shrink-0 gap-1"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Button
            type="button"
            size="icon-sm"
            aria-label={`Accept ${notification.profileName}'s request`}
            onClick={(event) => {
              event.stopPropagation()
              respondToIncomingRequest(notification.id, "accepted")
            }}
            className="size-8 rounded-full"
          >
            <Check className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label={`Reject ${notification.profileName}'s request`}
            onClick={(event) => {
              event.stopPropagation()
              respondToIncomingRequest(notification.id, "rejected")
            }}
            className="size-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
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

function BottomNavButton({
  active,
  badge,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  badge?: number
  icon: React.ReactNode
  label: string
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.4rem] px-3 py-2 text-[11px] font-medium text-muted-foreground transition active:scale-[0.98]",
        active &&
          "bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary),white_82%),color-mix(in_oklch,var(--primary),transparent_85%))] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] dark:bg-[linear-gradient(180deg,color-mix(in_oklch,var(--primary),black_58%),color-mix(in_oklch,var(--primary),transparent_86%))]"
      )}
      aria-current={active ? "page" : undefined}
    >
      <span
        className={cn(
          "relative flex size-10 items-center justify-center rounded-full transition",
          active
            ? "bg-primary text-primary-foreground shadow-[0_10px_24px_color-mix(in_oklch,var(--primary),transparent_68%)]"
            : "bg-muted/70 text-muted-foreground"
        )}
      >
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground ring-2 ring-background">
            {badge > 9 ? "9+" : badge}
          </span>
        ) : null}
      </span>
      <span className="truncate">{label}</span>
    </button>
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
  onSaved,
  onViewProfile,
  onSignOut,
}: {
  avatarSrc?: string
  location?: string
  name?: string
  onEditProfile: () => void
  onSaved?: () => void
  onViewProfile: () => void
  onSignOut: () => void
}) {
  const [desktopOpen, setDesktopOpen] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [aboutOpen, setAboutOpen] = React.useState(false)
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const username = formatUsername(name)

  React.useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(e.target as Node)) setDesktopOpen(false)
    }
    document.addEventListener("click", onDoc)
    return () => document.removeEventListener("click", onDoc)
  }, [])

  function openAbout() {
    setDesktopOpen(false)
    setMobileOpen(false)
    setAboutOpen(true)
  }

  return (
    <>
      <div ref={wrapperRef} className="relative hidden md:block">
        <button
          aria-haspopup="menu"
          aria-expanded={desktopOpen}
          onClick={() => setDesktopOpen((s) => !s)}
          className="rounded-full outline-none ring-offset-background transition focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2"
        >
          <Avatar src={avatarSrc} name={name} />
        </button>

        {desktopOpen && (
          <div className="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-[1.5rem] border border-border/70 bg-popover/96 text-popover-foreground shadow-2xl backdrop-blur-xl">
            <button
              type="button"
              className="flex w-full items-center gap-3 border-b border-border/60 p-4 text-left hover:bg-muted/70"
              onClick={() => {
                setDesktopOpen(false)
                onViewProfile()
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
            <div className="p-2" role="menu">
              <MenuButton
                icon={<UserRound className="size-4" />}
                label="Profile"
                onClick={() => {
                  setDesktopOpen(false)
                  onViewProfile()
                }}
              />
              <MenuButton
                icon={<Bookmark className="size-4" />}
                label="Saved"
                onClick={() => {
                  setDesktopOpen(false)
                  onSaved?.()
                }}
              />
              <MenuButton
                description="Free"
                icon={<Rocket className="size-4" />}
                label="Upgrade plans"
              />
              <MenuButton
                icon={<Info className="size-4" />}
                label="About"
                onClick={openAbout}
              />
              <ThemeMenuButton />
              <button
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-destructive hover:bg-muted"
                onClick={() => {
                  setDesktopOpen(false)
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

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            aria-label="Open account menu"
            className="rounded-full outline-none ring-offset-background transition focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2 md:hidden"
          >
            <Avatar src={avatarSrc} name={name} />
          </button>
        </SheetTrigger>
        <SheetContent
          side="right"
          className="w-[min(19.5rem,calc(100vw-4rem))] rounded-l-[1.75rem] pb-6"
        >
          <SheetHeader>
            <SheetTitle>Account</SheetTitle>
            <SheetDescription>
              Profile and app preferences
            </SheetDescription>
          </SheetHeader>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-3 text-left"
            onClick={() => {
              setMobileOpen(false)
              onViewProfile()
            }}
          >
            <Avatar src={avatarSrc} name={name} size={44} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {name || "Your profile"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {username}
              </p>
            </div>
          </button>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-2">
              <MobileMenuButton
                icon={<UserRound className="size-4" />}
                label="Profile"
                onClick={() => {
                  setMobileOpen(false)
                  onViewProfile()
                }}
              />
              <MobileMenuButton
                icon={<Bookmark className="size-4" />}
                label="Saved"
                onClick={() => {
                  setMobileOpen(false)
                  onSaved?.()
                }}
              />
              <MobileMenuButton
                description="Free"
                icon={<Rocket className="size-4" />}
                label="Upgrade plans"
              />
              <MobileMenuButton
                icon={<Info className="size-4" />}
                label="About"
                onClick={openAbout}
              />
              <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
                <ThemeMenuButton />
              </div>
            </div>

            <div className="mt-auto border-t border-border/60 pt-4">
              <button
                className="flex w-full items-center gap-2 rounded-2xl border border-destructive/20 px-4 py-3 text-sm text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setMobileOpen(false)
                  onSignOut()
                }}
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={aboutOpen} onOpenChange={setAboutOpen}>
        <SheetContent
          side="right"
          className="w-[min(22rem,calc(100vw-2rem))] rounded-l-[1.75rem] overflow-hidden pb-6"
        >
          <SheetHeader className="border-b border-border/60 pb-4">
            <SheetTitle>About {APP_NAME}</SheetTitle>
            <SheetDescription>
              A calmer way to discover meaningful connections.
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="min-h-0 flex-1 pr-1">
            <div className="space-y-4">
              <div className="rounded-[1.5rem] border border-border/60 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary),white_84%),background)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary),black_68%),background)]">
                <div className="flex items-start gap-3">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-[0_12px_30px_color-mix(in_oklch,var(--primary),transparent_72%)]">
                    <HeartHandshake className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{APP_NAME}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Discover profiles, save the people you like, and respond to
                      incoming requests in one simple flow.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <AboutStat label="Discover" value="Swipe less, decide faster" />
                  <AboutStat label="Saved" value="Keep profiles close" />
                  <AboutStat label="Requests" value="Accept or reject instantly" />
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-border/60 bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  What you can do
                </p>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground">
                  <p>Browse new profiles in Discover.</p>
                  <p>Save people you want to revisit later.</p>
                  <p>Manage requested and incoming connections from one place.</p>
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-border/60 bg-background/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Follow along
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <AboutLink icon={<MessageCircle className="size-4" />} label="Community" />
                  <AboutLink icon={<Mail className="size-4" />} label="Email" />
                  <AboutLink icon={<Link className="size-4" />} label="Updates" />
                  <AboutLink icon={<Globe className="size-4" />} label="Website" />
                </div>
              </div>

              <div className="rounded-[1.25rem] border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Powered by
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-background text-foreground shadow-sm">
                    <HeartHandshake className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">BH Cozy</p>
                    <p className="text-sm text-muted-foreground">
                      Design, matching flow, and cozy product direction.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

function AboutStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/72 px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

function AboutLink({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      className="flex items-center gap-2 rounded-2xl border border-border/60 bg-muted/20 px-3 py-3 text-left text-sm font-medium transition hover:bg-muted/40"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span>{label}</span>
    </button>
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
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm hover:bg-muted"
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
      className="flex size-10 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40"
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
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-muted"
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

function MobileMenuButton({
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
      className="flex w-full items-center gap-3 rounded-2xl border border-border/60 px-4 py-3 text-left text-sm hover:bg-muted/40"
      onClick={onClick}
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        {description ? (
          <span className="block text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </button>
  )
}
