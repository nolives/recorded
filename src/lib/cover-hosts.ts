// The sites saved album covers come from. Covers from these go through
// Vercel's image cache (see next.config.ts); a cover from anywhere else is
// shown from its own link, because the cache refuses unlisted sites.
export const COVER_SITES = [
  // MusicBrainz covers: Cover Art Archive, which sends on to the
  // Internet Archive (the cache follows those redirects itself)
  { protocol: "https", hostname: "coverartarchive.org", pathname: "/release-group/**" },
  { protocol: "https", hostname: "archive.org", pathname: "/download/**" },
  // Covers saved from iTunes before the switch to MusicBrainz
  { protocol: "https", hostname: "*.mzstatic.com", pathname: "/image/**" },
] as const;

// Does this cover come from one of the sites above?
export function isCachedCoverSite(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return COVER_SITES.some((site) => {
    if (parsed.protocol !== `${site.protocol}:`) return false;
    const hostMatches = site.hostname.startsWith("*.")
      ? parsed.hostname.endsWith(site.hostname.slice(1))
      : parsed.hostname === site.hostname;
    const pathMatches = parsed.pathname.startsWith(site.pathname.replace("/**", "/"));
    return hostMatches && pathMatches && parsed.search === "";
  });
}
