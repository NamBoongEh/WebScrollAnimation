const cards = Array.from(document.querySelectorAll('.card'));
const indicator = document.querySelector('.indicator');
const closeButtons = document.querySelectorAll('.close-button');
let current = 0;
let isAnimating = false;
let mouseX = 0;
let mouseY = 0;
let currentMouseX = 0;
let currentMouseY = 0;
let isFullscreen = false;

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

// 전체화면 진입 시 히스토리 추가
function enterFullscreen(card) {
  isFullscreen = true;
  
  // 현재 카드의 위치와 크기 저장
  const rect = card.getBoundingClientRect();
  
  // 카드를 body로 이동시켜서 card-stack의 transform 영향을 받지 않도록 함
  document.body.appendChild(card);
  
  // 현재 위치에서 시작하도록 설정
  card.style.position = 'fixed';
  card.style.top = rect.top + 'px';
  card.style.left = rect.left + 'px';
  card.style.width = rect.width + 'px';
  card.style.height = rect.height + 'px';
  card.style.transition = 'none';
  
  // 강제 reflow
  card.offsetHeight;
  
  // 애니메이션 시작
  card.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
  card.style.top = '0';
  card.style.left = '0';
  card.style.width = '100vw';
  card.style.height = '100vh';
  card.style.borderRadius = '0';
  card.classList.add('fullscreen');
  
  document.body.style.overflow = 'hidden';
  // 히스토리에 상태 추가
  window.history.pushState({ fullscreen: true }, '');
}

// 전체화면 해제 함수
function exitFullscreen() {
  const activeCard = cards[current];
  const cardStack = document.querySelector('.card-stack');
  const stackRect = cardStack.getBoundingClientRect();
  
  // 목표 위치 계산 (card-stack 중앙)
  const targetWidth = stackRect.width;
  const targetHeight = stackRect.height;
  const targetTop = stackRect.top;
  const targetLeft = stackRect.left;
  
  // 축소 애니메이션
  activeCard.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
  activeCard.style.top = targetTop + 'px';
  activeCard.style.left = targetLeft + 'px';
  activeCard.style.width = targetWidth + 'px';
  activeCard.style.height = targetHeight + 'px';
  activeCard.style.borderRadius = '24px';
  
  setTimeout(() => {
    activeCard.classList.remove('fullscreen');
    activeCard.style.position = '';
    activeCard.style.top = '';
    activeCard.style.left = '';
    activeCard.style.width = '';
    activeCard.style.height = '';
    activeCard.style.borderRadius = '';
    activeCard.style.transition = '';
    
    // 카드를 다시 card-stack으로 이동
    cardStack.appendChild(activeCard);
    
    isFullscreen = false;
    document.body.style.overflow = '';
    
    // 카드 위치 재설정
    updateCardPositions();
  }, 600);
}

// 카드 클릭 이벤트 - 전체화면
cards.forEach((card, index) => {
  card.addEventListener('click', (e) => {
    if (index === current && !isFullscreen && !isAnimating) {
      e.stopPropagation();
      enterFullscreen(card);
    }
  });
});

// 뒤로가기 버튼 클릭 - 브라우저 뒤로가기
closeButtons.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isFullscreen) {
      // 브라우저 뒤로가기 실행
      window.history.back();
    }
  });
});

// 브라우저 뒤로가기 시 전체화면 해제 처리
window.addEventListener('popstate', () => {
  if (isFullscreen) {
    exitFullscreen();
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
    // 아래로 스크롤(휠 내릴때): 현재 카드는 뒤 아래로 작아지며, 다음 카드는 앞에서 기울어진채 올라옴
    cards[oldCurrent].classList.add('animating-exit-down');
    cards[current].classList.add('animating-enter-from-bottom');
  } else {
    // 위로 스크롤(휠 올릴때): 현재 카드는 아래로 기울어지며 내려가고, 이전 카드는 위로 올라오며 펴짐
    cards[oldCurrent].classList.add('animating-exit-down-tilt');
    cards[current].classList.add('animating-enter-from-top');
  }

  setTimeout(() => {
    updateCardPositions();
    isAnimating = false;
  }, 700);
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
