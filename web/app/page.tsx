"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  Bookmark,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Globe2,
  HeartHandshake,
  House,
  Languages,
  Mail,
  MapPin,
  Mars,
  Sparkles,
  Settings2,
  UserRound,
  Venus,
  VenusAndMars,
  X,
} from "lucide-react"
import { useRouter } from "next/navigation"

import AppSidebar from "@/components/AppSidebar"
import NavBar from "@/components/NavBar"
import Onboarding from "@/components/Onboarding"
import ProfileStatusIcons from "@/components/ProfileStatusIcons"
import SwipeDeck from "@/components/SwipeDeck"
import UserCard, { type User } from "@/components/UserCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  APP_NAME,
  COUNTRY_CITY_API_URL,
  COUNTRY_LANGUAGE_API_URL,
  RANDOM_USER_BASE_URL,
} from "@/constants"
import { getProfileBadges } from "@/lib/profile-badges"
import { getProfileLookingFor } from "@/lib/profile-looking-for"
import {
  getPendingRequestedProfileKeys,
  getSavedRequestNotifications,
  markRequestNotificationsRead,
  REQUEST_NOTIFICATIONS_EVENT,
  respondToIncomingRequest,
  type RequestNotification,
} from "@/lib/request-notifications"
import { getProfileKey, saveRequestedProfiles } from "@/lib/profile-requests"
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

type GalleryPhoto = {
  albumId: number
  id: number
  title: string
  url: string
  thumbnailUrl: string
}

type Prefs = {
  name: string
  avatar?: string
  gender: string
  age: number
  birthday?: string
  homeCountry?: string
  currentCountry?: string
  currentCity?: string
  country?: string
  city?: string
  location?: string
  preferenceHomeCountry?: string
  preferenceCurrentCountry?: string
  occupation?: string
  maritalStatus?: string
  languages?: string[]
  relationshipGoal?: string
  partnerGenders: string[]
  partnerAges: string[]
}

type CountryLanguageData = {
  cca2?: string
  flag?: string
  name?: { common?: string; official?: string }
  languages?: Record<string, string>
}

type CountryCityOption = {
  country: string
  cities: string[]
}

type CountryMeta = {
  flag?: string
  flagUrl?: string
  languages: string[]
  name?: string
}

const FILTER_GENDERS = [
  { value: "male", label: "Men" },
  { value: "female", label: "Women" },
  { value: "any", label: "Any" },
]
const FILTER_AGES = ["any", "18-24", "25-30", "31-40", "41+"]
const RELATIONSHIP_GOALS = [
  { value: "long-term", label: "Long-term partner" },
  { value: "meaningful-dates", label: "Meaningful dates" },
  { value: "friendship-first", label: "Friendship first" },
  { value: "exploring", label: "Still exploring" },
]
const MARITAL_STATUSES = [
  { value: "single", label: "Single" },
  { value: "divorced", label: "Divorced" },
  { value: "separated", label: "Separated" },
  { value: "widowed", label: "Widowed" },
]
const OCCUPATION_SUGGESTIONS = [
  "Business Owner",
  "Developer",
  "Designer",
  "Teacher",
  "Doctor",
  "Engineer",
  "Marketing Manager",
  "Student",
]
const WORLDWIDE = "__worldwide__"
const SAME_AS_MY_COUNTRY = "__same_as_my_country__"
const SAME_AS_CURRENT_LOCATION = "__same_as_current_location__"
const DEMO_AGES = [
  18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 35, 38, 40, 41,
  46, 52,
]
const INITIAL_PROFILE_COUNT = 50
const MORE_PROFILE_COUNT = 30

function getDemoBirthdayForAge(age: number) {
  const today = new Date()
  const birthday = new Date(
    today.getFullYear() - age,
    today.getMonth(),
    today.getDate()
  )

  return birthday.toISOString()
}

function withDemoAge(user: RandomUser, index: number): RandomUser {
  const age = DEMO_AGES[index % DEMO_AGES.length]

  return {
    ...user,
    dob: {
      ...user.dob,
      age,
      date: getDemoBirthdayForAge(age),
    },
  }
}

function getRandomUserKey(user: RandomUser) {
  return (
    user.login?.uuid ??
    user.login?.username ??
    `${user.name?.first ?? ""}-${user.name?.last ?? ""}-${user.email ?? ""}`
  )
}

function normalizeCountryName(value?: string) {
  return (value ?? "").trim().toLowerCase()
}

function getCountryLanguages(
  country: string | undefined,
  countryMeta: Record<string, CountryMeta>,
  seed?: string
) {
  const countryLanguages =
    countryMeta[normalizeCountryName(country)]?.languages ?? []

  if (!seed) return countryLanguages.slice(0, 5)

  const allLanguages = Array.from(
    new Set(
      Object.values(countryMeta).flatMap((meta) =>
        Array.isArray(meta.languages) ? meta.languages : []
      )
    )
  )
  const fallbackLanguages = [
    "English",
    "Spanish",
    "French",
    "German",
    "Thai",
    "Japanese",
    "Korean",
    "Italian",
    "Portuguese",
    "Mandarin",
  ]
  const languagePool = allLanguages.length ? allLanguages : fallbackLanguages
  const preferred = countryLanguages.length ? countryLanguages : languagePool
  const extras = languagePool.filter((language) => !preferred.includes(language))
  const targetCount = Math.min(
    5,
    Math.max(1, getSeedValue(seed) % 5 + 1)
  )
  const orderedPreferred = getSeededOrder(preferred, `${seed}:preferred`)
  const orderedExtras = getSeededOrder(extras, `${seed}:extras`)

  return [...orderedPreferred, ...orderedExtras].slice(0, targetCount)
}

function getSeedValue(seed: string) {
  return seed
    .split("")
    .reduce((total, char, index) => total + char.charCodeAt(0) * (index + 1), 0)
}

function getSeededOrder(items: string[], seed: string) {
  return [...items].sort((a, b) => {
    const aValue = getSeedValue(`${seed}:${a}`)
    const bValue = getSeedValue(`${seed}:${b}`)
    return aValue - bValue || a.localeCompare(b)
  })
}

function getCountryFlagUrl(
  country: string | undefined,
  countryMeta: Record<string, CountryMeta>
) {
  return countryMeta[normalizeCountryName(country)]?.flagUrl
}

function getCountryName(
  country: string | undefined,
  countryMeta: Record<string, CountryMeta>
) {
  if (isWorldwide(country)) return "Worldwide"
  return countryMeta[normalizeCountryName(country)]?.name ?? country
}

function isWorldwide(value?: string) {
  return value === WORLDWIDE
}

function getCities(country: string | undefined, options: CountryCityOption[]) {
  if (!country || isWorldwide(country)) return []
  return options.find((item) => item.country === country)?.cities ?? []
}

function getAgesForRange(range: string) {
  if (range === "41+") return [41, 46, 52]
  const [min, max] = range.split("-").map(Number)
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []

  return Array.from({ length: max - min + 1 }, (_, index) => min + index)
}

function getFilteredAgePool(prefs: Prefs) {
  const ranges = prefs.partnerAges?.filter((range) => range !== "any") ?? []
  const ages = ranges.flatMap(getAgesForRange)
  return ages.length ? ages : []
}

function shapeUserForFilters(
  user: RandomUser,
  index: number,
  prefs: Prefs,
  locationOptions: CountryCityOption[]
): RandomUser {
  const agePool = getFilteredAgePool(prefs)
  const age = agePool.length ? agePool[index % agePool.length] : user.dob?.age
  const profileCurrentCountry = prefs.currentCountry || prefs.country
  const filterCurrentCountry =
    prefs.preferenceCurrentCountry ?? profileCurrentCountry
  const profileHomeCountry = prefs.homeCountry || prefs.country
  const filterHomeCountry = prefs.preferenceHomeCountry ?? profileHomeCountry
  const currentCountry = isWorldwide(filterCurrentCountry)
    ? undefined
    : filterCurrentCountry
  const homeCountry = isWorldwide(filterHomeCountry)
    ? undefined
    : filterHomeCountry
  const cities = getCities(currentCountry, locationOptions)
  const profileCityMatchesFilter =
    normalizeCountryName(currentCountry) ===
    normalizeCountryName(profileCurrentCountry)
  const profileCity = profileCityMatchesFilter
    ? prefs.currentCity || prefs.city
    : undefined
  const currentCity = currentCountry
    ? profileCity || (cities.length ? cities[index % cities.length] : undefined)
    : undefined

  return {
    ...user,
    nat: homeCountry || user.nat,
    dob: age
      ? {
          ...user.dob,
          age,
          date: getDemoBirthdayForAge(age),
        }
      : user.dob,
    location: {
      ...user.location,
      ...(currentCountry ? { country: currentCountry } : {}),
      ...(currentCity ? { city: currentCity } : {}),
    },
  }
}

export default function Page() {
  const router = useRouter()
  const [users, setUsers] = useState<RandomUser[]>([])
  const [loading, setLoading] = useState(false)
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [view, setView] = useState<AppView>("home")
  const [connectionsSection, setConnectionsSection] = useState<
    "accepted" | "requested" | "incoming"
  >("accepted")
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<RandomUser | null>(null)
  const [countryMeta, setCountryMeta] = useState<Record<string, CountryMeta>>(
    {}
  )
  const [locationOptions, setLocationOptions] = useState<CountryCityOption[]>(
    []
  )
  const [locationsLoading, setLocationsLoading] = useState(true)
  const fetchingUsersRef = React.useRef(false)

  function goHome() {
    if (prefs) {
      goDiscover()
      return
    }

    setView("home")
    router.push("/")
  }

  function goSetup() {
    if (prefs) {
      goDiscover()
      return
    }
    setView("setup")
    setViewQuery("setup")
  }

  function editProfile() {
    if (prefs) {
      setProfileSheetOpen(true)
      return
    }

    setView("setup")
    setViewQuery("setup")
  }

  function viewMyProfile() {
    setView("my-profile")
    setViewQuery("my-profile")
  }

  function goNotifications() {
    setView("notifications")
    setViewQuery("notifications")
  }

  function goDiscover() {
    setView("discover")
    setViewQuery("discover")
  }

  function goConnections() {
    setConnectionsSection("accepted")
    setView("connections")
    setViewQuery("connections")
  }

  function goSaved() {
    setView("saved")
    setViewQuery("saved")
  }

  function goSettings() {
    setView("settings")
    setViewQuery("settings")
  }

  function openRequestedConnections() {
    setConnectionsSection("requested")
    setView("connections")
    setViewQuery("connections")
  }

  function openIncomingConnections() {
    setConnectionsSection("incoming")
    setView("connections")
    setViewQuery("connections")
  }

  function openAcceptedConnections() {
    setConnectionsSection("accepted")
    setView("connections")
    setViewQuery("connections")
  }

  function goProfile(user?: RandomUser | null) {
    setView("profile")
    setProfileViewQuery(user)
  }

  function openNotificationProfile(notification: RequestNotification) {
    const profileUser = getNotificationProfileUser(notification)

    setSelectedUser(profileUser)
    saveSelectedUser(profileUser)
    goProfile(profileUser)
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

  async function fetchUsers(count = INITIAL_PROFILE_COUNT) {
    if (fetchingUsersRef.current) return

    fetchingUsersRef.current = true
    setLoading(true)
    try {
      const res = await fetch(
        `${RANDOM_USER_BASE_URL}/api/?results=${count}&inc=gender,name,location,picture,dob,registered,email,login,phone,cell,nat&noinfo`
      )
      const data = await res.json()
      const fetchedUsers: RandomUser[] = Array.isArray(data.results)
        ? data.results
        : []
      setUsers((prev) => {
        const existingKeys = new Set(prev.map(getRandomUserKey))
        const uniqueFetchedUsers = fetchedUsers.filter((user) => {
          const key = getRandomUserKey(user)
          if (existingKeys.has(key)) return false
          existingKeys.add(key)
          return true
        })

        return [
          ...prev,
          ...uniqueFetchedUsers.map((user, index) =>
            withDemoAge(user, prev.length + index)
          ),
        ]
      })
    } catch {
      // ignore demo API failures
    } finally {
      fetchingUsersRef.current = false
      setLoading(false)
    }
  }

  useEffect(() => {
    setTimeout(() => {
      void fetchUsers(INITIAL_PROFILE_COUNT)
      try {
        const raw = localStorage.getItem("wimp:onboard:v2")
        const selectedRaw = localStorage.getItem("wimp:selected-user:v1")
        const savedPrefs = raw ? JSON.parse(raw) : null
        const savedSelected = selectedRaw ? JSON.parse(selectedRaw) : null
        const view = getViewQuery()

        if (savedSelected) setSelectedUser(savedSelected)

        if (savedPrefs) {
          setPrefs(savedPrefs)
          const nextView = !view || view === "home" ? "discover" : view
          setView(nextView)
          if (!view || view === "home") setViewQuery("discover", "replace")
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
    let cancelled = false

    async function loadLocations() {
      setLocationsLoading(true)
      try {
        const response = await fetch(COUNTRY_CITY_API_URL)
        const payload = await response.json()
        const data = Array.isArray(payload.data) ? payload.data : []
        const options = data
          .filter(
            (item: CountryCityOption) =>
              typeof item.country === "string" && Array.isArray(item.cities)
          )
          .map((item: CountryCityOption) => ({
            country: item.country,
            cities: item.cities.filter((city) => typeof city === "string"),
          }))
          .sort((a: CountryCityOption, b: CountryCityOption) =>
            a.country.localeCompare(b.country)
          )

        if (!cancelled) setLocationOptions(options)
      } catch {
        if (!cancelled) setLocationOptions([])
      } finally {
        if (!cancelled) setLocationsLoading(false)
      }
    }

    void loadLocations()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadCountryLanguages() {
      try {
        const response = await fetch(COUNTRY_LANGUAGE_API_URL)
        const payload = await response.json()
        const countries = Array.isArray(payload) ? payload : []
        const next = countries.reduce(
          (acc: Record<string, CountryMeta>, country: CountryLanguageData) => {
            const languages = Object.values(country.languages ?? {}) as string[]
            const uniqueLanguages = Array.from(new Set(languages)).sort(
              (a, b) => a.localeCompare(b)
            )
            const meta = {
              flag: country.flag,
              flagUrl: country.cca2
                ? `https://flagcdn.com/w40/${country.cca2.toLowerCase()}.png`
                : undefined,
              languages: uniqueLanguages,
              name: country.name?.common,
            }

            if (
              country.name?.common &&
              (meta.flagUrl || country.flag || uniqueLanguages.length)
            ) {
              acc[normalizeCountryName(country.name.common)] = meta
            }
            if (
              country.name?.official &&
              (meta.flagUrl || country.flag || uniqueLanguages.length)
            ) {
              acc[normalizeCountryName(country.name.official)] = meta
            }
            if (
              country.cca2 &&
              (meta.flagUrl || country.flag || uniqueLanguages.length)
            ) {
              acc[normalizeCountryName(country.cca2)] = meta
            }
            return acc
          },
          {}
        )

        if (!cancelled) setCountryMeta(next)
      } catch {
        if (!cancelled) setCountryMeta({})
      }
    }

    void loadCountryLanguages()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function syncFromUrl() {
      const nextView = getViewQuery()
      setView(
        prefs && (!nextView || nextView === "home")
          ? "discover"
          : (nextView ?? "home")
      )
    }

    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [prefs])

  const savedCounts = useSavedCounts(Boolean(prefs))
  const notificationCount = useUnreadNotificationCount(Boolean(prefs))

  const filteredUsers = useMemo(() => {
    if (!prefs) return users
    return users.filter((u: RandomUser) => {
      const gender = u.gender
      if (prefs.partnerGenders && !prefs.partnerGenders.includes("any")) {
        if (!prefs.partnerGenders.includes(gender ?? "")) return false
      }
      return true
    })
  }, [prefs, users])

  const displayUsers = useMemo(() => {
    if (!prefs) return filteredUsers
    return filteredUsers.map((user, index) =>
      shapeUserForFilters(user, index, prefs, locationOptions)
    )
  }, [filteredUsers, locationOptions, prefs])
  const discoverHiddenProfileKeys = useDiscoverHiddenProfileKeys(Boolean(prefs))
  const discoverUsers = useMemo(
    () =>
      displayUsers.filter((user) => {
        const profileKey =
          user.login?.uuid ?? `${user.name?.first ?? ""}-${user.name?.last ?? ""}`
        return !discoverHiddenProfileKeys.includes(profileKey)
      }),
    [discoverHiddenProfileKeys, displayUsers]
  )

  const signedUserImage = React.useMemo(() => {
    if (!prefs) return undefined
    if (prefs.avatar) return prefs.avatar
    const found = users.find((u) => {
      const full = `${u.name?.first ?? ""} ${u.name?.last ?? ""}`.trim()
      return full === prefs.name
    })
    return found?.picture?.large
  }, [prefs, users])

  function updatePrefs(nextPrefs: Prefs) {
    setPrefs(nextPrefs)
    try {
      localStorage.setItem("wimp:onboard:v2", JSON.stringify(nextPrefs))
    } catch {
      // ignore
    }
  }

  const activeTab =
    view === "connections"
      ? "connections"
      : view === "notifications"
      ? "notifications"
      : view === "saved"
        ? "me"
        : view === "my-profile" || view === "settings"
          ? "me"
      : view === "profile"
        ? "profile"
        : "discover"
  const activeSidebarItem =
    view === "connections"
      ? "connections"
      : view === "notifications"
      ? "notifications"
      : view === "saved"
        ? "me"
        : view === "my-profile" || view === "settings"
        ? "me"
        : "discover"

  const content = view === "setup" ? (
    <Onboarding
      initialPrefs={prefs}
      profileOnly={Boolean(prefs)}
      onBack={prefs ? goDiscover : goHome}
      onComplete={(p: Prefs) => {
        const wasEditingProfile = Boolean(prefs)
        setPrefs(p)
        if (!wasEditingProfile && selectedUser) {
          goProfile(selectedUser)
        } else {
          goDiscover()
        }
        setUsers([])
        void fetchUsers(INITIAL_PROFILE_COUNT)
      }}
    />
  ) : view === "home" || !prefs ? (
    <MarketingHome
      countryMeta={countryMeta}
      users={users}
      onStart={goSetup}
      onLoadMore={() => fetchUsers(MORE_PROFILE_COUNT)}
    />
  ) : view === "profile" && selectedUser ? (
    <SavedUserProfile
      countryMeta={countryMeta}
      user={selectedUser}
      onBack={goDiscover}
    />
  ) : view === "my-profile" && prefs ? (
    <MyProfileView
      avatar={signedUserImage}
      countryMeta={countryMeta}
      prefs={prefs}
      onBack={goDiscover}
      onEditProfile={editProfile}
    />
  ) : view === "connections" && prefs ? (
    <ConnectionsView
      counts={savedCounts}
      currentSection={connectionsSection}
      onOpenIncoming={openIncomingConnections}
      onOpenProfile={(user) => {
        setSelectedUser(user)
        saveSelectedUser(user)
        goProfile(user)
      }}
      onOpenAccepted={openAcceptedConnections}
      onOpenRequested={openRequestedConnections}
      sourceUsers={displayUsers}
    />
  ) : view === "notifications" && prefs ? (
    <NotificationsView
      onBack={goDiscover}
      onOpenProfile={openNotificationProfile}
    />
  ) : view === "saved" && prefs ? (
    <SavedView
      onOpenProfile={(user) => {
        setSelectedUser(user)
        saveSelectedUser(user)
        goProfile(user)
      }}
    />
  ) : view === "settings" && prefs ? (
    <SettingsView onEditProfile={editProfile} prefs={prefs} />
  ) : (
    <div className="grid gap-6 lg:grid-cols-[160px_minmax(0,1fr)]">
      <aside className="order-1 lg:order-1">
        <FilterSheet
          countryMeta={countryMeta}
          locationOptions={locationOptions}
          locationsLoading={locationsLoading}
          matchingCount={discoverUsers.length}
          onPrefsChange={updatePrefs}
          prefs={prefs}
        />
      </aside>

      <div className="order-1 lg:order-2">
        <SwipeDeck
          getCountryFlagUrl={(user) =>
            getCountryFlagUrl(user.nat, countryMeta) ??
            getCountryFlagUrl(user.location?.country, countryMeta)
          }
                getHomeCountry={(user) =>
                  getCountryName(user.nat, countryMeta) ?? user.location?.country
                }
                getLanguages={(user) =>
                getCountryLanguages(
                  user.location?.country,
                  countryMeta,
                  getRandomUserKey(user)
                )
              }
                users={discoverUsers}
          onLoadMore={() => fetchUsers(MORE_PROFILE_COUNT)}
          onViewProfile={(user) => {
            setSelectedUser(user)
            saveSelectedUser(user)
            goProfile(user)
          }}
        />
      </div>
    </div>
  )

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <NavBar
        activeTab={activeTab}
        onConnections={goConnections}
        prefs={prefs}
        userImage={signedUserImage}
        onDiscover={goDiscover}
        onEditProfile={editProfile}
        onHome={goHome}
        onNotifications={goNotifications}
        onOpenNotificationProfile={openNotificationProfile}
        onMe={viewMyProfile}
        onProfile={viewMyProfile}
        onSaved={goSaved}
        onStart={goSetup}
        onViewProfile={viewMyProfile}
        onSignOut={() => {
          try {
            clearAppStorage()
          } catch {
            // ignore
          }
          setPrefs(null)
          setSelectedUser(null)
          setProfileSheetOpen(false)
          setView("home")
          clearViewQuery()
          setUsers([])
          void fetchUsers(INITIAL_PROFILE_COUNT)
        }}
      />

      <main
        className={cn(
          "mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:py-8",
          prefs && "pb-32 md:pb-8"
        )}
      >
        {prefs && view !== "setup" ? (
          <div className="flex items-start gap-6 lg:gap-8">
            {!sidebarHidden ? (
              <AppSidebar
                activeItem={activeSidebarItem}
                collapsed={sidebarHidden}
                onConnections={goConnections}
                onClose={() => setSidebarHidden((value) => !value)}
                onDiscover={goDiscover}
                onMe={viewMyProfile}
                onNotifications={goNotifications}
                notificationCount={notificationCount}
              />
            ) : (
              <AppSidebar
                activeItem={activeSidebarItem}
                collapsed
                onConnections={goConnections}
                onClose={() => setSidebarHidden(false)}
                onDiscover={goDiscover}
                onMe={viewMyProfile}
                onNotifications={goNotifications}
                notificationCount={notificationCount}
              />
            )}
            <div className="min-w-0 flex-1">{content}</div>
          </div>
        ) : (
          content
        )}
      </main>
      <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
        <SheetContent
          side="bottom"
          className="h-[92svh] max-h-[92svh] overflow-hidden rounded-t-[2rem] border-t border-border/70 bg-background/95 p-0 backdrop-blur-xl sm:h-auto sm:max-h-none sm:w-[min(38rem,calc(100vw-2.5rem))] sm:rounded-l-[2rem] sm:rounded-t-none sm:border-l sm:border-t-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          {prefs ? (
            <ScrollArea className="min-h-0 flex-1">
              <div className="px-5 py-8 sm:px-7 sm:py-8">
                <SimpleProfileEditForm
                  key={JSON.stringify(prefs)}
                  countryMeta={countryMeta}
                  locationOptions={locationOptions}
                  locationsLoading={locationsLoading}
                  prefs={prefs}
                  onCancel={() => setProfileSheetOpen(false)}
                  onSave={(nextPrefs) => {
                    updatePrefs(nextPrefs)
                    setProfileSheetOpen(false)
                  }}
                />
              </div>
            </ScrollArea>
          ) : null}
        </SheetContent>
      </Sheet>
      <AppFooter showOnMobile={!prefs && view === "home"} />
    </div>
  )
}

function clearAppStorage() {
  const appStoragePrefix = "wimp:"

  Object.keys(localStorage)
    .filter((key) => key.startsWith(appStoragePrefix))
    .forEach((key) => localStorage.removeItem(key))

  Object.keys(sessionStorage)
    .filter((key) => key.startsWith(appStoragePrefix))
    .forEach((key) => sessionStorage.removeItem(key))

  cachedSavedCounts = EMPTY_SAVED_COUNTS
  window.dispatchEvent(new CustomEvent("wimp:liked-users:change"))
  window.dispatchEvent(new CustomEvent("wimp:requested-profiles:change"))
  window.dispatchEvent(new CustomEvent(REQUEST_NOTIFICATIONS_EVENT))
}

function SimpleProfileEditForm({
  countryMeta,
  locationOptions,
  locationsLoading,
  onCancel,
  onSave,
  prefs,
}: {
  countryMeta: Record<string, CountryMeta>
  locationOptions: CountryCityOption[]
  locationsLoading: boolean
  onCancel: () => void
  onSave: (prefs: Prefs) => void
  prefs: Prefs
}) {
  const [draft, setDraft] = React.useState<Prefs>(prefs)
  const currentCountry = draft.currentCountry || draft.country || ""
  const cityOptions = getCities(currentCountry, locationOptions)
  const canSave =
    draft.name.trim().length > 1 &&
    draft.gender.trim().length > 0 &&
    draft.occupation?.trim() &&
    !draft.occupation.includes(",")

  function update<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function updateAvatar(file?: File) {
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") {
        update("avatar", reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  function updateCurrentCountry(value: string) {
    setDraft((current) => ({
      ...current,
      currentCountry: value,
      currentCity: "",
      country: value,
      city: "",
      location: value,
    }))
  }

  function updateCurrentCity(value: string) {
    setDraft((current) => ({
      ...current,
      currentCity: value,
      city: value,
      location: formatProfileLocation(
        value,
        current.currentCountry || current.country
      ),
    }))
  }

  function save() {
    const occupation = sanitizeProfileOccupation(draft.occupation)
    const currentCountry = draft.currentCountry || draft.country || ""
    const currentCity = draft.currentCity || draft.city || ""

    onSave({
      ...draft,
      occupation,
      age: draft.birthday ? calculateProfileAge(draft.birthday) : draft.age,
      currentCountry,
      currentCity,
      country: currentCountry,
      city: currentCity,
      location: formatProfileLocation(currentCity, currentCountry),
    })
  }

  return (
    <div className="space-y-5">
      <SheetHeader className="mb-1 border-b border-border/60 pb-5">
        <div className="flex flex-col items-center text-center">
          <div className="size-14 overflow-hidden rounded-full border border-border/60 bg-muted shadow-sm">
            {draft.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={draft.avatar}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-muted-foreground">
                <UserRound className="size-5" />
              </div>
            )}
          </div>
          <div className="mt-3 min-w-0">
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>
              Refresh your details, location, and profile vibe.
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>

      <SimpleEditField label="Profile photo">
        <Input
          type="file"
          accept="image/*"
          onChange={(event) => updateAvatar(event.target.files?.[0])}
        />
      </SimpleEditField>

      <SimpleEditField label="Name">
        <Input
          value={draft.name}
          placeholder="Alex Morgan"
          onChange={(event) => update("name", event.target.value)}
        />
      </SimpleEditField>

      <div className="grid gap-4 sm:grid-cols-2">
        <SimpleEditField label="Gender">
          <SimpleSelect
            value={draft.gender}
            placeholder="Select gender"
            items={[
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "any", label: "Other" },
            ]}
            onValueChange={(value) => update("gender", value)}
          />
        </SimpleEditField>
        <SimpleEditField label="Birthday">
          <Input
            type="date"
            value={formatDateInputValue(draft.birthday)}
            onChange={(event) => update("birthday", event.target.value)}
          />
        </SimpleEditField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SimpleEditField label="Home country">
          <CountryEditSelect
            countryMeta={countryMeta}
            disabled={locationsLoading}
            locationOptions={locationOptions}
            placeholder="Select home country"
            value={draft.homeCountry || ""}
            onValueChange={(value) => update("homeCountry", value)}
          />
        </SimpleEditField>
        <SimpleEditField label="Current country">
          <CountryEditSelect
            countryMeta={countryMeta}
            disabled={locationsLoading}
            locationOptions={locationOptions}
            placeholder="Select current country"
            value={currentCountry}
            onValueChange={updateCurrentCountry}
          />
        </SimpleEditField>
      </div>

      <SimpleEditField label="Current city">
        <SimpleSelect
          disabled={!currentCountry || cityOptions.length === 0}
          value={draft.currentCity || draft.city || ""}
          placeholder={
            currentCountry ? "Select current city" : "Select country first"
          }
          items={cityOptions.map((city) => ({ value: city, label: city }))}
          onValueChange={updateCurrentCity}
        />
      </SimpleEditField>

      <SimpleEditField label="Occupation">
        <div className="space-y-2.5">
          <Input
            value={draft.occupation ?? ""}
            placeholder="Business Owner"
            onChange={(event) =>
              update(
                "occupation",
                sanitizeProfileOccupation(event.target.value)
              )
            }
            onKeyDown={(event) => {
              if (event.key === ",") event.preventDefault()
            }}
          />
          <div className="flex flex-wrap gap-2">
            {OCCUPATION_SUGGESTIONS.map((occupation) => (
              <button
                key={occupation}
                type="button"
                onClick={() => update("occupation", occupation)}
                className={cn(
                  "rounded-full border bg-background px-3 py-1.5 text-sm font-medium transition hover:border-primary/40 hover:bg-muted/40",
                  draft.occupation === occupation &&
                    "border-primary bg-primary text-primary-foreground"
                )}
              >
                {occupation}
              </button>
            ))}
          </div>
        </div>
      </SimpleEditField>

      <div className="grid gap-4 sm:grid-cols-2">
        <SimpleEditField label="Marital status">
          <SimpleSelect
            value={draft.maritalStatus || "single"}
            items={MARITAL_STATUSES}
            onValueChange={(value) => update("maritalStatus", value)}
          />
        </SimpleEditField>
        <SimpleEditField label="Looking for">
          <SimpleSelect
            value={draft.relationshipGoal || "long-term"}
            items={RELATIONSHIP_GOALS}
            onValueChange={(value) => update("relationshipGoal", value)}
          />
        </SimpleEditField>
      </div>

      <div className="sticky bottom-0 -mx-5 grid gap-2 border-t border-border/60 bg-background/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:flex sm:justify-end sm:px-7">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={!canSave} onClick={save}>
          Save changes
        </Button>
      </div>
    </div>
  )
}

function SimpleEditField({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}

function SimpleSelect({
  disabled,
  items,
  onValueChange,
  placeholder = "Select",
  value,
}: {
  disabled?: boolean
  items: { value: string; label: string }[]
  onValueChange: (value: string) => void
  placeholder?: string
  value?: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function CountryEditSelect({
  countryMeta,
  disabled,
  locationOptions,
  onValueChange,
  placeholder,
  value,
}: {
  countryMeta: Record<string, CountryMeta>
  disabled?: boolean
  locationOptions: CountryCityOption[]
  onValueChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {locationOptions.map((item) => {
          const iconUrl = getCountryFlagUrl(item.country, countryMeta)

          return (
            <SelectItem key={item.country} value={item.country}>
              <span className="flex min-w-0 items-center gap-2">
                {iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={iconUrl}
                    alt=""
                    className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-sm"
                  />
                ) : null}
                <span className="truncate">{item.country}</span>
              </span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}

function sanitizeProfileOccupation(value?: string) {
  return (value ?? "").replace(/,/g, "").replace(/\s+/g, " ").trimStart()
}

function formatDateInputValue(value?: string) {
  if (!value) return ""
  return value.includes("T") ? value.split("T")[0] : value
}

function calculateProfileAge(value?: string) {
  if (!value) return 0

  const birthday = new Date(value)
  if (Number.isNaN(birthday.getTime())) return 0

  const today = new Date()
  let age = today.getFullYear() - birthday.getFullYear()
  const monthDiff = today.getMonth() - birthday.getMonth()
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthday.getDate())
  ) {
    age -= 1
  }

  return age
}

function formatProfileLocation(city?: string, country?: string) {
  return [city, country]
    .map((part) => (part ?? "").trim())
    .filter(Boolean)
    .join(", ")
}

function AppFooter({ showOnMobile = false }: { showOnMobile?: boolean }) {
  const year = new Date().getFullYear()
  const socials = [
    { href: "https://facebook.com", label: "Facebook", icon: FacebookIcon },
    { href: "https://wa.me", label: "WhatsApp", icon: WhatsAppIcon },
    { href: "https://x.com", label: "X", icon: XSocialIcon },
    { href: "mailto:hello@bhcozy.com", label: "Email", icon: Mail },
  ]

  return (
    <footer
      className={cn(
        "border-t bg-background",
        showOnMobile ? "block" : "hidden",
        "sm:block"
      )}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-medium text-foreground">{APP_NAME}</p>
          <p>&copy; {year} BH Cozy. All rights reserved.</p>
        </div>
        <div className="flex items-center gap-2">
          {socials.map((social) => {
            const Icon = social.icon

            return (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer"
                aria-label={social.label}
                className="flex size-9 items-center justify-center rounded-full border text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
              >
                <Icon className="size-4" />
              </a>
            )
          })}
        </div>
      </div>
    </footer>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M14 8.5V6.75c0-.5.4-.75.85-.75H17V2.2C16.63 2.15 15.35 2 13.86 2 10.75 2 8.63 3.9 8.63 7.38V8.5H5.1v4.25h3.53V22H13v-9.25h3.4l.54-4.25H13V7.8c0-.86.24-1.3 1-1.3Z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12.04 2A9.87 9.87 0 0 0 2.2 11.84c0 1.73.45 3.41 1.3 4.9L2 22l5.38-1.41a9.8 9.8 0 0 0 4.66 1.18h.01A9.87 9.87 0 0 0 21.9 11.93 9.87 9.87 0 0 0 12.04 2Zm0 18.1h-.01a8.17 8.17 0 0 1-4.16-1.14l-.3-.18-3.2.84.86-3.12-.2-.32a8.15 8.15 0 1 1 7.01 3.92Zm4.48-6.12c-.25-.12-1.46-.72-1.68-.8-.23-.09-.39-.13-.56.12-.16.25-.64.8-.79.97-.14.17-.29.19-.54.07-.25-.13-1.04-.38-1.98-1.22a7.4 7.4 0 0 1-1.37-1.7c-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.09-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.16 0-.43.06-.65.31-.22.25-.85.83-.85 2.03 0 1.19.87 2.34 1 2.5.12.17 1.72 2.63 4.16 3.68.58.25 1.04.4 1.39.51.59.19 1.12.16 1.54.1.47-.07 1.46-.6 1.66-1.17.21-.57.21-1.06.15-1.17-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  )
}

function XSocialIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M13.88 10.47 21.24 2h-1.74l-6.4 7.35L8 2H2.12l7.72 11.22L2.12 22h1.75l6.74-7.75L16 22h5.88Zm-2.38 2.74-.78-1.12L4.5 3.31h2.66l5.02 7.08.78 1.1 6.53 9.22h-2.66Z" />
    </svg>
  )
}

type AppView =
  | "home"
  | "setup"
  | "discover"
  | "connections"
  | "profile"
  | "my-profile"
  | "notifications"
  | "saved"
  | "settings"

function getViewQuery(): AppView | null {
  const view = new URLSearchParams(window.location.search).get("view")
  return view === "home" ||
    view === "setup" ||
    view === "discover" ||
    view === "connections" ||
    view === "profile" ||
    view === "my-profile" ||
    view === "notifications" ||
    view === "saved" ||
    view === "settings"
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

function getSavedLikedProfilesCount() {
  if (typeof window === "undefined") return 0

  try {
    const raw = localStorage.getItem("wimp:liked-users:v1")
    const users = raw ? JSON.parse(raw) : []
    return Array.isArray(users) ? users.length : 0
  } catch {
    return 0
  }
}

function subscribeSavedData(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange)
  window.addEventListener("wimp:liked-users:change", onStoreChange)
  window.addEventListener("wimp:requested-profiles:change", onStoreChange)
  window.addEventListener(REQUEST_NOTIFICATIONS_EVENT, onStoreChange)

  return () => {
    window.removeEventListener("storage", onStoreChange)
    window.removeEventListener("wimp:liked-users:change", onStoreChange)
    window.removeEventListener("wimp:requested-profiles:change", onStoreChange)
    window.removeEventListener(REQUEST_NOTIFICATIONS_EVENT, onStoreChange)
  }
}

const EMPTY_SAVED_COUNTS: {
  incoming: number
  likes: number
  requests: number
} = { incoming: 0, likes: 0, requests: 0 }
const EMPTY_DISCOVER_HIDDEN_PROFILE_KEYS: string[] = []
let cachedSavedCounts = EMPTY_SAVED_COUNTS
let cachedDiscoverHiddenProfileKeys = EMPTY_DISCOVER_HIDDEN_PROFILE_KEYS

function getSavedCountsSnapshot(enabled: boolean) {
  if (!enabled || typeof window === "undefined") {
    return EMPTY_SAVED_COUNTS
  }

  const notifications = getSavedRequestNotifications()
  const next = {
    incoming: notifications.filter((item) => item.direction === "incoming")
      .length,
    likes: getSavedLikedProfilesCount(),
    requests: getPendingRequestedProfileKeys().length,
  }

  if (
    cachedSavedCounts.incoming === next.incoming &&
    cachedSavedCounts.likes === next.likes &&
    cachedSavedCounts.requests === next.requests
  ) {
    return cachedSavedCounts
  }

  cachedSavedCounts = next
  return cachedSavedCounts
}

function useSavedCounts(enabled: boolean) {
  return React.useSyncExternalStore(
    subscribeSavedData,
    () => getSavedCountsSnapshot(enabled),
    () => EMPTY_SAVED_COUNTS
  )
}

function getDiscoverHiddenProfileKeysSnapshot(enabled: boolean) {
  if (!enabled || typeof window === "undefined") {
    return EMPTY_DISCOVER_HIDDEN_PROFILE_KEYS
  }

  const hiddenKeys = new Set<string>()

  getSavedRequestNotifications()
    .filter((notification) => notification.status === "accepted")
    .forEach((notification) => {
      hiddenKeys.add(notification.profileKey)
    })

  const next = Array.from(hiddenKeys).sort()

  if (
    cachedDiscoverHiddenProfileKeys.length === next.length &&
    cachedDiscoverHiddenProfileKeys.every((key, index) => key === next[index])
  ) {
    return cachedDiscoverHiddenProfileKeys
  }

  cachedDiscoverHiddenProfileKeys = next
  return cachedDiscoverHiddenProfileKeys
}

function useDiscoverHiddenProfileKeys(enabled: boolean) {
  return React.useSyncExternalStore(
    subscribeSavedData,
    () => getDiscoverHiddenProfileKeysSnapshot(enabled),
    () => EMPTY_DISCOVER_HIDDEN_PROFILE_KEYS
  )
}

function useUnreadNotificationCount(enabled: boolean) {
  return React.useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener(REQUEST_NOTIFICATIONS_EVENT, onStoreChange)
      return () =>
        window.removeEventListener(REQUEST_NOTIFICATIONS_EVENT, onStoreChange)
    },
    () =>
      enabled
        ? getSavedRequestNotifications().filter((item) => !item.read).length
        : 0,
    () => 0
  )
}

function getSavedProfilesFromStorage() {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem("wimp:liked-users:v1")
    const users = raw ? JSON.parse(raw) : []
    return Array.isArray(users) ? users.filter(isProfileUser) : []
  } catch {
    return []
  }
}

function saveProfilesToStorage(users: User[]) {
  try {
    localStorage.setItem("wimp:liked-users:v1", JSON.stringify(users))
    window.dispatchEvent(new CustomEvent("wimp:liked-users:change"))
  } catch {
    // ignore storage failures
  }
}

function toggleSavedProfileInStorage(user: User) {
  const savedUsers = getSavedProfilesFromStorage()
  const profileKey = getProfileKey(user)
  const exists = savedUsers.some((item) => getProfileKey(item) === profileKey)
  const next = exists
    ? savedUsers.filter((item) => getProfileKey(item) !== profileKey)
    : [...savedUsers, user]

  saveProfilesToStorage(next)
}

function getNotificationProfileUser(notification: RequestNotification): RandomUser {
  if (notification.profile) {
    return notification.profile
  }

  const [firstName, ...lastNameParts] = notification.profileName.split(" ")
  const fallbackGender = notification.profileKey.includes("women")
    ? "female"
    : notification.profileKey.includes("men")
      ? "male"
      : undefined

  return {
    gender: fallbackGender,
    name: {
      first: firstName || "Profile",
      last: lastNameParts.join(" ") || "User",
    },
    location: {
      city: "Discover",
      country: "Member",
    },
    picture: {
      large: notification.profileImage || "/icon.svg",
    },
    login: {
      uuid: notification.profileKey,
      username: formatUsername(notification.profileName),
    },
    nat: "Member",
  }
}

function MarketingHome({
  countryMeta,
  onLoadMore,
  users,
  onStart,
}: {
  countryMeta: Record<string, CountryMeta>
  onLoadMore: () => void
  users: RandomUser[]
  onStart: () => void
}) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!users.length) return

    const timer = window.setInterval(() => {
      setIndex((current) => {
        const nextIndex = current + 1
        if (nextIndex >= users.length) {
          onLoadMore()
          return 0
        }
        if (users.length - nextIndex <= 3) onLoadMore()
        return nextIndex
      })
    }, 2000)

    return () => window.clearInterval(timer)
  }, [onLoadMore, users.length])

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
            data, and a focused Discover experience built for quick connection.
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
          countryMeta={countryMeta}
          currentIndex={index}
          users={users}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <LandingFeature
          title="Complete your profile"
          detail="Add a photo, short bio, location, and birthday so others see a clear, friendly profile."
        />
        <LandingFeature
          title="Customize discovery"
          detail="Set preferred ages, genders, and distance to focus on matches that matter to you."
        />
        <LandingFeature
          title="How matching works"
          detail="Learn how profiles are surfaced, what information is shared, and tips for safe, respectful contact."
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
  countryMeta,
  currentIndex,
  users,
}: {
  countryMeta: Record<string, CountryMeta>
  currentIndex: number
  users: RandomUser[]
}) {
  const visibleCards = [-1, 0, 1].map((offset) => {
    if (!users.length) return undefined
    return users[(currentIndex + offset + users.length) % users.length]
  })
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="relative h-[520px] overflow-hidden sm:h-[540px]">
        {visibleCards.map((user, index) => (
          <CarouselProfileCard
            key={user?.login?.uuid ?? index}
            active={index === 1}
            countryMeta={countryMeta}
            user={user}
            fallbackIndex={index}
          />
        ))}
      </div>
    </div>
  )
}

function CarouselProfileCard({
  active,
  countryMeta,
  fallbackIndex,
  user,
}: {
  active: boolean
  countryMeta: Record<string, CountryMeta>
  fallbackIndex: number
  user?: RandomUser
}) {
  const fallbackNames = ["Maya Chen", "Alex Rivera", "Nora Smith"]
  const fallbackLocations = [
    "Paris, France",
    "Toronto, Canada",
    "Seoul, South Korea",
  ]
  const fallbackAges = [26, 31, 24]
  const fallbackGenders = ["female", "male", "female"]
  const name = user
    ? `${user.name?.first ?? ""} ${user.name?.last ?? ""}`.trim()
    : fallbackNames[fallbackIndex]
  const location = user?.location
    ? `${user.location.city}, ${user.location.country}`
    : fallbackLocations[fallbackIndex]
  const username = user?.login?.username
    ? `@${user.login.username}`
    : "Profile preview"
  const age = String(user?.dob?.age ?? fallbackAges[fallbackIndex])
  const gender = user?.gender ?? fallbackGenders[fallbackIndex]
  const country = user?.location?.country
  const homeCountry =
    getCountryName(user?.nat, countryMeta) ?? country ?? "Home country"
  const countryFlagUrl =
    getCountryFlagUrl(user?.nat, countryMeta) ??
    getCountryFlagUrl(country, countryMeta)
  const languages = getCountryLanguages(country, countryMeta)
  const badgeSeed = user?.login?.uuid ?? name
  const occupation = getPreviewOccupation(badgeSeed)
  const lookingFor = getProfileLookingFor(badgeSeed)
  const profileBadges = getProfileBadges(badgeSeed)
  const stackClasses = [
    "left-[6%] z-10 translate-y-4 rotate-[-3deg] scale-[0.92] opacity-45",
    "left-1/2 z-30 -translate-x-1/2 translate-y-0 rotate-0 scale-100 opacity-100",
    "right-[6%] z-20 translate-y-4 rotate-[3deg] scale-[0.92] opacity-45",
  ]

  return (
    <Card
      className={cn(
        "absolute top-0 h-[505px] w-[min(21rem,78vw)] overflow-hidden border-border/80 p-0 transition-all duration-700 ease-out motion-safe:will-change-transform sm:h-[525px]",
        stackClasses[fallbackIndex],
        active
          ? "animate-in shadow-xl shadow-primary/5 fade-in-0 zoom-in-95 slide-in-from-bottom-4"
          : "shadow-sm"
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

      <div className="-mt-14 flex h-[calc(100%-3rem)] flex-col p-5 pt-0 text-center">
        <div
          className={cn(
            "relative mx-auto shrink-0 overflow-hidden rounded-full border-4 border-background bg-muted shadow-md",
            active ? "h-28 w-28" : "h-20 w-20"
          )}
        >
          {user?.picture?.large ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.picture.large}
              alt={name || "Profile"}
              className="absolute inset-0 h-full w-full rounded-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <HeartHandshake className={active ? "size-8" : "size-6"} />
            </div>
          )}
        </div>

        <div className="mt-4 min-w-0">
          <div className="flex min-w-0 items-center justify-center gap-2">
            <p
              className={cn(
                "truncate font-semibold",
                active ? "text-xl" : "text-base"
              )}
            >
              {name || "Profile preview"}
            </p>
            <ProfileStatusIcons
              badges={profileBadges}
              iconClassName={active ? "size-5" : "size-4"}
            />
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {username}
          </p>
          {active ? (
            <div className="mt-2 flex items-center justify-center gap-2 text-xs font-semibold">
              <span
                aria-label={gender}
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center",
                  getGenderIconColor(gender)
                )}
                title={gender}
              >
                {getGenderIcon(gender)}
              </span>
              <span
                aria-label={`${age} years old`}
                className="text-muted-foreground"
                title={`${age} years old`}
              >
                {age} yrs
              </span>
              {countryFlagUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={countryFlagUrl}
                  alt=""
                  className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-sm"
                  title={country}
                  aria-label={country ? `${country} flag` : "Country flag"}
                />
              ) : null}
            </div>
          ) : null}
        </div>

        {active ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground">
                Summary
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <PreviewDetail
                icon={<BriefcaseBusiness className="size-4" />}
                value={occupation}
                wide
              />
              <PreviewDetail
                icon={<House className="size-4" />}
                value={homeCountry}
                wide
              />
              <PreviewDetail
                icon={<MapPin className="size-4" />}
                value={location}
                wide
              />
              <PreviewDetail
                icon={<HeartHandshake className="size-4" />}
                value={`Looking for ${lookingFor.toLowerCase()}`}
                wide
              />
              <PreviewLanguages languages={languages} />
            </div>
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
  wide,
  value,
}: {
  capitalize?: boolean
  icon: React.ReactNode
  wide?: boolean
  value?: string
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
      {value ? (
        <p
          className={cn(
            "truncate text-sm font-semibold",
            capitalize && "capitalize"
          )}
        >
          {value}
        </p>
      ) : null}
    </div>
  )
}

function PreviewLanguages({ languages }: { languages: string[] }) {
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

function getGenderIcon(gender: string) {
  if (gender === "male") return <Mars className="size-4" />
  if (gender === "female") return <Venus className="size-4" />
  return <VenusAndMars className="size-4" />
}

function getGenderIconColor(gender: string) {
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

function getGalleryAlbumId(seed: string) {
  const total = seed
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0)

  return (total % 100) + 1
}

function getGalleryImageUrl(photoId: number, size: "full" | "thumb") {
  const dimensions = size === "full" ? "1200/900" : "900/900"
  return `https://picsum.photos/seed/jsonplaceholder-${photoId}/${dimensions}`
}

function useProfileGallery(seed: string) {
  const [photos, setPhotos] = React.useState<GalleryPhoto[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()

    async function loadGallery() {
      try {
        setLoading(true)
        setError(false)

        const albumId = getGalleryAlbumId(seed)
        const response = await fetch(
          `https://jsonplaceholder.typicode.com/albums/${albumId}/photos`,
          { signal: controller.signal }
        )

        if (!response.ok) {
          throw new Error("Failed to load gallery")
        }

        const data = (await response.json()) as GalleryPhoto[]
        setPhotos(data.slice(0, 8))
      } catch (err) {
        if ((err as Error).name === "AbortError") return
        setError(true)
        setPhotos([])
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadGallery()

    return () => controller.abort()
  }, [seed])

  return { photos, loading, error }
}

function ProfileGallery({
  seed,
  title = "Photo gallery",
}: {
  seed: string
  title?: string
}) {
  const { photos, loading, error } = useProfileGallery(seed)
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null)
  const [loadedFullPhotoIds, setLoadedFullPhotoIds] = React.useState<number[]>([])
  const activePhoto = activeIndex === null ? null : photos[activeIndex]
  const activePhotoNumber = activeIndex === null ? null : activeIndex + 1
  const activePhotoLoaded = activePhoto
    ? loadedFullPhotoIds.includes(activePhoto.id)
    : false

  React.useEffect(() => {
    if (activeIndex === null) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setActiveIndex((current) =>
          current === null ? current : (current - 1 + photos.length) % photos.length
        )
      }

      if (event.key === "ArrowRight") {
        event.preventDefault()
        setActiveIndex((current) =>
          current === null ? current : (current + 1) % photos.length
        )
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeIndex, photos.length])

  React.useEffect(() => {
    if (!activePhoto) return

    const indexesToPreload = [
      activeIndex,
      activeIndex === null ? null : (activeIndex + 1) % photos.length,
      activeIndex === null ? null : (activeIndex - 1 + photos.length) % photos.length,
    ].filter((value): value is number => value !== null)

    indexesToPreload.forEach((index) => {
      const photo = photos[index]
      if (!photo) return
      if (loadedFullPhotoIds.includes(photo.id)) return

      const image = new window.Image()
      image.src = getGalleryImageUrl(photo.id, "full")
      image.onload = () => {
        setLoadedFullPhotoIds((current) =>
          current.includes(photo.id) ? current : [...current, photo.id]
        )
      }
    })
  }, [activeIndex, activePhoto, loadedFullPhotoIds, photos])

  function showPreviousPhoto() {
    setActiveIndex((current) =>
      current === null ? current : (current - 1 + photos.length) % photos.length
    )
  }

  function showNextPhoto() {
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % photos.length
    )
  }

  return (
    <>
      <Card className="mt-5 rounded-[1.75rem] border-border/60 bg-card/95 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">
              A few extra moments from this profile.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            8 photos
          </Badge>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={index}
                className={cn(
                  "rounded-[1.25rem]",
                  index === 0 ? "col-span-2 aspect-[1.7/1] sm:col-span-2" : "aspect-square"
                )}
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-muted/25 px-4 py-8 text-center">
            <p className="text-sm font-medium">Gallery unavailable right now</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try reopening the profile in a moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "group relative overflow-hidden rounded-[1.25rem] bg-muted text-left outline-none transition focus-visible:ring-3 focus-visible:ring-ring/40",
                  index === 0 ? "col-span-2 aspect-[1.7/1] sm:col-span-2" : "aspect-square"
                )}
              >
                <Image
                  src={getGalleryImageUrl(photo.id, "thumb")}
                  alt={photo.title}
                  fill
                  sizes={index === 0 ? "(max-width: 640px) 100vw, 66vw" : "(max-width: 640px) 50vw, 33vw"}
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3">
                  <p className="line-clamp-2 text-xs font-medium text-white/95">
                    {photo.title}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={activeIndex !== null} onOpenChange={(open) => !open && setActiveIndex(null)}>
        {activePhoto ? (
          <DialogContent className="max-h-[calc(100svh-1rem)] max-w-[min(72rem,calc(100vw-1rem))] gap-3 border-border/60 bg-background/96 p-3 sm:p-4">
            <DialogTitle className="sr-only">{activePhoto.title}</DialogTitle>
            <DialogDescription className="sr-only">
              Photo {activeIndex! + 1} of {photos.length}
            </DialogDescription>

            <div className="relative overflow-hidden rounded-[1.25rem] bg-muted">
              <Image
                src={getGalleryImageUrl(activePhoto.id, "thumb")}
                alt={activePhoto.title}
                width={900}
                height={900}
                sizes="100vw"
                className="max-h-[70svh] w-full object-contain"
              />
              {activePhotoLoaded ? (
                <Image
                  src={getGalleryImageUrl(activePhoto.id, "full")}
                  alt={activePhoto.title}
                  fill
                  sizes="100vw"
                  className="absolute inset-0 object-contain"
                />
              ) : (
                <div className="absolute inset-x-0 bottom-3 flex justify-center">
                  <span className="rounded-full bg-background/88 px-3 py-1 text-xs text-muted-foreground shadow-sm">
                    Loading photo...
                  </span>
                </div>
              )}

              {photos.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-background/88"
                    onClick={showPreviousPhoto}
                  >
                    <ChevronLeft className="size-4" />
                    <span className="sr-only">Previous photo</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-background/88"
                    onClick={showNextPhoto}
                  >
                    <ChevronRight className="size-4" />
                    <span className="sr-only">Next photo</span>
                  </Button>
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-medium">{activePhoto.title}</p>
                <p className="text-xs text-muted-foreground">
                  Photo {activePhotoNumber} of {photos.length}
                </p>
              </div>
              <div className="hidden items-center gap-1 sm:flex">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={cn(
                      "h-1.5 w-6 rounded-full transition",
                      index === activeIndex ? "bg-primary" : "bg-muted-foreground/25"
                    )}
                    aria-label={`Open photo ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  )
}

function SavedUserProfile({
  countryMeta,
  user,
  onBack,
}: {
  countryMeta: Record<string, CountryMeta>
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
          Pick another profile from Discover.
        </p>
        <Button onClick={onBack} className="mt-5">
          Back to Discover
        </Button>
      </Card>
    )
  }

  const gallerySeed = user.login?.uuid ?? `${user.name.first}-${user.name.last}`

  return (
    <section className="mx-auto w-full max-w-[520px]">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Profile</h1>
      </div>
      <UserCard
        countryFlagUrl={
          getCountryFlagUrl(user.nat, countryMeta) ??
          getCountryFlagUrl(user.location.country, countryMeta)
        }
        homeCountry={
          getCountryName(user.nat, countryMeta) ?? user.location.country
        }
        languages={getCountryLanguages(user.location.country, countryMeta)}
        onSaveProfile={() => toggleSavedProfileInStorage(user)}
        showProfileMenuItem={false}
        showRequestMenu
        user={user}
      />
      <ProfileGallery seed={gallerySeed} />
    </section>
  )
}

function MyProfileView({
  avatar,
  countryMeta,
  prefs,
  onBack,
  onEditProfile,
}: {
  avatar?: string | null
  countryMeta: Record<string, CountryMeta>
  prefs: Prefs
  onBack: () => void
  onEditProfile: () => void
}) {
  const user = getPrefsProfileUser(prefs, avatar)
  const country = prefs.currentCountry || prefs.country
  const homeCountry = prefs.homeCountry || prefs.country || country
  const gallerySeed = user.login?.uuid ?? `${user.name.first}-${user.name.last}`

  return (
    <section className="mx-auto w-full max-w-[520px]">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">Your profile</h1>
      </div>
      <UserCard
        countryFlagUrl={getCountryFlagUrl(country, countryMeta)}
        homeCountry={getCountryName(homeCountry, countryMeta) ?? homeCountry}
        languages={prefs.languages ?? getCountryLanguages(country, countryMeta)}
        occupation={prefs.occupation}
        onEditProfile={onEditProfile}
        relationshipLabel={getMyProfileLookingFor(prefs.relationshipGoal)}
        user={user}
        variant="self"
      />
      <ProfileGallery seed={gallerySeed} title="Your gallery" />
    </section>
  )
}

function NotificationsView({
  onBack,
  onOpenProfile,
}: {
  onBack: () => void
  onOpenProfile: (notification: RequestNotification) => void
}) {
  const [notifications, setNotifications] = React.useState<
    RequestNotification[]
  >([])

  React.useEffect(() => {
    function syncNotifications() {
      setNotifications(getSavedRequestNotifications())
    }

    syncNotifications()
    window.addEventListener(REQUEST_NOTIFICATIONS_EVENT, syncNotifications)
    window.setTimeout(markRequestNotificationsRead, 0)

    return () => {
      window.removeEventListener(
        REQUEST_NOTIFICATIONS_EVENT,
        syncNotifications
      )
    }
  }, [])

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Notifications</h1>
      </div>

      <Card className="overflow-hidden border-border/60 bg-card/90 p-0 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur md:rounded-[2rem] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        {notifications.length ? (
          <div className="divide-y divide-border/60">
            {notifications.map((notification) => (
              <NotificationListItem
                key={notification.id}
                notification={notification}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bell className="size-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Nothing new yet</h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              When someone sends a request or replies to yours, it will show up
              here.
            </p>
          </div>
        )}
      </Card>
    </section>
  )
}

function ConnectionsView({
  counts,
  currentSection,
  onOpenAccepted,
  onOpenIncoming,
  onOpenProfile,
  onOpenRequested,
  sourceUsers,
}: {
  counts: { incoming: number; likes: number; requests: number }
  currentSection: "accepted" | "requested" | "incoming"
  onOpenAccepted: () => void
  onOpenIncoming: () => void
  onOpenProfile: (user: User) => void
  onOpenRequested: () => void
  sourceUsers: RandomUser[]
}) {
  const [connections, setConnections] = React.useState<User[]>([])
  const [incomingNotifications, setIncomingNotifications] = React.useState<
    RequestNotification[]
  >([])
  const [requestedKeys, setRequestedKeys] = React.useState<string[]>([])

  React.useEffect(() => {
    function syncConnections() {
      const seenKeys = new Set<string>()
      const acceptedUsers = getSavedRequestNotifications()
        .filter((notification) => notification.status === "accepted")
        .map((notification) => notification.profile ?? getNotificationProfileUser(notification))
        .filter(isProfileUser)
        .filter((user) => {
          const profileKey = getProfileKey(user)
          if (seenKeys.has(profileKey)) return false
          seenKeys.add(profileKey)
          return true
        })

      setConnections(acceptedUsers)
      setIncomingNotifications(
        getSavedRequestNotifications().filter(
          (notification) =>
            notification.direction === "incoming" &&
            notification.status === "pending"
        )
      )
      setRequestedKeys(getPendingRequestedProfileKeys())
    }

    syncConnections()
    window.addEventListener(REQUEST_NOTIFICATIONS_EVENT, syncConnections)
    window.addEventListener("wimp:requested-profiles:change", syncConnections)
    return () =>
      {
        window.removeEventListener(
          REQUEST_NOTIFICATIONS_EVENT,
          syncConnections
        )
        window.removeEventListener(
          "wimp:requested-profiles:change",
          syncConnections
        )
      }
  }, [])

  const requestedUsers = React.useMemo(
    () =>
      sourceUsers
        .filter(isProfileUser)
        .filter((user) => requestedKeys.includes(getProfileKey(user))),
    [requestedKeys, sourceUsers]
  )
  const incomingUsers = React.useMemo(
    () =>
      incomingNotifications
        .map((notification) => {
          const user = notification.profile ?? getNotificationProfileUser(notification)

          return isProfileUser(user)
            ? { notification, user }
            : null
        })
        .filter((item): item is { notification: RequestNotification; user: User } =>
          item !== null
        ),
    [incomingNotifications]
  )
  const connectionTabs = [
    {
      id: "accepted" as const,
      label: "Matches",
      Icon: CheckCircle2,
      count: 0,
      onClick: onOpenAccepted,
      badgeClassName: "",
    },
    {
      id: "incoming" as const,
      label: "Incoming",
      Icon: ArrowDownLeft,
      count: counts.incoming,
      onClick: onOpenIncoming,
      badgeClassName:
        "bg-primary/12 text-primary ring-1 ring-primary/15 dark:bg-primary/18",
    },
    {
      id: "requested" as const,
      label: "Sent",
      Icon: ArrowUpRight,
      count: counts.requests,
      onClick: onOpenRequested,
      badgeClassName: "bg-background/80 text-muted-foreground ring-1 ring-border/70",
    },
  ]

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Connections</h1>
      </div>

      <div className="inline-flex w-full max-w-[32rem] gap-1 rounded-[1.5rem] border border-border/60 bg-muted/35 p-1.5 shadow-sm">
        {connectionTabs.map(({ id, label, Icon, count, onClick, badgeClassName }) => {
          const active = currentSection === id

          return (
            <button
              key={id}
              type="button"
              onClick={onClick}
              className={cn(
                "flex min-w-0 items-center justify-center gap-1.5 rounded-[1.1rem] px-2.5 py-3 text-xs font-medium transition sm:flex-1 sm:gap-2 sm:px-4 sm:text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/40",
                active
                  ? "flex-[1.4] bg-background text-foreground shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                  : "flex-1 text-muted-foreground hover:bg-background/70 hover:text-foreground"
              )}
              aria-pressed={active}
              aria-label={label}
            >
              <Icon className={cn("size-4", active ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("hidden whitespace-nowrap sm:inline", active && "inline sm:inline")}>
                {label}
              </span>
              {count > 0 ? (
                <Badge
                  variant="secondary"
                  className={cn(
                    "shrink-0 rounded-full px-1.5 py-0 text-[10px] font-semibold leading-5 shadow-none sm:px-2 sm:text-[11px]",
                    active ? "bg-primary text-primary-foreground" : badgeClassName
                  )}
                >
                  {count}
                </Badge>
              ) : null}
            </button>
          )
        })}
      </div>

      {currentSection === "incoming" ? (
        incomingUsers.length ? (
          <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            {incomingUsers.map(({ notification, user }) => (
              <ConnectionInboxItem
                key={notification.id}
                user={user}
                title="Sent you a request"
                badgeLabel="Needs reply"
                badgeVariant="warm"
                onOpenProfile={() => onOpenProfile(user)}
                actions={
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => respondToIncomingRequest(notification.id, "rejected")}
                    >
                      Decline
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full"
                      onClick={() => respondToIncomingRequest(notification.id, "accepted")}
                    >
                      Accept
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-[1.75rem] border-border/60 bg-card/90 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Bell className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No incoming requests yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              New people who request to connect with you will appear here.
            </p>
          </Card>
        )
      ) : currentSection === "requested" ? (
        requestedUsers.length ? (
          <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            {requestedUsers.map((user) => (
              <ConnectionInboxItem
                key={getProfileKey(user)}
                user={user}
                title="Waiting for their reply"
                badgeLabel="Pending"
                badgeVariant="outline"
                onOpenProfile={() => onOpenProfile(user)}
                actions={
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() =>
                        saveRequestedProfiles(
                          getPendingRequestedProfileKeys().filter(
                            (key) => key !== getProfileKey(user)
                          )
                        )
                      }
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      className="rounded-full"
                      onClick={() => onOpenProfile(user)}
                    >
                      View
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-[1.75rem] border-border/60 bg-card/90 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <Mail className="size-6" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">No requested users yet</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Profiles you send requests to will appear here.
            </p>
          </Card>
        )
      ) : connections.length ? (
        <div className="overflow-hidden rounded-[1.75rem] border border-border/60 bg-card/95 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          {connections.map((user) => (
            <ConnectionInboxItem
              key={getProfileKey(user)}
              user={user}
              title="You matched with each other"
              badgeLabel="Matched"
              badgeVariant="success"
              onOpenProfile={() => onOpenProfile(user)}
              actions={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => onOpenProfile(user)}
                  >
                    View
                  </Button>
                  <Button type="button" className="rounded-full">
                    Message
                  </Button>
                </>
              }
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-[1.75rem] border-border/60 bg-card/90 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <HeartHandshake className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No connections yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Accepted matches from both sides will appear here.
          </p>
        </Card>
      )}
    </section>
  )
}

function ConnectionInboxItem({
  user,
  title,
  badgeLabel,
  badgeVariant,
  onOpenProfile,
  actions,
}: {
  user: User
  title: string
  badgeLabel: string
  badgeVariant: "outline" | "success" | "warm"
  onOpenProfile: () => void
  actions: React.ReactNode
}) {
  const name = `${user.name.first} ${user.name.last}`
  const username = user.login?.username ? `@${user.login.username}` : null
  const location = [user.location.city, user.location.country].filter(Boolean).join(", ")
  const badgeSeed = user.login?.uuid ?? user.login?.username ?? name
  const preview = `${getPreviewOccupation(badgeSeed)}${
    user.dob?.age ? ` • ${user.dob.age} yrs` : ""
  }`

  return (
    <div className="border-b border-border/60 last:border-b-0">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <button
          type="button"
          onClick={onOpenProfile}
          className="flex min-w-0 flex-1 items-center gap-3 text-left outline-none transition hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          <div className="relative size-14 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted">
            {user.picture.large ? (
              <Image
                src={user.picture.large}
                alt={name}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-muted-foreground">
                <UserRound className="size-5" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                {name}
              </p>
              <Badge variant={badgeVariant} className="rounded-full px-2 py-0 text-[11px]">
                {badgeLabel}
              </Badge>
            </div>
            <p className="truncate text-sm text-foreground/80">{title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[username, preview, location].filter(Boolean).join(" • ")}
            </p>
          </div>
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      </div>
    </div>
  )
}

function SavedView({
  onOpenProfile,
}: {
  onOpenProfile: (user: User) => void
}) {
  const [savedUsers, setSavedUsers] = React.useState<User[]>([])

  React.useEffect(() => {
    function syncSavedState() {
      setSavedUsers(getSavedProfilesFromStorage())
    }

    syncSavedState()
    window.addEventListener("wimp:liked-users:change", syncSavedState)

    return () => {
      window.removeEventListener("wimp:liked-users:change", syncSavedState)
    }
  }, [])

  function toggleSavedUser(user: User) {
    toggleSavedProfileInStorage(user)
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Saved</h1>
      </div>

      {savedUsers.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {savedUsers.map((user) => (
            <UserCard
              key={getProfileKey(user)}
              clickableCard
              onProfileClick={() => onOpenProfile(user)}
              onSaveProfile={() => toggleSavedUser(user)}
              showActions
              showRequestMenu
              user={user}
            />
          ))}
        </div>
      ) : (
        <Card className="rounded-[1.75rem] border-border/60 bg-card/90 p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Bookmark className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">No saved profiles yet</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Profiles you save from Discover will appear here.
          </p>
        </Card>
      )}
    </section>
  )
}

function SettingsView({
  onEditProfile,
  prefs,
}: {
  onEditProfile: () => void
  prefs: Prefs
}) {
  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Workspace controls
        </p>
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <Card className="rounded-[1.75rem] border-border/60 bg-card/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <div className="flex items-start gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <Settings2 className="size-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold">Profile preferences</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Update your dating preferences, profile details, and match
                criteria whenever you want.
              </p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {prefs.relationshipGoal || "Goal not set"}
            </Badge>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {prefs.currentCountry || prefs.country || "Location not set"}
            </Badge>
          </div>
          <Button onClick={onEditProfile} className="mt-6 rounded-full">
            Edit your profile
          </Button>
        </Card>

        <Card className="rounded-[1.75rem] border-border/60 bg-card/90 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
          <p className="text-sm font-medium text-muted-foreground">
            Account snapshot
          </p>
          <h2 className="mt-2 text-lg font-semibold">{prefs.name}</h2>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>Gender: <span className="text-foreground">{prefs.gender || "Not set"}</span></p>
            <p>Age: <span className="text-foreground">{prefs.age || "Not set"}</span></p>
            <p>
              Looking for:{" "}
              <span className="text-foreground">
                {getMyProfileLookingFor(prefs.relationshipGoal)}
              </span>
            </p>
          </div>
        </Card>
      </div>
    </section>
  )
}

function NotificationListItem({
  notification,
  onOpenProfile,
}: {
  notification: RequestNotification
  onOpenProfile: (notification: RequestNotification) => void
}) {
  const accepted = notification.status === "accepted"
  const isPendingIncoming =
    notification.direction === "incoming" && notification.status === "pending"
  const detail =
    notification.direction === "incoming"
      ? notification.status === "pending"
        ? "sent you a request"
        : accepted
          ? "is now in your connections"
          : "request was declined"
      : accepted
        ? "accepted your request"
        : "rejected your request"
  const createdAt = new Date(notification.createdAt)
  const timeLabel = Number.isNaN(createdAt.getTime())
    ? "Just now"
    : createdAt.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })

  return (
    <div
      className="flex cursor-pointer flex-col gap-4 p-4 transition hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      role="button"
      tabIndex={0}
      onClick={() => onOpenProfile(notification)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onOpenProfile(notification)
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-3">
        {notification.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={notification.profileImage}
            alt=""
            className="size-14 shrink-0 rounded-full object-cover ring-4 ring-background"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted">
            <UserRound className="size-5 text-muted-foreground" />
          </span>
        )}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold">
              {notification.profileName}
            </p>
            {!notification.read ? (
              <span className="h-2.5 w-2.5 rounded-full bg-primary" />
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {notification.profileName} {detail}
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            {timeLabel}
          </p>
        </div>
      </div>

      {isPendingIncoming ? (
        <div className="flex self-start gap-2 sm:self-auto sm:justify-end">
          <Button
            type="button"
            className="flex-1 rounded-full sm:flex-none"
            onClick={(event) => {
              event.stopPropagation()
              respondToIncomingRequest(notification.id, "accepted")
            }}
          >
            <Check className="size-4" />
            Accept
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:flex-none"
            onClick={(event) => {
              event.stopPropagation()
              respondToIncomingRequest(notification.id, "rejected")
            }}
          >
            <X className="size-4" />
            Decline
          </Button>
        </div>
      ) : (
        <Badge
          variant="outline"
          className={cn(
            "self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-auto",
            accepted
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
          )}
        >
          {accepted ? "Accepted" : "Rejected"}
        </Badge>
      )}
    </div>
  )
}

function getPrefsProfileUser(prefs: Prefs, avatar?: string | null): User {
  const [firstName, ...lastNameParts] = (prefs.name || "Your Profile").split(
    " "
  )
  const currentCountry = prefs.currentCountry || prefs.country || "Not set"
  const currentCity = prefs.currentCity || prefs.city || "Not set"

  return {
    gender: prefs.gender,
    name: {
      first: firstName || "Your",
      last: lastNameParts.join(" ") || "Profile",
    },
    location: {
      city: currentCity,
      country: currentCountry,
    },
    dob: {
      age: prefs.age,
      date: prefs.birthday,
    },
    picture: {
      large: avatar || "/icon.svg",
    },
    login: {
      uuid: "my-profile",
      username: formatUsername(prefs.name),
    },
    nat: prefs.homeCountry || prefs.country,
  }
}

function getMyProfileLookingFor(value?: string) {
  switch (value) {
    case "long-term":
    case "serious":
      return "Long-term partner"
    case "meaningful-dates":
      return "Meaningful dates"
    case "friendship-first":
    case "friendship":
      return "Friendship first"
    case "exploring":
    case "open":
      return "Still exploring"
    case "casual":
      return "Casual dating"
    default:
      return "Not set"
  }
}

function formatUsername(name?: string) {
  const handle = (name ?? "user")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")

  return handle || "user"
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

function LandingFeature({ title, detail }: { title: string; detail: string }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="order-2 space-y-4 lg:order-1">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 gap-3 lg:hidden">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </aside>

      <section className="order-1 mx-auto w-full max-w-[480px] space-y-4 lg:order-2">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-7 w-56" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>

        <Skeleton className="h-2 w-full rounded-full" />

        <Card className="overflow-hidden p-0">
          <Skeleton className="h-32 w-full rounded-none" />
          <div className="-mt-16 flex flex-col items-center p-5 pt-0 text-center">
            <Skeleton className="size-36 rounded-full border-4 border-background sm:size-40" />
            <Skeleton className="mt-5 h-7 w-52" />
            <Skeleton className="mt-2 h-4 w-64 max-w-full" />

            <div className="mt-5 grid w-full gap-3 sm:grid-cols-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>

            <Skeleton className="mt-4 h-16 w-full" />
            <div className="mt-4 grid w-full gap-2 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="size-10" />
          <Skeleton className="h-12 w-full" />
        </div>
      </section>
    </div>
  )
}

function FilterSheet({
  countryMeta,
  locationOptions,
  locationsLoading,
  matchingCount,
  onPrefsChange,
  prefs,
}: {
  countryMeta: Record<string, CountryMeta>
  locationOptions: CountryCityOption[]
  locationsLoading: boolean
  matchingCount: number
  onPrefsChange: (prefs: Prefs) => void
  prefs: Prefs
}) {
  const countryItems = locationOptions.map((item) => ({
    value: item.country,
    label: item.country,
    iconUrl: getCountryFlagUrl(item.country, countryMeta),
  }))

  function update<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    onPrefsChange({ ...prefs, [key]: value })
  }

  function updateHomeCountry(value: string) {
    const preferenceHomeCountry =
      value === WORLDWIDE
        ? WORLDWIDE
        : value === SAME_AS_MY_COUNTRY
          ? prefs.homeCountry || prefs.country || ""
          : value

    onPrefsChange({
      ...prefs,
      preferenceHomeCountry,
    })
  }

  function updateCurrentCountry(value: string) {
    const preferenceCurrentCountry =
      value === WORLDWIDE
        ? WORLDWIDE
        : value === SAME_AS_CURRENT_LOCATION
          ? prefs.currentCountry || prefs.country || ""
          : value

    onPrefsChange({
      ...prefs,
      preferenceCurrentCountry,
    })
  }

  function toggleAgeFilter(value: string) {
    if (value === "any") return ["any"]

    const ageRanges = FILTER_AGES.filter((range) => range !== "any")
    const next = prefs.partnerAges.includes(value)
      ? prefs.partnerAges.filter((range) => range !== value && range !== "any")
      : [...prefs.partnerAges.filter((range) => range !== "any"), value]

    if (ageRanges.every((range) => next.includes(range))) return ["any"]
    return next.length ? next : ["any"]
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-between gap-2 rounded-full px-3"
        >
          <span className="flex items-center gap-2">
            <Filter className="size-4" />
            Filters
          </span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetHeader>
          <SheetTitle>Preferences</SheetTitle>
          <SheetDescription>
            Filters to help you find the right matches.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 pr-1">
          <div className="space-y-6">
          <EditableFilterGroup
            label="Looking for"
            options={FILTER_GENDERS}
            selected={prefs.partnerGenders}
            onToggle={(value) => update("partnerGenders", [value])}
          />
          <EditableFilterGroup
            label="Age range"
            options={FILTER_AGES.map((value) => ({
              value,
              label: value === "any" ? "Any" : value,
            }))}
            selected={prefs.partnerAges}
            onToggle={(value) => update("partnerAges", toggleAgeFilter(value))}
          />

          <CountrySelectField
            disabled={locationsLoading || countryItems.length === 0}
            items={[
              {
                value: WORLDWIDE,
                label: "Worldwide",
                icon: <Globe2 className="size-4" />,
              },
              {
                value: SAME_AS_CURRENT_LOCATION,
                label: "Same as my current location",
                iconUrl: getCountryFlagUrl(
                  prefs.currentCountry || prefs.country,
                  countryMeta
                ),
              },
              ...countryItems,
            ]}
            label="Current location"
            onValueChange={updateCurrentCountry}
            placeholder={
              locationsLoading
                ? "Loading countries..."
                : "Select current country"
            }
            value={
              prefs.preferenceCurrentCountry ||
              prefs.currentCountry ||
              prefs.country ||
              WORLDWIDE
            }
          />

          <CountrySelectField
            disabled={locationsLoading || countryItems.length === 0}
            items={[
              {
                value: WORLDWIDE,
                label: "Worldwide",
                icon: <Globe2 className="size-4" />,
              },
              {
                value: SAME_AS_MY_COUNTRY,
                label: "Same as my country",
                iconUrl: getCountryFlagUrl(prefs.homeCountry, countryMeta),
              },
              ...countryItems,
            ]}
            label="Home country"
            onValueChange={updateHomeCountry}
            placeholder={
              locationsLoading ? "Loading countries..." : "Select home country"
            }
            value={
              prefs.preferenceHomeCountry || prefs.homeCountry || WORLDWIDE
            }
          />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

function CountrySelectField({
  disabled,
  items,
  label,
  onValueChange,
  placeholder,
  value,
}: {
  disabled?: boolean
  items: {
    value: string
    label: string
    icon?: React.ReactNode
    iconUrl?: string
  }[]
  label: string
  onValueChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              <span className="flex min-w-0 items-center gap-2">
                {item.iconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.iconUrl}
                    alt=""
                    className="h-4 w-6 shrink-0 rounded-[2px] object-cover shadow-sm"
                  />
                ) : (
                  item.icon
                )}
                <span className="truncate">{item.label}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function EditableFilterGroup({
  label,
  onToggle,
  options,
  selected,
}: {
  label: string
  onToggle: (value: string) => void
  options: { value: string; label: string }[]
  selected: string[]
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option.value)

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={cn(
                "rounded-full border bg-background px-3 py-1.5 text-sm font-medium capitalize transition hover:bg-muted",
                active && "border-primary bg-primary text-primary-foreground"
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
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
