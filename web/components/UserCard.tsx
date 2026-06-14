"use client"

import * as React from "react"
import Image from "next/image"
import {
  Languages,
  Mail,
  MapPin,
  Send,
  Phone,
  UserRound,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import ProfileStatusIcons from "@/components/ProfileStatusIcons"
import { getProfileBadges } from "@/lib/profile-badges"
import {
  getProfileKey,
  getSavedRequestedProfiles,
  REQUESTED_PROFILES_EVENT,
  saveRequestedProfiles,
} from "@/lib/profile-requests"

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

export default function UserCard({
  countryFlagUrl,
  hideProfileButton = false,
  languages = [],
  onProfileClick,
  user,
}: {
  countryFlagUrl?: string
  hideProfileButton?: boolean
  languages?: string[]
  onProfileClick?: () => void
  user: User
}) {
  const name = `${user.name.title ? `${user.name.title} ` : ""}${user.name.first} ${user.name.last}`
  const location = [user.location.city, user.location.state, user.location.country]
    .filter(Boolean)
    .join(", ")
  const username = user.login?.username
  const street = user.location.street
    ? `${user.location.street.number ?? ""} ${user.location.street.name ?? ""}`.trim()
    : undefined
  const postcode = user.location.postcode
    ? String(user.location.postcode)
    : undefined
  const badgeSeed = user.login?.uuid ?? username
  const profileBadges = getProfileBadges(badgeSeed)
  const languageList = languages.length ? languages.join(", ") : "Not set"
  const profileKey = getProfileKey(user)
  const [requestedProfiles, setRequestedProfiles] = React.useState<string[]>([])
  const requested = requestedProfiles.includes(profileKey)

  React.useEffect(() => {
    function syncRequestedProfiles() {
      setRequestedProfiles(getSavedRequestedProfiles())
    }

    syncRequestedProfiles()
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
    <article className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="relative overflow-hidden border-b bg-muted/45 p-6">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,63,94,0.14),transparent_45%),linear-gradient(315deg,rgba(14,165,233,0.16),transparent_42%)]" />
        {countryFlagUrl ? (
          <span className="absolute right-3 top-3 z-10 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={countryFlagUrl}
              alt=""
              className="h-6 w-8 rounded-[2px] object-cover shadow-sm"
            />
          </span>
        ) : null}
        <div className="relative flex flex-col items-center text-center">
          <div className="relative size-36 overflow-hidden rounded-full border-4 border-background bg-background shadow-xl sm:size-40">
            <Image
              src={user.picture.large}
              alt={name}
              fill
              sizes="160px"
              priority
              className="object-cover"
            />
          </div>

          <div className="mt-5 flex min-w-0 flex-wrap items-center justify-center gap-2 px-1">
            <h2 className="min-w-0 break-words text-xl font-semibold sm:text-2xl">
              {name}
            </h2>
            <ProfileStatusIcons badges={profileBadges} seed={badgeSeed} />
          </div>
          <p className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            {location}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <InfoTile
            icon={<UserRound className="size-4" />}
            label="Handle"
            value={username ? `@${username}` : "Private"}
          />
          <InfoTile
            icon={<UserRound className="size-4" />}
            label="Gender"
            value={user.gender ?? "Not set"}
          />
          <InfoTile
            icon={<Mail className="size-4" />}
            label="Email"
            value={user.email ?? "Private"}
          />
          <InfoTile
            icon={<Phone className="size-4" />}
            label="Phone"
            value={user.cell ?? user.phone ?? "Private"}
          />
        </div>

        <DetailBlock
          icon={<Languages className="size-4" />}
          label="Languages"
          value={languageList}
        />

        {street ? (
          <DetailBlock
            icon={<MapPin className="size-4" />}
            label="Address"
            value={[street, postcode].filter(Boolean).join(" - ")}
          />
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          {!hideProfileButton ? (
            <Button
              variant="outline"
              className="gap-2"
              onClick={onProfileClick}
            >
              <UserRound className="size-4" />
              Profile
            </Button>
          ) : null}
          <Button
            className="gap-2"
            variant={requested ? "secondary" : "default"}
            onClick={toggleRequest}
          >
            {requested ? (
              <X className="size-4" />
            ) : (
              <Send className="size-4" />
            )}
            <span className="truncate">
              {requested ? "Cancel request" : "Send request"}
            </span>
          </Button>
        </div>
      </div>
    </article>
  )
}

function DetailBlock({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-muted/35 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  )
}


function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-muted/35 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  )
}
