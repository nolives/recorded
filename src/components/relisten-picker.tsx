"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { pickRelisten, type RelistenResult } from "@/app/(app)/diary/relisten-action";
import { AlbumCover } from "@/components/album-cover";
import { formatListenDate } from "@/lib/format";
import { MIN_SCORE } from "@/lib/relisten";

// "today", "yesterday", "32 days ago", counted on this device's own
// calendar. (The server counts in UTC, which in a California evening is
// already tomorrow, so its count can be a day off.)
function ago(isoDate: string) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.max(0, Math.round((today - Date.UTC(year, month - 1, day)) / 86_400_000));
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

// "Can't decide what to play?" A button that picks one of your albums
// scored 8 or higher, preferring ones you haven't logged in a while.
export function RelistenPicker() {
  const [result, setResult] = useState<RelistenResult | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = result?.status === "picked" ? result.pick : null;

  function pick() {
    startTransition(async () => {
      setResult(await pickRelisten(shown?.albumId));
    });
  }

  return (
    <section aria-label="Random re-listen" className="mb-6 rounded-lg border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {shown ? "How about this one?" : "Can't decide what to play? Get one of your favorites back."}
        </p>
        <button
          type="button"
          onClick={pick}
          disabled={pending}
          className="h-9 rounded-md border border-line px-4 text-sm transition-colors hover:border-accent disabled:opacity-60"
        >
          {pending ? "Picking…" : shown ? "Pick another" : "Pick a re-listen"}
        </button>
      </div>

      <div aria-live="polite">
        {shown ? (
          <div className="mt-4 flex items-center gap-4">
            <AlbumCover title={shown.title} artist={shown.artist} coverUrl={shown.coverUrl} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{shown.title}</p>
              <p className="truncate text-sm text-muted">
                {shown.artist}
                {shown.releaseYear ? ` · ${shown.releaseYear}` : ""}
              </p>
              <p className="mt-1 text-sm text-muted">
                You gave it <span className="font-medium text-accent">{shown.bestScore}/10</span> · last
                listened {formatListenDate(shown.lastListened)} ({ago(shown.lastListened)})
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
              <Link href={`/listens/new?album=${shown.albumId}`} className="text-accent hover:underline">
                Log a listen
              </Link>
              <Link href={`/listens/${shown.latestListenId}`} className="text-muted hover:text-foreground hover:underline">
                Last listen
              </Link>
            </div>
          </div>
        ) : result?.status === "none" ? (
          <p className="mt-3 text-sm">
            Nothing to pick yet. Score an album {MIN_SCORE}/10 or higher and it can come back here.
          </p>
        ) : result?.status === "error" ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            Couldn&apos;t pick right now. Try again.
          </p>
        ) : null}
      </div>
    </section>
  );
}
