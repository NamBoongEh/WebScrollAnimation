/**
 * ========================================
 * card6.js - Three.js 기하학적 파티클 모핑
 * ========================================
 * 스크롤에 따라 5가지 Formation 사이를 부드럽게 전환
 * 노드 간 동적 라인 연결 + 카메라 자동 공전
 */
window.Card6 = {
  card: null,
  container: null,
  progressEl: null,

  // Three.js core
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  // Objects
  nodeGroup: null,
  linesMesh: null,
  centralOrb: null,
  centralGlow: null,
  nodes: [],          // Array of { mesh, targets:{}, isAccent }

  // Line geometry (재사용)
  lineGeo: null,
  lineMat: null,
  maxLineVertices: 0,

  // State
  scroll: 0,
  targetScroll: 0,
  maxScroll: 100,
  isInitialized: false,
  isMobile: false,
  _frameCount: 0,

  // Parameters
  NODE_COUNT: 80,
  LINE_DIST_SQ: 20,   // 4.5² ≈ 20
  FORMATIONS: ['sphere', 'helix', 'cube', 'torus', 'scatter'],
  FORMATION_LABELS: {
    sphere: 'SPHERE', helix: 'HELIX', cube: 'CUBE',
    torus: 'TORUS', scatter: 'SCATTER',
  },

  // ========================================
  // Init (card5 패턴 동일)
  // ========================================
  init() {
    this.card = Utils.$('#card-6');
    this.container = Utils.$('#three-container-6');
    this.progressEl = Utils.$('#phase-indicator-6');

    if (!this.card || !this.container || typeof THREE === 'undefined') return;

    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) this.NODE_COUNT = 50;

    // Fullscreen/shrinking 클래스 변경 감시 → 리사이즈
    const observer = new MutationObserver(() => {
      if (!this.isInitialized) return;
      this.handleResize();
      setTimeout(() => this.handleResize(), 50);
      setTimeout(() => this.handleResize(), 150);
      setTimeout(() => this.handleResize(), 350);
      setTimeout(() => this.handleResize(), 600);
      setTimeout(() => this.handleResize(), 1000);
    });
    observer.observe(this.card, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    setTimeout(() => {
      this.initThree();
      this.handleResize();
    }, 300);
  },

  // ========================================
  // Three.js 초기화
  // ========================================
  initThree() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    this.clock = new THREE.Clock();

    // Scene — 어두운 배경 + 안개
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x08080f);
    this.scene.fog = new THREE.FogExp2(0x08080f, 0.018);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      this.isMobile ? 65 : 55, 1, 0.1, 200,
    );
    this.camera.position.set(0, 0, 22);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isMobile ? 1.5 : 2));
    this.container.appendChild(this.renderer.domElement);

    // Groups
    this.nodeGroup = new THREE.Group();
    this.scene.add(this.nodeGroup);

    this.createNodes();
    this.createLines();
    this.createCentralOrb();
    this.bindEvents();
    this.handleResize();
    this.animate();
  },

  // ========================================
  // Formation 좌표 계산기
  // ========================================
  getFormationPos(index, formation, total) {
    const t = index / total;
    const golden = (1 + Math.sqrt(5)) / 2;

    switch (formation) {
      case 'sphere': {
        const phi = Math.acos(1 - 2 * t);
        const theta = 2 * Math.PI * index * golden;
        const r = 8;
        return [
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi),
        ];
      }
      case 'helix': {
        const angle = t * Math.PI * 8;
        const r = 5;
        const y = (t - 0.5) * 18;
        return [r * Math.cos(angle), y, r * Math.sin(angle)];
      }
      case 'cube': {
        const side = Math.ceil(Math.cbrt(total));
        const ix = index % side;
        const iy = Math.floor(index / side) % side;
        const iz = Math.floor(index / (side * side));
        const s = 14 / side;
        return [
          (ix - side / 2 + 0.5) * s,
          (iy - side / 2 + 0.5) * s,
          (iz - side / 2 + 0.5) * s,
        ];
      }
      case 'torus': {
        const R = 6, rr = 2.5;
        const u = t * Math.PI * 2 * 5;
        const v = t * Math.PI * 2 * 13;
        return [
          (R + rr * Math.cos(v)) * Math.cos(u),
          (R + rr * Math.cos(v)) * Math.sin(u),
          rr * Math.sin(v),
        ];
      }
      default: { // scatter
        // 시드 기반 랜덤 (일관된 위치)
        const a = (index * 2654435761) >>> 0;
        const rx = ((a & 0xFFFF) / 0xFFFF - 0.5) * 24;
        const ry = (((a >> 8) & 0xFFFF) / 0xFFFF - 0.5) * 24;
        const rz = (((a >> 16) & 0xFFFF) / 0xFFFF - 0.5) * 24;
        return [rx, ry, rz];
      }
    }
  },

  // ========================================
  // 노드 생성 (icosahedron 파티클)
  // ========================================
  createNodes() {
    // 공유 지오메트리 & 머티리얼 (인스턴스 최적화)
    const geoSmall = new THREE.IcosahedronGeometry(0.12, 0);
    const geoAccent = new THREE.IcosahedronGeometry(0.22, 1);
    const matWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const matAccent = new THREE.MeshBasicMaterial({ color: 0x6e8efb });

    for (let i = 0; i < this.NODE_COUNT; i++) {
      const isAccent = (i % 5 === 0); // 20% 액센트
      const mesh = new THREE.Mesh(
        isAccent ? geoAccent : geoSmall,
        isAccent ? matAccent : matWhite,
      );

      // 초기 위치: scatter
      const pos = this.getFormationPos(i, 'scatter', this.NODE_COUNT);
      mesh.position.set(pos[0], pos[1], pos[2]);

      // 각 formation별 목표좌표 미리 계산
      const targets = {};
      for (let f = 0; f < this.FORMATIONS.length; f++) {
        targets[this.FORMATIONS[f]] = this.getFormationPos(i, this.FORMATIONS[f], this.NODE_COUNT);
      }

      this.nodeGroup.add(mesh);
      this.nodes.push({ mesh, targets, isAccent });
    }
  },

  // ========================================
  // 라인 메시 (사전할당 BufferGeometry)
  // ========================================
  createLines() {
    // 최대 연결 수 추정 (실제로는 더 적음)
    this.maxLineVertices = this.NODE_COUNT * 12; // 노드당 최대 6쌍 = 12개 정점

    const posArr = new Float32Array(this.maxLineVertices * 3);
    this.lineGeo = new THREE.BufferGeometry();
    this.lineGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    this.lineGeo.setDrawRange(0, 0);

    this.lineMat = new THREE.LineBasicMaterial({
      color: 0x6e8efb,
      transparent: true,
      opacity: 0.12,
    });

    this.linesMesh = new THREE.LineSegments(this.lineGeo, this.lineMat);
    this.scene.add(this.linesMesh);
  },

  // ========================================
  // 중앙 오브 (와이어프레임 구체)
  // ========================================
  createCentralOrb() {
    const geo = new THREE.IcosahedronGeometry(0.8, 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x6e8efb, wireframe: true,
      transparent: true, opacity: 0.35,
    });
    this.centralOrb = new THREE.Mesh(geo, mat);
    this.scene.add(this.centralOrb);

    // 글로우 외곽
    const glowGeo = new THREE.IcosahedronGeometry(1.3, 2);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x6e8efb, wireframe: true,
      transparent: true, opacity: 0.08,
    });
    this.centralGlow = new THREE.Mesh(glowGeo, glowMat);
    this.centralOrb.add(this.centralGlow);
  },

  // ========================================
  // 라인 업데이트 (사전할당 배열 재사용)
  // ========================================
  updateLines() {
    const posAttr = this.lineGeo.getAttribute('position');
    const posArr = posAttr.array;
    const maxDSq = this.LINE_DIST_SQ;
    let idx = 0;
    const limit = this.maxLineVertices * 3;

    for (let i = 0, len = this.nodes.length; i < len; i++) {
      const pi = this.nodes[i].mesh.position;
      for (let j = i + 1; j < len; j++) {
        const pj = this.nodes[j].mesh.position;
        const dx = pi.x - pj.x;
        const dy = pi.y - pj.y;
        const dz = pi.z - pj.z;
        const dSq = dx * dx + dy * dy + dz * dz;

        if (dSq < maxDSq && idx + 5 < limit) {
          posArr[idx]     = pi.x;
          posArr[idx + 1] = pi.y;
          posArr[idx + 2] = pi.z;
          posArr[idx + 3] = pj.x;
          posArr[idx + 4] = pj.y;
          posArr[idx + 5] = pj.z;
          idx += 6;
        }
      }
    }

    this.lineGeo.setDrawRange(0, idx / 3);
    posAttr.needsUpdate = true;
  },

  // ========================================
  // 매 프레임 씬 업데이트
  // ========================================
  updateScene(dt) {
    const t = this.clock.getElapsedTime();
    const progress = this.scroll / this.maxScroll; // 0~1

    // 현재/다음 formation 결정
    const totalF = this.FORMATIONS.length;
    const raw = progress * (totalF - 1);
    const fromI = Math.min(Math.floor(raw), totalF - 2);
    const toI = fromI + 1;
    const blend = raw - fromI;

    // smoothstep easing
    const e = blend * blend * (3 - 2 * blend);

    const fromF = this.FORMATIONS[fromI];
    const toF = this.FORMATIONS[toI];

    // 노드 보간
    for (let i = 0, len = this.nodes.length; i < len; i++) {
      const n = this.nodes[i];
      const f = n.targets[fromF];
      const tt = n.targets[toF];

      // 목표 위치 + 미세 흔들림
      const wobble = 0.25;
      const wx = Math.sin(t * 0.8 + i * 0.5) * wobble;
      const wy = Math.cos(t * 0.6 + i * 0.7) * wobble;
      const wz = Math.sin(t * 0.7 + i * 0.3) * wobble;

      const tx = f[0] + (tt[0] - f[0]) * e + wx;
      const ty = f[1] + (tt[1] - f[1]) * e + wy;
      const tz = f[2] + (tt[2] - f[2]) * e + wz;

      const pos = n.mesh.position;
      pos.x += (tx - pos.x) * 0.045;
      pos.y += (ty - pos.y) * 0.045;
      pos.z += (tz - pos.z) * 0.045;

      // 액센트 노드 크기 펄스
      if (n.isAccent) {
        n.mesh.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.25);
      }
    }

    // 라인 업데이트 (매 3프레임)
    this._frameCount++;
    if (this._frameCount % 3 === 0) {
      this.updateLines();
    }

    // 중앙 오브 회전 + 크기 펄스
    if (this.centralOrb) {
      this.centralOrb.rotation.x += dt * 0.25;
      this.centralOrb.rotation.y += dt * 0.4;
      this.centralOrb.scale.setScalar(0.8 + Math.sin(t * 1.5) * 0.2);
    }

    // 카메라: 자동 공전 + 스크롤 연동
    const camAngle = t * 0.12 + progress * Math.PI * 2;
    const camDist = 22 - progress * 5;
    const camY = Math.sin(t * 0.08) * 2 + progress * 4;

    this.camera.position.set(
      Math.cos(camAngle) * camDist,
      camY,
      Math.sin(camAngle) * camDist,
    );
    this.camera.lookAt(0, 0, 0);

    // 진행률 라벨
    if (this.progressEl) {
      const label = this.FORMATIONS[Math.round(raw)] || this.FORMATIONS[totalF - 1];
      this.progressEl.textContent = this.FORMATION_LABELS[label] || '';
    }
  },

  // ========================================
  // 이벤트 바인딩
  // ========================================
  bindEvents() {
    // Wheel (fullscreen에서만)
    let wheelCooldown = false;
    this.card.addEventListener('wheel', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      e.preventDefault();
      if (wheelCooldown) return;
      wheelCooldown = true;
      setTimeout(() => { wheelCooldown = false; }, 60);

      this.targetScroll = Utils.clamp(
        this.targetScroll + (e.deltaY > 0 ? 2.5 : -2.5),
        0, this.maxScroll,
      );
    }, { passive: false });

    // Touch
    let touchY = 0;
    this.card.addEventListener('touchstart', (e) => {
      if (this.card.classList.contains('fullscreen')) {
        touchY = e.touches[0].clientY;
      }
    }, { passive: true });

    this.card.addEventListener('touchmove', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      const dy = touchY - e.touches[0].clientY;
      touchY = e.touches[0].clientY;
      this.targetScroll = Utils.clamp(
        this.targetScroll + dy * 0.35,
        0, this.maxScroll,
      );
    }, { passive: true });

    // Resize
    window.addEventListener('resize', () => {
      if (this.isInitialized) this.handleResize();
    });
  },

  // ========================================
  // 리사이즈
  // ========================================
  handleResize() {
    if (!this.renderer || !this.container) return;

    const rect = this.container.getBoundingClientRect();
    const w = Math.round(rect.width) || 1;
    const h = Math.round(rect.height) || 1;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);

    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
  },

  // ========================================
  // 애니메이션 루프
  // ========================================
  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = Math.min(this.clock.getDelta(), 0.05); // 스파이크 방지

    // 스크롤 보간
    const diff = this.targetScroll - this.scroll;
    if (Math.abs(diff) > 0.01) {
      this.scroll += diff * 0.08;
    } else {
      this.scroll = this.targetScroll;
    }

    this.updateScene(dt);
    this.renderer.render(this.scene, this.camera);
  },

  // ========================================
  // 정리
  // ========================================
  dispose() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    if (this.lineGeo) {
      this.lineGeo.dispose();
    }
    if (this.lineMat) {
      this.lineMat.dispose();
    }
  },
};
