"use client"

import type { ReactNode } from "react"
import {
  Bell,
  Bookmark,
  ChevronRight,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type SidebarItem = "discover" | "notifications" | "saved" | "me"

export default function AppSidebar({
  activeItem,
  collapsed = false,
  onClose,
  onDiscover,
  onMe,
  onNotifications,
  onSaved,
  notificationCount = 0,
  savedCount = 0,
}: {
  activeItem: SidebarItem
  collapsed?: boolean
  onClose: () => void
  onDiscover: () => void
  onMe: () => void
  onNotifications: () => void
  onSaved: () => void
  notificationCount?: number
  savedCount?: number
}) {
  return (
    <aside
      className={cn(
        "hidden transition-all duration-200 md:block",
        collapsed ? "md:w-[88px]" : "md:w-[260px] lg:w-[280px]"
      )}
    >
      <div className="sticky top-24 space-y-4">
        <Card
          className={cn(
            "border-border/60 bg-card/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur dark:shadow-[0_18px_50px_rgba(0,0,0,0.28)]",
            collapsed ? "p-2" : "p-3"
          )}
        >
          <div
            className={cn(
              "mb-3 flex items-center px-1",
              collapsed ? "justify-center" : "justify-between gap-3"
            )}
          >
            {!collapsed ? (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Navigation
              </p>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="rounded-full"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>
          </div>

          <div>
            <nav className="space-y-1.5">
              <SidebarButton
                active={activeItem === "discover"}
                collapsed={collapsed}
                description="Browse partner profiles"
                icon={<LayoutGrid className="size-4" />}
                label="Discover"
                onClick={onDiscover}
              />
              <SidebarButton
                active={activeItem === "notifications"}
                badge={notificationCount}
                collapsed={collapsed}
                description="Requests and replies"
                icon={<Bell className="size-4" />}
                label="Notifications"
                onClick={onNotifications}
              />
              <SidebarButton
                active={activeItem === "saved"}
                badge={savedCount}
                collapsed={collapsed}
                description="Likes and requested profiles"
                icon={<Bookmark className="size-4" />}
                label="Saved"
                onClick={onSaved}
              />
              <SidebarButton
                active={activeItem === "me"}
                collapsed={collapsed}
                description="Your profile"
                icon={<UserRound className="size-4" />}
                label="Me"
                onClick={onMe}
              />
            </nav>
          </div>
        </Card>
      </div>
    </aside>
  )
}

function SidebarButton({
  active,
  badge,
  collapsed,
  description,
  icon,
  label,
  onClick,
}: {
  active?: boolean
  badge?: number
  collapsed?: boolean
  description: string
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "h-auto w-full rounded-2xl text-left",
        collapsed
          ? "justify-center px-2 py-2.5"
          : "justify-start px-3 py-3",
        active
          ? "bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary),transparent_87%),color-mix(in_oklch,var(--accent),transparent_94%))] text-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--primary),transparent_80%)]"
          : "hover:bg-muted/70"
      )}
    >
      <div
        className={cn(
          "flex w-full items-center",
          collapsed ? "justify-center" : "gap-3"
        )}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            active
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </span>
        {!collapsed ? (
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold">{label}</span>
              {typeof badge === "number" ? (
                <Badge variant="secondary" className="rounded-full px-2 py-0">
                  {badge}
                </Badge>
              ) : null}
            </span>
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
              {description}
            </span>
          </span>
        ) : null}
        {!collapsed ? (
          <ChevronRight className="size-4 text-muted-foreground" />
        ) : null}
      </div>
    </Button>
  )
}
