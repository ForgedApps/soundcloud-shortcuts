import type { TabTargeting } from "./settings";

/** The subset of chrome.tabs.Tab the picker needs, so it is testable without a browser. */
export interface TabLike {
  id?: number;
  url?: string;
  audible?: boolean;
  active?: boolean;
  lastAccessed?: number;
  windowId?: number;
}

export const SOUNDCLOUD_URL_PATTERN = "https://soundcloud.com/*";

export function isSoundCloudTab(tab: TabLike): boolean {
  return typeof tab.url === "string" && /^https:\/\/soundcloud\.com(\/|$)/.test(tab.url);
}

/**
 * Choose which SoundCloud tab should receive a command.
 *
 * - audible-first: the tab currently producing sound, else the most recently used.
 * - active-first: the active tab of the focused window if it is SoundCloud, else as above.
 * - first: the first matching tab in tab order (the original extension's behavior).
 */
export function pickTargetTab<T extends TabLike>(
  tabs: readonly T[],
  mode: TabTargeting,
  focusedWindowId?: number,
): T | undefined {
  const candidates = tabs.filter((t) => isSoundCloudTab(t) && t.id !== undefined);
  if (candidates.length === 0) return undefined;
  if (mode === "first") return candidates[0];

  if (mode === "active-first") {
    const active = candidates.find(
      (t) => t.active && (focusedWindowId === undefined || t.windowId === focusedWindowId),
    );
    if (active) return active;
  }

  const audible = candidates.find((t) => t.audible);
  if (audible) return audible;

  return [...candidates].sort((a, b) => (b.lastAccessed ?? 0) - (a.lastAccessed ?? 0))[0];
}
