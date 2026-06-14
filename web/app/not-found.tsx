import Link from "next/link"
import { ArrowLeft, HeartHandshake, Home, SearchX } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { APP_NAME } from "@/constants"

export default function NotFound() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10 text-foreground">
      <Card className="w-full max-w-lg text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
          <HeartHandshake className="size-7" />
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground">
          <SearchX className="size-4" />
          404
        </div>

        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
          Page not found
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
          This page is not part of {APP_NAME}. Return to your dashboard or go
          back to the previous page.
        </p>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button asChild>
            <Link href="/?view=deck" className="gap-2">
              <Home className="size-4" />
              Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/" className="gap-2">
              <ArrowLeft className="size-4" />
              Home
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  )
}
