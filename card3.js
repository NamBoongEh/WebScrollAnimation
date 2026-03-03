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

  // 상수 설정
  TILE_RADIUS: 1,
  TILE_HEIGHT: 0.2,
  GRID_SIZE: 5,
  TERRAINS: ["Mountain", "Paddy", "River", "House", "Railroad", "Forest"],
  remainingTiles: 40,
  currentTile: {
    type: "Mountain",
    rotation: 0, // 0~5 (60도 단위)
  },

  // 초기화 메서드
  init() {
    this.card = document.querySelector("#card-3");
    this.container = document.querySelector("#three-container-3");

    if (!this.card || !this.container) return;
    if (this.isInitialized) return;

    // 모바일 감지
    this._isMobile =
      /Mobi|Android|iPad|Tablet/i.test(navigator.userAgent) ||
      ("ontouchstart" in window && window.innerWidth < 1024);

    // 크기 변경 감지
    new ResizeObserver(() => this.handleResize()).observe(this.container);

    // Three.js 씬 초기화
    this.initThree();
  },

  initThree() {
    this.isInitialized = true;
    this.clock = new THREE.Clock();
    this._boundAnimate = this.animate.bind(this);

    // 1. Scene 설정
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xddeeff);

    // 2. Camera 설정
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000,
    );
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);

    // 3. Renderer 설정
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight,
    );
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 4. Lights & Controls & Grid 생성
    this.setupLights();
    this.setupControls();
    this.createGrid();

    // 초기 크기 조정 (실제 크기는 activate() 시 ResizeObserver로 갱신됨)
    this.handleResize();
  },

  setupLights() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
  },
  setupControls() {
    this.controls = new THREE.OrbitControls(
      this.camera,
      this.renderer.domElement,
    );
    this.controls.enableDamping = true;

    // 1. 위아래 각도 고정 (면끼리 닿는 각도를 잘 보기 위해 Math.PI/3 유지)
    const fixedTilt = Math.PI / 3;
    this.controls.minPolarAngle = fixedTilt;
    this.controls.maxPolarAngle = fixedTilt;

    // 2. 패닝 비활성화 (맵이 밀리지 않게)
    this.controls.enablePan = false;

    // 3. Zoom 설정 (Dolly Out 기능)
    this.controls.enableZoom = true;
    this.controls.minDistance = 5; // 최소 줌 인
    this.controls.maxDistance = 40; // 최대 줌 아웃 (맵 전체를 보기 위해 확장)
    this.controls.zoomSpeed = 1.2;
  },

  createGrid() {
    for (let q = -this.GRID_SIZE; q <= this.GRID_SIZE; q++) {
      for (let r = -this.GRID_SIZE; r <= this.GRID_SIZE; r++) {
        // 원형 범위 내에만 타일 배치
        if (Math.abs(q + r) <= this.GRID_SIZE) {
          const type =
            this.TERRAINS[Math.floor(Math.random() * this.TERRAINS.length)];
          const tile = this.createTile(q, r, type);
          this.scene.add(tile);
        }
      }
    }
  },

  createTile(q, r, type) {
    const hexWidth = this.TILE_RADIUS * 2;
    const hexHeight = Math.sqrt(3) * this.TILE_RADIUS;

    // Flat-top coordinates (Moves in the direction of the faces)
    const x = hexWidth * (3 / 4) * q;
    const z = hexHeight * (r + q / 2);

    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // 1. Create a Flat-top Hexagon Shape
    const shape = new THREE.Shape();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i; // 0 degrees starts at a vertex on the right for Flat-top
      const px = Math.cos(angle) * this.TILE_RADIUS;
      const py = Math.sin(angle) * this.TILE_RADIUS;
      if (i === 0) shape.moveTo(px, py);
      else shape.lineTo(px, py);
    }
    shape.closePath();

    const extrudeSettings = {
      depth: this.TILE_HEIGHT,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.02, // Small bevel keeps the "face-to-face" look tight
      bevelSegments: 3,
    };

    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // 2. Materials: Top is terrain, Sides are "Earth/Stone"
    const topMat = new THREE.MeshStandardMaterial({
      color: type === "Railroad" ? 0x8fce00 : this.getTileColor(type),
      flatShading: true,
    });
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x4d3826 });

    const mesh = new THREE.Mesh(geo, [topMat, sideMat]);
    mesh.rotation.x = -Math.PI / 2; // Lay it flat
    mesh.position.y = this.TILE_HEIGHT;
    mesh.receiveShadow = true;
    group.add(mesh);

    // 3. Add the upgraded terrain objects
    const terrainObj = this.createTerrainObject(type);
    if (terrainObj) group.add(terrainObj);

    return group;
  },

  getTileColor(type) {
    const colors = {
      Mountain: 0x888888,
      Paddy: 0x76c442,
      River: 0x44aaff,
      House: 0xaaaaaa,
      Railroad: 0x555555,
      Forest: 0x228b22,
    };
    return colors[type] || 0xeeeeee;
  },

  createTerrainObject(type) {
    const g = new THREE.Group();

    if (type === "Mountain") {
      const style = Math.floor(Math.random() * 3); // 3 variants
      const createPeak = (x, z, scale, color, snow = false) => {
        const peak = new THREE.Mesh(
          new THREE.ConeGeometry(0.4 * scale, 1.2 * scale, 6),
          new THREE.MeshStandardMaterial({ color: color, flatShading: true }),
        );
        peak.position.set(x, 0.6 * scale, z);
        peak.castShadow = true;
        g.add(peak);

        if (snow) {
          const snowCap = new THREE.Mesh(
            new THREE.ConeGeometry(0.18 * scale, 0.5 * scale, 6),
            new THREE.MeshStandardMaterial({ color: 0xffffff }),
          );
          snowCap.position.set(x, 0.96 * scale, z);
          g.add(snowCap);
        }
      };

      if (style === 0) {
        // Stone Peaks (Overlapping)
        createPeak(0.1, 0.1, 0.8, 0x777777);
        createPeak(-0.2, -0.1, 0.6, 0x666666);
      } else if (style === 1) {
        // Green Mountains
        createPeak(0, 0, 0.9, 0x4b6e2f);
        createPeak(0.2, -0.2, 0.5, 0x3d5a25);
      } else {
        // Snowy Stone Peaks
        createPeak(0, 0, 1.0, 0x666666, true);
        createPeak(-0.3, 0.2, 0.7, 0x555555, true);
      }
    } else if (type === "House") {
      // --- Swiss Chalet Design ---
      const wall = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.35, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xffffff }),
      );
      wall.position.y = 0.175;

      // Wide Overhanging Gabled Roof
      const roofPart = new THREE.BoxGeometry(0.6, 0.04, 0.5);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x4b2c20 });

      const leftRoof = new THREE.Mesh(roofPart, roofMat);
      leftRoof.position.set(-0.18, 0.45, 0);
      leftRoof.rotation.z = Math.PI / 4;

      const rightRoof = new THREE.Mesh(roofPart, roofMat);
      rightRoof.position.set(0.18, 0.45, 0);
      rightRoof.rotation.z = -Math.PI / 4;

      g.add(wall, leftRoof, rightRoof);
    } else if (type === "Railroad") {
      // --- Tracks on Grass ---
      const sleeperGeo = new THREE.BoxGeometry(0.5, 0.02, 0.08);
      const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x4d3826 });
      for (let i = -2; i <= 2; i++) {
        const sleeper = new THREE.Mesh(sleeperGeo, sleeperMat);
        sleeper.position.set(0, 0.01, i * 0.22);
        g.add(sleeper);
      }
      const railGeo = new THREE.BoxGeometry(0.04, 0.05, 1.1);
      const railMat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.7,
      });
      const r1 = new THREE.Mesh(railGeo, railMat);
      const r2 = r1.clone();
      r1.position.set(-0.15, 0.04, 0);
      r2.position.set(0.15, 0.04, 0);
      g.add(r1, r2);
    }
    return g;
  },

  placeTile(q, r) {
    if (this.remainingTiles <= 0) return;

    const newTile = this.createTile(q, r, this.currentTile.type);

    // 설치 시 현재 설정된 회전값(60도 단위) 적용
    // 육각형의 면이 맞닿아야 하므로 정확히 (Math.PI / 3)을 곱합니다.
    newTile.rotation.y = (Math.PI / 3) * this.currentTile.rotation;

    this.scene.add(newTile);

    this.remainingTiles--;
    this.pickNextTile(); // 다음 타일 준비
  },

  updateDockUI() {
    const dock = document.querySelector(".c3-track-dock");
    if (!dock) return;

    dock.innerHTML = `
    <div class="c3-inventory">
      <div class="c3-tile-preview">
        <span class="tile-label">NEXT TILE</span>
        <strong class="tile-type">${this.currentTile.type}</strong>
        <div class="tile-rotation-display">Rotation: ${this.currentTile.rotation * 60}°</div>
      </div>
      <div class="c3-tile-count">📦 남은 타일: <strong>${this.remainingTiles}</strong></div>
      <div class="c3-button-group">
        <button class="c3-rotate-btn" id="rotate-ccw">↺ 반시계</button>
        <button class="c3-rotate-btn" id="rotate-cw">↻ 시계</button>
      </div>
    </div>
  `;

    // 이벤트 리스너 연결
    document.getElementById("rotate-ccw").onclick = () => this.rotateTile(-1);
    document.getElementById("rotate-cw").onclick = () => this.rotateTile(1);
  },

  rotateTile(direction) {
    // 0~5 사이에서 회전 (육각형이므로 6단계)
    this.currentTile.rotation = (this.currentTile.rotation + direction + 6) % 6;
    this.updateDockUI();

    // (선택 사항) 현재 마우스에 들려있는 타일이 있다면 즉시 시각적으로 회전시키는 로직을 여기에 추가할 수 있습니다.
  },

  // 타일 뽑기 함수
  pickNextTile() {
    const types = this.TERRAINS;
    this.currentTile.type = types[Math.floor(Math.random() * types.length)];
    this.currentTile.rotation = 0; // 새 타일은 항상 0도로 시작
    this.updateDockUI();
  },

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
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  },
};
