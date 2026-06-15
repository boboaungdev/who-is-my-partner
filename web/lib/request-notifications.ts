import * as React from "react"
import { toast } from "sonner"

import type { User } from "@/components/UserCard"
import {
  getProfileKey,
  getSavedRequestedProfiles,
  saveRequestedProfiles,
} from "@/lib/profile-requests"

export type RequestNotificationDirection = "incoming" | "outgoing"
export type RequestNotificationStatus = "pending" | "accepted" | "rejected"

export type RequestNotification = {
  id: string
  direction: RequestNotificationDirection
  profileKey: string
  profileName: string
  profileImage?: string
  profile?: User
  status: RequestNotificationStatus
  createdAt: string
  read: boolean
}

export const REQUEST_NOTIFICATIONS_STORAGE_KEY =
  "wimp:request-notifications:v1"
export const REQUEST_NOTIFICATIONS_EVENT = "wimp:request-notifications:change"
const INCOMING_REQUEST_PROFILE_STORAGE_KEY =
  "wimp:incoming-request-profile-keys:v1"

export function getSavedRequestNotifications() {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(REQUEST_NOTIFICATIONS_STORAGE_KEY)
    const notifications = raw ? JSON.parse(raw) : []
    return Array.isArray(notifications)
      ? notifications
          .map(normalizeRequestNotification)
          .filter(isRequestNotification)
      : []
  } catch {
    return []
  }
}

export function saveRequestNotifications(
  notifications: RequestNotification[]
) {
  try {
    localStorage.setItem(
      REQUEST_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(notifications)
    )
    window.dispatchEvent(new CustomEvent(REQUEST_NOTIFICATIONS_EVENT))
  } catch {
    // ignore storage failures
  }
}

export function scheduleFakeRequestOutcome(user: User) {
  window.setTimeout(() => {
    const profileKey = getProfileKey(user)
    const requestedProfiles = getPendingRequestedProfileKeys()
    if (!requestedProfiles.includes(profileKey)) return

    const chance = Math.random()
    if (chance < 0.5) {
      createFakeRequestNotification(user, "accepted")
      return
    }

    if (chance < 0.6) {
      createFakeRequestNotification(user, "rejected")
    }
  }, 5000)
}

export function getPendingRequestedProfileKeys() {
  const requestedProfiles = getSavedRequestedProfiles()
  const resolvedOutgoingKeys = new Set(
    getSavedRequestNotifications()
      .filter(
        (notification) =>
          notification.direction === "outgoing" &&
          notification.status !== "pending"
      )
      .map((notification) => notification.profileKey)
  )
  const pendingRequestedProfiles = requestedProfiles.filter(
    (key) => !resolvedOutgoingKeys.has(key)
  )

  if (pendingRequestedProfiles.length !== requestedProfiles.length) {
    saveRequestedProfiles(pendingRequestedProfiles)
  }

  return pendingRequestedProfiles
}

export function getLatestRequestStatus(
  profileKey: string
): Exclude<RequestNotificationStatus, "pending"> | undefined {
  return getSavedRequestNotifications().find(
    (notification) =>
      notification.direction === "outgoing" &&
      notification.profileKey === profileKey &&
      notification.status !== "pending"
  )?.status as Exclude<RequestNotificationStatus, "pending"> | undefined
}

export function createIncomingRequestNotification() {
  const profile = getUniqueIncomingProfile()
  if (!profile) return

  const notification: RequestNotification = {
    id: `incoming-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    direction: "incoming",
    profileKey: profile.key,
    profileName: profile.name,
    profileImage: profile.image,
    profile: profile.user,
    status: "pending",
    createdAt: new Date().toISOString(),
    read: false,
  }
  const next = [notification, ...getSavedRequestNotifications()].slice(0, 20)

  saveRequestNotifications(next)
  toast.custom(() =>
    React.createElement(
      "span",
      {
        className:
          "flex w-full min-w-0 items-center gap-3 rounded-md border bg-background p-3 text-foreground shadow-lg",
      },
      React.createElement(
        "span",
        {
          className:
            "block h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted",
          style: {
            width: "36px",
            height: "36px",
            minWidth: "36px",
            borderRadius: "9999px",
          },
        },
        React.createElement("img", {
          src: profile.image,
          alt: "",
          className: "h-full w-full object-cover",
          style: {
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
          },
        })
      ),
      React.createElement("span", { className: "min-w-0 text-sm font-medium" }, `${profile.name} sent you a request`)
    ),
    {
      unstyled: true,
      className: "w-[var(--width)]",
      style: {
        "--width": "356px",
      } as React.CSSProperties,
    }
  )
}

export function respondToIncomingRequest(
  notificationId: string,
  status: Exclude<RequestNotificationStatus, "pending">
) {
  const next = getSavedRequestNotifications().map((notification) =>
    notification.id === notificationId
      ? {
          ...notification,
          status,
          read: false,
        }
      : notification
  )
  const notification = next.find((item) => item.id === notificationId)

  saveRequestNotifications(next)

  if (!notification) return

  if (status === "accepted") {
    toast.success(`You accepted ${notification.profileName}'s request`)
  } else {
    toast.error(`You rejected ${notification.profileName}'s request`)
  }
}

export function markRequestNotificationsRead() {
  const next = getSavedRequestNotifications().map((notification) => ({
    ...notification,
    read: true,
  }))

  saveRequestNotifications(next)
}

function createFakeRequestNotification(
  user: User,
  status: Exclude<RequestNotificationStatus, "pending">
) {
  saveRequestedProfiles(
    getSavedRequestedProfiles().filter((key) => key !== getProfileKey(user))
  )

  const profileName = `${user.name.first} ${user.name.last}`
  const notification: RequestNotification = {
    id: `${getProfileKey(user)}-${Date.now()}`,
    direction: "outgoing",
    profileKey: getProfileKey(user),
    profileName,
    profileImage: user.picture.large,
    profile: user,
    status,
    createdAt: new Date().toISOString(),
    read: false,
  }
  const next = [notification, ...getSavedRequestNotifications()].slice(0, 20)

  saveRequestNotifications(next)

  if (status === "accepted") {
    toast.success(`${profileName} accepted your request`, {
      description: "You can message them now.",
    })
  } else {
    toast.error(`${profileName} rejected your request`)
  }
}

function normalizeRequestNotification(
  value: unknown
): RequestNotification | null {
  if (!value || typeof value !== "object") return null

  const notification = value as RequestNotification
  const valid =
    typeof notification.id === "string" &&
    typeof notification.profileKey === "string" &&
    typeof notification.profileName === "string" &&
    (notification.status === "pending" ||
      notification.status === "accepted" ||
      notification.status === "rejected") &&
    typeof notification.createdAt === "string" &&
    typeof notification.read === "boolean"

  if (!valid) return null

  return {
    ...notification,
    direction:
      notification.direction === "incoming" ||
      notification.direction === "outgoing"
        ? notification.direction
        : "outgoing",
  }
}

function isRequestNotification(
  notification: RequestNotification | null
): notification is RequestNotification {
  return notification !== null
}

type IncomingProfile = {
  key: string
  name: string
  image: string
  user: User
}

function getUniqueIncomingProfile() {
  const usedKeys = new Set([
    ...getSavedIncomingProfileKeys(),
    ...getSavedRequestNotifications()
      .filter((notification) => notification.direction === "incoming")
      .map((notification) => notification.profileKey),
  ])
  const availableProfiles = INCOMING_PROFILES.filter(
    (profile) => !usedKeys.has(profile.key)
  )

  if (!availableProfiles.length) return null

  const profile =
    availableProfiles[Math.floor(Math.random() * availableProfiles.length)]

  saveIncomingProfileKeys([...usedKeys, profile.key])
  return profile
}

function getSavedIncomingProfileKeys() {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(INCOMING_REQUEST_PROFILE_STORAGE_KEY)
    const keys = raw ? JSON.parse(raw) : []
    return Array.isArray(keys)
      ? keys.filter((key): key is string => typeof key === "string")
      : []
  } catch {
    return []
  }
}

function saveIncomingProfileKeys(keys: string[]) {
  try {
    localStorage.setItem(
      INCOMING_REQUEST_PROFILE_STORAGE_KEY,
      JSON.stringify(Array.from(new Set(keys)))
    )
  } catch {
    // ignore storage failures
  }
}

const INCOMING_PROFILES: IncomingProfile[] = [
  {
    key: "incoming-maya-chen",
    name: "Maya Chen",
    image: "https://randomuser.me/api/portraits/women/44.jpg",
    user: buildIncomingProfileUser("incoming-maya-chen", "Maya", "Chen", "female", 28, "Singapore", "Singapore", "maya.chen", "https://randomuser.me/api/portraits/women/44.jpg"),
  },
  {
    key: "incoming-sofia-rivera",
    name: "Sofia Rivera",
    image: "https://randomuser.me/api/portraits/women/68.jpg",
    user: buildIncomingProfileUser("incoming-sofia-rivera", "Sofia", "Rivera", "female", 30, "Madrid", "Spain", "sofia.rivera", "https://randomuser.me/api/portraits/women/68.jpg"),
  },
  {
    key: "incoming-emma-wilson",
    name: "Emma Wilson",
    image: "https://randomuser.me/api/portraits/women/12.jpg",
    user: buildIncomingProfileUser("incoming-emma-wilson", "Emma", "Wilson", "female", 27, "Sydney", "Australia", "emmawilson", "https://randomuser.me/api/portraits/women/12.jpg"),
  },
  {
    key: "incoming-nora-patel",
    name: "Nora Patel",
    image: "https://randomuser.me/api/portraits/women/79.jpg",
    user: buildIncomingProfileUser("incoming-nora-patel", "Nora", "Patel", "female", 29, "Mumbai", "India", "nora.patel", "https://randomuser.me/api/portraits/women/79.jpg"),
  },
  {
    key: "incoming-ava-morgan",
    name: "Ava Morgan",
    image: "https://randomuser.me/api/portraits/women/32.jpg",
    user: buildIncomingProfileUser("incoming-ava-morgan", "Ava", "Morgan", "female", 26, "Vancouver", "Canada", "avamorgan", "https://randomuser.me/api/portraits/women/32.jpg"),
  },
  {
    key: "incoming-isabella-kim",
    name: "Isabella Kim",
    image: "https://randomuser.me/api/portraits/women/23.jpg",
    user: buildIncomingProfileUser("incoming-isabella-kim", "Isabella", "Kim", "female", 31, "Seoul", "South Korea", "isabellakim", "https://randomuser.me/api/portraits/women/23.jpg"),
  },
  {
    key: "incoming-amelia-clark",
    name: "Amelia Clark",
    image: "https://randomuser.me/api/portraits/women/55.jpg",
    user: buildIncomingProfileUser("incoming-amelia-clark", "Amelia", "Clark", "female", 33, "London", "United Kingdom", "amelia.clark", "https://randomuser.me/api/portraits/women/55.jpg"),
  },
  {
    key: "incoming-hannah-lee",
    name: "Hannah Lee",
    image: "https://randomuser.me/api/portraits/women/71.jpg",
    user: buildIncomingProfileUser("incoming-hannah-lee", "Hannah", "Lee", "female", 25, "Bangkok", "Thailand", "hannahlee", "https://randomuser.me/api/portraits/women/71.jpg"),
  },
  {
    key: "incoming-mila-roberts",
    name: "Mila Roberts",
    image: "https://randomuser.me/api/portraits/women/36.jpg",
    user: buildIncomingProfileUser("incoming-mila-roberts", "Mila", "Roberts", "female", 29, "Auckland", "New Zealand", "milaroberts", "https://randomuser.me/api/portraits/women/36.jpg"),
  },
  {
    key: "incoming-zara-bennett",
    name: "Zara Bennett",
    image: "https://randomuser.me/api/portraits/women/90.jpg",
    user: buildIncomingProfileUser("incoming-zara-bennett", "Zara", "Bennett", "female", 27, "Cape Town", "South Africa", "zarabennett", "https://randomuser.me/api/portraits/women/90.jpg"),
  },
  {
    key: "incoming-liam-carter",
    name: "Liam Carter",
    image: "https://randomuser.me/api/portraits/men/45.jpg",
    user: buildIncomingProfileUser("incoming-liam-carter", "Liam", "Carter", "male", 30, "Dublin", "Ireland", "liamcarter", "https://randomuser.me/api/portraits/men/45.jpg"),
  },
  {
    key: "incoming-noah-brooks",
    name: "Noah Brooks",
    image: "https://randomuser.me/api/portraits/men/22.jpg",
    user: buildIncomingProfileUser("incoming-noah-brooks", "Noah", "Brooks", "male", 28, "Chicago", "United States", "noahbrooks", "https://randomuser.me/api/portraits/men/22.jpg"),
  },
  {
    key: "incoming-ethan-walker",
    name: "Ethan Walker",
    image: "https://randomuser.me/api/portraits/men/64.jpg",
    user: buildIncomingProfileUser("incoming-ethan-walker", "Ethan", "Walker", "male", 32, "Melbourne", "Australia", "ethanwalker", "https://randomuser.me/api/portraits/men/64.jpg"),
  },
  {
    key: "incoming-oliver-stone",
    name: "Oliver Stone",
    image: "https://randomuser.me/api/portraits/men/11.jpg",
    user: buildIncomingProfileUser("incoming-oliver-stone", "Oliver", "Stone", "male", 31, "Berlin", "Germany", "oliverstone", "https://randomuser.me/api/portraits/men/11.jpg"),
  },
  {
    key: "incoming-lucas-hayes",
    name: "Lucas Hayes",
    image: "https://randomuser.me/api/portraits/men/52.jpg",
    user: buildIncomingProfileUser("incoming-lucas-hayes", "Lucas", "Hayes", "male", 29, "Lisbon", "Portugal", "lucashayes", "https://randomuser.me/api/portraits/men/52.jpg"),
  },
  {
    key: "incoming-james-cooper",
    name: "James Cooper",
    image: "https://randomuser.me/api/portraits/men/73.jpg",
    user: buildIncomingProfileUser("incoming-james-cooper", "James", "Cooper", "male", 34, "Toronto", "Canada", "jamescooper", "https://randomuser.me/api/portraits/men/73.jpg"),
  },
  {
    key: "incoming-benjamin-reed",
    name: "Benjamin Reed",
    image: "https://randomuser.me/api/portraits/men/38.jpg",
    user: buildIncomingProfileUser("incoming-benjamin-reed", "Benjamin", "Reed", "male", 33, "Amsterdam", "Netherlands", "benjaminreed", "https://randomuser.me/api/portraits/men/38.jpg"),
  },
  {
    key: "incoming-daniel-price",
    name: "Daniel Price",
    image: "https://randomuser.me/api/portraits/men/84.jpg",
    user: buildIncomingProfileUser("incoming-daniel-price", "Daniel", "Price", "male", 27, "Copenhagen", "Denmark", "danielprice", "https://randomuser.me/api/portraits/men/84.jpg"),
  },
  {
    key: "incoming-mason-hughes",
    name: "Mason Hughes",
    image: "https://randomuser.me/api/portraits/men/27.jpg",
    user: buildIncomingProfileUser("incoming-mason-hughes", "Mason", "Hughes", "male", 28, "Los Angeles", "United States", "masonhughes", "https://randomuser.me/api/portraits/men/27.jpg"),
  },
  {
    key: "incoming-henry-scott",
    name: "Henry Scott",
    image: "https://randomuser.me/api/portraits/men/91.jpg",
    user: buildIncomingProfileUser("incoming-henry-scott", "Henry", "Scott", "male", 35, "Edinburgh", "United Kingdom", "henryscott", "https://randomuser.me/api/portraits/men/91.jpg"),
  },
]

function buildIncomingProfileUser(
  key: string,
  first: string,
  last: string,
  gender: "male" | "female",
  age: number,
  city: string,
  country: string,
  username: string,
  image: string
): User {
  return {
    gender,
    name: { first, last },
    location: { city, country },
    dob: { age, date: getBirthdayForAge(age) },
    picture: { large: image },
    login: { uuid: key, username },
    email: `${username}@example.com`,
    nat: country,
  }
}

function getBirthdayForAge(age: number) {
  const today = new Date()
  const birthday = new Date(
    today.getFullYear() - age,
    today.getMonth(),
    today.getDate()
  )

  return birthday.toISOString()
}
