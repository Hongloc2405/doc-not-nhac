const NOTE_NAMES = {
  C: "Đô",
  D: "Rê",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};

const NOTE_LETTERS = Object.keys(NOTE_NAMES);
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
const noteButtons = [...document.querySelectorAll(".note-option")];
const noteHead = document.querySelector("#note-head");
const noteStem = document.querySelector("#note-stem");
const ledgerLines = document.querySelector("#ledger-lines");
const clefGlyph = document.querySelector("#clef-glyph");
const staffHint = document.querySelector("#staff-hint");
const staff = document.querySelector("#staff");
const answerForm = document.querySelector("#answer-form");
const letterInput = document.querySelector("#letter-input");
const feedback = document.querySelector("#feedback");
const nextButton = document.querySelector("#next-button");
const scoreDisplay = document.querySelector("#score");
const questionCount = document.querySelector("#question-count");

let selectedClef = "treble";
let currentNote = null;
let selectedAnswer = "";
let score = 0;
let questionNumber = 1;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pitchAtStep(step) {
  const letterIndex = ((step % 7) + 7) % 7;
  const octave = Math.floor(step / 7);
  return { letter: NOTE_LETTERS[letterIndex], octave };
}

function renderNote() {
  const clefKey = selectedClef === "mixed"
    ? (Math.random() < 0.5 ? "treble" : "bass")
    : selectedClef;
  const clef = CLEFS[clefKey];
  const step = randomInt(clef.minStep, clef.maxStep);
  const note = pitchAtStep(step);
  const y = 150 - (step - clef.bottomStaffStep) * 10;
  const stemUp = y >= 110;
  const stemX = stemUp ? 309 : 291;

  currentNote = { ...note, clef: clefKey };
  noteHead.setAttribute("cy", String(y));
  noteStem.setAttribute("x1", String(stemX));
  noteStem.setAttribute("x2", String(stemX));
  noteStem.setAttribute("y1", String(y));
  noteStem.setAttribute("y2", String(y + (stemUp ? -35 : 35)));
  clefGlyph.textContent = clef.glyph;
  staff.setAttribute(
    "aria-label",
    `${clef.name}, nốt nhạc trên khuông cần nhận diện`,
  );
  staffHint.setAttribute("visibility", "hidden");

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

function clearAnswer() {
  selectedAnswer = "";
  noteButtons.forEach((button) => {
    button.classList.remove("is-selected");
    button.setAttribute("aria-pressed", "false");
  });
  letterInput.value = "";
  letterInput.removeAttribute("aria-invalid");
  feedback.hidden = true;
  feedback.textContent = "";
  feedback.className = "feedback";
  nextButton.hidden = true;
  noteButtons.forEach((button) => {
    button.disabled = false;
  });
  letterInput.disabled = false;
  document.querySelector("#submit-button").disabled = false;
}

function nextQuestion() {
  questionNumber += 1;
  questionCount.textContent = `CÂU ${String(questionNumber).padStart(2, "0")}`;
  clearAnswer();
  renderNote();
}

clefButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedClef = button.dataset.clef;
    clefButtons.forEach((choice) => {
      const isActive = choice === button;
      choice.classList.toggle("is-active", isActive);
      choice.setAttribute("aria-pressed", String(isActive));
    });
    nextQuestion();
  });
});

nextButton.addEventListener("click", nextQuestion);

noteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedAnswer = button.dataset.note;
    noteButtons.forEach((choice) => {
      const isSelected = choice === button;
      choice.classList.toggle("is-selected", isSelected);
      choice.setAttribute("aria-pressed", String(isSelected));
    });
    if (!feedback.hidden) clearAnswer();
    selectedAnswer = button.dataset.note;
    button.classList.add("is-selected");
    button.setAttribute("aria-pressed", "true");
  });
});

letterInput.addEventListener("input", () => {
  letterInput.value = letterInput.value.replace(/[^a-g]/gi, "").slice(0, 1).toUpperCase();
  letterInput.removeAttribute("aria-invalid");
  if (!feedback.hidden) {
    feedback.hidden = true;
    feedback.textContent = "";
    feedback.className = "feedback";
  }
});

answerForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const enteredLetter = letterInput.value.trim().toUpperCase();

  if (!selectedAnswer || !enteredLetter) {
    feedback.className = "feedback is-incomplete";
    feedback.textContent = !selectedAnswer && !enteredLetter
      ? "Hãy chọn tên nốt và nhập ký hiệu chữ cái trước khi kiểm tra."
      : !selectedAnswer
        ? "Bạn hãy chọn tên nốt trước nhé."
        : "Bạn hãy nhập ký hiệu chữ cái của nốt nhé.";
    feedback.hidden = false;
    if (!enteredLetter) {
      letterInput.setAttribute("aria-invalid", "true");
    }
    return;
  }

  const isCorrect = selectedAnswer === currentNote.letter
    && enteredLetter === currentNote.letter;
  feedback.className = `feedback ${isCorrect ? "is-correct" : "is-incorrect"}`;

  if (isCorrect) {
    score += 1;
    scoreDisplay.textContent = String(score).padStart(2, "0");
    feedback.innerHTML = `<strong>Chính xác!</strong> Đây là nốt ${NOTE_NAMES[currentNote.letter]} (${currentNote.letter}), trên khuông ${CLEFS[currentNote.clef].name}.`;
  } else {
    feedback.innerHTML = `<strong>Chưa đúng rồi.</strong> Đáp án là ${NOTE_NAMES[currentNote.letter]} (${currentNote.letter}). Hãy thử ghi nhớ vị trí nốt trên khuông nhé.`;
  }
  feedback.hidden = false;
  nextButton.hidden = false;
  noteButtons.forEach((button) => {
    button.disabled = true;
  });
  letterInput.disabled = true;
  document.querySelector("#submit-button").disabled = true;
});

renderNote();
