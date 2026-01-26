// Card 1 내부 애니메이션
(function() {
  const card1 = document.getElementById('card-1');
  const humanImage = document.getElementById('human-image');
  const gridContainer = document.getElementById('grid-container-1');
  const gridItems = gridContainer ? gridContainer.querySelectorAll('.grid-item') : [];
  const popupOverlay = document.getElementById('popup-overlay');
  const popupClose = document.getElementById('popup-close');
  
  if (!card1 || !humanImage) return;
  
  // Human 위치 (비율로 저장 - 0~1) - 좌상단 버튼 피해서 위치
  let ratioX = 0.15;
  let ratioY = 0.15;
  let wasFullscreen = false;
  let isTransitioning = false;
  
  // human 위치 업데이트
  function updateHumanPosition() {
    const cardWidth = card1.offsetWidth;
    const cardHeight = card1.offsetHeight;
    const imageWidth = 80;
    const imageHeight = 80;
    
    const posX = ratioX * cardWidth - imageWidth / 2;
    const posY = ratioY * cardHeight - imageHeight / 2;
    
    humanImage.style.left = posX + 'px';
    humanImage.style.top = posY + 'px';
  }
  
  // fullscreen 상태 변화 감지
  function checkFullscreenChange() {
    const isCurrentlyFullscreen = card1.classList.contains('fullscreen');
    
    if (wasFullscreen !== isCurrentlyFullscreen) {
      isTransitioning = true;
      
      // 전환 시작: human 숨김
      humanImage.style.opacity = '0';
      
      // 애니메이션 완료 후: 위치 업데이트하고 표시
      setTimeout(() => {
        updateHumanPosition();
        humanImage.style.opacity = '1';
        isTransitioning = false;
      }, 650);
      
      wasFullscreen = isCurrentlyFullscreen;
    }
    
    requestAnimationFrame(checkFullscreenChange);
  }
  
  // 클릭 시 이미지가 클릭 위치로 이동
  card1.addEventListener('click', (e) => {
    // fullscreen 상태에서만 작동
    if (!card1.classList.contains('fullscreen')) return;
    if (isTransitioning) return;
    
    // 닫기 버튼 클릭은 무시
    if (e.target.closest('.close-button')) return;
    
    // 그리드 버튼 클릭은 무시
    if (e.target.closest('.grid-button')) return;
    
    // 뒤집힌 그리드 아이템의 뒷면 클릭은 무시
    const gridItem = e.target.closest('.grid-item');
    if (gridItem && gridItem.classList.contains('flipped')) return;
    
    const rect = card1.getBoundingClientRect();
    
    // 클릭 위치를 비율로 계산
    const newRatioX = (e.clientX - rect.left) / rect.width;
    const newRatioY = (e.clientY - rect.top) / rect.height;
    
    // 부드러운 이동
    animateToRatio(newRatioX, newRatioY);
  });
  
  // 비율 기준으로 부드럽게 이동
  function animateToRatio(targetRatioX, targetRatioY) {
    const startRatioX = ratioX;
    const startRatioY = ratioY;
    const duration = 300;
    const startTime = performance.now();
    
    function animate(currentTime) {
      if (isTransitioning) return;
      
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // easeOutCubic
      const ease = 1 - Math.pow(1 - progress, 3);
      
      ratioX = startRatioX + (targetRatioX - startRatioX) * ease;
      ratioY = startRatioY + (targetRatioY - startRatioY) * ease;
      
      updateHumanPosition();
      
      // 그리드 충돌 감지 (전환 중이 아닐 때만)
      if (card1.classList.contains('fullscreen') && !isTransitioning) {
        checkGridCollision();
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    }
    
    requestAnimationFrame(animate);
  }
  
  // 그리드 아이템과 human의 충돌 감지
  function checkGridCollision() {
    if (isTransitioning) return;
    
    const humanRect = humanImage.getBoundingClientRect();
    const humanCenterX = humanRect.left + humanRect.width / 2;
    const humanCenterY = humanRect.top + humanRect.height / 2;
    
    gridItems.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      
      const isOverlapping = 
        humanCenterX >= itemRect.left &&
        humanCenterX <= itemRect.right &&
        humanCenterY >= itemRect.top &&
        humanCenterY <= itemRect.bottom;
      
      if (isOverlapping) {
        item.classList.add('flipped');
      }
    });
  }
  
  // 그리드 버튼 클릭 시 팝업 열기
  gridItems.forEach((item, index) => {
    const button = item.querySelector('.grid-button');
    if (button) {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        openPopup(index);
      });
    }
  });
  
  // 팝업 열기
  function openPopup(index) {
    const popupContent = document.getElementById('popup-content');
    popupContent.querySelector('h2').textContent = `아이템 ${index + 1}`;
    popupContent.querySelector('p').textContent = `이것은 ${index + 1}번 아이템의 상세 내용입니다.`;
    popupOverlay.classList.add('active');
  }
  
  // 팝업 닫기
  if (popupClose) {
    popupClose.addEventListener('click', () => {
      popupOverlay.classList.remove('active');
    });
  }
  
  // 팝업 오버레이 클릭 시 닫기
  if (popupOverlay) {
    popupOverlay.addEventListener('click', (e) => {
      if (e.target === popupOverlay) {
        popupOverlay.classList.remove('active');
      }
    });
  }
  
  // 카드1 닫을 때 - 그리드 상태 유지
  window.resetCard1Grid = function() {
    // 상태 유지 - 초기화하지 않음
  };
  
  // 초기화
  updateHumanPosition();
  checkFullscreenChange();
})();
