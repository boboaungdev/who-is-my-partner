"use client"

import * as React from "react"
import Image from "next/image"
import {
  CalendarDays,
  Clock,
  Compass,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import ProfileStatusIcons from "@/components/ProfileStatusIcons"
import { getProfileBadges } from "@/lib/profile-badges"

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

export default function UserCard({ user }: { user: User }) {
  const name = `${user.name.title ? `${user.name.title} ` : ""}${user.name.first} ${user.name.last}`
  const location = [user.location.city, user.location.state, user.location.country]
    .filter(Boolean)
    .join(", ")
  const age = user.dob?.age
  const nat = user.nat
  const username = user.login?.username
  const street = user.location.street
    ? `${user.location.street.number ?? ""} ${user.location.street.name ?? ""}`.trim()
    : undefined
  const postcode = user.location.postcode
    ? String(user.location.postcode)
    : undefined
  const coordinates =
    user.location.coordinates?.latitude && user.location.coordinates.longitude
      ? `${user.location.coordinates.latitude}, ${user.location.coordinates.longitude}`
      : undefined
  const registered = user.registered?.age
    ? `${user.registered.age} yrs`
    : formatDate(user.registered?.date)
  const timezone = user.location.timezone
    ? `${user.location.timezone.offset ?? ""} ${user.location.timezone.description ?? ""}`.trim()
    : undefined
  const badgeSeed = user.login?.uuid ?? username
  const profileBadges = getProfileBadges(badgeSeed)

  return (
    <article className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="relative overflow-hidden border-b bg-muted/45 p-6">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(244,63,94,0.14),transparent_45%),linear-gradient(315deg,rgba(14,165,233,0.16),transparent_42%)]" />
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

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Badge variant="outline" className="bg-background/80 backdrop-blur">
              {nat ?? "Global"}
            </Badge>
            {user.gender ? (
              <Badge
                variant="outline"
                className="bg-background/80 capitalize backdrop-blur"
              >
                {user.gender}
              </Badge>
            ) : null}
          </div>

          <div className="mt-4 flex min-w-0 flex-wrap items-center justify-center gap-2">
            <h2 className="min-w-0 text-3xl font-semibold">
              {name}
              {age ? <span className="font-normal text-muted-foreground">, {age}</span> : null}
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
        <div className="grid grid-cols-2 gap-3">
          <InfoTile
            icon={<UserRound className="size-4" />}
            label="Handle"
            value={username ? `@${username}` : "Private"}
          />
          <InfoTile
            icon={<CalendarDays className="size-4" />}
            label="Registered"
            value={registered ?? "New"}
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

        {timezone ? (
          <DetailBlock
            icon={<Clock className="size-4" />}
            label="Timezone"
            value={timezone}
          />
        ) : null}

        {street ? (
          <DetailBlock
            icon={<MapPin className="size-4" />}
            label="Address"
            value={[street, postcode].filter(Boolean).join(" - ")}
          />
        ) : null}

        {coordinates ? (
          <DetailBlock
            icon={<Compass className="size-4" />}
            label="Coordinates"
            value={coordinates}
          />
        ) : null}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2">
            <UserRound className="size-4" />
            Profile
          </Button>
          <Button className="flex-1 gap-2">
            <MessageCircle className="size-4" />
            Message
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

function formatDate(date?: string) {
  if (!date) return undefined
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
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
