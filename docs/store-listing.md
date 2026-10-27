# Store listing copy

## Name
Shortcuts for SoundCloud

## Summary (132 chars max, Chrome)
Play, pause, skip, seek, like and control volume on SoundCloud from any tab. Remap every key in your browser's shortcut settings.

## Description
Keyboard shortcuts for soundcloud.com that work no matter which tab you are on.

Defaults: Alt+Shift+P play/pause, Alt+Shift+. next, Alt+Shift+, previous, Alt+Shift+L like. Repost, seek, volume, mute, shuffle and repeat are available to bind as well. Change any shortcut at chrome://extensions/shortcuts (Edge: edge://extensions/shortcuts).

When several SoundCloud tabs are open, the one that is playing gets the command. Optional: open soundcloud.com automatically when no tab exists.

No data collection, no accounts, no external servers. Open source (MIT): https://github.com/ForgedApps/soundcloud-shortcuts

Independent project, not affiliated with SoundCloud.

## Category
Chrome: Productivity → Tools. Edge: Productivity.

## Single purpose
Provide keyboard shortcuts that control the soundcloud.com player.

## Permission justifications
- `scripting`: inject the control script into a soundcloud.com tab that was opened before the extension was installed or updated, so shortcuts work without a reload.
- `storage`: save the user's settings (tab targeting, seek step, toggles) and sync them across their browsers.
- Host `https://soundcloud.com/*`: find the SoundCloud tab and click the player's controls. No other sites are accessed.

## Data usage disclosure
Does not collect or transmit any user data.

## Privacy policy (host at forgedapps.github.io/docs/soundcloud-shortcuts/privacy)
Shortcuts for SoundCloud does not collect, store, or transmit any personal data. All functionality runs locally in your browser. Settings are stored using the browser's extension storage and, if you are signed in to your browser, synced by the browser between your devices. The extension makes no network requests of its own. Contact: via GitHub issues at https://github.com/ForgedApps/soundcloud-shortcuts.

## Assets needed
- Icon 128×128 (Chrome), 300×300 (Edge): `public/icon/`
- Screenshots 1280×800: shortcut settings page with bindings, options page, player responding
- Chrome small promo tile 440×280
