const cards = Array.from(document.querySelectorAll(".card"));
const indicator = document.querySelector(".indicator");
const closeButtons = document.querySelectorAll(".close-button");
const cardStack = document.querySelector(".card-stack");

let current = 0;
let isAnimating = false;
let isFullscreen = false;

// 마우스 추적
let mouseX = 0,
  mouseY = 0;
let currentMouseX = 0,
  currentMouseY = 0;

// 스크롤 관련
let scrollAccumulator = 0;
const scrollThreshold = 500;
let wheelTimeout = null;
let currentScrollY = 0,
  targetScrollY = 0;
let currentScrollZ = 0,
  targetScrollZ = 0;
let currentScrollAmount = 0,
  targetScrollAmount = 0;
let currentScrollDirection = 0,
  targetScrollDirection = 0;
let currentTilt = 0,
  targetTilt = 0;

// 인디케이터 생성
function createIndicator() {
  indicator.innerHTML = "";
  cards.forEach((_, i) => {
    const dot = document.createElement("span");
    dot.className = "dot" + (i === current ? " active" : "");
    dot.addEventListener("click", () => navigateToCard(i));
    indicator.appendChild(dot);
  });
}

// 카드 위치 업데이트 (애니메이션 없이 즉시)
function updateCardPositions() {
  cards.forEach((card, i) => {
    card.className = "card";
    card.style.transform = "";
    card.style.opacity = "1";
    card.style.visibility = "";
    card.style.filter = "";
    card.style.zIndex = "";

    const diff = i - current;

    if (diff === 0) {
      card.classList.add("active");
    } else if (diff === -1) {
      card.classList.add("prev-1");
    } else if (diff <= -2) {
      card.classList.add("prev-2");
    } else {
      card.classList.add("next-hidden");
    }
  });

  indicator.querySelectorAll(".dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === current);
  });
}

// 스크롤 변수 부드럽게 리셋 (target만 0으로 - current는 lerp로 자연스럽게 따라감)
function smoothResetScrollVars() {
  scrollAccumulator = 0;
  targetScrollY = 0;
  targetScrollZ = 0;
  targetScrollAmount = 0;
  targetScrollDirection = 0;
  targetTilt = 0;
  // current 값들은 건드리지 않음 - animateCardParallax의 lerp가 부드럽게 0으로 수렴시킴
}

// 스크롤 변수 즉시 리셋 (카드 전환 완료 후)
function resetScrollVars() {
  scrollAccumulator = 0;
  targetScrollY = targetScrollZ = targetScrollAmount = targetScrollDirection = targetTilt = 0;
  currentScrollY = currentScrollZ = currentScrollAmount = currentScrollDirection = currentTilt = 0;
}

// 전체화면 진입
function enterFullscreen(card) {
  isFullscreen = true;
  card.style.transform = "";

  const rect = card.getBoundingClientRect();
  document.body.appendChild(card);

  Object.assign(card.style, {
    position: "fixed",
    top: rect.top + "px",
    left: rect.left + "px",
    width: rect.width + "px",
    height: rect.height + "px",
    transition: "none",
  });

  card.offsetHeight; // reflow

  Object.assign(card.style, {
    transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    borderRadius: "0",
  });
  card.classList.add("fullscreen");

  document.body.style.overflow = "hidden";
  history.pushState({ fullscreen: true }, "");

  if (card.id === "card-2" && window.resumeCard2Videos) {
    setTimeout(window.resumeCard2Videos, 600);
  }
}

// 전체화면 해제
function exitFullscreen() {
  const activeCard = cards[current];
  const stackRect = cardStack.getBoundingClientRect();

  window.pauseAllCard2Videos?.();
  window.stopCard3Video?.();
  window.stopCard5Video?.();
  window.resetCard1Grid?.();

  activeCard.classList.add("shrinking");

  Object.assign(activeCard.style, {
    transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
    top: stackRect.top + "px",
    left: stackRect.left + "px",
    width: stackRect.width + "px",
    height: stackRect.height + "px",
    borderRadius: "24px",
  });

  setTimeout(() => {
    activeCard.classList.remove("fullscreen", "shrinking");
    Object.assign(activeCard.style, {
      position: "",
      top: "",
      left: "",
      width: "",
      height: "",
      borderRadius: "",
      transition: "",
    });

    cardStack.appendChild(activeCard);
    isFullscreen = false;
    document.body.style.overflow = "";
    updateCardPositions();
  }, 600);
}

// 카드 클릭 이벤트
cards.forEach((card, index) => {
  card.addEventListener("click", (e) => {
    if (index === current && !isFullscreen && !isAnimating) {
      e.stopPropagation();
      enterFullscreen(card);
    }
  });
});

// 닫기 버튼
closeButtons.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (isFullscreen) history.back();
  });
});

// 브라우저 뒤로가기
window.addEventListener("popstate", () => {
  if (isFullscreen) exitFullscreen();
});

// 네비게이션 (현재 위치에서 이어서 애니메이션)
function navigateToCard(nextIndex) {
  if (
    isAnimating ||
    nextIndex < 0 ||
    nextIndex >= cards.length ||
    nextIndex === current ||
    isFullscreen
  ) {
    return;
  }

  isAnimating = true;
  const direction = nextIndex > current ? "down" : "up";
  const oldCurrent = current;
  current = nextIndex;

  const oldCard = cards[oldCurrent];
  const newCard = cards[current];
  const prevOfNew = cards[current - 1];
  const prevOfOld = cards[oldCurrent - 1];

  if (direction === "down") {
    // 아래로 스크롤: 현재 카드 → prev-1 위치로
    oldCard.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
    oldCard.style.transform = "translateZ(-100px) translateY(60%) scale(0.5)";
    oldCard.style.filter = "brightness(0.9)";
    oldCard.style.zIndex = "5";

    // 새 카드가 아래에서 올라옴 (z-index 높게)
    newCard.style.visibility = "visible";
    newCard.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
    newCard.style.transform = "translateZ(0) translateY(0) scale(1)";
    newCard.style.zIndex = "15";
    newCard.classList.add("active");

    // 이전 카드(prev-1)가 더 뒤로
    if (prevOfOld) {
      prevOfOld.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
      prevOfOld.style.transform =
        "translateZ(-200px) translateY(70%) scale(0.4)";
      prevOfOld.style.visibility = "hidden";
    }
  } else {
    // 위로 스크롤: 현재 카드 → 아래로 사라짐
    oldCard.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
    oldCard.style.transform =
      "translateZ(150px) translateY(120%) rotateX(-50deg) scale(1)";
    oldCard.style.visibility = "hidden";
    oldCard.style.zIndex = "10";

    // 새 카드(이전 카드)가 올라옴
    newCard.style.visibility = "visible";
    newCard.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
    newCard.style.transform = "translateZ(0) translateY(0) scale(1)";
    newCard.style.filter = "brightness(1)";
    newCard.style.zIndex = "5";
    newCard.classList.add("active");

    // 그 이전 카드가 prev-1 위치로
    if (prevOfNew) {
      prevOfNew.style.visibility = "visible";
      prevOfNew.style.transition = "all 1s cubic-bezier(0.4, 0, 0.2, 1)";
      prevOfNew.style.transform =
        "translateZ(-100px) translateY(60%) scale(0.5)";
      prevOfNew.style.filter = "brightness(0.9)";
    }
  }

  setTimeout(() => {
    // 트랜지션 제거하고 클래스 기반으로 전환, 스크롤 변수도 리셋
    cards.forEach((card) => {
      card.style.transition = "";
      card.style.transform = "";
      card.style.filter = "";
      card.style.zIndex = "";
      card.style.visibility = "";
    });
    resetScrollVars();
    updateCardPositions();
    updateTitle();
    isAnimating = false;
  }, 1000);
}

// 키보드 네비게이션
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    navigateToCard(current + 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    navigateToCard(current - 1);
  }
});

// 휠 이벤트
document.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    if (isAnimating || isFullscreen) return;

    scrollAccumulator += e.deltaY * 0.5;

    const absScroll = Math.abs(scrollAccumulator);
    const progress = absScroll / scrollThreshold;

    if (scrollAccumulator > 0) {
      // 아래로 스크롤 (deltaY 양수)
      targetScrollY = absScroll * 0.6;
      targetScrollZ = -absScroll * 2;
      targetTilt = 0;
    } else {
      // 위로 스크롤 (deltaY 음수)
      targetScrollY = absScroll * 0.6;
      targetScrollZ = absScroll * 2;
      targetTilt = -15 * progress; // 0에서 -15도로 기울어짐
    }

    targetScrollAmount = progress;
    targetScrollDirection = scrollAccumulator;

    if (wheelTimeout) clearTimeout(wheelTimeout);

    // 임계점 체크
    if (absScroll > scrollThreshold) {
      const dir = scrollAccumulator > 0 ? 1 : -1;
      scrollAccumulator = 0;
      targetScrollAmount = targetScrollDirection = 0;
      navigateToCard(current + dir);
    } else {
      // 부드러운 리셋: target만 0으로 설정, current는 lerp로 자연스럽게 복귀
      wheelTimeout = setTimeout(() => {
        smoothResetScrollVars();
      }, 1000);
    }
  },
  { passive: false },
);

// 터치 이벤트
let touchStartY = 0,
  touchEndY = 0;
let touchStartX = 0,
  touchEndX = 0;

document.addEventListener(
  "touchstart",
  (e) => {
    touchStartY = e.touches[0].clientY;
    touchStartX = e.touches[0].clientX;
  },
  { passive: true },
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!isFullscreen) {
      touchEndY = e.touches[0].clientY;
      touchEndX = e.touches[0].clientX;
    }
  },
  { passive: true },
);

document.addEventListener(
  "touchend",
  () => {
    if (isAnimating || isFullscreen) return;

    const deltaY = touchStartY - touchEndY;
    const deltaX = touchStartX - touchEndX;

    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 50) {
      navigateToCard(current + (deltaY > 0 ? 1 : -1));
    }

    touchStartY = touchEndY = touchStartX = touchEndX = 0;
  },
  { passive: true },
);

// 타이틀 업데이트
function updateTitle() {
  document.title = cards.map((_, i) => (i === current ? "■" : "□")).join("");
}

// 마우스 추적
document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

// 애니메이션 루프
function animateCardParallax() {
  // lerp 적용 (부드러운 보간)
  const lerpSpeed = 0.08;
  
  currentMouseX += (mouseX - currentMouseX) * 0.1;
  currentMouseY += (mouseY - currentMouseY) * 0.1;
  currentScrollY += (targetScrollY - currentScrollY) * lerpSpeed;
  currentScrollZ += (targetScrollZ - currentScrollZ) * lerpSpeed;
  currentScrollAmount += (targetScrollAmount - currentScrollAmount) * lerpSpeed;
  currentScrollDirection += (targetScrollDirection - currentScrollDirection) * lerpSpeed;
  currentTilt += (targetTilt - currentTilt) * lerpSpeed;

  const activeCard = cards[current];
  const prevCard = cards[current - 1];
  const nextCard = cards[current + 1];

  if (activeCard && !isAnimating && !isFullscreen) {
    const rect = activeCard.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const deltaX = currentMouseX - centerX;
    const deltaY = currentMouseY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const maxDist = Math.hypot(innerWidth, innerHeight) / 2;
    const ratio = Math.min(distance / maxDist, 1);
    const push = ratio * 50;

    const angle = Math.atan2(deltaY, deltaX);
    const moveX = -Math.cos(angle) * push;
    const moveY = -Math.sin(angle) * push;

    // 현재 카드 변환
    if (currentScrollDirection < -5) {
      // 위로 스크롤: Y 아래로, Z 앞으로, tilt -15도로 기울어짐
      activeCard.style.transform = `translateZ(${currentScrollZ}px) translate(${moveX}px, ${moveY + currentScrollY}px) rotateX(${currentTilt}deg)`;
      activeCard.style.transformOrigin = "center bottom";

      // 이전 카드도 Z와 Y 동작
      if (prevCard) {
        const prevZ = -100 + currentScrollAmount * 100; // -100 → 0
        const prevY = 60 - currentScrollAmount * 60; // 60% → 0%
        const prevScale = 0.5 + currentScrollAmount * 0.5; // 0.5 → 1
        prevCard.style.transform = `translateZ(${prevZ}px) translateY(${prevY}%) scale(${prevScale})`;
        prevCard.style.filter = `brightness(${0.9 + currentScrollAmount * 0.1})`;
      }
    } else if (currentScrollDirection > 5) {
      // 아래로 스크롤: 현재 카드가 뒤로 내려감
      activeCard.style.transform = `translateZ(${currentScrollZ}px) translate(${moveX}px, ${moveY + currentScrollY}px)`;
      activeCard.style.transformOrigin = "center center";
      activeCard.style.zIndex = "5";
      
      // 이전 카드 (더 뒤로)
      if (prevCard) {
        const prevZ = -100 - currentScrollAmount * 100;
        const prevY = 60 + currentScrollAmount * 10;
        const prevScale = 0.5 - currentScrollAmount * 0.1;
        prevCard.style.transform = `translateZ(${prevZ}px) translateY(${prevY}%) scale(${prevScale})`;
        prevCard.style.filter = `brightness(${0.9 - currentScrollAmount * 0.05})`;
        prevCard.style.zIndex = "3";
      }

      // 다음 카드: 아래에서 올라옴
      if (nextCard) {
        nextCard.style.zIndex = "15";
        nextCard.style.transformOrigin = "center bottom";
        
        if (currentScrollAmount < 0.15) {
          // 처음엔 안 보임 (화면 밖 아래쪽)
          nextCard.style.transform = `translateZ(300px) translateY(120%) scale(1.2)`;
          nextCard.style.visibility = "hidden";
        } else {
          // 0.15 이후: 아래에서 올라오면서 나타남
          const t = (currentScrollAmount - 0.15) / 0.85; // 0~1
          const nextZ = 300 * (1 - t); // 300 → 0
          const nextY = 120 * (1 - t); // 120% → 0%
          const nextScale = 1.2 - t * 0.2; // 1.2 → 1.0
          nextCard.style.transform = `translateZ(${nextZ}px) translateY(${nextY}%) scale(${nextScale})`;
          nextCard.style.visibility = "visible";
        }
      }
    } else {
      // 스크롤 없음: 기본 패럴랙스만 (currentScrollY 유지)
      activeCard.style.transform = `translateZ(${currentScrollZ}px) translate(${moveX}px, ${moveY + currentScrollY}px)`;
      activeCard.style.transformOrigin = "center center";
      activeCard.style.zIndex = "";

      // 다음 카드 인라인 스타일 정리 (깜빡임 방지)
      if (nextCard) {
        nextCard.style.visibility = "";
        nextCard.style.zIndex = "";
        nextCard.style.transform = "";
        nextCard.style.transformOrigin = "";
      }
      // 이전 카드 인라인 스타일 정리
      if (prevCard) {
        prevCard.style.transform = "";
        prevCard.style.filter = "";
      }
    }

    // 그림자
    const shadowX = Math.cos(angle) * 20 * ratio;
    const shadowY = Math.sin(angle) * 20 * ratio + 40;
    activeCard.style.boxShadow = `${shadowX}px ${shadowY}px 80px rgba(0,0,0,0.12), ${shadowX / 2}px ${shadowY / 2}px 30px rgba(0,0,0,0.08)`;
  }

  requestAnimationFrame(animateCardParallax);
}

// 초기화
createIndicator();
updateCardPositions();
updateTitle();
animateCardParallax();
