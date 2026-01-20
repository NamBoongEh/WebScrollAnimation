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
    } else if (diff === -1) {
      // 바로 이전 카드 (현재 카드 뒤에 보임)
      card.classList.add('prev-1');
    } else if (diff <= -2) {
      // 그 이전 카드들 (안 보임)
      card.classList.add('prev-2');
    } else if (diff >= 1) {
      // 다음 카드들 (안 보임)
      card.classList.add('next-hidden');
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
    // 아래로 스크롤(휠 내릴때)
    // 현재 카드 → prev-1 위치로 내려감
    cards[oldCurrent].classList.add('animating-exit-down');
    // 다음 카드 → active 위치로 올라옴
    cards[current].classList.add('animating-enter-from-bottom');
    // 이전 카드(있다면) → prev-2 위치로 더 내려감
    if (oldCurrent > 0) {
      cards[oldCurrent - 1].classList.add('animating-prev-exit');
    }
  } else {
    // 위로 스크롤(휠 올릴때)
    // 현재 카드 → 아래로 내려가며 사라짐
    cards[oldCurrent].classList.add('animating-exit-down-tilt');
    // 이전 카드 → active 위치로 올라옴
    cards[current].classList.add('animating-enter-from-top');
    // 그 이전 카드(있다면) → prev-1 위치로 올라옴
    if (current > 0) {
      cards[current - 1].classList.add('animating-prev-enter');
    }
  }

  setTimeout(() => {
    updateCardPositions();
    updateTitle();
    isAnimating = false;
  }, 1000);
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

// 마우스 휠 네비게이션
document.addEventListener('wheel', (e) => {
  e.preventDefault();
  
  if (isAnimating || isFullscreen) return;
  
  if (e.deltaY > 0) {
    navigateToCard(Math.min(current + 1, cards.length - 1));
  } else if (e.deltaY < 0) {
    navigateToCard(Math.max(current - 1, 0));
  }
}, { passive: false });

// 초기화
createIndicator();
updateCardPositions();
updateTitle();

// 타이틀 업데이트 함수
function updateTitle() {
  const boxes = cards.map((_, i) => i === current ? '■' : '□');
  document.title = boxes.join('');
}

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

    // 마우스와 카드 중심 사이의 거리 계산
    const deltaX = currentMouseX - cardCenterX;
    const deltaY = currentMouseY - cardCenterY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 최대 거리 (화면 대각선의 절반)
    const maxDistance = Math.sqrt(window.innerWidth * window.innerWidth + window.innerHeight * window.innerHeight) / 2;
    
    // 거리가 멀수록 강하게, 가까울수록 약하게
    const distanceRatio = Math.min(distance / maxDistance, 1);
    const pushStrength = distanceRatio * 50; // 최대 50px 밀림
    
    // 마우스 반대 방향으로 밀려남
    const angle = Math.atan2(deltaY, deltaX);
    const moveX = -Math.cos(angle) * pushStrength;
    const moveY = -Math.sin(angle) * pushStrength;

    activeCard.style.transform = `translateZ(0px) translate(${moveX}px, ${moveY}px) scale(1)`;
    
    // 그림자도 밀리는 방향으로 변화
    const shadowX = Math.cos(angle) * 20 * distanceRatio;
    const shadowY = Math.sin(angle) * 20 * distanceRatio + 40;
    activeCard.style.boxShadow = `${shadowX}px ${shadowY}px 80px rgba(0, 0, 0, 0.12), ${shadowX/2}px ${shadowY/2}px 30px rgba(0, 0, 0, 0.08)`;
  }

  requestAnimationFrame(animateCardParallax);
}

animateCardParallax();
