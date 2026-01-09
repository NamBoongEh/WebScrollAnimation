const cards = document.querySelectorAll(".card");
const dots = document.querySelectorAll(".dot");
let current = 0;

function showCard(index) {
  const prev = current;
  current = index;

  // 이전 카드: 퇴장
  if (cards[prev]) {
    cards[prev].classList.remove("active");
    cards[prev].classList.add("exit-down");
    cards[prev].addEventListener(
      "animationend",
      () => {
        cards[prev].classList.remove("exit-down");
        cards[prev].style.zIndex = 1; // 퇴장 완료 후 뒤로 보내기
      },
      { once: true }
    );
  }

  // 새 카드: 입장
  const nextCard = cards[current];
  nextCard.classList.add("enter-up");
  nextCard.addEventListener(
    "animationend",
    () => {
      nextCard.classList.remove("enter-up");
      nextCard.classList.add("active");
      nextCard.style.zIndex = 3; // 중앙 카드 최상위
    },
    { once: true }
  );

  // 인디케이터 업데이트
  dots.forEach((d, i) => d.classList.toggle("active", i === current));
}

// 키보드 네비게이션
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    showCard((current + 1) % cards.length);
  } else if (e.key === "ArrowUp") {
    showCard((current - 1 + cards.length) % cards.length);
  }
});

// 마우스 휠로 넘기기
document.addEventListener("wheel", (e) => {
  if (e.deltaY > 0) {
    showCard((current + 1) % cards.length);
  } else {
    showCard((current - 1 + cards.length) % cards.length);
  }
});

// 초기 카드 표시
showCard(current);
