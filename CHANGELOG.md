# Changelog

All notable changes to Lexbox are listed here. Versions follow
[semantic versioning](https://semver.org/); the release steps are in `RELEASE.md`.

## 1.0.0 — 2026-10-08

First public release.

### Saving words
- Save a selected English word or phrase (up to 100 characters) with the "+"
  button next to the selection, the Alt+S shortcut, or "Add to Lexbox" in the
  context menu.
- The save card translates from English into Russian with Chrome's built-in
  on-device Translator API (Chrome 138+). The translation can be edited or typed
  by hand, which is also how it works in older Chrome versions.
- When the language pack has not been downloaded yet and the card was opened
  without a click (shortcut, context menu), a "Download translator" button
  starts the download.
- The sentence around the selection is saved as context, with the page URL and
  title. Saving a word that is already in the dictionary adds the new context to
  it; saving another form of a saved word ("found" next to "find") offers to keep
  it as a separate word.

### Highlighting
- Saved words and phrases are highlighted softly on every page, including their
  inflected forms ("ran" for "run", "putting up with" for "put up with").
- Hovering a highlight shows the translation.
- Highlighting keeps up with text that loads or changes after the page opens.

### Popup
- Turn highlighting on or off, or disable it on the current site.
- Word count, the five most recent words, and "Open dictionary".
- On a tab opened before Lexbox was installed, a hint to reload the page; on
  pages where extensions cannot run, "Not available on this page".

### Dictionary page
- Search by word or translation, edit translations, delete words.
- Every saved context with a link back to its page.
- JSON backup export and import (import merges into the current dictionary).
- CSV export (text, translation, sentence) for Anki or a spreadsheet.
- Settings: show or hide the floating "+" button, manage the sites where
  highlighting is off (a site also covers its subdomains).

### General
- UI in English and Russian.
- All data stays on the device in `chrome.storage.local`; no network requests,
  no analytics, no account.
