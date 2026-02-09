/**
 * ========================================
 * script.js - Main Page Controller
 * ========================================
 * 카드 스택 네비게이션, 풀스크린, 패럴랙스, 팝업 관리
 */

// ========================================
// Utils (전역 공유 - card*.js에서도 접근)
// ========================================
var Utils = {
  $(selector) { return document.querySelector(selector); },
  $$(selector) { return document.querySelectorAll(selector); },
  lerp(start, end, factor) { return start + (end - start) * factor; },
  clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
};

// ========================================
// Popup
// ========================================
var Popup = {
  overlay: null,
  title: null,
  desc: null,

  init() {
    this.overlay = Utils.$('#popup-overlay');
    this.title = Utils.$('#popup-title');
    this.desc = Utils.$('#popup-desc');

    Utils.$('#popup-close')?.addEventListener('click', () => this.close());
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
  },

  open(title, desc) {
    if (this.title) this.title.textContent = title;
    if (this.desc) this.desc.textContent = desc;
    this.overlay?.classList.add('active');
  },

  close() {
    this.overlay?.classList.remove('active');
  }
};

// ========================================
// Video Popup
// ========================================
var VideoPopup = {
  popup: null,
  video: null,

  init() {
    this.popup = Utils.$('#video-popup');
    this.video = Utils.$('#popup-video');

    Utils.$('#video-close')?.addEventListener('click', () => this.close());
    this.popup?.addEventListener('click', (e) => {
      if (e.target === this.popup) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });
  },

  open(src) {
    if (this.video) {
      this.video.src = src;
      this.popup?.classList.add('active');
      this.video.play();
    }
  },

  close() {
    this.popup?.classList.remove('active');
    if (this.video) {
      this.video.pause();
      this.video.src = '';
    }
  }
};

// ========================================
// App: Main Controller
// ========================================
var App = {
  cards: [],
  indicator: null,
  current: 0,
  isAnimating: false,
  isFullscreen: false,
  
  // Scroll state
  scroll: {
    accumulator: 0,
    threshold: 250,
    timeout: null,
    targetY: 0, currentY: 0,
    targetZ: 0, currentZ: 0,
    targetScale: 1, currentScale: 1,
    amount: 0, currentAmount: 0,
    direction: 0, currentDirection: 0
  },
  
  // Mouse state
  mouse: { x: 0, y: 0, currentX: 0, currentY: 0 },

  init() {
    this.cards = Array.from(Utils.$$('.card'));
    this.indicator = Utils.$('#indicator');
    this.cardStack = Utils.$('.card-stack');
    
    this.createIndicator();
    this.bindEvents();
    this.updatePositions();
    this.updateTitle();
    this.animate();
  },

  createIndicator() {
    this.indicator.innerHTML = '';
    this.cards.forEach((_, i) => {
      const dot = document.createElement('span');
      dot.className = 'dot' + (i === this.current ? ' active' : '');
      dot.onclick = () => this.navigateTo(i);
      this.indicator.appendChild(dot);
    });
  },

  updatePositions() {
    this.cards.forEach((card, i) => {
      card.className = 'card';
      card.style.cssText = '';
      
      const diff = i - this.current;
      if (diff === 0) card.classList.add('active');
      else if (diff === -1) card.classList.add('prev-1');
      else if (diff <= -2) card.classList.add('prev-2');
      else card.classList.add('next-hidden');
    });
    
    this.indicator.querySelectorAll('.dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === this.current);
    });
  },

  updateTitle() {
    document.title = this.cards.map((_, i) => i === this.current ? '■' : '□').join('');
  },

  bindEvents() {
    // Card clicks
    this.cards.forEach((card, i) => {
      card.addEventListener('click', (e) => {
        if (i === this.current && !this.isFullscreen && !this.isAnimating) {
          e.stopPropagation();
          this.enterFullscreen(card);
        }
      });
    });

    // Close buttons
    Utils.$$('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.isFullscreen) history.back();
      });
    });

    // Browser back
    window.addEventListener('popstate', () => {
      if (this.isFullscreen) this.exitFullscreen();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); this.navigateTo(this.current + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); this.navigateTo(this.current - 1); }
    });

    // Mouse tracking
    document.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });

    // Wheel
    document.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

    // Touch
    let touchStartY = 0;
    document.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (this.isAnimating || this.isFullscreen) return;
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      if (Math.abs(deltaY) > 50) this.navigateTo(this.current + (deltaY > 0 ? 1 : -1));
    }, { passive: true });
  },

  handleWheel(e) {
    e.preventDefault();
    if (this.isAnimating || this.isFullscreen) return;

    this.scroll.accumulator += e.deltaY * 0.8;
    const absScroll = Math.abs(this.scroll.accumulator);
    const progress = absScroll / this.scroll.threshold;

    if (this.scroll.accumulator > 0) {
      this.scroll.targetY = absScroll * 0.4;
      this.scroll.targetZ = -absScroll * 1.2;
      this.scroll.targetScale = 1 - progress * 0.08;
    } else {
      this.scroll.targetY = absScroll * 0.5;
      this.scroll.targetZ = absScroll * 1.5;
      this.scroll.targetScale = 1;
    }
    this.scroll.amount = progress;
    this.scroll.direction = this.scroll.accumulator;

    clearTimeout(this.scroll.timeout);

    if (absScroll > this.scroll.threshold) {
      const dir = this.scroll.accumulator > 0 ? 1 : -1;
      this.resetScroll();
      this.navigateTo(this.current + dir);
    } else {
      this.scroll.timeout = setTimeout(() => this.resetScroll(), 800);
    }
  },

  resetScroll() {
    this.scroll.accumulator = 0;
    this.scroll.targetY = this.scroll.targetZ = 0;
    this.scroll.targetScale = 1;
    this.scroll.amount = this.scroll.direction = 0;
    // currentAmount/currentDirection은 lerp로 자연스럽게 0으로 수렴
  },

  navigateTo(index) {
    if (this.isAnimating || index < 0 || index >= this.cards.length || index === this.current || this.isFullscreen) return;

    this.isAnimating = true;
    const direction = index > this.current ? 'down' : 'up';
    const oldIndex = this.current;
    this.current = index;

    const oldCard = this.cards[oldIndex];
    const newCard = this.cards[index];
    const prevOfOld = this.cards[oldIndex - 1];

    const transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';

    if (direction === 'down') {
      // 현재 카드는 뒤로 밀려남
      oldCard.style.transition = transition;
      oldCard.style.transform = 'translateZ(-100px) translateY(60%) scale(0.5)';
      oldCard.style.filter = 'brightness(0.9)';
      oldCard.style.zIndex = '5';

      // 다음 카드: 스크롤 미리보기로 이미 일부 보이는 상태일 수 있음
      // 현재 위치에서 바로 최종 위치로 이동 (초기 위치로 리셋하지 않음)
      newCard.style.visibility = 'visible';
      newCard.style.opacity = '1';
      newCard.style.zIndex = '15';
      newCard.style.transition = transition;
      newCard.style.transform = 'translateZ(0) translateY(0) scale(1)';

      if (prevOfOld) {
        prevOfOld.style.transition = transition;
        prevOfOld.style.transform = 'translateZ(-200px) translateY(70%) scale(0.4)';
        prevOfOld.style.visibility = 'hidden';
      }
    } else {
      oldCard.style.transition = transition;
      oldCard.style.transform = 'translateZ(150px) translateY(100%) rotateX(-30deg) scale(1.1)';
      oldCard.style.opacity = '0';
      oldCard.style.zIndex = '15';

      newCard.style.visibility = 'visible';
      newCard.style.transition = transition;
      newCard.style.transform = 'translateZ(0) translateY(0) scale(1)';
      newCard.style.filter = 'brightness(1)';
      newCard.style.zIndex = '5';
    }

    setTimeout(() => {
      this.cards.forEach(card => card.style.cssText = '');
      this.scroll.currentY = this.scroll.currentZ = 0;
      this.scroll.currentScale = 1;
      this.scroll.currentAmount = this.scroll.currentDirection = 0;
      this.updatePositions();
      this.updateTitle();
      this.isAnimating = false;
    }, 850);
  },

  enterFullscreen(card) {
    this.isFullscreen = true;
    card.style.transform = '';
    
    const rect = card.getBoundingClientRect();
    document.body.appendChild(card);
    
    Object.assign(card.style, {
      position: 'fixed',
      top: rect.top + 'px', left: rect.left + 'px',
      width: rect.width + 'px', height: rect.height + 'px',
      transition: 'none'
    });
    
    card.offsetHeight; // reflow
    
    Object.assign(card.style, {
      transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
      top: '0', left: '0',
      width: '100vw', height: '100vh',
      borderRadius: '0'
    });
    card.classList.add('fullscreen');
    document.body.style.overflow = 'hidden';
    history.pushState({ fullscreen: true }, '');

    // Card-specific actions
    if (card.id === 'card-1' && window.Card1) Card1.onEnterFullscreen();
    if (card.id === 'card-2' && window.Card2) Card2.resume();
  },

  exitFullscreen() {
    const card = this.cards[this.current];
    const stackRect = this.cardStack.getBoundingClientRect();

    // Card-specific cleanup
    if (window.Card2) Card2.pauseAll();
    if (window.Card5) Card5.closeVideo();

    card.classList.add('shrinking');
    Object.assign(card.style, {
      transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)',
      top: stackRect.top + 'px', left: stackRect.left + 'px',
      width: stackRect.width + 'px', height: stackRect.height + 'px',
      borderRadius: '24px'
    });

    setTimeout(() => {
      card.classList.remove('fullscreen', 'shrinking');
      card.style.cssText = '';
      this.cardStack.appendChild(card);
      this.isFullscreen = false;
      document.body.style.overflow = '';
      this.updatePositions();
    }, 600);
  },

  animate() {
    // Lerp mouse
    this.mouse.currentX = Utils.lerp(this.mouse.currentX, this.mouse.x, 0.12);
    this.mouse.currentY = Utils.lerp(this.mouse.currentY, this.mouse.y, 0.12);
    
    // Lerp scroll
    this.scroll.currentY = Utils.lerp(this.scroll.currentY, this.scroll.targetY, 0.12);
    this.scroll.currentZ = Utils.lerp(this.scroll.currentZ, this.scroll.targetZ, 0.12);
    this.scroll.currentScale = Utils.lerp(this.scroll.currentScale, this.scroll.targetScale, 0.12);
    this.scroll.currentAmount = Utils.lerp(this.scroll.currentAmount, this.scroll.amount, 0.1);
    this.scroll.currentDirection = Utils.lerp(this.scroll.currentDirection, this.scroll.direction, 0.1);

    const activeCard = this.cards[this.current];
    const nextCard = this.cards[this.current + 1];
    
    if (activeCard && !this.isAnimating && !this.isFullscreen) {
      const rect = activeCard.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const deltaX = this.mouse.currentX - centerX;
      const deltaY = this.mouse.currentY - centerY;
      const distance = Math.hypot(deltaX, deltaY);
      const maxDist = Math.hypot(innerWidth, innerHeight) / 2;
      const ratio = Math.min(distance / maxDist, 1);
      
      const angle = Math.atan2(deltaY, deltaX);
      const push = ratio * 50;
      const moveX = -Math.cos(angle) * push;
      const moveY = -Math.sin(angle) * push;

      activeCard.style.transform = `translateZ(${this.scroll.currentZ}px) translate(${moveX}px, ${moveY + this.scroll.currentY}px) scale(${this.scroll.currentScale})`;
      
      const shadowX = Math.cos(angle) * 20 * ratio;
      const shadowY = Math.sin(angle) * 20 * ratio + 40;
      activeCard.style.boxShadow = `${shadowX}px ${shadowY}px 80px rgba(0,0,0,0.12)`;

      if (this.scroll.currentDirection > 5 && nextCard) {
        const progress = Utils.clamp(this.scroll.currentAmount, 0, 1);
        const nextZ = 150 * (1 - progress);
        const nextY = 60 * (1 - progress);
        const nextScale = 1.15 - progress * 0.15;
        const nextOpacity = Utils.clamp(progress * 2.5, 0, 1);
        nextCard.style.visibility = 'visible';
        nextCard.style.opacity = nextOpacity;
        nextCard.style.transform = `translateZ(${nextZ}px) translateY(${nextY}%) scale(${nextScale})`;
        nextCard.style.zIndex = '15';
      } else if (nextCard && this.scroll.currentDirection <= 5) {
        nextCard.style.visibility = '';
        nextCard.style.opacity = '';
        nextCard.style.transform = '';
        nextCard.style.zIndex = '';
      }
    }

    requestAnimationFrame(() => this.animate());
  }
};

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  App.init();
  Popup.init();
  VideoPopup.init();

  // Card 모듈 초기화 (각 card*.js에서 window에 등록)
  if (window.Card1) Card1.init();
  if (window.Card2) Card2.init();
  if (window.Card5) Card5.init();
  if (window.Card6) Card6.init();
});
