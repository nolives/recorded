import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SharingForm } from "@/components/sharing-form";
import { isSharing } from "@/lib/sharing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings · Recorded" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, sharing, share_token")
    .eq("id", userId)
    .single();
  if (!profile) redirect("/diary");

  // The full web address, so the link can be copied and sent.
  const head = await headers();
  const host = head.get("x-forwarded-host") ?? head.get("host") ?? "recorded-albums.vercel.app";
  const protocol = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Settings</h1>
      <p className="mb-6 text-sm text-muted">
        Your profile shows your favorites, recent listens with reviews, and your full diary.
      </p>
      <SharingForm
        username={profile.username}
        sharing={isSharing(profile.sharing) ? profile.sharing : "private"}
        shareToken={profile.share_token}
        origin={`${protocol}://${host}`}
      />
    </main>
  );
}
