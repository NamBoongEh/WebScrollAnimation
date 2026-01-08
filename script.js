const cards = document.querySelectorAll(".card");
const dots = document.querySelectorAll(".dot");
let current = 0;

function showCard(index) {
  const prev = current;
  current = index;

  // 이전 카드: 뒤·아래로 내려감
  if (cards[prev]) {
    cards[prev].classList.remove("active");
    cards[prev].classList.add("exit-down");
    setTimeout(() => cards[prev].classList.remove("exit-down"), 800);
  }

  // 새 카드: 앞·아래에서 올라옴
  const nextCard = cards[current];
  nextCard.classList.add("enter-up");
  setTimeout(() => {
    nextCard.classList.remove("enter-up");
    nextCard.classList.add("active");
  }, 800);

  // 인디케이터 업데이트
  dots.forEach((d, i) => d.classList.toggle("active", i === current));
}

// 키보드 네비게이션
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    const next = (current + 1) % cards.length;
    showCard(next);
  } else if (e.key === "ArrowUp") {
    const prev = (current - 1 + cards.length) % cards.length;
    showCard(prev);
  }
});

// 마우스 휠로 넘기기
document.addEventListener("wheel", (e) => {
  if (e.deltaY > 0) {
    const next = (current + 1) % cards.length;
    showCard(next);
  } else {
    const prev = (current - 1 + cards.length) % cards.length;
    showCard(prev);
  }
});

// 초기 카드 표시
showCard(current);
