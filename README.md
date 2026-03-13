# PDF Translator — Spanish to English

A browser-based PDF viewer with on-the-fly Spanish-to-English translation. Select any word or phrase in a PDF and get an instant translation tooltip. Everything runs locally in your browser — no server, no API keys, complete privacy.

Powered by [TranslateGemma](https://huggingface.co/onnx-community/translategemma-text-4b-it-ONNX) (4B parameters, q4 quantized) running via [transformers.js](https://github.com/huggingface/transformers.js) and WebGPU.

## Requirements

- **Chrome 113+** or **Edge 113+** (WebGPU required)
- ~3.1 GB of storage for the model (cached in-browser after first download)
- A GPU supported by WebGPU

## Usage

**Hosted version:** https://boffbowsh.github.io/pdf-translator/

**Run locally:**

```sh
./serve.sh
# Opens HTTPS server at https://localhost:8080
# (Accept the self-signed certificate warning on first visit)
```

1. Click **Download Model** (~3.1 GB, one-time download — cached for future visits)
2. Once loaded, click **Open PDF** and pick a Spanish PDF
3. Select any word or phrase — a tooltip appears with the English translation
4. Use the zoom controls in the toolbar to adjust the view

## How It Works

- **pdf.js** renders the PDF with a transparent text layer overlay, making text selectable
- On text selection, the selected text is sent to a **Web Worker** running the TranslateGemma model
- The model runs entirely in-browser via **WebGPU** — no network requests after initial model download
- Translations are cached in an **LRU cache** (8 MB) for instant repeat lookups
- The model itself is cached in the browser's Cache API, so reloads skip the download

## Local Development

The app is plain HTML/CSS/JS with no build step. `serve.sh` starts a local HTTPS server (required for WebGPU) using Python and a self-signed certificate.

## License

Apache License 2.0 — see [LICENSE](LICENSE)
