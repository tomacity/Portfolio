"use strict";

const figma = "assets/figma/";
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const detail = document.querySelector(".detail");
const detailTitle = detail.querySelector("#detail-title");
const detailMedia = detail.querySelector(".detail-media");
const detailLink = detail.querySelector(".detail-link");
const desk = document.querySelector("[data-desk]");
const deskStatus = document.querySelector("#desk-status");
const motionToggle = document.querySelector("#motion-toggle");
const artworks = {
  zisto: {
    title: "Zisto", category: "Product design",
    copy: "I co-founded Zisto and work on digital menus, branded pages, and dashboards for local businesses. The work takes me from the screens guests see at the table to the tools businesses use to update them.",
    href: "https://zisto.app/",
  },
  billiards: {
    title: "Billiards & Grills", category: "Poster illustration",
    copy: "A black-and-white poster built around a single eight ball. The hand-drawn lettering bends around it like the print on a vintage label.",
    images: [["5038bac1ba0dc75f.webp", "Billiards & Grills poster with a large eight ball and hand-drawn lettering"]],
  },
  cards: {
    title: "Trading cards", category: "Illustration series",
    copy: "An illustrated deck of objects and curiosities, with Greek lettering and hand-drawn frames.",
  },
  dinner: {
    title: "Dinner with a fox", category: "Character illustration",
    copy: "A dinner scene in warm colors, with the people, dishes, and fox arranged around a single table.",
    images: [["5bd3e5ec8a0de491.webp", "Illustration of a dinner table shared with a fox"]],
  },
  note: {
    title: "A note from my desk", category: "How I work", fold: true,
    copy: "I start with pencil marks and rough shapes. Once I know what the eye should notice first, I work out what needs to move, what belongs on the screen, and what I can take away.",
  },
  making: {
    title: "Why I keep the rough ones", category: "Sketchbook", fold: true,
    copy: "Some drawings start in the margin with a single line. I keep the pencil marks and corrections because that’s where I can see which ideas I kept and where I changed my mind.",
  },
};

function renderDeck(images) {
  const viewer = document.createElement("div");
  viewer.className = "deck-viewer";
  const preview = new Image();
  const controls = document.createElement("div");
  controls.className = "deck-controls";
  const position = document.createElement("span");
  position.className = "deck-position";
  position.setAttribute("role", "status");
  let index = 0;

  function showCard(offset) {
    index = (index + offset + images.length) % images.length;
    preview.src = images[index].src;
    preview.alt = images[index].alt;
    position.textContent = (index + 1) + " / " + images.length;
  }

  const previous = document.createElement("button");
  previous.type = "button";
  previous.setAttribute("aria-label", "Previous card");
  previous.textContent = "←";
  previous.addEventListener("click", () => showCard(-1));
  const next = document.createElement("button");
  next.type = "button";
  next.setAttribute("aria-label", "Next card");
  next.textContent = "→";
  next.addEventListener("click", () => showCard(1));
  viewer.addEventListener("keydown", event => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    showCard(event.key === "ArrowRight" ? 1 : -1);
  });
  controls.append(previous, position, next);
  viewer.append(preview, controls);
  showCard(0);
  return viewer;
}

let openedFrom;
function openPiece(trigger) {
  if (detail.open) return;
  const isIllustration = trigger.classList.contains("illustration-card");
  const isDeck = trigger.dataset.piece === "cards";
  const piece = isIllustration ? {
    title: trigger.querySelector(".work-caption strong").textContent,
    category: "Illustration",
  } : artworks[trigger.dataset.piece];
  if (!piece) return;
  openedFrom = trigger;
  detail.dataset.kind = isDeck ? "deck" : isIllustration ? "illustration" : piece.fold ? "note" : "work";
  detailTitle.textContent = piece.title;
  detail.querySelector(".detail-category").textContent = piece.category;
  detail.querySelector(".detail-copy").textContent = piece.copy ?? "";
  detailMedia.replaceChildren(...(piece.images ?? []).map(([file, alt]) => {
    const img = new Image();
    img.src = figma + file;
    img.alt = alt;
    return img;
  }));
  if (isDeck) detailMedia.append(renderDeck([...trigger.querySelectorAll(".cards-image img")]));
  if (isIllustration) {
    detailMedia.append(...[...trigger.querySelectorAll("img")].map(image => {
      const preview = image.cloneNode();
      preview.removeAttribute("loading");
      const figure = document.createElement("figure");
      figure.append(preview);
      if (image.dataset.caption) {
        const caption = document.createElement("figcaption");
        caption.textContent = image.dataset.caption;
        figure.append(caption);
      }
      return figure;
    }));
  }
  detailLink.hidden = !piece.href;
  if (piece.href) detailLink.href = piece.href;
  else detailLink.removeAttribute("href");
  detail.showModal();
}

detail.querySelector(".close-detail").addEventListener("click", () => detail.close());
detail.addEventListener("click", event => {
  if (event.target === detail) detail.close();
});
detail.addEventListener("close", () => {
  if (openedFrom?.isConnected) openedFrom.focus({ preventScroll: true });
});

const dragLayer = document.querySelector(".drag-layer");
const placedObjects = new Map();
let drag;
let releasedDrag;
for (const object of desk.querySelectorAll("[data-drag]")) {
  object.setAttribute("aria-description", "Drag anywhere on the page, or use the arrow keys. Press Home to reset.");
}

function pageCenter(object) {
  const rect = object.getBoundingClientRect();
  return { x: rect.left + rect.width / 2 + window.scrollX, y: rect.top + rect.height / 2 + window.scrollY };
}

function liftObject(object) {
  if (placedObjects.has(object)) return;
  const center = pageCenter(object);
  const marker = document.createComment("Desk object position");
  const size = { width: object.offsetWidth, height: object.offsetHeight };
  const focused = document.activeElement === object;
  object.before(marker);
  placedObjects.set(object, { marker, ...size });
  Object.assign(object.style, { width: size.width + "px", height: size.height + "px" });
  dragLayer.append(object);
  moveObject(object, center.x, center.y);
  if (focused) object.focus({ preventScroll: true });
}

function moveObject(object, x, y) {
  const { width, height } = placedObjects.get(object);
  const painted = object.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const pageHeight = document.body.offsetHeight;
  const halfWidth = Math.min(painted.width / 2, viewportWidth / 2);
  const halfHeight = Math.min(painted.height / 2, pageHeight / 2);
  x = Math.max(halfWidth, Math.min(viewportWidth - halfWidth, x));
  y = Math.max(halfHeight, Math.min(pageHeight - halfHeight, y));
  object.style.left = x - width / 2 + "px";
  object.style.top = y - height / 2 + "px";
}

function positionHeldObject() {
  moveObject(drag.object, drag.x + window.scrollX - drag.grabX, drag.y + window.scrollY - drag.grabY);
}

function scrollWithDrag() {
  if (!drag?.moved) return;
  const edge = Math.min(96, window.innerHeight / 4);
  const speed = drag.y < edge ? (drag.y - edge) * .22
    : drag.y > window.innerHeight - edge ? (drag.y - window.innerHeight + edge) * .22 : 0;
  if (speed) {
    window.scrollBy({ top: speed, behavior: "instant" });
    positionHeldObject();
  }
  drag.frame = requestAnimationFrame(scrollWithDrag);
}

document.addEventListener("pointerdown", event => {
  const object = event.target.closest("[data-drag]");
  if (!object || drag || !event.isPrimary || event.button !== 0) return;
  releasedDrag = null;
  const rect = object.getBoundingClientRect();
  drag = {
    object, id: event.pointerId, x: event.clientX, y: event.clientY,
    startX: event.clientX, startY: event.clientY,
    grabX: event.clientX - rect.left - rect.width / 2,
    grabY: event.clientY - rect.top - rect.height / 2,
    moved: false,
  };
  if (event.pointerType === "mouse") document.documentElement.classList.add("is-holding");
});
document.addEventListener("pointermove", event => {
  if (drag?.id !== event.pointerId) return;
  drag.x = event.clientX;
  drag.y = event.clientY;
  if (!drag.moved) {
    if (Math.hypot(drag.x - drag.startX, drag.y - drag.startY) < 6) return;
    liftObject(drag.object);
    drag.object.setPointerCapture(event.pointerId);
    drag.object.classList.add("is-dragging");
    drag.moved = true;
    drag.frame = requestAnimationFrame(scrollWithDrag);
  }
  positionHeldObject();
});
function finishDrag(event) {
  if (!drag || (event.type !== "blur" && drag.id !== event.pointerId)) return;
  cancelAnimationFrame(drag.frame);
  drag.object.classList.remove("is-dragging");
  document.documentElement.classList.remove("is-holding");
  if (drag.moved) {
    releasedDrag = drag.object;
    deskStatus.textContent = drag.object.dataset.label + " moved.";
  }
  drag = null;
}
document.addEventListener("pointerup", finishDrag);
document.addEventListener("pointercancel", finishDrag);
window.addEventListener("blur", finishDrag);
window.addEventListener("scroll", () => {
  if (drag?.moved) positionHeldObject();
}, { passive: true });
window.addEventListener("resize", () => {
  for (const object of placedObjects.keys()) {
    const center = pageCenter(object);
    moveObject(object, center.x, center.y);
  }
});
document.addEventListener("keydown", event => {
  const object = event.target.closest("[data-drag]");
  if (!object || drag) return;
  const step = { ArrowUp: [0, -12], ArrowDown: [0, 12], ArrowLeft: [-12, 0], ArrowRight: [12, 0] }[event.key];
  if (!step && event.key !== "Home") return;
  event.preventDefault();
  if (step) {
    const center = pageCenter(object);
    liftObject(object);
    moveObject(object, center.x + step[0], center.y + step[1]);
    object.scrollIntoView({ block: "nearest", behavior: "instant" });
  } else if (placedObjects.has(object)) {
    placedObjects.get(object).marker.replaceWith(object);
    placedObjects.delete(object);
    for (const name of ["width", "height", "left", "top"]) object.style.removeProperty(name);
    object.focus();
  }
  deskStatus.textContent = object.dataset.label + (step ? " moved." : " reset.");
});

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-piece]");
  if (trigger && !(trigger === releasedDrag && event.detail > 0)) openPiece(trigger);
  releasedDrag = null;
});

const filters = [...document.querySelectorAll("[data-filter]")];
const workItems = [...document.querySelectorAll(".work-item")];
const filterStatus = document.querySelector("#filter-status");
for (const filter of filters) {
  filter.addEventListener("click", () => {
    const category = filter.dataset.filter;
    for (const option of filters) option.setAttribute("aria-pressed", option === filter);
    let visible = 0;
    for (const item of workItems) {
      item.hidden = category !== "all" && item.dataset.category !== category;
      if (!item.hidden) {
        item.classList.add("is-visible");
        visible += 1;
      }
    }
    filterStatus.textContent = visible + (visible === 1 ? " project" : " projects") + " shown.";
  });
}

const loops = [...document.querySelectorAll(".loop-media video")];
for (const video of loops) {
  const restoreTiming = () => {
    if (Number.isFinite(video.duration) && video.duration > 0) {
      video.playbackRate = video.duration / Number(video.dataset.originalDuration);
    }
  };
  video.addEventListener("loadedmetadata", restoreTiming);
  restoreTiming();
}
let motionOverride;
function syncLoops() {
  const paused = motionOverride ?? reducedMotion.matches;
  motionToggle.setAttribute("aria-pressed", paused);
  motionToggle.textContent = paused ? "Play loops" : "Pause loops";
  for (const video of loops) {
    if (paused) {
      video.pause();
      continue;
    }
    video.play().catch(() => {});
  }
}
motionToggle.addEventListener("click", () => {
  motionOverride = motionToggle.getAttribute("aria-pressed") !== "true";
  syncLoops();
});
reducedMotion.addEventListener("change", syncLoops);
syncLoops();

const reveal = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add("is-visible");
    reveal.unobserve(entry.target);
  }
}, { threshold: 0.12 });
document.documentElement.classList.add("reveal-ready");
for (const element of document.querySelectorAll("[data-reveal]")) reveal.observe(element);
