# 💎 Gemini Counter

A Chrome extension that shows your real **Google AI Pro** usage directly in the Gemini chat interface — inspired by and based on [claude-counter](https://github.com/she-llac/claude-counter) by [@she-llac](https://github.com/she-llac).

## Preview


## Features

- **● Live** — fetches real data from `gemini.google.com/usage` automatically
- Session (5h) and weekly usage bars shown below the chat input
- Color coded bars: 🔵 normal → 🟡 60% → 🔴 90%
- Auto-refreshes every 3 minutes + manual ↻ button
- Shows reset times for session and weekly limits
- Works on any Gemini page — no need to open the usage tab manually

## Installation

1. Download the latest ZIP from [Releases](../../releases) and unzip it
2. Go to `chrome://extensions`
3. Enable **Developer mode** (toggle top right)
4. Click **Load unpacked** → select the unzipped folder

## How it works

Opens `gemini.google.com/usage` in a hidden background tab, reads your real usage percentages from the rendered DOM, then closes the tab. Refreshes every 3 minutes automatically.

No external servers. No data sent anywhere. Everything stays in your browser.

## Compatibility

- ✅ Chrome, Edge, Brave (any Chromium-based browser)
- 🔑 Requires **Google AI Pro** plan

## Credits

Based on [claude-counter](https://github.com/she-llac/claude-counter) by [@she-llac](https://github.com/she-llac) — the original extension for tracking Claude usage.

## License

MIT
