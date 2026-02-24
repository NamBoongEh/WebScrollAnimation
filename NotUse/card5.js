/**
 * ========================================
 * card5.js - Three.js 나선형 계단 (와이어프레임 스타일)
 * ========================================
 * 이미지 레퍼런스에 맞춘 건축 라인 드로잉 스타일
 * 흰색 면 + 검정 윤곽선, 사선 구도의 나선형 계단
 */
window.Card5 = {
  card: null,
  container: null,
  progressEl: null,
  particleBox: null,

  // Three.js
  scene: null,
  camera: null,
  renderer: null,
  raycaster: null,
  mouse: null,
  frameMeshes: [],
  stairGroup: null,
  characterMesh: null,

  // State — 계단 단위 스텝 기반
  currentStep: 0,
  targetStep: 0,
  animStep: 0,        // 보간된 현재 위치 (소수점)
  jumpPhase: 0,       // 0~1 점프 애니메이션 진행도
  isJumping: false,
  maxScroll: 100,
  hasExploded: false,
  isInitialized: false,

  // Parameters — 계단 2배
  TOTAL_STAIRS: 72,
  STAIR_HEIGHT: 1.2,
  ANGLE_PER_STAIR: 22,
  INNER_RADIUS: 1.0,
  OUTER_RADIUS: 4.8,
  STAIR_THICKNESS: 0.28,
  EYE_HEIGHT: 1.6,
  FRAME_STAIRS: [10, 22, 34, 46, 58, 70],
  VIDEOS: [
    "Video/vid1.mp4",
    "Video/vid2.mp4",
    "Video/vid3.mp4",
    "Video/vid4.mp4",
    "Video/vid5.mp4",
    "Video/vid6.mp4",
  ],
  VIDEO_INFO: [
    { title: "Chapter 1", desc: "여정의 시작. 낯선 길 위에서 첫 발을 내딛다." },
    { title: "Chapter 2", desc: "작은 도전들을 마주하며 한 걸음씩 나아가다." },
    { title: "Chapter 3", desc: "흔들리는 순간에도 포기하지 않는 의지." },
    { title: "Chapter 4", desc: "함께하는 사람들에게서 새로운 힘을 얻다." },
    { title: "Chapter 5", desc: "높은 곳에서 바라본 풍경, 그리고 깨달음." },
    { title: "Chapter 6", desc: "끝이 아닌 새로운 시작을 향해 나아가다." },
  ],

  // Materials (shared)
  whiteMat: null,
  lineMat: null,

  init() {
    this.card = Utils.$("#card-5");
    this.container = Utils.$("#three-container");
    this.progressEl = Utils.$("#floor-indicator-5");
    this.particleBox = Utils.$("#particle-box-5");

    if (!this.card || !this.container || typeof THREE === "undefined") return;

    // Watch for fullscreen / shrinking — 클래스 변경 시 반복 리사이즈
    const observer = new MutationObserver(() => {
      if (!this.isInitialized) return;
      // CSS 전환 동안 여러 번 리사이즈하여 캔버스가 컨테이너를 정확히 채우도록
      this.handleResize();
      setTimeout(() => this.handleResize(), 50);
      setTimeout(() => this.handleResize(), 150);
      setTimeout(() => this.handleResize(), 350);
      setTimeout(() => this.handleResize(), 600);
      setTimeout(() => this.handleResize(), 1000);
    });
    observer.observe(this.card, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    setTimeout(() => {
      this.initThree();
      this.handleResize();
    }, 300);
  },

  initThree() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    const isMobile = window.innerWidth <= 768;

    // Scene — 순백 배경, 포그 없음
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      isMobile ? 65 : 55,
      1,
      0.1,
      300,
    );

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // 공유 머티리얼
    this.whiteMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.lineMat = new THREE.LineBasicMaterial({
      color: 0x1a1a1a,
      linewidth: 1,
    });

    // Minimal ambient light (MeshBasicMaterial은 조명 불필요하나 프레임용)
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    // Stair group — 전체 계단을 그룹으로 관리
    this.stairGroup = new THREE.Group();
    this.scene.add(this.stairGroup);

    this.createStairs();
    this.createRailings();
    this.createCharacter();
    this.setupCamera();
    this.bindEvents();
    this.handleResize();
    this.animate();
  },

  /**
   * 부채꼴 계단 형상 생성
   */
  createAnnularSector(innerR, outerR, startAng, endAng, height) {
    const shape = new THREE.Shape();
    const segments = 12;

    const minAng = Math.min(startAng, endAng);
    const maxAng = Math.max(startAng, endAng);
    const span = maxAng - minAng;

    // sin을 반전하여 rotateX(-PI/2) 후 Z가 +sin(a)*R이 되도록 함
    // → 난간/캐릭터와 같은 방향
    shape.moveTo(Math.cos(minAng) * outerR, -Math.sin(minAng) * outerR);
    for (let i = 1; i <= segments; i++) {
      const a = minAng + (span * i) / segments;
      shape.lineTo(Math.cos(a) * outerR, -Math.sin(a) * outerR);
    }
    for (let i = segments; i >= 0; i--) {
      const a = minAng + (span * i) / segments;
      shape.lineTo(Math.cos(a) * innerR, -Math.sin(a) * innerR);
    }
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: height,
      bevelEnabled: false,
    });
    geo.rotateX(-Math.PI / 2);
    return geo;
  },

  /**
   * 계단 생성 — 흰색 면 + 검정 윤곽선
   */
  createStairs() {
    for (let i = 0; i < this.TOTAL_STAIRS; i++) {
      const startAng = (i * this.ANGLE_PER_STAIR * Math.PI) / 180;
      const endAng = ((i + 1) * this.ANGLE_PER_STAIR * Math.PI) / 180;
      const y = i * this.STAIR_HEIGHT;

      const stairGeo = this.createAnnularSector(
        this.INNER_RADIUS,
        this.OUTER_RADIUS,
        startAng,
        endAng,
        this.STAIR_THICKNESS,
      );

      // 흰색 면
      const stair = new THREE.Mesh(stairGeo, this.whiteMat);
      stair.position.y = y;
      this.stairGroup.add(stair);

      // 검정 윤곽선
      const edges = new THREE.EdgesGeometry(stairGeo, 20);
      const lineSegments = new THREE.LineSegments(edges, this.lineMat);
      lineSegments.position.y = y;
      this.stairGroup.add(lineSegments);

      // 수직면 (라이저) — 계단 앞면 표현
      if (i > 0) {
        this.createRiser(startAng, y, i);
      }

      // 프레임 배치
      if (this.FRAME_STAIRS.includes(i)) {
        this.createFrame((startAng + endAng) / 2, y, i);
      }
    }
  },

  /**
   * 계단 수직면 (라이저) 생성
   */
  createRiser(angle, y, stairIndex) {
    const prevY = (stairIndex - 1) * this.STAIR_HEIGHT + this.STAIR_THICKNESS;
    const riserHeight = y - prevY;
    if (riserHeight <= 0) return;

    const angRad = angle;
    const angNext = angle + (this.ANGLE_PER_STAIR * Math.PI) / 180;
    const segments = 8;
    const span = angNext - angRad;

    // 외벽 라이저 (바깥쪽 아크)
    const points = [];
    for (let i = 0; i <= segments; i++) {
      const a = angRad + (span * i) / segments;
      points.push(
        new THREE.Vector3(
          Math.cos(a) * this.OUTER_RADIUS,
          prevY,
          Math.sin(a) * this.OUTER_RADIUS,
        ),
      );
    }
    for (let i = segments; i >= 0; i--) {
      const a = angRad + (span * i) / segments;
      points.push(
        new THREE.Vector3(
          Math.cos(a) * this.OUTER_RADIUS,
          y,
          Math.sin(a) * this.OUTER_RADIUS,
        ),
      );
    }

    // 라인으로 라이저 표현
    const lineGeo = new THREE.BufferGeometry().setFromPoints([
      // 아래쪽 호
      ...(() => {
        const pts = [];
        for (let i = 0; i <= segments; i++) {
          const a = angRad + (span * i) / segments;
          pts.push(
            new THREE.Vector3(
              Math.cos(a) * this.OUTER_RADIUS,
              prevY,
              Math.sin(a) * this.OUTER_RADIUS,
            ),
          );
        }
        return pts;
      })(),
    ]);

    // 수직 라인 (양끝)
    const vLine1Geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(
        Math.cos(angRad) * this.OUTER_RADIUS,
        prevY,
        Math.sin(angRad) * this.OUTER_RADIUS,
      ),
      new THREE.Vector3(
        Math.cos(angRad) * this.OUTER_RADIUS,
        y,
        Math.sin(angRad) * this.OUTER_RADIUS,
      ),
    ]);
    this.stairGroup.add(new THREE.Line(vLine1Geo, this.lineMat));

    // 내벽 수직 라인
    const vLine2Geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(
        Math.cos(angRad) * this.INNER_RADIUS,
        prevY,
        Math.sin(angRad) * this.INNER_RADIUS,
      ),
      new THREE.Vector3(
        Math.cos(angRad) * this.INNER_RADIUS,
        y,
        Math.sin(angRad) * this.INNER_RADIUS,
      ),
    ]);
    this.stairGroup.add(new THREE.Line(vLine2Geo, this.lineMat));
  },

  /**
   * 난간 라인 생성 — 바깥쪽 나선 라인
   */
  createRailings() {
    const outerPoints = [];
    const innerPoints = [];
    const railHeight = 1.0;

    for (let i = 0; i <= this.TOTAL_STAIRS; i++) {
      const ang = (i * this.ANGLE_PER_STAIR * Math.PI) / 180;
      const y = i * this.STAIR_HEIGHT + railHeight;

      outerPoints.push(
        new THREE.Vector3(
          Math.cos(ang) * this.OUTER_RADIUS,
          y,
          Math.sin(ang) * this.OUTER_RADIUS,
        ),
      );
      innerPoints.push(
        new THREE.Vector3(
          Math.cos(ang) * this.INNER_RADIUS,
          y,
          Math.sin(ang) * this.INNER_RADIUS,
        ),
      );
    }

    // 바깥쪽 난간
    const outerCurve = new THREE.CatmullRomCurve3(outerPoints);
    const outerGeo = new THREE.BufferGeometry().setFromPoints(
      outerCurve.getPoints(this.TOTAL_STAIRS * 4),
    );
    const outerRail = new THREE.Line(
      outerGeo,
      new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 1 }),
    );
    this.stairGroup.add(outerRail);

    // 난간 지지대 (수직)
    for (let i = 0; i <= this.TOTAL_STAIRS; i += 2) {
      const ang = (i * this.ANGLE_PER_STAIR * Math.PI) / 180;
      const baseY = i * this.STAIR_HEIGHT + this.STAIR_THICKNESS;
      const topY = i * this.STAIR_HEIGHT + railHeight;

      const supportGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(
          Math.cos(ang) * this.OUTER_RADIUS,
          baseY,
          Math.sin(ang) * this.OUTER_RADIUS,
        ),
        new THREE.Vector3(
          Math.cos(ang) * this.OUTER_RADIUS,
          topY,
          Math.sin(ang) * this.OUTER_RADIUS,
        ),
      ]);
      this.stairGroup.add(
        new THREE.Line(
          supportGeo,
          new THREE.LineBasicMaterial({ color: 0x555555 }),
        ),
      );
    }
  },

  /**
   * 프레임 (액자) — 와이어프레임 스타일
   */
  createFrame(angle, y, stairIndex) {
    const group = new THREE.Group();
    const videoSrc = this.VIDEOS[stairIndex % this.VIDEOS.length];

    // 외부 프레임 — 윤곽선만
    const outerGeo = new THREE.BoxGeometry(1.6, 1.2, 0.08);
    const outerMesh = new THREE.Mesh(outerGeo, this.whiteMat);
    const outerEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(outerGeo),
      new THREE.LineBasicMaterial({ color: 0x000000 }),
    );
    group.add(outerMesh);
    group.add(outerEdges);

    // 내부 (클릭 가능)
    const innerGeo = new THREE.BoxGeometry(1.3, 0.95, 0.1);
    const inner = new THREE.Mesh(
      innerGeo,
      new THREE.MeshBasicMaterial({ color: 0xf0f0f0 }),
    );
    inner.position.z = 0.02;
    inner.userData.videoSrc = videoSrc;
    inner.userData.videoIndex = this.FRAME_STAIRS.indexOf(stairIndex);
    group.add(inner);

    const innerEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(innerGeo),
      new THREE.LineBasicMaterial({ color: 0x999999 }),
    );
    innerEdges.position.z = 0.02;
    group.add(innerEdges);

    // 재생 아이콘
    const tri = new THREE.Shape();
    tri.moveTo(-0.12, -0.15);
    tri.lineTo(-0.12, 0.15);
    tri.lineTo(0.15, 0);
    tri.closePath();
    const triMesh = new THREE.Mesh(
      new THREE.ShapeGeometry(tri),
      new THREE.MeshBasicMaterial({ color: 0x1a1a1a }),
    );
    triMesh.position.z = 0.07;
    group.add(triMesh);

    // 위치: 바깥벽
    const frameR = this.OUTER_RADIUS + 0.6;
    group.position.set(
      Math.cos(angle) * frameR,
      y + this.EYE_HEIGHT + 0.3,
      Math.sin(angle) * frameR,
    );
    group.rotation.y = -angle + Math.PI;
    this.stairGroup.add(group);
    this.frameMeshes.push(inner);
  },

  /**
   * 네모 캐릭터 생성
   */
  createCharacter() {
    const group = new THREE.Group();

    // 몸통 — 검정 네모
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.9, 0.7);
    const bodyMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.45;
    group.add(body);

    // 몸통 윤곽선
    const bodyEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeo),
      new THREE.LineBasicMaterial({ color: 0x000000 }),
    );
    bodyEdges.position.y = 0.45;
    group.add(bodyEdges);

    // 눈 (흰색 점 2개)
    const eyeGeo = new THREE.BoxGeometry(0.12, 0.12, 0.02);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.15, 0.6, 0.36);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.15, 0.6, 0.36);
    group.add(rightEye);

    this.characterMesh = group;
    this.stairGroup.add(group);
    this.updateCharacterPosition(0);
  },

  /**
   * 캐릭터를 특정 계단 위치에 배치 (소수점 허용 — 보간)
   */
  updateCharacterPosition(step) {
    if (!this.characterMesh) return;

    const floorStep = Math.floor(step);
    const frac = step - floorStep;

    // 현재 계단과 다음 계단의 각도/높이 보간
    const ang0 = ((floorStep + 0.5) * this.ANGLE_PER_STAIR * Math.PI) / 180;
    const ang1 = ((floorStep + 1.5) * this.ANGLE_PER_STAIR * Math.PI) / 180;
    const ang = ang0 + (ang1 - ang0) * frac;

    const y0 = floorStep * this.STAIR_HEIGHT + this.STAIR_THICKNESS;
    const y1 = (floorStep + 1) * this.STAIR_HEIGHT + this.STAIR_THICKNESS;
    const baseY = y0 + (y1 - y0) * frac;

    // 점프 포물선 (frac 기반)
    const jumpArc = Math.sin(frac * Math.PI) * 1.2;

    const midR = (this.INNER_RADIUS + this.OUTER_RADIUS) * 0.5;

    this.characterMesh.position.set(
      Math.cos(ang) * midR,
      baseY + jumpArc,
      Math.sin(ang) * midR,
    );

    // 캐릭터가 계단 올라가는 방향(접선)을 바라보도록 회전
    this.characterMesh.rotation.y = -ang;
  },

  /**
   * 초기 카메라 설정
   */
  setupCamera() {
    this.updateCamera();
  },

  updateCamera() {
    if (!this.characterMesh) return;

    const charPos = this.characterMesh.position;
    const step = this.animStep;

    // 캐릭터 진행 각도
    const charAng = ((step + 0.5) * this.ANGLE_PER_STAIR * Math.PI) / 180;

    // 카메라: 캐릭터 뒤쪽 사선에서 약간 위를 바라봄
    const camOffsetAng = charAng - Math.PI * 0.35; // 캐릭터 뒤쪽-옆
    const camDist = 14;
    const camHeightOffset = 5;

    this.camera.position.set(
      charPos.x + Math.cos(camOffsetAng) * camDist,
      charPos.y + camHeightOffset,
      charPos.z + Math.sin(camOffsetAng) * camDist,
    );

    // 캐릭터 약간 위를 바라봄
    this.camera.lookAt(
      charPos.x,
      charPos.y + 3,
      charPos.z,
    );

    // 진행률 표시
    if (this.progressEl) {
      const floor = Math.floor(this.animStep) + 1;
      this.progressEl.textContent = `${floor}F`;
    }

    // Particles
    const progress = this.animStep / (this.TOTAL_STAIRS - 1);
    if (progress >= 0.85 && !this.hasExploded) {
      this.hasExploded = true;
      this.createParticles();
    }
    if (progress < 0.75) this.hasExploded = false;
  },

  createParticles() {
    if (!this.particleBox) return;
    const colors = ["#111", "#333", "#555", "#777", "#999"];
    for (let i = 0; i < 80; i++) {
      const p = document.createElement("div");
      p.className = "particle";
      const size = Math.random() * 12 + 4;
      const cx = window.innerWidth / 2,
        cy = window.innerHeight * 0.4;
      const a = Math.random() * Math.PI * 2;
      const d = Math.random() * 400 + 80;
      p.style.cssText = `width:${size}px;height:${size}px;background:${colors[Math.floor(Math.random() * colors.length)]};left:${cx}px;top:${cy}px;--tx:${Math.cos(a) * d}px;--ty:${Math.sin(a) * d}px`;
      this.particleBox.appendChild(p);
      setTimeout(() => p.remove(), 1500);
    }
  },

  bindEvents() {
    // Wheel — 한 칸씩 계단 이동
    let wheelCooldown = false;
    this.card.addEventListener(
      "wheel",
      (e) => {
        if (!this.card.classList.contains("fullscreen")) return;
        e.preventDefault();
        if (wheelCooldown) return;
        wheelCooldown = true;
        setTimeout(() => { wheelCooldown = false; }, 180);

        const dir = e.deltaY > 0 ? 1 : -1;
        this.targetStep = Math.max(0, Math.min(this.TOTAL_STAIRS - 1, this.targetStep + dir));
      },
      { passive: false },
    );

    // Touch — 한 칸씩 계단 이동
    let touchY = 0;
    let touchAccum = 0;
    this.card.addEventListener(
      "touchstart",
      (e) => {
        if (this.card.classList.contains("fullscreen")) {
          touchY = e.touches[0].clientY;
          touchAccum = 0;
        }
      },
      { passive: true },
    );
    this.card.addEventListener(
      "touchmove",
      (e) => {
        if (!this.card.classList.contains("fullscreen")) return;
        const dy = touchY - e.touches[0].clientY;
        touchY = e.touches[0].clientY;
        touchAccum += dy;
        const threshold = 30;
        if (Math.abs(touchAccum) >= threshold) {
          const steps = Math.round(touchAccum / threshold);
          this.targetStep = Math.max(0, Math.min(this.TOTAL_STAIRS - 1, this.targetStep + steps));
          touchAccum = 0;
        }
      },
      { passive: true },
    );

    // Click frames
    this.container.addEventListener("click", (e) => {
      if (!this.card.classList.contains("fullscreen")) return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.frameMeshes);
      if (hits.length > 0 && hits[0].object.userData.videoSrc) {
        const idx = hits[0].object.userData.videoIndex || 0;
        this.openVideoPopup(hits[0].object.userData.videoSrc, idx);
      }
    });

    window.addEventListener("resize", () => {
      if (this.isInitialized) this.handleResize();
    });
  },

  handleResize() {
    if (!this.renderer || !this.container) return;
    
    // getBoundingClientRect가 전환 중에도 정확한 크기를 반환
    const rect = this.container.getBoundingClientRect();
    const w = Math.round(rect.width) || 1;
    const h = Math.round(rect.height) || 1;
    
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    
    // 캔버스가 컨테이너를 정확히 채우도록 스타일 강제
    const canvas = this.renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
  },

  animate() {
    requestAnimationFrame(() => this.animate());

    // animStep을 targetStep 쪽으로 부드럽게 보간
    const diff = this.targetStep - this.animStep;
    if (Math.abs(diff) > 0.01) {
      this.animStep += diff * 0.12;
    } else {
      this.animStep = this.targetStep;
    }

    // 캐릭터 위치 업데이트
    this.updateCharacterPosition(this.animStep);

    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  },

  /**
   * 비디오 팝업 생성 (DOM)
   */
  createPopupDOM() {
    if (document.getElementById('c5-popup-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'c5-popup-overlay';
    overlay.className = 'c5-popup-overlay';
    overlay.innerHTML = `
      <div class="c5-popup-card">
        <button class="c5-popup-close">&times;</button>
        <div class="c5-popup-left">
          <video id="c5-popup-video" controls playsinline></video>
        </div>
        <div class="c5-popup-right">
          <span class="c5-popup-chapter" id="c5-popup-chapter"></span>
          <h2 class="c5-popup-title" id="c5-popup-title"></h2>
          <p class="c5-popup-desc" id="c5-popup-desc"></p>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    // 닫기 이벤트
    overlay.querySelector('.c5-popup-close').addEventListener('click', () => this.closeVideoPopup());
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.closeVideoPopup();
    });
  },

  openVideoPopup(src, index) {
    this.createPopupDOM();
    const overlay = document.getElementById('c5-popup-overlay');
    const video = document.getElementById('c5-popup-video');
    const info = this.VIDEO_INFO[index] || this.VIDEO_INFO[0];

    video.src = src;
    document.getElementById('c5-popup-chapter').textContent = `CHAPTER ${index + 1}`;
    document.getElementById('c5-popup-title').textContent = info.title;
    document.getElementById('c5-popup-desc').textContent = info.desc;

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      video.play().catch(() => {});
    });
  },

  closeVideoPopup() {
    const overlay = document.getElementById('c5-popup-overlay');
    if (!overlay) return;
    const video = document.getElementById('c5-popup-video');
    if (video) { video.pause(); video.src = ''; }
    overlay.classList.remove('active');
  },

  closeVideo() {
    this.closeVideoPopup();
  },
};
