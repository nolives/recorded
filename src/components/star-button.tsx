"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setStar } from "@/app/(app)/favorites/actions";
import { StarIcon } from "@/components/star-icon";

type StarButtonProps = {
  albumId: number;
  albumTitle: string;
  starred: boolean;
  // "full" is the labeled button on a listen's page; "icon" is the small
  // one on the Favorites page.
  variant?: "full" | "icon";
};

export function StarButton({ albumId, albumTitle, starred, variant = "full" }: StarButtonProps) {
  // Show the new state right away, before the server answers. If saving
  // fails, React puts the old state back on its own.
  const [shown, setShown] = useOptimistic(starred);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !shown;
    setFailed(false);
    startTransition(async () => {
      setShown(next);
      const { ok } = await setStar(albumId, next);
      if (!ok) setFailed(true);
    });
  }

  const error = failed ? (
    <span role="status" className="text-sm text-danger">
      Couldn&apos;t save. Try again.
    </span>
  ) : null;

  if (variant === "icon") {
    return (
      <span className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={shown}
          aria-label={`Favorite: ${albumTitle}`}
          title={shown ? "Remove from favorites" : "Add to favorites"}
          className="flex size-9 items-center justify-center rounded-full bg-background/80 text-accent backdrop-blur transition-colors hover:bg-background"
        >
          <StarIcon filled={shown} className="size-5" />
        </button>
        {error}
      </span>
    );
  }

  return (
    <span className="flex flex-col gap-1">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={shown}
        className={`flex h-10 items-center gap-2 rounded-md border px-4 transition-colors ${
          shown
            ? "border-accent/60 bg-accent/10 text-accent hover:border-accent"
            : "border-line hover:border-accent"
        }`}
      >
        <StarIcon filled={shown} className="size-4" />
        Favorite
      </button>
      {error}
    </span>
  );
}
