# TensAI Browser Extension

Cross-browser extension (Chrome, Edge, Firefox) providing translation, summarization, WebGPT, Media generation, and OmniQuest helpers.

## Load in Chrome/Edge
1. Build or use source directly.
2. Chrome: open chrome://extensions (Edge: edge://extensions).
3. Enable Developer mode.
4. Click "Load unpacked" and select the `TensAI_Browser_Extension` folder (or `dist/chrome`). Ensure icons exist at `assets/icons/icon-{16,32,48,128}.png`.
5. Click the TensAI icon, then open Settings to add your API key and base URL.

## Load in Firefox
1. Open about:debugging#/runtime/this-firefox
2. Click "Load Temporary Add-on" and select `manifest-firefox.json` (or the `dist/firefox` folder).
3. Open the extension options and configure API key and base URL.

## Build and Package (optional)
```bash
cd TensAI_Browser_Extension
npm install
npm run package
```
Zips will be in the project root as `tensai-*.zip`.

## Permissions
- activeTab, storage, contextMenus, tabs, scripting, notifications

## Notes
- Add PNG icons at `assets/icons/icon-{16,32,48,128}.png`.
- Set API key in Options.
- Host permissions include `https://dev2.tens-ai.com/*`.

### Creating placeholder icons (macOS)
```bash
cd TensAI_Browser_Extension
mkdir -p assets/icons
for s in 16 32 48 128; do
  convert -size ${s}x${s} canvas:'#667eea' \
    -gravity center -fill white -pointsize $((s/2)) \
    -annotate +0+0 'T' assets/icons/icon-$s.png;
done
```


