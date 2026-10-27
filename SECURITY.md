# Security policy

## Supported versions

Only the latest release published to the Chrome Web Store and Microsoft Edge Add-ons is supported.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository:
https://github.com/jgentes/soundcloud-shortcuts/security/advisories/new

Do not open a public issue for security problems. You can expect an acknowledgement within a few days.

## Scope

The extension runs only on `https://soundcloud.com/*`, makes no network requests other than the waveform and artwork files SoundCloud itself serves for the current track, and stores only user settings and the current track in browser extension storage. Reports about data leaving the browser, code execution outside the SoundCloud page, or privilege escalation through the extension's permissions are especially welcome.
