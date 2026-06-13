"use client"

import React, { useEffect, useState } from "react"
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  HeartHandshake,
  ImagePlus,
  Mars,
  Trash2,
  User,
  Venus,
  VenusAndMars,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { APP_NAME, COUNTRY_CITY_API_URL } from "@/constants"
import { cn } from "@/lib/utils"

type Prefs = {
  name: string
  avatar: string
  gender: string
  age: number
  birthday: string
  country: string
  city: string
  location: string
  occupation: string
  relationshipGoal: string
  partnerGenders: string[]
  partnerAges: string[]
}

type Props = {
  onComplete: (prefs: Prefs) => void
}

type CountryCityOption = {
  country: string
  cities: string[]
}

const AGE_RANGES = ["18-24", "25-30", "31-40", "41+"]
const STEPS = ["Profile", "Preferences", "Review"]

const DEFAULT_FORM: Prefs = {
  name: "",
  avatar: "",
  gender: "",
  age: 0,
  birthday: "",
  country: "",
  city: "",
  location: "",
  occupation: "",
  relationshipGoal: "serious",
  partnerGenders: ["female"],
  partnerAges: ["18-24"],
}

export default function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<Prefs>(() => getSavedOnboardingForm())
  const [locationOptions, setLocationOptions] = useState<CountryCityOption[]>(
    []
  )
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [locationsError, setLocationsError] = useState("")

  useEffect(() => {
    try {
      if (!isDefaultOnboardingForm(form)) {
        localStorage.setItem("wimp:onboard:v2:progress", JSON.stringify(form))
      } else {
        localStorage.removeItem("wimp:onboard:v2:progress")
      }
    } catch {
      // ignore
    }
  }, [form])

  useEffect(() => {
    let cancelled = false

    async function loadLocations() {
      setLocationsLoading(true)
      setLocationsError("")
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
        if (!cancelled) setLocationsError("Could not load locations.")
      } finally {
        if (!cancelled) setLocationsLoading(false)
      }
    }

    void loadLocations()

    return () => {
      cancelled = true
    }
  }, [])

  function update<K extends keyof Prefs>(k: K, v: Prefs[K]) {
    setForm((s) => ({ ...s, [k]: v }))
  }

  function updateBirthday(birthday: string) {
    setForm((s) => ({
      ...s,
      birthday,
      age: calculateAge(birthday),
    }))
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

  function updateCountry(country: string) {
    setForm((s) => ({
      ...s,
      country,
      city: "",
      location: country,
    }))
  }

  function updateCity(city: string) {
    setForm((s) => ({
      ...s,
      city,
      location: city ? `${city}, ${s.country}` : s.country,
    }))
  }

  function toggle<T extends string>(arr: T[], v: T) {
    if (v === "any") return arr.includes("any" as T) ? [] : [v]
    const next = arr.filter((x) => x !== "any")
    return next.includes(v) ? next.filter((x) => x !== v) : [...next, v]
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }

  function back() {
    if (step > 0) setStep((s) => s - 1)
  }

  async function submit() {
    setLoading(true)
    try {
      localStorage.setItem("wimp:onboard:v2", JSON.stringify(form))
      localStorage.removeItem("wimp:onboard:v2:progress")
      onComplete(form)
    } finally {
      setLoading(false)
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100
  const canContinue =
    step === 0
      ? form.name.trim().length > 1 &&
        form.gender.trim().length > 1 &&
        form.birthday.trim().length > 1 &&
        form.age >= 18 &&
        form.country.trim().length > 1 &&
        form.city.trim().length > 1
      : step === 1
        ? form.partnerGenders.length > 0 && form.partnerAges.length > 0
        : true

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid min-h-[620px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden border-r bg-muted/35 p-6 lg:block">
          <div className="flex size-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <HeartHandshake className="size-7" />
          </div>
          <h1 className="mt-5 text-3xl font-semibold">{APP_NAME}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Discover compatible partner profiles with a clean setup flow,
            preference-based matching, and real-looking profile data.
          </p>

        </aside>

        <section className="p-4 sm:p-6 lg:p-8">
          <div className="mb-6 space-y-3 sm:mb-7">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h2 className="mt-1 text-2xl font-semibold">{STEPS[step]}</h2>
              </div>
              <Badge variant="secondary">{Math.round(progress)}%</Badge>
            </div>
            <Progress value={progress} />
          </div>

          <div className="min-h-[320px] sm:min-h-[390px]">
            {step === 0 && (
              <div className="space-y-5 sm:space-y-6">
                <SectionHeader
                  icon={<User className="size-5" />}
                  title="Your details"
                  description="This is the profile information used around the app."
                />

                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div className="sm:col-span-2">
                    <AvatarPicker
                      name={form.name}
                      avatar={form.avatar}
                      onAvatarChange={updateAvatar}
                      onAvatarRemove={() => update("avatar", "")}
                    />
                  </div>

                  <Field label="Name" className="sm:col-span-2">
                    <Input
                      value={form.name}
                      placeholder="Alex Morgan"
                      onChange={(e) => update("name", e.target.value)}
                    />
                  </Field>

                  <Field label="Gender" className="sm:col-span-2">
                    <GenderToggle
                      value={form.gender}
                      onValueChange={(value) => update("gender", value)}
                    />
                  </Field>

                  <Field label="Birthday" className="sm:col-span-2">
                    <BirthdayPicker
                      value={form.birthday}
                      onValueChange={updateBirthday}
                    />
                    {form.birthday && form.age < 18 ? (
                      <p className="text-xs text-destructive">
                        You must be at least 18 to continue.
                      </p>
                    ) : null}
                  </Field>

                  <Field label="Country">
                    <SelectControl
                      value={form.country}
                      onValueChange={updateCountry}
                      placeholder={
                        locationsLoading
                          ? "Loading countries..."
                          : "Select country"
                      }
                      disabled={locationsLoading || locationOptions.length === 0}
                      items={locationOptions.map((item) => ({
                        value: item.country,
                        label: item.country,
                      }))}
                    />
                  </Field>

                  <Field label="City">
                    <SelectControl
                      value={form.city}
                      onValueChange={updateCity}
                      placeholder={
                        form.country ? "Select city" : "Select country first"
                      }
                      disabled={
                        !form.country ||
                        getCities(form.country, locationOptions).length === 0
                      }
                      items={getCities(form.country, locationOptions).map(
                        (city) => ({
                          value: city,
                          label: city,
                        })
                      )}
                    />
                  </Field>

                  {locationsError ? (
                    <p className="text-sm text-destructive sm:col-span-2">
                      {locationsError}
                    </p>
                  ) : null}

                  <Field label="Occupation (optional)">
                    <div className="relative">
                      <BriefcaseBusiness className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={form.occupation}
                        placeholder="Designer, developer..."
                        onChange={(e) => update("occupation", e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </Field>

                  <Field label="Relationship goal">
                    <SelectControl
                      value={form.relationshipGoal}
                      onValueChange={(value) =>
                        update("relationshipGoal", value)
                      }
                      items={[
                        {
                          value: "serious",
                          label: "Serious relationship",
                        },
                        { value: "friendship", label: "Friendship first" },
                        { value: "casual", label: "Casual dating" },
                        { value: "open", label: "Open to possibilities" },
                      ]}
                    />
                  </Field>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-7">
                <SectionHeader
                  icon={<Heart className="size-5" />}
                  title="Match preferences"
                  description="Choose who should appear in your discovery deck."
                />

                <ChoiceGrid
                  title="Preferred gender"
                  choices={[
                    { id: "male", label: "Men", detail: "Show male profiles" },
                    {
                      id: "female",
                      label: "Women",
                      detail: "Show female profiles",
                    },
                    { id: "any", label: "Any", detail: "Keep the deck open" },
                  ]}
                  selected={form.partnerGenders}
                  onToggle={(id) =>
                    update("partnerGenders", toggle(form.partnerGenders, id))
                  }
                />

                <ChoiceGrid
                  title="Preferred age"
                  choices={AGE_RANGES.map((range) => ({
                    id: range,
                    label: range,
                    detail:
                      range === "41+"
                        ? "Experienced and established"
                        : "Balanced discovery range",
                  }))}
                  selected={form.partnerAges}
                  onToggle={(id) =>
                    update("partnerAges", toggle(form.partnerAges, id))
                  }
                />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <SectionHeader
                  icon={<Check className="size-5" />}
                  title="Review setup"
                  description="Confirm your profile before opening the deck."
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <ReviewItem label="Name" value={form.name || "Not set"} />
                  <ReviewItem
                    label="Avatar"
                    value={form.avatar ? "Uploaded" : "Not set"}
                  />
                  <ReviewItem
                    label="Birthday"
                    value={formatBirthday(form.birthday) || "Not set"}
                  />
                  <ReviewItem label="Gender" value={form.gender} />
                  <ReviewItem
                    label="Location"
                    value={form.location || `${form.city}, ${form.country}`}
                  />
                  <ReviewItem
                    label="Occupation"
                    value={form.occupation || "Not set"}
                  />
                  <ReviewItem label="Goal" value={form.relationshipGoal} />
                  <ReviewItem
                    label="Looking for"
                    value={form.partnerGenders.join(", ")}
                  />
                  <ReviewItem
                    label="Age ranges"
                    value={form.partnerAges.join(", ")}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-between border-t pt-4 sm:mt-8 sm:pt-5">
            <Button
              variant="outline"
              onClick={back}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button onClick={next} disabled={!canContinue} className="gap-2">
                Next
                <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={loading} className="gap-2">
                {loading ? "Saving..." : "Start matching"}
                <Heart className="size-4" />
              </Button>
            )}
          </div>
        </section>
      </div>
    </Card>
  )
}

function getCities(country: string, options: CountryCityOption[]) {
  return (
    options.find((item) => item.country === country)?.cities ?? []
  )
}

function isDefaultOnboardingForm(form: Prefs) {
  return JSON.stringify(form) === JSON.stringify(DEFAULT_FORM)
}

function getSavedOnboardingForm() {
  if (typeof window === "undefined") return DEFAULT_FORM

  try {
    const raw = localStorage.getItem("wimp:onboard:v2:progress")
    return raw ? { ...DEFAULT_FORM, ...JSON.parse(raw) } : DEFAULT_FORM
  } catch {
    return DEFAULT_FORM
  }
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn("block space-y-2", className)}>
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  )
}

function AvatarPicker({
  name,
  avatar,
  onAvatarChange,
  onAvatarRemove,
}: {
  name: string
  avatar: string
  onAvatarChange: (file?: File) => void
  onAvatarRemove: () => void
}) {
  const initials =
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U"

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-input bg-background p-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted/35 text-base font-semibold text-muted-foreground">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={name || "Profile avatar"}
              className="size-full object-cover"
            />
          ) : (
            initials
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium">
            Avatar <span className="text-muted-foreground">(optional)</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {avatar ? "Photo added" : "Upload a profile photo"}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <Button variant="outline" size="sm" asChild>
          <label aria-label="Upload avatar">
            <ImagePlus className="size-4" />
            {avatar ? "Change" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => onAvatarChange(event.target.files?.[0])}
            />
          </label>
        </Button>
        {avatar ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onAvatarRemove}
            aria-label="Remove avatar"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}

function GenderToggle({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const options = [
    { value: "male", label: "Male", icon: Mars },
    { value: "female", label: "Female", icon: Venus },
    { value: "other", label: "Other", icon: VenusAndMars },
  ]

  return (
    <Tabs value={value} onValueChange={onValueChange}>
      <TabsList className="grid h-auto w-full grid-cols-3">
      {options.map((option) => {
        const Icon = option.icon
        return (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className="h-10"
          >
            <span
              className="flex size-6 items-center justify-center rounded-md"
            >
              <Icon className="size-4" />
            </span>
            {option.label}
          </TabsTrigger>
        )
      })}
      </TabsList>
    </Tabs>
  )
}

function BirthdayPicker({
  value,
  onValueChange,
}: {
  value: string
  onValueChange: (value: string) => void
}) {
  const selectedDate = parseDateValue(value)
  const initialDate = selectedDate ?? getDefaultBirthdayViewDate()
  const [viewDate, setViewDate] = useState(initialDate)
  const [open, setOpen] = useState(false)
  const years = getBirthdayYears()
  const days = getCalendarDays(viewDate)

  function setMonth(month: string) {
    setViewDate(new Date(viewDate.getFullYear(), Number(month), 1))
  }

  function setYear(year: string) {
    setViewDate(new Date(Number(year), viewDate.getMonth(), 1))
  }

  function moveMonth(offset: number) {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1))
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-muted/35 px-3 py-2 text-left text-sm shadow-xs outline-none transition hover:bg-muted/50 focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">
            {value ? formatBirthdayWithAge(value) : "Pick your birthday"}
          </span>
          <CalendarDays className="size-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))]">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => moveMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </Button>

            <div className="grid flex-1 grid-cols-[1fr_88px] gap-2">
              <SelectControl
                value={String(viewDate.getMonth())}
                onValueChange={setMonth}
                items={MONTHS.map((month, index) => ({
                  value: String(index),
                  label: month,
                }))}
              />
              <SelectControl
                value={String(viewDate.getFullYear())}
                onValueChange={setYear}
                items={years.map((year) => ({
                  value: String(year),
                  label: String(year),
                }))}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => moveMonth(1)}
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1">
                {day}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Only birthdays for users 18 and older are available.
          </p>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const dayValue = formatDateValue(day.date)
              const isSelected = value === dayValue
              const disabled = !day.inMonth || calculateAge(dayValue) < 18

              return (
                <button
                  key={dayValue}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    onValueChange(dayValue)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md text-sm transition hover:bg-muted disabled:pointer-events-none disabled:opacity-30",
                    !day.inMonth && "text-muted-foreground",
                    isSelected && "bg-primary text-primary-foreground hover:bg-primary"
                  )}
                >
                  {day.date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function SelectControl({
  value,
  onValueChange,
  items,
  placeholder = "Select option",
  disabled,
}: {
  value: string
  onValueChange: (value: string) => void
  items: { value: string; label: string }[]
  placeholder?: string
  disabled?: boolean
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

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

function calculateAge(value: string) {
  const birthday = parseDateValue(value)
  if (!birthday) return 0

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

function formatBirthday(value: string) {
  const date = parseDateValue(value)
  if (!date) return ""

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatBirthdayWithAge(value: string) {
  const birthday = formatBirthday(value)
  const age = calculateAge(value)

  if (!birthday || age <= 0) return birthday

  return `${birthday} (Age: ${age})`
}

function parseDateValue(value: string) {
  if (!value) return undefined
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return undefined
  return new Date(year, month - 1, day)
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function getDefaultBirthdayViewDate() {
  const date = new Date()
  date.setFullYear(date.getFullYear() - 25)
  date.setDate(1)
  return date
}

function getBirthdayYears() {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 83 }, (_, index) => currentYear - 18 - index)
}

function getCalendarDays(viewDate: Date) {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const firstDay = new Date(year, month, 1)
  const start = new Date(year, month, 1 - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)

    return {
      date,
      inMonth: date.getMonth() === month,
    }
  })
}

function ChoiceGrid({
  title,
  choices,
  selected,
  onToggle,
}: {
  title: string
  choices: { id: string; label: string; detail: string }[]
  selected: string[]
  onToggle: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {choices.map((choice) => {
          const active = selected.includes(choice.id)
          return (
            <button
              key={choice.id}
              type="button"
              onClick={() => onToggle(choice.id)}
              className={cn(
                "min-h-28 rounded-lg border bg-background p-4 text-left shadow-xs transition hover:border-primary/40 hover:bg-muted/40",
                active && "border-primary bg-primary/5 ring-3 ring-primary/15"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-base font-semibold">{choice.label}</span>
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  {active && <Check className="size-3" />}
                </span>
              </div>
              <p className="mt-3 text-sm leading-5 text-muted-foreground">
                {choice.detail}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ReviewItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-medium capitalize">{value}</p>
    </div>
  )
}
