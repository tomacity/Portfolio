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
    copy: "A set of illustrated cards with Greek lettering, decorative borders, and three objects at the center: a sword, a crown, and a fan.",
    images: [["44ebce9a5561507f.webp", "Sword card"], ["a33f2b47fd859109.webp", "Crown card"], ["fb8e19ca24622b67.webp", "Fan card"]],
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

let openedFrom;
function openPiece(trigger) {
  if (detail.open) return;
  const isIllustration = trigger.classList.contains("illustration-card");
  const piece = isIllustration ? {
    title: trigger.querySelector(".work-caption strong").textContent,
    category: "Illustration",
  } : artworks[trigger.dataset.piece];
  if (!piece) return;
  openedFrom = trigger;
  detail.dataset.kind = isIllustration ? "illustration" : piece.fold ? "note" : "work";
  detailTitle.textContent = piece.title;
  detail.querySelector(".detail-category").textContent = piece.category;
  detail.querySelector(".detail-copy").textContent = piece.copy ?? "";
  detailMedia.replaceChildren(...(piece.images ?? []).map(([file, alt]) => {
    const img = new Image();
    img.src = figma + file;
    img.alt = alt;
    return img;
  }));
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

const dragPositions = new Map();
let drag;
let releasedDrag;
for (const object of desk.querySelectorAll("[data-drag]")) {
  dragPositions.set(object, { x: 0, y: 0 });
  object.setAttribute("aria-description", "Drag to move, or use the arrow keys. Press Home to reset.");
}

function moveObject(object, targetX, targetY) {
  const current = dragPositions.get(object);
  const bounds = desk.getBoundingClientRect();
  const objectRect = object.getBoundingClientRect();
  const baseX = objectRect.left + objectRect.width / 2 - current.x;
  const baseY = objectRect.top + objectRect.height / 2 - current.y;
  const marginX = Math.min(objectRect.width / 2, bounds.width / 2);
  const marginY = Math.min(objectRect.height / 2, bounds.height / 2);
  const x = Math.max(bounds.left + marginX - baseX, Math.min(bounds.right - marginX - baseX, targetX));
  const y = Math.max(bounds.top + marginY - baseY, Math.min(bounds.bottom - marginY - baseY, targetY));
  dragPositions.set(object, { x, y });
  object.style.setProperty("--x", x + "px");
  object.style.setProperty("--y", y + "px");
}

desk.addEventListener("pointerdown", event => {
  const object = event.target.closest("[data-drag]");
  if (!object || !event.isPrimary || event.button !== 0) return;
  releasedDrag = null;
  drag = { object, id: event.pointerId, startX: event.clientX, startY: event.clientY, ...dragPositions.get(object), moved: false };
  object.setPointerCapture(event.pointerId);
  if (event.pointerType === "mouse") document.documentElement.classList.add("is-holding");
});
desk.addEventListener("pointermove", event => {
  if (drag?.id !== event.pointerId) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  drag.moved = true;
  drag.object.classList.add("is-dragging");
  moveObject(drag.object, drag.x + dx, drag.y + dy);
});
function finishDrag(event) {
  if (drag?.id !== event.pointerId) return;
  drag.object.classList.remove("is-dragging");
  document.documentElement.classList.remove("is-holding");
  if (drag.moved) {
    releasedDrag = drag.object;
    deskStatus.textContent = drag.object.dataset.label + " moved.";
  }
  drag = null;
}
desk.addEventListener("pointerup", finishDrag);
desk.addEventListener("pointercancel", finishDrag);
desk.addEventListener("lostpointercapture", finishDrag);
desk.addEventListener("keydown", event => {
  const object = event.target.closest("[data-drag]");
  if (!object) return;
  const step = { ArrowUp: [0, -12], ArrowDown: [0, 12], ArrowLeft: [-12, 0], ArrowRight: [12, 0] }[event.key];
  if (!step && event.key !== "Home") return;
  event.preventDefault();
  const { x, y } = dragPositions.get(object);
  moveObject(object, step ? x + step[0] : 0, step ? y + step[1] : 0);
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
