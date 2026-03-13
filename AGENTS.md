# PDF Translator — Agent Guide

## Overview

A static web app (no build step) that renders Spanish PDFs and translates selected text to English using TranslateGemma running client-side via WebGPU.

## File Structure

```
index.html                     App shell, import map, layout
css/style.css                  All styles: loading screen, viewer, tooltip, zoom controls
js/
  app.js                       Main entry: PDF viewer setup, selection handling, zoom, model loading
  translator.js                Main-thread wrapper: manages Web Worker, Promise-based API, cache
  translation-worker.js        Web Worker: loads TranslateGemma via transformers.js, runs inference
  cache.js                     LRU cache (8MB, Map-based) for translation results
  tooltip.js                   Translation tooltip: positioning, show/hide, loading state
serve.sh                       Local HTTPS dev server (python3 + self-signed cert)
.github/workflows/pages.yml   GitHub Pages deployment
```

## Architecture

- **No build step** — plain ES modules loaded via import maps (`index.html` lines 13-20)
- **CDN dependencies only** — pdfjs-dist@4.10.38 and @huggingface/transformers@4.0.0-next.3 loaded from jsdelivr
- The Web Worker (`translation-worker.js`) imports transformers.js via full CDN URL since workers can't use import maps
- Translation flow: `app.js` (selection event) → `translator.js` (cache check + worker dispatch) → `translation-worker.js` (model inference) → result cached and displayed in tooltip

## Key Conventions

- All translation goes through `translator.js` — never call the worker directly
- The translation worker uses the TranslateGemma message format with `source_lang_code: "es"` and `target_lang_code: "en"`
- Cache keys are normalized (lowercase, trimmed) in `cache.js`
- Tooltip positioning auto-flips above/below and clamps to viewport edges
- WebGPU is required — the app checks for `navigator.gpu` and shows an error if missing
- HTTPS is required for WebGPU — `serve.sh` generates a self-signed cert for local dev

## Development

```sh
./serve.sh                    # HTTPS on localhost:8080
```

No tests currently. To verify changes: load the app, download/load the model, open a Spanish PDF, select text, confirm tooltip appears with translation.

## Deployment

Push to `main` — GitHub Actions (`.github/workflows/pages.yml`) deploys to GitHub Pages automatically.
