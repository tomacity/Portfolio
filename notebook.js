"use strict";

const bookDialog = document.querySelector(".notebook-dialog");
const bookTrigger = document.querySelector(".notebook");
const bookClose = bookDialog.querySelector(".close-detail");
const bookPaper = bookDialog.querySelector(".notebook-paper");
const bookCover = bookPaper.querySelector(".notebook-cover");
const bookPage = bookPaper.querySelector(".notebook-page");
const previousPage = bookDialog.querySelector('[data-turn="-1"]');
const nextPage = bookDialog.querySelector('[data-turn="1"]');
const pageStatus = bookDialog.querySelector(".deck-position");
const pages = Array.from(document.querySelectorAll(".book-page-content"), template => template.content);
let pageIndex = 0;
let bookEntrance = null;
let pageTurn = null;
let gesture = null;
const turnedPageAngle = -168;

function showPage() {
  bookPage.replaceChildren(pages[pageIndex].cloneNode(true));
  previousPage.disabled = pageIndex === 0;
  nextPage.disabled = pageIndex === pages.length - 1;
  pageStatus.textContent = (pageIndex + 1) + " / " + pages.length;
}

function finishEntrance() {
  bookEntrance?.cancel();
  bookEntrance = null;
  bookDialog.classList.remove("is-opening");
}

function openSketchbook() {
  if (bookDialog.open) return;
  const source = bookTrigger.getBoundingClientRect();
  const sourceHeight = Math.min(bookTrigger.offsetHeight, bookTrigger.offsetWidth * 4 / 3);
  pageIndex = 0;
  showPage();
  bookTrigger.classList.add("is-lifted");
  bookDialog.showModal();
  if (reducedMotion.matches || !bookPaper.animate || !sourceHeight) return;

  const target = bookPaper.getBoundingClientRect();
  const dx = source.left + source.width / 2 - target.left - target.width / 2;
  const dy = source.top + source.height / 2 - target.top - target.height / 2;
  bookDialog.classList.add("is-opening");
  const entrance = bookPaper.animate([
    { transform: `translate(${dx}px, ${dy}px) rotate(-11deg) scale(${sourceHeight / target.height})` },
    { transform: "none" },
  ], { duration: 560, easing: "cubic-bezier(.22,.83,.25,1)" });
  bookEntrance = entrance;
  entrance.finished.then(() => {
    if (bookEntrance === entrance) finishEntrance();
  }, () => {});
}

function startTurn(direction) {
  const to = pageIndex + direction;
  if (bookEntrance || pageTurn || !pages[to]) return null;
  const leaf = document.createElement("div");
  leaf.className = "notebook-leaf";
  leaf.setAttribute("aria-hidden", "true");

  const front = document.createElement("div");
  front.className = "notebook-leaf-face";
  front.append(bookCover.cloneNode(), pages[direction > 0 ? pageIndex : to].cloneNode(true));
  const back = document.createElement("div");
  back.className = "notebook-leaf-face notebook-leaf-back";
  back.append(bookCover.cloneNode());
  leaf.append(front, back);

  const turn = { to, direction, leaf, progress: 0, animation: null };
  pageTurn = turn;
  if (direction > 0) bookPage.replaceChildren(pages[to].cloneNode(true));
  rotatePage(turn, 0);
  bookPaper.append(leaf);
  return turn;
}

function pageFrame(turn, progress) {
  const position = turn.direction > 0 ? progress : 1 - progress;
  return {
    transform: `rotateY(${turnedPageAngle * position}deg)`,
    "--notebook-leaf-opacity": Math.min(1, (1 - position) * 6),
  };
}

function rotatePage(turn, progress) {
  turn.progress = progress;
  const frame = pageFrame(turn, progress);
  turn.leaf.style.transform = frame.transform;
  turn.leaf.style.setProperty("--notebook-leaf-opacity", frame["--notebook-leaf-opacity"]);
}

function finishTurn(turn, commit) {
  if (turn.animation) return;
  if (reducedMotion.matches || !turn.leaf.animate) {
    settle();
    return;
  }
  const destination = commit ? 1 : 0;
  const frames = [pageFrame(turn, turn.progress)];
  // Keep the leaf opaque until it is almost flat against the other side.
  const fadePoint = turn.direction > 0 ? 5 / 6 : 1 / 6;
  if ((turn.progress - fadePoint) * (destination - fadePoint) < 0) {
    frames.push({
      ...pageFrame(turn, fadePoint),
      offset: (fadePoint - turn.progress) / (destination - turn.progress),
    });
  }
  frames.push(pageFrame(turn, destination));
  turn.animation = turn.leaf.animate(frames, {
    duration: commit ? 460 : 230,
    easing: "cubic-bezier(.33,.04,.21,1)",
    fill: "forwards",
  });
  turn.animation.finished.then(settle, () => {});

  function settle() {
    if (pageTurn !== turn) return;
    if (commit) pageIndex = turn.to;
    turn.leaf.remove();
    pageTurn = null;
    showPage();
    if (document.activeElement === previousPage && previousPage.disabled) nextPage.focus();
    if (document.activeElement === nextPage && nextPage.disabled) previousPage.focus();
  }
}

function turnPage(direction) {
  if (gesture) return;
  const turn = startTurn(direction);
  if (turn) finishTurn(turn, true);
}

bookTrigger.addEventListener("click", openSketchbook);
bookClose.addEventListener("click", () => bookDialog.close());
bookDialog.addEventListener("click", event => {
  if (event.target === bookDialog) bookDialog.close();
});
bookDialog.addEventListener("close", () => {
  finishEntrance();
  pageTurn?.animation?.cancel();
  pageTurn?.leaf.remove();
  pageTurn = null;
  gesture = null;
  bookTrigger.classList.remove("is-lifted");
  bookTrigger.focus({ preventScroll: true });
});
previousPage.addEventListener("click", () => turnPage(-1));
nextPage.addEventListener("click", () => turnPage(1));
bookDialog.addEventListener("keydown", event => {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  event.preventDefault();
  turnPage(event.key === "ArrowRight" ? 1 : -1);
});
bookPaper.addEventListener("pointerdown", event => {
  if (event.button !== 0 || !event.isPrimary || bookEntrance || pageTurn) return;
  gesture = { id: event.pointerId, x: event.clientX };
  bookPaper.setPointerCapture(event.pointerId);
});
bookPaper.addEventListener("pointermove", event => {
  if (gesture?.id !== event.pointerId || reducedMotion.matches) return;
  const dx = event.clientX - gesture.x;
  if (!pageTurn && Math.abs(dx) > 7) startTurn(dx < 0 ? 1 : -1);
  if (pageTurn) rotatePage(pageTurn, Math.max(0, Math.min(.95, -pageTurn.direction * dx / (bookPaper.clientWidth * .65))));
});
function endPageGesture(event) {
  if (gesture?.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x;
  gesture = null;
  const valid = event.type === "pointerup" && Math.abs(dx) >= Math.min(72, bookPaper.clientWidth * .16);
  const direction = dx < 0 ? 1 : -1;
  if (pageTurn) finishTurn(pageTurn, valid && pageTurn.direction === direction);
  else if (valid) turnPage(direction);
}
bookPaper.addEventListener("pointerup", endPageGesture);
bookPaper.addEventListener("pointercancel", endPageGesture);
bookPaper.addEventListener("lostpointercapture", endPageGesture);
