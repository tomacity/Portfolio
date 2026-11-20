"use strict";

const portfolio = document.querySelector(".portfolio");
const homeLink = document.querySelector(".monogram");
const closeButton = document.querySelector(".close-folder");
const gallery = document.querySelector(".illustration-gallery");
const artworkPreview = document.querySelector("#artwork-preview");
const artworkImage = artworkPreview.querySelector(".artwork-preview-image");
const artworkClose = artworkPreview.querySelector(".artwork-preview-close");
const folders = [...document.querySelectorAll("[data-folder]")].map((element) => ({
  element,
  name: element.dataset.folder,
  tab: element.querySelector(".folder-tab"),
  body: element.querySelector(".folder-body"),
}));

let activeFolder = null;

function updateScrollLayout() {
  const scrolled = (activeFolder?.body.scrollTop ?? 0) > 0;
  portfolio.classList.toggle("is-scrolled", scrolled);
  if (scrolled && folders.some((folder) => folder !== activeFolder && folder.tab === document.activeElement)) {
    activeFolder.tab.focus({ preventScroll: true });
  }
}

function showFolder(nextFolder) {
  if (nextFolder !== activeFolder && artworkPreview.open) artworkPreview.close();
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

  if (nextFolder && nextFolder !== previousFolder) nextFolder.body.scrollTop = 0;
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
  folder.body.addEventListener("scroll", updateScrollLayout, { passive: true });
}

gallery.addEventListener("click", (event) => {
  const trigger = event.target.closest(".illustration-print");
  if (!trigger || artworkPreview.open) return;
  const image = trigger.querySelector("img");
  artworkImage.alt = image.alt;
  artworkImage.src = image.currentSrc || image.src;
  artworkPreview.showModal();
});
artworkClose.addEventListener("click", () => artworkPreview.close());
artworkPreview.addEventListener("click", (event) => {
  if (event.target === artworkPreview) artworkPreview.close();
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

