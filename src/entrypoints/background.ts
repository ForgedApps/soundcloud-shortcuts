import { defineBackground } from "wxt/utils/define-background";
import {
  WORKER_ONLY_COMMANDS,
  isCommand,
  type Command,
  type CommandMessage,
  type CommandResult,
} from "@/lib/messages";
import { loadSettings, type Settings } from "@/lib/settings";
import { SOUNDCLOUD_URL_PATTERN, pickTargetTab } from "@/lib/tab-picker";

const SOUNDCLOUD_HOME = "https://soundcloud.com/";
const CONTENT_SCRIPT = "content-scripts/soundcloud.js";

export default defineBackground(() => {
  chrome.commands.onCommand.addListener((command) => {
    if (!isCommand(command)) return;
    void handleCommand(command).catch((error) => {
      console.error("[sc-shortcuts] command failed", command, error);
      void flashBadge("!", "#d32f2f");
    });
  });

  // Phase A has no popup; the toolbar icon opens settings.
  chrome.action.onClicked.addListener(() => {
    void chrome.runtime.openOptionsPage();
  });

  chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") void chrome.runtime.openOptionsPage();
  });
});

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

  const message: CommandMessage = {
    type: "sc-shortcuts/command",
    command,
    seekStep: settings.seekStep,
  };
  const result = await sendToTab(tab.id, message);
  if (!result?.ok) {
    console.warn("[sc-shortcuts]", command, result?.detail);
    if (settings.showErrorBadge) await flashBadge("!", "#d32f2f");
  }
}

async function findTargetTab(settings: Settings): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ url: SOUNDCLOUD_URL_PATTERN });
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
async function sendToTab(tabId: number, message: CommandMessage): Promise<CommandResult> {
  try {
    return (await chrome.tabs.sendMessage(tabId, message)) as CommandResult;
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: [CONTENT_SCRIPT] });
    return (await chrome.tabs.sendMessage(tabId, message)) as CommandResult;
  }
}

async function flashBadge(text: string, color: string): Promise<void> {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
  setTimeout(() => void chrome.action.setBadgeText({ text: "" }), 1500);
}
