# Conflict of Nations Game Filter

A browser extension for filtering the Conflict of Nations game list by the values shown on each game card.

## What it does

- Hides game cards that do not meet your filters.
- Supports both Chrome and Firefox from the same codebase.
- Keeps working as new cards load while you scroll.
- Stores your saved filter values locally or in sync storage when available.

## Filter rules

- `Speed` is a minimum threshold.
- `Days running` is a minimum threshold.
- `Player fill` is a maximum threshold, expressed as a percentage.

Example: if `Player fill` is set to `40`, games at `40%` occupied or lower stay visible.

## Installation

### Chrome

For local development or unpacked loading from the repo:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked and choose the repository root folder.

For release builds:

1. Download the Chrome build from `dist/packages/conflict-of-nations-filter-chrome.zip`.
2. Unzip it.
3. Load the unzipped `dist/chrome` folder.

### Firefox

1. Download the Firefox build from `dist/packages/conflict-of-nations-filter-firefox.xpi`.
2. Open `about:debugging#/runtime/this-firefox`.
3. Click Load Temporary Add-on.
4. Select the `.xpi` file.

## Development

Prerequisites:

- Node.js 18 or newer
- `zip`

Commands:

```bash
npm test
npm run build
```

The build script produces:

- `dist/chrome/`
- `dist/firefox/`
- `dist/packages/conflict-of-nations-filter-chrome.zip`
- `dist/packages/conflict-of-nations-filter-firefox.xpi`

## Privacy

- The extension does not send your filter values to any external service.
- Filter settings are stored in browser storage only.
- It only reads the game list page so it can hide or show cards locally.

## Repository notes

- No sample game HTML is committed to the repository.
- The filtering logic is covered by Node.js tests in `tests/filtering.test.mjs`.
