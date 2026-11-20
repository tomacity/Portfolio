"use strict";

const portfolio = document.querySelector(".portfolio");
const homeLink = document.querySelector(".monogram");
const closeButton = document.querySelector(".close-folder");
const folders = [...document.querySelectorAll("[data-folder]")].map((element) => ({
  element,
  name: element.dataset.folder,
  tab: element.querySelector(".folder-tab"),
  body: element.querySelector(".folder-body"),
}));

let activeFolder = null;

function showFolder(nextFolder) {
  const focusWasInsideFolder = activeFolder?.body.contains(document.activeElement);
  const focusWasOnClose = document.activeElement === closeButton;
  const previousFolder = activeFolder;
  activeFolder = nextFolder;
  let dockIndex = 0;

  portfolio.classList.toggle("is-open", Boolean(nextFolder));
  closeButton.hidden = !nextFolder;

  for (const folder of folders) {
    const isActive = folder === nextFolder;
    folder.element.classList.toggle("is-active", isActive);
    folder.tab.setAttribute("aria-expanded", String(isActive));
    folder.body.hidden = !isActive;
    if (!isActive) {
      folder.element.style.setProperty("--dock-index", dockIndex);
      folder.element.style.setProperty("--dock-center", ["24%", "50%", "76%"][dockIndex]);
      dockIndex += 1;
    }
  }

  if (focusWasInsideFolder || (focusWasOnClose && !nextFolder)) {
    (nextFolder ?? previousFolder)?.tab.focus({ preventScroll: true });
  }
}

function applyLocation() {
  const name = location.hash.slice(1);
  showFolder(folders.find((folder) => folder.name === name) ?? null);
}

function navigate(folder) {
  const url = new URL(location.href);
  url.hash = folder?.name ?? "";
  if (location.href !== url.href) history.pushState(null, "", url);
  showFolder(folder);
}

for (const folder of folders) {
  folder.tab.addEventListener("click", () => navigate(activeFolder === folder ? null : folder));
}

closeButton.addEventListener("click", () => navigate(null));
homeLink.addEventListener("click", (event) => {
  event.preventDefault();
  navigate(null);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && activeFolder) {
    event.preventDefault();
    const { tab } = activeFolder;
    navigate(null);
    tab.focus({ preventScroll: true });
  }
});
window.addEventListener("hashchange", applyLocation);
applyLocation();
