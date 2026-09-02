# AI Translate

A desktop translation app that runs silently in the background. Press a global hotkey to capture your screen, send the image to Gemini, and view a structured translation in a sleek popup.

## Features

- **Global hotkeys** — translate instantly from anywhere
- **Full-screen or region capture** — drag to select a specific area
- **Gemini 2.5 Flash** — multimodal translation directly from screenshots (no separate OCR step)
- **Structured output** — translation, example sentence, context explanation, and dictionary link
- **Modern popup UI** — frameless, transparent, rounded corners; dismiss with Esc or click outside

## Hotkeys

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+T` | Capture full screen and translate |
| `Ctrl+Shift+R` | Drag to select a region, then translate |
| `Esc` | Close popup or cancel region selection |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Set your Gemini API key

Copy the example env file and add your key:

```bash
copy .env.example .env
```

Edit `.env` and set:

```
GEMINI_API_KEY=your_actual_api_key_here
```

Get a key from [Google AI Studio](https://aistudio.google.com/apikey).

### 3. Run the app

**Development** (Vite dev server + Electron with hot reload):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

When you launch AI Translate, it opens as a normal desktop app with your logo in the **taskbar**. Click the taskbar icon to bring the window back if minimized. Global hotkeys still work while the app is running.

Closing the window quits the app.

**Build a Windows installer:**

```bash
npm run pack
```

## Project Structure

```
AI_Translate/
├── electron/
│   ├── main.js       # Main process: hotkeys, windows, IPC
│   ├── preload.js    # Secure bridge between main and renderer
│   ├── capture.js    # Screen capture via desktopCapturer
│   └── gemini.js     # Gemini API with structured JSON schema
├── src/
│   ├── popup.html    # Translation popup entry
│   ├── region.html   # Region selector entry
│   ├── App.jsx       # Popup React UI
│   ├── RegionSelector.jsx
│   └── styles.css
├── package.json
└── vite.config.js
```

## Architecture

- **Main process** — registers global shortcuts, captures the screen, calls Gemini, manages popup/region windows
- **Renderer process** — React UI for loading state, results, and Cambridge Dictionary link
- **IPC** — `preload.js` exposes a safe `window.electronAPI` to the renderer

Gemini returns JSON matching this schema:

```json
{
  "translation": "...",
  "example_sentence": "...",
  "context_explanation": "...",
  "base_word": "..."
}
```

The Cambridge Dictionary URL is built as:

`https://dictionary.cambridge.org/dictionary/english/{base_word}`

## Requirements

- Node.js 18+
- Windows, macOS, or Linux
- A Gemini API key with access to `gemini-2.5-flash`

## Troubleshooting

- **"GEMINI_API_KEY is not set"** — ensure `.env` exists in the project root with a valid key
- **Hotkey not working** — another app may be using the same shortcut; quit conflicting apps or change the hotkeys in `electron/main.js`
- **Blank capture** — on some systems, grant screen recording permission to the app (macOS System Settings → Privacy)
