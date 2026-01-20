// Card 1 내부 애니메이션
(function() {
  const card1 = document.getElementById('card-1');
  const humanImage = document.getElementById('human-image');
  const gridContainer = document.getElementById('grid-container-1');
  const gridItems = gridContainer ? gridContainer.querySelectorAll('.grid-item') : [];
  const popupOverlay = document.getElementById('popup-overlay');
  const popupClose = document.getElementById('popup-close');
  
  if (!card1 || !humanImage) return;
  
  // Human 위치 (비율로 저장 - 0~1)
  let humanPosRatioX = 0.5;
  let humanPosRatioY = 0.3;
  let targetRatioX = 0.5;
  let targetRatioY = 0.3;
  
  // 클릭 시 이미지가 클릭 위치로 이동
  card1.addEventListener('click', (e) => {
    // fullscreen 상태에서만 작동
    if (!card1.classList.contains('fullscreen')) return;
    
    // 닫기 버튼, 그리드 버튼 클릭은 무시
    if (e.target.classList.contains('close-button')) return;
    if (e.target.classList.contains('grid-button')) return;
    
    const rect = card1.getBoundingClientRect();
    
    // 클릭 위치를 비율로 저장 (0~1)
    targetRatioX = (e.clientX - rect.left) / rect.width;
    targetRatioY = (e.clientY - rect.top) / rect.height;
  });
  
  // Human 위치를 비율 기반으로 계산
  function updateHumanPosition() {
    // 부드러운 이동
    humanPosRatioX += (targetRatioX - humanPosRatioX) * 0.08;
    humanPosRatioY += (targetRatioY - humanPosRatioY) * 0.08;
    
    const rect = card1.getBoundingClientRect();
    const imageWidth = humanImage.offsetWidth;
    const imageHeight = humanImage.offsetHeight;
    
    // 비율을 실제 픽셀 위치로 변환
    const posX = humanPosRatioX * rect.width - imageWidth / 2;
    const posY = humanPosRatioY * rect.height - imageHeight / 2;
    
    humanImage.style.left = posX + 'px';
    humanImage.style.top = posY + 'px';
    
    // 그리드 아이템과의 충돌 감지 (fullscreen일 때만)
    if (card1.classList.contains('fullscreen')) {
      checkGridCollision();
    }
    
    requestAnimationFrame(updateHumanPosition);
  }
  
  // 그리드 아이템과 human의 충돌 감지 - 한번 뒤집히면 유지
  function checkGridCollision() {
    const humanRect = humanImage.getBoundingClientRect();
    const humanCenterX = humanRect.left + humanRect.width / 2;
    const humanCenterY = humanRect.top + humanRect.height / 2;
    
    gridItems.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      
      // human 중심이 그리드 아이템 위에 있는지 확인
      const isOverlapping = 
        humanCenterX >= itemRect.left &&
        humanCenterX <= itemRect.right &&
        humanCenterY >= itemRect.top &&
        humanCenterY <= itemRect.bottom;
      
      // 한번 뒤집히면 계속 유지 (떠나도 원래대로 안 돌아감)
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
  
  // 초기화
  updateHumanPosition();
})();
