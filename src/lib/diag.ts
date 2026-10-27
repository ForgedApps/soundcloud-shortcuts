/** A small ring buffer of worker events, readable from the options page. */

export const DIAG_KEY = "diag";
const MAX_EVENTS = 30;

export interface DiagEvent {
  at: number;
  text: string;
}

let queue: Promise<void> = Promise.resolve();

/** Log to the console and append to the stored event list. */
export function diag(text: string): void {
  console.log(`[sc-shortcuts] ${text}`);
  queue = queue
    .then(async () => {
      const stored = await chrome.storage.session.get(DIAG_KEY);
      const events = ((stored[DIAG_KEY] as DiagEvent[] | undefined) ?? []).slice(-(MAX_EVENTS - 1));
      events.push({ at: Date.now(), text });
      await chrome.storage.session.set({ [DIAG_KEY]: events });
    })
    .catch(() => {
      /* storage unavailable; console still has it */
    });
}

export async function readDiag(): Promise<DiagEvent[]> {
  const stored = await chrome.storage.session.get(DIAG_KEY);
  return (stored[DIAG_KEY] as DiagEvent[] | undefined) ?? [];
}
