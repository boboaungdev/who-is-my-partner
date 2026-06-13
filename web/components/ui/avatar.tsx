"use client"

import Image from "next/image"
import * as React from "react"

export default function Avatar({
  src,
  name,
  size = 40,
}: {
  src?: string
  name?: string
  size?: number
}) {
  const initials = (name || "")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase()

  if (src) {
    if (src.startsWith("data:")) {
      return (
        <div
          style={{ width: size, height: size }}
          className="overflow-hidden rounded-full bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={name || "avatar"}
            width={size}
            height={size}
            className="size-full object-cover"
          />
        </div>
      )
    }

    return (
      <div
        style={{ width: size, height: size }}
        className="overflow-hidden rounded-full bg-muted"
      >
        <Image
          src={src}
          alt={name || "avatar"}
          width={size}
          height={size}
          style={{ objectFit: "cover" }}
        />
      </div>
    )
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-primary font-medium text-primary-foreground"
    >
      {initials || "U"}
    </div>
  )
}
