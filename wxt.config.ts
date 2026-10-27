import { defineConfig } from "wxt";

// Browser-level shortcut defaults. Users remap these at
// chrome://extensions/shortcuts or edge://extensions/shortcuts.
// Browsers accept at most four suggested keys per extension; the remaining
// commands ship unbound and can be bound by the user.
export default defineConfig({
  srcDir: "src",
  manifest: {
    name: "Shortcuts for SoundCloud",
    short_name: "SC Shortcuts",
    description:
      "Keyboard shortcuts to play, pause, skip, seek, like and control volume on soundcloud.com from any tab. Remap them in your browser's extension shortcut settings.",
    homepage_url: "https://github.com/jgentes/soundcloud-shortcuts",
    permissions: ["scripting", "storage", "notifications"],
    host_permissions: ["https://soundcloud.com/*"],
    minimum_chrome_version: "116",
    action: {
      default_title: "Shortcuts for SoundCloud",
    },
    commands: {
      "play-pause": {
        description: "Play / pause",
        suggested_key: { default: "Alt+Shift+P" },
      },
      next: {
        description: "Next track",
        suggested_key: { default: "Alt+Shift+Period" },
      },
      previous: {
        description: "Previous track",
        suggested_key: { default: "Alt+Shift+Comma" },
      },
      like: {
        description: "Like / unlike current track",
        suggested_key: { default: "Alt+Shift+L" },
      },
      repost: { description: "Repost / un-repost current track" },
      "seek-forward": { description: "Seek forward" },
      "seek-backward": { description: "Seek backward" },
      "volume-up": { description: "Volume up" },
      "volume-down": { description: "Volume down" },
      mute: { description: "Mute / unmute" },
      shuffle: { description: "Toggle shuffle" },
      repeat: { description: "Cycle repeat mode" },
      "focus-tab": { description: "Switch to the SoundCloud tab" },
    },
  },
});
