// Translation tooltip: positioning, show/hide
const tooltip = document.createElement("div");
tooltip.className = "translation-tooltip";
tooltip.innerHTML = `
  <div class="tooltip-original"></div>
  <div class="tooltip-translation"></div>
`;
document.body.appendChild(tooltip);

const originalEl = tooltip.querySelector(".tooltip-original");
const translationEl = tooltip.querySelector(".tooltip-translation");

let hideTimer = null;
let visible = false;

// Keep tooltip visible when mouse enters it
tooltip.addEventListener("mouseenter", () => {
  clearTimeout(hideTimer);
});
tooltip.addEventListener("mouseleave", () => {
  hide();
});

export function showLoading(originalText, rect) {
  originalEl.textContent = originalText;
  translationEl.innerHTML = '<span class="loading-dots">Translating<span>.</span><span>.</span><span>.</span></span>';
  position(rect);
  tooltip.classList.add("visible");
  visible = true;
}

export function showTranslation(originalText, translation, rect) {
  originalEl.textContent = originalText;
  translationEl.textContent = translation;
  position(rect);
  tooltip.classList.add("visible");
  visible = true;
}

export function hide() {
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    tooltip.classList.remove("visible");
    visible = false;
  }, 100);
}

export function cancelHide() {
  clearTimeout(hideTimer);
}

export function isVisible() {
  return visible;
}

function position(rect) {
  const gap = 8;
  tooltip.style.left = "0";
  tooltip.style.top = "0";
  tooltip.style.display = "block";

  const tw = tooltip.offsetWidth;
  const th = tooltip.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Center horizontally above the target
  let left = rect.left + rect.width / 2 - tw / 2;
  let top = rect.top - th - gap;
  let above = true;

  // Flip below if near top
  if (top < gap) {
    top = rect.bottom + gap;
    above = false;
  }

  // Clamp to viewport edges
  left = Math.max(gap, Math.min(left, vw - tw - gap));
  top = Math.max(gap, Math.min(top, vh - th - gap));

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;
  tooltip.classList.toggle("below", !above);
}
