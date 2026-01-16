const cards = Array.from(document.querySelectorAll('.card'));
const indicator = document.querySelector('.indicator');
let current = 0;
let isAnimating = false;
let mouseX = 0;
let mouseY = 0;
let currentMouseX = 0;
let currentMouseY = 0;
let isFullscreen = false;

// 닫기 버튼 생성
const closeButton = document.createElement('button');
closeButton.className = 'close-button';
closeButton.textContent = '닫기';
document.body.appendChild(closeButton);

// 페이지 타이틀 생성 (네모 형태)
const pageTitlesContainer = document.createElement('div');
pageTitlesContainer.className = 'page-titles';
document.body.appendChild(pageTitlesContainer);

function createPageTitles() {
  pageTitlesContainer.innerHTML = '';
  for (let i = 0; i < cards.length; i++) {
    const titleEl = document.createElement('div');
    titleEl.className = 'page-title' + (i === current ? ' active' : '');
    titleEl.addEventListener('click', () => {
      if (!isFullscreen) navigateToCard(i);
    });
    pageTitlesContainer.appendChild(titleEl);
  }
}

function updatePageTitles() {
  Array.from(pageTitlesContainer.children).forEach((titleEl, i) => {
    titleEl.classList.toggle('active', i === current);
  });
}

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
    card.style.transform = '';
    
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

// 카드 클릭 이벤트 - 전체화면
cards.forEach((card, index) => {
  card.addEventListener('click', (e) => {
    if (index === current && !isFullscreen && !isAnimating) {
      e.stopPropagation();
      isFullscreen = true;
      card.classList.add('fullscreen');
      closeButton.classList.add('visible');
      document.body.style.overflow = 'hidden';
    }
  });
});

// 닫기 버튼 클릭
closeButton.addEventListener('click', () => {
  if (isFullscreen) {
    const activeCard = cards[current];
    activeCard.classList.add('closing');
    closeButton.classList.remove('visible');
    
    setTimeout(() => {
      activeCard.classList.remove('fullscreen', 'closing');
      isFullscreen = false;
      document.body.style.overflow = '';
    }, 500);
  }
});

// 네비게이션
function navigateToCard(nextIndex) {
  if (isAnimating || nextIndex < 0 || nextIndex >= cards.length || nextIndex === current || isFullscreen) {
    return;
  }

  isAnimating = true;
  const direction = nextIndex > current ? 'down' : 'up';
  const oldCurrent = current;
  current = nextIndex;

  if (direction === 'down') {
    // 아래로 스크롤: 현재 카드는 앞으로 나오며 위로 사라지고, 다음 카드는 위에서 내려옴 (거울모드)
    cards[oldCurrent].classList.add('animating-exit-forward-flip-down');
    cards[current].classList.add('animating-down-forward');
  } else {
    // 위로 스크롤: 현재 카드는 앞으로 넘어오며 아래로 사라지고, 이전 카드는 뒤에서 아래에서 올라옴
    cards[oldCurrent].classList.add('animating-exit-forward-flip');
    cards[current].classList.add('animating-up-behind');
  }

  setTimeout(() => {
    updateCardPositions();
    updatePageTitles();
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
createPageTitles();
updateCardPositions();
updatePageTitles();

// 마우스 추적 및 카드 반응
document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function animateCardParallax() {
  currentMouseX += (mouseX - currentMouseX) * 0.1;
  currentMouseY += (mouseY - currentMouseY) * 0.1;

  const activeCard = cards[current];
  if (activeCard && !isAnimating && !isFullscreen) {
    const rect = activeCard.getBoundingClientRect();
    const cardCenterX = rect.left + rect.width / 2;
    const cardCenterY = rect.top + rect.height / 2;

    const deltaX = currentMouseX - cardCenterX;
    const deltaY = currentMouseY - cardCenterY;

    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight) / 2;
    const normalizedDistance = Math.min(distance / maxDistance, 1);

    const moveX = -deltaX * 0.02 * normalizedDistance;
    const moveY = -deltaY * 0.02 * normalizedDistance;

    activeCard.style.transform = `translateZ(0px) translateY(0%) rotateX(0deg) rotateY(-5deg) scale(1) translate(${moveX}px, ${moveY}px)`;
  }

  requestAnimationFrame(animateCardParallax);
}

animateCardParallax();