import { defineContentScript } from "wxt/utils/define-content-script";
import type { CommandResult, Message, StateMessage, WaveformMessage } from "@/lib/messages";
import {
  artworkAtSize,
  find,
  readNowPlaying,
  runCommand,
  seekToFraction,
} from "@/lib/player-adapter";
import type { NowPlaying } from "@/lib/state";
import { extractWaveformUrl, isWaveformJson } from "@/lib/waveform";

export default defineContentScript({
  matches: ["https://soundcloud.com/*"],
  runAt: "document_idle",
  main() {
    chrome.runtime.onMessage.addListener(
      (message: Message, _sender, sendResponse: (r: CommandResult) => void) => {
        switch (message.type) {
          case "sc-shortcuts/ping":
            sendResponse({ ok: true });
            return;
          case "sc-shortcuts/command":
            sendResponse(safely(() => runCommand(message.command, message.seekStep)));
            return;
          case "sc-shortcuts/seek-to":
            sendResponse(safely(() => seekToFraction(message.fraction)));
            return;
        }
      },
    );
    watchPlayer();
  },
});

function safely(fn: () => CommandResult): CommandResult {
  try {
    return fn();
  } catch (error) {
    return { ok: false, detail: String(error) };
  }
}

/* ---------------- now-playing reporting ---------------- */

let lastSent: string | null = null;
let lastTrackKey: string | null = null;
const artworkCache = new Map<string, string>();
const waveformSent = new Set<string>();

function watchPlayer(): void {
  const controls = find("playControls");
  if (!controls) {
    // SoundCloud renders the player bar after hydration; try again shortly.
    setTimeout(watchPlayer, 1000);
    return;
  }
  const observer = new MutationObserver(scheduleReport);
  observer.observe(controls, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  // Some updates (e.g. after a page navigation inside the SPA) arrive without
  // a mutation we can see, so poll slowly as a safety net.
  setInterval(scheduleReport, 2000);
  scheduleReport();
}

let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleReport(): void {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    report();
  }, 150);
}

function report(): void {
  const state = readNowPlaying();
  if (state) {
    const cached = artworkCache.get(state.trackKey);
    if (cached) state.artworkData = cached;
  }
  const key = state ? fingerprint(state) : "none";
  if (key === lastSent) return;
  lastSent = key;
  send({ type: "sc-shortcuts/state", state });

  if (state && state.trackKey !== lastTrackKey) {
    lastTrackKey = state.trackKey;
    void enrich(state);
  }
}

/** Only the fields whose change is worth a message. */
function fingerprint(s: NowPlaying): string {
  return [
    s.trackKey,
    s.playing,
    Math.floor(s.position),
    Math.floor(s.duration),
    s.liked,
    s.reposted,
    s.shuffle,
    s.repeat,
    s.volume,
    s.muted,
    s.artworkData ? 1 : 0,
  ].join("|");
}

function send(message: StateMessage | WaveformMessage): void {
  try {
    void chrome.runtime.sendMessage(message).catch(() => {
      /* worker asleep or extension reloading; next report will retry */
    });
  } catch {
    /* extension context invalidated */
  }
}

/** Fetch artwork (as a data URL) and waveform peaks for a newly started track. */
async function enrich(state: NowPlaying): Promise<void> {
  await Promise.all([loadArtwork(state), loadWaveform(state)]);
}

async function loadArtwork(state: NowPlaying): Promise<void> {
  if (!state.artworkUrl || artworkCache.has(state.trackKey)) return;
  try {
    const response = await fetch(artworkAtSize(state.artworkUrl, 200));
    if (!response.ok) return;
    const blob = await response.blob();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    artworkCache.set(state.trackKey, dataUrl);
    lastSent = null; // force a resend with the artwork attached
    scheduleReport();
  } catch {
    /* artwork is optional */
  }
}

async function loadWaveform(state: NowPlaying): Promise<void> {
  if (waveformSent.has(state.trackKey)) return;
  try {
    const page = await fetch(state.trackUrl, { credentials: "omit" });
    if (!page.ok) return;
    const url = extractWaveformUrl(await page.text());
    if (!url) return;
    const response = await fetch(url);
    if (!response.ok) return;
    const json: unknown = await response.json();
    if (!isWaveformJson(json)) return;
    waveformSent.add(state.trackKey);
    send({
      type: "sc-shortcuts/waveform",
      waveform: { trackKey: state.trackKey, samples: json.samples, height: json.height },
    });
  } catch {
    /* the popup falls back to a plain progress bar */
  }
}
