import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="mt-2 text-muted">
        That page doesn&apos;t exist, or it belongs to someone else.
      </p>
      <Link href="/diary" className="mt-6 text-accent hover:underline">
        Go to your diary
      </Link>
    </main>
  );
}
