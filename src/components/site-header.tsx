import Link from "next/link";
import { logOut } from "@/app/(auth)/actions";
import type { CurrentUser } from "@/lib/auth";

export function SiteHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Recorded<span className="text-accent">.</span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3 text-sm sm:gap-4">
            <nav className="flex items-center gap-3 sm:gap-4">
              <Link href="/diary" className="hover:text-accent">
                Diary
              </Link>
              <Link href="/favorites" className="hover:text-accent">
                Favorites
              </Link>
              <Link href="/listens/new" className="hover:text-accent">
                Log
              </Link>
            </nav>
            {user.username ? (
              <span className="hidden text-muted sm:inline">@{user.username}</span>
            ) : null}
            <form action={logOut}>
              <button
                type="submit"
                className="rounded-md border border-line px-3 py-1.5 transition-colors hover:border-accent"
              >
                Log out
              </button>
            </form>
          </div>
        ) : (
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/login" className="px-3 py-1.5 hover:text-accent">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-accent px-3 py-1.5 font-semibold text-background hover:opacity-90"
            >
              Sign up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
