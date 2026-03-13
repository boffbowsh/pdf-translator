// Web Worker: loads TranslateGemma model, runs inference
// Workers can't use import maps, so we use the full CDN URL
import { pipeline } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.0.0-next.3/dist/transformers.min.js";

const MODEL_ID = "onnx-community/translategemma-text-4b-it-ONNX";
const MODEL_SIZE = 3111894696;

let pipe = null;

async function initModel() {
  const loaded = new Map();

  pipe = await pipeline("text-generation", MODEL_ID, {
    progress_callback: (e) => {
      if (e.status === "progress") {
        loaded.set(e.file, e.loaded);
        const allLoaded = Array.from(loaded.values()).reduce((acc, curr) => acc + curr, 0);
        const percent = Math.round((100 / MODEL_SIZE) * allLoaded * 100) / 100;
        self.postMessage({ type: "init-progress", progress: Math.min(percent, 100) });
      }
    },
    device: "webgpu",
    dtype: "q4",
  });

  self.postMessage({ type: "init-complete" });
}

async function translate(id, text) {
  const messages = [
    {
      role: "user",
      content: [
        {
          type: "text",
          source_lang_code: "es",
          target_lang_code: "en",
          text,
        },
      ],
    },
  ];

  const output = await pipe(messages, { max_new_tokens: 1024 });
  const translation = output[0].generated_text.pop().content;

  self.postMessage({ type: "translation-result", id, text, translation });
}

self.onmessage = async (e) => {
  const { type, id, text } = e.data;

  if (type === "init") {
    try {
      await initModel();
    } catch (err) {
      self.postMessage({ type: "init-error", error: err.message });
    }
  } else if (type === "translate") {
    try {
      await translate(id, text);
    } catch (err) {
      self.postMessage({ type: "translation-error", id, error: err.message });
    }
  }
};
