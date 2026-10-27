/** Commands declared in wxt.config.ts `manifest.commands`. Keep in sync. */
export const COMMANDS = [
  "play-pause",
  "next",
  "previous",
  "like",
  "repost",
  "seek-forward",
  "seek-backward",
  "volume-up",
  "volume-down",
  "mute",
  "shuffle",
  "repeat",
  "focus-tab",
] as const;

export type Command = (typeof COMMANDS)[number];

export function isCommand(value: string): value is Command {
  return (COMMANDS as readonly string[]).includes(value);
}

/** Commands handled by the service worker alone; everything else goes to the page. */
export const WORKER_ONLY_COMMANDS: ReadonlySet<Command> = new Set<Command>(["focus-tab"]);

export interface CommandMessage {
  type: "sc-shortcuts/command";
  command: Command;
  /** Seconds to seek per press. */
  seekStep: number;
}

export interface PingMessage {
  type: "sc-shortcuts/ping";
}

export type Message = CommandMessage | PingMessage;

export interface CommandResult {
  ok: boolean;
  /** Human-readable detail, e.g. which control was missing. */
  detail?: string;
}
