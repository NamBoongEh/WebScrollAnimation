// Card 3 - 3D 나선형 계단 (1인칭 시점 - 계단 위에서 위를 올려다보는 시점)
(function() {
  const card3 = document.getElementById('card-3');
  const spiralContainer = document.getElementById('spiral-container');
  const spiralScene = document.getElementById('spiral-scene');
  const stairs = spiralContainer ? spiralContainer.querySelectorAll('.spiral-stair') : [];
  const spiralProgress = document.getElementById('spiral-progress');
  const particleContainer = document.getElementById('particle-container');
  const videoPopup = document.getElementById('card3-video-popup');
  const video = document.getElementById('card3-video');
  const videoClose = document.getElementById('card3-video-close');
  
  if (!card3 || !spiralContainer) return;
  
  let scrollProgress = 0;
  const maxScroll = 100;
  let hasExploded = false;
  const explodeThreshold = 85;
  
  // 계단 파라미터
  const stairHeight = 80; // 각 계단 높이 차이
  const stairRadius = 250; // 나선 반경
  const anglePerStair = 35; // 계단당 회전 각도
  
  // 초기화
  function initSpiralStairs() {
    stairs.forEach((stair, index) => {
      stair.dataset.baseAngle = index * anglePerStair;
      stair.dataset.baseHeight = index * stairHeight;
    });
    updateFirstPersonView();
  }
  
  // 1인칭 시점 업데이트 - 내가 계단 위에 서서 위를 올려다보는 시점
  function updateFirstPersonView() {
    // 내 현재 위치 (높이와 각도)
    const totalStairs = stairs.length;
    const myHeight = (scrollProgress / 100) * totalStairs * stairHeight;
    const myAngle = (scrollProgress / 100) * totalStairs * anglePerStair;
    
    stairs.forEach((stair, index) => {
      const stairAngle = parseFloat(stair.dataset.baseAngle);
      const stairBaseHeight = parseFloat(stair.dataset.baseHeight);
      
      // 내 시점 기준 상대 위치
      const relativeAngle = stairAngle - myAngle;
      const relativeHeight = stairBaseHeight - myHeight;
      
      // 라디안 변환
      const rad = (relativeAngle * Math.PI) / 180;
      
      // 1인칭 좌표 계산
      // x: 좌우 위치 (나선 회전에 따라)
      // y: 위아래 (내 눈높이 기준, 위에 있는 계단은 음수 = 화면 위쪽)
      // z: 앞뒤 (멀면 음수)
      const x = Math.sin(rad) * stairRadius;
      const y = -relativeHeight + 100; // 내 눈높이보다 위에 있으면 화면 위쪽
      const z = Math.cos(rad) * stairRadius - 100;
      
      // 위에 있는 모든 계단 보이게 (내 발 아래 계단만 안 보임)
      const isAbove = relativeHeight > -30;
      
      // 거리에 따른 스케일
      const distance = Math.sqrt(x*x + y*y + z*z);
      const scale = Math.max(0.2, Math.min(1.2, 300 / (distance + 100)));
      
      // 투명도 (위에 있는 건 모두 보임, 아래에 있는 건 안 보임)
      let opacity = 0;
      if (isAbove) {
        opacity = Math.max(0.3, Math.min(1, 1 - distance / 1200));
      }
      
      stair.style.transform = `
        translate3d(${x}px, ${y}px, ${z}px)
        rotateY(${-relativeAngle}deg)
        scale(${scale})
      `;
      stair.style.opacity = opacity;
      stair.style.zIndex = Math.round(500 - z);
      
      // 액자 클릭 가능 여부 (가까이 있고 잘 보이는 것만)
      const frame = stair.querySelector('.stair-frame');
      if (frame) {
        const isClickable = opacity > 0.4 && relativeHeight > 0 && relativeHeight < 250;
        frame.style.pointerEvents = isClickable ? 'auto' : 'none';
      }
    });
    
    // 진행률 표시
    if (spiralProgress) {
      const floor = Math.floor((scrollProgress / 100) * stairs.length) + 1;
      spiralProgress.textContent = `${floor}F`;
    }
    
    // 파티클 터짐
    if (scrollProgress >= explodeThreshold && !hasExploded) {
      hasExploded = true;
      createParticleExplosion();
    }
    
    if (scrollProgress < explodeThreshold - 10) {
      hasExploded = false;
    }
  }
  
  // 파티클 폭발
  function createParticleExplosion() {
    const colors = ['#d4af37', '#f4d03f', '#667eea', '#764ba2', '#8b7355', '#fff'];
    const particleCount = 100;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      
      const size = Math.random() * 15 + 5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const startX = window.innerWidth / 2;
      const startY = window.innerHeight * 0.3;
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * 500 + 100;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance;
      
      particle.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${startX}px;
        top: ${startY}px;
        --tx: ${tx}px;
        --ty: ${ty}px;
        box-shadow: 0 0 ${size * 2}px ${color};
      `;
      
      particleContainer.appendChild(particle);
      setTimeout(() => particle.remove(), 1500);
    }
  }
  
  // 비디오 팝업
  function openVideoPopup(videoSrc) {
    if (video && videoSrc) {
      video.src = videoSrc;
      video.load();
      videoPopup.classList.add('active');
      video.play();
    }
  }
  
  function closeVideoPopup() {
    videoPopup.classList.remove('active');
    if (video) {
      video.pause();
      video.src = '';
    }
  }
  
  // 액자 클릭
  stairs.forEach((stair) => {
    const frame = stair.querySelector('.stair-frame');
    if (frame) {
      frame.addEventListener('click', (e) => {
        e.stopPropagation();
        const videoSrc = frame.dataset.video;
        openVideoPopup(videoSrc);
      });
    }
  });
  
  // 팝업 닫기
  if (videoClose) {
    videoClose.addEventListener('click', closeVideoPopup);
  }
  
  if (videoPopup) {
    videoPopup.addEventListener('click', (e) => {
      if (e.target === videoPopup) closeVideoPopup();
    });
  }
  
  // 휠 이벤트
  function handleWheel(e) {
    if (!card3.classList.contains('fullscreen')) return;
    if (videoPopup.classList.contains('active')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // 휠 아래 = 계단 올라감
    const delta = e.deltaY > 0 ? 1.5 : -1.5;
    scrollProgress = Math.max(0, Math.min(maxScroll, scrollProgress + delta));
    
    updateFirstPersonView();
  }
  
  card3.addEventListener('wheel', handleWheel, { passive: false });
  
  // 터치 이벤트 (모바일)
  let touchStartY = 0;
  let touchCurrentY = 0;
  let isTouching = false;
  
  card3.addEventListener('touchstart', (e) => {
    if (!card3.classList.contains('fullscreen')) return;
    if (videoPopup.classList.contains('active')) return;
    
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
    isTouching = true;
  }, { passive: true });
  
  card3.addEventListener('touchmove', (e) => {
    if (!card3.classList.contains('fullscreen')) return;
    if (videoPopup.classList.contains('active')) return;
    if (!isTouching) return;
    
    const newY = e.touches[0].clientY;
    const deltaY = touchCurrentY - newY;
    touchCurrentY = newY;
    
    // 드래그 방향에 따라 스크롤
    const delta = deltaY * 0.3;
    scrollProgress = Math.max(0, Math.min(maxScroll, scrollProgress + delta));
    
    updateFirstPersonView();
  }, { passive: true });
  
  card3.addEventListener('touchend', () => {
    isTouching = false;
  }, { passive: true });
  
  // ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && videoPopup.classList.contains('active')) {
      closeVideoPopup();
    }
  });
  
  // 초기화
  initSpiralStairs();
  
  window.initCard3 = function() {
    scrollProgress = 0;
    hasExploded = false;
    updateFirstPersonView();
  };
  
  window.stopCard3Video = closeVideoPopup;
})();
