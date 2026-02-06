/**
 * ========================================
 * Main Application - Card Stack Controller
 * ========================================
 * 
 * 수정사항:
 * 1. Card5: 시계 방향 계단 상승
 * 2. Card1: 최초 확대 시 한 번만 클릭 위치로 이동
 * 3. 카드 전환: 다음 카드가 앞에서 scale 크게 시작하여 줄어들며 등장
 */

(function() {
  'use strict';

  // ========================================
  // Utils
  // ========================================
  const Utils = {
    $(selector) { return document.querySelector(selector); },
    $$(selector) { return document.querySelectorAll(selector); },
    lerp(start, end, factor) { return start + (end - start) * factor; },
    clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
  };

  // ========================================
  // App: Main Controller
  // ========================================
  const App = {
    cards: [],
    indicator: null,
    current: 0,
    isAnimating: false,
    isFullscreen: false,
    
    // Scroll state
    scroll: {
      accumulator: 0,
      threshold: 250,  // 낮춤: 더 빠른 반응
      timeout: null,
      targetY: 0, currentY: 0,
      targetZ: 0, currentZ: 0,
      targetScale: 1, currentScale: 1,
      amount: 0, direction: 0
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

      this.scroll.accumulator += e.deltaY * 0.8;  // 증가: 더 민감한 반응
      const absScroll = Math.abs(this.scroll.accumulator);
      const progress = absScroll / this.scroll.threshold;

      if (this.scroll.accumulator > 0) {
        // 아래로 스크롤
        this.scroll.targetY = absScroll * 0.4;
        this.scroll.targetZ = -absScroll * 1.2;
        this.scroll.targetScale = 1 - progress * 0.08;
      } else {
        // 위로 스크롤
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

      // 공통 트랜지션 설정
      const transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';

      if (direction === 'down') {
        // 현재 카드는 뒤로 밀려남
        oldCard.style.transition = transition;
        oldCard.style.transform = 'translateZ(-100px) translateY(60%) scale(0.5)';
        oldCard.style.filter = 'brightness(0.9)';
        oldCard.style.zIndex = '5';

        // 새 카드: 미리 트랜지션 설정하고 초기 위치 설정
        newCard.style.transition = 'none';
        newCard.style.visibility = 'visible';
        newCard.style.opacity = '1';
        newCard.style.transform = 'translateZ(150px) translateY(60%) scale(1.15)';
        newCard.style.zIndex = '15';
        
        // 다음 프레임에서 트랜지션과 함께 최종 위치로
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            newCard.style.transition = transition;
            newCard.style.transform = 'translateZ(0) translateY(0) scale(1)';
          });
        });

        // 이전의 prev 카드는 더 뒤로
        if (prevOfOld) {
          prevOfOld.style.transition = transition;
          prevOfOld.style.transform = 'translateZ(-200px) translateY(70%) scale(0.4)';
          prevOfOld.style.visibility = 'hidden';
        }
      } else {
        // 위로 스크롤: 현재 카드는 아래로 사라짐
        oldCard.style.transition = transition;
        oldCard.style.transform = 'translateZ(150px) translateY(100%) rotateX(-30deg) scale(1.1)';
        oldCard.style.opacity = '0';
        oldCard.style.zIndex = '15';

        // 이전 카드가 올라옴
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
      if (card.id === 'card-1') Card1.onEnterFullscreen();
      if (card.id === 'card-2') Card2.resume();
    },

    exitFullscreen() {
      const card = this.cards[this.current];
      const stackRect = this.cardStack.getBoundingClientRect();

      // Card-specific cleanup
      Card2.pauseAll();
      Card5.closeVideo();

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
      
      // Lerp scroll - 더 부드럽게
      this.scroll.currentY = Utils.lerp(this.scroll.currentY, this.scroll.targetY, 0.12);
      this.scroll.currentZ = Utils.lerp(this.scroll.currentZ, this.scroll.targetZ, 0.12);
      this.scroll.currentScale = Utils.lerp(this.scroll.currentScale, this.scroll.targetScale, 0.12);

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

        // 현재 카드 transform
        activeCard.style.transform = `translateZ(${this.scroll.currentZ}px) translate(${moveX}px, ${moveY + this.scroll.currentY}px) scale(${this.scroll.currentScale})`;
        
        const shadowX = Math.cos(angle) * 20 * ratio;
        const shadowY = Math.sin(angle) * 20 * ratio + 40;
        activeCard.style.boxShadow = `${shadowX}px ${shadowY}px 80px rgba(0,0,0,0.12)`;

        // 아래 스크롤 시 다음 카드 미리보기
        if (this.scroll.direction > 5 && nextCard) {
          const progress = this.scroll.amount;
          // 다음 카드: 앞쪽 + 아래에서 올라옴
          const nextZ = 150 - progress * 80;
          const nextY = 60 - progress * 30;
          const nextScale = 1.15 - progress * 0.08;
          const nextOpacity = Math.min(progress * 3, 1);
          nextCard.style.visibility = 'visible';
          nextCard.style.opacity = nextOpacity;
          nextCard.style.transform = `translateZ(${nextZ}px) translateY(${nextY}%) scale(${nextScale})`;
          nextCard.style.zIndex = '15';
        } else if (nextCard && this.scroll.direction <= 5) {
          // 스크롤 안할 때 다음 카드 숨김
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
  // Card1: Collision Detection Flip Cards
  // ========================================
  const Card1 = {
    card: null,
    avatar: null,
    container: null,
    position: { x: 0.5, y: 0.08, targetX: 0.5, targetY: 0.08 },
    isMoving: false,
    isJustEntered: false, // 확대 직후 플래그

    init() {
      this.card = Utils.$('#card-1');
      this.avatar = Utils.$('#human-avatar');
      this.container = Utils.$('#scatter-container');
      
      if (!this.card || !this.avatar) return;

      this.updatePosition();
      this.bindEvents();
      this.animate();
    },

    updatePosition() {
      this.avatar.style.left = (this.position.x * 100) + '%';
      this.avatar.style.top = (this.position.y * 100) + '%';
      this.avatar.style.transform = 'translate(-50%, -50%)';
    },

    // fullscreen 진입 시 호출
    onEnterFullscreen() {
      this.isJustEntered = true;
    },

    bindEvents() {
      // fullscreen 상태에서만 클릭으로 이동
      this.card.addEventListener('click', (e) => {
        if (!this.card.classList.contains('fullscreen')) return;
        if (e.target.closest('.close-btn') || e.target.closest('.card-btn')) return;

        // 확대 직후 첫 클릭은 무시
        if (this.isJustEntered) {
          this.isJustEntered = false;
          return;
        }

        const rect = this.card.getBoundingClientRect();
        this.position.targetX = Utils.clamp((e.clientX - rect.left) / rect.width, 0.05, 0.95);
        this.position.targetY = Utils.clamp((e.clientY - rect.top) / rect.height, 0.05, 0.95);
        
        if (!this.isMoving) {
          this.isMoving = true;
        }
      });

      // Button clicks -> popup
      this.container.addEventListener('click', (e) => {
        const btn = e.target.closest('.card-btn');
        if (btn) {
          e.stopPropagation();
          const item = btn.closest('.scatter-item');
          const idx = item ? item.dataset.index : 0;
          Popup.open('아이템 ' + (parseInt(idx) + 1), '상세 내용입니다.');
        }
      });
    },

    checkCollision() {
      if (!this.card.classList.contains('fullscreen')) return;

      const avatarRect = this.avatar.getBoundingClientRect();
      this.container.querySelectorAll('.scatter-item:not(.flipped)').forEach(item => {
        const inner = item.querySelector('.card-inner');
        if (!inner) return;
        
        const itemRect = inner.getBoundingClientRect();
        if (itemRect.width === 0) return;

        const hit = !(avatarRect.right < itemRect.left || 
                      avatarRect.left > itemRect.right || 
                      avatarRect.bottom < itemRect.top || 
                      avatarRect.top > itemRect.bottom);
        
        if (hit) item.classList.add('flipped');
      });
    },

    animate() {
      if (this.isMoving) {
        const dx = this.position.targetX - this.position.x;
        const dy = this.position.targetY - this.position.y;
        
        this.position.x += dx * 0.08;
        this.position.y += dy * 0.08;
        this.updatePosition();
        this.checkCollision();

        if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
          this.position.x = this.position.targetX;
          this.position.y = this.position.targetY;
          this.isMoving = false;
        }
      }
      requestAnimationFrame(() => this.animate());
    }
  };

  // ========================================
  // Card2: Video Grid
  // ========================================
  const Card2 = {
    card: null,
    items: [],
    isMuted: true,
    states: new Map(),

    init() {
      this.card = Utils.$('#card-2');
      this.items = Utils.$$('#video-grid .video-item');
      const muteBtn = Utils.$('#mute-btn');
      const muteIcon = Utils.$('#mute-icon');

      this.items.forEach((item, i) => {
        this.states.set(i, { wasPlaying: false });
        const video = item.querySelector('video');
        
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

  // ========================================
  // Card5: Three.js Spiral Stairs (반시계 방향)
  // ========================================
  const Card5 = {
    card: null,
    container: null,
    progressEl: null,
    particleBox: null,
    
    // Three.js
    scene: null, camera: null, renderer: null,
    raycaster: null, mouse: null,
    frameMeshes: [],
    
    // State
    scroll: 0, targetScroll: 0,
    maxScroll: 100,
    hasExploded: false,
    isInitialized: false,

    // Parameters - 반시계 방향 (양수 각도)
    TOTAL_STAIRS: 30,
    STAIR_HEIGHT: 1.8,
    ANGLE_PER_STAIR: 24,  // 양수 = 반시계 방향
    INNER_RADIUS: 1.5,
    OUTER_RADIUS: 6.0,
    STAIR_THICKNESS: 0.3,
    EYE_HEIGHT: 1.6,
    FRAME_STAIRS: [4, 9, 14, 19, 24, 29],
    VIDEOS: ['Video/vid1.mp4', 'Video/vid2.mp4', 'Video/vid3.mp4', 'Video/vid4.mp4', 'Video/vid5.mp4', 'Video/vid6.mp4'],

    init() {
      this.card = Utils.$('#card-5');
      this.container = Utils.$('#three-container');
      this.progressEl = Utils.$('#floor-indicator-5');
      this.particleBox = Utils.$('#particle-box-5');
      
      if (!this.card || !this.container || typeof THREE === 'undefined') return;

      // Watch for fullscreen
      const observer = new MutationObserver(() => {
        if (this.card.classList.contains('fullscreen')) {
          if (!this.isInitialized) this.initThree();
          setTimeout(() => this.handleResize(), 100);
        }
      });
      observer.observe(this.card, { attributes: true, attributeFilter: ['class'] });

      setTimeout(() => {
        this.initThree();
        this.handleResize();
      }, 300);
    },

    initThree() {
      if (this.isInitialized) return;
      this.isInitialized = true;

      const isMobile = window.innerWidth <= 768;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xf5f5f5);
      this.scene.fog = new THREE.Fog(0xf5f5f5, 15, 60);

      this.camera = new THREE.PerspectiveCamera(isMobile ? 85 : 70, 1, 0.1, 150);
      this.renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
      this.container.appendChild(this.renderer.domElement);

      this.raycaster = new THREE.Raycaster();
      this.mouse = new THREE.Vector2();

      // Lights
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
      dirLight.position.set(10, 50, 10);
      this.scene.add(dirLight);

      this.createPillar();
      this.createStairs();
      this.bindEvents();
      this.handleResize();
      this.animate();
    },

    createPillar() {
      const h = this.TOTAL_STAIRS * this.STAIR_HEIGHT + 20;
      const geo = new THREE.CylinderGeometry(this.INNER_RADIUS * 0.6, this.INNER_RADIUS * 0.6, h, 24);
      const mat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8, metalness: 0.2 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = h / 2 - 2;
      this.scene.add(mesh);
    },

    createAnnularSector(innerR, outerR, startAng, endAng, height) {
      const shape = new THREE.Shape();
      const segments = 16;
      
      // 각도 정렬 (startAng < endAng 보장)
      const minAng = Math.min(startAng, endAng);
      const maxAng = Math.max(startAng, endAng);
      const span = maxAng - minAng;

      shape.moveTo(Math.cos(minAng) * outerR, Math.sin(minAng) * outerR);
      for (let i = 1; i <= segments; i++) {
        const a = minAng + (span * i) / segments;
        shape.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
      }
      for (let i = segments; i >= 0; i--) {
        const a = minAng + (span * i) / segments;
        shape.lineTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
      }
      shape.closePath();

      const geo = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
      geo.rotateX(-Math.PI / 2);
      return geo;
    },

    createStairs() {
      const mat = new THREE.MeshStandardMaterial({ color: 0x2d2d2d, roughness: 0.6, metalness: 0.3 });

      for (let i = 0; i < this.TOTAL_STAIRS; i++) {
        // 시계 방향: 음수 각도로 진행
        const startAng = (i * this.ANGLE_PER_STAIR * Math.PI) / 180;
        const endAng = ((i + 1) * this.ANGLE_PER_STAIR * Math.PI) / 180;
        const y = i * this.STAIR_HEIGHT;

        const stairGeo = this.createAnnularSector(
          this.INNER_RADIUS, this.OUTER_RADIUS,
          startAng, endAng,
          this.STAIR_THICKNESS
        );
        const stair = new THREE.Mesh(stairGeo, mat);
        stair.position.y = y;
        this.scene.add(stair);

        // Frames
        if (this.FRAME_STAIRS.includes(i)) {
          this.createFrame((startAng + endAng) / 2, y, i);
        }
      }
    },

    createFrame(angle, y, stairIndex) {
      const group = new THREE.Group();
      const videoSrc = this.VIDEOS[stairIndex % this.VIDEOS.length];

      // Outer frame
      const outerGeo = new THREE.BoxGeometry(1.6, 1.2, 0.1);
      group.add(new THREE.Mesh(outerGeo, new THREE.MeshStandardMaterial({ color: 0x1a1a1a })));

      // Inner (clickable)
      const innerGeo = new THREE.BoxGeometry(1.3, 0.95, 0.12);
      const inner = new THREE.Mesh(innerGeo, new THREE.MeshStandardMaterial({ color: 0xffffff }));
      inner.position.z = 0.02;
      inner.userData.videoSrc = videoSrc;
      group.add(inner);

      // Play icon
      const tri = new THREE.Shape();
      tri.moveTo(-0.15, -0.18);
      tri.lineTo(-0.15, 0.18);
      tri.lineTo(0.18, 0);
      tri.closePath();
      const triMesh = new THREE.Mesh(new THREE.ShapeGeometry(tri), new THREE.MeshBasicMaterial({ color: 0x333333 }));
      triMesh.position.z = 0.08;
      group.add(triMesh);

      // Position: 바깥쪽 벽
      const frameR = this.OUTER_RADIUS + 0.5;
      group.position.set(Math.cos(angle) * frameR, y + this.EYE_HEIGHT + 0.5, Math.sin(angle) * frameR);
      // 액자가 안쪽을 향하도록
      group.rotation.y = -angle + Math.PI;
      this.scene.add(group);

      this.frameMeshes.push(inner);
    },

    updateCamera() {
      const t = this.scroll / this.maxScroll;
      const stairIdx = t * this.TOTAL_STAIRS;
      const h = stairIdx * this.STAIR_HEIGHT + this.STAIR_THICKNESS + this.EYE_HEIGHT;
      
      // 시계 방향: 음수 각도
      const ang = (stairIdx * this.ANGLE_PER_STAIR * Math.PI) / 180;
      
      // 카메라: 계단 바깥쪽에서 약간 안쪽
      const camR = this.OUTER_RADIUS - 1.2;
      this.camera.position.set(Math.cos(ang) * camR, h, Math.sin(ang) * camR);

      // 시선: 반시계 방향 앞쪽 (약 2.5계단 앞)
      const lookAng = ((stairIdx + 2.5) * this.ANGLE_PER_STAIR * Math.PI) / 180;
      const lookH = (stairIdx + 2.5) * this.STAIR_HEIGHT + this.STAIR_THICKNESS + this.EYE_HEIGHT;
      this.camera.lookAt(Math.cos(lookAng) * camR, lookH, Math.sin(lookAng) * camR);

      if (this.progressEl) this.progressEl.textContent = (Math.floor(stairIdx) + 1) + 'F';

      // Particles
      if (this.scroll >= 85 && !this.hasExploded) {
        this.hasExploded = true;
        this.createParticles();
      }
      if (this.scroll < 75) this.hasExploded = false;
    },

    createParticles() {
      if (!this.particleBox) return;
      const colors = ['#111', '#333', '#555', '#777', '#999'];
      for (let i = 0; i < 80; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = Math.random() * 12 + 4;
        const cx = window.innerWidth / 2, cy = window.innerHeight * 0.4;
        const a = Math.random() * Math.PI * 2;
        const d = Math.random() * 400 + 80;
        p.style.cssText = `width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random() * colors.length)]};left:${cx}px;top:${cy}px;--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px`;
        this.particleBox.appendChild(p);
        setTimeout(() => p.remove(), 1500);
      }
    },

    bindEvents() {
      // Wheel
      this.card.addEventListener('wheel', (e) => {
        if (!this.card.classList.contains('fullscreen')) return;
        e.preventDefault();
        this.targetScroll = Utils.clamp(this.targetScroll + (e.deltaY > 0 ? 2 : -2), 0, this.maxScroll);
      }, { passive: false });

      // Touch
      let touchY = 0;
      this.card.addEventListener('touchstart', (e) => {
        if (this.card.classList.contains('fullscreen')) touchY = e.touches[0].clientY;
      }, { passive: true });
      this.card.addEventListener('touchmove', (e) => {
        if (!this.card.classList.contains('fullscreen')) return;
        const dy = touchY - e.touches[0].clientY;
        touchY = e.touches[0].clientY;
        this.targetScroll = Utils.clamp(this.targetScroll + dy * 0.25, 0, this.maxScroll);
      }, { passive: true });

      // Click frames
      this.container.addEventListener('click', (e) => {
        if (!this.card.classList.contains('fullscreen')) return;
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hits = this.raycaster.intersectObjects(this.frameMeshes);
        if (hits.length > 0 && hits[0].object.userData.videoSrc) {
          VideoPopup.open(hits[0].object.userData.videoSrc);
        }
      });

      window.addEventListener('resize', () => {
        if (this.isInitialized) this.handleResize();
      });
    },

    handleResize() {
      const w = this.container.clientWidth || 1;
      const h = this.container.clientHeight || 1;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    },

    animate() {
      requestAnimationFrame(() => this.animate());
      
      const diff = this.targetScroll - this.scroll;
      if (Math.abs(diff) > 0.01) {
        this.scroll += diff * 0.06;
      } else {
        this.scroll = this.targetScroll;
      }

      this.updateCamera();
      this.renderer.render(this.scene, this.camera);
    },

    closeVideo() {
      VideoPopup.close();
    }
  };

  // ========================================
  // Popup
  // ========================================
  const Popup = {
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
  const VideoPopup = {
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
  // Initialize
  // ========================================
  document.addEventListener('DOMContentLoaded', () => {
    App.init();
    Card1.init();
    Card2.init();
    Card5.init();
    Popup.init();
    VideoPopup.init();
  });

})();
