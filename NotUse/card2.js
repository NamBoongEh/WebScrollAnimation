/**
 * ========================================
 * card2.js - 비디오 그리드
 * ========================================
 */
window.Card2 = {
  card: null,
  items: [],
  isMuted: true,
  states: new Map(),

  init() {
    this.card = Utils.$('#card-2');
    this.items = Utils.$$('#video-grid .video-item');
    const muteBtn = Utils.$('#mute-btn');
    const muteIcon = Utils.$('#mute-icon');

    if (!this.card) return;

    this.items.forEach((item, i) => {
      this.states.set(i, { wasPlaying: false });
      const video = item.querySelector('video');
      
      if (!video) return;

      item.addEventListener('click', () => {
        if (!this.card.classList.contains('fullscreen')) return;
        
        if (video.paused) {
          video.muted = this.isMuted;
          video.play();
          item.classList.add('playing');
          this.states.get(i).wasPlaying = true;
        } else {
          video.pause();
          item.classList.remove('playing');
          this.states.get(i).wasPlaying = false;
        }
      });

      video.addEventListener('ended', () => {
        item.classList.remove('playing');
        video.currentTime = 0;
        this.states.get(i).wasPlaying = false;
      });
    });

    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        this.isMuted = !this.isMuted;
        muteBtn.classList.toggle('unmuted', !this.isMuted);
        muteIcon.textContent = this.isMuted ? '🔇' : '🔊';
        
        this.items.forEach(item => {
          const video = item.querySelector('video');
          if (video) video.muted = this.isMuted;
        });
      });
    }
  },

  pauseAll() {
    this.items.forEach((item, i) => {
      const video = item.querySelector('video');
      if (video && !video.paused) {
        video.pause();
        item.classList.remove('playing');
        this.states.get(i).wasPlaying = true;
      }
    });
  },

  resume() {
    setTimeout(() => {
      this.items.forEach((item, i) => {
        const video = item.querySelector('video');
        const state = this.states.get(i);
        if (video && state?.wasPlaying) {
          video.muted = this.isMuted;
          video.play();
          item.classList.add('playing');
        }
      });
    }, 600);
  }
};
