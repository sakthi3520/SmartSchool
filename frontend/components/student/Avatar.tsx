"use client";

import { useState } from "react";
import { initialsOf } from "./studentUtils";

// Shows the profile image when there is one, otherwise a coloured circle with initials
export function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const [broken, setBroken] = useState(false);

  if (src && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initialsOf(name)}
    </div>
  );
}