// Card 2 내부 애니메이션 - 비디오 그리드
(function() {
  const card2 = document.getElementById('card-2');
  const gridContainer = document.getElementById('grid-container-2');
  const videoItems = gridContainer ? gridContainer.querySelectorAll('.video-item') : [];
  const muteButton = document.getElementById('mute-button');
  const muteIcon = document.getElementById('mute-icon');
  
  // 전역 음소거 상태 (기본: 음소거)
  let isMuted = true;
  
  if (!card2 || !gridContainer) return;
  
  // 비디오 아이템 클릭 시 뒤집고 재생
  videoItems.forEach((item) => {
    const video = item.querySelector('.grid-video');
    
    if (!video) return;
    
    // 아이템 클릭 시 뒤집고 재생
    item.addEventListener('click', (e) => {
      if (!card2.classList.contains('fullscreen')) return;
      
      // 이미 재생 중이면 무시
      if (item.classList.contains('flipped') && !video.paused) return;
      
      // 뒤집기
      item.classList.add('flipped');
      
      // 음소거 상태 적용 후 재생
      video.muted = isMuted;
      video.currentTime = 0;
      video.play();
    });
    
    // 영상 끝나면 다시 뒤집기
    video.addEventListener('ended', () => {
      item.classList.remove('flipped');
      video.currentTime = 0;
    });
  });
  
  // 음소거 버튼 클릭
  if (muteButton) {
    muteButton.addEventListener('click', () => {
      isMuted = !isMuted;
      
      // 버튼 UI 업데이트
      if (isMuted) {
        muteButton.classList.remove('unmuted');
        muteIcon.textContent = '🔇';
      } else {
        muteButton.classList.add('unmuted');
        muteIcon.textContent = '🔊';
      }
      
      // 현재 재생 중인 모든 비디오에 적용
      videoItems.forEach((item) => {
        const video = item.querySelector('.grid-video');
        if (video) {
          video.muted = isMuted;
        }
      });
    });
  }
})();
