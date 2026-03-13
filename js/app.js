// Main application: PDF viewer setup, hover/selection translation
import * as pdfjsLib from "pdfjs-dist";
import { EventBus, PDFViewer, PDFLinkService } from "pdfjs-dist/web/pdf_viewer.mjs";
import * as translator from "./translator.js";
import * as tooltip from "./tooltip.js";

// --- PDF.js setup ---
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

const viewerContainer = document.getElementById("viewerContainer");
const eventBus = new EventBus();
const linkService = new PDFLinkService({ eventBus });

const pdfViewer = new PDFViewer({
  container: viewerContainer,
  eventBus,
  linkService,
});
linkService.setViewer(pdfViewer);

eventBus.on("pagesinit", () => {
  pdfViewer.currentScaleValue = "page-width";
});

// --- Loading screen ---
const loadingScreen = document.getElementById("loadingScreen");
const viewerSection = document.getElementById("viewerSection");
const downloadBtn = document.getElementById("downloadBtn");
const progressBar = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const statusText = document.getElementById("statusText");
const webgpuError = document.getElementById("webgpuError");
const fileInput = document.getElementById("fileInput");
const pickFileBtn = document.getElementById("pickFileBtn");

// Check WebGPU — only test for API presence; adapter details
// are validated when the model actually loads.
if (!navigator.gpu) {
  webgpuError.style.display = "block";
  downloadBtn.disabled = true;
}

async function loadModel() {
  downloadBtn.disabled = true;
  downloadBtn.style.display = "none";
  statusText.textContent = "Loading model...";
  progressBar.parentElement.style.display = "block";

  try {
    await translator.init((progress) => {
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `${Math.round(progress)}%`;
    });

    statusText.textContent = "Model ready!";
    setTimeout(() => {
      loadingScreen.style.display = "none";
      viewerSection.style.display = "flex";
    }, 500);
  } catch (err) {
    statusText.textContent = `Error: ${err.message}`;
    downloadBtn.style.display = "";
    downloadBtn.disabled = false;
  }
}

downloadBtn.addEventListener("click", loadModel);

// Auto-load if model is already cached
async function checkCached() {
  try {
    const cache = await caches.open("transformers-cache");
    const keys = await cache.keys();
    const hasCached = keys.some((r) => r.url.includes("translategemma"));
    if (hasCached) loadModel();
  } catch {
    // Cache API unavailable — user clicks manually
  }
}
if (navigator.gpu) checkCached();

// --- Zoom controls ---
const ZOOM_PRESETS = ["page-width", "page-fit", 0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const zoomIn = document.getElementById("zoomIn");
const zoomOut = document.getElementById("zoomOut");
const zoomSelect = document.getElementById("zoomSelect");

function updateZoomSelect() {
  const val = pdfViewer.currentScaleValue;
  // Check if it matches a named preset
  if (val === "page-width" || val === "page-fit") {
    zoomSelect.value = val;
  } else {
    // Find closest numeric match or show custom
    const scale = pdfViewer.currentScale;
    const match = ZOOM_PRESETS.find((p) => typeof p === "number" && Math.abs(p - scale) < 0.01);
    zoomSelect.value = match != null ? String(match) : "";
  }
}

zoomSelect.addEventListener("change", () => {
  const val = zoomSelect.value;
  if (val === "page-width" || val === "page-fit") {
    pdfViewer.currentScaleValue = val;
  } else {
    pdfViewer.currentScaleValue = String(parseFloat(val));
  }
});

zoomIn.addEventListener("click", () => {
  const scale = pdfViewer.currentScale;
  const next = ZOOM_PRESETS.find((p) => typeof p === "number" && p > scale + 0.01);
  pdfViewer.currentScaleValue = String(next ?? Math.min(scale * 1.25, 5));
});

zoomOut.addEventListener("click", () => {
  const scale = pdfViewer.currentScale;
  const prev = [...ZOOM_PRESETS].reverse().find((p) => typeof p === "number" && p < scale - 0.01);
  pdfViewer.currentScaleValue = String(prev ?? Math.max(scale / 1.25, 0.25));
});

eventBus.on("scalechanging", () => updateZoomSelect());

// --- Sidebar (page thumbnails) ---
const sidebar = document.getElementById("sidebar");
const thumbnailView = document.getElementById("thumbnailView");
const toggleSidebar = document.getElementById("toggleSidebar");

toggleSidebar.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

const THUMB_WIDTH = 150;

async function renderThumbnails(pdfDoc) {
  thumbnailView.innerHTML = "";
  const numPages = pdfDoc.numPages;

  toggleSidebar.style.display = "";
  sidebar.classList.add("open");

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const scale = THUMB_WIDTH / viewport.width;
    const thumbViewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = thumbViewport.width;
    canvas.height = thumbViewport.height;

    const ctx = canvas.getContext("2d");
    await page.render({ canvasContext: ctx, viewport: thumbViewport }).promise;

    const wrapper = document.createElement("div");
    wrapper.className = "thumb-item";
    wrapper.addEventListener("click", () => {
      pdfViewer.currentPageNumber = i;
    });

    const label = document.createElement("span");
    label.className = "thumb-label";
    label.textContent = i;

    wrapper.appendChild(canvas);
    wrapper.appendChild(label);
    thumbnailView.appendChild(wrapper);
  }
}

// --- File loading ---
pickFileBtn.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;

  pdfViewer.setDocument(pdfDocument);
  linkService.setDocument(pdfDocument, null);
  renderThumbnails(pdfDocument);
});

// --- Selection → translate ---
viewerContainer.addEventListener("mouseup", () => {
  setTimeout(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text) return;

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    translateAndShow(text, rect);
  }, 50);
});

// Hide tooltip when clicking without a selection
document.addEventListener("mousedown", () => {
  tooltip.hide();
});

// --- Helpers ---
async function translateAndShow(text, rect) {
  tooltip.cancelHide();
  tooltip.showLoading(text, rect);

  try {
    const translation = await translator.translate(text);
    tooltip.showTranslation(text, translation, rect);
  } catch {
    tooltip.hide();
  }
}

function getWordAtPoint(x, y) {
  const range = document.caretRangeFromPoint(x, y);
  if (!range) return null;

  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return null;

  const text = node.textContent;
  const offset = range.startOffset;

  // Expand to word boundaries
  let start = offset;
  let end = offset;

  while (start > 0 && /\S/.test(text[start - 1])) start--;
  while (end < text.length && /\S/.test(text[end])) end++;

  const word = text.slice(start, end).trim();
  if (!word) return null;

  // Get bounding rect for the word
  const wordRange = document.createRange();
  wordRange.setStart(node, start);
  wordRange.setEnd(node, end);
  const rect = wordRange.getBoundingClientRect();

  return { text: word, rect };
}

function getSiblingSpans(span, count) {
  const spans = [span];
  let el = span;
  for (let i = 0; i < count; i++) {
    el = el.nextElementSibling;
    if (el) spans.push(el);
  }
  el = span;
  for (let i = 0; i < count; i++) {
    el = el.previousElementSibling;
    if (el) spans.push(el);
  }
  return spans;
}
