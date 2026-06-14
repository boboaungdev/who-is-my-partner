"use client"

import * as React from "react"
import Image from "next/image"
import {
  BriefcaseBusiness,
  HeartHandshake,
  House,
  Languages,
  MapPin,
  Mars,
  Send,
  UserRound,
  Venus,
  VenusAndMars,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
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
  className,
  countryFlagUrl,
  hideProfileButton = false,
  homeCountry,
  languages = [],
  onProfileClick,
  showActions = true,
  user,
}: {
  className?: string
  countryFlagUrl?: string
  hideProfileButton?: boolean
  homeCountry?: string
  languages?: string[]
  onProfileClick?: () => void
  showActions?: boolean
  user: User
}) {
  const name = `${user.name.first} ${user.name.last}`
  const location = [user.location.city, user.location.state, user.location.country]
    .filter(Boolean)
    .join(", ")
  const displayHomeCountry = homeCountry ?? user.nat ?? user.location.country
  const username = user.login?.username
  const badgeSeed = user.login?.uuid ?? username
  const profileBadges = getProfileBadges(badgeSeed)
  const age = user.dob?.age ? `${user.dob.age} yrs` : "Age hidden"
  const occupation = getPreviewOccupation(badgeSeed ?? name)
  const lookingFor = getProfileLookingFor(badgeSeed ?? name)
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
    <article
      className={cn(
        "overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
    >
      <div className="relative h-28 overflow-hidden bg-muted">
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

      <div className="-mt-16 flex flex-col p-5 pt-0 text-center">
        <div className="relative mx-auto size-32 shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-md sm:size-36">
          <Image
            src={user.picture.large}
            alt={name}
            fill
            sizes="144px"
            priority
            className="object-cover"
          />
        </div>

        <div className="mt-4 min-w-0">
          <div className="flex min-w-0 items-center justify-center gap-2">
            <h2 className="truncate text-xl font-semibold">{name}</h2>
            <ProfileStatusIcons
              badges={profileBadges}
              iconClassName="size-5"
              seed={badgeSeed}
            />
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
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium text-muted-foreground">
              Summary
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <ProfileDetail
              icon={<BriefcaseBusiness className="size-4" />}
              value={occupation}
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
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
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
        ) : null}
      </div>
    </article>
  )
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
