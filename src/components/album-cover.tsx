type AlbumCoverProps = {
  title: string;
  artist: string;
  coverUrl?: string | null;
  size?: "sm" | "lg" | "fill";
};

// Shows the album cover, or a simple placeholder with the album's initials.
export function AlbumCover({ title, artist, coverUrl, size = "sm" }: AlbumCoverProps) {
  const box = {
    sm: "size-14 text-base",
    lg: "size-40 sm:size-56 text-4xl",
    fill: "aspect-square w-full text-4xl", // as wide as its container
  }[size];

  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- cover art comes from outside sites
      <img
        src={coverUrl}
        alt={`Cover of ${title} by ${artist}`}
        className={`${box} shrink-0 rounded-md border border-line object-cover`}
      />
    );
  }

  const initials = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  return (
    <div
      aria-hidden="true"
      className={`${box} flex shrink-0 items-center justify-center rounded-md border border-line bg-surface font-semibold text-muted`}
    >
      {initials}
    </div>
  );
}
