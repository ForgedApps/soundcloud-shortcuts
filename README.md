# Shortcuts for SoundCloud

Keyboard shortcuts for [soundcloud.com](https://soundcloud.com) that work from any tab, built as a Manifest V3 extension for Chrome and Microsoft Edge.

An independent project by [ForgedApps](https://github.com/ForgedApps). Not affiliated with or endorsed by SoundCloud.

## Shortcuts

| Action | Default |
|---|---|
| Play / pause | `Alt+Shift+P` |
| Next track | `Alt+Shift+.` |
| Previous track | `Alt+Shift+,` |
| Like / unlike | `Alt+Shift+L` |
| Repost, seek forward/back, volume up/down, mute, shuffle, repeat, switch to the SoundCloud tab | unbound |

Remap or bind any of them at `chrome://extensions/shortcuts` or `edge://extensions/shortcuts`. Browsers allow four default bindings per extension, so the rest start unbound. On macOS use `Option` in place of `Alt`.

Settings (toolbar icon → options): which SoundCloud tab receives commands when several are open, seek step, open soundcloud.com if no tab exists, error badge.

## Privacy

No data is collected or sent anywhere. The extension only talks to the soundcloud.com tab in your browser. Permissions: `scripting` (to reach the player if the page loaded before the extension), `storage` (your settings), and access to `https://soundcloud.com/*`.

## Development

```bash
pnpm install
pnpm dev          # Chrome with hot reload
pnpm dev:edge
pnpm test
pnpm build && pnpm build:edge
pnpm zip && pnpm zip:edge   # store-ready zips in .output/
```

Load unpacked from `.output/chrome-mv3` or `.output/edge-mv3`.

All SoundCloud DOM selectors live in [`src/lib/player-adapter.ts`](src/lib/player-adapter.ts). Each control tries the player's buttons first and falls back to the keyboard shortcut soundcloud.com handles itself.

Icons are generated from `scripts/icon.svg` with `node scripts/make-icons.mjs`.

## Roadmap

See [PLAN.md](PLAN.md). Next: a now-playing toolbar popup with a seekable waveform and a notification on track change.

## License

MIT © ForgedApps LLC
