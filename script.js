let cards = Array.from(document.querySelectorAll(".card"));
let dots = Array.from(document.querySelectorAll(".dot"));
let current = 0;
let isAnimating = false; // ✅ 누락된 선언 추가

function clampIndex(i) {
  const len = cards.length;
  return ((i % len) + len) % len;
}

function updateDots() {
  const indicator = document.querySelector(".indicator");
  if (!indicator) return;

  if (indicator.children.length !== cards.length) {
    indicator.innerHTML = "";
    for (let i = 0; i < cards.length; i++) {
      const dot = document.createElement("span");
      dot.className = "dot" + (i === current ? " active" : "");
      indicator.appendChild(dot);
    }
    dots = Array.from(document.querySelectorAll(".dot"));
  } else {
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }
}

function showCard(nextIndexRaw) {
  if (isAnimating || cards.length === 0) return;

  const nextIndex = clampIndex(nextIndexRaw);
  if (nextIndex === current) return;

  isAnimating = true;

  const prev = current;
  const next = nextIndex;

  // 초기화: 모든 카드 뒤로
  cards.forEach((card) => {
    card.classList.remove("active", "enter-up", "exit-down");
    card.style.zIndex = 1;
  });

  const prevCard = cards[prev];
  const nextCard = cards[next];

  // 애니메이션 중 z-index 우선순위 고정
  prevCard.style.zIndex = 3; // 퇴장 카드 최상위
  nextCard.style.zIndex = 2; // 입장 카드 중간

  requestAnimationFrame(() => {
    prevCard.classList.add("exit-down");
    nextCard.classList.add("enter-up");

    let doneCount = 0;
    const onDone = () => {
      doneCount++;
      if (doneCount < 2) return;

      // 최종 확정
      current = next;
      cards.forEach((card, i) => {
        card.classList.remove("enter-up", "exit-down");
        if (i === current) {
          card.classList.add("active");
          card.style.zIndex = 3;
        } else {
          card.style.zIndex = 1;
        }
      });

      updateDots();
      isAnimating = false;
    };

    prevCard.addEventListener("animationend", onDone, { once: true });
    nextCard.addEventListener("animationend", onDone, { once: true });
  });
}

// 네비게이션 (무한 루프)
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    showCard(current + 1);
  } else if (e.key === "ArrowUp") {
    showCard(current - 1);
  }
});

document.addEventListener("wheel", (e) => {
  if (e.deltaY > 0) {
    showCard(current + 1);
  } else {
    showCard(current - 1);
  }
});

// 초기화
cards.forEach((card, i) => {
  card.classList.toggle("active", i === current);
  card.style.zIndex = i === current ? 3 : 1;
});
updateDots();
