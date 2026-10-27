/**
 * Every piece of SoundCloud DOM knowledge lives here. When soundcloud.com
 * changes its markup this is the only file that should need to change.
 *
 * Strategy per control: try the known button selectors first, then fall back
 * to dispatching the keyboard shortcut SoundCloud itself handles on the page.
 */
import type { Command, CommandResult } from "./messages";
import { parseTime, type NowPlaying, type RepeatMode } from "./state";

export const SELECTORS = {
  playControls: [".playControls"],
  play: [".playControls__play", ".playControl"],
  next: [".skipControl__next", ".playControls__next"],
  previous: [".skipControl__previous", ".playControls__prev"],
  like: [".playbackSoundBadge__like", ".playbackSoundBadge .sc-button-like"],
  repost: [".playbackSoundBadge__repost", ".playbackSoundBadge .sc-button-repost"],
  mute: [".volume__button", ".volume .volume__button"],
  volume: [".volume"],
  shuffle: [".shuffleControl", ".playControls__shuffle"],
  repeat: [".repeatControl", ".playControls__repeat"],
  timeline: [".playbackTimeline__progressWrapper", ".playbackTimeline [role=progressbar]"],
  timePassed: [".playbackTimeline__timePassed"],
  timeDuration: [".playbackTimeline__duration"],
  title: [".playbackSoundBadge__titleLink", ".playbackSoundBadge__title a"],
  artist: [".playbackSoundBadge__lightLink", ".playbackSoundBadge__titleContextContainer a"],
  artwork: [
    ".playbackSoundBadge__avatar [style*='background-image']",
    ".playbackSoundBadge .sc-artwork[style*='background-image']",
    ".playbackSoundBadge img",
  ],
} as const;

type SelectorKey = keyof typeof SELECTORS;

/** Keyboard shortcuts soundcloud.com handles itself, used as fallbacks. */
const KEY_FALLBACK: Partial<Record<Command, KeyboardEventInit>> = {
  "play-pause": { key: " ", code: "Space", keyCode: 32 },
  next: { key: "ArrowRight", code: "ArrowRight", keyCode: 39, shiftKey: true },
  previous: { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37, shiftKey: true },
  like: { key: "l", code: "KeyL", keyCode: 76 },
  repost: { key: "r", code: "KeyR", keyCode: 82 },
  "seek-forward": { key: "ArrowRight", code: "ArrowRight", keyCode: 39 },
  "seek-backward": { key: "ArrowLeft", code: "ArrowLeft", keyCode: 37 },
  "volume-up": { key: "ArrowUp", code: "ArrowUp", keyCode: 38, shiftKey: true },
  "volume-down": { key: "ArrowDown", code: "ArrowDown", keyCode: 40, shiftKey: true },
  mute: { key: "m", code: "KeyM", keyCode: 77 },
  shuffle: { key: "s", code: "KeyS", keyCode: 83 },
  repeat: { key: "r", code: "KeyR", keyCode: 82, shiftKey: true },
};

export function find(key: SelectorKey, root: ParentNode = document): HTMLElement | null {
  for (const selector of SELECTORS[key]) {
    const el = root.querySelector<HTMLElement>(selector);
    if (el) return el;
  }
  return null;
}

function click(key: SelectorKey): CommandResult {
  const el = find(key);
  if (!el) return { ok: false, detail: `control not found: ${key}` };
  el.click();
  return { ok: true };
}

function dispatchKey(init: KeyboardEventInit): CommandResult {
  // SoundCloud ignores shortcuts while a text field is focused; blur it first.
  const active = document.activeElement as HTMLElement | null;
  if (active && active !== document.body && typeof active.blur === "function") {
    active.blur();
  }
  const target = document.body ?? document.documentElement;
  const common: KeyboardEventInit = { bubbles: true, cancelable: true, ...init };
  target.dispatchEvent(new KeyboardEvent("keydown", common));
  target.dispatchEvent(new KeyboardEvent("keyup", common));
  return { ok: true, detail: "dispatched keyboard shortcut" };
}

function clickThenKey(key: SelectorKey, command: Command): CommandResult {
  const result = click(key);
  if (result.ok) return result;
  const fallback = KEY_FALLBACK[command];
  return fallback ? dispatchKey(fallback) : result;
}

export interface TimelineState {
  position: number;
  duration: number;
}

export function readTimeline(): TimelineState | null {
  const el = find("timeline");
  if (!el) return null;
  let position = Number(el.getAttribute("aria-valuenow"));
  let duration = Number(el.getAttribute("aria-valuemax"));
  if (!el.hasAttribute("aria-valuenow") || !Number.isFinite(position)) {
    position = parseTime(visibleText(find("timePassed"))) ?? Number.NaN;
  }
  if (!el.hasAttribute("aria-valuemax") || !Number.isFinite(duration)) {
    duration = parseTime(visibleText(find("timeDuration"))) ?? Number.NaN;
  }
  if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) return null;
  return { position, duration };
}

/** Text of the element with screen-reader-only children ("Current time:") removed. */
function visibleText(el: HTMLElement | null): string | null {
  if (!el) return null;
  const shown = el.querySelector<HTMLElement>("[aria-hidden='true']");
  return (shown ?? el).textContent?.trim() ?? null;
}

/** Simulate a pointer press on the timeline at a fraction of its width. */
export function seekToFraction(fraction: number): CommandResult {
  const el = find("timeline");
  if (!el) return { ok: false, detail: "timeline not found" };
  const rect = el.getBoundingClientRect();
  if (rect.width === 0) return { ok: false, detail: "timeline has no width" };
  const f = Math.min(1, Math.max(0, fraction));
  const x = rect.left + f * rect.width;
  const y = rect.top + rect.height / 2;
  const init: MouseEventInit = {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: 1,
    view: window,
  };
  el.dispatchEvent(new MouseEvent("mousedown", init));
  el.dispatchEvent(new MouseEvent("mouseup", { ...init, buttons: 0 }));
  el.dispatchEvent(new MouseEvent("click", { ...init, buttons: 0 }));
  return { ok: true };
}

/** Seek relative to the current position. */
function seekBy(deltaSeconds: number, command: Command): CommandResult {
  const state = readTimeline();
  const fallback = KEY_FALLBACK[command];
  if (!state) {
    return fallback ? dispatchKey(fallback) : { ok: false, detail: "timeline not found" };
  }
  const result = seekToFraction((state.position + deltaSeconds) / state.duration);
  if (result.ok || !fallback) return result;
  return dispatchKey(fallback);
}

export function isPlaying(): boolean {
  const el = find("play");
  return (
    !!el && (el.classList.contains("playing") || /pause/i.test(el.getAttribute("title") ?? ""))
  );
}

export function currentTitle(): string | null {
  const el = find("title");
  return el?.getAttribute("title") ?? el?.textContent?.trim() ?? null;
}

function selected(el: HTMLElement | null): boolean {
  return (
    !!el &&
    (el.classList.contains("sc-button-selected") ||
      el.getAttribute("aria-pressed") === "true" ||
      /unlike|un-?repost|remove/i.test(el.getAttribute("title") ?? ""))
  );
}

function repeatMode(el: HTMLElement | null): RepeatMode {
  if (!el) return "none";
  if (el.classList.contains("m-one")) return "one";
  if (el.classList.contains("m-all")) return "all";
  const title = el.getAttribute("title") ?? "";
  if (/one/i.test(title) && !/repeat$/i.test(title)) return "one";
  return "none";
}

function artworkUrl(el: HTMLElement | null): string | null {
  if (!el) return null;
  if (el instanceof HTMLImageElement) return el.src || null;
  const match = /url\(["']?([^"')]+)["']?\)/.exec(el.style.backgroundImage ?? "");
  return match?.[1] ?? null;
}

function absolute(href: string | null): string {
  if (!href) return "";
  try {
    return new URL(href, "https://soundcloud.com/").toString();
  } catch {
    return "";
  }
}

/** Snapshot of the player bar, or null if no track is loaded. */
export function readNowPlaying(): NowPlaying | null {
  const titleEl = find("title");
  const href = titleEl?.getAttribute("href");
  if (!titleEl || !href) return null;
  const trackUrl = absolute(href);
  const trackKey = new URL(trackUrl).pathname;
  const timeline = readTimeline();
  const artistEl = find("artist");
  const volumeEl = find("volume");
  const level = Number(volumeEl?.getAttribute("data-level"));

  return {
    trackKey,
    trackUrl,
    title: titleEl.getAttribute("title") ?? titleEl.textContent?.trim() ?? "",
    artist: artistEl?.getAttribute("title") ?? artistEl?.textContent?.trim() ?? "",
    artistUrl: absolute(artistEl?.getAttribute("href") ?? null),
    artworkUrl: artworkUrl(find("artwork")),
    playing: isPlaying(),
    position: timeline?.position ?? 0,
    duration: timeline?.duration ?? 0,
    liked: selected(find("like")),
    reposted: selected(find("repost")),
    shuffle: !!find("shuffle")?.classList.contains("m-shuffling"),
    repeat: repeatMode(find("repeat")),
    volume: Number.isFinite(level) ? level : null,
    muted: !!volumeEl?.classList.contains("muted"),
    updatedAt: Date.now(),
  };
}

/** Swap SoundCloud's size suffix on an artwork URL, e.g. t50x50 → t200x200. */
export function artworkAtSize(url: string, size: number): string {
  return url.replace(/-(t\d+x\d+|large|small|badge|original|crop)(\.\w+)$/, `-t${size}x${size}$2`);
}

export function runCommand(command: Command, seekStep: number): CommandResult {
  switch (command) {
    case "play-pause":
      return clickThenKey("play", command);
    case "next":
      return clickThenKey("next", command);
    case "previous":
      return clickThenKey("previous", command);
    case "like":
      return clickThenKey("like", command);
    case "repost":
      return clickThenKey("repost", command);
    case "mute":
      return clickThenKey("mute", command);
    case "shuffle":
      return clickThenKey("shuffle", command);
    case "repeat":
      return clickThenKey("repeat", command);
    case "seek-forward":
      return seekBy(seekStep, command);
    case "seek-backward":
      return seekBy(-seekStep, command);
    case "volume-up":
    case "volume-down":
      // The volume slider only renders while hovered, so the page's own
      // Shift+Arrow shortcut is the reliable path.
      return dispatchKey(KEY_FALLBACK[command] as KeyboardEventInit);
    case "focus-tab":
      return { ok: false, detail: "handled by the service worker" };
  }
}
