export type RepeatMode = "none" | "one" | "all";

/** What the player bar on soundcloud.com currently shows. */
export interface NowPlaying {
  /** Track permalink path, e.g. "/artist/track". Identifies the track. */
  trackKey: string;
  trackUrl: string;
  title: string;
  artist: string;
  artistUrl: string;
  /** Small artwork URL as shown in the player bar, or null if none. */
  artworkUrl: string | null;
  /** Artwork as a data URL (filled in asynchronously), for popup and notifications. */
  artworkData?: string;
  playing: boolean;
  /** Seconds. */
  position: number;
  /** Seconds. */
  duration: number;
  liked: boolean;
  reposted: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  /** 0..10 as SoundCloud reports it, or null if unknown. */
  volume: number | null;
  muted: boolean;
  /** Date.now() when read, used to interpolate the position in the popup. */
  updatedAt: number;
}

export interface Waveform {
  trackKey: string;
  /** Peak heights 0..height, 1800 of them for SoundCloud. */
  samples: number[];
  height: number;
}

/** State persisted by the worker so popup and notifications survive worker restarts. */
export interface StoredState {
  nowPlaying: NowPlaying | null;
  /** Tab that reported `nowPlaying`. */
  tabId: number | null;
  waveform: Waveform | null;
}

export const STATE_KEY = "state";

export const EMPTY_STATE: StoredState = { nowPlaying: null, tabId: null, waveform: null };

export async function loadState(): Promise<StoredState> {
  const stored = await chrome.storage.session.get(STATE_KEY);
  return { ...EMPTY_STATE, ...(stored[STATE_KEY] as Partial<StoredState> | undefined) };
}

export async function saveState(state: StoredState): Promise<void> {
  await chrome.storage.session.set({ [STATE_KEY]: state });
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(r).padStart(2, "0")}`;
}

/** Parse "1:23" or "1:02:03" into seconds. Returns null for anything else. */
export function parseTime(text: string | null | undefined): number | null {
  if (!text) return null;
  const parts = text.trim().split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => !Number.isFinite(n))) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}
