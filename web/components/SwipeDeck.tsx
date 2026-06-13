"use client"

import React, { useMemo, useState } from "react"
import { Heart, RotateCcw, Sparkles, ThumbsDown, Users } from "lucide-react"

import UserCard, { type User } from "./UserCard"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

type DeckUser = {
  gender?: string
  login?: { uuid?: string }
  name?: { first?: string; last?: string }
  location?: {
    street?: { number?: number; name?: string }
    city?: string
    state?: string
    country?: string
    postcode?: string | number
    coordinates?: { latitude?: string; longitude?: string }
    timezone?: { offset?: string; description?: string }
  }
  dob?: { date?: string; age?: number }
  registered?: { date?: string; age?: number }
  picture?: { large?: string }
  email?: string
  phone?: string
  cell?: string
  nat?: string
}

export default function SwipeDeck({
  users,
  onLoadMore,
}: {
  users: DeckUser[]
  onLoadMore?: () => void
}) {
  const [idx, setIdx] = useState(0)
  const [likes, setLikes] = useState<string[]>([])
  const [passes, setPasses] = useState(0)

  const safeUsers = users.filter(isCardUser)
  const current = safeUsers[idx]
  const completion = safeUsers.length
    ? Math.round(((idx + 1) / safeUsers.length) * 100)
    : 0

  const matchRate = useMemo(() => {
    const total = likes.length + passes
    if (!total) return 0
    return Math.round((likes.length / total) * 100)
  }, [likes.length, passes])

  function next(action?: "like" | "pass") {
    if (action === "like" && current?.login?.uuid) {
      setLikes((s) => [...s, current.login!.uuid!])
    }
    if (action === "pass") setPasses((s) => s + 1)

    const nextIndex = idx + 1
    if (nextIndex >= safeUsers.length) {
      setIdx(0)
      onLoadMore?.()
    } else {
      setIdx(nextIndex)
    }
  }

  if (!safeUsers.length) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-muted">
          <Users className="size-6 text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-xl font-semibold">No profiles available</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Try opening your preferences and widening the deck.
        </p>
        <Button onClick={onLoadMore} className="mt-5">
          Load more
        </Button>
      </Card>
    )
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="mx-auto w-full max-w-[480px] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Profile {idx + 1} of {safeUsers.length}
            </p>
            <h1 className="text-2xl font-semibold">Your curated deck</h1>
          </div>
          <Badge variant="warm" className="gap-1">
            <Sparkles className="size-3" />
            Live
          </Badge>
        </div>

        <Progress value={completion} />

        <UserCard user={current} />

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            onClick={() => next("pass")}
            className="h-12 gap-2 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/60 dark:text-rose-300 dark:hover:bg-rose-950/30"
          >
            <ThumbsDown className="size-4" />
            Pass
          </Button>
          <Button
            variant="secondary"
            size="icon-lg"
            onClick={() => next()}
            aria-label="Skip profile"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            size="lg"
            onClick={() => next("like")}
            className="h-12 gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Heart className="size-4" />
            Like
          </Button>
        </div>
      </section>

      <aside className="grid gap-4 self-start sm:grid-cols-3 xl:grid-cols-1">
        <StatCard label="Likes" value={String(likes.length)} tone="good" />
        <StatCard label="Passes" value={String(passes)} />
        <StatCard label="Like rate" value={`${matchRate}%`} tone="warm" />
      </aside>
    </div>
  )
}

function isCardUser(user: DeckUser): user is User {
  return Boolean(
    user.name?.first &&
      user.name?.last &&
      user.location?.city &&
      user.location?.country &&
      user.picture?.large
  )
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: "good" | "warm"
}) {
  return (
    <Card className="p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-semibold">{value}</p>
        <span
          className={
            tone === "good"
              ? "size-3 rounded-full bg-emerald-500"
              : tone === "warm"
                ? "size-3 rounded-full bg-amber-500"
                : "size-3 rounded-full bg-muted-foreground/35"
          }
        />
      </div>
    </Card>
  )
}
