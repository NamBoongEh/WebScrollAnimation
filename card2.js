// Card 2 내부 애니메이션 - 비디오 그리드
(function() {
  const card2 = document.getElementById('card-2');
  const gridContainer = document.getElementById('grid-container-2');
  const videoItems = gridContainer ? gridContainer.querySelectorAll('.video-item') : [];
  const muteButton = document.getElementById('mute-button');
  const muteIcon = document.getElementById('mute-icon');
  
  // 전역 음소거 상태 (기본: 음소거)
  let isMuted = true;
  
  // 각 비디오의 재생 상태 저장
  const videoStates = new Map();
  
  if (!card2 || !gridContainer) return;
  
  // 비디오 아이템 클릭 시 바로 재생/일시정지
  videoItems.forEach((item, index) => {
    const video = item.querySelector('.grid-video');
    
    if (!video) return;
    
    // 초기 상태 저장
    videoStates.set(index, { wasPlaying: false });
    
    // 아이템 클릭 시 재생/일시정지 토글
    item.addEventListener('click', (e) => {
      if (!card2.classList.contains('fullscreen')) return;
      
      // 재생 중이면 일시정지, 아니면 재생
      if (video.paused) {
        video.muted = isMuted;
        video.play();
        item.classList.add('playing');
        videoStates.get(index).wasPlaying = true;
      } else {
        video.pause();
        item.classList.remove('playing');
        videoStates.get(index).wasPlaying = false;
      }
    });
    
    // 영상 끝나면 처음으로
    video.addEventListener('ended', () => {
      item.classList.remove('playing');
      video.currentTime = 0;
      videoStates.get(index).wasPlaying = false;
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
  
  // 카드 닫기 시 모든 비디오 일시정지 (위치는 유지)
  window.pauseAllCard2Videos = function() {
    videoItems.forEach((item, index) => {
      const video = item.querySelector('.grid-video');
      if (video && !video.paused) {
        video.pause();
        item.classList.remove('playing');
        videoStates.get(index).wasPlaying = true;
      }
    });
  };
  
  // 카드 다시 열 때 재생 중이던 비디오 이어서 재생
  window.resumeCard2Videos = function() {
    videoItems.forEach((item, index) => {
      const video = item.querySelector('.grid-video');
      const state = videoStates.get(index);
      if (video && state && state.wasPlaying) {
        video.muted = isMuted;
        video.play();
        item.classList.add('playing');
      }
    });
  };
})();
