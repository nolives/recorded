"use client";

import Image from "next/image";
import { useState } from "react";
import { isCachedCoverSite } from "@/lib/cover-hosts";

type AlbumCoverProps = {
  title: string;
  artist: string;
  coverUrl?: string | null;
  size?: "sm" | "lg" | "fill";
  // Saved covers go through Vercel's image cache. Search results are only
  // on screen for a moment, so they skip it (cached={false}).
  cached?: boolean;
};

const BOX = {
  sm: "size-14 text-base",
  lg: "size-40 sm:size-56 text-4xl",
  fill: "aspect-square w-full text-4xl", // as wide as its container
};

// How wide the cover shows at each size, so the cache makes a copy that's
// just big enough (sharp on high-resolution screens too).
const SIZES = {
  sm: "56px",
  lg: "(min-width: 640px) 224px, 160px",
  fill: "(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw",
};

// Shows the album cover, trying in order:
// 1. Vercel's cached copy (fast after the first view)
// 2. the cover's own link, if the cache can't help (say, its monthly limit
//    is used up)
// 3. a placeholder with the album's initials
export function AlbumCover({ title, artist, coverUrl, size = "sm", cached = true }: AlbumCoverProps) {
  const [failed, setFailed] = useState<{ url: string; times: number } | null>(null);
  const times = failed && failed.url === coverUrl ? failed.times : 0;
  // Covers from unexpected sites skip the cache, which would refuse them.
  const useCache = cached && Boolean(coverUrl) && isCachedCoverSite(coverUrl ?? "");
  const step = (useCache ? 0 : 1) + times;
  const box = BOX[size];

  if (coverUrl && step < 2) {
    const fail = () => setFailed({ url: coverUrl, times: times + 1 });
    // A plain image can fail before the page's code is ready to hear about
    // it, so also check once the image is on the page.
    const checkLoaded = (img: HTMLImageElement | null) => {
      if (img?.complete && img.naturalWidth === 0) fail();
    };
    const alt = `Cover of ${title} by ${artist}`;

    if (step === 0) {
      return (
        <div className={`${box} relative shrink-0 overflow-hidden rounded-md border border-line bg-surface`}>
          <Image
            key="cached"
            src={coverUrl}
            alt={alt}
            fill
            sizes={SIZES[size]}
            // Next.js's image already catches failures that happen before
            // the page is ready (it reloads the image once to check), so it
            // doesn't need checkLoaded; adding it here caused false alarms.
            onError={fail}
            className="object-cover"
          />
        </div>
      );
    }

    return (
      // eslint-disable-next-line @next/next/no-img-element -- the cover's own link, without the cache
      <img
        key="direct"
        src={coverUrl}
        alt={alt}
        loading="lazy"
        onError={fail}
        ref={checkLoaded}
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
