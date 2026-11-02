import Link from "next/link";
import { logOut } from "@/app/(auth)/actions";
import type { CurrentUser } from "@/lib/auth";

export function SiteHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className="border-b border-line">
      {/* On phones the page links get their own row under the logo, so
          nothing collides; from small tablets up, it's all one row. */}
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:h-14 sm:flex-nowrap sm:py-0">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Recorded<span className="text-accent">.</span>
        </Link>

        {user ? (
          <>
            <nav
              aria-label="Main"
              className="order-last flex w-full items-center justify-between text-sm sm:order-none sm:ml-auto sm:w-auto sm:justify-start sm:gap-4"
            >
              <Link href="/diary" className="py-1 hover:text-accent">
                Diary
              </Link>
              <Link href="/favorites" className="py-1 hover:text-accent">
                Favorites
              </Link>
              <Link href="/dashboard" className="py-1 hover:text-accent">
                Stats
              </Link>
              <Link href="/listens/new" className="py-1 hover:text-accent">
                Log
              </Link>
            </nav>
            <div className="flex items-center gap-4 text-sm">
              {user.username ? (
                <span className="hidden text-muted sm:inline">@{user.username}</span>
              ) : null}
              <form action={logOut}>
                <button
                  type="submit"
                  className="whitespace-nowrap rounded-md border border-line px-3 py-1.5 transition-colors hover:border-accent"
                >
                  Log out
                </button>
              </form>
            </div>
          </>
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
