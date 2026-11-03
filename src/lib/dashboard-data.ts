import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { dashboardStats, type DashboardStats } from "@/lib/stats";

// Loads the signed-in person's listens and works out their dashboard stats.
// The Stats page and the dashboard test both use this, so the test checks
// exactly what the page shows. The privacy rules mean the database only
// returns the signed-in person's own listens.
export async function loadDashboardStats(
  supabase: SupabaseClient<Database>,
): Promise<{ stats: DashboardStats; failed: boolean }> {
  const { data, error } = await supabase.from("listens").select("listened_on, score, albums (genre)");

  const stats = dashboardStats(
    (data ?? []).map((listen) => ({
      listened_on: listen.listened_on,
      score: listen.score,
      genre: listen.albums?.genre ?? null,
    })),
  );
  return { stats, failed: Boolean(error) };
}
