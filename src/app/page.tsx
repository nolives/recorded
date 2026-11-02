import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-16">
        <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          A diary for the albums you listen to.
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted">
          Log every listen, score it out of 10, write a few words, and keep a
          shelf of your all-time favorites.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-accent px-5 py-3 font-semibold text-background hover:opacity-90"
          >
            Start your diary
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-line px-5 py-3 hover:border-accent"
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
      <h1 className="text-2xl font-semibold">
        Welcome{user.username ? `, @${user.username}` : ""}
      </h1>
      <p className="mt-2 text-muted">
        You&apos;re logged in. Logging listens comes next.
      </p>
    </main>
  );
}
