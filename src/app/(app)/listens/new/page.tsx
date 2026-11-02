import type { Metadata } from "next";
import { ListenForm } from "@/components/listen-form";
import { createListen } from "../actions";

export const metadata: Metadata = { title: "Log a listen · Recorded" };

export default function NewListenPage() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Log a listen</h1>
      <ListenForm
        action={createListen}
        submitLabel="Save listen"
        pendingLabel="Saving…"
        cancelHref="/diary"
      />
    </main>
  );
}
