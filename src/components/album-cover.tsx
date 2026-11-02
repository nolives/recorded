"use client";

import { useState } from "react";

type AlbumCoverProps = {
  title: string;
  artist: string;
  coverUrl?: string | null;
  size?: "sm" | "lg" | "fill";
};

// Shows the album cover, or a simple placeholder with the album's initials
// when there's no cover or the image doesn't load.
export function AlbumCover({ title, artist, coverUrl, size = "sm" }: AlbumCoverProps) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const box = {
    sm: "size-14 text-base",
    lg: "size-40 sm:size-56 text-4xl",
    fill: "aspect-square w-full text-4xl", // as wide as its container
  }[size];

  if (coverUrl && coverUrl !== failedUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- cover art comes from outside sites
      <img
        src={coverUrl}
        alt={`Cover of ${title} by ${artist}`}
        loading="lazy"
        onError={() => setFailedUrl(coverUrl)}
        // An image can fail before the page's code is ready to hear about
        // it, so also check once the image is on the page.
        ref={(img) => {
          if (img?.complete && img.naturalWidth === 0) setFailedUrl(coverUrl);
        }}
        className={`${box} shrink-0 rounded-md border border-line bg-surface object-cover`}
      />
    );
  }

  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <div
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center rounded-md border border-line bg-surface font-semibold text-muted`}
    >
      {initials}
    </div>
  );
}
