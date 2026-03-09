window.Card3 = {
  // 상태 및 설정값
  card: null,
  container: null,
  scene: null,
  camera: null,
  renderer: null,
  controls: null,
  clock: null,
  isInitialized: false,
  _boundAnimate: null,
  _isMobile: false,
  _isAnimating: false,
  _paddyStems: [],
  _raycaster: null,
  score: 0,
  _tileFaceData: null,

  // 미리보기 3D
  _previewRenderer: null,
  _previewScene: null,
  _previewCamera: null,
  _previewTileGroup: null,
  _currentTileGroup: null,   // pickNextTile에서 미리 생성된 타일 그룹
  _previewPaddyStems: [],    // preview 타일 내 벼 줄기 (배치 시 main으로 이전)

  // 타일 배치 추적
  _placedTiles: null, // Set<"q,r">
  _guideMeshes: [], // 인접 빈 자리 가이드 mesh 배열
  _guideSharedGeo: null,
  _hoveredGuide: null,

  // 육각형 이웃 방향 (axial 좌표계)
  NEIGHBORS: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, -1],
    [-1, 1],
  ],

  // 상수 설정
  TILE_RADIUS: 1,
  TILE_HEIGHT: 0.2,
  TERRAINS: ["Mountain", "Paddy", "River", "House", "Railroad", "Forest"],
  remainingTiles: 50,
  currentTile: {
    rotation: 0, // 0~5 (60도 단위)
    faces: [], // 6개 face의 terrain 타입 (미리 결정)
  },

  // 초기화 메서드
  init() {
    this.card = document.querySelector("#card-3");
    this.container = document.querySelector("#three-container-3");

    if (!this.card || !this.container) return;
    if (this.isInitialized) return;

    this._isMobile =
      /Mobi|Android|iPad|Tablet/i.test(navigator.userAgent) ||
      ("ontouchstart" in window && window.innerWidth < 1024);

    new ResizeObserver(() => this.handleResize()).observe(this.container);
    this.initThree();

    // 히든 버튼: 🚧 아이콘 클릭 → 오버레이 숨김 + 풀스크린 진입
    const wipOverlay = this.card.querySelector('.c3-wip-overlay');
    const wipIcon = this.card.querySelector('.c3-wip-icon');
    if (wipIcon && wipOverlay) {
      wipIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = App.cards.indexOf(this.card);
        if (idx !== -1 && !App.isFullscreen && !App.isAnimating) {
          wipOverlay.classList.add('c3-wip-hidden');
          App.enterFullscreen(idx);
        }
      });

      // 풀스크린 종료(뒤로가기) 감지 → 오버레이 복원
      new MutationObserver(() => {
        if (!this.card.classList.contains('fullscreen')) {
          wipOverlay.classList.remove('c3-wip-hidden');
        }
      }).observe(this.card, { attributes: true, attributeFilter: ['class'] });
    }
  },

  initThree() {
    this.isInitialized = true;
    this.clock = new THREE.Clock();
    this._boundAnimate = this.animate.bind(this);
    this._raycaster = new THREE.Raycaster();
    this._placedTiles = new Set();
    this._tileFaceData = new Map();

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf2e4c4);
    this.scene.fog = new THREE.Fog(0xf2e4c4, 18, 38);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. 가이드 공유 geometry (한 번만 생성)
    this._guideSharedGeo = new THREE.CylinderGeometry(
      this.TILE_RADIUS * 0.9,
      this.TILE_RADIUS * 0.9,
      0.08,
      6,
    );

    // 5. Preview renderer (Dock UI용 3D 미리보기)
    this.initPreview();

    // 6. Lights, Controls, 첫 타일 배치
    this.setupLights();
    this.setupControls();
    this.initFirstTile();
    this.initScoreUI();

    // 7. 다음 타일 결정 + 이벤트 등록
    this.pickNextTile();
    this.setupClickEvents();

    this.handleResize();
  },

  initPreview() {
    this._previewRenderer = new THREE.WebGLRenderer({ antialias: true });
    this._previewRenderer.setSize(108, 108);
    this._previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this._previewScene = new THREE.Scene();
    this._previewScene.background = new THREE.Color(0xf2e4c4);

    this._previewCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this._previewCamera.position.set(0, 3.2, 2.4);
    this._previewCamera.lookAt(0, 0.1, 0);

    this._previewScene.add(new THREE.AmbientLight(0xfff0d8, 1.1));
    const d = new THREE.DirectionalLight(0xfff4c0, 1.5);
    d.position.set(4, 7, 4);
    this._previewScene.add(d);
    const fill = new THREE.DirectionalLight(0xffc880, 0.4);
    fill.position.set(-3, 2, -5);
    this._previewScene.add(fill);
  },

  setupLights() {
    this.scene.add(new THREE.AmbientLight(0xfff0d8, 1.0));
    const dirLight = new THREE.DirectionalLight(0xfff4c0, 1.4);
    dirLight.position.set(8, 14, 6);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0xffc880, 0.35);
    fillLight.position.set(-5, 3, -8);
    this.scene.add(fillLight);
  },

  setupControls() {
    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
    this.controls.enableDamping = true;
    const fixedTilt = Math.PI / 3;
    this.controls.minPolarAngle = fixedTilt;
    this.controls.maxPolarAngle = fixedTilt;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.zoomSpeed = 1.2;
  },

  // ── 첫 타일 & 가이드 ─────────────────────────────────────────

  initFirstTile() {
    const firstFaces = Array.from(
      { length: 6 },
      () => this.TERRAINS[Math.floor(Math.random() * this.TERRAINS.length)],
    );
    this.scene.add(this.createTile(0, 0, firstFaces));
    this._placedTiles.add("0,0");
    this._tileFaceData.set("0,0", { faces: firstFaces, rotation: 0 });
    this.updateGuides();
  },

  hexToWorld(q, r) {
    const hexWidth = this.TILE_RADIUS * 2;
    const hexHeight = Math.sqrt(3) * this.TILE_RADIUS;
    return [hexWidth * (3 / 4) * q, hexHeight * (r + q / 2)];
  },

  updateGuides() {
    // 기존 가이드 제거 (geometry 공유, material만 dispose)
    for (const g of this._guideMeshes) {
      this.scene.remove(g);
      g.material.dispose();
    }
    this._guideMeshes = [];
    this._hoveredGuide = null;

    if (this.remainingTiles <= 0) return;

    // 배치된 타일 주변 빈 자리 수집
    const emptyKeys = new Set();
    for (const key of this._placedTiles) {
      const [q, r] = key.split(",").map(Number);
      for (const [dq, dr] of this.NEIGHBORS) {
        const nkey = `${q + dq},${r + dr}`;
        if (!this._placedTiles.has(nkey)) emptyKeys.add(nkey);
      }
    }

    for (const key of emptyKeys) {
      const [q, r] = key.split(",").map(Number);
      const [wx, wz] = this.hexToWorld(q, r);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x88dd44,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        emissive: new THREE.Color(0x44bb22),
        emissiveIntensity: 0.25,
      });
      const mesh = new THREE.Mesh(this._guideSharedGeo, mat);
      mesh.rotation.y = Math.PI / 2; // 타일 헥사곤(꼭지점=+X)과 방향 일치
      mesh.position.set(wx, 0.03, wz);
      mesh.userData.isGuide = true;
      mesh.userData.q = q;
      mesh.userData.r = r;
      this.scene.add(mesh);
      this._guideMeshes.push(mesh);
    }
  },

  // ── 클릭 이벤트 ──────────────────────────────────────────────

  setupClickEvents() {
    const el = this.renderer.domElement;
    // 드래그와 클릭 구분: pointerdown 위치와 pointerup 위치 차이가 4px 이상이면 드래그로 판정
    this._mouseDownPos = null;
    el.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" && !this._isMobile) return;
      this._mouseDownPos = { x: e.clientX, y: e.clientY };
    });
    // fullscreen 상태에서만 게임 인터랙션 처리
    // fullscreen이 아닐 때는 전파를 차단하지 않아 카드 클릭 → enterFullscreen이 동작
    el.addEventListener("click", (e) => {
      if (!this.card.classList.contains("fullscreen")) return;
      e.stopPropagation();
      if (!this._mouseDownPos) return;
      const dx = e.clientX - this._mouseDownPos.x;
      const dy = e.clientY - this._mouseDownPos.y;
      if (dx * dx + dy * dy < 16) this.onCanvasClick(e); // 4px 이내만 클릭 처리
      this._mouseDownPos = null;
    });
    el.addEventListener("pointermove", (e) => this.onCanvasMouseMove(e));
  },

  _getNDC(event) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };
  },

  onCanvasClick(event) {
    this._raycaster.setFromCamera(this._getNDC(event), this.camera);
    const hits = this._raycaster.intersectObjects(this._guideMeshes, false);
    if (hits.length > 0) {
      const { q, r } = hits[0].object.userData;
      this.placeTile(q, r);
    }
  },

  onCanvasMouseMove(event) {
    this._raycaster.setFromCamera(this._getNDC(event), this.camera);
    const hits = this._raycaster.intersectObjects(this._guideMeshes, false);

    // 이전 호버 해제
    if (this._hoveredGuide) {
      this._hoveredGuide.material.opacity = 0.35;
      this._hoveredGuide.material.emissiveIntensity = 0.25;
      this._hoveredGuide = null;
    }

    if (hits.length > 0) {
      this._hoveredGuide = hits[0].object;
      this._hoveredGuide.material.opacity = 0.75;
      this._hoveredGuide.material.emissiveIntensity = 0.7;
      this.renderer.domElement.style.cursor = "pointer";
    } else {
      this.renderer.domElement.style.cursor = "default";
    }
  },

  // ── 타일 생성 & 배치 ─────────────────────────────────────────

  placeTile(q, r) {
    if (this.remainingTiles <= 0 || !this._currentTileGroup) return;

    // preview에서 미리 생성된 타일을 그대로 사용 (회전 포함)
    const tileGroup = this._currentTileGroup;
    this._previewScene.remove(tileGroup);
    this._previewTileGroup = null;
    this._currentTileGroup = null;

    // (0,0) 기준으로 생성된 타일을 배치 좌표로 이동
    const [wx, wz] = this.hexToWorld(q, r);
    tileGroup.position.set(wx, 0, wz);
    this.scene.add(tileGroup);

    // preview paddy stems → main 애니메이션 목록으로 이전
    this._paddyStems.push(...this._previewPaddyStems);
    this._previewPaddyStems = [];

    this._placedTiles.add(`${q},${r}`);
    this._tileFaceData.set(`${q},${r}`, {
      faces: this.currentTile.faces,
      rotation: this.currentTile.rotation,
    });
    const gained = this.calcMatchScore(
      q,
      r,
      this.currentTile.faces,
      this.currentTile.rotation,
    );
    if (gained > 0) {
      this.score += gained;
      this.showScorePopup(`+${gained}`);
      this.updateScoreUI();
    }
    this.remainingTiles--;
    this.updateGuides();
    this.pickNextTile();
  },

  _dirToFace(dq, dr) {
    const map = {
      "1,0": 0,
      "0,1": 1,
      "-1,1": 2,
      "-1,0": 3,
      "0,-1": 4,
      "1,-1": 5,
    };
    return map[`${dq},${dr}`] ?? -1;
  },

  calcMatchScore(q, r, newFaces, newRotation) {
    let gained = 0;
    for (const [dq, dr] of this.NEIGHBORS) {
      const nkey = `${q + dq},${r + dr}`;
      if (!this._tileFaceData.has(nkey)) continue;
      const { faces: nFaces, rotation: nRot } = this._tileFaceData.get(nkey);
      if (!nFaces) continue;
      const newFaceDir = this._dirToFace(dq, dr);
      if (newFaceDir === -1) continue;
      const newFaceIdx = (((newFaceDir - newRotation) % 6) + 6) % 6;
      const oldFaceDir = this._dirToFace(-dq, -dr);
      if (oldFaceDir === -1) continue;
      const oldFaceIdx = (((oldFaceDir - nRot) % 6) + 6) % 6;
      if (newFaces[newFaceIdx] === nFaces[oldFaceIdx]) gained += 50;
    }
    return gained;
  },

  initScoreUI() {
    const el = document.createElement("div");
    el.className = "c3-score-display";
    el.innerHTML = `<span class="c3-score-label">SCORE</span><span class="c3-score-value">0</span>`;
    this.container.appendChild(el);
  },

  updateScoreUI() {
    const el = this.container.querySelector(".c3-score-value");
    if (el) el.textContent = this.score;
  },

  showScorePopup(text) {
    const el = document.createElement("div");
    el.className = "c3-score-popup";
    el.textContent = text;
    this.container.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  },

  // faces 배열을 받아 타일 생성 (null이면 랜덤)
  // top face: 단일 BufferGeometry + vertex colors → 삼각형 경계 없음
  createTile(q, r, faces) {
    const hexWidth = this.TILE_RADIUS * 2;
    const hexHeight = Math.sqrt(3) * this.TILE_RADIUS;
    const x = hexWidth * (3 / 4) * q;
    const z = hexHeight * (r + q / 2);

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const R = this.TILE_RADIUS;
    const H = this.TILE_HEIGHT;

    const faceTypes = faces
      ? faces
      : Array.from(
          { length: 6 },
          () => this.TERRAINS[Math.floor(Math.random() * this.TERRAINS.length)],
        );

    // ── top face: 6개 삼각형을 하나의 BufferGeometry로 (vertex 공유 없음) ───
    const topPos = [],
      topCol = [],
      topNorm = [];
    for (let fi = 0; fi < 6; fi++) {
      const a0 = (Math.PI / 3) * fi;
      const a1 = (Math.PI / 3) * (fi + 1);
      const v0x = Math.cos(a0) * R,
        v0z = Math.sin(a0) * R;
      const v1x = Math.cos(a1) * R,
        v1z = Math.sin(a1) * R;
      const col = new THREE.Color(this.getTileColor(faceTypes[fi]));
      // center, v0, v1 (XZ 평면, Y = H)
      topPos.push(0, H, 0, v0x, H, v0z, v1x, H, v1z);
      for (let k = 0; k < 3; k++) {
        topCol.push(col.r, col.g, col.b);
        topNorm.push(0, 1, 0);
      }
    }
    const topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(topPos, 3),
    );
    topGeo.setAttribute("color", new THREE.Float32BufferAttribute(topCol, 3));
    topGeo.setAttribute("normal", new THREE.Float32BufferAttribute(topNorm, 3));
    const topMesh = new THREE.Mesh(
      topGeo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
      }),
    );
    topMesh.receiveShadow = true;
    group.add(topMesh);

    // ── side face: 6개 quad → 12 triangles (직접 BufferGeometry) ────────
    const sidePos = [],
      sideNorm = [],
      sideCol = [];
    const sideTopCol = new THREE.Color(0x8a6038); // 상단 갈색
    for (let fi = 0; fi < 6; fi++) {
      const a0 = (Math.PI / 3) * fi;
      const a1 = (Math.PI / 3) * (fi + 1);
      const v0x = Math.cos(a0) * R,
        v0z = Math.sin(a0) * R;
      const v1x = Math.cos(a1) * R,
        v1z = Math.sin(a1) * R;
      const mx = (v0x + v1x) / 2,
        mz = (v0z + v1z) / 2;
      const ml = Math.sqrt(mx * mx + mz * mz);
      const nx = mx / ml,
        nz = mz / ml;
      const tc = new THREE.Color(this.getTileColor(faceTypes[fi]));
      // tri 1: v0-top, v1-top, v0-bot
      sidePos.push(v0x, H, v0z, v1x, H, v1z, v0x, 0, v0z);
      for (let k = 0; k < 3; k++) sideNorm.push(nx, 0, nz);
      sideCol.push(
        sideTopCol.r, sideTopCol.g, sideTopCol.b,
        sideTopCol.r, sideTopCol.g, sideTopCol.b,
        tc.r, tc.g, tc.b,
      );
      // tri 2: v1-top, v1-bot, v0-bot
      sidePos.push(v1x, H, v1z, v1x, 0, v1z, v0x, 0, v0z);
      for (let k = 0; k < 3; k++) sideNorm.push(nx, 0, nz);
      sideCol.push(
        sideTopCol.r, sideTopCol.g, sideTopCol.b,
        tc.r, tc.g, tc.b,
        tc.r, tc.g, tc.b,
      );
    }
    const sideGeo = new THREE.BufferGeometry();
    sideGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(sidePos, 3),
    );
    sideGeo.setAttribute(
      "normal",
      new THREE.Float32BufferAttribute(sideNorm, 3),
    );
    sideGeo.setAttribute(
      "color",
      new THREE.Float32BufferAttribute(sideCol, 3),
    );
    const sideMesh = new THREE.Mesh(
      sideGeo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.95,
      }),
    );
    sideMesh.receiveShadow = true;
    group.add(sideMesh);

    // ── terrain objects ─────────────────────────────────────────────────
    for (let fi = 0; fi < 6; fi++) {
      const terrainObj = this.createTerrainObjectForFace(faceTypes[fi], fi);
      if (terrainObj) {
        terrainObj.position.y = H * 2;
        group.add(terrainObj);
      }
    }

    return group;
  },

  getTileColor(type) {
    const colors = {
      Mountain: 0x9a8468,
      Paddy: 0xbf8a18,
      River: 0x5a9438,
      House: 0x72aa40,
      Railroad: 0x7aaa34,
      Forest: 0x3c6c22,
    };
    return colors[type] || 0xeeeeee;
  },

  createTerrainObjectForFace(type, fi) {
    const g = new THREE.Group();
    const R = this.TILE_RADIUS;
    const a0 = (Math.PI / 3) * fi;
    const a1 = (Math.PI / 3) * (fi + 1);
    const v0x = Math.cos(a0) * R,
      v0z = Math.sin(a0) * R;
    const v1x = Math.cos(a1) * R,
      v1z = Math.sin(a1) * R;
    const cx = (v0x + v1x) / 3,
      cz = (v0z + v1z) / 3;
    const midAngle = (a0 + a1) / 2;

    const rand = (m = 0.1) => {
      let b, c;
      do {
        b = m + Math.random() * (1 - 2 * m);
        c = m + Math.random() * (1 - 2 * m);
      } while (b + c > 1 - m);
      return [b * v0x + c * v1x, b * v0z + c * v1z];
    };

    if (type === "Mountain") {
      const addPeak = (px, pz, sc, col, snow) => {
        const peak = new THREE.Mesh(
          new THREE.ConeGeometry(0.14 * sc, 0.42 * sc, 7),
          new THREE.MeshStandardMaterial({
            color: col,
            flatShading: true,
            roughness: 0.92,
          }),
        );
        peak.position.set(px, 0.21 * sc, pz);
        peak.castShadow = true;
        g.add(peak);
        if (snow) {
          const cap = new THREE.Mesh(
            new THREE.ConeGeometry(0.055 * sc, 0.13 * sc, 7),
            new THREE.MeshStandardMaterial({
              color: 0xfff8ee,
              flatShading: true,
            }),
          );
          cap.position.set(px, 0.38 * sc, pz);
          g.add(cap);
        }
      };
      const style = Math.floor(Math.random() * 3);
      if (style === 0) {
        addPeak(cx, cz, 0.85, 0x9a8778, false);
        const [px2, pz2] = rand(0.12);
        addPeak(px2, pz2, 0.55, 0x8a7468, false);
      } else if (style === 1) {
        addPeak(cx, cz, 0.9, 0x5c8835, false);
      } else {
        addPeak(cx, cz, 0.88, 0x7a7060, true);
        const [px2, pz2] = rand(0.12);
        addPeak(px2, pz2, 0.55, 0x6a6050, true);
      }
    } else if (type === "Forest") {
      const AUTUMN = [
        0x2d6a1a, 0x4a8820, 0x7c3a18, 0xc85018, 0xe07a20, 0xd4a010, 0x5a7820,
      ];
      const trkMat = new THREE.MeshStandardMaterial({
        color: 0x5a3010,
        flatShading: true,
        roughness: 0.95,
      });
      const count = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const [tx, tz] = i === 0 ? [cx, cz] : rand(0.08);
        const col = AUTUMN[Math.floor(Math.random() * AUTUMN.length)];
        const sc = 0.42 + Math.random() * 0.45;
        const isPine = Math.random() > 0.5;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028 * sc, 0.042 * sc, 0.22 * sc, 5),
          trkMat,
        );
        trunk.position.set(tx, 0.11 * sc, tz);
        trunk.castShadow = true;
        g.add(trunk);
        const mat = new THREE.MeshStandardMaterial({
          color: col,
          flatShading: true,
          roughness: 0.88,
        });
        if (isPine) {
          for (let l = 0; l < 3; l++) {
            const c = new THREE.Mesh(
              new THREE.ConeGeometry((0.17 - l * 0.033) * sc, 0.21 * sc, 6),
              mat,
            );
            c.position.set(tx, (0.22 + l * 0.18) * sc, tz);
            c.castShadow = true;
            g.add(c);
          }
        } else {
          const ball = new THREE.Mesh(
            new THREE.SphereGeometry(0.16 * sc, 6, 5),
            mat,
          );
          ball.position.set(tx, 0.38 * sc, tz);
          ball.castShadow = true;
          g.add(ball);
        }
      }
    } else if (type === "House") {
      const roofCols = [0xcc3328, 0x4488cc, 0xa83520, 0x4a78aa, 0xbb3322];
      const wallMat = new THREE.MeshStandardMaterial({
        color: 0xd4c4a0,
        flatShading: true,
        roughness: 0.88,
      });
      const num = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < num; i++) {
        const [hx, hz] = i === 0 ? [cx, cz] : rand(0.1);
        const sc = 0.52 + Math.random() * 0.32;
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(0.22 * sc, 0.22 * sc, 0.22 * sc),
          wallMat,
        );
        wall.position.set(hx, 0.11 * sc, hz);
        wall.castShadow = true;
        g.add(wall);
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(0.19 * sc, 0.19 * sc, 4),
          new THREE.MeshStandardMaterial({
            color: roofCols[Math.floor(Math.random() * roofCols.length)],
            flatShading: true,
            roughness: 0.9,
          }),
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.set(hx, 0.29 * sc, hz);
        roof.castShadow = true;
        g.add(roof);
      }
    } else if (type === "Paddy") {
      const stemMat = new THREE.MeshStandardMaterial({
        color: 0xb8c848,
        flatShading: true,
        roughness: 0.9,
      });
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xd4a830,
        flatShading: true,
        roughness: 0.88,
      });
      const stemGeo = new THREE.CylinderGeometry(0.01, 0.016, 0.18, 4);
      const headGeo = new THREE.ConeGeometry(0.018, 0.07, 4);
      const count = 5 + Math.floor(Math.random() * 5);
      for (let i = 0; i < count; i++) {
        const [px, pz] = rand(0.07);
        const stalk = new THREE.Group();
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.09;
        stalk.add(stem);
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.set(0.025, 0.2, 0);
        head.rotation.z = 0.35;
        stalk.add(head);
        stalk.position.set(px, 0, pz);
        stalk.userData.wavePhase = Math.random() * Math.PI * 2;
        stalk.userData.waveX = px;
        g.add(stalk);
        this._paddyStems.push(stalk);
      }
    } else if (type === "River") {
      const water = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.022, 0.62),
        new THREE.MeshStandardMaterial({
          color: 0x4a8fc8,
          roughness: 0.1,
          metalness: 0.15,
        }),
      );
      water.rotation.y = -midAngle;
      water.position.set(cx, 0.011, cz);
      g.add(water);
      const bushMat = new THREE.MeshStandardMaterial({
        color: 0x3e8420,
        flatShading: true,
        roughness: 0.9,
      });
      for (let i = 0; i < 3; i++) {
        const [bx, bz] = rand(0.08);
        const bush = new THREE.Mesh(
          new THREE.SphereGeometry(0.062 + Math.random() * 0.03, 5, 4),
          bushMat,
        );
        bush.scale.y = 0.7;
        bush.position.set(bx, 0.04, bz);
        g.add(bush);
      }
    } else if (type === "Railroad") {
      const perpAngle = midAngle + Math.PI / 2;
      const sleeperMat = new THREE.MeshStandardMaterial({
        color: 0x6b4520,
        flatShading: true,
        roughness: 0.9,
      });
      const railMat = new THREE.MeshStandardMaterial({
        color: 0xb0a890,
        metalness: 0.75,
        roughness: 0.35,
      });
      for (let s = -1; s <= 1; s++) {
        const sl = new THREE.Mesh(
          new THREE.BoxGeometry(0.26, 0.03, 0.07),
          sleeperMat,
        );
        sl.rotation.y = -midAngle;
        sl.position.set(
          cx + Math.cos(midAngle) * s * 0.2,
          0.015,
          cz + Math.sin(midAngle) * s * 0.2,
        );
        g.add(sl);
      }
      [-0.08, 0.08].forEach((offset) => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, 0.034, 0.6),
          railMat,
        );
        rail.rotation.y = -midAngle;
        rail.position.set(
          cx + Math.cos(perpAngle) * offset,
          0.037,
          cz + Math.sin(perpAngle) * offset,
        );
        g.add(rail);
      });
    }

    return g;
  },

  // ── Dock UI ───────────────────────────────────────────────────

  updateDockUI() {
    const dock = document.querySelector(".c3-track-dock");
    if (!dock) return;

    dock.innerHTML = `
      <div class="c3-inventory">
        <div class="c3-tile-preview">
          <span class="tile-label">NEXT TILE</span>
          <div class="c3-preview-container"></div>
          <div class="c3-rotate-row">
            <button class="c3-rotate-btn" id="rotate-ccw" title="반시계 회전">↺</button>
            <span class="c3-rot-label">${this.currentTile.rotation * 60}°</span>
            <button class="c3-rotate-btn" id="rotate-cw" title="시계 회전">↻</button>
          </div>
        </div>
        <div class="c3-tile-count">📦 남은 타일: <strong>${this.remainingTiles}</strong></div>
        <div class="c3-face-hint">초록 자리를 클릭해<br>타일을 이어 붙이세요</div>
      </div>
    `;

    document.getElementById("rotate-ccw").onclick = (e) => { e.stopPropagation(); this.rotateTile(1); };
    document.getElementById("rotate-cw").onclick = (e) => { e.stopPropagation(); this.rotateTile(-1); };

    this.updatePreview3D();
  },

  updatePreview3D() {
    if (!this._previewRenderer || !this._previewScene || !this._currentTileGroup) return;

    const tile = this._currentTileGroup;

    // _currentTileGroup이 바뀐 경우에만 씬 업데이트 (회전 버튼 시에는 스킵)
    if (this._previewTileGroup !== tile) {
      if (this._previewTileGroup) {
        this._previewScene.remove(this._previewTileGroup);
      }
      this._previewScene.add(tile);
      this._previewTileGroup = tile;
    }

    // 회전만 업데이트
    tile.rotation.y = (Math.PI / 3) * this.currentTile.rotation;

    // canvas를 container에 mount (innerHTML 교체 후 재연결)
    const container = document.querySelector(".c3-preview-container");
    if (container && !container.contains(this._previewRenderer.domElement)) {
      container.appendChild(this._previewRenderer.domElement);
    }
    this._previewRenderer.render(this._previewScene, this._previewCamera);
  },

  rotateTile(direction) {
    this.currentTile.rotation = (this.currentTile.rotation + direction + 6) % 6;
    this.updateDockUI();
  },

  pickNextTile() {
    // 배치되지 않은 이전 타일이 있으면 정리
    if (this._currentTileGroup) {
      this._previewScene.remove(this._currentTileGroup);
      this._currentTileGroup.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material))
            child.material.forEach((m) => m.dispose());
          else child.material.dispose();
        }
      });
      this._previewPaddyStems = [];
    }

    this.currentTile.rotation = 0;
    this.currentTile.faces = Array.from(
      { length: 6 },
      () => this.TERRAINS[Math.floor(Math.random() * this.TERRAINS.length)],
    );

    // 타일을 미리 생성 (preview & 배치에 동일 객체 사용 → 모양 일치 보장)
    const savedStems = this._paddyStems;
    this._paddyStems = [];
    this._currentTileGroup = this.createTile(0, 0, this.currentTile.faces);
    this._previewPaddyStems = this._paddyStems;
    this._paddyStems = savedStems;

    this._previewTileGroup = null; // updatePreview3D에서 씬 재연결 강제
    this.updateDockUI();
  },

  // ── 리사이즈 & 루프 ──────────────────────────────────────────

  handleResize() {
    if (!this.container || !this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w === 0 || h === 0) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  },

  activate() {
    if (!this.isInitialized) return;
    this.handleResize();
    if (!this._isAnimating) {
      this._isAnimating = true;
      this.animate();
    }
  },

  deactivate() {
    this._isAnimating = false;
  },

  animate() {
    if (!this._isAnimating) return;
    requestAnimationFrame(this._boundAnimate);
    if (this.controls) this.controls.update();

    const t = this.clock.getElapsedTime();

    // 벼 흔들림
    for (const stalk of this._paddyStems) {
      const wave =
        Math.sin(
          t * 1.4 + stalk.userData.wavePhase + stalk.userData.waveX * 2.5,
        ) * 0.12;
      stalk.rotation.x = wave;
      stalk.rotation.z = wave * 0.55;
    }

    // 가이드 펄스 (호버 중이 아닌 것만)
    for (const g of this._guideMeshes) {
      if (g !== this._hoveredGuide) {
        g.material.opacity =
          0.28 +
          0.1 * Math.sin(t * 2.2 + g.userData.q * 1.3 + g.userData.r * 0.9);
      }
    }

    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  },
};
