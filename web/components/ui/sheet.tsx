"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Sheet({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-50 bg-black/50", className)}
      {...props}
    />
  )
}

function SheetContent({
  children,
  className,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "bottom" | "left" | "right"
}) {
  const sideClass =
    side === "bottom"
      ? "inset-x-0 bottom-0 max-h-[85svh] w-full rounded-t-xl border-t sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[min(26rem,calc(100vw-2rem))] sm:rounded-none sm:border-l sm:border-t-0"
      : side === "left"
        ? "inset-y-0 left-0 w-[min(26rem,calc(100vw-1rem))] border-r sm:w-[min(26rem,calc(100vw-2rem))]"
        : "inset-y-0 right-0 w-[min(26rem,calc(100vw-1rem))] border-l sm:w-[min(26rem,calc(100vw-2rem))]"

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "fixed z-50 flex flex-col gap-5 border bg-background p-4 text-foreground shadow-xl outline-none sm:p-6",
          sideClass,
          className
        )}
        {...props}
      >
        {children}
        <SheetPrimitive.Close className="absolute right-4 top-4 rounded-md opacity-70 outline-none transition hover:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/40">
          <X className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("space-y-1.5 pr-7 text-left", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
