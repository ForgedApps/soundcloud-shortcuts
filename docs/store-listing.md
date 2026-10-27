# Store listing and submission

Everything needed to publish to the Chrome Web Store and Microsoft Edge Add-ons. Copy the text blocks below into the dashboards verbatim.

## Packages

Tagging `vX.Y.Z` (matching `package.json`) builds and attaches both zips to a GitHub release:

- `soundcloud-shortcuts-X.Y.Z-chrome.zip` → Chrome Web Store
- `soundcloud-shortcuts-X.Y.Z-edge.zip` → Edge Add-ons

Or locally: `pnpm zip && pnpm zip:edge` (output in `.output/`).

## Assets (in `docs/store-assets/`, regenerate with `node scripts/store-assets.mjs`)

| File | Use |
|---|---|
| `icon-300.png` | Edge store logo (300×300) |
| `public/icon/128.png` | Chrome store icon (128×128) |
| `screenshot-1-shortcuts.png` … `screenshot-4-options.png` | Screenshots, 1280×800, both stores |
| `promo-tile-440x280.png` | Chrome small promo tile |
| `marquee-1400x560.jpg` | Chrome marquee promo tile |

Screenshots use fictional track names and generated artwork, no third-party material.

## Listing text

### Name
Shortcuts for SoundCloud

### Short description (Chrome: 132 chars max; Edge: 250)
Keyboard shortcuts for SoundCloud from any tab, plus a now-playing panel with a seekable waveform and new-track notifications.

### Description
Keyboard shortcuts for soundcloud.com that work no matter which tab you are on, plus a compact now-playing panel.

SHORTCUTS
Defaults: Alt+Shift+P play/pause, Alt+Shift+. next, Alt+Shift+, previous, Alt+Shift+L like. Seek, volume, mute, repost, shuffle, repeat and "switch to the SoundCloud tab" can be bound too. Change any shortcut at chrome://extensions/shortcuts (Edge: edge://extensions/shortcuts). On macOS use Option instead of Alt.

NOW PLAYING
Click the toolbar icon for a panel with artwork, title, artist, play/pause, previous/next, like, repost, mute, and a waveform you can click to seek. The icon shows play/pause state. When a new track starts you can get a system notification with Next and Like buttons, or have the panel open itself for a few seconds.

When several SoundCloud tabs are open, the one that is playing gets the command.

PRIVACY
No data collection, no accounts, no analytics, no servers. The extension only talks to the soundcloud.com tab in your browser. Open source (MIT): https://github.com/jgentes/soundcloud-shortcuts

Independent project, not affiliated with or endorsed by SoundCloud.

### Category
Chrome: Productivity → Tools. Edge: Productivity.

### Language
English

### Links
- Homepage / support: https://github.com/jgentes/soundcloud-shortcuts
- Support (issues): https://github.com/jgentes/soundcloud-shortcuts/issues
- Privacy policy: https://github.com/jgentes/soundcloud-shortcuts/blob/main/PRIVACY.md

## Chrome Web Store: Privacy practices tab

**Single purpose**
Control and display the soundcloud.com player from the browser toolbar and keyboard.

**Permission justifications**
- `scripting`: inject the control script into a soundcloud.com tab that was already open when the extension was installed or updated, so shortcuts and the panel work without reloading the page.
- `storage`: save the user's settings (synced by the browser) and keep the currently playing track in session storage for the panel and notifications.
- `notifications`: show an optional notification with the track's artwork, title and artist when a new track starts, with Next and Like buttons.
- Host permission `https://soundcloud.com/*`: find the SoundCloud tab, read the player bar (track, position, like state) and click the player's own controls. No other sites are accessed.

**Remote code**: No, the extension does not use remote code.

**Data usage**: tick nothing under "What user data do you plan to collect?". Certify all three disclosures (not sold, not used for unrelated purposes, not used for creditworthiness).

## Edge Partner Center: Properties

- Privacy policy URL: https://github.com/jgentes/soundcloud-shortcuts/blob/main/PRIVACY.md
- Website: https://github.com/jgentes/soundcloud-shortcuts
- Support contact: https://github.com/jgentes/soundcloud-shortcuts/issues
- Mature content: No. Does the extension collect personal information: No.
- Notes for certification: "Keyboard shortcuts and a now-playing panel for soundcloud.com. To test: open https://soundcloud.com, play any public track, press Alt+Shift+P from another tab, then click the toolbar icon. No account required. Source: github.com/jgentes/soundcloud-shortcuts"

## Submission checklist

1. Accounts (one-time, one-time, personal jgentes account):
   - Chrome Web Store developer account: https://chrome.google.com/webstore/devconsole ($5, needs a Google account with 2-step verification; set publisher name "James Gentes", verify the contact email).
   - Microsoft Partner Center, Edge Add-ons program: https://partner.microsoft.com/dashboard/microsoftedge (free).
2. Download the zips from the GitHub release for the tag being published.
3. Chrome: New item → upload the chrome zip → fill Store listing (text, icon, screenshots, promo tile), Privacy practices (above), Distribution: public, all regions → Submit for review. Review usually takes 1–3 days.
4. Edge: Create new extension → upload the edge zip → Properties (above) → Store listings (English: text, 300×300 logo, screenshots) → Submit. Review up to 7 business days.
5. After approval, add the store links to `README.md` and the repo description.

## Updates

Bump `version` in `package.json`, commit, tag `vX.Y.Z`, push the tag, then upload the new zips to both dashboards. Both stores accept the same listing text; only the package changes.
