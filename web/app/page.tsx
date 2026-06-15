"use client"

import * as React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  Filter,
  Globe2,
  HeartHandshake,
  House,
  Languages,
  Mail,
  MapPin,
  Mars,
  Sparkles,
  UserRound,
  Venus,
  VenusAndMars,
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
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  countryMeta: Record<string, CountryMeta>
) {
  const languages = countryMeta[normalizeCountryName(country)]?.languages ?? []
  return languages.slice(0, 5)
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
      goDeck()
      return
    }

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
          const nextView = !view || view === "home" ? "deck" : view
          setView(nextView)
          if (!view || view === "home") setViewQuery("deck", "replace")
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
          ? "deck"
          : (nextView ?? "home")
      )
    }

    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [prefs])

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

  return (
    <div className="min-h-svh bg-background text-foreground">
      <NavBar
        prefs={prefs}
        userImage={signedUserImage}
        onEditProfile={editProfile}
        onHome={goHome}
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

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {view === "setup" ? (
          <Onboarding
            initialPrefs={prefs}
            profileOnly={Boolean(prefs)}
            onBack={prefs ? goDeck : goHome}
            onComplete={(p: Prefs) => {
              const wasEditingProfile = Boolean(prefs)
              setPrefs(p)
              if (!wasEditingProfile && selectedUser) {
                goProfile(selectedUser)
              } else {
                goDeck()
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
            onBack={goDeck}
          />
        ) : view === "my-profile" && prefs ? (
          <MyProfileView
            avatar={signedUserImage}
            countryMeta={countryMeta}
            prefs={prefs}
            onBack={goDeck}
            onEditProfile={editProfile}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[160px_minmax(0,1fr)]">
            <aside className="order-1 lg:order-1">
              <FilterSheet
                countryMeta={countryMeta}
                locationOptions={locationOptions}
                locationsLoading={locationsLoading}
                matchingCount={displayUsers.length}
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
                  getCountryName(user.nat, countryMeta) ??
                  user.location?.country
                }
                getLanguages={(user) =>
                  getCountryLanguages(user.location?.country, countryMeta)
                }
                users={displayUsers}
                onLoadMore={() => fetchUsers(MORE_PROFILE_COUNT)}
                onViewProfile={(user) => {
                  setSelectedUser(user)
                  saveSelectedUser(user)
                  goProfile(user)
                }}
              />
            </div>
          </div>
        )}
      </main>
      <Sheet open={profileSheetOpen} onOpenChange={setProfileSheetOpen}>
        <SheetContent
          side="bottom"
          className="overflow-y-auto sm:w-[min(48rem,calc(100vw-2rem))]"
        >
          <SheetHeader>
            <SheetTitle>Edit profile</SheetTitle>
            <SheetDescription>
              Make quick changes to your account.
            </SheetDescription>
          </SheetHeader>
          {prefs ? (
            <SimpleProfileEditForm
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
          ) : null}
        </SheetContent>
      </Sheet>
      <AppFooter />
    </div>
  )
}

function clearAppStorage() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("wimp:"))
    .forEach((key) => localStorage.removeItem(key))
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

  React.useEffect(() => {
    setDraft(prefs)
  }, [prefs])

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
      <div className="flex items-center gap-4">
        <div className="size-16 overflow-hidden rounded-full border bg-muted">
          {draft.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.avatar} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <UserRound className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {draft.name || "Your profile"}
          </p>
          <Input
            type="file"
            accept="image/*"
            className="mt-2"
            onChange={(event) => updateAvatar(event.target.files?.[0])}
          />
        </div>
      </div>

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

      <div className="sticky bottom-0 -mx-4 grid gap-2 border-t bg-background/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:flex sm:justify-end sm:px-6">
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

function AppFooter() {
  const year = new Date().getFullYear()
  const socials = [
    { href: "https://facebook.com", label: "Facebook", icon: FacebookIcon },
    { href: "https://wa.me", label: "WhatsApp", icon: WhatsAppIcon },
    { href: "https://x.com", label: "X", icon: XSocialIcon },
    { href: "mailto:hello@bhcozy.com", label: "Email", icon: Mail },
  ]

  return (
    <footer className="border-t bg-background">
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

type AppView = "home" | "setup" | "deck" | "profile" | "my-profile"

function getViewQuery(): AppView | null {
  const view = new URLSearchParams(window.location.search).get("view")
  return view === "home" ||
    view === "setup" ||
    view === "deck" ||
    view === "profile" ||
    view === "my-profile"
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
            data, and a focused dashboard experience built for quick discovery.
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
          Pick another profile from the discovery dashboard.
        </p>
        <Button onClick={onBack} className="mt-5">
          Back to dashboard
        </Button>
      </Card>
    )
  }

  const name = `${user.name.first} ${user.name.last}`

  return (
    <section className="mx-auto w-full max-w-[520px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Saved profile
          </p>
          <h1 className="text-2xl font-semibold">{name}</h1>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to dashboard
        </Button>
      </div>
      <UserCard
        countryFlagUrl={
          getCountryFlagUrl(user.nat, countryMeta) ??
          getCountryFlagUrl(user.location.country, countryMeta)
        }
        hideProfileButton
        homeCountry={
          getCountryName(user.nat, countryMeta) ?? user.location.country
        }
        languages={getCountryLanguages(user.location.country, countryMeta)}
        showRequestMenu
        user={user}
      />
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

  return (
    <section className="mx-auto w-full max-w-[520px]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Your profile
          </p>
          <h1 className="text-2xl font-semibold">{prefs.name}</h1>
        </div>
        <Button variant="outline" onClick={onBack}>
          Back to dashboard
        </Button>
      </div>
      <UserCard
        countryFlagUrl={getCountryFlagUrl(country, countryMeta)}
        hideProfileButton
        homeCountry={getCountryName(homeCountry, countryMeta) ?? homeCountry}
        languages={prefs.languages ?? getCountryLanguages(country, countryMeta)}
        occupation={prefs.occupation}
        onEditProfile={onEditProfile}
        relationshipLabel={getMyProfileLookingFor(prefs.relationshipGoal)}
        user={user}
        variant="self"
      />
    </section>
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

        <div className="min-h-0 space-y-6 overflow-y-auto pr-1">
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
