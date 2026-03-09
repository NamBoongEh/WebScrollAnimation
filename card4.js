window.Card4 = {
  card: null,
  container: null,

  // Three.js
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  // Scene objects
  train: null,
  wagonList: [],
  trainWheels: [],
  smoke: [],
  clouds: [],
  windmillBlade: null,
  trees: [],
  houses: [],
  windmills: [],
  sheep: [], // 양 배열 - 반드시 초기화 필요
  ducks: [], // 오리 배열
  obstacleList: [],
  groundMesh: null,
  waterMesh: null,
  skyVehicle: null,
  skyVehicleType: "",
  sunGroup: null,
  moonGroup: null,
  sunPupils: [],
  moonPupils: [],
  mouseNDC: { x: 0, y: 0 },

  // Track Builder System
  trackSegments: [],
  trackGroup: null,
  stationGroup: null,
  SEGMENT_LENGTH: 10,
  CURVE_ANGLE: Math.PI / 2,
  CURVE_RADIUS: 10,

  // Horn
  hornEnabled: true,
  hornCooldown: false,
  audioCtx: null,

  // Lights
  hemiLight: null,
  dirLight: null,
  ambientLight: null,

  // State
  isInitialized: false,
  isActive: false,
  isNight: false,
  trainSpeed: 0.06,
  isLoopClosed: false,
  hasReachedEnd: false,
  trainDistance: 0,
  trainDirection: 1,
  camTheta: -Math.PI / 2,
  camPhi: Math.PI / 3.2,
  camRadius: 75,
  targetTheta: -Math.PI / 2,
  targetPhi: Math.PI / 3.2,
  targetRadius: 75,
  camAngleIndex: 0,
  panX: 0,
  panZ: 0,
  targetPanX: 0,
  targetPanZ: 0,
  isPaused: true,
  isMobile: false,
  sheepRaycaster: null,
  sheepMouse: null,

  // Track constants
  TRACK_WIDTH: 3.2,
  MAX_WAGONS: 8,
  MAX_SEGMENTS: 200,
  TRACK_START_X: -8,
  TRACK_START_Z: -3,
  TRACK_START_ANGLE: Math.PI / 2,

  // Colors
  C: {
    skyDay: 0x87ceeb,
    groundDay: 0x7ec850,
    groundDark: 0x5ca03a,
    trackWood: 0xc4944a,
    trackRail: 0x8b7355,
    trainBody: 0xe74c3c,
    trainRoof: 0xc0392b,
    trainChimney: 0x2c3e50,
    trainWindow: 0xf7dc6f,
    wagonBlue: 0x3498db,
    wagonGreen: 0x27ae60,
    wagonYellow: 0xf39c12,
    wagonPurple: 0x9b59b6,
    wagonOrange: 0xe67e22,
    wagonPink: 0xe91e63,
    treeTrunk: 0x8b5e3c,
    treeLeaf: 0x27ae60,
    treeLeafDark: 0x1e8449,
    treeLeafLight: 0x58d68d,
    houseWall: 0xfae5d3,
    houseRoof: 0xe74c3c,
    houseRoofBlue: 0x3498db,
    houseDoor: 0x8b5e3c,
    houseWindow: 0xaed6f1,
    fenceWood: 0xd4a76a,
    waterDay: 0x5dade2,
    stoneGray: 0x95a5a6,
    windmillBody: 0xfdf2e9,
    windmillBlade: 0xd5c4a1,
    skyNight: 0x1a1a3e,
    groundNight: 0x2d4a2d,
  },

  _wagonColors: null,
  _wagonColorIdx: 0,
  _trackWoodMat: null,
  _trackRailMat: null,
  _treeTrunkMat: null,
  _treeLeafMats: null,
  _worldPos: null,
  _screenPos: null,
  _boundAnimate: null,
  _flatTrackPoints: [],

  init() {
    this.card = Utils.$("#card-4");
    this.container = Utils.$("#train-container");
    if (!this.card || !this.container || typeof THREE === "undefined") return;

    this.isMobile = window.innerWidth <= 768;
    this._wagonColors = [
      this.C.wagonBlue,
      this.C.wagonGreen,
      this.C.wagonYellow,
      this.C.wagonPurple,
      this.C.wagonOrange,
      this.C.wagonPink,
    ];

    const observer = new MutationObserver(() => {
      if (!this.isInitialized) return;
      this.handleResize();
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
    this.clock = new THREE.Clock();
    this._boundAnimate = this.animate.bind(this);
    this._needsRender = true; // 초기 렌더 필요
    this._lastW = 0;
    this._lastH = 0;
    this._trackWoodMat = new THREE.MeshLambertMaterial({
      color: this.C.trackWood,
    });
    this._trackRailMat = new THREE.MeshLambertMaterial({
      color: this.C.trackRail,
    });
    this._treeTrunkMat = new THREE.MeshLambertMaterial({
      color: this.C.treeTrunk,
    });
    this._treeLeafMats = [
      new THREE.MeshLambertMaterial({ color: this.C.treeLeaf }),
      new THREE.MeshLambertMaterial({ color: this.C.treeLeafDark }),
      new THREE.MeshLambertMaterial({ color: this.C.treeLeafLight }),
    ];
    this._worldPos = new THREE.Vector3();
    this._screenPos = new THREE.Vector3();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.C.skyDay);
    this.scene.fog = new THREE.Fog(this.C.skyDay, 80, 220);

    this.camera = new THREE.PerspectiveCamera(
      this.isMobile ? 55 : 45,
      1,
      0.5,
      350,
    );
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isMobile,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.createGround();
    this.createBoundaryIndicator();
    this.createWater();

    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);

    this.createStation();

    // 초기 트랙
    this.addTrackSegment("straight");
    this._rebuildFlatTrackPoints();

    this.createTrain();
    this.createScenery();
    this.createClouds();
    this.createCelestialBodies();
    this.spawnSkyVehicle();
    this.createSheep();

    this.trainDistance = 2;
    this.positionTrainOnTrack();

    this.updateCameraPosition(0.016);
    this.bindEvents();
    this.handleResize();
    this.updateTrackCounter();
    this.animate();
  },

  /* ==========================
     TRACK BUILDER SYSTEM
     ========================== */
  getTrackEnd() {
    if (this.trackSegments.length === 0) {
      return {
        x: this.TRACK_START_X,
        z: this.TRACK_START_Z,
        angle: this.TRACK_START_ANGLE,
      };
    }
    const last = this.trackSegments[this.trackSegments.length - 1];
    return { x: last.endX, z: last.endZ, angle: last.endAngle };
  },

  distance(x1, z1, x2, z2) {
    return Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
  },

  checkTrackCollision(newSegment) {
    const minDistance = 3.0;
    const newPoints = newSegment.points;
    const newLen = newPoints.length;
    const checkStartIdx = Math.floor(newLen * 0.5);

    for (let i = 0; i < this.trackSegments.length - 1; i++) {
      const existing = this.trackSegments[i];
      const existingPoints = existing.points;
      const existingLen = existingPoints.length;
      // 첫 번째 세그먼트(역 연결쪽)는 시작부터 검사하여 역 방향 진입을 막음
      const existingStart = i === 0 ? 0 : Math.floor(existingLen * 0.2);
      const existingEnd = Math.floor(existingLen * 0.8);

      for (let k = checkStartIdx; k < newLen; k++) {
        const np = newPoints[k];
        for (let j = existingStart; j < existingEnd; j++) {
          const ep = existingPoints[j];
          const dx = ep.x - np.x;
          const dz = ep.z - np.z;
          if (dx * dx + dz * dz < minDistance * minDistance) return true;
        }
      }
    }

    return false;
  },

  // 터널/호수 구조물과의 충돌 여부 반환
  // - 새 세그먼트의 모든 점이 터널 언덕(r=hillR+1) 또는 호수(r=12) 안에 들어가면 충돌
  // - 단, 터널/호수의 입구(startX/Z) 또는 출구(endX/Z) 에서 3유닛 이내인 점은 합법적 연결로 허용
  checkTunnelPondOverlap(newSegment) {
    for (const seg of this.trackSegments) {
      if (!seg.tunnelObj) continue;
      const cx = seg.tunnelObj.position.x;
      const cz = seg.tunnelObj.position.z;
      const r = seg.tunnelType === "tunnel" ? 13 : 12; // 터널=언덕+여유, 호수=수면
      const r2 = r * r;
      for (const np of newSegment.points) {
        const dx = np.x - cx,
          dz = np.z - cz;
        if (dx * dx + dz * dz >= r2) continue; // 구역 밖 → 무시
        // 입구/출구 연결 지점은 허용
        const dsx = np.x - seg.startX,
          dsz = np.z - seg.startZ;
        const dex = np.x - seg.endX,
          dez = np.z - seg.endZ;
        if (dsx * dsx + dsz * dsz < 9) continue; // 입구에서 3유닛 이내
        if (dex * dex + dez * dez < 9) continue; // 출구에서 3유닛 이내
        return true; // 구조물 내부 관통 → 충돌
      }
    }
    return false;
  },

  addTrackSegment(type) {
    if (this.isLoopClosed || this.trackSegments.length >= this.MAX_SEGMENTS)
      return;

    const end = this.getTrackEnd();
    const segment = this.createTrackSegmentData(type, end.x, end.z, end.angle);
    if (!segment) return;

    const first = this.trackSegments[0] || null;
    // 루프 완성 조건: 위치 근접 + 진입 각도가 첫 트랙 시작 방향과 정확히 일치해야 함
    const posClose =
      !!first &&
      this.trackSegments.length >= 2 &&
      this.distance(segment.endX, segment.endZ, first.startX, first.startZ) <
        0.8;
    let angleMatch = false;
    if (posClose) {
      let da = (segment.endAngle - first.startAngle) % (2 * Math.PI);
      if (da > Math.PI) da -= 2 * Math.PI;
      if (da < -Math.PI) da += 2 * Math.PI;
      angleMatch = Math.abs(da) < 0.2; // ≈ 11.5° 이내만 허용
    }
    const isClosingLoop = posClose && angleMatch;

    // 경계 범위 초과 체크 (세그먼트 수 무관하게 항상 실행)
    if (!isClosingLoop) {
      for (const np of segment.points) {
        if (Math.abs(np.x) > 90 || Math.abs(np.z) > 90) {
          console.log("Track out of bounds");
          return;
        }
        // 기차역 플랫폼 충돌 체크 (실제 AABB, 여유 0.8 추가)
        // plat BoxGeometry(10,0.4,5), local(0,0.2,-1.5), rotation π/2
        // → 월드 x ∈ [-13.8, -7.2], z ∈ [-4.8, 6.8]
        if (np.x > -13.8 && np.x < -7.2 && np.z > -4.8 && np.z < 6.8) {
          if (this.trackSegments.length >= 2) {
            console.log("Track overlaps with station platform");
            return;
          }
        }
      }
    }

    // 세그먼트 수 무관하게 항상 터널/호수 충돌 체크
    if (!isClosingLoop && this.checkTunnelPondOverlap(segment)) {
      console.log("Track overlaps with tunnel/pond");
      return;
    }

    if (!isClosingLoop && this.checkTrackCollision(segment)) {
      console.log("Track overlaps");
      return;
    }

    segment.mesh = this.createTrackMesh(segment);
    this.trackSegments.push(segment);
    if (isClosingLoop) this.isLoopClosed = true;
    this.hasReachedEnd = false;
    this.trackGroup.add(segment.mesh);
    this.removeSceneryOverlappingTrack(segment);
    this._rebuildFlatTrackPoints();
    this.updateTrackCounter();
  },

  removeAllTrackSegments() {
    while (this.trackSegments.length > 1) {
      const segment = this.trackSegments.pop();
      this.trackGroup.remove(segment.mesh);
      segment.mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      if (segment.tunnelObj) {
        this.ducks = this.ducks.filter(
          (d) => d.pondGroup !== segment.tunnelObj,
        );
        this.scene.remove(segment.tunnelObj);
        segment.tunnelObj.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) child.material.dispose();
        });
        segment.tunnelObj = null;
      }
      // 이 세그먼트가 숨긴 나무/집/풍차 다시 보이게
      if (segment.hiddenScenery) {
        segment.hiddenScenery.forEach((obj) => {
          obj.visible = true;
        });
      }
    }
    this.isLoopClosed = false;
    this.hasReachedEnd = false;
    this.trainDistance = 2;
    this.positionTrainOnTrack(true);
    this._rebuildFlatTrackPoints();
    this.updateTrackCounter();
    this.buildObstacleList();
  },

  removeLastTrackSegment() {
    if (this.trackSegments.length <= 1) return;

    const segment = this.trackSegments.pop();
    this.trackGroup.remove(segment.mesh);
    segment.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });

    // 터널/호수 세그먼트인 경우 오브젝트 삭제
    if (segment.tunnelObj) {
      // 이 호수에 속한 오리들을 ducks 배열에서 제거
      this.ducks = this.ducks.filter((d) => d.pondGroup !== segment.tunnelObj);
      this.scene.remove(segment.tunnelObj);
      segment.tunnelObj.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      segment.tunnelObj = null;
    }

    // 이 세그먼트가 숨긴 나무/집/풍차 다시 보이게
    if (segment.hiddenScenery) {
      segment.hiddenScenery.forEach((obj) => {
        obj.visible = true;
      });
    }

    this.isLoopClosed = false;
    this.hasReachedEnd = false;

    const totalLength = this.getTotalTrackLength();
    this.trainDistance = Math.min(this.trainDistance, totalLength - 2);
    this._rebuildFlatTrackPoints();
    this.updateTrackCounter();
    this.buildObstacleList(); // 터널/호수 제거 후 양 장애물 목록 갱신
  },

  createTrackSegmentData(type, startX, startZ, startAngle) {
    const points = [];
    let endX, endZ, endAngle, segmentLength;

    if (type === "straight") {
      segmentLength = this.SEGMENT_LENGTH;
      endX = startX + Math.cos(startAngle) * segmentLength;
      endZ = startZ + Math.sin(startAngle) * segmentLength;
      endAngle = startAngle;

      const numPoints = 16;
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        points.push({
          x: startX + (endX - startX) * t,
          z: startZ + (endZ - startZ) * t,
          angle: startAngle,
        });
      }
    } else {
      const curveDir = type === "left" ? 1 : -1;
      const curveAngle = this.CURVE_ANGLE * curveDir;
      const R = this.CURVE_RADIUS;

      const perpAngle = startAngle + (Math.PI / 2) * curveDir;
      const centerX = startX + Math.cos(perpAngle) * R;
      const centerZ = startZ + Math.sin(perpAngle) * R;

      endAngle = startAngle + curveAngle;
      const endPerpAngle = perpAngle + curveAngle;
      endX = centerX - Math.cos(endPerpAngle) * R;
      endZ = centerZ - Math.sin(endPerpAngle) * R;
      segmentLength = Math.abs(curveAngle) * R;

      const numPoints = 20;
      for (let i = 0; i <= numPoints; i++) {
        const t = i / numPoints;
        const angle = startAngle + curveAngle * t;
        const perpA = perpAngle + curveAngle * t;
        points.push({
          x: centerX - Math.cos(perpA) * R,
          z: centerZ - Math.sin(perpA) * R,
          angle: angle,
        });
      }
    }

    return {
      type,
      startX,
      startZ,
      startAngle,
      endX,
      endZ,
      endAngle,
      length: segmentLength,
      points,
      mesh: null,
    };
  },

  createTrackMesh(segment) {
    const group = new THREE.Group();
    const woodMat = this._trackWoodMat;
    const railMat = this._trackRailMat;

    const { type, startX, startZ, startAngle, endX, endZ } = segment;

    if (type === "straight") {
      const sleeperCount = 8;
      for (let i = 0; i < sleeperCount; i++) {
        const t = (i + 0.5) / sleeperCount;
        const x = startX + (endX - startX) * t;
        const z = startZ + (endZ - startZ) * t;

        const sleeper = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.15, this.TRACK_WIDTH + 1),
          woodMat,
        );
        sleeper.position.set(x, 0.12, z);
        sleeper.rotation.y = -startAngle;
        sleeper.receiveShadow = true;
        group.add(sleeper);
      }

      const railOffset = this.TRACK_WIDTH / 2;
      [-1, 1].forEach((side) => {
        const nx = -Math.sin(startAngle);
        const nz = Math.cos(startAngle);
        const railGeo = new THREE.BoxGeometry(segment.length, 0.2, 0.15);
        const rail = new THREE.Mesh(railGeo, railMat);
        rail.position.set(
          (startX + endX) / 2 + nx * side * railOffset,
          0.25,
          (startZ + endZ) / 2 + nz * side * railOffset,
        );
        rail.rotation.y = -startAngle;
        group.add(rail);
      });
    } else {
      const curveDir = type === "left" ? 1 : -1;
      const curveAngle = this.CURVE_ANGLE * curveDir;
      const R = this.CURVE_RADIUS;
      const perpAngle = startAngle + (Math.PI / 2) * curveDir;
      const centerX = startX + Math.cos(perpAngle) * R;
      const centerZ = startZ + Math.sin(perpAngle) * R;

      const sleeperCount = 6;
      for (let i = 0; i < sleeperCount; i++) {
        const t = (i + 0.5) / sleeperCount;
        const angle = startAngle + curveAngle * t;
        const perpA = perpAngle + curveAngle * t;
        const x = centerX - Math.cos(perpA) * R;
        const z = centerZ - Math.sin(perpA) * R;

        const sleeper = new THREE.Mesh(
          new THREE.BoxGeometry(0.4, 0.15, this.TRACK_WIDTH + 1),
          woodMat,
        );
        sleeper.position.set(x, 0.12, z);
        sleeper.rotation.y = -angle;
        sleeper.receiveShadow = true;
        group.add(sleeper);
      }

      const railOffset = this.TRACK_WIDTH / 2;
      [-1, 1].forEach((side) => {
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const t = i / 16;
          const perpA = perpAngle + curveAngle * t;
          const railR = R + side * railOffset * curveDir;
          pts.push(
            new THREE.Vector3(
              centerX - Math.cos(perpA) * railR,
              0.25,
              centerZ - Math.sin(perpA) * railR,
            ),
          );
        }
        const tubeGeo = new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          16,
          0.08,
          6,
          false,
        );
        group.add(new THREE.Mesh(tubeGeo, railMat));
      });
    }

    return group;
  },

  addTunnelSegment() {
    if (this.isLoopClosed || this.trackSegments.length >= this.MAX_SEGMENTS)
      return;
    const beforeLen = this.trackSegments.length;

    const tunnelLen = this.SEGMENT_LENGTH * 2; // 터널의 길이 (직선 2배 = 20)
    const hillR = 12; // 산 반구 반지름 (faceX=10 보다 크고, 표면≈11.9 < blackLen/2=13)
    const holeR = 3; // 기차 통과 원통 구멍 반지름

    // 1. 트랙 생성 (기존 로직)
    const origSegLen = this.SEGMENT_LENGTH;
    this.SEGMENT_LENGTH = tunnelLen;
    this.addTrackSegment("straight");
    this.SEGMENT_LENGTH = origSegLen;
    if (this.trackSegments.length === beforeLen) return;

    const seg = this.trackSegments[this.trackSegments.length - 1];
    const midIdx = Math.floor(seg.points.length / 2);
    const mid = seg.points[midIdx];

    const tunnelObj = new THREE.Group();

    // ※ rotation.y = -mid.angle 적용 후 터널 로컬 좌표계:
    //   로컬 X → 세계 트랙 방향 (기차 진행 방향)
    //   로컬 Y → 세계 Y (위쪽)
    //   로컬 Z → 트랙 좌우 방향

    const faceX = tunnelLen / 2; // 16 – 터널 끝 위치
    const protrude = 3; // 검은 원통이 언덕 밖으로 나오는 길이 (hillR 표면 밖으로)
    const portalX = faceX + protrude / 2; // 17.5 – 벽돌 포탈 중심 x
    const blackLen = tunnelLen + 2 * protrude; // 38 – 검은 원통 총 길이 (양쪽 돌출 포함)
    const brickThick = 1.5; // 벽돌 원통 두께
    const brickLen = 5; // 벽돌 원통 길이

    // === 1. 검은색 긴 원통 (터널 내부) ===
    // protrude만큼 언덕 밖으로 돌출 → 깊이 테스트만으로 항상 입구가 가시적
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const blackGeo = new THREE.CylinderGeometry(
      holeR,
      holeR,
      blackLen,
      32,
      1,
      false,
    );
    const blackCyl = new THREE.Mesh(blackGeo, blackMat);
    blackCyl.rotation.z = Math.PI / 2; // Y축 원통 → 로컬 X축으로 회전
    blackCyl.position.set(0, holeR / 2, 0); // 하단 y=0(지면)에 접함
    tunnelObj.add(blackCyl);

    // === 2. 초록 언덕 (반구) ===
    // 깊이 테스트에 의해 돌출 부분 위에는 렌더링되지 않음
    const hillMat = new THREE.MeshLambertMaterial({ color: 0x6aaf3d });
    const hillGeo = new THREE.SphereGeometry(
      hillR,
      32,
      20,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    );
    const hill = new THREE.Mesh(hillGeo, hillMat);
    hill.castShadow = true;
    hill.receiveShadow = true;
    tunnelObj.add(hill);

    // === 3. 벽돌 입구 원통 (openEnded = true) ===
    // 검은 원통 입구/출구를 둘러싸는 벽돌 질감 포탈
    const brickMat = new THREE.MeshLambertMaterial({
      color: 0x9b6347, // 벽돌 갈색
      side: THREE.DoubleSide,
    });

    for (const xPos of [-portalX, portalX]) {
      // 구멍 뚫린 원통 벽 (openEnded = true)
      const cylGeo = new THREE.CylinderGeometry(
        holeR + brickThick,
        holeR + brickThick,
        brickLen,
        32,
        1,
        true,
      );
      const cyl = new THREE.Mesh(cylGeo, brickMat);
      cyl.rotation.z = Math.PI / 2;
      cyl.position.set(xPos, holeR / 2, 0);
      tunnelObj.add(cyl);

      // 외부에서 보이는 링 단면 (벽돌 아치 앞면)
      const ringShape = new THREE.Shape();
      ringShape.absarc(0, 0, holeR + brickThick, 0, Math.PI * 2, false);
      const ringHole = new THREE.Path();
      ringHole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
      ringShape.holes.push(ringHole);
      const ringGeo = new THREE.ShapeGeometry(ringShape, 32);
      const ring = new THREE.Mesh(ringGeo, brickMat);
      ring.rotation.y = Math.PI / 2;
      // 포탈 바깥쪽 단면에 배치 (입구 방향)
      const outDir = xPos < 0 ? -(brickLen / 2) : brickLen / 2;
      ring.position.set(xPos + outDir, holeR / 2, 0);
      tunnelObj.add(ring);
    }

    // === 배치 ===
    tunnelObj.position.set(mid.x, 0, mid.z);
    tunnelObj.rotation.y = -mid.angle;
    this.scene.add(tunnelObj);

    seg.tunnelObj = tunnelObj;
    seg.tunnelType = "tunnel";
    this.buildObstacleList(); // 양이 터널 구역에 접근하지 못하도록 갱신
  },

  /* ==================== POND (LAKE BRIDGE) SEGMENT ==================== */
  addPondSegment() {
    if (this.isLoopClosed || this.trackSegments.length >= this.MAX_SEGMENTS)
      return;
    const beforeLen = this.trackSegments.length;

    const pondLen = this.SEGMENT_LENGTH * 2; // 다리 트랙 세그먼트 길이 (직선 2배 = 20)

    // 1. 트랙 생성 (터널과 동일 방식)
    const origSegLen = this.SEGMENT_LENGTH;
    this.SEGMENT_LENGTH = pondLen;
    this.addTrackSegment("straight");
    this.SEGMENT_LENGTH = origSegLen;
    if (this.trackSegments.length === beforeLen) return;

    const seg = this.trackSegments[this.trackSegments.length - 1];
    const midIdx = Math.floor(seg.points.length / 2);
    const mid = seg.points[midIdx];

    const pondObj = new THREE.Group();
    // rotation.y = -mid.angle 후 로컬 좌표계:
    //   X = 트랙 진행 방향, Y = 위쪽, Z = 트랙 좌우

    const trackHalfW = this.TRACK_WIDTH / 2; // 1.75

    // === 1. 호수 수면 (자연스러운 타원형) ===
    const waterShape = new THREE.Shape();
    waterShape.absellipse(0, 0, pondLen * 0.55, 11, 0, Math.PI * 2, false, 0);
    const waterMat = new THREE.MeshLambertMaterial({
      color: this.C.waterDay,
      transparent: true,
      opacity: 1,
    });
    const waterMesh = new THREE.Mesh(
      new THREE.ShapeGeometry(waterShape, 64),
      waterMat,
    );
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.05;
    pondObj.add(waterMesh);

    // === 2. 다리 난간 (양쪽 목재 펜스) ===
    const railMat = new THREE.MeshLambertMaterial({ color: 0xa07040 });
    for (const side of [-1, 1]) {
      const zOff = side * (trackHalfW + 1.2);

      // 상단 수평 레일
      const topRail = new THREE.Mesh(
        new THREE.BoxGeometry(pondLen, 0.12, 0.12),
        railMat,
      );
      topRail.position.set(0, 0.92, zOff);
      pondObj.add(topRail);

      // 중단 수평 레일
      const midRail = new THREE.Mesh(
        new THREE.BoxGeometry(pondLen, 0.1, 0.1),
        railMat,
      );
      midRail.position.set(0, 0.52, zOff);
      pondObj.add(midRail);

      // 수직 기둥 (등간격)
      const postCount = 10;
      for (let p = 0; p <= postCount; p++) {
        const xPos = -pondLen / 2 + (pondLen / postCount) * p;
        const post = new THREE.Mesh(
          new THREE.BoxGeometry(0.13, 0.98, 0.13),
          railMat,
        );
        post.position.set(xPos, 0.5, zOff);
        pondObj.add(post);
      }
    }

    // === 3. 수중 지지 기둥 (물 속에 잠긴 교각) ===
    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
    const pillarXs = [
      -pondLen * 0.35,
      -pondLen * 0.1,
      pondLen * 0.1,
      pondLen * 0.35,
    ];
    for (const xPos of pillarXs) {
      for (const side of [-1, 1]) {
        const zOff = side * (trackHalfW + 0.4);
        const pillar = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.27, 0.7, 8),
          pillarMat,
        );
        pillar.position.set(xPos, -0.25, zOff);
        pondObj.add(pillar);
      }
    }

    // === 4. 갈대 (갈대 줄기 + 부들 이삭) ===
    const reedStemMat = new THREE.MeshLambertMaterial({ color: 0x4a7c4e });
    const reedTopMat = new THREE.MeshLambertMaterial({ color: 0x6b4c2a });
    const pondHalfX = pondLen * 0.55;
    const pondHalfZ = 11;
    [
      { x: -5.5, z: 8.5 },
      { x: 1.5, z: 9.5 },
      { x: 6.5, z: 7.0 },
      { x: -8.5, z: 4.5 },
      { x: 8.5, z: 4.5 },
      { x: -5.0, z: -8.5 },
      { x: 2.0, z: -9.5 },
      { x: -7.0, z: -7.0 },
      { x: 8.0, z: -5.0 },
    ].forEach((pos) => {
      if ((pos.x / pondHalfX) ** 2 + (pos.z / pondHalfZ) ** 2 > 0.97) return;
      const h = 1.4 + Math.random() * 0.5;
      const rg = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.055, h, 5),
        reedStemMat,
      );
      stem.position.y = h / 2 + 0.05;
      rg.add(stem);
      const top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.1, 0.38, 6),
        reedTopMat,
      );
      top.position.y = h + 0.24;
      rg.add(top);
      rg.position.set(pos.x, 0.05, pos.z);
      rg.rotation.y = Math.random() * Math.PI * 2;
      pondObj.add(rg);
    });

    // === 5. 연잎 (V 노치 부채꼴 + 꽃) ===
    const lilyMat = new THREE.MeshLambertMaterial({
      color: 0x2e7d32,
      side: THREE.DoubleSide,
    });
    const flowerMat = new THREE.MeshLambertMaterial({ color: 0xf8bbd0 });
    [
      { x: -3, z: 6.0 },
      { x: 4, z: 7.5 },
      { x: -6, z: 6.5 },
      { x: 5, z: 5.0 },
      { x: -2, z: -5.5 },
      { x: 5, z: -7.0 },
      { x: -5, z: -7.5 },
      { x: 2, z: -6.0 },
    ].forEach((pos) => {
      if ((pos.x / pondHalfX) ** 2 + (pos.z / pondHalfZ) ** 2 > 0.85) return;
      const r = 0.4 + Math.random() * 0.2;
      const notch = Math.random() * Math.PI * 2;
      const lilyShape = new THREE.Shape();
      lilyShape.moveTo(0, 0);
      lilyShape.absarc(
        0,
        0,
        r,
        notch + 0.35,
        notch + Math.PI * 2 - 0.35,
        false,
      );
      lilyShape.closePath();
      const lilyMesh = new THREE.Mesh(
        new THREE.ShapeGeometry(lilyShape, 12),
        lilyMat,
      );
      lilyMesh.rotation.x = -Math.PI / 2;
      lilyMesh.position.set(pos.x, 0.07, pos.z);
      pondObj.add(lilyMesh);
      if (Math.random() > 0.35) {
        const flower = new THREE.Mesh(
          new THREE.SphereGeometry(0.11, 6, 4),
          flowerMat,
        );
        flower.scale.y = 0.55;
        flower.position.set(pos.x, 0.14, pos.z);
        pondObj.add(flower);
      }
    });

    // === 6. 오리 (2~3마리, 트랙 제외 호수에만 배치) ===
    const trackMarginZ = trackHalfW + 2.2;
    const duckCount = 2 + Math.floor(Math.random() * 2);
    for (let di = 0; di < duckCount; di++) {
      const side = di % 2 === 0 ? 1 : -1;
      let lx,
        lz,
        attempts = 0;
      do {
        lx = (Math.random() - 0.5) * pondHalfX * 1.5;
        lz =
          side *
          (trackMarginZ + Math.random() * (pondHalfZ - trackMarginZ) * 0.82);
        attempts++;
      } while (
        attempts < 60 &&
        (lx / pondHalfX) ** 2 + (lz / pondHalfZ) ** 2 > 0.82
      );
      if (attempts >= 60) continue;

      const duckMesh = this.createOneDuck();
      duckMesh.position.set(lx, 0.08, lz);
      duckMesh.rotation.y = Math.random() * Math.PI * 2;
      pondObj.add(duckMesh);

      this.ducks.push({
        mesh: duckMesh,
        pondGroup: pondObj,
        localX: lx,
        localZ: lz,
        targetLocalX: lx,
        targetLocalZ: lz,
        side,
        speed: 0.006 + Math.random() * 0.005,
        nextMoveTime: Math.random() * 4,
        bobPhase: Math.random() * Math.PI * 2,
        halfX: pondHalfX,
        halfZ: pondHalfZ,
        minZ: trackMarginZ,
      });
    }

    // === 배치 ===
    pondObj.position.set(mid.x, 0, mid.z);
    pondObj.rotation.y = -mid.angle;
    this.scene.add(pondObj);

    seg.tunnelObj = pondObj;
    seg.tunnelType = "pond";
    this.buildObstacleList(); // 양이 호수 구역에 접근하지 못하도록 갱신
  },

  getTotalTrackLength() {
    return this.trackSegments.reduce((sum, seg) => sum + seg.length, 0);
  },

  getTrackPointByDistance(distance) {
    if (this.trackSegments.length === 0) return { x: 0, z: 0, angle: 0 };
    distance = Math.max(0, distance);
    let acc = 0;

    for (const seg of this.trackSegments) {
      if (acc + seg.length >= distance) {
        const t = (distance - acc) / seg.length;
        const idxRaw = t * (seg.points.length - 1);
        const idx = Math.floor(idxRaw);
        const frac = idxRaw - idx;
        const p1 = seg.points[idx],
          p2 = seg.points[idx + 1] || p1;
        return {
          x: p1.x + (p2.x - p1.x) * frac,
          z: p1.z + (p2.z - p1.z) * frac,
          angle: p1.angle + (p2.angle - p1.angle) * frac,
        };
      }
      acc += seg.length;
    }
    const last = this.trackSegments[this.trackSegments.length - 1];
    return { x: last.endX, z: last.endZ, angle: last.endAngle };
  },

  updateTrackCounter() {
    const el = document.getElementById("c4-track-count");
    if (el) el.textContent = this.trackSegments.length;
  },

  /* ==================== STATION ==================== */
  createStation() {
    this.stationGroup = new THREE.Group();
    const wallM = new THREE.MeshLambertMaterial({ color: this.C.houseWall });
    const roofM = new THREE.MeshLambertMaterial({ color: this.C.houseRoof });

    // 플랫폼
    const plat = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.4, 5),
      new THREE.MeshLambertMaterial({ color: 0xbdbdbd }),
    );
    plat.position.y = 0.2;
    plat.position.z = -1.5;
    plat.receiveShadow = true;
    this.stationGroup.add(plat);

    // 건물
    const bld = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 3.5), wallM);
    bld.position.set(0, 1.9, -1.5);
    bld.castShadow = true;
    this.stationGroup.add(bld);

    // 박공 지붕
    const roofShape = new THREE.Shape();
    roofShape.moveTo(-3.3, 0);
    roofShape.lineTo(0, 1.8);
    roofShape.lineTo(3.3, 0);
    roofShape.closePath();
    const roof = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roofShape, { depth: 4, bevelEnabled: false }),
      roofM,
    );
    roof.position.set(0, 3.4, -3.5);
    roof.castShadow = true;
    this.stationGroup.add(roof);

    // 문 (+Z 방향 = 트랙 방향)
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.5, 0.1),
      new THREE.MeshLambertMaterial({ color: this.C.houseDoor }),
    );
    door.position.set(0, 1.15, 0.26);
    this.stationGroup.add(door);

    // 창문 (isWindow 플래그로 밤에 불 켜짐)
    const wM = new THREE.MeshLambertMaterial({ color: this.C.houseWindow });
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), wM);
    w1.position.set(-1.5, 2.2, 0.26);
    w1.userData.isWindow = true;
    this.stationGroup.add(w1);
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.1), wM);
    w2.position.set(1.5, 2.2, 0.26);
    w2.userData.isWindow = true;
    this.stationGroup.add(w2);

    // 표지판
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.6, 0.1),
      new THREE.MeshLambertMaterial({ color: 0x2c3e50 }),
    );
    sign.position.set(0, 3.0, 0.26);
    this.stationGroup.add(sign);

    // 기둥 + 캐노피
    const pM = new THREE.MeshLambertMaterial({ color: 0xecf0f1 });
    [
      [-4, 1.6, 0.5],
      [4, 1.6, 0.5],
      [-4, 1.6, -3.5],
      [4, 1.6, -3.5],
    ].forEach((pos) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2), pM);
      p.position.set(pos[0], pos[1], pos[2]);
      this.stationGroup.add(p);
    });
    const cn = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.2, 5),
      new THREE.MeshLambertMaterial({ color: 0xd35400 }),
    );
    cn.position.set(0, 3.3, -1.5);
    this.stationGroup.add(cn);

    // 기차역 위치: 첫 번째 트랙(x=-8, +Z 방향) 왼편에서 문이 트랙을 90도로 바라봄
    // rotation.y = π/2 → 로컬 +Z(문 방향)가 월드 +X(트랙 쪽)를 향함
    this.stationGroup.position.set(-12, 0, 1);
    this.stationGroup.rotation.y = Math.PI / 2;

    // houses 배열에 추가하여 밤 모드에서 창문 불 켜지도록
    this.houses.push(this.stationGroup);
    this.scene.add(this.stationGroup);
  },

  /* ==================== LIGHTS ==================== */
  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x7ec850, 0.6);
    this.scene.add(this.hemiLight);
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(60, 28, -40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    const sc = this.dirLight.shadow.camera;
    sc.near = 0.5;
    sc.far = 250;
    sc.left = sc.bottom = -90;
    sc.right = sc.top = 90;
    this.scene.add(this.dirLight);
  },

  /* ==================== GROUND ==================== */
  createGround() {
    const gGeo = new THREE.CircleGeometry(140, 64);
    this.groundMesh = new THREE.Mesh(
      gGeo,
      new THREE.MeshLambertMaterial({ color: this.C.groundDay }),
    );
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    const stGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 6);
    const stMat = new THREE.MeshLambertMaterial({ color: this.C.stoneGray });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 6 + Math.random() * 5;
      const s = new THREE.Mesh(stGeo, stMat);
      s.position.set(
        Math.cos(a) * r + (Math.random() - 0.5),
        0.05,
        Math.sin(a) * r + (Math.random() - 0.5),
      );
      s.scale.setScalar(0.5 + Math.random() * 0.8);
      this.scene.add(s);
    }
  },

  /* ==================== BOUNDARY INDICATOR ==================== */
  createBoundaryIndicator() {
    const B = 90; // 설치 가능 경계 (checkTrackCollision 기준값)
    const size = B * 2;
    const thick = 0.4;
    const y = 0.07;

    // 밝은 노란 선
    this.boundaryMat = new THREE.MeshBasicMaterial({
      color: 0xffee00,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    // 주황색 확산 후광
    this.boundaryGlowMat = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const group = new THREE.Group();
    [
      { w: size, d: thick, px: 0, pz: B },
      { w: size, d: thick, px: 0, pz: -B },
      { w: thick, d: size, px: B, pz: 0 },
      { w: thick, d: size, px: -B, pz: 0 },
    ].forEach(({ w, d, px, pz }) => {
      const line = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.05, d),
        this.boundaryMat,
      );
      line.position.set(px, y, pz);
      group.add(line);

      const glow = new THREE.Mesh(
        new THREE.BoxGeometry(w + 1.5, 0.04, d + 1.5),
        this.boundaryGlowMat,
      );
      glow.position.set(px, y - 0.01, pz);
      group.add(glow);
    });

    this.scene.add(group);
    this.boundaryGroup = group;
  },

  /* ==================== WATER ==================== */
  createWater() {
    const shape = new THREE.Shape();
    shape.moveTo(-8, -5);
    shape.bezierCurveTo(-6, -8, 2, -9, 6, -6);
    shape.bezierCurveTo(10, -3, 8, 2, 4, 3);
    shape.bezierCurveTo(0, 4, -6, 2, -8, -1);
    shape.closePath();
    this.waterMesh = new THREE.Mesh(
      new THREE.ShapeGeometry(shape),
      new THREE.MeshLambertMaterial({
        color: this.C.waterDay,
        transparent: true,
        opacity: 0.7,
      }),
    );
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(-40, 0.08, 30);
    this.scene.add(this.waterMesh);
  },

  _box(w, h, d, color, x, y, z, mat) {
    const m = mat || new THREE.MeshLambertMaterial({ color });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    if (x !== undefined) mesh.position.set(x, y, z);
    return mesh;
  },

  /* ==================== TRAIN ==================== */
  createTrain() {
    this.train = new THREE.Group();
    this.trainWheels = [];
    this._wagonColorIdx = 0;
    this.train.add(this.createLocomotive());
    this.scene.add(this.train);
    this.updateWagonCounter();
  },

  createLocomotive() {
    const g = new THREE.Group();
    const bM = new THREE.MeshLambertMaterial({ color: this.C.trainBody });
    const chM = new THREE.MeshLambertMaterial({ color: this.C.trainChimney });

    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 3.5), bM);
    body.position.y = 1.2;
    body.castShadow = true;
    g.add(body);

    const boiler = new THREE.Mesh(
      new THREE.CylinderGeometry(0.8, 0.8, 2, 12),
      bM,
    );
    boiler.rotation.x = Math.PI / 2;
    boiler.position.set(0, 1.4, -1.5);
    boiler.castShadow = true;
    g.add(boiler);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.2, 2),
      new THREE.MeshLambertMaterial({ color: this.C.trainRoof }),
    );
    roof.position.set(0, 2.1, 0.5);
    g.add(roof);

    const ch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.35, 1.2, 8),
      chM,
    );
    ch.position.set(0, 2.4, -1.8);
    ch.castShadow = true;
    g.add(ch);
    const chTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.25, 0.3, 8),
      chM,
    );
    chTop.position.set(0, 3.1, -1.8);
    g.add(chTop);

    // 기차 얼굴
    const eyeG = new THREE.SphereGeometry(0.18, 8, 8);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupG = new THREE.SphereGeometry(0.1, 8, 8);
    const pupM = new THREE.MeshBasicMaterial({ color: 0x000000 });

    [-0.4, 0.4].forEach((sx) => {
      const eye = new THREE.Mesh(eyeG, eyeM);
      eye.position.set(sx, 1.6, -2.55);
      g.add(eye);
      const pup = new THREE.Mesh(pupG, pupM);
      pup.position.set(sx, 1.6, -2.7);
      g.add(pup);
    });

    const smC = new THREE.EllipseCurve(0, 0, 0.3, 0.15, 0, Math.PI, false, 0);
    const sm = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(smC.getPoints(12)),
      new THREE.LineBasicMaterial({ color: 0x000000 }),
    );
    sm.position.set(0, 1.15, -2.56);
    g.add(sm);

    const winM = new THREE.MeshLambertMaterial({ color: this.C.trainWindow });
    [-1, 1].forEach((s) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.8), winM);
      w.position.set(s * 1.12, 1.6, 0.5);
      g.add(w);
    });

    this.addWheels(g, [
      [-1, 0.35, -1.5],
      [1, 0.35, -1.5],
      [-1, 0.35, 0],
      [1, 0.35, 0],
      [-1, 0.35, 1.2],
      [1, 0.35, 1.2],
    ]);

    const cp = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.3, 0.6),
      new THREE.MeshLambertMaterial({ color: 0x555555 }),
    );
    cp.position.set(0, 0.5, 2);
    g.add(cp);

    return g;
  },

  addWagon() {
    if (this.wagonList.length >= this.MAX_WAGONS) return;
    const color =
      this._wagonColors[this._wagonColorIdx++ % this._wagonColors.length];
    const w = this.createWagon(color);
    this.wagonList.push(w);
    this.train.add(w);
    this.updateWagonCounter();
  },

  removeWagon() {
    if (this.wagonList.length === 0) return;
    const w = this.wagonList.pop();
    this.train.remove(w);
    w.traverse((child) => {
      const idx = this.trainWheels.indexOf(child);
      if (idx !== -1) this.trainWheels.splice(idx, 1);
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    this.updateWagonCounter();
  },

  updateWagonCounter() {
    const el = document.getElementById("c4-wagon-count");
    if (el) el.textContent = this.wagonList.length;
  },

  createWagon(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 1.2, 3),
      new THREE.MeshLambertMaterial({ color }),
    );
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);

    this.addWheels(g, [
      [-0.8, 0.3, -1],
      [0.8, 0.3, -1],
      [-0.8, 0.3, 1],
      [0.8, 0.3, 1],
    ]);

    const cpM = new THREE.MeshLambertMaterial({ color: 0x555555 });
    g.add(this._box(0.25, 0.25, 0.5, null, 0, 0.5, -1.7, cpM));
    g.add(this._box(0.25, 0.25, 0.5, null, 0, 0.5, 1.7, cpM));

    const cc = [0xd5a76a, 0xc0392b, 0x2ecc71, 0xf1c40f];
    for (let i = 0; i < 2; i++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(
          0.6 + Math.random() * 0.4,
          0.5 + Math.random() * 0.3,
          0.6 + Math.random() * 0.4,
        ),
        new THREE.MeshLambertMaterial({
          color: cc[Math.floor(Math.random() * cc.length)],
        }),
      );
      c.position.set(
        (Math.random() - 0.5) * 0.8,
        1.8 + i * 0.4,
        (Math.random() - 0.5) * 1.2,
      );
      g.add(c);
    }
    return g;
  },

  addWheels(group, positions) {
    const wG = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 12);
    const wM = new THREE.MeshLambertMaterial({ color: 0x333333 });
    positions.forEach((pos) => {
      const w = new THREE.Mesh(wG, wM);
      w.rotation.z = Math.PI / 2;
      w.position.set(pos[0], pos[1], pos[2]);
      group.add(w);
      this.trainWheels.push(w);
    });
  },

  /* ==================== SKY VEHICLE ==================== */
  spawnSkyVehicle() {
    if (this.skyVehicle) {
      this.scene.remove(this.skyVehicle);
      this.skyVehicle.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      });
      this.skyVehicle = null;
    }
    this.skyVehicleType = Math.random() > 0.5 ? "plane" : "balloon";

    if (this.skyVehicleType === "plane") {
      this.skyVehicle = this.createAirplane();
    } else {
      this.skyVehicle = this.createBalloon();
    }

    const dir = Math.random() * Math.PI * 2;
    const height =
      this.skyVehicleType === "plane"
        ? 28 + Math.random() * 8
        : 22 + Math.random() * 6;

    this.skyVehicle.position.set(
      Math.cos(dir) * 100,
      height,
      Math.sin(dir) * 100,
    );
    this.skyVehicle.userData.dir = dir + Math.PI + (Math.random() - 0.5) * 0.6;
    this.skyVehicle.userData.speed =
      this.skyVehicleType === "plane" ? 0.35 : 0.12;
    this.skyVehicle.userData.height = height;
    this.skyVehicle.rotation.y = Math.atan2(
      -Math.cos(this.skyVehicle.userData.dir),
      -Math.sin(this.skyVehicle.userData.dir),
    );

    this.scene.add(this.skyVehicle);
  },

  createAirplane() {
    const g = new THREE.Group();
    const bodyM = new THREE.MeshLambertMaterial({ color: 0xecf0f1 });
    const wingM = new THREE.MeshLambertMaterial({ color: 0x3498db });
    const tailM = new THREE.MeshLambertMaterial({ color: 0xe74c3c });

    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.3, 4, 8),
      bodyM,
    );
    fuselage.rotation.x = Math.PI / 2;
    g.add(fuselage);

    g.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 1.2), wingM));

    const vtail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.8), tailM);
    vtail.position.set(0, 0.6, 2);
    g.add(vtail);

    const htail = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.5), wingM);
    htail.position.set(0, 0, 2);
    g.add(htail);

    const propHub = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 4),
      new THREE.MeshLambertMaterial({ color: 0x333333 }),
    );
    propHub.position.set(0, 0, -2.1);
    g.add(propHub);

    const propBlade = new THREE.Group();
    const bladeM = new THREE.MeshLambertMaterial({ color: 0x666666 });
    for (let i = 0; i < 3; i++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.15), bladeM);
      bl.position.x = 0.6;
      const holder = new THREE.Group();
      holder.add(bl);
      holder.rotation.z = (i * Math.PI * 2) / 3;
      propBlade.add(holder);
    }
    propBlade.position.set(0, 0, -2.2);
    g.add(propBlade);
    g.userData.propeller = propBlade;

    g.scale.setScalar(1.5);
    return g;
  },

  createBalloon() {
    const g = new THREE.Group();
    const colors = [0xe74c3c, 0xf39c12, 0x9b59b6, 0x1abc9c, 0x3498db];
    const balloonColor = colors[Math.floor(Math.random() * colors.length)];

    const envelope = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 12, 10),
      new THREE.MeshLambertMaterial({ color: balloonColor }),
    );
    envelope.scale.set(1.6, 1.3, 1.6);
    envelope.position.y = 5;
    g.add(envelope);

    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 0.6, 0.8, 8),
      new THREE.MeshLambertMaterial({ color: balloonColor }),
    );
    skirt.position.y = 5 - 2.5 * 1.3 + 0.2;
    g.add(skirt);

    const basket = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.0, 1.4, 10),
      new THREE.MeshLambertMaterial({ color: 0xc4944a }),
    );
    basket.position.y = -1.0;
    basket.castShadow = true;
    g.add(basket);

    const ropeMat = new THREE.LineBasicMaterial({ color: 0x8b7355 });
    const envelopeBottom = 5 - 2.5 * 1.3;
    [
      [-0.8, -0.8],
      [-0.8, 0.8],
      [0.8, -0.8],
      [0.8, 0.8],
    ].forEach((c) => {
      const pts = [
        new THREE.Vector3(c[0] * 0.6, envelopeBottom, c[1] * 0.6),
        new THREE.Vector3(c[0], -0.3, c[1]),
      ];
      g.add(
        new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ropeMat),
      );
    });

    g.scale.setScalar(1.2);
    return g;
  },

  updateSkyVehicle(t) {
    if (!this.skyVehicle) return;

    const ud = this.skyVehicle.userData;
    this.skyVehicle.position.x += Math.cos(ud.dir) * ud.speed;
    this.skyVehicle.position.z += Math.sin(ud.dir) * ud.speed;

    if (this.skyVehicleType === "plane" && ud.propeller) {
      ud.propeller.rotation.z += 0.5;
    }

    if (this.skyVehicleType === "balloon") {
      this.skyVehicle.position.y = ud.height + Math.sin(t * 0.4) * 1.5;
    }

    const dx = this.skyVehicle.position.x;
    const dz = this.skyVehicle.position.z;
    if (dx * dx + dz * dz > 130 * 130) {
      this.spawnSkyVehicle();
    }
  },

  // 새 트랙 세그먼트와 충돌하는 나무/집/풍차를 숨기고, 양은 빈 자리로 이동
  removeSceneryOverlappingTrack(segment) {
    const pts = segment.points;
    // 이 세그먼트가 처음으로 숨긴 오브젝트만 기록 (이미 숨겨진 건 제외)
    segment.hiddenScenery = [];

    // 트랙 중심선의 점들 중 가장 가까운 거리의 제곱 반환
    const minDist2 = (ox, oz) => {
      let min2 = Infinity;
      for (const p of pts) {
        const dx = p.x - ox,
          dz = p.z - oz;
        const d2 = dx * dx + dz * dz;
        if (d2 < min2) min2 = d2;
      }
      return min2;
    };

    // 나무: 반경 4 이내 숨기기 (아직 보이는 것만)
    this.trees.forEach((tree) => {
      if (tree.visible && minDist2(tree.position.x, tree.position.z) < 16) {
        tree.visible = false;
        segment.hiddenScenery.push(tree);
      }
    });

    // 집: 반경 5 이내 숨기기 (index 0 = 기차역 제외, 아직 보이는 것만)
    this.houses.forEach((house, i) => {
      if (i === 0) return;
      if (house.visible && minDist2(house.position.x, house.position.z) < 25) {
        house.visible = false;
        segment.hiddenScenery.push(house);
      }
    });

    // 풍차: 반경 5 이내 숨기기 (아직 보이는 것만)
    this.windmills.forEach((wm) => {
      if (wm.visible && minDist2(wm.position.x, wm.position.z) < 25) {
        wm.visible = false;
        segment.hiddenScenery.push(wm);
      }
    });

    // 양: 트랙과 겹치는 양을 빈 위치로 이동 + 하늘에서 낙하 애니메이션
    this.sheep.forEach((s, idx) => {
      if (minDist2(s.x, s.z) < 9) {
        // 반경 3 이내
        let attempts = 0;
        let nx, nz;
        do {
          const side = Math.random() > 0.5 ? 1 : -1;
          nx = side * (15 + Math.random() * 45);
          nz = (Math.random() - 0.5) * 120;
          attempts++;
        } while (this.isBlocked(nx, nz, idx) && attempts < 100);

        if (attempts < 100) {
          s.x = nx;
          s.z = nz;
          s.targetX = nx;
          s.targetZ = nz;
          s.isEating = false;
          s.isWalking = false;
          if (s.isDancing) this.toggleSheepDance(idx);
          s.isFalling = true;
          s.fallY = 30;
          s.fallVY = 0;
          s.mesh.position.set(nx, 30, nz);
        }
      }
    });
  },

  /* ==================== SCENERY ==================== */
  createScenery() {
    // 나무: 역/중심 주변(r<25) 제외하고 랜덤 배치
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 25 + Math.random() * 63; // 25~88 범위
      this.createTree(Math.cos(a) * d, 0, Math.sin(a) * d);
    }

    // 집: 고정 위치 4채
    this.createHouse(35, 0, -25, this.C.houseRoof, 0);
    this.createHouse(-30, 0, 25, this.C.houseRoofBlue, Math.PI / 3);
    this.createHouse(55, 0, 40, this.C.houseRoof, Math.PI / 5);
    this.createHouse(-50, 0, -45, this.C.houseRoofBlue, -Math.PI / 4);

    // 풍차: 고정 위치 2개
    this.createWindmill(-25, 0, -30);
    this.createWindmill(60, 0, 15);

    this.createFlowers();
    this.createPebbles();
  },

  createPebbles() {
    const stMat = new THREE.MeshLambertMaterial({ color: this.C.stoneGray });
    for (let i = 0; i < 180; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 20 + Math.random() * 68; // 20~88 범위 (역 주변 제외)
      const geo = new THREE.CylinderGeometry(
        0.15 + Math.random() * 0.2,
        0.2 + Math.random() * 0.2,
        0.07 + Math.random() * 0.06,
        5,
      );
      const s = new THREE.Mesh(geo, stMat);
      s.position.set(
        Math.cos(a) * d + (Math.random() - 0.5),
        0.04,
        Math.sin(a) * d + (Math.random() - 0.5),
      );
      s.rotation.y = Math.random() * Math.PI;
      this.scene.add(s);
    }
  },

  createTree(x, y, z) {
    const tree = new THREE.Group();
    const sc = 1 + Math.random() * 0.5;
    const type = Math.floor(Math.random() * 3);
    const tH = 1.5 + Math.random() * 0.5;

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2 * sc, 0.3 * sc, tH * sc, 6),
      this._treeTrunkMat,
    );
    trunk.position.y = (tH * sc) / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    const lM =
      this._treeLeafMats[Math.floor(Math.random() * this._treeLeafMats.length)];

    if (type === 0) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(1.2 * sc, 8, 6), lM);
      l.position.y = tH * sc + 0.8 * sc;
      l.castShadow = true;
      tree.add(l);
    } else if (type === 1) {
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(sc, 2.5 * sc, 8), lM);
      c1.position.y = tH * sc + sc;
      c1.castShadow = true;
      tree.add(c1);
      const c2 = new THREE.Mesh(
        new THREE.ConeGeometry(0.7 * sc, 1.8 * sc, 8),
        lM,
      );
      c2.position.y = tH * sc + 2 * sc;
      c2.castShadow = true;
      tree.add(c2);
    } else {
      for (let i = 0; i < 3; i++) {
        const l2 = new THREE.Mesh(new THREE.SphereGeometry(0.7 * sc, 6, 5), lM);
        l2.position.set(
          (Math.random() - 0.5) * 0.8 * sc,
          tH * sc + 0.5 * sc + i * 0.5 * sc,
          (Math.random() - 0.5) * 0.8 * sc,
        );
        l2.castShadow = true;
        tree.add(l2);
      }
    }
    tree.position.set(x, y, z);
    this.trees.push(tree);
    this.scene.add(tree);
  },

  createHouse(x, y, z, roofColor, rot) {
    const h = new THREE.Group();
    const wM = new THREE.MeshLambertMaterial({ color: this.C.houseWall });
    const rM = new THREE.MeshLambertMaterial({ color: roofColor });

    const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 3.5), wM);
    wall.position.y = 1.5;
    wall.castShadow = true;
    h.add(wall);

    const rs = new THREE.Shape();
    rs.moveTo(-2.3, 0);
    rs.lineTo(0, 1.5);
    rs.lineTo(2.3, 0);
    rs.closePath();
    const roof = new THREE.Mesh(
      new THREE.ExtrudeGeometry(rs, { depth: 3.8, bevelEnabled: false }),
      rM,
    );
    roof.position.set(0, 3, -1.9);
    roof.castShadow = true;
    h.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.5, 0.1),
      new THREE.MeshLambertMaterial({ color: this.C.houseDoor }),
    );
    door.position.set(0, 0.75, -1.76);
    h.add(door);

    // 창문 (isWindow 플래그로 밤에 불 켜짐)
    const winM = new THREE.MeshLambertMaterial({ color: this.C.houseWindow });
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), winM);
    w1.position.set(-1.2, 2, -1.76);
    w1.userData.isWindow = true;
    h.add(w1);
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), winM);
    w2.position.set(1.2, 2, -1.76);
    w2.userData.isWindow = true;
    h.add(w2);

    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.5, 0.5),
      new THREE.MeshLambertMaterial({ color: 0x7f8c8d }),
    );
    chimney.position.set(1, 4.2, 0);
    h.add(chimney);

    h.position.set(x, y, z);
    h.rotation.y = rot;
    this.houses.push(h);
    this.scene.add(h);
  },

  createWindmill(x, y, z) {
    const g = new THREE.Group();

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1.5, 6, 8),
      new THREE.MeshLambertMaterial({ color: this.C.windmillBody }),
    );
    tower.position.y = 3;
    tower.castShadow = true;
    g.add(tower);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 1.5, 8),
      new THREE.MeshLambertMaterial({ color: 0xc0392b }),
    );
    roof.position.y = 6.75;
    roof.castShadow = true;
    g.add(roof);

    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.3, 0.1),
      new THREE.MeshLambertMaterial({ color: this.C.houseDoor }),
    );
    door.position.set(0, 0.65, -1.5);
    g.add(door);

    this.windmillBlade = new THREE.Group();
    this.windmillBlade.position.set(0, 5.5, -1.2);
    const blM = new THREE.MeshLambertMaterial({ color: this.C.windmillBlade });
    for (let i = 0; i < 4; i++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 3.5, 0.1), blM);
      bl.position.y = 1.75;
      const holder = new THREE.Group();
      holder.add(bl);
      holder.rotation.z = (i * Math.PI) / 2;
      this.windmillBlade.add(holder);
    }
    const ax = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshLambertMaterial({ color: 0x555555 }),
    );
    this.windmillBlade.add(ax);
    g.add(this.windmillBlade);

    g.position.set(x, y, z);
    this.windmills.push(g);
    this.scene.add(g);
  },

  createFlowers() {
    const colors = [0xff6b9d, 0xffd93d, 0xff6b35, 0xc44dff, 0xff4757];
    const sM = new THREE.MeshLambertMaterial({ color: 0x2ecc71 });
    for (let i = 0; i < 150; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 20 + Math.random() * 68; // 20~88 범위 (역 주변 제외)
      const f = new THREE.Group();
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.4, 4),
        sM,
      );
      stem.position.y = 0.2;
      f.add(stem);
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 6, 4),
        new THREE.MeshLambertMaterial({
          color: colors[Math.floor(Math.random() * colors.length)],
        }),
      );
      petal.position.y = 0.45;
      f.add(petal);
      f.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      this.scene.add(f);
    }
  },

  /* ==================== CLOUDS ==================== */
  createClouds() {
    const cM = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      const numPuffs = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < numPuffs; j++) {
        const puff = new THREE.Mesh(
          new THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 6),
          cM,
        );
        puff.position.set(
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 1,
          (Math.random() - 0.5) * 3,
        );
        cloud.add(puff);
      }
      cloud.position.set(
        (Math.random() - 0.5) * 140,
        18 + Math.random() * 12,
        (Math.random() - 0.5) * 140,
      );
      this.clouds.push({ mesh: cloud, speed: 0.02 + Math.random() * 0.03 });
      this.scene.add(cloud);
    }
  },

  /* ==================== SUN / MOON ==================== */
  createCelestialBodies() {
    this.sunGroup = new THREE.Group();
    const sunBody = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xffd700 }),
    );
    this.sunGroup.add(sunBody);

    const rayM = new THREE.MeshBasicMaterial({ color: 0xffa500 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 4), rayM);
      ray.position.set(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0);
      ray.rotation.z = a - Math.PI / 2;
      this.sunGroup.add(ray);
    }

    this.sunPupils = this._createCelestialEyes(
      this.sunGroup,
      1.8,
      1.6,
      0.9,
      0.8,
    );

    const smCurve = new THREE.EllipseCurve(
      0,
      0,
      1.8,
      1.0,
      0,
      Math.PI,
      false,
      0,
    );
    const smLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(smCurve.getPoints(16)),
      new THREE.LineBasicMaterial({ color: 0x8b4513 }),
    );
    smLine.position.set(0, -1.8, 5.1);
    this.sunGroup.add(smLine);

    const cheekM = new THREE.MeshBasicMaterial({
      color: 0xff8c69,
      transparent: true,
      opacity: 0.5,
    });
    [-2.8, 2.8].forEach((cx) => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), cheekM);
      cheek.position.set(cx, -0.8, 4.8);
      this.sunGroup.add(cheek);
    });

    this.sunGroup.position.set(60, 28, -40);
    this.scene.add(this.sunGroup);

    this.moonGroup = new THREE.Group();
    const moonBody = new THREE.Mesh(
      new THREE.SphereGeometry(4, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff8dc }),
    );
    this.moonGroup.add(moonBody);

    const craterMat = new THREE.MeshBasicMaterial({ color: 0xe8dcc8 });
    [
      { x: -1.2, y: 0.8, z: 3.5, r: 0.6 },
      { x: 1.5, y: -0.5, z: 3.4, r: 0.5 },
      { x: -0.3, y: -1.5, z: 3.6, r: 0.4 },
    ].forEach((c) => {
      const crater = new THREE.Mesh(
        new THREE.SphereGeometry(c.r, 6, 4),
        craterMat,
      );
      crater.position.set(c.x, c.y, c.z);
      this.moonGroup.add(crater);
    });

    this.moonPupils = this._createCelestialEyes(
      this.moonGroup,
      1.2,
      0.8,
      0.45,
      0.3,
      0,
      3.6,
    );

    this.moonGroup.position.set(-50, 35, -30);
    this.moonGroup.visible = false;
    this.scene.add(this.moonGroup);
  },

  _createCelestialEyes(group, spacing, eyeR, pupilR, yOff, xOff, zBase) {
    const pupils = [];
    const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const centerX = xOff || 0;
    const bz = zBase !== undefined ? zBase : 4.5;

    [-spacing, spacing].forEach((sx) => {
      const px = centerX + sx;
      const eyeBg = new THREE.Mesh(
        new THREE.SphereGeometry(eyeR, 10, 8),
        eyeWhite,
      );
      eyeBg.position.set(px, yOff || 0.5, bz);
      group.add(eyeBg);
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(pupilR, 8, 6),
        pupilMat,
      );
      pupil.position.set(px, yOff || 0.5, bz + eyeR * 0.6);
      group.add(pupil);
      pupils.push({
        mesh: pupil,
        cx: px,
        cy: yOff || 0.5,
        baseZ: bz,
        eyeR: eyeR,
      });
    });

    return pupils;
  },

  updateCelestialEyes() {
    const activeGroup = this.isNight ? this.moonGroup : this.sunGroup;
    const activePupils = this.isNight ? this.moonPupils : this.sunPupils;
    if (!activeGroup || !activePupils || activePupils.length === 0) return;

    activeGroup.getWorldPosition(this._worldPos);
    this._screenPos.copy(this._worldPos).project(this.camera);

    let dx = this.mouseNDC.x - this._screenPos.x;
    let dy = this.mouseNDC.y - this._screenPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxD = 2;
    if (dist > maxD) {
      dx = (dx / dist) * maxD;
      dy = (dy / dist) * maxD;
    }

    activePupils.forEach((p) => {
      const maxMove = p.eyeR * 0.35;
      p.mesh.position.x = p.cx + (dx / maxD) * maxMove;
      p.mesh.position.y = p.cy + (dy / maxD) * maxMove;
    });
  },

  /* ==================== SMOKE ==================== */
  updateSmoke() {
    if (!this.isPaused && Math.random() > 0.5) {
      const sM = new THREE.MeshBasicMaterial({
        color: 0xcccccc,
        transparent: true,
        opacity: 0.5,
      });
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.2 + Math.random() * 0.2, 6, 4),
        sM,
      );
      const p = new THREE.Vector3(0, 3.5, -1.8);
      this.train.children[0].localToWorld(p);
      s.position.copy(p);
      this.smoke.push({
        mesh: s,
        life: 0,
        maxLife: 60 + Math.random() * 30,
        vx: (Math.random() - 0.5) * 0.02,
        vy: 0.05 + Math.random() * 0.03,
        vz: (Math.random() - 0.5) * 0.02,
      });
      this.scene.add(s);
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.life++;
      s.mesh.position.x += s.vx;
      s.mesh.position.y += s.vy;
      s.mesh.position.z += s.vz;
      s.mesh.scale.setScalar(1 + s.life * 0.03);
      s.mesh.material.opacity = 0.5 * (1 - s.life / s.maxLife);
      if (s.life >= s.maxLife) {
        this.scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
        this.smoke.splice(i, 1);
      }
    }
  },

  /* ==================== SHEEP ==================== */
  buildObstacleList() {
    this.obstacleList = [];

    // 나무
    this.trees.forEach((tr) => {
      this.obstacleList.push({ x: tr.position.x, z: tr.position.z, r: 2.5 });
    });

    // 집 (houses 배열에는 기차역도 포함됨)
    this.houses.forEach((h) => {
      this.obstacleList.push({ x: h.position.x, z: h.position.z, r: 6 });
    });

    // 풍차
    this.obstacleList.push({ x: -25, z: -30, r: 4 });

    // 연못 (배경 장식)
    this.obstacleList.push({ x: -40, z: 30, r: 10 });

    // 터널 / 호수 세그먼트 (동적으로 트랙에 추가된 것들)
    this.trackSegments.forEach((seg) => {
      if (!seg.tunnelObj) return;
      const cx = seg.tunnelObj.position.x;
      const cz = seg.tunnelObj.position.z;
      if (seg.tunnelType === "tunnel") {
        // 반구 중심 (r = hillR + 1 여유)
        this.obstacleList.push({ x: cx, z: cz, r: 13 });
        // 입구/출구 포탈 영역 (벽돌이 isNearTrack 범위 밖까지 뻗어있음)
        this.obstacleList.push({ x: seg.startX, z: seg.startZ, r: 6 });
        this.obstacleList.push({ x: seg.endX, z: seg.endZ, r: 6 });
      } else {
        // 호수: 타원 수면 영역을 단일 원으로 근사
        this.obstacleList.push({ x: cx, z: cz, r: 12 });
      }
    });
  },

  _rebuildFlatTrackPoints() {
    this._flatTrackPoints = [];
    for (const seg of this.trackSegments) {
      for (const pt of seg.points) {
        this._flatTrackPoints.push(pt);
      }
    }
  },

  isNearTrack(x, z) {
    // 트랙 근처인지 체크 (완화된 버전 - 3 이내)
    for (const pt of this._flatTrackPoints) {
      const dx = x - pt.x;
      const dz = z - pt.z;
      if (dx * dx + dz * dz < 9) return true; // 3 이내
    }
    return false;
  },

  isBlocked(x, z, sheepIdx) {
    // 트랙 근처 체크
    if (this.isNearTrack(x, z)) return true;

    // 정적 장애물
    for (const ob of this.obstacleList) {
      const dx = x - ob.x,
        dz = z - ob.z;
      if (dx * dx + dz * dz < ob.r * ob.r) return true;
    }

    // 다른 양과의 거리
    for (let j = 0; j < this.sheep.length; j++) {
      if (j === sheepIdx) continue;
      const other = this.sheep[j];
      const dx = x - other.x,
        dz = z - other.z;
      if (dx * dx + dz * dz < 4) return true;
    }

    // 필드 경계
    if (Math.abs(x) > 60 || Math.abs(z) > 60) return true;

    return false;
  },

  /* ==================== DUCK ==================== */
  createOneDuck() {
    const g = new THREE.Group();
    const yellowM = new THREE.MeshLambertMaterial({ color: 0xffd700 });
    const orangeM = new THREE.MeshLambertMaterial({ color: 0xff8c00 });
    const blackM = new THREE.MeshLambertMaterial({ color: 0x111111 });

    // 몸통 (납작한 타원 구)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), yellowM);
    body.scale.set(1.15, 0.7, 0.95);
    body.position.y = 0.2;
    body.castShadow = true;
    g.add(body);

    // 꼬리 (뒤쪽 작은 돌기)
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), yellowM);
    tail.scale.set(0.6, 0.8, 1.0);
    tail.position.set(-0.32, 0.24, 0);
    g.add(tail);

    // 머리
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 5), yellowM);
    head.position.set(0.28, 0.38, 0);
    head.castShadow = true;
    g.add(head);

    // 부리 (납작한 원뿔)
    const beak = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.14, 5),
      orangeM,
    );
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.43, 0.37, 0);
    g.add(beak);

    // 눈
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 5, 4), blackM);
    eye.position.set(0.38, 0.43, 0.09);
    g.add(eye);

    // 날개 (좌우)
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 6, 4),
        yellowM,
      );
      wing.scale.set(0.55, 0.28, 0.95);
      wing.position.set(-0.02, 0.22, side * 0.28);
      g.add(wing);
    });

    g.scale.setScalar(1.1);
    return g;
  },

  updateDucks(t) {
    this.ducks.forEach((d) => {
      // 수면 위 둥실둥실 보빙
      d.mesh.position.y = 0.06 + Math.sin(t * 1.3 + d.bobPhase) * 0.04;

      // 새 목표 선택
      if (t > d.nextMoveTime) {
        let nx,
          nz,
          att = 0;
        do {
          nx = (Math.random() - 0.5) * d.halfX * 1.5;
          nz = d.side * (d.minZ + Math.random() * (d.halfZ - d.minZ) * 0.82);
          att++;
        } while (att < 50 && (nx / d.halfX) ** 2 + (nz / d.halfZ) ** 2 > 0.82);
        if (att < 50) {
          d.targetLocalX = nx;
          d.targetLocalZ = nz;
        }
        d.nextMoveTime = t + 3 + Math.random() * 5;
      }

      // 목표 방향으로 이동
      const dx = d.targetLocalX - d.localX;
      const dz = d.targetLocalZ - d.localZ;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist > 0.15) {
        const mv = Math.atan2(dz, dx);
        d.mesh.rotation.y = -mv; // 부리가 진행 방향을 향하도록
        d.localX += Math.cos(mv) * d.speed;
        d.localZ += Math.sin(mv) * d.speed;
        d.mesh.position.x = d.localX;
        d.mesh.position.z = d.localZ;
      }
    });
  },

  playQuack() {
    if (this.isGlobalMuted()) return;
    try {
      if (!this.audioCtx)
        this.audioCtx = new (
          window.AudioContext || window.webkitAudioContext
        )();
      const ctx = this.audioCtx;
      const now = ctx.currentTime;
      // 꿱꿱 두 번
      [0, 0.26].forEach((delay) => {
        const t0 = now + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(480, t0);
        osc.frequency.exponentialRampToValueAtTime(210, t0 + 0.17);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.exponentialRampToValueAtTime(0.1, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.22);
      });
    } catch (e) {}
  },

  createOneSheep() {
    const g = new THREE.Group();
    const woolMat = new THREE.MeshLambertMaterial({ color: 0xf5f5f0 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x3d3d3d });
    const legMat = new THREE.MeshLambertMaterial({ color: 0x8b7355 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), woolMat);
    body.scale.set(1.2, 0.9, 0.8);
    body.position.y = 0.9;
    body.castShadow = true;
    g.add(body);

    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 6, 4),
        woolMat,
      );
      const a = (i / 6) * Math.PI * 2;
      puff.position.set(
        Math.cos(a) * 0.6,
        0.9 + Math.sin(i * 1.7) * 0.2,
        Math.sin(a) * 0.45,
      );
      puff.castShadow = true;
      g.add(puff);
    }

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), darkMat);
    head.position.set(1.1, 1.05, 0);
    head.castShadow = true;
    g.add(head);

    [-0.22, 0.22].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), darkMat);
      ear.position.set(1.25, 1.2, side);
      g.add(ear);
    });

    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    [-0.13, 0.13].forEach((side) => {
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 4),
        eyeWhiteMat,
      );
      eyeWhite.position.set(1.42, 1.12, side);
      g.add(eyeWhite);
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 5, 4),
        pupilMat,
      );
      pupil.position.set(1.47, 1.12, side);
      g.add(pupil);
    });

    const legPositions = [
      { x: 0.5, z: -0.25, name: "FL" },
      { x: 0.5, z: 0.25, name: "FR" },
      { x: -0.5, z: -0.25, name: "BL" },
      { x: -0.5, z: 0.25, name: "BR" },
    ];
    const legs = {};
    legPositions.forEach((lp) => {
      const pivotGroup = new THREE.Group();
      pivotGroup.position.set(lp.x, 0.6, lp.z);
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.6),
        legMat,
      );
      leg.position.y = -0.3;
      leg.castShadow = true;
      pivotGroup.add(leg);
      g.add(pivotGroup);
      legs[lp.name] = pivotGroup;
    });
    g.userData.legs = legs;

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.15, 5, 4), woolMat);
    tail.position.set(-1.0, 1.0, 0);
    g.add(tail);

    g.scale.setScalar(1.2);
    return g;
  },

  createSheep() {
    this.buildObstacleList();
    this.sheep = []; // 배열 초기화

    const count = 10; // 양 10마리
    for (let i = 0; i < count; i++) {
      let attempts = 0;
      let x, z;
      do {
        // 트랙에서 떨어진 곳에서 생성 (x: 15~55 또는 -55~-15, z: -50~50)
        const side = Math.random() > 0.5 ? 1 : -1;
        x = side * (15 + Math.random() * 68); // 15~83 범위
        z = (Math.random() - 0.5) * 175; // ±87.5 범위
        attempts++;
      } while (this.isBlocked(x, z, -1) && attempts < 100);

      if (attempts >= 100) continue;

      const mesh = this.createOneSheep();
      const startAngle = Math.random() * Math.PI * 2;
      mesh.position.set(x, 0, z);
      mesh.rotation.y = -startAngle;
      this.scene.add(mesh);

      this.sheep.push({
        mesh: mesh,
        x: x,
        z: z,
        targetX: x,
        targetZ: z,
        angle: startAngle,
        speed: 0.008 + Math.random() * 0.008,
        nextMoveTime: Math.random() * 5,
        isEating: false,
        eatUntil: 0,
        isWalking: false,
        isDancing: false,
        danceEndTime: 0,
        isFalling: false,
        fallY: 0,
        fallVY: 0,
        hat: null,
        mirrorBall: null,
        mirrorLight: null,
      });
    }

    console.log("Sheep created:", this.sheep.length);
  },

  updateSheep(t) {
    const self = this;
    this.sheep.forEach((s, idx) => {
      // 하늘에서 떨어지는 애니메이션
      if (s.isFalling) {
        s.fallVY += 0.04;
        s.fallY = Math.max(0, s.fallY - s.fallVY);
        s.mesh.position.set(s.x, s.fallY, s.z);
        if (s.fallY <= 0) {
          s.isFalling = false;
          s.nextMoveTime = t + 2; // 착지 후 잠시 대기
        }
        return;
      }

      const legs = s.mesh.userData.legs;

      // 댄스 모드
      if (s.isDancing) {
        // 5초 경과 시 댄스 종료
        if (t >= s.danceEndTime) {
          this.toggleSheepDance(idx);
          return;
        }

        s.isEating = false;
        s.isWalking = true;

        if (s.mirrorBall) {
          s.mirrorBall.rotation.y += 0.05;
        }
        if (s.mirrorLight) {
          s.mirrorLight.intensity = 0.5 + Math.sin(t * 8) * 0.3;
          const hue = (t * 0.5) % 1;
          s.mirrorLight.color.setHSL(hue, 1.0, 0.6);
        }

        if (t > s.nextMoveTime) {
          let attempts = 0;
          let nx, nz;
          do {
            const da = (Math.random() - 0.5) * Math.PI * 0.45;
            const dist = 4 + Math.random() * 8;
            nx = s.x + Math.cos(s.angle + Math.PI + da) * dist;
            nz = s.z + Math.sin(s.angle + Math.PI + da) * dist;
            nx = Math.max(-58, Math.min(58, nx));
            nz = Math.max(-58, Math.min(58, nz));
            attempts++;
          } while (self.isBlocked(nx, nz, idx) && attempts < 30);
          if (attempts < 30) {
            s.targetX = nx;
            s.targetZ = nz;
          }
          s.nextMoveTime = t + 3 + Math.random() * 4;
        }

        const dx = s.targetX - s.x,
          dz = s.targetZ - s.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.5) {
          const moveAngle = Math.atan2(dz, dx);
          const headAngle = moveAngle + Math.PI;
          let angleDiff = headAngle - s.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          s.angle += angleDiff * 0.04;

          const newX = s.x + Math.cos(moveAngle) * s.speed * 0.7;
          const newZ = s.z + Math.sin(moveAngle) * s.speed * 0.7;
          if (!self.isBlocked(newX, newZ, idx)) {
            s.x = newX;
            s.z = newZ;
          }
        }

        s.mesh.position.set(s.x, 0, s.z);
        s.mesh.rotation.y = -s.angle;

        if (legs) {
          const swing = Math.sin(t * 8) * 0.4;
          legs.FL.rotation.z = -swing;
          legs.BR.rotation.z = -swing;
          legs.FR.rotation.z = swing;
          legs.BL.rotation.z = swing;
        }
        return;
      }

      // 풀 뜯기
      if (s.isEating) {
        s.isWalking = false;
        if (t > s.eatUntil) {
          s.isEating = false;
          s.nextMoveTime = t + 0.5;
        }
        s.mesh.children[0].position.y = 0.9 + Math.sin(t * 4) * 0.03;
        if (legs) {
          legs.FL.rotation.z = 0;
          legs.FR.rotation.z = 0;
          legs.BL.rotation.z = 0;
          legs.BR.rotation.z = 0;
        }
        return;
      }

      // 새 목적지
      if (t > s.nextMoveTime) {
        let attempts = 0;
        let nx, nz;
        do {
          const da = (Math.random() - 0.5) * Math.PI * 0.7;
          const dist = 4 + Math.random() * 10;
          nx = s.x + Math.cos(s.angle + da) * dist;
          nz = s.z + Math.sin(s.angle + da) * dist;
          nx = Math.max(-58, Math.min(58, nx));
          nz = Math.max(-58, Math.min(58, nz));
          attempts++;
        } while (self.isBlocked(nx, nz, idx) && attempts < 30);

        if (attempts < 30) {
          s.targetX = nx;
          s.targetZ = nz;
        } else {
          s.angle += Math.PI;
          s.targetX = s.x + Math.cos(s.angle) * 5;
          s.targetZ = s.z + Math.sin(s.angle) * 5;
        }
        s.nextMoveTime = t + 4 + Math.random() * 6;

        if (Math.random() < 0.25) {
          s.isEating = true;
          s.eatUntil = t + 2 + Math.random() * 3;
          s.isWalking = false;
          return;
        }
      }

      // 이동
      const dx = s.targetX - s.x;
      const dz = s.targetZ - s.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.5) {
        s.isWalking = true;
        const targetAngle = Math.atan2(dz, dx);
        let angleDiff = targetAngle - s.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        s.angle += angleDiff * 0.04;

        let newX = s.x + Math.cos(s.angle) * s.speed;
        let newZ = s.z + Math.sin(s.angle) * s.speed;

        if (self.isBlocked(newX, newZ, idx)) {
          const turnDir = Math.random() < 0.5 ? 1 : -1;
          const avoidAngle = s.angle + turnDir * (Math.PI / 4);
          const ax = s.x + Math.cos(avoidAngle) * s.speed;
          const az = s.z + Math.sin(avoidAngle) * s.speed;
          if (!self.isBlocked(ax, az, idx)) {
            s.angle = avoidAngle;
            s.x = ax;
            s.z = az;
          } else {
            s.nextMoveTime = t + 0.5;
            s.isWalking = false;
          }
        } else {
          s.x = newX;
          s.z = newZ;
        }

        s.mesh.position.set(s.x, 0, s.z);
        s.mesh.rotation.y = -s.angle;

        if (legs && s.isWalking) {
          const swing = Math.sin(t * 6) * 0.35;
          legs.FL.rotation.z = swing;
          legs.BR.rotation.z = swing;
          legs.FR.rotation.z = -swing;
          legs.BL.rotation.z = -swing;
        }
      } else {
        s.isWalking = false;
        if (legs) {
          legs.FL.rotation.z *= 0.9;
          legs.FR.rotation.z *= 0.9;
          legs.BL.rotation.z *= 0.9;
          legs.BR.rotation.z *= 0.9;
        }
      }
    });
  },

  toggleSheepDance(sheepIdx) {
    const s = this.sheep[sheepIdx];
    if (!s) return;

    s.isDancing = !s.isDancing;

    if (s.isDancing) {
      s.isEating = false;
      s.danceEndTime = this.clock.elapsedTime + 5;

      // 모자
      const hatGroup = new THREE.Group();
      const crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 0.3, 8),
        new THREE.MeshLambertMaterial({ color: 0x111111 }),
      );
      crown.position.y = 0.15;
      hatGroup.add(crown);
      const brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.04, 12),
        new THREE.MeshLambertMaterial({ color: 0x111111 }),
      );
      hatGroup.add(brim);
      hatGroup.position.set(1.1, 1.5, 0);
      hatGroup.rotation.z = -0.15;
      s.mesh.add(hatGroup);
      s.hat = hatGroup;

      // 미러볼
      const mirrorBallGroup = new THREE.Group();
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.6, 32, 24),
        new THREE.MeshPhongMaterial({
          color: 0xd0d0d0,
          specular: 0xffffff,
          shininess: 300,
        }),
      );
      mirrorBallGroup.add(ball);
      mirrorBallGroup.position.set(0, 4.5, 0);
      s.mesh.add(mirrorBallGroup);
      s.mirrorBall = mirrorBallGroup;

      // 라이트
      const mirrorLight = new THREE.PointLight(0xffffff, 0.8, 12);
      mirrorLight.position.set(0, 4.5, 0);
      s.mesh.add(mirrorLight);
      s.mirrorLight = mirrorLight;
    } else {
      if (s.hat) {
        s.mesh.remove(s.hat);
        s.hat.traverse((c) => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) c.material.dispose();
        });
        s.hat = null;
      }
      if (s.mirrorBall) {
        s.mesh.remove(s.mirrorBall);
        s.mirrorBall.traverse((c) => {
          if (c.geometry) c.geometry.dispose();
          if (c.material) c.material.dispose();
        });
        s.mirrorBall = null;
      }
      if (s.mirrorLight) {
        s.mesh.remove(s.mirrorLight);
        s.mirrorLight = null;
      }
    }
  },

  /* ==================== CAMERA ==================== */
  updateCameraPosition(dt) {
    const k = 10;
    const smoothing = Math.min(Math.max(1 - Math.exp(-k * dt), 0.02), 0.5);
    this.camTheta += (this.targetTheta - this.camTheta) * smoothing;
    this.camPhi += (this.targetPhi - this.camPhi) * smoothing;
    this.camRadius += (this.targetRadius - this.camRadius) * smoothing;
    this.panX += (this.targetPanX - this.panX) * smoothing;
    this.panZ += (this.targetPanZ - this.panZ) * smoothing;

    const x =
      this.camRadius * Math.sin(this.camPhi) * Math.cos(this.camTheta) +
      this.panX;
    const y = this.camRadius * Math.cos(this.camPhi);
    const z =
      this.camRadius * Math.sin(this.camPhi) * Math.sin(this.camTheta) +
      this.panZ;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.panX, 1, this.panZ);
  },

  /* ==================== HORN ==================== */
  isGlobalMuted() {
    const muteBtn = document.getElementById("mute-btn");
    return muteBtn ? !muteBtn.classList.contains("unmuted") : false;
  },

  playHorn() {
    if (!this.hornEnabled || this.hornCooldown || this.isGlobalMuted()) return;
    this.hornCooldown = true;
    setTimeout(() => {
      this.hornCooldown = false;
    }, 3000);

    try {
      if (!this.audioCtx)
        this.audioCtx = new (
          window.AudioContext || window.webkitAudioContext
        )();
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // 귀여운 기차 경적: 사인파 "toot-toot" (두 번, 피치 슬라이드 다운)
      [
        [0, 880, 660],
        [0.38, 880, 660],
      ].forEach(([delay, startFreq, endFreq]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(startFreq, now + delay);
        osc.frequency.linearRampToValueAtTime(endFreq, now + delay + 0.25);
        gain.gain.setValueAtTime(0.001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.12, now + delay + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.3);
      });
    } catch (e) {}
  },

  /* ==================== TRAIN MOVEMENT ==================== */
  positionTrainOnTrack(forceClamp = false) {
    if (!this.train || this.trackSegments.length === 0) return;

    const totalLength = this.getTotalTrackLength();
    const carSpacing = 4.5;

    this.train.children.forEach((car, i) => {
      const carDistance = this.trainDistance - i * carSpacing;

      let dist;
      if (this.isLoopClosed && !forceClamp) {
        // 루프 완성 시: 모듈로 연산으로 순환 배치 (음수 → wrap)
        dist = carDistance % totalLength;
        if (dist < 0) dist += totalLength;
      } else {
        // 미완성 트랙 또는 초기화 버튼: 클램핑으로 시작점 고정
        dist = Math.max(0.5, Math.min(totalLength - 0.5, carDistance));
      }

      const pt = this.getTrackPointByDistance(dist);
      car.position.set(pt.x, 0, pt.z);
      car.rotation.y = -pt.angle - Math.PI / 2;
    });
  },

  resetTrainPosition() {
    if (this.trackSegments.length === 0) return;
    const margin = 2;
    this.hasReachedEnd = false;
    this.trainDistance = margin;
    // forceClamp = true: 초기화 버튼은 wagon 위치도 시작점으로 리셋
    this.positionTrainOnTrack(true);
  },

  updateTrain() {
    if (this.isPaused || this.trackSegments.length === 0) {
      this.positionTrainOnTrack();
      return;
    }

    const totalLength = this.getTotalTrackLength();
    const margin = 2;

    if (this.isLoopClosed) {
      this.trainDistance += this.trainSpeed;
      if (this.trainDistance > totalLength) {
        this.trainDistance -= totalLength;
        this.playHorn(); // 한 바퀴 완주 → 경적
      }
    } else if (!this.hasReachedEnd) {
      this.trainDistance += this.trainSpeed;
      if (this.trainDistance >= totalLength - margin) {
        this.trainDistance = totalLength - margin;
        this.hasReachedEnd = true;
        this.playHorn();
      }
    }

    this.trainWheels.forEach((w) => {
      w.rotation.x += 0.1;
    });
    this.positionTrainOnTrack();
  },

  /* ==================== DAY/NIGHT ==================== */
  toggleDayNight() {
    this.isNight = !this.isNight;
    const self = this;

    if (this.isNight) {
      this.scene.background.set(this.C.skyNight);
      this.scene.fog.color.set(this.C.skyNight);
      this.groundMesh.material.color.set(this.C.groundNight);
      this.ambientLight.intensity = 0.2;
      this.hemiLight.intensity = 0.2;
      this.dirLight.intensity = 0.3;
      this.dirLight.color.set(0x8888ff);
      this.dirLight.position.set(-50, 35, -30);

      // 집과 역 창문에 불 켜기 - 강화된 버전
      this.houses.forEach((h) => {
        h.traverse((c) => {
          if (c.userData && c.userData.isWindow && c.material) {
            // 밝은 노란색으로 변경 + emissive 강화
            c.material.color.setHex(0xffe066);
            c.material.emissive.set(0xffaa00);
            c.material.emissiveIntensity = 1.0;
          }
        });
      });

      if (this.sunGroup) this.sunGroup.visible = false;
      if (this.moonGroup) this.moonGroup.visible = true;
    } else {
      this.scene.background.set(this.C.skyDay);
      this.scene.fog.color.set(this.C.skyDay);
      this.groundMesh.material.color.set(this.C.groundDay);
      this.ambientLight.intensity = 0.5;
      this.hemiLight.intensity = 0.6;
      this.dirLight.intensity = 0.8;
      this.dirLight.color.set(0xffffff);
      this.dirLight.position.set(60, 28, -40);

      // 창문 불 끄기
      this.houses.forEach((h) => {
        h.traverse((c) => {
          if (c.userData && c.userData.isWindow && c.material) {
            c.material.color.setHex(self.C.houseWindow);
            c.material.emissive.set(0x000000);
            c.material.emissiveIntensity = 0;
          }
        });
      });

      if (this.sunGroup) this.sunGroup.visible = true;
      if (this.moonGroup) this.moonGroup.visible = false;
    }
  },

  /* ==================== EVENTS ==================== */
  bindEvents() {
    const self = this;

    const _btn = (id, fn) => {
      const el = document.getElementById(id);
      if (el)
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          fn();
        });
      return el;
    };

    _btn("c4-rotate-btn", () => {
      this.camAngleIndex = (this.camAngleIndex + 1) % 6;
      this.targetTheta = -Math.PI / 2 + this.camAngleIndex * (Math.PI / 3);
    });

    const dnBtn = _btn("c4-daynight-btn", () => {
      this.toggleDayNight();
      if (dnBtn) dnBtn.textContent = this.isNight ? "🌙" : "☀️";
    });

    const plBtn = _btn("c4-play-btn", () => {
      this.isPaused = !this.isPaused;
      if (plBtn) plBtn.textContent = this.isPaused ? "▶️" : "⏸️";
    });

    const spBtn = _btn("c4-speed-btn", () => {
      if (this.trainSpeed < 0.08) {
        this.trainSpeed = 0.14;
        if (spBtn) spBtn.textContent = "🐇";
      } else {
        this.trainSpeed = 0.06;
        if (spBtn) spBtn.textContent = "🐢";
      }
    });

    _btn("c4-reset-train", () => {
      this.resetTrainPosition();
    });

    _btn("c4-add-wagon", () => {
      this.addWagon();
    });
    _btn("c4-remove-wagon", () => {
      this.removeWagon();
    });
    _btn("c4-add-straight", () => {
      this.addTrackSegment("straight");
    });
    _btn("c4-add-left", () => {
      this.addTrackSegment("left");
    });
    _btn("c4-add-right", () => {
      this.addTrackSegment("right");
    });
    _btn("c4-remove-track", () => {
      this.removeLastTrackSegment();
    });
    _btn("c4-add-tunnel", () => {
      this.addTunnelSegment();
    });
    _btn("c4-add-pond", () => {
      this.addPondSegment();
    });
    _btn("c4-allremove-track", () => {
      this.removeAllTrackSegments();
    });

    const hornBtn = _btn("c4-horn-btn", () => {
      this.hornEnabled = !this.hornEnabled;
      if (hornBtn) hornBtn.textContent = this.hornEnabled ? "🔔" : "🔕";
    });

    _btn("c4-screenshot-btn", () => {
      this.takeScreenshot();
    });

    // 마우스 + 드래그 + 양 클릭
    let dragging = false,
      dragBtn = -1,
      ds = { x: 0, y: 0 };
    this.sheepRaycaster = new THREE.Raycaster();
    this.sheepMouse = new THREE.Vector2();

    this.container.addEventListener("mousedown", (e) => {
      if (!this.card.classList.contains("fullscreen")) return;
      dragging = true;
      dragBtn = e.button;
      ds = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mousemove", (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!dragging || !this.card.classList.contains("fullscreen")) return;
      const ddx = e.clientX - ds.x,
        ddy = e.clientY - ds.y;
      if (dragBtn === 0) {
        const panSpeed = this.camRadius * 0.03;
        this.targetPanX +=
          (-ddx * Math.sin(this.camTheta) -
            ddy * Math.cos(this.camTheta) * Math.cos(this.camPhi)) *
          panSpeed *
          0.15;
        this.targetPanZ +=
          (ddx * Math.cos(this.camTheta) -
            ddy * Math.sin(this.camTheta) * Math.cos(this.camPhi)) *
          panSpeed *
          0.15;
        this.targetPanX = Math.max(-60, Math.min(60, this.targetPanX));
        this.targetPanZ = Math.max(-60, Math.min(60, this.targetPanZ));
      } else if (dragBtn === 2) {
        this.targetTheta -= ddx * 0.008;
        this.targetPhi = Math.max(
          0.3,
          Math.min(Math.PI / 2.2, this.targetPhi + ddy * 0.005),
        );
      }
      ds = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
      dragBtn = -1;
    });

    // 양 클릭
    this.container.addEventListener("click", (e) => {
      if (!this.card.classList.contains("fullscreen")) return;

      const rect = this.container.getBoundingClientRect();
      this.sheepMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.sheepMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.sheepRaycaster.setFromCamera(this.sheepMouse, this.camera);

      // 오리 클릭 감지 (양보다 우선)
      const duckMeshes = [];
      this.ducks.forEach((d) => {
        d.mesh.traverse((c) => {
          if (c.isMesh) duckMeshes.push(c);
        });
      });
      const duckHits = this.sheepRaycaster.intersectObjects(duckMeshes);
      if (duckHits.length > 0) {
        this.playQuack();
        return; // 오리 클릭 시 양 클릭 처리 생략
      }

      // 양 클릭 감지
      const sheepMeshes = [];
      this.sheep.forEach((s) => {
        s.mesh.traverse((c) => {
          if (c.isMesh) sheepMeshes.push(c);
        });
      });

      const hits = this.sheepRaycaster.intersectObjects(sheepMeshes);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        for (let si = 0; si < this.sheep.length; si++) {
          let found = false;
          this.sheep[si].mesh.traverse((c) => {
            if (c === hitObj) found = true;
          });
          if (found) {
            this.toggleSheepDance(si);
            break;
          }
        }
      }
    });

    this.container.addEventListener(
      "wheel",
      (e) => {
        if (!this.card.classList.contains("fullscreen")) return;
        e.preventDefault();
        e.stopPropagation();
        this.targetRadius = Math.max(
          30,
          Math.min(120, this.targetRadius + e.deltaY * 0.05),
        );
      },
      { passive: false },
    );

    // Touch
    let ts = null,
      td = 0;
    this.container.addEventListener(
      "touchstart",
      (e) => {
        if (!this.card.classList.contains("fullscreen")) return;
        if (e.touches.length === 1)
          ts = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        else if (e.touches.length === 2)
          td = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
      },
      { passive: true },
    );

    this.container.addEventListener(
      "touchmove",
      (e) => {
        if (!this.card.classList.contains("fullscreen")) return;
        if (e.touches.length === 1 && ts) {
          const ddx = e.touches[0].clientX - ts.x,
            ddy = e.touches[0].clientY - ts.y;
          const panSpeed = this.camRadius * 0.04;
          this.targetPanX +=
            (-ddx * Math.sin(this.camTheta) -
              ddy * Math.cos(this.camTheta) * Math.cos(this.camPhi)) *
            panSpeed *
            0.03;
          this.targetPanZ +=
            (ddx * Math.cos(this.camTheta) -
              ddy * Math.sin(this.camTheta) * Math.cos(this.camPhi)) *
            panSpeed *
            0.03;
          this.targetPanX = Math.max(-60, Math.min(60, this.targetPanX));
          this.targetPanZ = Math.max(-60, Math.min(60, this.targetPanZ));
          ts = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          const nd = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
          );
          this.targetRadius = Math.max(
            30,
            Math.min(120, this.targetRadius - (nd - td) * 0.3),
          );
          td = nd;
        }
      },
      { passive: true },
    );

    window.addEventListener("resize", () => {
      if (this.isInitialized) this.handleResize();
    });
    this.container.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });
  },

  activate() {
    this.isActive = true;
  },
  deactivate() {
    this.isActive = false;
  },

  takeScreenshot() {
    if (!this.renderer) return;
    // 현재 프레임을 한 번 렌더하고 즉시 캡처
    this.renderer.render(this.scene, this.camera);
    const dataURL = this.renderer.domElement.toDataURL("image/png");

    const ts = new Date()
      .toISOString()
      .slice(0, 19)
      .replace("T", "_")
      .replace(/:/g, "-");
    const filename = `choo-choo-world_${ts}.png`;

    // iOS Safari는 download 속성 미지원 → 새 탭 열기
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      window.open(dataURL, "_blank");
    } else {
      const a = document.createElement("a");
      a.href = dataURL;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  },

  handleResize() {
    if (!this.renderer || !this.container) return;
    const r = this.container.getBoundingClientRect();
    const w = Math.round(r.width) || 1,
      h = Math.round(r.height) || 1;
    // 실제 크기가 바뀔 때만 setSize 호출 (setSize는 캔버스를 검정으로 초기화함)
    if (this._lastW !== w || this._lastH !== h) {
      this._lastW = w;
      this._lastH = h;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
      this._needsRender = true; // 리사이즈 후 재렌더 필요
    }
  },

  animate() {
    requestAnimationFrame(this._boundAnimate);

    if (!this.isActive) {
      // 비활성 상태에서도 리사이즈 후 한 번 렌더 (캔버스 검정 방지)
      if (this._needsRender) {
        this._needsRender = false;
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }

    const dt = this.clock.getDelta();
    const t = this.clock.elapsedTime;

    this.updateTrain();
    this.updateCameraPosition(dt);
    this.updateSmoke();
    this.updateSkyVehicle(t);
    this.updateSheep(t);
    this.updateDucks(t);

    this.clouds.forEach((c) => {
      c.mesh.position.x += c.speed;
      if (c.mesh.position.x > 80) c.mesh.position.x = -80;
    });

    if (this.windmillBlade) this.windmillBlade.rotation.z += 0.02;
    if (this.waterMesh)
      this.waterMesh.material.opacity = 0.6 + Math.sin(t * 2) * 0.1;
    this.trees.forEach((tr, i) => {
      tr.rotation.z = Math.sin(t * 0.5 + i * 0.3) * 0.02;
    });

    if (this.sunGroup && this.sunGroup.visible) {
      this.sunGroup.quaternion.copy(this.camera.quaternion);
    }
    if (this.moonGroup && this.moonGroup.visible) {
      this.moonGroup.quaternion.copy(this.camera.quaternion);
    }

    this.updateCelestialEyes();

    // 트랙 설치 경계선 표시 (트랙 끝이 경계 25유닛 이내에 접근하면 빛남)
    if (this.boundaryMat) {
      const end = this.getTrackEnd();
      const nearBound = 90 - Math.max(Math.abs(end.x), Math.abs(end.z));
      const show = !this.isLoopClosed && nearBound < 20;
      if (show) {
        const fade = Math.max(0, Math.min(1, 1 - nearBound / 20));
        const pulse = 0.5 + Math.sin(t * 5) * 0.45;
        this.boundaryMat.opacity = pulse * fade * 0.95;
        this.boundaryGlowMat.opacity = pulse * fade * 0.4;
      } else {
        this.boundaryMat.opacity = 0;
        this.boundaryGlowMat.opacity = 0;
      }
    }

    this.renderer.render(this.scene, this.camera);
  },
};
