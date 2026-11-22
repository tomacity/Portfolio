"use strict";

const bookDialog = document.querySelector(".notebook-dialog");
const bookTrigger = document.querySelector(".notebook");
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
  if (pageTurn || !spreads[to]) return null;
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

bookTrigger.addEventListener("click", () => {
  spreadIndex = 0;
  showSpread();
  bookDialog.showModal();
});
bookDialog.querySelector(".close-detail").addEventListener("click", () => bookDialog.close());
bookDialog.addEventListener("click", event => {
  if (event.target === bookDialog) bookDialog.close();
});
bookDialog.addEventListener("close", () => {
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
  if (event.button !== 0 || !event.isPrimary || pageTurn) return;
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
