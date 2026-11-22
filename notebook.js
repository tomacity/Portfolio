"use strict";

const bookDialog = document.querySelector(".notebook-dialog");
const bookTrigger = document.querySelector(".notebook");
const notebookShell = bookDialog.querySelector(".notebook-shell");
const bookClose = bookDialog.querySelector(".close-detail");
const spread = bookDialog.querySelector(".book-spread");
const leftPage = spread.querySelector(".book-page--left");
const rightPage = spread.querySelector(".book-page--right");
const previousPages = bookDialog.querySelector('[data-turn="-1"]');
const nextPages = bookDialog.querySelector('[data-turn="1"]');
const pageStatus = bookDialog.querySelector(".deck-position");
const spreads = Array.from(document.querySelectorAll(".book-spread-content"), template => template.content.children);
let spreadIndex = 0;
let pageTurn = null;
let gesture = null;
let bookEntrance = null;

function showSpread() {
  leftPage.replaceChildren(spreads[spreadIndex][0].cloneNode(true));
  rightPage.replaceChildren(spreads[spreadIndex][1].cloneNode(true));
  previousPages.disabled = spreadIndex === 0;
  nextPages.disabled = spreadIndex === spreads.length - 1;
  pageStatus.textContent = (spreadIndex * 2 + 1) + "–" + (spreadIndex * 2 + 2) + " / " + spreads.length * 2;
}

function rotateLeaf(turn, progress) {
  turn.angle = -turn.direction * 180 * progress;
  turn.leaf.style.transform = "rotateY(" + turn.angle + "deg)";
}

function makeTurn(direction) {
  const to = spreadIndex + direction;
  if (bookEntrance || pageTurn || !spreads[to]) return null;
  const outgoingSide = direction > 0 ? 1 : 0;
  const leaf = document.createElement("div");
  leaf.className = "book-leaf";
  leaf.dataset.side = direction > 0 ? "right" : "left";
  leaf.setAttribute("aria-hidden", "true");
  for (const [side, className] of [[spreads[spreadIndex][outgoingSide], "front"], [spreads[to][1 - outgoingSide], "back"]]) {
    const face = document.createElement("div");
    face.className = "book-leaf-face book-leaf-" + className;
    face.append(side.cloneNode(true));
    leaf.append(face);
  }
  const backingPage = outgoingSide === 1 ? rightPage : leftPage;
  backingPage.replaceChildren(spreads[to][outgoingSide].cloneNode(true));
  spread.append(leaf);
  pageTurn = { leaf, to, direction, angle: 0, animation: null };
  return pageTurn;
}

function finishBookTurn(turn, commit) {
  if (turn !== pageTurn || turn.animation) return;
  if (reducedMotion.matches) {
    settle();
    return;
  }
  const destination = commit ? -turn.direction * 180 : 0;
  turn.animation = turn.leaf.animate([
    { transform: "rotateY(" + turn.angle + "deg)" },
    { transform: "rotateY(" + destination + "deg)" },
  ], { duration: commit ? 520 : 230, easing: "cubic-bezier(.33,.04,.21,1)", fill: "forwards" });
  turn.animation.finished.then(settle, () => {});

  function settle() {
    if (turn !== pageTurn) return;
    if (commit) spreadIndex = turn.to;
    turn.leaf.remove();
    pageTurn = null;
    const focused = document.activeElement;
    showSpread();
    if (focused === previousPages && previousPages.disabled) nextPages.focus();
    if (focused === nextPages && nextPages.disabled) previousPages.focus();
  }
}

function turnPage(direction) {
  const turn = makeTurn(direction);
  if (turn) finishBookTurn(turn, true);
}

function resetEntrance() {
  if (!bookEntrance) return;
  for (const effect of bookEntrance.effects) effect.cancel();
  bookEntrance.cover.remove();
  bookEntrance = null;
  bookDialog.classList.remove("is-opening", "is-unfolding");
  bookTrigger.classList.remove("is-lifted");
}

async function openSketchbook() {
  if (bookDialog.open) return;
  spreadIndex = 0;
  showSpread();
  const source = bookTrigger.getBoundingClientRect();
  const width = bookTrigger.offsetWidth;
  const height = bookTrigger.offsetHeight;
  if (reducedMotion.matches || !Element.prototype.animate || !width || !height) {
    bookDialog.showModal();
    return;
  }

  const centerX = source.left + source.width / 2;
  const centerY = source.top + source.height / 2;
  const cover = document.createElement("div");
  cover.className = "notebook-travel";
  cover.setAttribute("aria-hidden", "true");
  Object.assign(cover.style, {
    left: centerX - width / 2 + "px", top: centerY - height / 2 + "px",
    width: width + "px", height: height + "px",
  });
  const coverImage = bookTrigger.querySelector("img").cloneNode();
  coverImage.removeAttribute("loading");
  cover.append(coverImage);

  // Keep the handwriting in the same spot on the cover as it lifts from the desk.
  const handwriting = bookTrigger.parentElement.querySelector(".handwritten");
  if (handwriting) {
    const note = handwriting.getBoundingClientRect();
    const dx = note.left + note.width / 2 - centerX;
    const dy = note.top + note.height / 2 - centerY;
    const angle = 11 * Math.PI / 180;
    const clone = handwriting.cloneNode();
    clone.className = "notebook-travel-ink";
    clone.removeAttribute("loading");
    Object.assign(clone.style, {
      left: width / 2 + dx * Math.cos(angle) - dy * Math.sin(angle) + "px",
      top: height / 2 + dx * Math.sin(angle) + dy * Math.cos(angle) + "px",
      width: handwriting.offsetWidth + "px",
    });
    cover.append(clone);
  }

  const entrance = { cover, effects: [] };
  bookEntrance = entrance;
  bookDialog.classList.add("is-opening");
  bookTrigger.classList.add("is-lifted");
  bookDialog.append(cover);
  bookDialog.showModal();

  const target = spread.getBoundingClientRect();
  const scale = Math.min(target.height / height, target.width / (width * 1.8), window.innerHeight * .76 / height);
  const destination = "translate(" + (window.innerWidth / 2 - centerX) + "px," +
    (window.innerHeight / 2 - centerY) + "px) rotate(0deg) scale(" + scale + ")";
  const flight = cover.animate([
    { transform: "translate(0,0) rotate(-11deg) scale(1)" },
    { transform: destination },
  ], { duration: 560, easing: "cubic-bezier(.22,.83,.25,1)", fill: "forwards" });
  entrance.effects.push(flight);
  try {
    await flight.finished;
    if (bookEntrance !== entrance || !bookDialog.open) return;
    bookDialog.classList.add("is-unfolding");
    const uncover = notebookShell.animate([
      { opacity: 0, transform: "scale(.87)", clipPath: "inset(0 25% 0 25% round 6px)" },
      { opacity: 1, transform: "scale(1)", clipPath: "inset(0 0 0 0 round 0px)" },
    ], { duration: 350, easing: "cubic-bezier(.22,.7,.25,1)", fill: "both" });
    const fade = cover.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 230, fill: "forwards" });
    entrance.effects.push(uncover, fade);
    await uncover.finished;
  } catch {
    // Closing the dialog cancels any running entrance effects.
  } finally {
    if (bookEntrance === entrance) {
      resetEntrance();
      if (bookDialog.open) bookClose.focus({ preventScroll: true });
    }
  }
}

bookTrigger.addEventListener("click", openSketchbook);
bookClose.addEventListener("click", () => bookDialog.close());
bookDialog.addEventListener("click", event => {
  if (event.target === bookDialog) bookDialog.close();
});
bookDialog.addEventListener("close", () => {
  resetEntrance();
  gesture = null;
  pageTurn?.animation?.cancel();
  pageTurn?.leaf.remove();
  pageTurn = null;
  bookTrigger.focus({ preventScroll: true });
});
previousPages.addEventListener("click", () => turnPage(-1));
nextPages.addEventListener("click", () => turnPage(1));
bookDialog.addEventListener("keydown", event => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  turnPage(event.key === "ArrowRight" ? 1 : -1);
});
spread.addEventListener("pointerdown", event => {
  if (event.button !== 0 || !event.isPrimary || bookEntrance || pageTurn) return;
  gesture = { id: event.pointerId, x: event.clientX };
  spread.setPointerCapture(event.pointerId);
});
spread.addEventListener("pointermove", event => {
  if (gesture?.id !== event.pointerId || reducedMotion.matches) return;
  const dx = event.clientX - gesture.x;
  if (!pageTurn && Math.abs(dx) > 7) makeTurn(dx < 0 ? 1 : -1);
  if (pageTurn) rotateLeaf(pageTurn, Math.max(0, Math.min(.95, -pageTurn.direction * dx / (spread.clientWidth * .54))));
});
function endPageGesture(event) {
  if (gesture?.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  gesture = null;
  const valid = event.type === "pointerup" && Math.abs(dx) >= Math.min(72, spread.clientWidth * .16);
  const direction = dx < 0 ? 1 : -1;
  if (pageTurn) finishBookTurn(pageTurn, valid && pageTurn.direction === direction);
  else if (valid) turnPage(direction);
}
spread.addEventListener("pointerup", endPageGesture);
spread.addEventListener("pointercancel", endPageGesture);
spread.addEventListener("lostpointercapture", endPageGesture);
