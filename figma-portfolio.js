"use strict";

const frameSpace = document.querySelector(".frame-space");
const frameStack = document.querySelector(".frame-stack");
const folderDock = document.querySelector(".folder-dock");
const dockLinks = [...folderDock.querySelectorAll("a")];
const frames = [...document.querySelectorAll(".design-frame")];
const gallery = frames.find(frame => frame.dataset.route === "illustrations");
const workTitle = gallery.querySelector(".work-title");
const artworkPreview = document.querySelector(".artwork-preview");
const artworkStage = artworkPreview.querySelector(".artwork-preview-stage");
const artworkClose = artworkPreview.querySelector(".artwork-preview-close");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const designs = {"24:84":["Sword trading card","35:6","35:8"],"24:88":["Billiards poster","35:4","35:5"],"24:89":["Picnic illustration","35:23"],"24:86":["Character collage","35:13","35:17"],"24:92":["Nightfall landscape","35:11","35:19"],"24:91":["Gorilla illustration","35:25","35:21"],"24:94":["Sota Men","35:29","35:39"],"24:96":["Crown trading card","35:15","35:27"],"24:87":["Mechanical illustration","35:35","35:37"],"24:93":["Train poster","35:41","35:31"],"24:95":["Cartoon characters","35:47","35:45"],"24:85":["Fan trading card","35:33","35:43"]};
const aliases = { logos:"about", me:"about", sketches:"sketching", extras:"illustrations" };
const folderLayers = {
  about: { paper: "15:174", grid: "15:107", title: "35-64" },
  sketching: { paper: "15:252", grid: "15:185", title: "43-3170" },
  projects: { paper: "15:330", grid: "15:263", title: "15-497" },
  illustrations: { paper: "40:3147", grid: "15:341", title: "40-3148" },
};
let folderOpening = [];
let clickedFolder;
let activeFrame = frames[0];
let scale = 1;
let preview;
let animation;

function setScale() {
  scale = frameSpace.clientWidth / parseFloat(activeFrame.style.width);
  frameStack.style.transform = `scale(${scale})`;
  frameSpace.style.height = `${parseFloat(activeFrame.style.height) * scale}px`;
  pinTitle();
}

function pinTitle() {
  if (activeFrame !== gallery) return;
  const top = gallery.getBoundingClientRect().top + window.scrollY;
  const distance = (window.scrollY - top) / scale - workTitle.offsetTop;
  workTitle.style.translate = `0 ${Math.max(0, distance)}px`;
}

function animateFolder(frame, sourceTop) {
  const elements = folderLayers[frame.dataset.route];
  const paper = frame.querySelector(`[data-node-id="${elements.paper}"]`);
  const grid = frame.querySelector(`[data-node-id="${elements.grid}"]`);
  const title = frame.querySelector(`img[src$="text-${elements.title}.svg"]`).parentElement;
  const distance = Math.max(0, (sourceTop - paper.getBoundingClientRect().top) / scale);
  if (distance < 1) return;

  const rise = {
    duration: 460,
    easing: "cubic-bezier(.22,.75,.22,1)",
  };
  const movement = [{ transform: `translateY(${distance}px)` }, { transform: "none" }];
  folderOpening = [paper.animate(movement, rise), title.animate(movement, rise)];

  for (const layer of frame.querySelectorAll(":scope > *, :scope > [style*='display:contents'] > *")) {
    if (layer === paper || layer === title || layer === grid || layer.classList.contains("folder-hotspot")) continue;
    folderOpening.push(layer.animate([{ opacity: 0 }, { opacity: 1 }], {
      delay: 190, duration: 270, easing: "ease-out", fill: "backwards",
    }));
  }
}

function route(animate = true) {
  if (artworkPreview.open) finishPreview();
  folderOpening.forEach(effect => effect.cancel());
  folderOpening = [];

  const name = location.hash.slice(1);
  const next = frames.find(el => el.dataset.route === (aliases[name] ?? name)) ?? frames[0];
  const href = `#${next.dataset.route}`;
  const link = next !== activeFrame && (clickedFolder?.hash === href
    ? clickedFolder : dockLinks.find(tab => tab.hash === href));
  clickedFolder = null;
  const sourceTop = link
    ? Math.min(window.innerHeight, Math.max(0, link.getBoundingClientRect().top))
    : null;

  activeFrame = next;
  for (const tab of dockLinks) {
    if (tab.hash === href) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  }
  frames.forEach(el => { el.hidden = el !== activeFrame; });
  window.scrollTo(0, 0);
  setScale();

  if (animate && sourceTop !== null && folderLayers[activeFrame.dataset.route] && !motion.matches) {
    animateFolder(activeFrame, sourceTop);
  }
}

function groupBounds(elements) {
  const rects = elements.map(el => el.getBoundingClientRect());
  const left = Math.min(...rects.map(r => r.left));
  const top = Math.min(...rects.map(r => r.top));
  return new DOMRect(left, top, Math.max(...rects.map(r => r.right)) - left, Math.max(...rects.map(r => r.bottom)) - top);
}

function travel(source, destination) {
  const dx = source.left + source.width / 2 - destination.left - destination.width / 2;
  const dy = source.top + source.height / 2 - destination.top - destination.height / 2;
  return `translate(${dx}px,${dy}px) scale(${source.width / destination.width})`;
}

function finishPreview() {
  animation?.cancel();
  animation = null;
  preview.elements.forEach(el => el.classList.remove("is-previewed"));
  artworkPreview.classList.remove("is-presented");
  artworkPreview.close();
  artworkStage.replaceChildren();
  preview.trigger.focus({preventScroll:true});
  preview = null;
}

function closePreview() {
  if (!artworkPreview.classList.contains("is-presented")) return;
  if (motion.matches) {
    finishPreview();
    return;
  }
  const from = getComputedStyle(artworkStage).transform;
  animation?.cancel();
  artworkPreview.classList.remove("is-presented");
  animation = artworkStage.animate([
    { transform:from }, { transform:travel(groupBounds(preview.elements),artworkStage.getBoundingClientRect()) },
  ], { duration:300, easing:"cubic-bezier(.4,0,.2,1)", fill:"forwards" });
  animation.onfinish = finishPreview;
}

function openPreview(trigger) {
  if (artworkPreview.open) return;
  const [label,...tapes] = designs[trigger.dataset.nodeId];
  const elements = [trigger,...tapes.map(id => gallery.querySelector(`[data-node-id="${id}"]`))];
  const bounds = groupBounds(elements);
  if (!bounds.width || !bounds.height) return;
  const ratio = Math.min(900 / bounds.width, (innerWidth - 36) / bounds.width, (innerHeight - 96) / bounds.height);
  const copy = document.createElement("div");
  copy.className = "artwork-preview-copy";
  copy.style.transform = `scale(${scale * ratio})`;
  const clones = [...elements].sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING?-1:1);
  for (const original of clones) {
    const clone = original.cloneNode(true);
    const rect = original.getBoundingClientRect();
    clone.style.left = `${(rect.left - bounds.left) / scale}px`;
    clone.style.top = `${(rect.top - bounds.top) / scale}px`;
    clone.style.width = `${rect.width / scale}px`;
    clone.style.height = `${rect.height / scale}px`;
    clone.removeAttribute("tabindex");
    clone.removeAttribute("role");
    clone.removeAttribute("data-artwork");
    clone.removeAttribute("aria-label");
    if (original === trigger) clone.querySelector("img").alt = label;
    copy.append(clone);
  }
  artworkStage.style.width = `${bounds.width * ratio}px`;
  artworkStage.style.height = `${bounds.height * ratio}px`;
  artworkStage.replaceChildren(copy);
  artworkPreview.showModal();
  preview = { trigger, elements };
  const destination = artworkStage.getBoundingClientRect();
  elements.forEach(el => el.classList.add("is-previewed"));
  artworkPreview.classList.add("is-presented");
  artworkPreview.dispatchEvent(new Event("previewopen"));
  if (!motion.matches) animation = artworkStage.animate([
    { transform:travel(bounds,destination) }, { transform:"none" },
  ], { duration:460, easing:"cubic-bezier(.22,.75,.2,1)" });
}

gallery.addEventListener("click", event => {
  const trigger = event.target.closest("[data-artwork]");
  if (trigger) openPreview(trigger);
});
gallery.addEventListener("keydown", event => {
  const trigger = event.target.closest("[data-artwork]");
  if (trigger && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openPreview(trigger);
  }
});
artworkClose.addEventListener("click", closePreview);
artworkPreview.addEventListener("cancel", event => { event.preventDefault(); closePreview(); });
artworkPreview.addEventListener("click", event => { if (event.target === artworkPreview) closePreview(); });
document.addEventListener("click", event => {
  const link = event.target.closest(".folder-dock a, .folder-hotspot");
  if (link && link.hash !== location.hash && !event.defaultPrevented &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
    clickedFolder = link;
  }
});
window.addEventListener("hashchange", route);
window.addEventListener("resize", () => { if (artworkPreview.open) finishPreview(); setScale(); });
window.addEventListener("scroll",pinTitle,{passive:true});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !event.defaultPrevented && activeFrame !== frames[0] && !artworkPreview.open) location.hash = "home";
});
route(false);

const morphCursor = document.querySelector(".morph-cursor");
if (morphCursor) {
  const root = document.documentElement;
  const targets = "a[href], button:enabled, [data-artwork]";
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
  artworkPreview.addEventListener("previewopen", syncCursorLayer);
  artworkPreview.addEventListener("close", syncCursorLayer);
}

