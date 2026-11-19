const NOTE_LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NOTE_NAMES = {
  C: "Đô",
  D: "Rê",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};
const CLEFS = {
  treble: {
    name: "Khóa Sol",
    glyph: "𝄞",
    bottomStaffStep: 30,
    minStep: 28,
    maxStep: 42,
  },
  bass: {
    name: "Khóa Fa",
    glyph: "𝄢",
    bottomStaffStep: 18,
    minStep: 16,
    maxStep: 30,
  },
};

const clefButtons = [...document.querySelectorAll(".clef-choice")];
const studyButtons = [...document.querySelectorAll(".study-choice")];
const pageLinks = [...document.querySelectorAll(".page-nav-link")];
const pageViews = [...document.querySelectorAll(".page-view")];
const sheetClefButtons = [...document.querySelectorAll(".sheet-clef-choice")];
const noteHead = document.querySelector("#note-head");
const noteStem = document.querySelector("#note-stem");
const ledgerLines = document.querySelector("#ledger-lines");
const clefGlyph = document.querySelector("#clef-glyph");
const staffHint = document.querySelector("#staff-hint");
const staff = document.querySelector("#staff");
const staffTitle = document.querySelector("#staff-title");
const staffCaption = document.querySelector("#staff-caption");
const answerForm = document.querySelector("#answer-form");
const pitchOptionsFieldset = document.querySelector("#pitch-options-fieldset");
const pitchOptions = document.querySelector("#pitch-options");
const letterField = document.querySelector("#letter-field");
const letterInput = document.querySelector("#letter-input");
const feedback = document.querySelector("#feedback");
const nextButton = document.querySelector("#next-button");
const reviewButton = document.querySelector("#review-button");
const scoreDisplay = document.querySelector("#score");
const questionCount = document.querySelector("#question-count");
const sheetSvg = document.querySelector("#music-sheet");
const generateSheetButton = document.querySelector("#generate-sheet");
const toggleSheetAnswersButton = document.querySelector("#toggle-sheet-answers");

let selectedClef = "treble";
let selectedStudyMode = "mixed";
let selectedSheetClef = "treble";
let currentSheet = [];
let showSheetAnswers = false;
let currentNote = null;
let questionType = "note";
let selectedStep = null;
let score = 0;
let questionNumber = 1;
let missedQuestions = [];
let currentReviewQuestion = null;
let nextMissedQuestionId = 1;
let isReviewing = false;
let currentQuestionWasMissed = false;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pitchAtStep(step) {
  const letterIndex = ((step % 7) + 7) % 7;
  const octave = Math.floor(step / 7);
  return { letter: NOTE_LETTERS[letterIndex], octave };
}

function makeSvgElement(tagName, attributes = {}, textContent = "") {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tagName);
  Object.entries(attributes).forEach(([name, value]) => {
    element.setAttribute(name, String(value));
  });
  if (textContent) element.textContent = textContent;
  return element;
}

function createSheetRow(clefKey, previousNotes = []) {
  const clef = CLEFS[clefKey];
  let previousStep = null;
  const notes = Array.from({ length: 8 }, (_, index) => {
    const oldStep = previousNotes[index]?.step;
    const candidates = Array.from(
      { length: clef.maxStep - clef.minStep + 1 },
      (_, offset) => clef.minStep + offset,
    ).filter((step) => step !== previousStep && step !== oldStep);
    const step = candidates[randomInt(0, candidates.length - 1)];
    previousStep = step;
    return { step, ...pitchAtStep(step) };
  });

  return { clef: clefKey, notes };
}

function renderSheet() {
  const staffStart = 96;
  const staffEnd = 900;
  const noteStart = 154;
  const noteSpacing = 92;

  sheetSvg.replaceChildren();
  currentSheet.forEach((system, systemIndex) => {
    const clef = CLEFS[system.clef];
    const bottomY = systemIndex === 0 ? 130 : 320;
    const topY = bottomY - 64;
    const lines = makeSvgElement("g", { class: "sheet-staff-lines" });
    for (let index = 0; index < 5; index += 1) {
      const lineY = bottomY - index * 16;
      lines.append(makeSvgElement("line", {
        x1: staffStart,
        x2: staffEnd,
        y1: lineY,
        y2: lineY,
      }));
    }
    sheetSvg.append(lines);

    [476, staffEnd - 4, staffEnd].forEach((x) => {
      sheetSvg.append(makeSvgElement("line", {
        class: "sheet-barline",
        x1: x,
        x2: x,
        y1: topY - 2,
        y2: bottomY + 2,
      }));
    });

    sheetSvg.append(
      makeSvgElement("text", {
        class: "sheet-clef-glyph",
        x: 18,
        y: bottomY + 16,
        "font-size": 100,
      }, clef.glyph),
      makeSvgElement("text", {
        class: "sheet-time-signature",
        x: 86,
        y: bottomY - 25,
        "text-anchor": "middle",
      }, "4"),
      makeSvgElement("text", {
        class: "sheet-time-signature",
        x: 86,
        y: bottomY - 3,
        "text-anchor": "middle",
      }, "4"),
    );

    system.notes.forEach((note, noteIndex) => {
      const x = noteStart + noteIndex * noteSpacing;
      const y = bottomY - (note.step - clef.bottomStaffStep) * 8;
      const ledgerLines = [];
      for (let lineY = topY - 16; lineY >= y - 1; lineY -= 16) {
        ledgerLines.push(lineY);
      }
      for (let lineY = bottomY + 16; lineY <= y + 1; lineY += 16) {
        ledgerLines.push(lineY);
      }
      ledgerLines.forEach((lineY) => {
        sheetSvg.append(makeSvgElement("line", {
          class: "sheet-ledger-line",
          x1: x - 19,
          x2: x + 19,
          y1: lineY,
          y2: lineY,
        }));
      });

      const stemUp = y >= bottomY - 32;
      const stemX = stemUp ? x + 8 : x - 8;
      sheetSvg.append(
        makeSvgElement("line", {
          class: "sheet-note-stem",
          x1: stemX,
          x2: stemX,
          y1: y,
          y2: y + (stemUp ? -35 : 35),
        }),
        makeSvgElement("ellipse", {
          class: "sheet-note-head",
          cx: x,
          cy: y,
          rx: 9,
          ry: 6,
          transform: `rotate(-20 ${x} ${y})`,
        }),
      );

      if (showSheetAnswers) {
        sheetSvg.append(
          makeSvgElement("text", {
            class: "sheet-answer-symbol",
            x,
            y: bottomY + 44,
            "text-anchor": "middle",
          }, `${note.letter}${note.octave}`),
          makeSvgElement("text", {
            class: "sheet-answer-name",
            x,
            y: bottomY + 58,
            "text-anchor": "middle",
          }, NOTE_NAMES[note.letter]),
        );
      }
    });
  });

  sheetSvg.setAttribute(
    "aria-label",
    `Sheet nhạc gồm hai khuông, khóa ${currentSheet.map((system) => CLEFS[system.clef].name).join(" và ")}${showSheetAnswers ? ", đã hiện đáp án" : ", đáp án đang ẩn"}`,
  );
}

function generateSheet() {
  const clefRows = selectedSheetClef === "mixed"
    ? ["treble", "bass"]
    : [selectedSheetClef, selectedSheetClef];
  const previousSheet = currentSheet;
  currentSheet = clefRows.map((clefKey, index) => {
    const previousNotes = previousSheet[index]?.clef === clefKey
      ? previousSheet[index].notes
      : [];
    return createSheetRow(clefKey, previousNotes);
  });
  showSheetAnswers = false;
  toggleSheetAnswersButton.textContent = "Hiện đáp án";
  toggleSheetAnswersButton.setAttribute("aria-pressed", "false");
  renderSheet();
}

function hideStaffNote() {
  noteHead.setAttribute("visibility", "hidden");
  noteStem.setAttribute("visibility", "hidden");
  ledgerLines.replaceChildren();
}

function renderStaffPitch(step) {
  const clef = CLEFS[currentNote.clef];
  const y = 150 - (step - clef.bottomStaffStep) * 10;
  const stemUp = y >= 110;
  const stemX = stemUp ? 309 : 291;

  noteHead.setAttribute("cy", String(y));
  noteStem.setAttribute("x1", String(stemX));
  noteStem.setAttribute("x2", String(stemX));
  noteStem.setAttribute("y1", String(y));
  noteStem.setAttribute("y2", String(y + (stemUp ? -35 : 35)));
  noteHead.setAttribute("visibility", "visible");
  noteStem.setAttribute("visibility", "visible");

  const extraLines = [];
  for (let lineY = 50; lineY >= 10; lineY -= 20) {
    if (y <= lineY + 5) extraLines.push(lineY);
  }
  for (let lineY = 170; lineY <= 250; lineY += 20) {
    if (y >= lineY - 5) extraLines.push(lineY);
  }

  ledgerLines.replaceChildren(
    ...extraLines.map((lineY) => {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "282");
      line.setAttribute("x2", "318");
      line.setAttribute("y1", String(lineY));
      line.setAttribute("y2", String(lineY));
      return line;
    }),
  );
}

function createPitchImage(step, clef) {
  const namespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(namespace, "svg");
  const centerStep = currentNote.octave * 7 + 3;
  const offsetY = 34 - (50 - (centerStep - clef.bottomStaffStep) * 3.2);
  const bottomY = 50 + offsetY;
  const topY = bottomY - 25.6;
  const y = 50 - (step - clef.bottomStaffStep) * 3.2 + offsetY;
  const clefText = document.createElementNS(namespace, "text");

  svg.setAttribute("viewBox", "0 0 76 92");
  svg.setAttribute("aria-hidden", "true");

  const staffGroup = document.createElementNS(namespace, "g");
  staffGroup.setAttribute("class", "pitch-staff-lines");
  for (let index = 0; index < 5; index += 1) {
    const line = document.createElementNS(namespace, "line");
    const lineY = bottomY - index * 6.4;
    line.setAttribute("x1", "14");
    line.setAttribute("x2", "73");
    line.setAttribute("y1", String(lineY));
    line.setAttribute("y2", String(lineY));
    staffGroup.append(line);
  }
  svg.append(staffGroup);

  const ledgerGroup = document.createElementNS(namespace, "g");
  ledgerGroup.setAttribute("class", "pitch-ledger-lines");
  const ledgerYPositions = [];
  for (let lineY = topY - 6.4; lineY >= y - 1; lineY -= 12.8) {
    ledgerYPositions.push(lineY);
  }
  for (let lineY = bottomY + 6.4; lineY <= y + 1; lineY += 12.8) {
    ledgerYPositions.push(lineY);
  }
  ledgerYPositions.forEach((lineY) => {
    const line = document.createElementNS(namespace, "line");
    line.setAttribute("x1", "49");
    line.setAttribute("x2", "63");
    line.setAttribute("y1", String(lineY));
    line.setAttribute("y2", String(lineY));
    ledgerGroup.append(line);
  });
  svg.append(ledgerGroup);

  clefText.setAttribute("class", "pitch-clef");
  clefText.setAttribute("x", "2");
  clefText.setAttribute("y", String(bottomY + 1));
  clefText.setAttribute("font-size", "28");
  clefText.textContent = clef.glyph;
  svg.append(clefText);

  const stemUp = y >= (topY + bottomY) / 2;
  const stemX = stemUp ? 58 : 52;
  const stem = document.createElementNS(namespace, "line");
  stem.setAttribute("class", "pitch-stem");
  stem.setAttribute("x1", String(stemX));
  stem.setAttribute("x2", String(stemX));
  stem.setAttribute("y1", String(y));
  stem.setAttribute("y2", String(y + (stemUp ? -12 : 12)));
  svg.append(stem);

  const head = document.createElementNS(namespace, "ellipse");
  head.setAttribute("class", "pitch-note-head");
  head.setAttribute("cx", "55");
  head.setAttribute("cy", String(y));
  head.setAttribute("rx", "4.5");
  head.setAttribute("ry", "3.2");
  head.setAttribute("transform", `rotate(-20 55 ${y})`);
  svg.append(head);

  return svg;
}

function renderPitchOptions() {
  const clef = CLEFS[currentNote.clef];
  const firstStep = currentNote.octave * 7;
  const options = Array.from({ length: 7 }, (_, index) => {
    const step = firstStep + index;
    const note = pitchAtStep(step);
    const button = document.createElement("button");
    button.className = "pitch-option";
    button.type = "button";
    button.dataset.step = String(step);
    button.setAttribute("aria-pressed", "false");
    button.setAttribute(
      "aria-label",
      `Chọn hình nốt ${index + 1} trên ${clef.name}`,
    );
    button.append(createPitchImage(step, clef));
    return button;
  });
  pitchOptions.replaceChildren(...options);
}

function renderNote() {
  const clefKey = selectedClef === "mixed"
    ? (Math.random() < 0.5 ? "treble" : "bass")
    : selectedClef;
  const clef = CLEFS[clefKey];
  const step = randomInt(clef.minStep, clef.maxStep);
  const type = selectedStudyMode === "mixed"
    ? ["note", "letter"][randomInt(0, 1)]
    : selectedStudyMode;
  presentQuestion({ clef: clefKey, step, type });
}

function presentQuestion(question) {
  const { clef: clefKey, step } = question;
  const clef = CLEFS[clefKey];
  const note = pitchAtStep(step);
  questionType = question.type;
  currentNote = { ...note, clef: clefKey, step };
  currentQuestionWasMissed = false;
  clefGlyph.textContent = clef.glyph;
  pitchOptionsFieldset.hidden = questionType === "note";
  letterField.hidden = questionType === "letter";

  staff.classList.remove("is-interactive");
  staff.setAttribute("role", "img");
  staff.removeAttribute("tabindex");
  if (questionType === "note") {
    staffTitle.textContent = "NỐT NHẠC ĐƯỢC CHO";
    staffCaption.textContent = "Hãy nhận diện nốt trên dòng kẻ hoặc khe nhạc.";
    staff.classList.remove("is-interactive");
    staff.setAttribute("role", "img");
    staff.removeAttribute("tabindex");
    staff.setAttribute("aria-label", `${clef.name}, nốt nhạc cần nhận diện`);
    staffHint.setAttribute("visibility", "hidden");
    renderStaffPitch(step);
  } else {
    const clue = note.letter;
    staffTitle.textContent = "KÝ HIỆU ĐƯỢC CHO";
    staffCaption.textContent = "Chọn hình nốt tương ứng trong bảy lựa chọn bên dưới.";
    staff.setAttribute("aria-label", `${clef.name}, gợi ý ${clue}`);
    hideStaffNote();
    staffHint.textContent = clue;
    staffHint.setAttribute("visibility", "visible");
    renderPitchOptions();
  }
}

function clearFeedback() {
  feedback.hidden = true;
  feedback.textContent = "";
  feedback.className = "feedback";
}

function clearAnswer() {
  selectedStep = null;
  pitchOptions.querySelectorAll(".pitch-option").forEach((button) => {
    button.classList.remove("is-selected");
    button.setAttribute("aria-pressed", "false");
    button.disabled = false;
  });
  letterInput.value = "";
  letterInput.removeAttribute("aria-invalid");
  clearFeedback();
  nextButton.hidden = true;
  letterInput.disabled = false;
  document.querySelector("#submit-button").disabled = false;
}

function updateReviewButton() {
  const count = missedQuestions.length;
  reviewButton.textContent = `Ôn câu sai (${count})`;
  reviewButton.disabled = count === 0;
  reviewButton.setAttribute(
    "aria-label",
    count === 0 ? "Chưa có câu sai để ôn lại" : `Ôn lại ${count} câu đã làm sai`,
  );
}

function nextQuestion() {
  questionNumber += 1;
  questionCount.textContent = `CÂU ${String(questionNumber).padStart(2, "0")}`;
  clearAnswer();

  if (isReviewing && missedQuestions.length > 0) {
    currentReviewQuestion = missedQuestions[0];
    presentQuestion(currentReviewQuestion);
    return;
  }

  isReviewing = false;
  currentReviewQuestion = null;
  updateReviewButton();
  renderNote();
}

function startReview() {
  if (missedQuestions.length === 0) return;
  isReviewing = true;
  currentReviewQuestion = missedQuestions[0];
  questionNumber += 1;
  questionCount.textContent = `CÂU ${String(questionNumber).padStart(2, "0")}`;
  clearAnswer();
  presentQuestion(currentReviewQuestion);
}

clefButtons.forEach((button) => {
  button.addEventListener("click", () => {
    isReviewing = false;
    currentReviewQuestion = null;
    selectedClef = button.dataset.clef;
    clefButtons.forEach((choice) => {
      const isActive = choice === button;
      choice.classList.toggle("is-active", isActive);
      choice.setAttribute("aria-pressed", String(isActive));
    });
    nextQuestion();
  });
});

studyButtons.forEach((button) => {
  button.addEventListener("click", () => {
    isReviewing = false;
    currentReviewQuestion = null;
    selectedStudyMode = button.dataset.studyMode;
    studyButtons.forEach((choice) => {
      const isActive = choice === button;
      choice.classList.toggle("is-active", isActive);
      choice.setAttribute("aria-pressed", String(isActive));
    });
    nextQuestion();
  });
});

nextButton.addEventListener("click", nextQuestion);
reviewButton.addEventListener("click", startReview);

pitchOptions.addEventListener("click", (event) => {
  const button = event.target.closest(".pitch-option");
  if (!button || !feedback.hidden) return;
  selectedStep = Number(button.dataset.step);
  pitchOptions.querySelectorAll(".pitch-option").forEach((choice) => {
    const isSelected = choice === button;
    choice.classList.toggle("is-selected", isSelected);
    choice.setAttribute("aria-pressed", String(isSelected));
  });
  clearFeedback();
});

letterInput.addEventListener("input", () => {
  letterInput.value = letterInput.value.replace(/[^a-g]/gi, "").slice(0, 1).toUpperCase();
  letterInput.removeAttribute("aria-invalid");
  clearFeedback();
});

answerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const enteredLetter = letterInput.value.trim().toUpperCase();
  const needsPosition = questionType === "letter";
  const needsLetter = questionType === "note";
  const missing = [];

  if (needsPosition && selectedStep === null) missing.push("chọn hình nốt");
  if (needsLetter && !enteredLetter) missing.push("nhập ký hiệu chữ cái");

  if (missing.length > 0) {
    feedback.className = "feedback is-incomplete";
    feedback.textContent = `Hãy ${missing.join(", ")} trước khi kiểm tra.`;
    feedback.hidden = false;
    if (needsLetter && !enteredLetter) {
      letterInput.setAttribute("aria-invalid", "true");
    }
    return;
  }

  const isCorrect = (!needsPosition || selectedStep === currentNote.step)
    && (!needsLetter || enteredLetter === currentNote.letter);
  feedback.className = `feedback ${isCorrect ? "is-correct" : "is-incorrect"}`;

  if (isCorrect) {
    score += 1;
    scoreDisplay.textContent = String(score).padStart(2, "0");
    feedback.innerHTML = `<strong>Chính xác!</strong> Ký hiệu cần tìm là ${currentNote.letter}.`;
    if (isReviewing && currentReviewQuestion) {
      missedQuestions = missedQuestions.filter(
        (question) => question.id !== currentReviewQuestion.id,
      );
      currentReviewQuestion = null;
      updateReviewButton();
    }
  } else {
    let reviewMessage = "";
    if (isReviewing && currentReviewQuestion) {
      const missedIndex = missedQuestions.findIndex(
        (question) => question.id === currentReviewQuestion.id,
      );
      if (missedIndex !== -1) {
        const [missedQuestion] = missedQuestions.splice(missedIndex, 1);
        missedQuestions.push(missedQuestion);
      }
      currentReviewQuestion = null;
      updateReviewButton();
      reviewMessage = " Câu này vẫn còn trong danh sách ôn tập.";
    } else if (!currentQuestionWasMissed) {
      missedQuestions.push({
        id: nextMissedQuestionId,
        clef: currentNote.clef,
        step: currentNote.step,
        type: questionType,
      });
      nextMissedQuestionId += 1;
      currentQuestionWasMissed = true;
      updateReviewButton();
      reviewMessage = " Câu này đã được thêm vào danh sách ôn tập.";
    }
    feedback.innerHTML = `<strong>Chưa đúng rồi.</strong> Đáp án là ${currentNote.letter}. Hãy thử ghi nhớ vị trí nốt trên khuông nhé.${reviewMessage}`;
  }
  feedback.hidden = false;
  nextButton.hidden = false;
  pitchOptions.querySelectorAll(".pitch-option").forEach((button) => {
    button.disabled = true;
  });
  letterInput.disabled = true;
  document.querySelector("#submit-button").disabled = true;
});

pageLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const pageId = link.getAttribute("href").slice(1);
    showPage(pageId, true);
  });
});

function showPage(pageId, updateLocation = false) {
  const activePageId = pageId === "sheet-page" ? "sheet-page" : "practice-page";
  pageViews.forEach((view) => {
    view.hidden = view.id !== activePageId;
  });
  pageLinks.forEach((link) => {
    const isActive = link.hash === `#${activePageId}`;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  if (updateLocation && window.location.hash !== `#${activePageId}`) {
    window.history.pushState(null, "", `#${activePageId}`);
  }
}

function syncPageFromLocation() {
  showPage(window.location.hash.slice(1));
}

window.addEventListener("hashchange", syncPageFromLocation);
window.addEventListener("popstate", syncPageFromLocation);

sheetClefButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedSheetClef = button.dataset.sheetClef;
    sheetClefButtons.forEach((choice) => {
      const isActive = choice === button;
      choice.classList.toggle("is-active", isActive);
      choice.setAttribute("aria-pressed", String(isActive));
    });
    generateSheet();
  });
});

generateSheetButton.addEventListener("click", generateSheet);

toggleSheetAnswersButton.addEventListener("click", () => {
  showSheetAnswers = !showSheetAnswers;
  toggleSheetAnswersButton.textContent = showSheetAnswers ? "Ẩn đáp án" : "Hiện đáp án";
  toggleSheetAnswersButton.setAttribute("aria-pressed", String(showSheetAnswers));
  renderSheet();
});

showPage(window.location.hash.slice(1));
generateSheet();
renderNote();
