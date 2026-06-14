"use client"

import * as React from "react"
import {
  HeartHandshake,
  LogOut,
  Moon,
  Rocket,
  Settings,
  SlidersHorizontal,
  Sun,
  UserRound,
} from "lucide-react"
import { useTheme } from "next-themes"

import Avatar from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { APP_NAME } from "@/constants"

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
            <div className="hidden text-xs text-muted-foreground sm:block">
              Powered by BH Cozy
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {!prefs ? (
            <>
              <ThemeToggle />
              <Button onClick={onStart} className="gap-2">
                <SlidersHorizontal className="size-4" />
                Get started
              </Button>
            </>
          ) : (
            <MenuAvatar
              name={prefs.name}
              location={prefs.location}
              avatarSrc={userImage ?? undefined}
              onEditProfile={onEditProfile}
              onSignOut={onSignOut}
            />
          )}
        </div>
      </div>
    </nav>
  )
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
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
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
