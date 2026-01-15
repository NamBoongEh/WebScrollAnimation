const cards = Array.from(document.querySelectorAll('.card'));
const indicator = document.querySelector('.indicator');
let current = 0;
let isAnimating = false;

// 인디케이터 생성
function createIndicator() {
  indicator.innerHTML = '';
  cards.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'dot' + (i === current ? ' active' : '');
    dot.addEventListener('click', () => navigateToCard(i));
    indicator.appendChild(dot);
  });
}

// 카드 위치 업데이트
function updateCardPositions() {
  cards.forEach((card, i) => {
    // 모든 애니메이션 클래스 제거
    card.className = 'card';
    
    const diff = i - current;
    
    if (diff === 0) {
      card.classList.add('active');
    } else if (diff === 1) {
      card.classList.add('next-1');
    } else if (diff === 2) {
      card.classList.add('next-2');
    } else if (diff >= 3) {
      card.classList.add('next-3');
    } else if (diff === -1) {
      card.classList.add('prev-1');
    } else if (diff <= -2) {
      card.classList.add('prev-2');
    }
  });

  // 인디케이터 업데이트
  Array.from(indicator.children).forEach((dot, i) => {
    dot.classList.toggle('active', i === current);
  });
}

// 네비게이션
function navigateToCard(nextIndex) {
  if (isAnimating || nextIndex < 0 || nextIndex >= cards.length || nextIndex === current) {
    return;
  }

  isAnimating = true;
  const direction = nextIndex > current ? 'down' : 'up';
  const oldCurrent = current;
  current = nextIndex;

  if (direction === 'down') {
    // 아래로 스크롤: 현재 카드는 앞으로 넘어오며 위로 사라지고, 다음 카드는 위에서 내려옴
    cards[oldCurrent].classList.add('animating-exit-forward-flip-up');
    cards[current].classList.add('animating-down-behind');
  } else {
    // 위로 스크롤: 현재 카드는 앞으로 넘어오며 아래로 사라지고, 이전 카드는 아래에서 올라옴
    cards[oldCurrent].classList.add('animating-exit-forward-flip');
    cards[current].classList.add('animating-up-behind');
  }

  setTimeout(() => {
    updateCardPositions();
    isAnimating = false;
  }, 600);
}

// 키보드 네비게이션
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    navigateToCard(Math.min(current + 1, cards.length - 1));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    navigateToCard(Math.max(current - 1, 0));
  }
});

// 마우스 휠 네비게이션 (높은 감도)
let wheelAccumulator = 0;
const wheelThreshold = 25; // 낮은 값 = 높은 감도

document.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  wheelAccumulator += Math.abs(e.deltaY);
  
  if (wheelAccumulator >= wheelThreshold && !isAnimating) {
    if (e.deltaY > 0) {
      navigateToCard(Math.min(current + 1, cards.length - 1));
    } else {
      navigateToCard(Math.max(current - 1, 0));
    }
    wheelAccumulator = 0;
  }
}, { passive: false });

// 초기화
createIndicator();
updateCardPositions();