// Card 1 내부 애니메이션
(function() {
  const card1 = document.getElementById('card-1');
  const humanImage = document.getElementById('human-image');
  const gridContainer = document.getElementById('grid-container-1');
  const gridItems = gridContainer ? gridContainer.querySelectorAll('.grid-item') : [];
  const popupOverlay = document.getElementById('popup-overlay');
  const popupClose = document.getElementById('popup-close');
  
  if (!card1 || !humanImage) return;
  
  // Human 위치 (비율로 저장 - 0~1) - 버튼 없는 최상단 영역에 위치
  let ratioX = 0.50;
  let ratioY = 0.08;
  let wasFullscreen = false;
  let isTransitioning = false;
  
  // human 위치를 퍼센트로 설정 (CSS가 자동으로 처리)
  function updateHumanPositionPercent() {
    // 퍼센트 기반으로 설정 - 이미지 중심이 해당 비율에 위치하도록
    // left, top을 퍼센트로, transform으로 중앙 정렬
    humanImage.style.left = (ratioX * 100) + '%';
    humanImage.style.top = (ratioY * 100) + '%';
    humanImage.style.transform = 'translate(-50%, -50%)';
  }
  
  // fullscreen 상태 변화 감지
  function checkFullscreenChange() {
    const isCurrentlyFullscreen = card1.classList.contains('fullscreen');
    
    if (wasFullscreen !== isCurrentlyFullscreen) {
      isTransitioning = true;
      
      // 애니메이션 완료 후
      setTimeout(() => {
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
    
    const rect = card1.getBoundingClientRect();
    
    // 클릭 위치를 비율로 계산
    const newRatioX = (e.clientX - rect.left) / rect.width;
    const newRatioY = (e.clientY - rect.top) / rect.height;
    
    // 부드러운 이동
    startLerpToPosition(newRatioX, newRatioY);
  });
  
  // Lerp 애니메이션 변수
  let targetRatioX = ratioX;
  let targetRatioY = ratioY;
  let isLerping = false;
  const lerpSpeed = 0.08; // lerp 속도 (0~1, 작을수록 부드러움)
  
  // Lerp로 부드럽게 이동
  function startLerpToPosition(newTargetX, newTargetY) {
    targetRatioX = newTargetX;
    targetRatioY = newTargetY;
    
    if (!isLerping) {
      isLerping = true;
      lerpAnimation();
    }
  }
  
  function lerpAnimation() {
    if (isTransitioning) {
      isLerping = false;
      return;
    }
    
    // Lerp 계산
    const diffX = targetRatioX - ratioX;
    const diffY = targetRatioY - ratioY;
    
    // 목표에 거의 도달했으면 종료
    if (Math.abs(diffX) < 0.001 && Math.abs(diffY) < 0.001) {
      ratioX = targetRatioX;
      ratioY = targetRatioY;
      updateHumanPositionPercent();
      isLerping = false;
      return;
    }
    
    // Lerp 적용
    ratioX += diffX * lerpSpeed;
    ratioY += diffY * lerpSpeed;
    
    updateHumanPositionPercent();
    
    // 그리드 충돌 감지 (전환 중이 아닐 때만)
    if (card1.classList.contains('fullscreen') && !isTransitioning) {
      checkGridCollision();
    }
    
    requestAnimationFrame(lerpAnimation);
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
  updateHumanPositionPercent();
  checkFullscreenChange();
})();
