"use client"

import * as React from "react"
import Image from "next/image"
import {
  Check,
  Ban,
  Bookmark,
  BriefcaseBusiness,
  ChevronDown,
  Flag,
  HeartHandshake,
  House,
  Languages,
  MapPin,
  Mars,
  MessageCircle,
  Pencil,
  Send,
  Loader2,
  UserRound,
  Venus,
  VenusAndMars,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import ProfileStatusIcons from "@/components/ProfileStatusIcons"
import { getProfileBadges } from "@/lib/profile-badges"
import { getProfileLookingFor } from "@/lib/profile-looking-for"
import { cn } from "@/lib/utils"
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
  type RequestNotificationStatus,
} from "@/lib/request-notifications"

export type User = {
  gender?: string
  name: { title?: string; first: string; last: string }
  location: {
    street?: { number?: number; name?: string }
    city: string
    state?: string
    country: string
    postcode?: string | number
    coordinates?: { latitude?: string; longitude?: string }
    timezone?: { offset?: string; description?: string }
  }
  dob?: { date?: string; age?: number }
  registered?: { date?: string; age?: number }
  picture: { large: string }
  login?: { uuid?: string; username?: string }
  email?: string
  phone?: string
  cell?: string
  nat?: string
}

const LIKED_PROFILES_STORAGE_KEY = "wimp:liked-users:v1"
const LIKED_PROFILES_EVENT = "wimp:liked-users:change"

export default function UserCard({
  actionOverride,
  className,
  countryFlagUrl,
  homeCountry,
  languages = [],
  occupation,
  onHideProfile,
  onProfileClick,
  onRespondToIncomingRequest,
  onEditProfile,
  requestedActionLabel = "Unsave",
  onRequestSent,
  relationshipLabel,
  menuSaveLabel = "Save",
  onSaveProfile,
  showProfileMenuItem = true,
  showRequestMenu = false,
  showActions = true,
  variant = "request",
  user,
  clickableCard = false,
  incomingRequestId,
  incomingRequestStatus,
}: {
  actionOverride?: {
    disabled?: boolean
    icon: React.ReactNode
    label: string
    onClick?: () => void
    variant: "default" | "secondary"
  }
  className?: string
  clickableCard?: boolean
  countryFlagUrl?: string
  homeCountry?: string
  incomingRequestId?: string
  incomingRequestStatus?: RequestNotificationStatus
  languages?: string[]
  occupation?: string
  onEditProfile?: () => void
  onHideProfile?: () => void
  onProfileClick?: () => void
  onRespondToIncomingRequest?: (
    notificationId: string,
    status: Exclude<RequestNotificationStatus, "pending">
  ) => void
  requestedActionLabel?: string
  onRequestSent?: () => void
  menuSaveLabel?: string
  onSaveProfile?: () => void
  showProfileMenuItem?: boolean
  relationshipLabel?: string
  showRequestMenu?: boolean
  showActions?: boolean
  variant?: "request" | "self"
  user: User
}) {
  const name = `${user.name.first} ${user.name.last}`
  const location = [
    user.location.city,
    user.location.state,
    user.location.country,
  ]
    .filter(Boolean)
    .join(", ")
  const displayHomeCountry = homeCountry ?? user.nat ?? user.location.country
  const username = user.login?.username
  const badgeSeed = user.login?.uuid ?? username
  const profileBadges = getProfileBadges(badgeSeed)
  const age = user.dob?.age ? `${user.dob.age} yrs` : "Age hidden"
  const displayOccupation =
    occupation || getPreviewOccupation(badgeSeed ?? name)
  const lookingFor =
    relationshipLabel || getProfileLookingFor(badgeSeed ?? name)
  const profileKey = getProfileKey(user)
  const [likedProfileKeys, setLikedProfileKeys] = React.useState<string[]>([])
  const [requestedProfiles, setRequestedProfiles] = React.useState<string[]>([])
  const [requestStatus, setRequestStatus] = React.useState<
    "accepted" | "rejected" | undefined
  >()
  const [requestLoading, setRequestLoading] = React.useState(false)
  const requestTimerRef = React.useRef<number | null>(null)
  const isSaved = likedProfileKeys.includes(profileKey)
  const requested = requestedProfiles.includes(profileKey)

  React.useEffect(() => {
    function syncLikedProfiles() {
      setLikedProfileKeys(getSavedLikedProfileKeys())
    }

    syncLikedProfiles()
    window.addEventListener(LIKED_PROFILES_EVENT, syncLikedProfiles)
    window.addEventListener("storage", syncLikedProfiles)
    return () => {
      window.removeEventListener(LIKED_PROFILES_EVENT, syncLikedProfiles)
      window.removeEventListener("storage", syncLikedProfiles)
    }
  }, [])

  React.useEffect(() => {
    function syncRequestedProfiles() {
      setRequestedProfiles(getSavedRequestedProfiles())
    }

    syncRequestedProfiles()
    window.addEventListener(REQUESTED_PROFILES_EVENT, syncRequestedProfiles)
    return () =>
      window.removeEventListener(
        REQUESTED_PROFILES_EVENT,
        syncRequestedProfiles
      )
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

    if (requested) {
      const next = requestedProfiles.filter((key) => key !== profileKey)
      saveRequestedProfiles(next)
      setRequestedProfiles(next)
      return
    }

    // show loading state for 1s, then persist request and notify parent
    setRequestLoading(true)
    // use window.setTimeout to get a numeric id (Node timeout types differ)
    requestTimerRef.current = window.setTimeout(() => {
      const next = [...requestedProfiles, profileKey]
      saveRequestedProfiles(next)
      setRequestedProfiles(next)
      scheduleFakeRequestOutcome(user)
      setRequestLoading(false)
      onRequestSent?.()
      requestTimerRef.current = null
    }, 1000) as unknown as number
  }

  React.useEffect(() => {
    return () => {
      if (requestTimerRef.current) {
        window.clearTimeout(requestTimerRef.current)
        requestTimerRef.current = null
      }
    }
  }, [])

  const requestButton = getRequestButtonState(
    requestStatus,
    requested,
    requestedActionLabel
  )
  const cardClickable = Boolean(onProfileClick && clickableCard)

  return (
    <article
      className={cn(
        "overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        cardClickable &&
          "cursor-pointer transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        className
      )}
      role={cardClickable ? "button" : undefined}
      tabIndex={cardClickable ? 0 : undefined}
      onClick={cardClickable ? onProfileClick : undefined}
      onKeyDown={
        cardClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onProfileClick?.()
              }
            }
          : undefined
      }
    >
      <div className="relative h-24 overflow-hidden bg-muted">
        <Image
          src={user.picture.large}
          alt=""
          fill
          sizes="480px"
          priority
          className="scale-110 object-cover blur-sm"
        />
        <div className="absolute inset-0 bg-background/35" />
      </div>

      <div className="-mt-14 flex flex-col p-4 pt-0 text-center sm:p-5 sm:pt-0">
        <div className="relative mx-auto size-28 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-md sm:size-32">
          <Image
            src={user.picture.large}
            alt={name}
            fill
            sizes="144px"
            priority
            className="object-cover"
          />
        </div>

        <div className="mt-3 min-w-0">
          <div className="flex min-w-0 items-center justify-center gap-2">
            <h2 className="truncate text-lg font-semibold sm:text-xl">{name}</h2>
            <ProfileStatusIcons badges={profileBadges} iconClassName="size-5" />
          </div>

          <p className="mt-1 truncate text-sm text-muted-foreground">
            {username ? `@${username}` : "@profile"}
          </p>

          <div className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold">
            <span
              aria-label={user.gender}
              className={cn(
                "flex size-5 shrink-0 items-center justify-center",
                getGenderIconColor(user.gender)
              )}
              title={user.gender}
            >
              {getGenderIcon(user.gender)}
            </span>
            <span className="text-muted-foreground">{age}</span>
            {countryFlagUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={countryFlagUrl}
                alt=""
                className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-sm"
              />
            ) : null}
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          <div className="flex items-center gap-3 text-sm">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">
              Summary
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            <ProfileDetail
              icon={<BriefcaseBusiness className="size-4" />}
              value={displayOccupation}
              wide
            />
            <ProfileDetail
              icon={<House className="size-4" />}
              value={displayHomeCountry}
              wide
            />
            <ProfileDetail
              icon={<MapPin className="size-4" />}
              value={location}
              wide
            />
            <ProfileDetail
              icon={<HeartHandshake className="size-4" />}
              value={`Looking for ${lookingFor.toLowerCase()}`}
              wide
            />
            <ProfileLanguages languages={languages} />
          </div>
        </div>

        {showActions ? (
          <div
            className={cn(
              "mt-4 grid gap-2",
              !showRequestMenu && variant !== "self" && "sm:grid-cols-2"
            )}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {incomingRequestId ? (
              <IncomingRequestActions
                notificationId={incomingRequestId}
                onRespond={onRespondToIncomingRequest}
                status={incomingRequestStatus ?? "pending"}
              />
            ) : !showRequestMenu && variant !== "self" ? (
              <Button
                variant="outline"
                className="gap-2"
                onClick={onProfileClick}
              >
                <UserRound className="size-4" />
                Profile
              </Button>
            ) : null}
            {variant === "self" ? (
              <Button className="gap-2" onClick={onEditProfile}>
                <Pencil className="size-4" />
                Edit profile
              </Button>
            ) : incomingRequestId ? null : showRequestMenu ? (
              <RequestActionGroup
                disabled={actionOverride?.disabled ?? requestButton.disabled}
                icon={actionOverride?.icon ?? requestButton.icon}
                label={actionOverride?.label ?? requestButton.label}
                name={name}
                onHideProfile={onHideProfile}
                onMainClick={actionOverride?.onClick ?? toggleRequest}
                onProfileClick={onProfileClick}
                onSaveProfile={onSaveProfile}
                savedLabel={isSaved ? "Unsave" : menuSaveLabel}
                showProfileMenuItem={showProfileMenuItem}
                variant={actionOverride?.variant ?? requestButton.variant}
                loading={requestLoading}
              />
            ) : (
              <Button
                className="gap-2"
                variant={requestButton.variant}
                onClick={toggleRequest}
                disabled={requestButton.disabled || requestLoading}
              >
                {requestLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  requestButton.icon
                )}
                <span className="truncate">{requestButton.label}</span>
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </article>
  )
}

function IncomingRequestActions({
  notificationId,
  onRespond,
  status,
}: {
  notificationId: string
  onRespond?: (
    notificationId: string,
    status: Exclude<RequestNotificationStatus, "pending">
  ) => void
  status: RequestNotificationStatus
}) {
  if (status === "pending") {
    return (
      <>
        <Button
          type="button"
          className="gap-2"
          onClick={() => onRespond?.(notificationId, "accepted")}
        >
          <Check className="size-4" />
          Accept
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onRespond?.(notificationId, "rejected")}
        >
          <X className="size-4" />
          Reject
        </Button>
      </>
    )
  }

  return (
    <div className="sm:col-span-2">
      <div
        className={cn(
          "flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium",
          status === "accepted"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
            : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        )}
      >
        {status === "accepted" ? "Accepted" : "Rejected"}
      </div>
    </div>
  )
}

function RequestActionGroup({
  disabled,
  icon,
  label,
  name,
  onHideProfile,
  onMainClick,
  onProfileClick,
  onSaveProfile,
  savedLabel,
  showProfileMenuItem,
  variant,
  loading,
}: {
  disabled: boolean
  icon: React.ReactNode
  label: string
  name: string
  onHideProfile?: () => void
  onMainClick: () => void
  onProfileClick?: () => void
  onSaveProfile?: () => void
  savedLabel: string
  showProfileMenuItem: boolean
  variant: "default" | "secondary"
  loading?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const menuItems = [
    {
      icon: <Bookmark className="size-4" />,
      label: savedLabel,
      onClick: onSaveProfile,
      tone: "normal" as const,
    },
    ...(showProfileMenuItem
      ? [
          {
            icon: <UserRound className="size-4" />,
            label: "Profile",
            onClick: onProfileClick,
            tone: "normal" as const,
          },
        ]
      : []),
    {
      icon: <UserRound className="size-4" />,
      label: "Hide profile",
      onClick: onHideProfile,
      tone: "normal" as const,
    },
    {
      icon: <Flag className="size-4" />,
      label: "Report profile",
      onClick: undefined,
      tone: "danger" as const,
    },
    {
      icon: <Ban className="size-4" />,
      label: "Block profile",
      onClick: undefined,
      tone: "danger" as const,
    },
  ]

  return (
    <div className="flex min-w-0 overflow-hidden rounded-md">
      <Button
        type="button"
        className="min-w-0 flex-1 gap-2 rounded-r-none"
        variant={variant}
        onClick={onMainClick}
        disabled={disabled || loading}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
        <span className="truncate">{label}</span>
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={variant}
            disabled={disabled || loading}
            aria-label={`More actions for ${name}`}
            className="w-10 rounded-l-none border-l border-background/25 px-0"
          >
            <ChevronDown className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1">
          {menuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => {
                setOpen(false)
                item.onClick?.()
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition hover:bg-muted",
                item.tone === "danger" &&
                  "text-destructive hover:bg-destructive/10 hover:text-destructive"
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  )
}

function getRequestButtonState(
  status: "accepted" | "rejected" | undefined,
  requested: boolean,
  requestedActionLabel: string
) {
  if (status === "accepted") {
    return {
      disabled: false,
      icon: <MessageCircle className="size-4" />,
      label: "Message",
      variant: "default" as const,
    }
  }

  if (status === "rejected") {
    return {
      disabled: true,
      icon: <X className="size-4" />,
      label: "Rejected",
      variant: "secondary" as const,
    }
  }

  if (requested) {
    return {
      disabled: false,
      icon: <Bookmark className="size-4" />,
      label: requestedActionLabel,
      variant: "secondary" as const,
    }
  }

  return {
    disabled: false,
    icon: <Send className="size-4" />,
    label: "Send request",
    variant: "default" as const,
  }
}

function ProfileDetail({
  icon,
  wide,
  value,
}: {
  icon: React.ReactNode
  wide?: boolean
  value: string
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2 px-1 text-left",
        wide && "col-span-2"
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        {icon}
      </span>
      <p className="truncate text-sm font-semibold">{value}</p>
    </div>
  )
}

function ProfileLanguages({ languages }: { languages: string[] }) {
  return (
    <div className="col-span-2 flex min-w-0 items-start gap-2 px-1 text-left">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
        <Languages className="size-4" />
      </span>
      {languages.length > 0 ? (
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {languages.map((language) => (
            <span
              key={language}
              className="inline-flex items-center rounded-sm bg-muted/60 px-2 py-1 text-xs font-semibold"
            >
              {language}
            </span>
          ))}
        </div>
      ) : (
        <p className="truncate text-sm font-semibold">Languages loading</p>
      )}
    </div>
  )
}

function getGenderIcon(gender?: string) {
  if (gender === "male") return <Mars className="size-4" />
  if (gender === "female") return <Venus className="size-4" />
  return <VenusAndMars className="size-4" />
}

function getGenderIconColor(gender?: string) {
  if (gender === "male") return "text-sky-500"
  if (gender === "female") return "text-rose-500"
  return "text-violet-500"
}

function getPreviewOccupation(seed?: string) {
  const occupations = [
    "Product designer",
    "Software developer",
    "Marketing strategist",
    "Teacher",
    "Architect",
    "Nurse",
    "Photographer",
    "Financial analyst",
  ]
  const source = seed || "profile"
  const total = source
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return occupations[total % occupations.length]
}

function getSavedLikedProfileKeys() {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(LIKED_PROFILES_STORAGE_KEY)
    const users = raw ? JSON.parse(raw) : []

    return Array.isArray(users)
      ? users
          .filter(
            (item): item is User =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  item.name?.first &&
                  item.name?.last
              )
          )
          .map((item) => getProfileKey(item))
      : []
  } catch {
    return []
  }
}
