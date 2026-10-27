import { defineContentScript } from "wxt/utils/define-content-script";
import type { CommandResult, Message } from "@/lib/messages";
import { runCommand } from "@/lib/player-adapter";

export default defineContentScript({
  matches: ["https://soundcloud.com/*"],
  runAt: "document_idle",
  main() {
    chrome.runtime.onMessage.addListener(
      (message: Message, _sender, sendResponse: (r: CommandResult) => void) => {
        if (message.type === "sc-shortcuts/ping") {
          sendResponse({ ok: true });
          return;
        }
        if (message.type === "sc-shortcuts/command") {
          try {
            sendResponse(runCommand(message.command, message.seekStep));
          } catch (error) {
            sendResponse({ ok: false, detail: String(error) });
          }
        }
      },
    );
  },
});
