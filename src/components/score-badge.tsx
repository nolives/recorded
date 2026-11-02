// A listen's score out of 10, or a quiet "No score" label.
export function ScoreBadge({ score, size = "sm" }: { score: number | null; size?: "sm" | "lg" }) {
  if (score === null) {
    return (
      <span className="whitespace-nowrap rounded-md border border-line px-2 py-0.5 text-xs text-muted">
        No score
      </span>
    );
  }

  return (
    <span
      className={`whitespace-nowrap rounded-md bg-accent/15 font-semibold tabular-nums text-accent ${
        size === "lg" ? "px-3 py-1 text-2xl" : "px-2 py-0.5 text-sm"
      }`}
    >
      {score}
      <span className="font-normal opacity-70">/10</span>
    </span>
  );
}
