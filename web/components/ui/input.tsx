import * as React from "react"
import { cn } from "@/lib/utils"

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-muted/35 px-3 py-2 text-sm shadow-xs outline-none transition placeholder:text-muted-foreground hover:bg-muted/50 focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        props.className
      )}
    />
  )
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        "h-10 w-full rounded-md border border-input bg-muted/35 px-3 py-2 text-sm shadow-xs outline-none transition hover:bg-muted/50 focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50",
        props.className
      )}
    />
  )
}

export default Input
