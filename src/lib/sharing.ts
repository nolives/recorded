// Sharing settings for the profile page at /u/<username>.

export const SHARING = {
  private: { label: "Private", description: "Only you can see your profile." },
  link: {
    label: "Link only",
    description: "Anyone with your secret link can see it. Reset the link any time to stop old ones working.",
  },
  public: { label: "Public", description: "Anyone can see it at your profile address." },
} as const;

export type Sharing = keyof typeof SHARING;

export function isSharing(value: unknown): value is Sharing {
  return typeof value === "string" && value in SHARING;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const USERNAME = /^[a-z0-9_]{3,20}$/;

// The ?key= part of a link-only address, if it looks like a real key.
export function readShareKey(value: unknown) {
  return typeof value === "string" && UUID.test(value) ? value.toLowerCase() : undefined;
}

export function isUsername(value: string) {
  return USERNAME.test(value);
}

// The address to share: /u/<username>, plus ?key=… for link-only.
export function profilePath(username: string, sharing: Sharing, shareToken?: string | null) {
  const path = `/u/${username}`;
  return sharing === "link" && shareToken ? `${path}?key=${shareToken}` : path;
}
