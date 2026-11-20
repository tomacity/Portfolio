"use strict";

const portfolio = document.querySelector(".portfolio");
const homeLink = document.querySelector(".monogram");
const closeButton = document.querySelector(".close-folder");
const gallery = document.querySelector(".illustration-gallery");
const artworkPreview = document.querySelector("#artwork-preview");
const artworkStage = artworkPreview.querySelector(".artwork-preview-stage");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const artworkClose = artworkPreview.querySelector(".artwork-preview-close");
const folders = [...document.querySelectorAll("[data-folder]")].map((element) => ({
  element,
  name: element.dataset.folder,
  tab: element.querySelector(".folder-tab"),
  body: element.querySelector(".folder-body"),
  scrollArea: element.dataset.folder === "illustrations" ? element : element.querySelector(".folder-body"),
}));

let activeFolder = null;
let previewedArtwork = null;
let previewAnimation;

function updateScrollLayout() {
  const illustrationsOpen = activeFolder?.name === "illustrations";
  const tabHeight = illustrationsOpen ? activeFolder.tab.offsetHeight : 0;
  const scrolled = (activeFolder?.scrollArea.scrollTop ?? 0) > tabHeight;
  portfolio.classList.toggle("is-scrolled", scrolled);
  if (scrolled && folders.some((folder) => folder !== activeFolder && folder.tab === document.activeElement)) {
    (illustrationsOpen ? activeFolder.body : activeFolder.tab).focus({ preventScroll: true });
  }
}

function showFolder(nextFolder) {
  if (nextFolder !== activeFolder && artworkPreview.open) finishArtworkPreview();
  const selectedIndex = folders.indexOf(nextFolder);
  const focusedElement = document.activeElement;
  const focusedFolderIndex = folders.findIndex(({ tab }) => tab === focusedElement);
  const focusWasInsideFolder = activeFolder !== nextFolder && activeFolder?.body.contains(focusedElement);
  const focusWillBeCovered = focusedFolderIndex >= 0 && focusedFolderIndex < selectedIndex;
  const focusWasOnClose = focusedElement === closeButton;
  const previousFolder = activeFolder;
  activeFolder = nextFolder;
  let dockIndex = 0;

  portfolio.classList.toggle("is-open", Boolean(nextFolder));
  portfolio.style.setProperty("--front-folders", folders.length - selectedIndex - 1);
  if (nextFolder) {
    const palette = getComputedStyle(nextFolder.element);
    portfolio.style.setProperty("--active-paper", palette.getPropertyValue("--paper"));
    portfolio.style.setProperty("--active-ink", palette.color);
  }
  closeButton.hidden = !nextFolder;

  for (const [index, folder] of folders.entries()) {
    const isActive = index === selectedIndex;
    const isBehind = index < selectedIndex;
    folder.element.classList.toggle("is-active", isActive);
    folder.element.classList.toggle("is-behind", isBehind);
    folder.element.inert = isBehind;
    folder.tab.setAttribute("aria-expanded", String(isActive));
    folder.body.hidden = !isActive;
    folder.body.tabIndex = isActive ? 0 : -1;
    if (!isActive) {
      folder.element.style.setProperty("--dock-index", dockIndex);
      folder.element.style.setProperty("--dock-center", ["24%", "50%", "76%"][dockIndex]);
      dockIndex += 1;
    }
  }

  if (nextFolder && nextFolder !== previousFolder) nextFolder.scrollArea.scrollTop = 0;
  updateScrollLayout();
  if (focusWasInsideFolder || focusWillBeCovered || (focusWasOnClose && !nextFolder)) {
    (nextFolder ?? previousFolder)?.tab.focus({ preventScroll: true });
  }
}

function applyLocation() {
  const name = location.hash.slice(1);
  const folderName = name === "extras" ? "illustrations" : name;
  showFolder(folders.find((folder) => folder.name === folderName) ?? null);
}

function navigate(folder) {
  const url = new URL(location.href);
  url.hash = folder?.name ?? "";
  if (location.href !== url.href) history.pushState(null, "", url);
  showFolder(folder);
}

for (const folder of folders) {
  folder.tab.addEventListener("click", () => navigate(activeFolder === folder ? null : folder));
  folder.scrollArea.addEventListener("scroll", updateScrollLayout, { passive: true });
}

function artworkBounds(figure) {
  const frames = [...figure.children].map(element => element.getBoundingClientRect());
  const left = Math.min(...frames.map(frame => frame.left));
  const top = Math.min(...frames.map(frame => frame.top));
  const right = Math.max(...frames.map(frame => frame.right));
  const bottom = Math.max(...frames.map(frame => frame.bottom));
  return new DOMRect(left, top, right - left, bottom - top);
}

function artworkTransform(source, destination) {
  const x = source.x + source.width / 2 - destination.x - destination.width / 2;
  const y = source.y + source.height / 2 - destination.y - destination.height / 2;
  return `translate(${x}px, ${y}px) scale(${source.width / destination.width})`;
}

function finishArtworkPreview() {
  previewAnimation?.cancel();
  previewAnimation = null;
  previewedArtwork?.classList.remove("is-previewed");
  previewedArtwork = null;
  artworkPreview.classList.remove("is-presented");
  artworkPreview.close();
  artworkStage.replaceChildren();
}

function closeArtworkPreview() {
  if (!artworkPreview.classList.contains("is-presented")) return;
  if (reducedMotion.matches) {
    finishArtworkPreview();
    return;
  }

  artworkPreview.classList.remove("is-presented");
  const from = getComputedStyle(artworkStage).transform;
  previewAnimation?.cancel();
  const target = artworkTransform(artworkBounds(previewedArtwork), artworkStage.getBoundingClientRect());
  previewAnimation = artworkStage.animate([{ transform: from }, { transform: target }], {
    duration: 300,
    easing: "cubic-bezier(.4, 0, .2, 1)",
    fill: "forwards",
  });
  previewAnimation.onfinish = finishArtworkPreview;
}

gallery.addEventListener("click", (event) => {
  const trigger = event.target.closest(".illustration-print");
  if (!trigger || artworkPreview.open) return;

  const figure = trigger.closest(".illustration");
  const bounds = artworkBounds(figure);
  if (!bounds.width || !bounds.height) return;
  const frame = figure.getBoundingClientRect();
  const copy = figure.cloneNode(true);
  const button = copy.querySelector("button");
  const print = document.createElement("div");
  print.className = button.className;
  print.style.cssText = button.style.cssText;
  const image = button.querySelector("img");
  image.loading = "eager";
  print.append(image);
  button.replaceWith(print);
  copy.style.left = `${100 * (frame.x - bounds.x) / bounds.width}%`;
  copy.style.top = `${100 * (frame.y - bounds.y) / bounds.height}%`;
  copy.style.width = `${100 * frame.width / bounds.width}%`;
  copy.style.height = `${100 * frame.height / bounds.height}%`;

  artworkStage.style.setProperty("--art-ratio", bounds.width / bounds.height);
  artworkStage.replaceChildren(copy);
  artworkPreview.showModal();
  const destination = artworkStage.getBoundingClientRect();
  previewedArtwork = figure;
  figure.classList.add("is-previewed");
  artworkPreview.classList.add("is-presented");

  if (!reducedMotion.matches) {
    previewAnimation = artworkStage.animate([
      { transform: artworkTransform(bounds, destination) },
      { transform: "none" },
    ], { duration: 460, easing: "cubic-bezier(.22, .75, .2, 1)" });
  }
});
artworkClose.addEventListener("click", closeArtworkPreview);
artworkPreview.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeArtworkPreview();
});
artworkPreview.addEventListener("click", (event) => {
  if (event.target === artworkPreview) closeArtworkPreview();
});

closeButton.addEventListener("click", () => navigate(null));
homeLink.addEventListener("click", (event) => {
  event.preventDefault();
  navigate(null);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeFolder && !artworkPreview.open) {
    event.preventDefault();
    const { tab } = activeFolder;
    navigate(null);
    tab.focus({ preventScroll: true });
  }
});
window.addEventListener("hashchange", applyLocation);
applyLocation();

const morphCursor = document.querySelector(".morph-cursor");
if (morphCursor) {
  const root = document.documentElement;
  const targets = "a[href], button:enabled";
  const outline = morphCursor.querySelector(".morph-cursor-shape");
  const coordinate = /-?\d+(?:\.\d+)?/g;
  const arrowPath = outline.getAttribute("d");
  const arrowPoints = arrowPath.match(coordinate).map(Number);
  const tapPoints = outline.dataset.tapPath.match(coordinate).map(Number);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const morphDuration = 180;
  let currentPoints = arrowPoints;
  let animationFrame;
  let cursorX;
  let cursorY;

  function updateCursorShape(target = document.elementFromPoint(cursorX, cursorY)) {
    const tappable = target === artworkPreview || Boolean(target?.closest(targets));
    if (tappable === morphCursor.classList.contains("is-tap")) return;
    morphCursor.classList.toggle("is-tap", tappable);
    animateOutline(tappable ? tapPoints : arrowPoints);
  }

  function drawOutline(points) {
    let index = 0;
    outline.setAttribute("d", arrowPath.replace(coordinate, () => points[index++]));
    currentPoints = points;
  }

  function animateOutline(target) {
    cancelAnimationFrame(animationFrame);
    if (reducedMotion.matches) {
      drawOutline(target);
      return;
    }

    const from = currentPoints;
    const started = performance.now();

    function frame(timestamp) {
      const progress = Math.max(0, Math.min((timestamp - started) / morphDuration, 1));
      const eased = 1 - (1 - progress) ** 3;
      drawOutline(from.map((value, index) => value + (target[index] - value) * eased));
      if (progress < 1) animationFrame = requestAnimationFrame(frame);
    }

    animationFrame = requestAnimationFrame(frame);
  }

  function syncCursorLayer() {
    const layer = artworkPreview.open ? artworkPreview : document.body;
    if (morphCursor.parentElement !== layer) layer.append(morphCursor);
    if (!morphCursor.hasAttribute("hidden")) updateCursorShape();
  }

  function hideCursor() {
    morphCursor.setAttribute("hidden", "");
    root.classList.remove("has-morph-cursor");
  }

  function moveCursor(event) {
    if (event.pointerType !== "mouse") return;
    cursorX = event.clientX;
    cursorY = event.clientY;
    morphCursor.style.transform = `translate3d(${cursorX - 36}px, ${cursorY - 16}px, 0)`;
    morphCursor.removeAttribute("hidden");
    root.classList.add("has-morph-cursor");
    updateCursorShape(event.target);
  }

  document.addEventListener("pointermove", moveCursor, { passive: true });
  document.addEventListener("pointerover", moveCursor, { passive: true });
  document.addEventListener("pointerout", (event) => {
    if (event.pointerType === "mouse" && !event.relatedTarget) hideCursor();
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse") hideCursor();
  }, { passive: true });
  document.addEventListener("scroll", () => {
    if (!morphCursor.hasAttribute("hidden")) updateCursorShape();
  }, { capture: true, passive: true });
  window.addEventListener("blur", hideCursor);
  gallery.addEventListener("click", syncCursorLayer);
  artworkPreview.addEventListener("close", syncCursorLayer);
}

