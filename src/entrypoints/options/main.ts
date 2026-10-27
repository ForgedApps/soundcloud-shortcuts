import { loadSettings, saveSettings, type Settings } from "@/lib/settings";

const isEdge = /\bEdg\//.test(navigator.userAgent);
const SHORTCUTS_URL = isEdge ? "edge://extensions/shortcuts" : "chrome://extensions/shortcuts";

async function renderCommands(): Promise<void> {
  const tbody = document.querySelector<HTMLTableSectionElement>("#commands tbody");
  if (!tbody) return;
  const commands = await chrome.commands.getAll();
  tbody.replaceChildren(
    ...commands
      .filter((c) => c.name && c.name !== "_execute_action")
      .map((c) => {
        const tr = document.createElement("tr");
        const action = document.createElement("td");
        action.textContent = c.description ?? c.name ?? "";
        const key = document.createElement("td");
        if (c.shortcut) {
          const kbd = document.createElement("kbd");
          kbd.textContent = c.shortcut;
          key.append(kbd);
        } else {
          key.textContent = "not set";
          key.className = "unbound";
        }
        tr.append(action, key);
        return tr;
      }),
  );
}

function readForm(form: HTMLFormElement): Settings {
  const data = new FormData(form);
  return {
    tabTargeting: String(data.get("tabTargeting")) as Settings["tabTargeting"],
    seekStep: Number(data.get("seekStep")),
    openTabIfNone: data.get("openTabIfNone") === "on",
    showErrorBadge: data.get("showErrorBadge") === "on",
    notifyOnTrackChange: data.get("notifyOnTrackChange") === "on",
    notifyOnlyWhenHidden: data.get("notifyOnlyWhenHidden") === "on",
    showStateBadge: data.get("showStateBadge") === "on",
  };
}

function writeForm(form: HTMLFormElement, settings: Settings): void {
  (form.elements.namedItem("tabTargeting") as HTMLSelectElement).value = settings.tabTargeting;
  (form.elements.namedItem("seekStep") as HTMLInputElement).value = String(settings.seekStep);
  (form.elements.namedItem("openTabIfNone") as HTMLInputElement).checked = settings.openTabIfNone;
  for (const key of [
    "showErrorBadge",
    "notifyOnTrackChange",
    "notifyOnlyWhenHidden",
    "showStateBadge",
  ] as const) {
    (form.elements.namedItem(key) as HTMLInputElement).checked = settings[key];
  }
}

const isWindows = /Windows/.test(navigator.userAgent);

async function wireNotificationTest(): Promise<void> {
  const button = document.querySelector<HTMLButtonElement>("#test-notification");
  const status = document.querySelector<HTMLElement>("#notification-status");
  if (!button || !status) return;

  const showLevel = async () => {
    const level = await new Promise<string>((resolve) =>
      chrome.notifications.getPermissionLevel((l) => resolve(String(l))),
    );
    status.textContent =
      level === "granted"
        ? ""
        : `Notifications are blocked for this browser (permission: ${level}).` +
          (isWindows ? " Check Windows Settings → System → Notifications and Focus assist." : "");
  };
  await showLevel();

  button.addEventListener("click", async () => {
    status.textContent = "Sending…";
    const result = (await chrome.runtime
      .sendMessage({ type: "sc-shortcuts/test-notification" })
      .catch((e: unknown) => ({ ok: false, detail: String(e) }))) as {
      ok: boolean;
      detail?: string;
    };
    status.textContent = result.ok
      ? "Sent. If nothing appeared, the browser or OS is hiding notifications" +
        (isWindows ? " (Windows Settings → System → Notifications, and Focus assist)." : ".")
      : `Could not show a notification: ${result.detail ?? "unknown error"}`;
  });
}

async function init(): Promise<void> {
  void wireNotificationTest();
  document.querySelector("#open-shortcuts")?.addEventListener("click", () => {
    void chrome.tabs.create({ url: SHORTCUTS_URL });
  });

  const form = document.querySelector<HTMLFormElement>("#settings");
  const status = document.querySelector<HTMLElement>("#status");
  if (form) {
    writeForm(form, await loadSettings());
    form.addEventListener("change", async () => {
      await saveSettings(readForm(form));
      writeForm(form, await loadSettings());
      if (status) {
        status.textContent = "Saved";
        setTimeout(() => (status.textContent = ""), 1200);
      }
    });
  }

  await renderCommands();
  // Refresh bindings when the user comes back from the shortcut settings page.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void renderCommands();
  });
}

void init();
