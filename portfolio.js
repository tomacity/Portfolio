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
