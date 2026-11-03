"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { resetShareLink, saveSharing, type SettingsState } from "@/app/(app)/settings/actions";
import { profilePath, SHARING, type Sharing } from "@/lib/sharing";

export function SharingForm({
  username,
  sharing,
  shareToken,
  origin,
}: {
  username: string;
  sharing: Sharing;
  shareToken: string | null;
  origin: string;
}) {
  const [saveState, save, saving] = useActionState(saveSharing, {} as SettingsState);
  const [resetState, reset, resetting] = useActionState(resetShareLink, {} as SettingsState);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "manual">("idle");
  const linkRef = useRef<HTMLInputElement>(null);

  const link = `${origin}${profilePath(username, sharing, shareToken)}`;
  const status = resetState.message ?? saveState.message;
  const error = saveState.error ?? resetState.error;

  // Copies the link. Some browsers block the clipboard, so this falls back
  // to an older copy command, and if that's blocked too, selects the link
  // and asks for Ctrl+C / Cmd+C.
  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(link);
      ok = true;
    } catch {
      linkRef.current?.select();
      try {
        ok = document.execCommand("copy");
      } catch {
        ok = false;
      }
    }
    linkRef.current?.select();
    setCopyStatus(ok ? "copied" : "manual");
    if (ok) setTimeout(() => setCopyStatus("idle"), 2000);
  }

  return (
    <div className="flex flex-col gap-6">
      <form action={save} className="flex flex-col gap-4">
        <fieldset className="flex min-w-0 flex-col gap-2">
          <legend className="mb-2 font-semibold">Who can see your profile?</legend>
          {(Object.keys(SHARING) as Sharing[]).map((value) => (
            <label
              key={value}
              className="flex cursor-pointer gap-3 rounded-lg border border-line bg-surface p-3 transition-colors hover:border-accent/60 has-[:checked]:border-accent has-[:checked]:bg-accent/10"
            >
              <input
                type="radio"
                name="sharing"
                value={value}
                defaultChecked={value === sharing}
                className="mt-1 accent-[var(--accent)]"
              />
              <span>
                <span className="block font-medium">{SHARING[value].label}</span>
                <span className="block text-sm text-muted">{SHARING[value].description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-md bg-accent px-5 font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <p aria-live="polite" className="text-sm">
            {error ? <span className="text-danger">{error}</span> : status ? <span className="text-muted">{status}</span> : null}
          </p>
        </div>
      </form>

      <section aria-labelledby="link-title" className="rounded-lg border border-line bg-surface p-4">
        <h2 id="link-title" className="font-semibold">
          {sharing === "private" ? "Your profile is private" : "Your profile link"}
        </h2>
        {sharing === "private" ? (
          <p className="mt-1 text-sm text-muted">Pick Link only or Public above to get a link to share.</p>
        ) : (
          <>
            <div className="mt-3 flex gap-2">
              <input
                ref={linkRef}
                readOnly
                value={link}
                aria-label="Profile link"
                onFocus={(event) => event.target.select()}
                className="h-10 min-w-0 flex-1 rounded-md border border-line bg-background px-3 text-sm text-muted"
              />
              <button
                type="button"
                onClick={copy}
                className="h-10 shrink-0 rounded-md border border-line px-4 text-sm transition-colors hover:border-accent"
              >
                {copyStatus === "copied" ? "Copied" : "Copy"}
              </button>
            </div>
            {copyStatus === "manual" ? (
              <p role="status" className="mt-2 text-sm text-muted">
                Your browser blocked copying. The link is selected: press Ctrl+C (⌘C on a Mac) to copy it.
              </p>
            ) : null}
            {sharing === "link" ? (
              <form action={reset} className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                <span className="text-muted">Shared it with someone you shouldn&apos;t have?</span>
                <button
                  type="submit"
                  disabled={resetting}
                  className="text-accent underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {resetting ? "Making a new link…" : "Reset link"}
                </button>
              </form>
            ) : null}
          </>
        )}
        <p className="mt-3 text-sm">
          <Link href={`/u/${username}`} className="text-accent hover:underline">
            View your profile
          </Link>
        </p>
      </section>
    </div>
  );
}
