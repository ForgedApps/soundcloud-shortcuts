import { defineBackground } from "wxt/utils/define-background";
import {
  WORKER_ONLY_COMMANDS,
  isCommand,
  type Command,
  type CommandMessage,
  type CommandResult,
  type Message,
  type SeekToMessage,
} from "@/lib/messages";
import { loadSettings, type Settings } from "@/lib/settings";
import { loadState, saveState, type NowPlaying, type StoredState } from "@/lib/state";
import { SOUNDCLOUD_URL_PATTERN, pickTargetTab } from "@/lib/tab-picker";

const SOUNDCLOUD_HOME = "https://soundcloud.com/";
const CONTENT_SCRIPT = "content-scripts/soundcloud.js";
const NOTIFICATION_ID = "sc-shortcuts/now-playing";

export default defineBackground(() => {
  chrome.commands.onCommand.addListener((command) => {
    if (!isCommand(command)) return;
    void handleCommand(command).catch((error) => {
      console.error("[sc-shortcuts] command failed", command, error);
      void flashBadge("!", "#d32f2f");
    });
  });

  chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    switch (message.type) {
      case "sc-shortcuts/state":
        if (sender.tab?.id !== undefined) void onStateReport(sender.tab.id, message.state);
        return;
      case "sc-shortcuts/waveform":
        if (sender.tab?.id !== undefined) void onWaveform(sender.tab.id, message.waveform);
        return;
      case "sc-shortcuts/test-notification":
        void testNotification()
          .then(sendResponse)
          .catch((error) => sendResponse({ ok: false, detail: String(error) }));
        return true;
      case "sc-shortcuts/invoke":
        void ("command" in message ? handleCommand(message.command) : seekTo(message.seekTo))
          .then(() => sendResponse({ ok: true }))
          .catch((error) => sendResponse({ ok: false, detail: String(error) }));
        return true; // async response
    }
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    void (async () => {
      const state = await loadState();
      if (state.tabId === tabId) {
        await saveState({ ...state, nowPlaying: null, tabId: null, waveform: null });
        await setStateBadge(null);
      }
    })();
  });

  chrome.notifications.onClicked.addListener((id) => {
    if (id !== NOTIFICATION_ID) return;
    chrome.notifications.clear(id);
    void handleCommand("focus-tab");
  });

  chrome.notifications.onButtonClicked.addListener((id, index) => {
    if (id !== NOTIFICATION_ID) return;
    void handleCommand(index === 0 ? "next" : "like");
  });

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") void chrome.runtime.openOptionsPage();
  });
});

/* ---------------- commands ---------------- */

async function handleCommand(command: Command): Promise<void> {
  const settings = await loadSettings();
  const tab = await findTargetTab(settings);

  if (!tab?.id) {
    if (settings.openTabIfNone) {
      await chrome.tabs.create({ url: SOUNDCLOUD_HOME });
    } else if (settings.showErrorBadge) {
      await flashBadge("?", "#616161");
    }
    return;
  }

  if (WORKER_ONLY_COMMANDS.has(command)) {
    await chrome.tabs.update(tab.id, { active: true });
    if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
    return;
  }

  const result = await sendToTab(tab.id, {
    type: "sc-shortcuts/command",
    command,
    seekStep: settings.seekStep,
  });
  if (!result?.ok) {
    console.warn("[sc-shortcuts]", command, result?.detail);
    if (settings.showErrorBadge) await flashBadge("!", "#d32f2f");
  }
}

async function seekTo(fraction: number): Promise<void> {
  const state = await loadState();
  const tabId = state.tabId ?? (await findTargetTab(await loadSettings()))?.id;
  if (tabId === undefined) return;
  await sendToTab(tabId, { type: "sc-shortcuts/seek-to", fraction });
}

async function findTargetTab(settings: Settings): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ url: SOUNDCLOUD_URL_PATTERN });
  // Prefer the tab we know is showing a track.
  const known = (await loadState()).tabId;
  const knownTab = tabs.find((t) => t.id === known);
  if (knownTab && (knownTab.audible || settings.tabTargeting !== "active-first")) return knownTab;

  let focusedWindowId: number | undefined;
  try {
    focusedWindowId = (await chrome.windows.getLastFocused()).id;
  } catch {
    focusedWindowId = undefined;
  }
  return pickTargetTab(tabs, settings.tabTargeting, focusedWindowId);
}

/**
 * Deliver a message to the content script. A tab that was open before the
 * extension was installed or updated has no content script yet, so inject it
 * on demand and retry once.
 */
async function sendToTab(
  tabId: number,
  message: CommandMessage | SeekToMessage,
): Promise<CommandResult> {
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as CommandResult;
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT] });
    return (await chrome.tabs.sendMessage(tabId, message)) as CommandResult;
  }
}

/* ---------------- now-playing state ---------------- */

async function onStateReport(tabId: number, incoming: NowPlaying | null): Promise<void> {
  const current = await loadState();

  // Several SoundCloud tabs may report. Keep following the tab we have unless
  // another one starts playing, and ignore "nothing loaded" from bystanders.
  if (current.tabId !== null && current.tabId !== tabId) {
    const currentIsPlaying = current.nowPlaying?.playing ?? false;
    if (!incoming || (currentIsPlaying && !incoming.playing)) return;
  }

  const next: StoredState = {
    nowPlaying: incoming,
    tabId: incoming ? tabId : null,
    waveform:
      incoming && current.waveform?.trackKey === incoming.trackKey ? current.waveform : null,
    notifiedKey: current.notifiedKey ?? null,
  };

  const settings = await loadSettings();
  // A new track is announced once it is actually playing. SoundCloud often
  // reports the new track in a paused/loading state first, so compare against
  // the last announced track rather than the previous report.
  const isNewTrack = !!incoming && incoming.playing && incoming.trackKey !== next.notifiedKey;
  if (isNewTrack && settings.notifyOnTrackChange) {
    next.notifiedKey = incoming.trackKey;
  }
  await saveState(next);

  if (settings.showStateBadge) await setStateBadge(incoming);
  if (isNewTrack && incoming) {
    if (settings.notifyOnTrackChange) {
      const result = await notifyTrack(tabId, incoming, settings);
      console.info(
        `[sc-shortcuts] new track "${incoming.title}" → notification:`,
        result.ok ? (result.detail ?? "shown") : `FAILED: ${result.detail}`,
      );
    } else {
      console.info(`[sc-shortcuts] new track "${incoming.title}" (notifications disabled)`);
    }
  } else if (incoming?.artworkData && incoming.trackKey === next.notifiedKey) {
    // Artwork arrived after the notification was shown; refresh its icon.
    await updateNotificationIcon(incoming);
  }
}

async function onWaveform(tabId: number, waveform: StoredState["waveform"]): Promise<void> {
  const current = await loadState();
  if (current.tabId !== tabId || !waveform) return;
  if (current.nowPlaying?.trackKey !== waveform.trackKey) return;
  await saveState({ ...current, waveform });
}

async function setStateBadge(state: NowPlaying | null): Promise<void> {
  if (!state) {
    await chrome.action.setBadgeText({ text: "" });
    await chrome.action.setTitle({ title: "Shortcuts for SoundCloud" });
    return;
  }
  await chrome.action.setBadgeBackgroundColor({ color: state.playing ? "#ff5500" : "#777777" });
  await chrome.action.setBadgeText({ text: state.playing ? "▶" : "❚❚" });
  await chrome.action.setTitle({ title: `${state.title} — ${state.artist}` });
}

async function notifyTrack(
  tabId: number,
  state: NowPlaying,
  settings: Settings,
): Promise<CommandResult> {
  if (settings.notifyOnlyWhenHidden && (await tabIsBeingViewed(tabId))) {
    return { ok: true, detail: "skipped: SoundCloud tab is being viewed" };
  }
  const result = await createNotification({
    type: "basic",
    iconUrl: state.artworkData ?? chrome.runtime.getURL("icon/128.png"),
    title: state.title,
    message: state.artist,
    contextMessage: "Now playing on SoundCloud",
    buttons: [{ title: "Next" }, { title: state.liked ? "Unlike" : "Like" }],
    silent: true,
  });
  return result;
}

/** Create (replacing any previous) and report errors instead of swallowing them. */
function createNotification(
  options: chrome.notifications.NotificationCreateOptions,
): Promise<CommandResult> {
  return new Promise((resolve) => {
    chrome.notifications.clear(NOTIFICATION_ID, () => {
      void chrome.runtime.lastError;
      chrome.notifications.create(NOTIFICATION_ID, options, (id) => {
        const error = chrome.runtime.lastError?.message;
        if (error) resolve({ ok: false, detail: error });
        else if (!id) resolve({ ok: false, detail: "browser returned no notification id" });
        else resolve({ ok: true });
      });
    });
  });
}

/** Used by the options page to check that notifications can appear at all. */
async function testNotification(): Promise<CommandResult> {
  const level = await new Promise<string>((resolve) =>
    chrome.notifications.getPermissionLevel((l) => resolve(String(l))),
  );
  if (level !== "granted") {
    return { ok: false, detail: `browser reports notification permission "${level}"` };
  }
  const result = await createNotification({
    type: "basic",
    iconUrl: chrome.runtime.getURL("icon/128.png"),
    title: "Test track",
    message: "Shortcuts for SoundCloud",
    contextMessage: "If you can see this, track notifications will work",
    buttons: [{ title: "Next" }, { title: "Like" }],
  });
  return result.ok ? { ok: true, detail: "notification created" } : result;
}

async function updateNotificationIcon(state: NowPlaying): Promise<void> {
  if (!state.artworkData) return;
  await new Promise<void>((resolve) => {
    chrome.notifications.update(NOTIFICATION_ID, { iconUrl: state.artworkData }, () => {
      void chrome.runtime.lastError;
      resolve();
    });
  });
}

async function tabIsBeingViewed(tabId: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.active || tab.windowId === undefined) return false;
    const win = await chrome.windows.get(tab.windowId);
    return !!win.focused;
  } catch {
    return false;
  }
}

async function flashBadge(text: string, color: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => {
    void loadState().then((s) => setStateBadge(s.nowPlaying));
  }, 1500);
}
