/**
 * ========================================
 * card4.js - Choo-Choo World 트랙 빌더
 * ========================================
 * 복구: 양(sheep), 밤모드 창문 불, 기차역 방향
 */
window.Card4 = {
  card: null,
  container: null,

  // Three.js
  scene: null, camera: null, renderer: null, clock: null,

  // Scene objects
  train: null,
  wagonList: [],
  trainWheels: [],
  smoke: [],
  clouds: [],
  windmillBlade: null,
  trees: [],
  houses: [],
  sheep: [],  // 양 배열 - 반드시 초기화 필요
  obstacleList: [],
  groundMesh: null,
  waterMesh: null,
  skyVehicle: null,
  skyVehicleType: '',
  sunGroup: null,
  moonGroup: null,
  sunPupils: [],
  moonPupils: [],
  mouseNDC: { x: 0, y: 0 },

  // Track Builder System
  trackSegments: [],
  trackGroup: null,
  stationGroup: null,
  SEGMENT_LENGTH: 8,
  CURVE_ANGLE: Math.PI / 4,
  CURVE_RADIUS: 10,

  // Horn
  hornEnabled: true,
  hornCooldown: false,
  audioCtx: null,

  // Lights
  hemiLight: null, dirLight: null, ambientLight: null,

  // State
  isInitialized: false,
  isActive: false,
  isNight: false,
  trainSpeed: 0.015,
  trainDistance: 0,
  trainDirection: 1,
  camTheta: -Math.PI / 2,
  camPhi: Math.PI / 3.2,
  camRadius: 75,
  targetTheta: -Math.PI / 2,
  targetPhi: Math.PI / 3.2,
  targetRadius: 75,
  camAngleIndex: 0,
  panX: 0, panZ: 0,
  targetPanX: 0, targetPanZ: 0,
  isPaused: true,
  isMobile: false,
  sheepRaycaster: null,
  sheepMouse: null,

  // Track constants
  TRACK_WIDTH: 3.5,
  MAX_WAGONS: 8,
  MAX_SEGMENTS: 200,
  TRACK_START_X: -4,
  TRACK_START_Z: 0,
  TRACK_START_ANGLE: 0,

  // Colors
  C: {
    skyDay: 0x87CEEB, groundDay: 0x7EC850, groundDark: 0x5CA03A,
    trackWood: 0xC4944A, trackRail: 0x8B7355,
    trainBody: 0xE74C3C, trainRoof: 0xC0392B, trainChimney: 0x2C3E50,
    trainWindow: 0xF7DC6F,
    wagonBlue: 0x3498DB, wagonGreen: 0x27AE60, wagonYellow: 0xF39C12,
    wagonPurple: 0x9B59B6, wagonOrange: 0xE67E22, wagonPink: 0xE91E63,
    treeTrunk: 0x8B5E3C, treeLeaf: 0x27AE60, treeLeafDark: 0x1E8449, treeLeafLight: 0x58D68D,
    houseWall: 0xFAE5D3, houseRoof: 0xE74C3C, houseRoofBlue: 0x3498DB,
    houseDoor: 0x8B5E3C, houseWindow: 0xAED6F1,
    fenceWood: 0xD4A76A, waterDay: 0x5DADE2, stoneGray: 0x95A5A6,
    windmillBody: 0xFDF2E9, windmillBlade: 0xD5C4A1,
    skyNight: 0x1a1a3e, groundNight: 0x2d4a2d,
  },

  _wagonColors: null,
  _wagonColorIdx: 0,

  init() {
    this.card = Utils.$('#card-4');
    this.container = Utils.$('#train-container');
    if (!this.card || !this.container || typeof THREE === 'undefined') return;

    this.isMobile = window.innerWidth <= 768;
    this._wagonColors = [this.C.wagonBlue, this.C.wagonGreen, this.C.wagonYellow,
      this.C.wagonPurple, this.C.wagonOrange, this.C.wagonPink];

    const observer = new MutationObserver(() => {
      if (!this.isInitialized) return;
      this.handleResize();
    });
    observer.observe(this.card, { attributes: true, attributeFilter: ['class', 'style'] });

    setTimeout(() => { this.initThree(); this.handleResize(); }, 300);
  },

  initThree() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.C.skyDay);
    this.scene.fog = new THREE.Fog(this.C.skyDay, 80, 220);

    this.camera = new THREE.PerspectiveCamera(this.isMobile ? 55 : 45, 1, 0.5, 350);
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.isMobile, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.setupLights();
    this.createGround();
    this.createWater();
    
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);
    
    this.createStation();
    
    // 초기 트랙
    this.addTrackSegment('straight');
    this.addTrackSegment('straight');
    
    this.createTrain();
    this.createScenery();
    this.createClouds();
    this.createCelestialBodies();
    this.spawnSkyVehicle();
    this.createSheep();
    
    this.trainDistance = 2;
    this.positionTrainOnTrack();
    
    this.updateCameraPosition();
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
      return { x: this.TRACK_START_X, z: this.TRACK_START_Z, angle: this.TRACK_START_ANGLE };
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
      const existingStart = Math.floor(existingLen * 0.2);
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

    for (const np of newPoints) {
      if (Math.abs(np.x) > 100 || Math.abs(np.z) > 100) return true;
    }
    return false;
  },

  addTrackSegment(type) {
    if (this.trackSegments.length >= this.MAX_SEGMENTS) return;

    const end = this.getTrackEnd();
    const segment = this.createTrackSegmentData(type, end.x, end.z, end.angle);
    if (!segment) return;

    if (this.trackSegments.length >= 10 && this.checkTrackCollision(segment)) {
      console.log('Track overlaps');
      return;
    }

    segment.mesh = this.createTrackMesh(segment);
    this.trackSegments.push(segment);
    this.trackGroup.add(segment.mesh);
    this.updateTrackCounter();
  },

  removeLastTrackSegment() {
    if (this.trackSegments.length <= 1) return;
    
    const segment = this.trackSegments.pop();
    this.trackGroup.remove(segment.mesh);
    segment.mesh.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
    
    const totalLength = this.getTotalTrackLength();
    this.trainDistance = Math.min(this.trainDistance, totalLength - 2);
    this.updateTrackCounter();
  },

  createTrackSegmentData(type, startX, startZ, startAngle) {
    const points = [];
    let endX, endZ, endAngle, segmentLength;

    if (type === 'straight') {
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
          angle: startAngle
        });
      }
    } else {
      const curveDir = type === 'left' ? 1 : -1;
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
          angle: angle
        });
      }
    }

    return { type, startX, startZ, startAngle, endX, endZ, endAngle, length: segmentLength, points, mesh: null };
  },

  createTrackMesh(segment) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: this.C.trackWood });
    const railMat = new THREE.MeshLambertMaterial({ color: this.C.trackRail });
    
    const { type, startX, startZ, startAngle, endX, endZ } = segment;

    if (type === 'straight') {
      const sleeperCount = 8;
      for (let i = 0; i < sleeperCount; i++) {
        const t = (i + 0.5) / sleeperCount;
        const x = startX + (endX - startX) * t;
        const z = startZ + (endZ - startZ) * t;
        
        const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, this.TRACK_WIDTH + 1), woodMat);
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
        rail.position.set((startX + endX) / 2 + nx * side * railOffset, 0.25, (startZ + endZ) / 2 + nz * side * railOffset);
        rail.rotation.y = -startAngle;
        group.add(rail);
      });
    } else {
      const curveDir = type === 'left' ? 1 : -1;
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
        
        const sleeper = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, this.TRACK_WIDTH + 1), woodMat);
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
          pts.push(new THREE.Vector3(centerX - Math.cos(perpA) * railR, 0.25, centerZ - Math.sin(perpA) * railR));
        }
        const tubeGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.08, 6, false);
        group.add(new THREE.Mesh(tubeGeo, railMat));
      });
    }

    return group;
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
        const p1 = seg.points[idx], p2 = seg.points[idx + 1] || p1;
        return {
          x: p1.x + (p2.x - p1.x) * frac,
          z: p1.z + (p2.z - p1.z) * frac,
          angle: p1.angle + (p2.angle - p1.angle) * frac
        };
      }
      acc += seg.length;
    }
    const last = this.trackSegments[this.trackSegments.length - 1];
    return { x: last.endX, z: last.endZ, angle: last.endAngle };
  },

  updateTrackCounter() {
    const el = document.getElementById('c4-track-count');
    if (el) el.textContent = this.trackSegments.length;
  },

  /* ==================== STATION ==================== */
  createStation() {
    this.stationGroup = new THREE.Group();
    const wallM = new THREE.MeshLambertMaterial({ color: this.C.houseWall });
    const roofM = new THREE.MeshLambertMaterial({ color: this.C.houseRoof });

    // 플랫폼
    const plat = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 5), new THREE.MeshLambertMaterial({ color: 0xBDBDBD }));
    plat.position.y = 0.2;
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
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: 4, bevelEnabled: false }), roofM);
    roof.position.set(0, 3.4, -3.5);
    roof.castShadow = true;
    this.stationGroup.add(roof);

    // 문 (+Z 방향 = 트랙 방향)
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.1), new THREE.MeshLambertMaterial({ color: this.C.houseDoor }));
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
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3, 0.6, 0.1), new THREE.MeshLambertMaterial({ color: 0x2C3E50 }));
    sign.position.set(0, 3.0, 0.26);
    this.stationGroup.add(sign);

    // 기둥 + 캐노피
    const pM = new THREE.MeshLambertMaterial({ color: 0xECF0F1 });
    [[-4, 1.6, 1.5], [4, 1.6, 1.5], [-4, 1.6, -1.5], [4, 1.6, -1.5]].forEach((pos) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2), pM);
      p.position.set(pos[0], pos[1], pos[2]);
      this.stationGroup.add(p);
    });
    const cn = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 5), new THREE.MeshLambertMaterial({ color: 0xD35400 }));
    cn.position.set(0, 3.3, 0);
    this.stationGroup.add(cn);

    // 기차역 위치: 트랙(z=0 라인)의 옆에 배치
    // 트랙은 x=-4에서 +X 방향으로 가므로, 역은 트랙과 평행하게 배치
    // rotation.y = Math.PI/2 → 문이 -X 방향을 향함 (트랙 시작점 방향)
    this.stationGroup.position.set(-8, 0, -6);
    this.stationGroup.rotation.y = Math.PI / 2; // 90도 회전, 문이 트랙(+Z 방향 → -X 방향)을 향함
    
    // houses 배열에 추가하여 밤 모드에서 창문 불 켜지도록
    this.houses.push(this.stationGroup);
    this.scene.add(this.stationGroup);
  },

  /* ==================== LIGHTS ==================== */
  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);
    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x7EC850, 0.6);
    this.scene.add(this.hemiLight);
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(60, 28, -40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    const sc = this.dirLight.shadow.camera;
    sc.near = 0.5; sc.far = 250; sc.left = sc.bottom = -90; sc.right = sc.top = 90;
    this.scene.add(this.dirLight);
  },

  /* ==================== GROUND ==================== */
  createGround() {
    const gGeo = new THREE.CircleGeometry(140, 64);
    this.groundMesh = new THREE.Mesh(gGeo, new THREE.MeshLambertMaterial({ color: this.C.groundDay }));
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    const stGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 6);
    const stMat = new THREE.MeshLambertMaterial({ color: this.C.stoneGray });
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 6 + Math.random() * 5;
      const s = new THREE.Mesh(stGeo, stMat);
      s.position.set(Math.cos(a) * r + (Math.random() - 0.5), 0.05, Math.sin(a) * r + (Math.random() - 0.5));
      s.scale.setScalar(0.5 + Math.random() * 0.8);
      this.scene.add(s);
    }
  },

  /* ==================== WATER ==================== */
  createWater() {
    const shape = new THREE.Shape();
    shape.moveTo(-8, -5);
    shape.bezierCurveTo(-6, -8, 2, -9, 6, -6);
    shape.bezierCurveTo(10, -3, 8, 2, 4, 3);
    shape.bezierCurveTo(0, 4, -6, 2, -8, -1);
    shape.closePath();
    this.waterMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshLambertMaterial({ color: this.C.waterDay, transparent: true, opacity: 0.7 }));
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

    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2, 12), bM);
    boiler.rotation.x = Math.PI / 2;
    boiler.position.set(0, 1.4, -1.5);
    boiler.castShadow = true;
    g.add(boiler);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 2), new THREE.MeshLambertMaterial({ color: this.C.trainRoof }));
    roof.position.set(0, 2.1, 0.5);
    g.add(roof);

    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.2, 8), chM);
    ch.position.set(0, 2.4, -1.8);
    ch.castShadow = true;
    g.add(ch);
    const chTop = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 0.3, 8), chM);
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
    const sm = new THREE.Line(new THREE.BufferGeometry().setFromPoints(smC.getPoints(12)), new THREE.LineBasicMaterial({ color: 0x000000 }));
    sm.position.set(0, 1.15, -2.56);
    g.add(sm);

    const winM = new THREE.MeshLambertMaterial({ color: this.C.trainWindow });
    [-1, 1].forEach((s) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.8), winM);
      w.position.set(s * 1.12, 1.6, 0.5);
      g.add(w);
    });

    this.addWheels(g, [[-1,.35,-1.5],[1,.35,-1.5],[-1,.35,0],[1,.35,0],[-1,.35,1.2],[1,.35,1.2]]);

    const cp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.6), new THREE.MeshLambertMaterial({ color: 0x555555 }));
    cp.position.set(0, 0.5, 2);
    g.add(cp);
    
    return g;
  },

  addWagon() {
    if (this.wagonList.length >= this.MAX_WAGONS) return;
    const color = this._wagonColors[this._wagonColorIdx++ % this._wagonColors.length];
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
    });
    this.updateWagonCounter();
  },

  updateWagonCounter() {
    const el = document.getElementById('c4-wagon-count');
    if (el) el.textContent = this.wagonList.length;
  },

  createWagon(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 3), new THREE.MeshLambertMaterial({ color }));
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);

    this.addWheels(g, [[-0.8,.3,-1],[0.8,.3,-1],[-0.8,.3,1],[0.8,.3,1]]);

    const cpM = new THREE.MeshLambertMaterial({ color: 0x555555 });
    g.add(this._box(.25,.25,.5, null, 0,.5,-1.7, cpM));
    g.add(this._box(.25,.25,.5, null, 0,.5,1.7, cpM));

    const cc = [0xD5A76A, 0xC0392B, 0x2ECC71, 0xF1C40F];
    for (let i = 0; i < 2; i++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(.6+Math.random()*.4, .5+Math.random()*.3, .6+Math.random()*.4),
        new THREE.MeshLambertMaterial({ color: cc[Math.floor(Math.random()*cc.length)] })
      );
      c.position.set((Math.random()-.5)*.8, 1.8+i*.4, (Math.random()-.5)*1.2);
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
      this.skyVehicle = null;
    }
    this.skyVehicleType = Math.random() > 0.5 ? 'plane' : 'balloon';

    if (this.skyVehicleType === 'plane') {
      this.skyVehicle = this.createAirplane();
    } else {
      this.skyVehicle = this.createBalloon();
    }

    const dir = Math.random() * Math.PI * 2;
    const height = this.skyVehicleType === 'plane' ? 28 + Math.random() * 8 : 22 + Math.random() * 6;

    this.skyVehicle.position.set(Math.cos(dir) * 100, height, Math.sin(dir) * 100);
    this.skyVehicle.userData.dir = dir + Math.PI + (Math.random() - 0.5) * 0.6;
    this.skyVehicle.userData.speed = this.skyVehicleType === 'plane' ? 0.35 : 0.12;
    this.skyVehicle.userData.height = height;
    this.skyVehicle.rotation.y = Math.atan2(-Math.cos(this.skyVehicle.userData.dir), -Math.sin(this.skyVehicle.userData.dir));

    this.scene.add(this.skyVehicle);
  },

  createAirplane() {
    const g = new THREE.Group();
    const bodyM = new THREE.MeshLambertMaterial({ color: 0xECF0F1 });
    const wingM = new THREE.MeshLambertMaterial({ color: 0x3498DB });
    const tailM = new THREE.MeshLambertMaterial({ color: 0xE74C3C });

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 4, 8), bodyM);
    fuselage.rotation.x = Math.PI / 2;
    g.add(fuselage);

    g.add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 1.2), wingM));

    const vtail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.8), tailM);
    vtail.position.set(0, 0.6, 2);
    g.add(vtail);

    const htail = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.5), wingM);
    htail.position.set(0, 0, 2);
    g.add(htail);

    const propHub = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshLambertMaterial({ color: 0x333333 }));
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
    const colors = [0xE74C3C, 0xF39C12, 0x9B59B6, 0x1ABC9C, 0x3498DB];
    const balloonColor = colors[Math.floor(Math.random() * colors.length)];

    const envelope = new THREE.Mesh(new THREE.SphereGeometry(2.5, 12, 10), new THREE.MeshLambertMaterial({ color: balloonColor }));
    envelope.scale.set(1.6, 1.3, 1.6);
    envelope.position.y = 5;
    g.add(envelope);

    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 0.6, 0.8, 8), new THREE.MeshLambertMaterial({ color: balloonColor }));
    skirt.position.y = 5 - 2.5 * 1.3 + 0.2;
    g.add(skirt);

    const basket = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.0, 1.4, 10), new THREE.MeshLambertMaterial({ color: 0xC4944A }));
    basket.position.y = -1.0;
    basket.castShadow = true;
    g.add(basket);

    const ropeMat = new THREE.LineBasicMaterial({ color: 0x8B7355 });
    const envelopeBottom = 5 - 2.5 * 1.3;
    [[-0.8, -0.8], [-0.8, 0.8], [0.8, -0.8], [0.8, 0.8]].forEach((c) => {
      const pts = [new THREE.Vector3(c[0] * 0.6, envelopeBottom, c[1] * 0.6), new THREE.Vector3(c[0], -0.3, c[1])];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ropeMat));
    });

    g.scale.setScalar(1.2);
    return g;
  },

  updateSkyVehicle(t) {
    if (!this.skyVehicle) return;

    const ud = this.skyVehicle.userData;
    this.skyVehicle.position.x += Math.cos(ud.dir) * ud.speed;
    this.skyVehicle.position.z += Math.sin(ud.dir) * ud.speed;

    if (this.skyVehicleType === 'plane' && ud.propeller) {
      ud.propeller.rotation.z += 0.5;
    }

    if (this.skyVehicleType === 'balloon') {
      this.skyVehicle.position.y = ud.height + Math.sin(t * 0.4) * 1.5;
    }

    const dx = this.skyVehicle.position.x;
    const dz = this.skyVehicle.position.z;
    if (dx * dx + dz * dz > 130 * 130) {
      this.spawnSkyVehicle();
    }
  },

  /* ==================== SCENERY ==================== */
  createScenery() {
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 25 + Math.random() * 50;
      this.createTree(Math.cos(a)*d, 0, Math.sin(a)*d);
    }

    this.createHouse(35, 0, -25, this.C.houseRoof, 0);
    this.createHouse(-30, 0, 25, this.C.houseRoofBlue, Math.PI / 3);

    this.createWindmill(-25, 0, -30);
    this.createFlowers();
  },

  createTree(x, y, z) {
    const tree = new THREE.Group();
    const sc = 1 + Math.random() * 0.5;
    const type = Math.floor(Math.random() * 3);
    const tH = 1.5 + Math.random() * 0.5;
    
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.2*sc, .3*sc, tH*sc, 6), new THREE.MeshLambertMaterial({ color: this.C.treeTrunk }));
    trunk.position.y = tH * sc / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    const lc = [this.C.treeLeaf, this.C.treeLeafDark, this.C.treeLeafLight];
    const lM = new THREE.MeshLambertMaterial({ color: lc[Math.floor(Math.random()*lc.length)] });
    
    if (type === 0) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(1.2*sc, 8, 6), lM);
      l.position.y = tH*sc + .8*sc;
      l.castShadow = true;
      tree.add(l);
    } else if (type === 1) {
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(sc, 2.5*sc, 8), lM);
      c1.position.y = tH*sc + sc;
      c1.castShadow = true;
      tree.add(c1);
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(.7*sc, 1.8*sc, 8), lM);
      c2.position.y = tH*sc + 2*sc;
      c2.castShadow = true;
      tree.add(c2);
    } else {
      for (let i = 0; i < 3; i++) {
        const l2 = new THREE.Mesh(new THREE.SphereGeometry(.7*sc, 6, 5), lM);
        l2.position.set((Math.random()-.5)*.8*sc, tH*sc+.5*sc+i*.5*sc, (Math.random()-.5)*.8*sc);
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
    const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(rs, { depth: 3.8, bevelEnabled: false }), rM);
    roof.position.set(0, 3, -1.9);
    roof.castShadow = true;
    h.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(.8, 1.5, .1), new THREE.MeshLambertMaterial({ color: this.C.houseDoor }));
    door.position.set(0, .75, -1.76);
    h.add(door);
    
    // 창문 (isWindow 플래그로 밤에 불 켜짐)
    const winM = new THREE.MeshLambertMaterial({ color: this.C.houseWindow });
    const w1 = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, .1), winM);
    w1.position.set(-1.2, 2, -1.76);
    w1.userData.isWindow = true;
    h.add(w1);
    const w2 = new THREE.Mesh(new THREE.BoxGeometry(.6, .6, .1), winM);
    w2.position.set(1.2, 2, -1.76);
    w2.userData.isWindow = true;
    h.add(w2);

    const chimney = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.5, .5), new THREE.MeshLambertMaterial({ color: 0x7F8C8D }));
    chimney.position.set(1, 4.2, 0);
    h.add(chimney);

    h.position.set(x, y, z);
    h.rotation.y = rot;
    this.houses.push(h);
    this.scene.add(h);
  },

  createWindmill(x, y, z) {
    const g = new THREE.Group();
    
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 6, 8), new THREE.MeshLambertMaterial({ color: this.C.windmillBody }));
    tower.position.y = 3;
    tower.castShadow = true;
    g.add(tower);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.5, 8), new THREE.MeshLambertMaterial({ color: 0xC0392B }));
    roof.position.y = 6.75;
    roof.castShadow = true;
    g.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(.7, 1.3, .1), new THREE.MeshLambertMaterial({ color: this.C.houseDoor }));
    door.position.set(0, .65, -1.5);
    g.add(door);

    this.windmillBlade = new THREE.Group();
    this.windmillBlade.position.set(0, 5.5, -1.2);
    const blM = new THREE.MeshLambertMaterial({ color: this.C.windmillBlade });
    for (let i = 0; i < 4; i++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(.4, 3.5, .1), blM);
      bl.position.y = 1.75;
      const holder = new THREE.Group();
      holder.add(bl);
      holder.rotation.z = (i * Math.PI) / 2;
      this.windmillBlade.add(holder);
    }
    const ax = new THREE.Mesh(new THREE.SphereGeometry(.25, 8, 8), new THREE.MeshLambertMaterial({ color: 0x555555 }));
    this.windmillBlade.add(ax);
    g.add(this.windmillBlade);
    
    g.position.set(x, y, z);
    this.scene.add(g);
  },

  createFlowers() {
    const colors = [0xFF6B9D, 0xFFD93D, 0xFF6B35, 0xC44DFF, 0xFF4757];
    const sM = new THREE.MeshLambertMaterial({ color: 0x2ECC71 });
    for (let i = 0; i < 50; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 15 + Math.random() * 30;
      const f = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .4, 4), sM);
      stem.position.y = .2;
      f.add(stem);
      const petal = new THREE.Mesh(new THREE.SphereGeometry(.12, 6, 4), new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random()*colors.length)] }));
      petal.position.y = .45;
      f.add(petal);
      f.position.set(Math.cos(a)*d, 0, Math.sin(a)*d);
      this.scene.add(f);
    }
  },

  /* ==================== CLOUDS ==================== */
  createClouds() {
    const cM = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, transparent: true, opacity: .9 });
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      const numPuffs = 3 + Math.floor(Math.random() * 4);
      for (let j = 0; j < numPuffs; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 6), cM);
        puff.position.set((Math.random() - .5) * 4, (Math.random() - .5) * 1, (Math.random() - .5) * 3);
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - .5) * 140, 18 + Math.random() * 12, (Math.random() - .5) * 140);
      this.clouds.push({ mesh: cloud, speed: .02 + Math.random() * .03 });
      this.scene.add(cloud);
    }
  },

  /* ==================== SUN / MOON ==================== */
  createCelestialBodies() {
    this.sunGroup = new THREE.Group();
    const sunBody = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 12), new THREE.MeshBasicMaterial({ color: 0xFFD700 }));
    this.sunGroup.add(sunBody);

    const rayM = new THREE.MeshBasicMaterial({ color: 0xFFA500 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const ray = new THREE.Mesh(new THREE.ConeGeometry(0.8, 3, 4), rayM);
      ray.position.set(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0);
      ray.rotation.z = a - Math.PI / 2;
      this.sunGroup.add(ray);
    }

    this.sunPupils = this._createCelestialEyes(this.sunGroup, 1.8, 1.6, 0.9, 0.8);

    const smCurve = new THREE.EllipseCurve(0, 0, 1.8, 1.0, 0, Math.PI, false, 0);
    const smLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(smCurve.getPoints(16)), new THREE.LineBasicMaterial({ color: 0x8B4513 }));
    smLine.position.set(0, -1.8, 5.1);
    this.sunGroup.add(smLine);

    const cheekM = new THREE.MeshBasicMaterial({ color: 0xFF8C69, transparent: true, opacity: 0.5 });
    [-2.8, 2.8].forEach((cx) => {
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), cheekM);
      cheek.position.set(cx, -0.8, 4.8);
      this.sunGroup.add(cheek);
    });

    this.sunGroup.position.set(60, 28, -40);
    this.scene.add(this.sunGroup);

    this.moonGroup = new THREE.Group();
    const moonBody = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xFFF8DC }));
    this.moonGroup.add(moonBody);

    const craterMat = new THREE.MeshBasicMaterial({ color: 0xE8DCC8 });
    [{x:-1.2,y:0.8,z:3.5,r:0.6},{x:1.5,y:-0.5,z:3.4,r:0.5},{x:-0.3,y:-1.5,z:3.6,r:0.4}].forEach((c) => {
      const crater = new THREE.Mesh(new THREE.SphereGeometry(c.r, 6, 4), craterMat);
      crater.position.set(c.x, c.y, c.z);
      this.moonGroup.add(crater);
    });

    this.moonPupils = this._createCelestialEyes(this.moonGroup, 1.2, 0.8, 0.45, 0.3, 0, 3.6);

    this.moonGroup.position.set(-50, 35, -30);
    this.moonGroup.visible = false;
    this.scene.add(this.moonGroup);
  },

  _createCelestialEyes(group, spacing, eyeR, pupilR, yOff, xOff, zBase) {
    const pupils = [];
    const eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const centerX = xOff || 0;
    const bz = (zBase !== undefined) ? zBase : 4.5;

    [-spacing, spacing].forEach((sx) => {
      const px = centerX + sx;
      const eyeBg = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 10, 8), eyeWhite);
      eyeBg.position.set(px, yOff || 0.5, bz);
      group.add(eyeBg);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(pupilR, 8, 6), pupilMat);
      pupil.position.set(px, yOff || 0.5, bz + eyeR * 0.6);
      group.add(pupil);
      pupils.push({ mesh: pupil, cx: px, cy: yOff || 0.5, baseZ: bz, eyeR: eyeR });
    });

    return pupils;
  },

  updateCelestialEyes() {
    const activeGroup = this.isNight ? this.moonGroup : this.sunGroup;
    const activePupils = this.isNight ? this.moonPupils : this.sunPupils;
    if (!activeGroup || !activePupils || activePupils.length === 0) return;

    const worldPos = new THREE.Vector3();
    activeGroup.getWorldPosition(worldPos);
    const screenPos = worldPos.clone().project(this.camera);

    let dx = this.mouseNDC.x - screenPos.x;
    let dy = this.mouseNDC.y - screenPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxD = 2;
    if (dist > maxD) { dx = dx / dist * maxD; dy = dy / dist * maxD; }

    activePupils.forEach((p) => {
      const maxMove = p.eyeR * 0.35;
      p.mesh.position.x = p.cx + (dx / maxD) * maxMove;
      p.mesh.position.y = p.cy + (dy / maxD) * maxMove;
    });
  },

  /* ==================== SMOKE ==================== */
  updateSmoke() {
    if (!this.isPaused && Math.random() > .5) {
      const sM = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: .5 });
      const s = new THREE.Mesh(new THREE.SphereGeometry(.2 + Math.random() * .2, 6, 4), sM);
      const p = new THREE.Vector3(0, 3.5, -1.8);
      this.train.children[0].localToWorld(p);
      s.position.copy(p);
      this.smoke.push({ mesh: s, life: 0, maxLife: 60 + Math.random() * 30, vx: (Math.random()-.5)*.02, vy: .05 + Math.random() * .03, vz: (Math.random()-.5)*.02 });
      this.scene.add(s);
    }
    for (let i = this.smoke.length - 1; i >= 0; i--) {
      const s = this.smoke[i];
      s.life++;
      s.mesh.position.x += s.vx;
      s.mesh.position.y += s.vy;
      s.mesh.position.z += s.vz;
      s.mesh.scale.setScalar(1 + s.life * .03);
      s.mesh.material.opacity = .5 * (1 - s.life / s.maxLife);
      if (s.life >= s.maxLife) {
        this.scene.remove(s.mesh);
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
    
    // 연못
    this.obstacleList.push({ x: -40, z: 30, r: 10 });
  },

  isNearTrack(x, z) {
    // 트랙 근처인지 체크 (완화된 버전 - 3 이내)
    for (const seg of this.trackSegments) {
      for (const pt of seg.points) {
        const dx = x - pt.x;
        const dz = z - pt.z;
        if (dx * dx + dz * dz < 9) return true; // 3 이내
      }
    }
    return false;
  },

  isBlocked(x, z, sheepIdx) {
    // 트랙 근처 체크
    if (this.isNearTrack(x, z)) return true;

    // 정적 장애물
    for (const ob of this.obstacleList) {
      const dx = x - ob.x, dz = z - ob.z;
      if (dx * dx + dz * dz < ob.r * ob.r) return true;
    }

    // 다른 양과의 거리
    for (let j = 0; j < this.sheep.length; j++) {
      if (j === sheepIdx) continue;
      const other = this.sheep[j];
      const dx = x - other.x, dz = z - other.z;
      if (dx * dx + dz * dz < 4) return true;
    }

    // 필드 경계
    if (Math.abs(x) > 60 || Math.abs(z) > 60) return true;

    return false;
  },

  createOneSheep() {
    const g = new THREE.Group();
    const woolMat = new THREE.MeshLambertMaterial({ color: 0xF5F5F0 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x3D3D3D });
    const legMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), woolMat);
    body.scale.set(1.2, 0.9, 0.8);
    body.position.y = 0.9;
    body.castShadow = true;
    g.add(body);

    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), woolMat);
      const a = (i / 6) * Math.PI * 2;
      puff.position.set(Math.cos(a) * 0.6, 0.9 + Math.sin(i * 1.7) * 0.2, Math.sin(a) * 0.45);
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
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), eyeWhiteMat);
      eyeWhite.position.set(1.42, 1.12, side);
      g.add(eyeWhite);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), pupilMat);
      pupil.position.set(1.47, 1.12, side);
      g.add(pupil);
    });

    const legPositions = [
      { x: 0.5, z: -0.25, name: 'FL' },
      { x: 0.5, z: 0.25, name: 'FR' },
      { x: -0.5, z: -0.25, name: 'BL' },
      { x: -0.5, z: 0.25, name: 'BR' }
    ];
    const legs = {};
    legPositions.forEach((lp) => {
      const pivotGroup = new THREE.Group();
      pivotGroup.position.set(lp.x, 0.6, lp.z);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6), legMat);
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
        x = side * (15 + Math.random() * 40);
        z = (Math.random() - 0.5) * 100;
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
        hat: null,
        mirrorBall: null,
        mirrorLight: null
      });
    }
    
    console.log('Sheep created:', this.sheep.length);
  },

  updateSheep(t) {
    const self = this;
    this.sheep.forEach((s, idx) => {
      const legs = s.mesh.userData.legs;

      // 댄스 모드
      if (s.isDancing) {
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
          if (attempts < 30) { s.targetX = nx; s.targetZ = nz; }
          s.nextMoveTime = t + 3 + Math.random() * 4;
        }

        const dx = s.targetX - s.x, dz = s.targetZ - s.z;
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
          if (!self.isBlocked(newX, newZ, idx)) { s.x = newX; s.z = newZ; }
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
          legs.FL.rotation.z = 0; legs.FR.rotation.z = 0;
          legs.BL.rotation.z = 0; legs.BR.rotation.z = 0;
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

        const newX = s.x + Math.cos(s.angle) * s.speed;
        const newZ = s.z + Math.sin(s.angle) * s.speed;

        if (self.isBlocked(newX, newZ, idx)) {
          s.nextMoveTime = t + 0.5;
          s.isWalking = false;
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

      // 모자
      const hatGroup = new THREE.Group();
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.3, 8), new THREE.MeshLambertMaterial({ color: 0x111111 }));
      crown.position.y = 0.15;
      hatGroup.add(crown);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.04, 12), new THREE.MeshLambertMaterial({ color: 0x111111 }));
      hatGroup.add(brim);
      hatGroup.position.set(1.1, 1.5, 0);
      hatGroup.rotation.z = -0.15;
      s.mesh.add(hatGroup);
      s.hat = hatGroup;

      // 미러볼
      const mirrorBallGroup = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.6, 32, 24), new THREE.MeshPhongMaterial({ color: 0xd0d0d0, specular: 0xffffff, shininess: 300 }));
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
      if (s.hat) { s.mesh.remove(s.hat); s.hat = null; }
      if (s.mirrorBall) { s.mesh.remove(s.mirrorBall); s.mirrorBall = null; }
      if (s.mirrorLight) { s.mesh.remove(s.mirrorLight); s.mirrorLight = null; }
    }
  },

  /* ==================== CAMERA ==================== */
  updateCameraPosition() {
    const smoothing = 0.05;
    this.camTheta += (this.targetTheta - this.camTheta) * smoothing;
    this.camPhi += (this.targetPhi - this.camPhi) * smoothing;
    this.camRadius += (this.targetRadius - this.camRadius) * smoothing;
    this.panX += (this.targetPanX - this.panX) * smoothing;
    this.panZ += (this.targetPanZ - this.panZ) * smoothing;

    const x = this.camRadius * Math.sin(this.camPhi) * Math.cos(this.camTheta) + this.panX;
    const y = this.camRadius * Math.cos(this.camPhi);
    const z = this.camRadius * Math.sin(this.camPhi) * Math.sin(this.camTheta) + this.panZ;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.panX, 1, this.panZ);
  },

  /* ==================== HORN ==================== */
  isGlobalMuted() {
    const muteBtn = document.getElementById('mute-btn');
    return muteBtn ? !muteBtn.classList.contains('unmuted') : false;
  },

  playHorn() {
    if (!this.hornEnabled || this.hornCooldown || this.isGlobalMuted()) return;
    this.hornCooldown = true;
    setTimeout(() => { this.hornCooldown = false; }, 3000);

    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      [277, 349, 440].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
      });
    } catch(e) {}
  },

  /* ==================== TRAIN MOVEMENT ==================== */
  positionTrainOnTrack() {
    if (!this.train || this.trackSegments.length === 0) return;

    const totalLength = this.getTotalTrackLength();
    const carSpacing = 4.5;

    this.train.children.forEach((car, i) => {
      const carDistance = this.trainDistance - i * carSpacing;
      const clampedDist = Math.max(0.5, Math.min(totalLength - 0.5, carDistance));
      
      const pt = this.getTrackPointByDistance(clampedDist);
      car.position.set(pt.x, 0, pt.z);
      
      if (this.trainDirection === 1) {
        car.rotation.y = -pt.angle - Math.PI / 2;
      } else {
        car.rotation.y = -pt.angle + Math.PI / 2;
      }
    });
  },

  updateTrain() {
    if (this.isPaused || this.trackSegments.length === 0) {
      this.positionTrainOnTrack();
      return;
    }
    
    const totalLength = this.getTotalTrackLength();
    this.trainDistance += this.trainSpeed * this.trainDirection;

    const margin = 2;
    if (this.trainDistance >= totalLength - margin) {
      this.trainDistance = totalLength - margin;
      this.trainDirection = -1;
      this.playHorn();
    } else if (this.trainDistance <= margin) {
      this.trainDistance = margin;
      this.trainDirection = 1;
      this.playHorn();
    }

    this.trainWheels.forEach((w) => { w.rotation.x += 0.1 * this.trainDirection; });
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
      this.ambientLight.intensity = .2;
      this.hemiLight.intensity = .2;
      this.dirLight.intensity = .3;
      this.dirLight.color.set(0x8888ff);
      this.dirLight.position.set(-50, 35, -30);
      
      // 집과 역 창문에 불 켜기 - 강화된 버전
      this.houses.forEach((h) => {
        h.traverse((c) => {
          if (c.userData && c.userData.isWindow && c.material) {
            // 밝은 노란색으로 변경 + emissive 강화
            c.material.color.setHex(0xFFE066);
            c.material.emissive = new THREE.Color(0xFFAA00);
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
      this.ambientLight.intensity = .5;
      this.hemiLight.intensity = .6;
      this.dirLight.intensity = .8;
      this.dirLight.color.set(0xffffff);
      this.dirLight.position.set(60, 28, -40);
      
      // 창문 불 끄기
      this.houses.forEach((h) => {
        h.traverse((c) => {
          if (c.userData && c.userData.isWindow && c.material) {
            c.material.color.setHex(self.C.houseWindow);
            c.material.emissive = new THREE.Color(0x000000);
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
      if (el) el.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return el;
    };

    _btn('c4-rotate-btn', () => {
      this.camAngleIndex = (this.camAngleIndex + 1) % 6;
      this.targetTheta = -Math.PI / 2 + this.camAngleIndex * (Math.PI / 3);
    });

    const dnBtn = _btn('c4-daynight-btn', () => {
      this.toggleDayNight();
      if (dnBtn) dnBtn.textContent = this.isNight ? '🌙' : '☀️';
    });

    const plBtn = _btn('c4-play-btn', () => {
      this.isPaused = !this.isPaused;
      if (plBtn) plBtn.textContent = this.isPaused ? '▶️' : '⏸️';
    });

    const spBtn = _btn('c4-speed-btn', () => {
      if (this.trainSpeed < 0.025) { 
        this.trainSpeed = 0.03; 
        if (spBtn) spBtn.textContent = '🐇'; 
      } else { 
        this.trainSpeed = 0.015; 
        if (spBtn) spBtn.textContent = '🐢'; 
      }
    });

    _btn('c4-add-wagon', () => { this.addWagon(); });
    _btn('c4-remove-wagon', () => { this.removeWagon(); });
    _btn('c4-add-straight', () => { this.addTrackSegment('straight'); });
    _btn('c4-add-left', () => { this.addTrackSegment('left'); });
    _btn('c4-add-right', () => { this.addTrackSegment('right'); });
    _btn('c4-remove-track', () => { this.removeLastTrackSegment(); });

    const hornBtn = _btn('c4-horn-btn', () => {
      this.hornEnabled = !this.hornEnabled;
      if (hornBtn) hornBtn.textContent = this.hornEnabled ? '🔔' : '🔕';
    });

    // 마우스 + 드래그 + 양 클릭
    let dragging = false, dragBtn = -1, ds = {x:0, y:0};
    this.sheepRaycaster = new THREE.Raycaster();
    this.sheepMouse = new THREE.Vector2();

    this.container.addEventListener('mousedown', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      dragging = true;
      dragBtn = e.button;
      ds = {x: e.clientX, y: e.clientY};
    });

    window.addEventListener('mousemove', (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!dragging || !this.card.classList.contains('fullscreen')) return;
      const ddx = e.clientX - ds.x, ddy = e.clientY - ds.y;
      if (dragBtn === 0) {
        const panSpeed = this.camRadius * 0.008;
        this.targetPanX -= (ddx * Math.cos(this.camTheta) + ddy * Math.sin(this.camTheta) * Math.cos(this.camPhi)) * panSpeed * 0.01;
        this.targetPanZ += (ddx * Math.sin(this.camTheta) - ddy * Math.cos(this.camTheta) * Math.cos(this.camPhi)) * panSpeed * 0.01;
        this.targetPanX = Math.max(-60, Math.min(60, this.targetPanX));
        this.targetPanZ = Math.max(-60, Math.min(60, this.targetPanZ));
      } else if (dragBtn === 2) {
        this.targetTheta -= ddx * .005;
        this.targetPhi = Math.max(.3, Math.min(Math.PI/2.2, this.targetPhi + ddy * .003));
      }
      ds = {x: e.clientX, y: e.clientY};
    });

    window.addEventListener('mouseup', () => { dragging = false; dragBtn = -1; });

    // 양 클릭
    this.container.addEventListener('click', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      
      const rect = this.container.getBoundingClientRect();
      this.sheepMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.sheepMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.sheepRaycaster.setFromCamera(this.sheepMouse, this.camera);

      const sheepMeshes = [];
      this.sheep.forEach((s) => {
        s.mesh.traverse((c) => { if (c.isMesh) sheepMeshes.push(c); });
      });
      
      const hits = this.sheepRaycaster.intersectObjects(sheepMeshes);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        for (let si = 0; si < this.sheep.length; si++) {
          let found = false;
          this.sheep[si].mesh.traverse((c) => { if (c === hitObj) found = true; });
          if (found) { this.toggleSheepDance(si); break; }
        }
      }
    });

    this.container.addEventListener('wheel', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      e.preventDefault();
      e.stopPropagation();
      this.targetRadius = Math.max(30, Math.min(120, this.targetRadius + e.deltaY * .05));
    }, { passive: false });

    // Touch
    let ts = null, td = 0;
    this.container.addEventListener('touchstart', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      if (e.touches.length === 1) ts = {x: e.touches[0].clientX, y: e.touches[0].clientY};
      else if (e.touches.length === 2) td = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }, { passive: true });

    this.container.addEventListener('touchmove', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      if (e.touches.length === 1 && ts) {
        const ddx = e.touches[0].clientX - ts.x, ddy = e.touches[0].clientY - ts.y;
        const panSpeed = this.camRadius * 0.012;
        this.targetPanX -= (ddx * Math.cos(this.camTheta) + ddy * Math.sin(this.camTheta) * Math.cos(this.camPhi)) * panSpeed * 0.01;
        this.targetPanZ += (ddx * Math.sin(this.camTheta) - ddy * Math.cos(this.camTheta) * Math.cos(this.camPhi)) * panSpeed * 0.01;
        this.targetPanX = Math.max(-60, Math.min(60, this.targetPanX));
        this.targetPanZ = Math.max(-60, Math.min(60, this.targetPanZ));
        ts = {x: e.touches[0].clientX, y: e.touches[0].clientY};
      } else if (e.touches.length === 2) {
        const nd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.targetRadius = Math.max(30, Math.min(120, this.targetRadius - (nd - td) * .1));
        td = nd;
      }
    }, { passive: true });

    window.addEventListener('resize', () => { if (this.isInitialized) this.handleResize(); });
    this.container.addEventListener('contextmenu', (e) => { e.preventDefault(); });
  },

  activate() { this.isActive = true; },
  deactivate() { this.isActive = false; },

  handleResize() {
    if (!this.renderer || !this.container) return;
    const r = this.container.getBoundingClientRect();
    const w = Math.round(r.width) || 1, h = Math.round(r.height) || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  },

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    
    if (!this.isActive) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    
    const t = this.clock.getElapsedTime();

    this.updateTrain();
    this.updateCameraPosition();
    this.updateSmoke();
    this.updateSkyVehicle(t);
    this.updateSheep(t);

    this.clouds.forEach((c) => { 
      c.mesh.position.x += c.speed; 
      if (c.mesh.position.x > 80) c.mesh.position.x = -80; 
    });
    
    if (this.windmillBlade) this.windmillBlade.rotation.z += .02;
    if (this.waterMesh) this.waterMesh.material.opacity = .6 + Math.sin(t * 2) * .1;
    this.trees.forEach((tr, i) => { tr.rotation.z = Math.sin(t * .5 + i * .3) * .02; });

    if (this.sunGroup && this.sunGroup.visible) {
      this.sunGroup.quaternion.copy(this.camera.quaternion);
    }
    if (this.moonGroup && this.moonGroup.visible) {
      this.moonGroup.quaternion.copy(this.camera.quaternion);
    }

    this.updateCelestialEyes();
    this.renderer.render(this.scene, this.camera);
  },
};
