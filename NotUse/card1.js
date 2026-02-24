/**
 * ========================================
 * card1.js - 충돌 감지 플립 카드
 * ========================================
 */
window.Card1 = {
  card: null,
  avatar: null,
  container: null,
  position: { x: 0.5, y: 0.08, targetX: 0.5, targetY: 0.08 },
  isMoving: false,
  isJustEntered: false,

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
