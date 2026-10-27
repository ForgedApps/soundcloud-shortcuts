export type TabTargeting = "audible-first" | "active-first" | "first";

export interface Settings {
  /** How to pick the SoundCloud tab that receives a command. */
  tabTargeting: TabTargeting;
  /** Open soundcloud.com when a command fires and no SoundCloud tab exists. */
  openTabIfNone: boolean;
  /** Seconds moved by seek-forward / seek-backward. */
  seekStep: number;
  /** Briefly show a badge on the toolbar icon when a command fails. */
  showErrorBadge: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  tabTargeting: "audible-first",
  openTabIfNone: false,
  seekStep: 10,
  showErrorBadge: true,
};

const KEY = "settings";

export async function loadSettings(): Promise<Settings> {
  const stored = await chrome.storage.sync.get(KEY);
  return normalizeSettings(stored[KEY]);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.sync.set({ [KEY]: normalizeSettings(settings) });
}

/** Merge stored values over defaults and reject out-of-range values. */
export function normalizeSettings(raw: unknown): Settings {
  const input = (raw ?? {}) as Partial<Record<keyof Settings, unknown>>;
  const out: Settings = { ...DEFAULT_SETTINGS };

  if (
    input.tabTargeting === "audible-first" ||
    input.tabTargeting === "active-first" ||
    input.tabTargeting === "first"
  ) {
    out.tabTargeting = input.tabTargeting;
  }
  if (typeof input.openTabIfNone === "boolean") out.openTabIfNone = input.openTabIfNone;
  if (typeof input.showErrorBadge === "boolean") out.showErrorBadge = input.showErrorBadge;
  if (typeof input.seekStep === "number" && Number.isFinite(input.seekStep)) {
    out.seekStep = Math.min(120, Math.max(1, Math.round(input.seekStep)));
  }
  return out;
}
