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

  // State
  scroll: 0,
  targetScroll: 0,
  maxScroll: 100,
  hasExploded: false,
  isInitialized: false,

  // Parameters — 레퍼런스 이미지에 맞춰 조정
  TOTAL_STAIRS: 36,
  STAIR_HEIGHT: 1.2,
  ANGLE_PER_STAIR: 22,
  INNER_RADIUS: 1.0,
  OUTER_RADIUS: 4.8,
  STAIR_THICKNESS: 0.28,
  EYE_HEIGHT: 1.6,
  FRAME_STAIRS: [5, 11, 17, 23, 29, 35],
  VIDEOS: [
    "Video/vid1.mp4",
    "Video/vid2.mp4",
    "Video/vid3.mp4",
    "Video/vid4.mp4",
    "Video/vid5.mp4",
    "Video/vid6.mp4",
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
   * 초기 카메라 설정 — 아래에서 올려다보는 사선 구도
   */
  setupCamera() {
    // 계단 가까이, 낮은 위치에서 45° 대각선으로 올려다봄
    const ang = Math.PI * 0.25;
    const dist = 10;
    this.camera.position.set(
      Math.cos(ang) * dist,
      2,
      Math.sin(ang) * dist,
    );
    this.camera.lookAt(0, 14, 0);
  },

  updateCamera() {
    const progress = this.scroll / this.maxScroll;
    const totalH = this.TOTAL_STAIRS * this.STAIR_HEIGHT;

    // 가까운 거리에서 올려다보며, 스크롤에 따라 계단을 따라 상승
    const baseAngle = Math.PI * 0.25;
    const camAngle = baseAngle + progress * Math.PI * 1.5;
    const camDist = 10 + progress * 2;         // 가까운 거리 유지
    const camHeight = 2 + progress * totalH * 0.6;  // 낮은 곳에서 시작
    const lookHeight = camHeight + 12 + progress * 6; // 항상 위를 바라봄

    this.camera.position.set(
      Math.cos(camAngle) * camDist,
      camHeight,
      Math.sin(camAngle) * camDist,
    );
    this.camera.lookAt(0, lookHeight, 0);

    // 진행률 표시
    if (this.progressEl) {
      const floor = Math.floor(progress * this.TOTAL_STAIRS);
      this.progressEl.textContent = `${floor}F`;
    }

    // Particles
    if (this.scroll >= 85 && !this.hasExploded) {
      this.hasExploded = true;
      this.createParticles();
    }
    if (this.scroll < 75) this.hasExploded = false;
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
    // Wheel
    this.card.addEventListener(
      "wheel",
      (e) => {
        if (!this.card.classList.contains("fullscreen")) return;
        e.preventDefault();
        this.targetScroll = Utils.clamp(
          this.targetScroll + (e.deltaY > 0 ? 2.5 : -2.5),
          0,
          this.maxScroll,
        );
      },
      { passive: false },
    );

    // Touch
    let touchY = 0;
    this.card.addEventListener(
      "touchstart",
      (e) => {
        if (this.card.classList.contains("fullscreen"))
          touchY = e.touches[0].clientY;
      },
      { passive: true },
    );
    this.card.addEventListener(
      "touchmove",
      (e) => {
        if (!this.card.classList.contains("fullscreen")) return;
        const dy = touchY - e.touches[0].clientY;
        touchY = e.touches[0].clientY;
        this.targetScroll = Utils.clamp(
          this.targetScroll + dy * 0.3,
          0,
          this.maxScroll,
        );
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
        VideoPopup.open(hits[0].object.userData.videoSrc);
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

    const diff = this.targetScroll - this.scroll;
    if (Math.abs(diff) > 0.01) {
      this.scroll += diff * 0.07;
    } else {
      this.scroll = this.targetScroll;
    }

    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  },

  closeVideo() {
    VideoPopup.close();
  },
};
