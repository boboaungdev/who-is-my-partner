"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  HeartHandshake,
  Loader2,
  MapPin,
  MapPinned,
  Sparkles,
  UserRound,
} from "lucide-react"
import { useRouter } from "next/navigation"

import NavBar from "@/components/NavBar"
import Onboarding from "@/components/Onboarding"
import ProfileStatusIcons from "@/components/ProfileStatusIcons"
import SwipeDeck from "@/components/SwipeDeck"
import UserCard, { type User } from "@/components/UserCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { APP_NAME, RANDOM_USER_BASE_URL } from "@/constants"
import { getProfileBadges } from "@/lib/profile-badges"
import { cn } from "@/lib/utils"

type RandomUser = {
  gender?: string
  dob?: { date?: string; age?: number }
  registered?: { date?: string; age?: number }
  login?: { uuid?: string; username?: string }
  name?: { title?: string; first?: string; last?: string }
  location?: {
    street?: { number?: number; name?: string }
    city?: string
    state?: string
    country?: string
    postcode?: string | number
    coordinates?: { latitude?: string; longitude?: string }
    timezone?: { offset?: string; description?: string }
  }
  picture?: { large?: string }
  email?: string
  phone?: string
  cell?: string
  nat?: string
}

type Prefs = {
  name: string
  avatar?: string
  gender: string
  age: number
  birthday?: string
  country?: string
  city?: string
  location?: string
  occupation?: string
  relationshipGoal?: string
  partnerGenders: string[]
  partnerAges: string[]
}

export default function Page() {
  const router = useRouter()
  const [users, setUsers] = useState<RandomUser[]>([])
  const [loading, setLoading] = useState(false)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [view, setView] = useState<AppView>("home")
  const [selectedUser, setSelectedUser] = useState<RandomUser | null>(null)

  function goHome() {
    setView("home")
    router.push("/")
  }

  function goSetup() {
    if (prefs) {
      goDeck()
      return
    }
    setView("setup")
    setViewQuery("setup")
  }

  function goDeck() {
    setView("deck")
    setViewQuery("deck")
  }

  function goProfile(user?: RandomUser | null) {
    setView("profile")
    setProfileViewQuery(user)
  }

  function selectLandingUser(user: RandomUser) {
    setSelectedUser(user)
    saveSelectedUser(user)
    if (prefs) {
      goProfile(user)
    } else {
      goSetup()
    }
  }

  async function fetchUsers(count = 12) {
    setLoading(true)
    try {
      const res = await fetch(
        `${RANDOM_USER_BASE_URL}/api/?results=${count}&inc=gender,name,location,picture,dob,registered,email,login,phone,cell,nat&noinfo`
      )
      const data = await res.json()
      setUsers((prev) => [...prev, ...(data.results || [])])
    } catch {
      // ignore demo API failures
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      void fetchUsers(12)
      try {
        const raw = localStorage.getItem("wimp:onboard:v2")
        const selectedRaw = localStorage.getItem("wimp:selected-user:v1")
        const savedPrefs = raw ? JSON.parse(raw) : null
        const savedSelected = selectedRaw ? JSON.parse(selectedRaw) : null
        const view = getViewQuery()

        if (savedSelected) setSelectedUser(savedSelected)

        if (savedPrefs) {
          setPrefs(savedPrefs)
          const nextView = view === "setup" ? "deck" : view ?? "deck"
          setView(nextView)
          if (!view || view === "setup") setViewQuery("deck", "replace")
        } else {
          setPrefs(null)
          const nextView = view === "setup" ? "setup" : "home"
          setView(nextView)
          if (nextView === "setup") {
            setViewQuery("setup", "replace")
          } else {
            clearViewQuery("replace")
          }
        }
      } catch {
        // ignore
      }
    }, 0)
  }, [])

  useEffect(() => {
    function syncFromUrl() {
      const nextView = getViewQuery()
      setView(nextView === "setup" && prefs ? "deck" : nextView ?? (prefs ? "deck" : "home"))
      if (nextView === "setup" && prefs) setViewQuery("deck", "replace")
    }

    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [prefs])

  const filteredUsers = useMemo(() => {
    if (!prefs) return users
    return users.filter((u: RandomUser) => {
      const gender = u.gender
      const age = u.dob?.age
      if (prefs.partnerGenders && !prefs.partnerGenders.includes("any")) {
        if (!prefs.partnerGenders.includes(gender ?? "")) return false
      }
      if (prefs.partnerAges && prefs.partnerAges.length > 0) {
        const ok = prefs.partnerAges.some((r: string) => {
          if (!age) return false
          if (r === "41+") return age >= 41
          const parts = r.split("-").map(Number)
          return age >= parts[0] && age <= parts[1]
        })
        if (!ok) return false
      }
      return true
    })
  }, [prefs, users])

  const signedUserImage = React.useMemo(() => {
    if (!prefs) return undefined
    if (prefs.avatar) return prefs.avatar
    const found = users.find((u) => {
      const full = `${u.name?.first ?? ""} ${u.name?.last ?? ""}`.trim()
      return full === prefs.name
    })
    return found?.picture?.large
  }, [prefs, users])

  return (
    <div className="min-h-svh bg-background text-foreground">
      <NavBar
        prefs={prefs}
        userImage={signedUserImage}
        onHome={goHome}
        onStart={goSetup}
        onSignOut={() => {
          try {
            clearAppStorage()
          } catch {
            // ignore
          }
          setPrefs(null)
          setSelectedUser(null)
          goHome()
          setUsers([])
          void fetchUsers(12)
        }}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {view === "setup" ? (
          <Onboarding
            onComplete={(p: Prefs) => {
              setPrefs(p)
              if (selectedUser) {
                goProfile(selectedUser)
              } else {
                goDeck()
              }
              setUsers([])
              void fetchUsers(12)
            }}
          />
        ) : view === "home" || !prefs ? (
          <MarketingHome
            users={users}
            onStart={goSetup}
            onSelectUser={selectLandingUser}
            onLoadMore={() => fetchUsers(8)}
          />
        ) : view === "profile" && selectedUser ? (
          <SavedUserProfile
            prefs={prefs}
            user={selectedUser}
            onBack={goDeck}
          />
        ) : loading && users.length === 0 ? (
          <LoadingState />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Filter className="size-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Your filters</h2>
                    <p className="text-sm text-muted-foreground">
                      {filteredUsers.length} matching profiles
                    </p>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {prefs.location ? (
                    <FilterRow label="Location" values={[prefs.location]} />
                  ) : null}
                  <FilterRow label="Gender" values={prefs.partnerGenders} />
                  <FilterRow label="Age" values={prefs.partnerAges} />
                  <FilterRow
                    label="You"
                    values={[
                      `${prefs.age}`,
                      prefs.gender,
                      prefs.relationshipGoal ?? "serious",
                    ]}
                  />
                </div>
              </Card>

              <InsightCard
                icon={<MapPinned className="size-5" />}
                title="Profile spread"
                value={`${users.length} loaded`}
                detail="More profiles are fetched automatically as the deck loops."
              />
            </aside>

            <SwipeDeck users={filteredUsers} onLoadMore={() => fetchUsers(8)} />
          </div>
        )}
      </main>
    </div>
  )
}

function clearAppStorage() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("wimp:"))
    .forEach((key) => localStorage.removeItem(key))
}

type AppView = "home" | "setup" | "deck" | "profile"

function getViewQuery(): AppView | null {
  const view = new URLSearchParams(window.location.search).get("view")
  return view === "home" ||
    view === "setup" ||
    view === "deck" ||
    view === "profile"
    ? view
    : null
}

function setViewQuery(view: AppView, mode: "push" | "replace" = "push") {
  const url = new URL(window.location.href)
  url.searchParams.set("view", view)

  if (mode === "replace") {
    window.history.replaceState(null, "", url)
  } else {
    window.history.pushState(null, "", url)
  }
}

function clearViewQuery(mode: "push" | "replace" = "push") {
  const url = new URL(window.location.href)
  url.searchParams.delete("view")

  if (mode === "replace") {
    window.history.replaceState(null, "", url)
  } else {
    window.history.pushState(null, "", url)
  }
}

function setProfileViewQuery(user?: RandomUser | null) {
  const url = new URL(window.location.href)
  url.searchParams.set("view", "profile")
  if (user?.login?.uuid) {
    url.searchParams.set("user", user.login.uuid)
  } else {
    url.searchParams.delete("user")
  }
  window.history.pushState(null, "", url)
}

function saveSelectedUser(user: RandomUser) {
  localStorage.setItem("wimp:selected-user:v1", JSON.stringify(user))
}

function MarketingHome({
  onLoadMore,
  onSelectUser,
  users,
  onStart,
}: {
  onLoadMore: () => void
  onSelectUser: (user: RandomUser) => void
  users: RandomUser[]
  onStart: () => void
}) {
  const [index, setIndex] = useState(0)

  function nextProfile() {
    if (!users.length) return
    const nextIndex = index + 1
    if (nextIndex >= users.length) {
      setIndex(0)
      onLoadMore()
    } else {
      setIndex(nextIndex)
      if (users.length - nextIndex <= 3) onLoadMore()
    }
  }

  function prevProfile() {
    if (!users.length) return
    setIndex((current) => (current - 1 + users.length) % users.length)
  }

  return (
    <div className="space-y-10 pb-8">
      <section className="grid min-h-[calc(100svh-7rem)] items-center gap-8 lg:grid-cols-[minmax(0,1fr)_440px]">
        <div className="max-w-2xl">
          <Badge variant="secondary" className="gap-1.5">
            <Sparkles className="size-3.5" />
            Profile discovery UI
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-normal sm:text-5xl lg:text-6xl">
            {APP_NAME}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
            Explore partner matches with clean preferences, real profile-style
            data, and a focused deck experience built for quick discovery.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button size="lg" onClick={onStart} className="gap-2">
              Get started
              <ArrowRight className="size-4" />
            </Button>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <LandingPoint label="Real profiles" />
            <LandingPoint label="Simple filters" />
            <LandingPoint label="Private session" />
          </div>
        </div>

        <HeroPreview
          currentIndex={index}
          onNext={nextProfile}
          onPrev={prevProfile}
          onView={onSelectUser}
          users={users}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <LandingFeature
          title="Set your profile"
          detail="Choose your details, country, city, birthday, and optional avatar before the deck appears."
        />
        <LandingFeature
          title="Tune preferences"
          detail="Pick the partner ages and genders you want the matching flow to respect."
        />
        <LandingFeature
          title="Browse the deck"
          detail="Review real-looking profiles with photos, location, contact details, and matching context."
        />
      </section>
    </div>
  )
}

function LandingPoint({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <CheckCircle2 className="size-4 text-primary" />
      {label}
    </div>
  )
}

function HeroPreview({
  currentIndex,
  onNext,
  onPrev,
  onView,
  users,
}: {
  currentIndex: number
  onNext: () => void
  onPrev: () => void
  onView: (user: RandomUser) => void
  users: RandomUser[]
}) {
  const visibleCards = [-1, 0, 1].map((offset) => {
    if (!users.length) return undefined
    return users[(currentIndex + offset + users.length) % users.length]
  })
  const current = users[currentIndex]

  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Random profile
          </p>
        </div>
        <Badge variant="outline">Preview</Badge>
      </div>

      <div className="relative h-[430px] overflow-hidden sm:h-[450px]">
        {visibleCards.map((user, index) => (
          <CarouselProfileCard
            key={user?.login?.uuid ?? index}
            active={index === 1}
            user={user}
            fallbackIndex={index}
          />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-[1fr_1.2fr_1fr] gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onPrev}
          disabled={!users.length}
          className="gap-2"
        >
          <ChevronLeft className="size-4" />
          Prev
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={() => current && onView(current)}
          disabled={!current}
          className="gap-2"
        >
          <Eye className="size-4" />
          View
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onNext}
          disabled={!users.length}
          className="gap-2"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function CarouselProfileCard({
  active,
  fallbackIndex,
  user,
}: {
  active: boolean
  fallbackIndex: number
  user?: RandomUser
}) {
  const fallbackNames = ["Maya Chen", "Alex Rivera", "Nora Smith"]
  const fallbackLocations = ["Paris, France", "Toronto, Canada", "Seoul, South Korea"]
  const fallbackAges = [26, 31, 24]
  const fallbackGenders = ["female", "male", "female"]
  const name = user
    ? `${user.name?.first ?? ""} ${user.name?.last ?? ""}`.trim()
    : fallbackNames[fallbackIndex]
  const location = user?.location
    ? `${user.location.city}, ${user.location.country}`
    : fallbackLocations[fallbackIndex]
  const username = user?.login?.username ? `@${user.login.username}` : "Profile preview"
  const age = String(user?.dob?.age ?? fallbackAges[fallbackIndex])
  const gender = user?.gender ?? fallbackGenders[fallbackIndex]
  const badgeSeed = user?.login?.uuid ?? name
  const profileBadges = getProfileBadges(badgeSeed)
  const stackClasses = [
    "left-[6%] z-10 scale-95 opacity-55",
    "left-1/2 z-30 -translate-x-1/2 scale-100",
    "right-[6%] z-20 scale-95 opacity-55",
  ]

  return (
    <Card
      className={cn(
        "absolute top-0 h-[420px] w-[min(21rem,78vw)] overflow-hidden border-border/80 p-0 transition duration-300 sm:h-[440px]",
        stackClasses[fallbackIndex],
        active ? "shadow-xl shadow-primary/5" : "shadow-sm"
      )}
    >
      <div className="relative h-24 overflow-hidden bg-muted">
        {user?.picture?.large ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture.large}
            alt=""
            className="size-full scale-110 object-cover blur-sm"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <HeartHandshake className="size-6" />
          </div>
        )}
        <div className="absolute inset-0 bg-background/35" />
      </div>

      <div className="-mt-12 flex h-[calc(100%-3rem)] flex-col p-5 pt-0 text-center">
        <div
          className={cn(
            "relative mx-auto overflow-hidden rounded-full border-4 border-background bg-muted shadow-md",
            active ? "size-28" : "size-20"
          )}
        >
          {user?.picture?.large ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture.large}
              alt={name || "Profile"}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <HeartHandshake className={active ? "size-8" : "size-6"} />
            </div>
          )}
        </div>

        <div className="mt-4 min-w-0">
          <div className="flex min-w-0 items-center justify-center gap-2">
            <p className={cn("truncate font-semibold", active ? "text-xl" : "text-base")}>
              {name || "Profile preview"}
            </p>
            <ProfileStatusIcons
              badges={profileBadges}
              iconClassName={active ? "size-5" : "size-4"}
              seed={badgeSeed}
            />
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {username}
          </p>
        </div>

        {active ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">Details</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <PreviewDetail icon={<MapPin className="size-4" />} value={location} />
            <PreviewDetail icon={<CalendarDays className="size-4" />} value={`${age} years old`} />
            <PreviewDetail icon={<UserRound className="size-4" />} value={gender} capitalize />
          </div>
        ) : (
          <div className="mt-4 flex flex-1 flex-col justify-end space-y-3">
            <span className="mx-auto h-1.5 w-14 rounded-full bg-muted" />
            <span className="mx-auto h-1.5 w-20 rounded-full bg-muted" />
            <span className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
          </div>
        )}
      </div>
    </Card>
  )
}

function PreviewDetail({
  capitalize,
  icon,
  value,
}: {
  capitalize?: boolean
  icon: React.ReactNode
  value: string
}) {
  return (
    <div className="flex items-center gap-3 py-1.5 text-left">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon}
      </span>
      <p className={cn("truncate text-sm font-semibold", capitalize && "capitalize")}>
        {value}
      </p>
    </div>
  )
}

function SavedUserProfile({
  prefs,
  user,
  onBack,
}: {
  prefs: Prefs
  user: RandomUser
  onBack: () => void
}) {
  if (!isProfileUser(user)) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted">
          <HeartHandshake className="size-6 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-xl font-semibold">Profile unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick another profile from the discovery deck.
        </p>
        <Button onClick={onBack} className="mt-5">
          Back to deck
        </Button>
      </Card>
    )
  }

  const name = `${user.name.first} ${user.name.last}`

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,520px)_minmax(280px,1fr)]">
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Saved profile
            </p>
            <h1 className="text-2xl font-semibold">{name}</h1>
          </div>
          <Button variant="outline" onClick={onBack}>
            Back to deck
          </Button>
        </div>
        <UserCard user={user} />
      </section>

      <aside className="space-y-4">
        <Card className="p-5">
          <h2 className="font-semibold">Your setup</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This profile was saved before setup, then shown again after your
            profile was completed.
          </p>
          <div className="mt-4 grid gap-3">
            <ProfileSummary label="You" value={prefs.name} />
            <ProfileSummary label="Location" value={prefs.location ?? "Not set"} />
            <ProfileSummary label="Age" value={String(prefs.age)} />
            <ProfileSummary label="Goal" value={prefs.relationshipGoal ?? "Not set"} />
          </div>
        </Card>
      </aside>
    </div>
  )
}

function ProfileSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/35 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  )
}

function isProfileUser(user: RandomUser): user is User {
  return Boolean(
    user.name?.first &&
      user.name?.last &&
      user.location?.city &&
      user.location?.country &&
      user.picture?.large
  )
}

function LandingFeature({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </Card>
  )
}

function LoadingState() {
  return (
    <Card className="mx-auto flex min-h-[420px] max-w-xl flex-col items-center justify-center text-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <h2 className="mt-4 text-xl font-semibold">Building your deck</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Pulling fresh profiles and applying your preferences.
      </p>
    </Card>
  )
}

function FilterRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <Badge key={value} variant="outline" className="capitalize">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function InsightCard({
  icon,
  title,
  value,
  detail,
}: {
  icon: React.ReactNode
  title: string
  value: string
  detail: string
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-xl font-semibold">{value}</p>
          <p className="mt-2 text-sm leading-5 text-muted-foreground">
            {detail}
          </p>
        </div>
      </div>
    </Card>
  )
}
