# AI Translate

A desktop translation app built with **Electron + React**. It runs in the background and lets you translate text from your screen using **Google Gemini** — no separate OCR step required. Press a global hotkey, and a popup near your cursor shows results in one of two layouts: a **dictionary-style view** for single words, or a **source + translation card view** for sentences and paragraphs.

---

## Table of Contents

- [How It Works (Overview)](#how-it-works-overview)
- [Translation Workflows](#translation-workflows)
  - [1. Full-Screen Translate](#1-full-screen-translate)
  - [2. Region Translate](#2-region-translate)
  - [3. Selection Translate](#3-selection-translate)
- [Result Popup](#result-popup)
  - [Word Layout (single word)](#word-layout-single-word)
  - [Phrase Layout (sentence / paragraph)](#phrase-layout-sentence--paragraph)
- [Pronunciation & Audio](#pronunciation--audio)
- [Model Fallback](#model-fallback)
- [Background Mode & System Tray](#background-mode--system-tray)
- [Settings](#settings)
- [Hotkeys](#hotkeys)
- [Setup](#setup)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Gemini Output Schema](#gemini-output-schema)
- [Requirements](#requirements)
- [Troubleshooting](#troubleshooting)

---

## How It Works (Overview)

At a high level, every translation follows the same pipeline:

```
You press a hotkey
       ↓
Main process captures input (screenshot or selected text)
       ↓
Popup opens near your cursor (loading state)
       ↓
Gemini API returns structured JSON (translation, examples, context…)
       ↓
App picks layout: single word OR sentence/paragraph
       ↓
Enrichment: IPA + audio (word) OR TTS for both texts (phrase)
       ↓
Popup shows the final result
       ↓
You close the popup with the × button when done
```

The app has **two processes**:

| Process | Role |
|---------|------|
| **Main process** (`electron/`) | Hotkeys, screen capture, clipboard, Gemini API calls, pronunciation fetching, window management |
| **Renderer process** (`src/`) | React UI — main window, result popup, region selector, settings |

They communicate through **IPC** via a secure bridge in `electron/preload.js` (`window.electronAPI`).

---

## Translation Workflows

### 1. Full-Screen Translate

**Hotkey:** `Ctrl+Shift+T` (customizable in Settings)

**Step-by-step:**

1. You press `Ctrl+Shift+T` (or click **Translate Screen** in the app / tray menu).
2. The main window hides briefly so it does not appear in the capture.
3. A **popup window** opens near your cursor and shows *"Capturing screen…"*.
4. The main process takes a **full-screen screenshot** via Electron's `desktopCapturer`.
5. The screenshot is sent to **Gemini** as a PNG image with a structured JSON schema.
6. Gemini reads the visible text in the image and returns translation data.
7. If the result is a **single word**, IPA and pronunciation audio are loaded. If it is a **sentence or paragraph**, TTS audio is loaded for source and translation.
8. The popup updates with the full result.

```
Ctrl+Shift+T
    → hide main window
    → open popup (loading)
    → capture full screen
    → Gemini translateScreenshot()
    → resolveLayoutMode()
    → enrichWithPronunciation() OR enrichPhraseResult()
    → show result in popup
```

---

### 2. Region Translate

**Hotkey:** `Ctrl+Shift+R` (customizable)

**Step-by-step:**

1. You press `Ctrl+Shift+R` (or click **Select Region**).
2. A **full-screen overlay** appears with a crosshair cursor.
3. You **click and drag** to draw a rectangle around the text you want.
4. On release, the overlay closes and the same pipeline as full-screen translate runs — but only the **selected region** is captured and sent to Gemini.
5. Press `Esc` while dragging to cancel.

```
Ctrl+Shift+R
    → open region selector overlay
    → user draws rectangle
    → capture region only
    → Gemini translateScreenshot(region)
    → resolveLayoutMode()
    → enrichWithPronunciation() OR enrichPhraseResult()
    → show result in popup
```

---

### 3. Selection Translate

**Hotkey:** `Ctrl+Shift+S` (customizable)

**Step-by-step:**

1. **Highlight text** in any app (browser, PDF, editor, etc.).
2. Press `Ctrl+Shift+S` (or click **Translate Selection**).
3. The app **hides its windows**, simulates `Ctrl+C` to copy your selection, and reads the clipboard.
4. It verifies the clipboard text actually changed (retries copy if needed).
5. The selected text is sent to Gemini as plain text (no screenshot).
6. Pronunciation or phrase audio is loaded based on layout mode.
7. The popup shows the final result in the appropriate layout.

```
Highlight text → Ctrl+Shift+S
    → hide app windows
    → simulate Ctrl+C, read clipboard
    → Gemini translateText(text)
    → resolveLayoutMode()
    → enrichWithPronunciation() OR enrichPhraseResult()
    → show result in popup
```

> **Tip:** Make sure text is selected before pressing the hotkey. If nothing is selected, the app shows an error in the popup.

---

## Result Popup

The popup is a frameless, dark-themed window that appears **near your cursor**. It automatically chooses one of two layouts based on how much text was captured or selected.

### Layout selection

The main process calls `resolveLayoutMode()` in `electron/pronunciation.js`:

| Condition | Layout | UI |
|-----------|--------|-----|
| Source text has **more than one word** | `phrase` | Two stacked cards (source + translation) |
| Source text is a **single word** | `word` | Dictionary-style detail view |

**Source text** is resolved from (in order):

1. `sourceText` — clipboard selection (selection translate)
2. `source_text` — returned by Gemini (screen / region translate)

### Word Layout (single word)

Used when you translate one word from a screenshot or selection.

| Section | Content |
|---------|---------|
| **Word header** | English headword, IPA phonetic, speaker button |
| **Part of speech + translation** | e.g. `n. 演算法` |
| **Example sentence** | Source-language example with the target word highlighted in pink |
| **Example translation** | Translation of the example sentence |
| **Context card** | General meaning + **"In this context"** usage notes for your specific capture |
| **Model badge** | Which Gemini model produced the result |

### Phrase Layout (sentence / paragraph)

Used when you translate a sentence, clause, or paragraph.

| Card | Content |
|------|---------|
| **Top card** | Original source text |
| **Bottom card** | Translation (bold) |

Each card has a footer with:

- **Speaker** — play TTS audio (preloaded in main process)
- **Copy** — copy that card's text to clipboard
- **Show all** (top card only) — expand truncated long source text

### Popup behavior

- **Move** — drag the top title bar
- **Resize** — drag any window edge (minimum 340×380)
- **Close** — click the **×** button (top right only; clicking outside does not close)
- **Copy / play audio** — use icons in the card footers (layout-dependent)

---

## Pronunciation & Audio

Enrichment runs in the **main process** (avoids CORS) and completes **before** the result is shown.

### Single word (`layoutMode: word`)

Triggered by `enrichWithPronunciation()`.

**Lookup word** is resolved from (in order):

1. `base_word` from Gemini
2. `sourceText` / `source_text`
3. First English word in the example sentence

**IPA sources** (in order):

1. `phonetic_ipa` from Gemini
2. [Wiktionary API](https://en.wiktionary.org/)

**Audio sources** (in order):

1. Dictionary API (if available)
2. Google Translate TTS → delivered as base64 `audioDataUrl`

Popup title bar shows *"Loading pronunciation…"* while this runs.

### Sentence / paragraph (`layoutMode: phrase`)

Triggered by `enrichPhraseResult()`.

| Field | Description |
|-------|-------------|
| `sourceAudioDataUrl` | TTS for source text (English, `tl=en`) |
| `translationAudioDataUrl` | TTS for translation (language from Settings → Target language) |

Google TTS is capped at 200 characters per request. Popup title bar shows *"Loading audio…"* while this runs.

---

## Model Fallback

Translation uses a **model chain** configured in Settings:

```
Primary model  →  Fallback 1  →  Fallback 2  →  …
```

**Default chain:**

| Role | Model |
|------|-------|
| Primary | `gemini-3.6-flash` |
| Fallback 1 | `gemini-3.5-flash` |
| Fallback 2 | `gemini-3.5-flash-lite` |

**Timeout behavior:** Each model gets **10 seconds**. If it does not respond in time, the app automatically tries the next model and updates the popup message (e.g. *"Timed out on gemini-3.6-flash, trying gemini-3.5-flash…"*).

If all models fail, the popup shows an error with details from each attempt.

---

## Background Mode & System Tray

AI Translate is designed to stay available while you work in other apps.

| Action | What happens |
|--------|--------------|
| **Launch app** | Main window opens; app icon appears in the taskbar and system tray |
| **Close main window (×)** | Window hides — app **keeps running** in the tray; hotkeys still work |
| **Tray double-click** or **Open AI Translate** | Brings the main window back |
| **Tray → Quit** | Fully exits the app |

Global hotkeys are registered at startup and re-registered whenever you save new hotkeys in Settings.

---

## Settings

Open **Settings** from the gear icon on the main window.

| Setting | Description |
|---------|-------------|
| **Target language** | Language Gemini translates into (default: English) |
| **Primary model** | First Gemini model to try |
| **Fallback models** | Ordered list of backup models; use **Scan models** to discover available models for your API key |
| **System prompt** | Custom instructions sent to Gemini; `{targetLanguage}` is replaced automatically |
| **Hotkeys** | Customize shortcuts for screen, region, and selection translate |

Settings are saved to:

```
%APPDATA%/ai-translate/settings.json   (Windows)
~/Library/Application Support/ai-translate/settings.json   (macOS)
~/.config/ai-translate/settings.json   (Linux)
```

**Hotkey recording:** Click **Set key** in Settings, then press your desired key combination. Press `Esc` to cancel. Each hotkey must include at least one modifier (`Ctrl`, `Alt`, or `Shift`) and must be unique across all three actions.

---

## Hotkeys

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Capture **full screen** and translate |
| `Ctrl+Shift+R` | **Select a region** and translate |
| `Ctrl+Shift+S` | Translate **highlighted text** (selection) |
| `Esc` | Cancel region selection |

All hotkeys can be changed in **Settings**.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set your Gemini API key

```bash
copy .env.example .env
```

Edit `.env`:

```
GEMINI_API_KEY=your_actual_api_key_here
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

### 3. Run the app

**Development** (Vite dev server + Electron with hot reload):

```bash
npm run dev
```

**Production:**

```bash
npm start
```

**Build a Windows installer:**

```bash
npm run pack
```

Output goes to the `release/` folder.

---

## Project Structure

```
AI_Translate/
├── electron/                  # Main process (Node.js)
│   ├── main.js                # App entry: hotkeys, windows, IPC, tray
│   ├── preload.js             # Secure IPC bridge (window.electronAPI)
│   ├── gemini.js              # Gemini API + structured JSON schema + model fallback
│   ├── capture.js             # Screen capture via desktopCapturer
│   ├── selection.js           # Clipboard-based text selection (simulates Ctrl+C)
│   ├── pronunciation.js       # Layout mode, IPA, word audio, phrase TTS
│   ├── settings.js            # Settings load/save/migrate
│   ├── models.js              # Gemini model list scanner
│   ├── hotkey-recorder.js     # Hotkey capture in Settings
│   └── hotkey-utils.js        # Hotkey validation and formatting
├── src/                       # Renderer process (React + Vite)
│   ├── main.jsx / MainApp.jsx # Main window UI
│   ├── App.jsx                # Translation result popup UI
│   ├── RegionSelector.jsx     # Region selection overlay
│   ├── Settings.jsx           # Settings page
│   ├── HotkeyInput.jsx        # Hotkey picker component
│   └── styles.css             # Shared styles
├── assets/logo.png            # App icon (taskbar, tray, installer)
├── .env.example               # API key template
├── package.json
└── vite.config.js
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     MAIN PROCESS (electron/)                 │
│                                                              │
│  globalShortcut ──→ startTranslation / startSelection       │
│         │                                                    │
│         ├── capture.js ──→ PNG screenshot                   │
│         ├── selection.js ──→ clipboard text                   │
│         │                                                    │
│         ├── gemini.js ──→ Gemini API (structured JSON)      │
│         │       └── 10s timeout → try next model            │
│         │                                                    │
│         ├── pronunciation.js                                │
│         │       ├── resolveLayoutMode() → word | phrase     │
│         │       ├── enrichWithPronunciation() → IPA + audio │
│         │       └── enrichPhraseResult() → phrase TTS       │
│         │                                                    │
│         └── IPC send ──→ popup window                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ preload.js (contextBridge)
┌──────────────────────────▼──────────────────────────────────┐
│                   RENDERER PROCESS (src/)                    │
│                                                              │
│  MainApp.jsx ── home screen + settings entry                 │
│  App.jsx ────── result popup                                 │
│       ├── WordResult ── single word (IPA, examples, context)│
│       └── PhraseResult ── source + translation cards         │
│  RegionSelector.jsx ── drag-to-select overlay                 │
│  Settings.jsx ── models, hotkeys, prompt, language           │
└─────────────────────────────────────────────────────────────┘
```

**IPC channels (main → popup):**

| Channel | Purpose |
|---------|---------|
| `translation:loading` | Update loading message |
| `translation:result` | Show final result (`layoutMode: word` or `phrase`) |
| `translation:error` | Show error message |

**IPC channels (renderer → main):**

| Channel | Purpose |
|---------|---------|
| `translate:screen` | Trigger full-screen translate |
| `translate:region` | Open region selector |
| `translate:selection` | Trigger selection translate |
| `popup:close` | Close result popup |
| `settings:save` | Save settings and re-register hotkeys |
| `hotkey:record` | Record a new hotkey in Settings |

---

## Gemini Output Schema

Gemini returns JSON matching this schema (defined in `electron/gemini.js`):

```json
{
  "translation": "演算法",
  "source_text": "algorithm",
  "example_sentence": "The algorithm helped solve the complex problem.",
  "example_translation": "這個演算法幫助解決了複雜的問題。",
  "context_explanation": "General meaning and typical usage…",
  "usage_in_context": "How this word is used in YOUR specific screenshot or selection…",
  "part_of_speech": "n.",
  "phonetic_ipa": "/ˈælɡəɹɪðəm/",
  "base_word": "algorithm"
}
```

For **selection translate**, `source_text` is also set from the clipboard in the main process (`sourceText`).

**Result payload sent to the popup** may include additional enriched fields:

| Field | When | Description |
|-------|------|-------------|
| `layoutMode` | Always | `"word"` or `"phrase"` |
| `phonetic` | Word layout | Normalized IPA string |
| `audioDataUrl` | Word layout | Base64 audio for pronunciation |
| `sourceAudioDataUrl` | Phrase layout | Base64 TTS for source text |
| `translationAudioDataUrl` | Phrase layout | Base64 TTS for translation |
| `modelUsed` | Always | Gemini model that succeeded |

The Cambridge Dictionary URL is built automatically:

```
https://dictionary.cambridge.org/dictionary/english/{base_word}
```

---

## Requirements

- **Node.js** 18+
- **Windows**, macOS, or Linux
- A **Gemini API key** with access to flash models (e.g. `gemini-3.6-flash`)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **"GEMINI_API_KEY is not set"** | Create `.env` in the project root with a valid `GEMINI_API_KEY` |
| **Hotkey not working** | Another app may use the same shortcut — change it in Settings, or quit conflicting apps |
| **Translation stuck / slow** | Add fallback models in Settings; each model times out after 10 seconds and switches automatically |
| **Selection translate copies wrong text** | Make sure text is highlighted before pressing the hotkey; the app copies selection before opening the popup |
| **No IPA or pronunciation** | Only on **word layout** for English headwords; phrase layout uses TTS instead |
| **Wrong popup layout** | One word → word layout; multiple words → phrase layout; depends on `source_text` / selection |
| **Phrase audio missing** | TTS is limited to 200 chars; very long text may not produce audio |
| **Blank screenshot** | Grant screen recording permission (macOS: System Settings → Privacy → Screen Recording) |
| **Model scan shows no models** | Check your API key; click **Scan models** again in Settings |

---

## License

MIT
