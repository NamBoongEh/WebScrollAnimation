/**
 * ========================================
 * card4.js - Choo-Choo World 나무 기차 월드
 * ========================================
 * 수정: 타원형 트랙, 칸 추가/제거, 하늘 비행체
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
  sheep: [],
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

  // Horn
  hornEnabled: true,
  hornCooldown: false,
  audioCtx: null,

  // Lights
  hemiLight: null, dirLight: null, ambientLight: null,

  // State
  isInitialized: false,
  isNight: false,
  trainSpeed: 0.0012,
  trainT: 0,
  camTheta: -Math.PI / 2,
  camPhi: Math.PI / 3.2,
  camRadius: 75,
  targetTheta: -Math.PI / 2,
  targetPhi: Math.PI / 3.2,
  targetRadius: 75,
  camAngleIndex: 0,
  panX: 0, panZ: 0,
  targetPanX: 0, targetPanZ: 0,
  isPaused: false,
  isMobile: false,
  sheepRaycaster: null,
  sheepMouse: null,

  // Oval Track
  STRAIGHT_LEN: 22,
  CURVE_RADIUS: 14,
  TRACK_WIDTH: 3.5,
  MAX_WAGONS: 8,

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
      setTimeout(() => this.handleResize(), 100);
      setTimeout(() => this.handleResize(), 300);
      setTimeout(() => this.handleResize(), 600);
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
    this.createTrack();
    this.createTrain();
    this.createScenery();
    this.createClouds();
    this.createCelestialBodies();
    this.spawnSkyVehicle();
    this.createSheep();
    this.updateCameraPosition();
    this.bindEvents();
    this.handleResize();
    this.animate();
  },

  /* ==========================
     OVAL TRACK PATH
     ========================== */
  getPerimeter() {
    return 2 * this.STRAIGHT_LEN + 2 * Math.PI * this.CURVE_RADIUS;
  },

  getTrackPoint(t) {
    t = ((t % 1) + 1) % 1;
    const L = this.STRAIGHT_LEN;
    const R = this.CURVE_RADIUS;
    const P = this.getPerimeter();
    const halfL = L / 2;

    const seg1 = L / P;
    const seg2 = (Math.PI * R) / P;
    const seg3 = L / P;

    var x, z, angle;

    if (t < seg1) {
      var f = t / seg1;
      x = -halfL + f * L;
      z = -R;
      angle = 0;
    } else if (t < seg1 + seg2) {
      var f = (t - seg1) / seg2;
      var a = -Math.PI / 2 + f * Math.PI;
      x = halfL + R * Math.cos(a);
      z = R * Math.sin(a);
      angle = a + Math.PI / 2;
    } else if (t < seg1 + seg2 + seg3) {
      var f = (t - seg1 - seg2) / seg3;
      x = halfL - f * L;
      z = R;
      angle = Math.PI;
    } else {
      var f = (t - seg1 - seg2 - seg3) / (1 - seg1 - seg2 - seg3);
      var a = Math.PI / 2 + f * Math.PI;
      x = -halfL + R * Math.cos(a);
      z = R * Math.sin(a);
      angle = a + Math.PI / 2;
    }

    return { x: x, z: z, angle: angle };
  },

  /* ==================== LIGHTS ==================== */
  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);
    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x7EC850, 0.6);
    this.scene.add(this.hemiLight);
    // 태양 위치(60, 28, -40)와 일치시켜 자연스러운 그림자
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(60, 28, -40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    this.dirLight.shadow.bias = -0.001;
    this.dirLight.shadow.normalBias = 0.02;
    var sc = this.dirLight.shadow.camera;
    sc.near = 0.5; sc.far = 250; sc.left = sc.bottom = -90; sc.right = sc.top = 90;
    // 그림자 타겟을 씬 중앙으로
    this.dirLight.target.position.set(0, 0, 0);
    this.scene.add(this.dirLight.target);
    this.scene.add(this.dirLight);
  },

  /* ==================== GROUND ==================== */
  createGround() {
    var gGeo = new THREE.CircleGeometry(140, 64);
    var gMat = new THREE.MeshLambertMaterial({ color: this.C.groundDay });
    this.groundMesh = new THREE.Mesh(gGeo, gMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // 트랙 아래 진한 잔디 — 타원형 shape
    var shape = new THREE.Shape();
    var halfL = this.STRAIGHT_LEN / 2;
    var outerR = this.CURVE_RADIUS + this.TRACK_WIDTH / 2 + 2;
    shape.moveTo(-halfL, -outerR);
    shape.lineTo(halfL, -outerR);
    shape.absarc(halfL, 0, outerR, -Math.PI / 2, Math.PI / 2, false);
    shape.lineTo(-halfL, outerR);
    shape.absarc(-halfL, 0, outerR, Math.PI / 2, 3 * Math.PI / 2, false);

    var innerR = this.CURVE_RADIUS - this.TRACK_WIDTH / 2 - 2;
    var hole = new THREE.Path();
    hole.moveTo(-halfL, -innerR);
    hole.lineTo(halfL, -innerR);
    hole.absarc(halfL, 0, innerR, -Math.PI / 2, Math.PI / 2, false);
    hole.lineTo(-halfL, innerR);
    hole.absarc(-halfL, 0, innerR, Math.PI / 2, 3 * Math.PI / 2, false);
    shape.holes.push(hole);

    var ringGeo = new THREE.ShapeGeometry(shape);
    var ring = new THREE.Mesh(ringGeo, new THREE.MeshLambertMaterial({ color: this.C.groundDark }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    this.scene.add(ring);

    // 돌길
    var stGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 6);
    var stMat = new THREE.MeshLambertMaterial({ color: this.C.stoneGray });
    for (var i = 0; i < 40; i++) {
      var a = (i / 40) * Math.PI * 2;
      var r = 6 + Math.random() * 5;
      var s = new THREE.Mesh(stGeo, stMat);
      s.position.set(Math.cos(a) * r + (Math.random() - 0.5), 0.05, Math.sin(a) * r + (Math.random() - 0.5));
      s.scale.setScalar(0.5 + Math.random() * 0.8);
      this.scene.add(s);
    }
  },

  /* ==================== WATER ==================== */
  createWater() {
    var shape = new THREE.Shape();
    shape.moveTo(-8, -5);
    shape.bezierCurveTo(-6, -8, 2, -9, 6, -6);
    shape.bezierCurveTo(10, -3, 8, 2, 4, 3);
    shape.bezierCurveTo(0, 4, -6, 2, -8, -1);
    shape.closePath();
    var mat = new THREE.MeshLambertMaterial({ color: this.C.waterDay, transparent: true, opacity: 0.7 });
    this.waterMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(-40, 0.08, 30);
    this.scene.add(this.waterMesh);

    // 다리
    var bg = new THREE.Group();
    var wm = new THREE.MeshLambertMaterial({ color: this.C.trackWood });
    for (var i = 0; i < 5; i++) {
      var p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 3), wm);
      p.position.set(i * 0.7 - 1.4, 0.5, 0); bg.add(p);
    }
    var rm = new THREE.MeshLambertMaterial({ color: this.C.fenceWood });
    [-1, 1].forEach(function(side) {
      [-1.4, 1.4].forEach(function(px) {
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1), rm);
        post.position.set(px, 1, side * 1.3); bg.add(post);
      });
      var rail = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 0.08), rm);
      rail.position.set(0, 1.3, side * 1.3); bg.add(rail);
    });
    bg.position.set(-37, 0, 27); bg.rotation.y = Math.PI / 4;
    this.scene.add(bg);
  },

  /* ==================== OVAL TRACK ==================== */
  createTrack() {
    var tg = new THREE.Group();
    var woodMat = new THREE.MeshLambertMaterial({ color: this.C.trackWood });
    var railMat = new THREE.MeshLambertMaterial({ color: this.C.trackRail });

    // 침목
    var sleeperCount = 140;
    for (var i = 0; i < sleeperCount; i++) {
      var t = i / sleeperCount;
      var pt = this.getTrackPoint(t);
      var sl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, this.TRACK_WIDTH + 1), woodMat);
      sl.position.set(pt.x, 0.12, pt.z);
      sl.rotation.y = -pt.angle;
      sl.receiveShadow = true;
      tg.add(sl);
    }

    // 레일 — CatmullRom 커브 + TubeGeometry
    var railOffset = this.TRACK_WIDTH / 2;
    var self = this;
    [-1, 1].forEach(function(side) {
      var pts = [];
      var samples = 200;
      for (var i = 0; i <= samples; i++) {
        var t = i / samples;
        var pt = self.getTrackPoint(t);
        var nx = -Math.sin(pt.angle);
        var nz = Math.cos(pt.angle);
        pts.push(new THREE.Vector3(
          pt.x + nx * side * railOffset,
          0.25,
          pt.z + nz * side * railOffset
        ));
      }
      var curve = new THREE.CatmullRomCurve3(pts, true);
      var tubeGeo = new THREE.TubeGeometry(curve, 200, 0.12, 6, true);
      var rail = new THREE.Mesh(tubeGeo, railMat);
      tg.add(rail);
    });

    this.scene.add(tg);
    this.createStation();
  },

  createStation() {
    var st = new THREE.Group();
    var wallM = new THREE.MeshLambertMaterial({ color: this.C.houseWall });
    var roofM = new THREE.MeshLambertMaterial({ color: this.C.houseRoof });

    // 플랫폼
    var plat = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 5), new THREE.MeshLambertMaterial({ color: 0xBDBDBD }));
    plat.position.y = 0.2; plat.receiveShadow = true; plat.castShadow = true;
    st.add(plat);

    // 건물
    var bld = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 3.5), wallM);
    bld.position.set(0, 1.9, 0); bld.castShadow = true;
    st.add(bld);

    // 박공 지붕 — ExtrudeGeometry 삼각 프리즘
    var roofShape = new THREE.Shape();
    roofShape.moveTo(-3.3, 0);
    roofShape.lineTo(0, 1.8);
    roofShape.lineTo(3.3, 0);
    roofShape.closePath();
    var roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: 4, bevelEnabled: false });
    var roof = new THREE.Mesh(roofGeo, roofM);
    roof.position.set(0, 3.4, -2);
    roof.castShadow = true;
    st.add(roof);

    // 문/창문
    st.add(this._box(0.8, 1.5, 0.1, this.C.houseDoor, 0, 1.15, -1.76));
    var wM = new THREE.MeshLambertMaterial({ color: this.C.houseWindow });
    st.add(this._box(0.7, 0.7, 0.1, null, -1.5, 2.2, -1.76, wM));
    st.add(this._box(0.7, 0.7, 0.1, null, 1.5, 2.2, -1.76, wM));

    // 표지판
    st.add(this._box(3, 0.6, 0.1, 0x2C3E50, 0, 3.0, -1.76));

    // 기둥 + 캐노피
    var pM = new THREE.MeshLambertMaterial({ color: 0xECF0F1 });
    [[-4,1.6,-2],[4,1.6,-2],[-4,1.6,2],[4,1.6,2]].forEach(function(pos) {
      var p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2), pM);
      p.position.set(pos[0], pos[1], pos[2]); st.add(p);
    });
    var cn = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 5), new THREE.MeshLambertMaterial({ color: 0xD35400 }));
    cn.position.set(0, 3.3, 0); st.add(cn);

    // 역 위치 — 트랙 오른쪽 커브 바깥
    var halfL = this.STRAIGHT_LEN / 2;
    st.position.set(halfL + this.CURVE_RADIUS + 5, 0, 0);
    st.rotation.y = Math.PI / 2;
    this.scene.add(st);
  },

  _box(w, h, d, color, x, y, z, mat) {
    var m = mat || new THREE.MeshLambertMaterial({ color: color });
    var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    if (x !== undefined) mesh.position.set(x, y, z);
    return mesh;
  },

  /* ==================== TRAIN ==================== */
  createTrain() {
    this.train = new THREE.Group();
    this.trainWheels = [];
    this._wagonColorIdx = 0;

    var loco = this.createLocomotive();
    this.train.add(loco);

    for (var i = 0; i < 3; i++) this.addWagon();

    this.scene.add(this.train);
  },

  addWagon() {
    if (this.wagonList.length >= this.MAX_WAGONS) return;
    var color = this._wagonColors[this._wagonColorIdx % this._wagonColors.length];
    this._wagonColorIdx++;
    var w = this.createWagon(color);
    this.wagonList.push(w);
    this.train.add(w);
    this.updateWagonCounter();
  },

  removeWagon() {
    if (this.wagonList.length === 0) return;
    var w = this.wagonList.pop();
    this.train.remove(w);
    var self = this;
    w.traverse(function(child) {
      var idx = self.trainWheels.indexOf(child);
      if (idx !== -1) self.trainWheels.splice(idx, 1);
    });
    this.updateWagonCounter();
  },

  updateWagonCounter() {
    var el = document.getElementById('c4-wagon-count');
    if (el) el.textContent = this.wagonList.length;
  },

  createLocomotive() {
    var g = new THREE.Group();
    var bM = new THREE.MeshLambertMaterial({ color: this.C.trainBody });
    var chM = new THREE.MeshLambertMaterial({ color: this.C.trainChimney });

    var body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 3.5), bM);
    body.position.y = 1.2; body.castShadow = true; g.add(body);

    var boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2, 12), bM);
    boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 1.4, -1.5); boiler.castShadow = true;
    g.add(boiler);

    g.add(this._box(2.4, 0.2, 2, this.C.trainRoof, 0, 2.1, 0.5));

    var ch = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.2, 8), chM);
    ch.position.set(0, 2.4, -1.8); ch.castShadow = true; g.add(ch);
    var chTop = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 0.3, 8), chM);
    chTop.position.set(0, 3.1, -1.8); g.add(chTop);

    // 얼굴
    var eyeG = new THREE.SphereGeometry(0.18, 8, 8);
    var eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var pupG = new THREE.SphereGeometry(0.1, 8, 8);
    var pupM = new THREE.MeshBasicMaterial({ color: 0x000000 });
    [-0.4, 0.4].forEach(function(sx) {
      var eye = new THREE.Mesh(eyeG, eyeM);
      eye.position.set(sx, 1.6, -2.55); g.add(eye);
      var pup = new THREE.Mesh(pupG, pupM);
      pup.position.set(sx, 1.6, -2.7); g.add(pup);
    });
    var smC = new THREE.EllipseCurve(0, 0, 0.3, 0.15, 0, Math.PI, false, 0);
    var sm = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(smC.getPoints(12)),
      new THREE.LineBasicMaterial({ color: 0x000000 })
    );
    sm.position.set(0, 1.15, -2.56); g.add(sm);

    var winM = new THREE.MeshLambertMaterial({ color: this.C.trainWindow });
    [-1, 1].forEach(function(s) {
      var w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.8), winM);
      w.position.set(s * 1.12, 1.6, 0.5); g.add(w);
    });

    this.addWheels(g, [[-1,.35,-1.5],[1,.35,-1.5],[-1,.35,0],[1,.35,0],[-1,.35,1.2],[1,.35,1.2]]);

    var cp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.6), new THREE.MeshLambertMaterial({ color: 0x555555 }));
    cp.position.set(0, 0.5, 2); g.add(cp);
    return g;
  },

  createWagon(color) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 3), new THREE.MeshLambertMaterial({ color: color }));
    body.position.y = 1.0; body.castShadow = true; g.add(body);

    this.addWheels(g, [[-0.8,.3,-1],[0.8,.3,-1],[-0.8,.3,1],[0.8,.3,1]]);

    var cpM = new THREE.MeshLambertMaterial({ color: 0x555555 });
    var cpF = new THREE.Mesh(new THREE.BoxGeometry(.25,.25,.5), cpM);
    cpF.position.set(0,.5,-1.7); g.add(cpF);
    var cpB = new THREE.Mesh(new THREE.BoxGeometry(.25,.25,.5), cpM);
    cpB.position.set(0,.5,1.7); g.add(cpB);

    var cc = [0xD5A76A, 0xC0392B, 0x2ECC71, 0xF1C40F];
    for (var i = 0; i < 2; i++) {
      var c = new THREE.Mesh(
        new THREE.BoxGeometry(.6+Math.random()*.4, .5+Math.random()*.3, .6+Math.random()*.4),
        new THREE.MeshLambertMaterial({ color: cc[Math.floor(Math.random()*cc.length)] })
      );
      c.position.set((Math.random()-.5)*.8, 1.8+i*.4, (Math.random()-.5)*1.2);
      c.rotation.y = Math.random()*.3; g.add(c);
    }
    return g;
  },

  addWheels(group, positions) {
    var wG = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 12);
    var wM = new THREE.MeshLambertMaterial({ color: 0x333333 });
    var self = this;
    positions.forEach(function(pos) {
      var w = new THREE.Mesh(wG, wM);
      w.rotation.z = Math.PI / 2; w.position.set(pos[0], pos[1], pos[2]);
      group.add(w); self.trainWheels.push(w);
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

    // 단방향 직선 비행: 랜덤 방향 + 시작점 설정
    var dir = Math.random() * Math.PI * 2;
    var spawnDist = 100;
    var height = this.skyVehicleType === 'plane'
      ? 28 + Math.random() * 8
      : 22 + Math.random() * 6;

    this.skyVehicle.position.set(
      Math.cos(dir) * spawnDist,
      height,
      Math.sin(dir) * spawnDist
    );

    // 비행 방향 (반대쪽으로)
    this.skyVehicle.userData.dir = dir + Math.PI + (Math.random() - 0.5) * 0.6;
    this.skyVehicle.userData.speed = this.skyVehicleType === 'plane' ? 0.35 : 0.12;
    this.skyVehicle.userData.height = height;

    // 비행기: 프로펠러(-Z)가 진행방향을 향하도록 회전
    var d = this.skyVehicle.userData.dir;
    this.skyVehicle.rotation.y = Math.atan2(-Math.cos(d), -Math.sin(d));

    this.scene.add(this.skyVehicle);
  },

  createAirplane() {
    var g = new THREE.Group();
    var bodyM = new THREE.MeshLambertMaterial({ color: 0xECF0F1 });
    var wingM = new THREE.MeshLambertMaterial({ color: 0x3498DB });
    var tailM = new THREE.MeshLambertMaterial({ color: 0xE74C3C });

    // 동체 — Z축 방향으로 눕힘 (진행방향 = +Z)
    var fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.3, 4, 8), bodyM);
    fuselage.rotation.x = Math.PI / 2;
    g.add(fuselage);

    // 날개 — 수평 (X축 양쪽으로)
    var wing = new THREE.Mesh(new THREE.BoxGeometry(5, 0.15, 1.2), wingM);
    g.add(wing);

    // 꼬리날개 (수직)
    var vtail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.8), tailM);
    vtail.position.set(0, 0.6, 2); g.add(vtail);

    // 꼬리날개 (수평)
    var htail = new THREE.Mesh(new THREE.BoxGeometry(2, 0.1, 0.5), wingM);
    htail.position.set(0, 0, 2); g.add(htail);

    // 프로펠러
    var propHub = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshLambertMaterial({ color: 0x333333 }));
    propHub.position.set(0, 0, -2.1); g.add(propHub);

    var propBlade = new THREE.Group();
    var bladeM = new THREE.MeshLambertMaterial({ color: 0x666666 });
    for (var i = 0; i < 3; i++) {
      var bl = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.15), bladeM);
      bl.position.x = 0.6;
      var holder = new THREE.Group();
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
    var g = new THREE.Group();
    var colors = [0xE74C3C, 0xF39C12, 0x9B59B6, 0x1ABC9C, 0x3498DB];
    var balloonColor = colors[Math.floor(Math.random() * colors.length)];

    // 풍선체 — 가로가 더 넓은 타원 (위로 올림)
    var envelope = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 12, 10),
      new THREE.MeshLambertMaterial({ color: balloonColor })
    );
    envelope.scale.set(1.6, 1.3, 1.6);
    envelope.position.y = 5;
    g.add(envelope);

    // 풍선 하단 마감 (스커트)
    var skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 0.6, 0.8, 8),
      new THREE.MeshLambertMaterial({ color: balloonColor })
    );
    skirt.position.y = 5 - 2.5 * 1.3 + 0.2;
    g.add(skirt);

    // 불꽃 (스커트 아래) — 여러 겹의 불꽃 표현
    var fireGroup = new THREE.Group();
    var fireY = 5 - 2.5 * 1.3 - 0.2;
    // 외부 불꽃 (주황)
    var outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.2, 6),
      new THREE.MeshBasicMaterial({ color: 0xFF6600, transparent: true, opacity: 0.9 })
    );
    outerFlame.position.y = fireY;
    fireGroup.add(outerFlame);
    // 내부 불꽃 (노랑)
    var innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.8, 6),
      new THREE.MeshBasicMaterial({ color: 0xFFDD00, transparent: true, opacity: 0.95 })
    );
    innerFlame.position.y = fireY + 0.05;
    fireGroup.add(innerFlame);
    // 핵심 불꽃 (흰색)
    var coreFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.5, 4),
      new THREE.MeshBasicMaterial({ color: 0xFFFFCC })
    );
    coreFlame.position.y = fireY + 0.1;
    fireGroup.add(coreFlame);
    // 포인트라이트 (불빛 효과)
    var fireLight = new THREE.PointLight(0xFF6600, 0.8, 8);
    fireLight.position.y = fireY;
    fireGroup.add(fireLight);
    g.add(fireGroup);
    g.userData.fireGroup = fireGroup;
    g.userData.fireY = fireY;

    // 로프 4개 — 풍선 하단에서 바구니 꼭짓점으로
    var ropeMat = new THREE.LineBasicMaterial({ color: 0x8B7355, linewidth: 2 });
    var envelopeBottom = 5 - 2.5 * 1.3;
    var basketTop = -0.2;
    var corners = [[-0.9, -0.9], [-0.9, 0.9], [0.9, -0.9], [0.9, 0.9]];
    corners.forEach(function(c) {
      var pts = [];
      var steps = 8;
      for (var i = 0; i <= steps; i++) {
        var f = i / steps;
        var y = envelopeBottom + (basketTop - envelopeBottom) * f;
        var spread = Math.sin(f * Math.PI) * 0.3;
        pts.push(new THREE.Vector3(
          c[0] * (0.8 + spread * 0.5 + f * 0.6),
          y,
          c[1] * (0.8 + spread * 0.5 + f * 0.6)
        ));
      }
      var curve = new THREE.CatmullRomCurve3(pts);
      var ropeGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16));
      g.add(new THREE.Line(ropeGeo, ropeMat));
    });

    // 바구니 — 크게
    var basketMat = new THREE.MeshLambertMaterial({ color: 0xC4944A });
    var basket = new THREE.Mesh(
      new THREE.CylinderGeometry(1.5, 1.2, 1.6, 10),
      basketMat
    );
    basket.position.y = -1.0;
    basket.castShadow = true;
    g.add(basket);

    // 바구니 테두리
    var rim = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.1, 6, 10),
      new THREE.MeshLambertMaterial({ color: 0xA0784A })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.2;
    g.add(rim);

    // 바구니 바닥 테두리
    var rimBottom = new THREE.Mesh(
      new THREE.TorusGeometry(1.2, 0.08, 6, 10),
      new THREE.MeshLambertMaterial({ color: 0xA0784A })
    );
    rimBottom.rotation.x = Math.PI / 2;
    rimBottom.position.y = -1.8;
    g.add(rimBottom);

    // 바구니 세로줄 (짜임 표현)
    var weaveM = new THREE.LineBasicMaterial({ color: 0x9A7B4F });
    for (var wi = 0; wi < 8; wi++) {
      var wa = (wi / 8) * Math.PI * 2;
      var wPts = [];
      for (var wj = 0; wj <= 6; wj++) {
        var wf = wj / 6;
        var wy = -0.2 + (-1.6) * wf;
        var wr = 1.5 + (1.2 - 1.5) * wf;
        wPts.push(new THREE.Vector3(Math.cos(wa) * wr, wy, Math.sin(wa) * wr));
      }
      var wLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(wPts), weaveM
      );
      g.add(wLine);
    }

    g.scale.setScalar(1.2);
    return g;
  },

  updateSkyVehicle(t) {
    if (!this.skyVehicle) return;

    var ud = this.skyVehicle.userData;
    var speed = ud.speed;

    // 직선 이동
    this.skyVehicle.position.x += Math.cos(ud.dir) * speed;
    this.skyVehicle.position.z += Math.sin(ud.dir) * speed;

    // 비행기 프로펠러 회전
    if (this.skyVehicleType === 'plane' && ud.propeller) {
      ud.propeller.rotation.z += 0.5;
    }

    // 열기구 약간 흔들림 + 불꽃 애니메이션
    if (this.skyVehicleType === 'balloon') {
      this.skyVehicle.position.y = ud.height + Math.sin(t * 0.4) * 1.5;
      // 불꽃 깜빡임
      if (this.skyVehicle.userData.fireGroup) {
        var fg = this.skyVehicle.userData.fireGroup;
        fg.children.forEach(function(c, i) {
          if (c.isMesh) {
            var flicker = 0.85 + Math.sin(t * 12 + i * 2.5) * 0.15;
            c.scale.set(flicker, 0.8 + Math.sin(t * 15 + i) * 0.2, flicker);
          }
          if (c.isLight) {
            c.intensity = 0.6 + Math.sin(t * 10) * 0.3;
          }
        });
      }
    }

    // 중심에서 너무 멀어지면 제거 후 새로 생성
    var dx = this.skyVehicle.position.x;
    var dz = this.skyVehicle.position.z;
    if (dx * dx + dz * dz > 130 * 130) {
      this.spawnSkyVehicle();
    }
  },

  /* ==================== SCENERY ==================== */
  createScenery() {
    var self = this;

    // 바깥 나무
    [[42,5],[45,-10],[38,15],[48,0],[37,-22],[50,12],[47,-15],[40,25],[55,-5],[36,-30],
     [55,8],[50,20],[58,-3],[42,-28],[48,25],[-40,12],[-45,-8],[-38,20],[-50,0],[-42,-18],
     [-48,15],[-35,28],[-55,-5],[-38,-25],[-52,10]]
      .forEach(function(p) { self.createTree(p[0], 0, p[1]); });

    // 안쪽 나무
    [[0,0],[4,-5],[-5,4],[6,6],[-4,-6],[-7,0],[0,8],[8,-3],[-6,-7],[3,-8],[7,4],[-8,5]]
      .forEach(function(p) { self.createTree(p[0], 0, p[1]); });

    // 배경 나무
    for (var i = 0; i < 40; i++) {
      var a = Math.random() * Math.PI * 2;
      var d = 60 + Math.random() * 35;
      this.createTree(Math.cos(a)*d, 0, Math.sin(a)*d, true);
    }

    // 집
    this.createHouse(42, 0, -30, this.C.houseRoof, 0);
    this.createHouse(-42, 0, 22, this.C.houseRoofBlue, Math.PI / 3);
    this.createHouse(22, 0, 35, this.C.houseRoof, -Math.PI / 4);

    // 풍차
    this.createWindmill(-35, 0, -28);

    this.createFence();
    this.createFlowers();
  },

  createTree(x, y, z, bg) {
    var tree = new THREE.Group();
    var sc = bg ? .8+Math.random()*.6 : 1+Math.random()*.5;
    var type = Math.floor(Math.random()*3);
    var tH = 1.5+Math.random()*.5;
    var trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(.2*sc,.3*sc,tH*sc,6),
      new THREE.MeshLambertMaterial({ color: this.C.treeTrunk })
    );
    trunk.position.y = tH*sc/2; trunk.castShadow = true; tree.add(trunk);

    var lc = [this.C.treeLeaf, this.C.treeLeafDark, this.C.treeLeafLight];
    var lM = new THREE.MeshLambertMaterial({ color: lc[Math.floor(Math.random()*lc.length)] });
    if (type===0) {
      var l = new THREE.Mesh(new THREE.SphereGeometry(1.2*sc,8,6), lM);
      l.position.y = tH*sc+.8*sc; l.castShadow = true; tree.add(l);
    } else if (type===1) {
      var c1 = new THREE.Mesh(new THREE.ConeGeometry(sc,2.5*sc,8), lM);
      c1.position.y = tH*sc+sc; c1.castShadow = true; tree.add(c1);
      var c2 = new THREE.Mesh(new THREE.ConeGeometry(.7*sc,1.8*sc,8), lM);
      c2.position.y = tH*sc+2*sc; c2.castShadow = true; tree.add(c2);
    } else {
      for (var i=0;i<3;i++) {
        var l2 = new THREE.Mesh(new THREE.SphereGeometry(.7*sc,6,5), lM);
        l2.position.set((Math.random()-.5)*.8*sc, tH*sc+.5*sc+i*.5*sc, (Math.random()-.5)*.8*sc);
        l2.castShadow = true; tree.add(l2);
      }
    }
    tree.position.set(x,y,z); this.trees.push(tree); this.scene.add(tree);
  },

  createHouse(x, y, z, roofColor, rot) {
    var h = new THREE.Group();
    var wM = new THREE.MeshLambertMaterial({ color: this.C.houseWall });
    var rM = new THREE.MeshLambertMaterial({ color: roofColor });
    var wall = new THREE.Mesh(new THREE.BoxGeometry(4,3,3.5), wM);
    wall.position.y = 1.5; wall.castShadow = true; h.add(wall);

    // 박공 지붕
    var rs = new THREE.Shape();
    rs.moveTo(-2.3, 0); rs.lineTo(0, 1.5); rs.lineTo(2.3, 0); rs.closePath();
    var rGeo = new THREE.ExtrudeGeometry(rs, { depth: 3.8, bevelEnabled: false });
    var roof = new THREE.Mesh(rGeo, rM);
    roof.position.set(0, 3, -1.9); roof.castShadow = true; h.add(roof);

    h.add(this._box(.8,1.5,.1, this.C.houseDoor, 0,.75,-1.76));
    var winM = new THREE.MeshLambertMaterial({ color: this.C.houseWindow });
    var w1 = this._box(.6,.6,.1, null, -1.2,2,-1.76, winM); w1.userData.isWindow = true; h.add(w1);
    var w2 = this._box(.6,.6,.1, null, 1.2,2,-1.76, winM); w2.userData.isWindow = true; h.add(w2);

    var chimney = new THREE.Mesh(new THREE.BoxGeometry(.5,1.5,.5), new THREE.MeshLambertMaterial({ color: 0x7F8C8D }));
    chimney.position.set(1,4.2,0); h.add(chimney);

    h.position.set(x,y,z); h.rotation.y = rot;
    this.houses.push(h); this.scene.add(h);
  },

  createWindmill(x, y, z) {
    var g = new THREE.Group();
    var tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1,1.5,6,8),
      new THREE.MeshLambertMaterial({ color: this.C.windmillBody })
    );
    tower.position.y = 3; tower.castShadow = true; g.add(tower);

    var roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.5,1.5,8),
      new THREE.MeshLambertMaterial({ color: 0xC0392B })
    );
    roof.position.y = 6.75; roof.castShadow = true; g.add(roof);
    g.add(this._box(.7,1.3,.1, this.C.houseDoor, 0,.65,-1.5));

    this.windmillBlade = new THREE.Group();
    this.windmillBlade.position.set(0,5.5,-1.2);
    var blM = new THREE.MeshLambertMaterial({ color: this.C.windmillBlade });
    for (var i=0;i<4;i++) {
      var bl = new THREE.Mesh(new THREE.BoxGeometry(.4,3.5,.1), blM);
      bl.position.y = 1.75;
      var holder = new THREE.Group();
      holder.add(bl);
      holder.rotation.z = (i*Math.PI)/2;
      this.windmillBlade.add(holder);
    }
    var ax = new THREE.Mesh(new THREE.SphereGeometry(.25,8,8), new THREE.MeshLambertMaterial({ color: 0x555555 }));
    this.windmillBlade.add(ax);
    g.add(this.windmillBlade);
    g.position.set(x,y,z); this.scene.add(g);
  },

  createFence() {
    var fM = new THREE.MeshLambertMaterial({ color: this.C.fenceWood });
    // 트랙 아래쪽(z음수) 직선구간 바깥으로 울타리 배치
    var fenceZ = -(this.CURVE_RADIUS + this.TRACK_WIDTH / 2 + 5);
    var startX = -8, endX = 8;
    var count = 12;
    var prev = null;
    for (var i = 0; i < count; i++) {
      var x = startX + (endX - startX) * (i / (count - 1));
      var z = fenceZ + Math.sin(i * 0.5) * 0.3; // 약간 물결
      var post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 1.2, 5), fM);
      post.position.set(x, .6, z); this.scene.add(post);
      if (prev) {
        var self = this;
        [.9, .5].forEach(function(ry) {
          var dx = x - prev.x, dz = z - prev.z;
          var len = Math.sqrt(dx * dx + dz * dz);
          var rail = new THREE.Mesh(new THREE.BoxGeometry(.05, .05, len), fM);
          rail.position.set((x + prev.x) / 2, ry, (z + prev.z) / 2);
          rail.lookAt(x, ry, z);
          self.scene.add(rail);
        });
      }
      prev = { x: x, z: z };
    }
  },

  createFlowers() {
    var colors = [0xFF6B9D, 0xFFD93D, 0xFF6B35, 0xC44DFF, 0xFF4757];
    var sM = new THREE.MeshLambertMaterial({ color: 0x2ECC71 });
    for (var i=0;i<50;i++) {
      var a = Math.random()*Math.PI*2;
      var d = 4+Math.random()*8;
      var f = new THREE.Group();
      var stem = new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.4,4), sM);
      stem.position.y = .2; f.add(stem);
      var petal = new THREE.Mesh(
        new THREE.SphereGeometry(.12,6,4),
        new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random()*colors.length)] })
      );
      petal.position.y = .45; f.add(petal);
      f.position.set(Math.cos(a)*d, 0, Math.sin(a)*d);
      this.scene.add(f);
    }
  },

  /* ==================== CLOUDS ==================== */
  createClouds() {
    var cM = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, transparent: true, opacity: .9 });
    for (var i=0;i<14;i++) {
      var cloud = new THREE.Group();
      for (var j=0; j<3+Math.floor(Math.random()*4); j++) {
        var m = new THREE.Mesh(new THREE.SphereGeometry(1+Math.random()*1.5,8,6), cM);
        m.position.set((Math.random()-.5)*4, (Math.random()-.5), (Math.random()-.5)*3);
        cloud.add(m);
      }
      cloud.position.set((Math.random()-.5)*140, 18+Math.random()*12, (Math.random()-.5)*140);
      this.clouds.push({ mesh: cloud, speed: .02+Math.random()*.03 });
      this.scene.add(cloud);
    }
  },

  /* ==================== SUN / MOON ==================== */
  createCelestialBodies() {
    // === SUN ===
    this.sunGroup = new THREE.Group();

    // 태양 몸체
    var sunBody = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xFFD700 })
    );
    this.sunGroup.add(sunBody);

    // 태양 광선 (주변 삼각형들)
    var rayM = new THREE.MeshBasicMaterial({ color: 0xFFA500 });
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2;
      var ray = new THREE.Mesh(
        new THREE.ConeGeometry(0.8, 3, 4),
        rayM
      );
      ray.position.set(Math.cos(a) * 6.5, Math.sin(a) * 6.5, 0);
      ray.rotation.z = a - Math.PI / 2;
      this.sunGroup.add(ray);
    }

    // 태양 눈 (크게)
    this.sunPupils = this._createCelestialEyes(this.sunGroup, 1.8, 1.6, 0.9, 0.8);

    // 태양 입 (미소)
    var smCurve = new THREE.EllipseCurve(0, 0, 1.8, 1.0, 0, Math.PI, false, 0);
    var smLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(smCurve.getPoints(16)),
      new THREE.LineBasicMaterial({ color: 0x8B4513, linewidth: 2 })
    );
    smLine.position.set(0, -1.8, 5.1);
    this.sunGroup.add(smLine);

    // 볼 (블러셔)
    var cheekM = new THREE.MeshBasicMaterial({ color: 0xFF8C69, transparent: true, opacity: 0.5 });
    [-2.8, 2.8].forEach(function(cx) {
      var cheek = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), cheekM);
      cheek.position.set(cx, -0.8, 4.8);
      this.sunGroup.add(cheek);
    }.bind(this));

    this.sunGroup.position.set(60, 28, -40);
    this.scene.add(this.sunGroup);

    // === MOON (보름달 — 구체) ===
    this.moonGroup = new THREE.Group();

    var moonBody = new THREE.Mesh(
      new THREE.SphereGeometry(4, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xFFF8DC })
    );
    this.moonGroup.add(moonBody);

    // 달 크레이터 (어두운 점 몇 개)
    var craterMat = new THREE.MeshBasicMaterial({ color: 0xE8DCC8 });
    var craters = [
      { x: -1.2, y: 0.8, z: 3.5, r: 0.6 },
      { x: 1.5, y: -0.5, z: 3.4, r: 0.5 },
      { x: -0.3, y: -1.5, z: 3.6, r: 0.4 },
      { x: 0.8, y: 1.5, z: 3.5, r: 0.35 },
    ];
    craters.forEach(function(c) {
      var crater = new THREE.Mesh(new THREE.SphereGeometry(c.r, 6, 4), craterMat);
      crater.position.set(c.x, c.y, c.z);
      this.moonGroup.add(crater);
    }.bind(this));

    // 달 눈 (보름달 표면)
    this.moonPupils = this._createCelestialEyes(this.moonGroup, 1.2, 0.8, 0.45, 0.3, 0, 3.6);

    // 달 미소
    var moonSmile = new THREE.EllipseCurve(0, 0, 1.0, 0.5, 0, Math.PI, false, 0);
    var moonSmileLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(moonSmile.getPoints(12)),
      new THREE.LineBasicMaterial({ color: 0xBBAA88, linewidth: 2 })
    );
    moonSmileLine.position.set(0, -1.2, 4.1);
    this.moonGroup.add(moonSmileLine);

    this.moonGroup.position.set(-50, 35, -30);
    this.moonGroup.visible = false;
    this.scene.add(this.moonGroup);
  },

  /**
   * 천체에 눈 추가 — 흰자 + 동공, 동공 배열 반환
   */
  _createCelestialEyes(group, spacing, eyeR, pupilR, yOff, xOff, zBase) {
    var pupils = [];
    var eyeWhite = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var pupilMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    var centerX = xOff || 0;
    var bz = (zBase !== undefined) ? zBase : 4.5;

    [-spacing, spacing].forEach(function(sx) {
      var px = centerX + sx;
      // 흰자
      var eyeBg = new THREE.Mesh(new THREE.SphereGeometry(eyeR, 10, 8), eyeWhite);
      eyeBg.position.set(px, yOff || 0.5, bz);
      group.add(eyeBg);

      // 동공
      var pupil = new THREE.Mesh(new THREE.SphereGeometry(pupilR, 8, 6), pupilMat);
      pupil.position.set(px, yOff || 0.5, bz + eyeR * 0.6);
      group.add(pupil);
      pupils.push({ mesh: pupil, cx: px, cy: yOff || 0.5, baseZ: bz, eyeR: eyeR });
    });

    return pupils;
  },

  /**
   * 마우스 방향으로 눈동자 이동 업데이트
   */
  updateCelestialEyes() {
    var activeGroup = this.isNight ? this.moonGroup : this.sunGroup;
    var activePupils = this.isNight ? this.moonPupils : this.sunPupils;
    if (!activeGroup || !activePupils || activePupils.length === 0) return;

    // 천체의 화면 좌표 구하기
    var worldPos = new THREE.Vector3();
    activeGroup.getWorldPosition(worldPos);
    var screenPos = worldPos.clone().project(this.camera);

    // 마우스와 천체 화면좌표 차이 → 눈동자 방향
    var dx = this.mouseNDC.x - screenPos.x;
    var dy = this.mouseNDC.y - screenPos.y;

    // 정규화 (최대 이동량 제한)
    var dist = Math.sqrt(dx * dx + dy * dy);
    var maxD = 2;
    if (dist > maxD) { dx = dx / dist * maxD; dy = dy / dist * maxD; }

    var self = this;
    activePupils.forEach(function(p) {
      var maxMove = p.eyeR * 0.35;
      p.mesh.position.x = p.cx + (dx / maxD) * maxMove;
      p.mesh.position.y = p.cy + (dy / maxD) * maxMove;
    });
  },

  /* ==================== SMOKE ==================== */
  updateSmoke() {
    if (!this.isPaused && Math.random() > .5) {
      var sM = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: .5 });
      var s = new THREE.Mesh(new THREE.SphereGeometry(.2+Math.random()*.2,6,4), sM);
      var p = new THREE.Vector3(0, 3.5, -1.8);
      this.train.children[0].localToWorld(p);
      s.position.copy(p);
      this.smoke.push({ mesh:s, life:0, maxLife:60+Math.random()*30,
        vx:(Math.random()-.5)*.02, vy:.05+Math.random()*.03, vz:(Math.random()-.5)*.02 });
      this.scene.add(s);
    }
    for (var i=this.smoke.length-1; i>=0; i--) {
      var s = this.smoke[i];
      s.life++;
      s.mesh.position.x += s.vx; s.mesh.position.y += s.vy; s.mesh.position.z += s.vz;
      s.mesh.scale.setScalar(1+s.life*.03);
      s.mesh.material.opacity = .5*(1-s.life/s.maxLife);
      if (s.life >= s.maxLife) {
        this.scene.remove(s.mesh); s.mesh.material.dispose(); this.smoke.splice(i,1);
      }
    }
  },

  /* ==================== SHEEP ==================== */
  buildObstacleList() {
    this.obstacleList = [];
    var self = this;

    // 나무 (this.trees에 저장)
    this.trees.forEach(function(tr) {
      self.obstacleList.push({ x: tr.position.x, z: tr.position.z, r: 2.5 });
    });

    // 집
    this.houses.forEach(function(h) {
      self.obstacleList.push({ x: h.position.x, z: h.position.z, r: 5 });
    });

    // 풍차
    this.obstacleList.push({ x: -35, z: -28, r: 4 });

    // 기차역
    var halfL = this.STRAIGHT_LEN / 2;
    this.obstacleList.push({ x: halfL + this.CURVE_RADIUS + 5, z: 0, r: 8 });

    // 연못/물
    this.obstacleList.push({ x: -40, z: 30, r: 10 });

    // 다리
    this.obstacleList.push({ x: -37, z: 27, r: 3 });
  },

  isNearTrack(x, z) {
    var margin = 5;
    var halfL = this.STRAIGHT_LEN / 2;
    var R = this.CURVE_RADIUS;
    if (x >= -halfL - margin && x <= halfL + margin) {
      if (Math.abs(z - (-R)) < margin || Math.abs(z - R) < margin) return true;
    }
    var dxR = x - halfL, dzR = z;
    var distR = Math.sqrt(dxR * dxR + dzR * dzR);
    if (dxR > -margin && Math.abs(distR - R) < margin) return true;
    var dxL = x + halfL, dzL = z;
    var distL = Math.sqrt(dxL * dxL + dzL * dzL);
    if (dxL < margin && Math.abs(distL - R) < margin) return true;
    return false;
  },

  isInsideTrackOval(x, z) {
    var halfL = this.STRAIGHT_LEN / 2;
    var R = this.CURVE_RADIUS;
    var margin = 3;
    if (x >= -halfL && x <= halfL) {
      if (Math.abs(z) < R - margin) return true;
    } else if (x < -halfL) {
      var dx = x + halfL, dz = z;
      if (Math.sqrt(dx * dx + dz * dz) < R - margin) return true;
    } else {
      var dx = x - halfL, dz = z;
      if (Math.sqrt(dx * dx + dz * dz) < R - margin) return true;
    }
    return false;
  },

  isBlocked(x, z, sheepIdx) {
    if (this.isNearTrack(x, z)) return true;
    if (this.isInsideTrackOval(x, z)) return true;

    // 정적 장애물 (나무, 집, 풍차, 역, 연못)
    for (var i = 0; i < this.obstacleList.length; i++) {
      var ob = this.obstacleList[i];
      var dx = x - ob.x, dz = z - ob.z;
      if (dx * dx + dz * dz < ob.r * ob.r) return true;
    }

    // 다른 양
    for (var j = 0; j < this.sheep.length; j++) {
      if (j === sheepIdx) continue;
      var other = this.sheep[j];
      var dx2 = x - other.x, dz2 = z - other.z;
      if (dx2 * dx2 + dz2 * dz2 < 4) return true; // 거리 2 이내
    }

    // 필드 경계
    if (Math.abs(x) > 55 || Math.abs(z) > 55) return true;

    return false;
  },

  createOneSheep() {
    var g = new THREE.Group();
    var woolMat = new THREE.MeshLambertMaterial({ color: 0xF5F5F0 });
    var darkMat = new THREE.MeshLambertMaterial({ color: 0x3D3D3D });
    var legMat = new THREE.MeshLambertMaterial({ color: 0x8B7355 });

    // 몸통 — 뭉실한 타원
    var body = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), woolMat);
    body.scale.set(1.2, 0.9, 0.8);
    body.position.y = 0.9;
    body.castShadow = true;
    g.add(body);

    // 울퉁불퉁한 양모 (작은 구 여러 개)
    for (var i = 0; i < 6; i++) {
      var puff = new THREE.Mesh(new THREE.SphereGeometry(0.35, 6, 4), woolMat);
      var a = (i / 6) * Math.PI * 2;
      puff.position.set(Math.cos(a) * 0.6, 0.9 + Math.sin(i * 1.7) * 0.2, Math.sin(a) * 0.45);
      puff.castShadow = true;
      g.add(puff);
    }

    // 머리 — 검정
    var head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 8, 6), darkMat);
    head.position.set(1.1, 1.05, 0);
    head.castShadow = true;
    g.add(head);

    // 귀
    [-0.22, 0.22].forEach(function(side) {
      var ear = new THREE.Mesh(new THREE.SphereGeometry(0.12, 5, 4), darkMat);
      ear.position.set(1.25, 1.2, side);
      g.add(ear);
    });

    // 눈 — 흰자
    var eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    [-0.13, 0.13].forEach(function(side) {
      var eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 4), eyeWhiteMat);
      eyeWhite.position.set(1.42, 1.12, side);
      g.add(eyeWhite);
    });

    // 눈 — 검은 눈동자
    var pupilMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    [-0.13, 0.13].forEach(function(side) {
      var pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 4), pupilMat);
      pupil.position.set(1.47, 1.12, side);
      g.add(pupil);
    });

    // 다리 (4개) — 피벗 그룹으로 감싸서 걷기 애니메이션 가능
    // 배치: [x, z] — +X가 머리 방향
    var legPositions = [
      { x: 0.5, z: -0.25, name: 'FL' },   // 앞왼
      { x: 0.5, z: 0.25, name: 'FR' },    // 앞오른
      { x: -0.5, z: -0.25, name: 'BL' },  // 뒤왼
      { x: -0.5, z: 0.25, name: 'BR' }    // 뒤오른
    ];
    var legs = {};
    legPositions.forEach(function(lp) {
      var pivotGroup = new THREE.Group();
      pivotGroup.position.set(lp.x, 0.6, lp.z); // 피벗: 다리 상단 (몸통 연결부)
      var leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6), legMat);
      leg.position.y = -0.3; // 피벗 아래로
      leg.castShadow = true;
      pivotGroup.add(leg);
      g.add(pivotGroup);
      legs[lp.name] = pivotGroup;
    });
    g.userData.legs = legs;

    // 꼬리
    var tail = new THREE.Mesh(new THREE.SphereGeometry(0.15, 5, 4), woolMat);
    tail.position.set(-1.0, 1.0, 0);
    g.add(tail);

    g.scale.setScalar(1.2);
    return g;
  },

  createSheep() {
    // 장애물 목록 빌드 (나무, 집 등 모두 생성 후)
    this.buildObstacleList();

    var count = 12;
    for (var i = 0; i < count; i++) {
      var attempts = 0;
      var x, z;
      do {
        x = (Math.random() - 0.5) * 80;
        z = (Math.random() - 0.5) * 80;
        attempts++;
      } while (this.isBlocked(x, z, -1) && attempts < 80);

      if (attempts >= 80) continue;

      var mesh = this.createOneSheep();
      var startAngle = Math.random() * Math.PI * 2;
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
  },

  updateSheep(t) {
    var self = this;
    this.sheep.forEach(function(s, idx) {
      var legs = s.mesh.userData.legs;

      // 댄스 모드: 뒤로 걷기 (문워크)
      if (s.isDancing) {
        s.isEating = false;
        s.isWalking = true;

        // 미러볼 회전 + 빛 반사 효과
        if (s.mirrorBall) {
          s.mirrorBall.rotation.y += 0.05;
          s.mirrorBall.rotation.x = Math.sin(t * 2) * 0.1;
          // 타일+스파클 반짝임 (회전에 따라 빛 반사)
          s.mirrorBall.children.forEach(function(c, ci) {
            if (c.userData && c.userData.isSparkle) {
              // 스파클: 회전 각도에 따라 밝기 변화 (빛 반사 시뮬레이션)
              var bright = 0.3 + Math.sin(t * 12 + ci * 1.2) * 0.5 + Math.cos(t * 7 + ci * 0.9) * 0.3;
              if (bright > 0.6) {
                var hue = ((t * 0.4 + ci * 0.02) % 1);
                c.material.color.setHSL(hue, 0.8, 0.9);
                c.scale.setScalar(1.0 + bright * 0.5);
              } else {
                c.material.color.setRGB(0.9, 0.9, 0.9);
                c.scale.setScalar(0.8);
              }
            } else if (c.isMesh && c.material && c.material.emissive) {
              // 타일: emissive 변화로 메탈릭 반짝임
              var flash = Math.sin(t * 15 + ci * 0.7) * 0.5 + 0.5;
              if (flash > 0.7) {
                c.material.emissive.setHSL((t * 0.3 + ci * 0.01) % 1, 0.6, 0.3 * flash);
              } else {
                c.material.emissive.setRGB(0.15, 0.15, 0.15);
              }
            }
          });
        }
        if (s.mirrorLight) {
          s.mirrorLight.intensity = 0.5 + Math.sin(t * 8) * 0.3;
          // 빛 색상 변화 (디스코)
          var hue = (t * 0.5) % 1;
          s.mirrorLight.color.setHSL(hue, 1.0, 0.6);
        }

        // 새 목적지 결정 (뒤로)
        if (t > s.nextMoveTime) {
          var attempts = 0;
          var nx, nz;
          do {
            // 뒤쪽 방향으로 목적지 (현재 바라보는 반대 ±40도)
            var da = (Math.random() - 0.5) * Math.PI * 0.45;
            var dist = 4 + Math.random() * 8;
            nx = s.x + Math.cos(s.angle + Math.PI + da) * dist;
            nz = s.z + Math.sin(s.angle + Math.PI + da) * dist;
            nx = Math.max(-52, Math.min(52, nx));
            nz = Math.max(-52, Math.min(52, nz));
            attempts++;
          } while (self.isBlocked(nx, nz, idx) && attempts < 30);
          if (attempts < 30) { s.targetX = nx; s.targetZ = nz; }
          else { s.angle += Math.PI; s.targetX = s.x + Math.cos(s.angle + Math.PI) * 5; s.targetZ = s.z + Math.sin(s.angle + Math.PI) * 5; }
          s.nextMoveTime = t + 3 + Math.random() * 4;
        }

        // 뒤로 이동 (머리는 앞, 몸은 뒤로)
        var dx = s.targetX - s.x, dz = s.targetZ - s.z;
        var dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.5) {
          // 머리를 목적지 반대쪽으로 향함 (= 원래 진행방향 유지, 뒤로 걷기)
          var moveAngle = Math.atan2(dz, dx);
          var headAngle = moveAngle + Math.PI; // 머리는 반대
          var angleDiff = headAngle - s.angle;
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          s.angle += angleDiff * 0.04;

          var newX = s.x + Math.cos(moveAngle) * s.speed * 0.7; // 뒤로는 좀 느리게
          var newZ = s.z + Math.sin(moveAngle) * s.speed * 0.7;
          if (!self.isBlocked(newX, newZ, idx)) { s.x = newX; s.z = newZ; }
          else { s.nextMoveTime = t + 0.5; }
        } else {
          s.nextMoveTime = t + 0.3;
        }

        s.mesh.position.set(s.x, 0, s.z);
        s.mesh.rotation.y = -s.angle;

        // 다리: 역방향 걷기 (문워크 느낌)
        if (legs) {
          var swing = Math.sin(t * 8) * 0.4; // 더 빠르게
          legs.FL.rotation.z = -swing;  // 반대
          legs.BR.rotation.z = -swing;
          legs.FR.rotation.z = swing;
          legs.BL.rotation.z = swing;
        }
        return;
      }

      // === 일반 모드 ===
      // 풀 뜯기 중
      if (s.isEating) {
        s.isWalking = false;
        if (t > s.eatUntil) {
          s.isEating = false;
          s.nextMoveTime = t + 0.5;
        }
        // 고개 까딱 (몸통 약간 기울임)
        s.mesh.children[0].position.y = 0.9 + Math.sin(t * 4) * 0.03;
        // 다리 정지
        if (legs) {
          legs.FL.rotation.z = 0; legs.FR.rotation.z = 0;
          legs.BL.rotation.z = 0; legs.BR.rotation.z = 0;
        }
        return;
      }

      // 새 목적지 결정
      if (t > s.nextMoveTime) {
        var attempts = 0;
        var nx, nz;
        do {
          // 현재 바라보는 방향 전방 ±60도 범위에서 목적지 선택 (앞으로만)
          var da = (Math.random() - 0.5) * Math.PI * 0.7;
          var dist = 4 + Math.random() * 10;
          nx = s.x + Math.cos(s.angle + da) * dist;
          nz = s.z + Math.sin(s.angle + da) * dist;
          nx = Math.max(-52, Math.min(52, nx));
          nz = Math.max(-52, Math.min(52, nz));
          attempts++;
        } while (self.isBlocked(nx, nz, idx) && attempts < 30);

        if (attempts < 30) {
          s.targetX = nx;
          s.targetZ = nz;
        } else {
          // 모든 방향 시도 실패 → 180도 회전
          s.angle += Math.PI;
          s.targetX = s.x + Math.cos(s.angle) * 5;
          s.targetZ = s.z + Math.sin(s.angle) * 5;
        }
        s.nextMoveTime = t + 4 + Math.random() * 6;

        // 25% 확률로 풀 뜯기
        if (Math.random() < 0.25) {
          s.isEating = true;
          s.eatUntil = t + 2 + Math.random() * 3;
          s.isWalking = false;
          return;
        }
      }

      // 목적지로 이동
      var dx = s.targetX - s.x;
      var dz = s.targetZ - s.z;
      var dist = Math.sqrt(dx * dx + dz * dz);

      if (dist > 0.5) {
        s.isWalking = true;
        var targetAngle = Math.atan2(dz, dx);
        // 부드러운 회전
        var angleDiff = targetAngle - s.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        s.angle += angleDiff * 0.04;

        var newX = s.x + Math.cos(s.angle) * s.speed;
        var newZ = s.z + Math.sin(s.angle) * s.speed;

        // 충돌 체크
        if (self.isBlocked(newX, newZ, idx)) {
          // 충돌 시 멈추고 새 목적지 즉시 재설정
          s.targetX = s.x;
          s.targetZ = s.z;
          s.nextMoveTime = t + 0.5;
          s.isWalking = false;
        } else {
          s.x = newX;
          s.z = newZ;
        }

        s.mesh.position.set(s.x, 0, s.z);
        // 머리(+X 로컬) 방향으로 회전
        s.mesh.rotation.y = -s.angle;

        // 다리 걷기 애니메이션 — 대각선 쌍이 교차 (앞뒤 스윙)
        if (legs && s.isWalking) {
          var swing = Math.sin(t * 6) * 0.35;
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

  /* ==================== SHEEP DANCE (Moonwalk) ==================== */
  toggleSheepDance(sheepIdx) {
    var s = this.sheep[sheepIdx];
    if (!s) return;

    s.isDancing = !s.isDancing;

    if (s.isDancing) {
      // === 댄스 모드 ON ===
      s.isEating = false;

      // 마이클잭슨 모자 (페도라) — 검정 챙 넓은 모자
      var hatGroup = new THREE.Group();
      // 모자 크라운 (윗부분)
      var crown = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.28, 0.3, 8),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      crown.position.y = 0.15;
      hatGroup.add(crown);
      // 모자 탑 (약간 오목)
      var top = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.22, 0.05, 8),
        new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
      );
      top.position.y = 0.3;
      hatGroup.add(top);
      // 챙 (넓고 납작)
      var brim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.04, 12),
        new THREE.MeshLambertMaterial({ color: 0x111111 })
      );
      brim.position.y = 0.0;
      hatGroup.add(brim);
      // 리본 밴드
      var band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.285, 0.285, 0.05, 8),
        new THREE.MeshLambertMaterial({ color: 0x333333 })
      );
      band.position.y = 0.05;
      hatGroup.add(band);

      // 머리 위에 배치 (로컬 좌표: 머리는 x=1.1, y=1.05)
      hatGroup.position.set(1.1, 1.5, 0);
      hatGroup.rotation.z = -0.15; // 약간 기울임 (멋지게)
      s.mesh.add(hatGroup);
      s.hat = hatGroup;

      // 미러볼 (양 위에) — 은색 메탈릭 디스코볼
      var mirrorBallGroup = new THREE.Group();

      // 기본 구체 — 고광택 은색 메탈
      var ballGeo = new THREE.SphereGeometry(0.6, 32, 24);
      var ballMat = new THREE.MeshPhongMaterial({
        color: 0xd0d0d0,
        specular: 0xffffff,
        shininess: 300,
        reflectivity: 1.0,
        emissive: 0x222222
      });
      var ball = new THREE.Mesh(ballGeo, ballMat);
      mirrorBallGroup.add(ball);

      // 미러 타일 (격자형 작은 사각형) — 진짜 디스코볼처럼
      var tileRows = 12;
      var tileMat = new THREE.MeshPhongMaterial({
        color: 0xe8e8e8,
        specular: 0xffffff,
        shininess: 500,
        emissive: 0x333333
      });
      for (var row = 1; row < tileRows; row++) {
        var phi = (row / tileRows) * Math.PI;
        var rowR = Math.sin(phi) * 0.62;
        var rowY = Math.cos(phi) * 0.62;
        var tileCols = Math.max(4, Math.floor(16 * Math.sin(phi)));
        for (var col = 0; col < tileCols; col++) {
          var theta = (col / tileCols) * Math.PI * 2;
          var tileGeo = new THREE.PlaneGeometry(0.12, 0.08);
          var tile = new THREE.Mesh(tileGeo, tileMat.clone());
          tile.position.set(
            rowR * Math.cos(theta),
            rowY,
            rowR * Math.sin(theta)
          );
          // 타일이 구 표면 법선 방향을 바라보도록
          tile.lookAt(tile.position.clone().multiplyScalar(2));
          mirrorBallGroup.add(tile);
        }
      }

      // 반짝이 하이라이트 점 (밝은 스파클)
      var sparkleGeo = new THREE.SphereGeometry(0.03, 3, 2);
      for (var fi = 0; fi < 50; fi++) {
        var spPhi = Math.acos(1 - 2 * (fi + 0.5) / 50);
        var spTheta = Math.PI * (1 + Math.sqrt(5)) * fi;
        var sparkle = new THREE.Mesh(sparkleGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        sparkle.position.set(
          0.64 * Math.sin(spPhi) * Math.cos(spTheta),
          0.64 * Math.sin(spPhi) * Math.sin(spTheta),
          0.64 * Math.cos(spPhi)
        );
        sparkle.userData.isSparkle = true;
        mirrorBallGroup.add(sparkle);
      }

      // 줄 (미러볼 매달기)
      var wireGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0.6, 0),
        new THREE.Vector3(0, 1.8, 0)
      ]);
      mirrorBallGroup.add(new THREE.Line(wireGeo, new THREE.LineBasicMaterial({ color: 0x888888 })));

      mirrorBallGroup.position.set(0, 3.5, 0); // 양 위 높이
      s.mesh.add(mirrorBallGroup);
      s.mirrorBall = mirrorBallGroup;

      // 미러볼 전용 스포트라이트 (위에서 비춰 반사광 효과)
      var spotLight = new THREE.SpotLight(0xffffff, 1.2, 15, Math.PI / 4, 0.5);
      spotLight.position.set(0, 5.5, 0);
      spotLight.target = ball;
      s.mesh.add(spotLight);

      // 미러볼 조명 (디스코 라이트 — 여러 색상)
      var mirrorLight = new THREE.PointLight(0xff00ff, 1.0, 15);
      mirrorLight.position.set(0, 3.5, 0);
      s.mesh.add(mirrorLight);
      s.mirrorLight = mirrorLight;
      s.spotLight = spotLight;

    } else {
      // === 댄스 모드 OFF ===
      if (s.hat) { s.mesh.remove(s.hat); s.hat = null; }
      if (s.mirrorBall) { s.mesh.remove(s.mirrorBall); s.mirrorBall = null; }
      if (s.mirrorLight) { s.mesh.remove(s.mirrorLight); s.mirrorLight = null; }
      if (s.spotLight) { s.mesh.remove(s.spotLight); s.spotLight = null; }
      s.nextMoveTime = 0;
    }
  },

  /* ==================== CAMERA ==================== */
  updateCameraPosition() {
    this.camTheta += (this.targetTheta - this.camTheta) * .08;
    this.camPhi += (this.targetPhi - this.camPhi) * .05;
    this.camRadius += (this.targetRadius - this.camRadius) * .08;
    this.panX += (this.targetPanX - this.panX) * .08;
    this.panZ += (this.targetPanZ - this.panZ) * .08;
    var y = this.camRadius * Math.cos(this.camPhi);
    var hD = this.camRadius * Math.sin(this.camPhi);
    this.camera.position.set(hD*Math.sin(this.camTheta) + this.panX, y, hD*Math.cos(this.camTheta) + this.panZ);
    this.camera.lookAt(this.panX, 0, this.panZ);
  },

  /* ==================== TRAIN HORN ==================== */
  playHorn() {
    if (!this.hornEnabled || this.hornCooldown) return;
    this.hornCooldown = true;
    var self = this;
    setTimeout(function() { self.hornCooldown = false; }, 5000);

    try {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      var ctx = this.audioCtx;
      var now = ctx.currentTime;

      // 진짜 기차 경적: 장-단-단-장 패턴 (미국 철도 경적)
      // 3개 화음 주파수 (F#, A, C#) — 전형적 디젤 기관차 경적
      var chordFreqs = [277, 349, 440];
      var pattern = [
        { start: 0.0, dur: 1.2 },   // 장 —
        { start: 1.4, dur: 0.4 },   // 단
        { start: 2.0, dur: 0.4 },   // 단
        { start: 2.6, dur: 1.6 },   // 장 ———
      ];

      pattern.forEach(function(p) {
        chordFreqs.forEach(function(freq) {
          // 메인 오실레이터
          var osc = ctx.createOscillator();
          var gain = ctx.createGain();
          var filter = ctx.createBiquadFilter();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq * 0.98, now + p.start);
          osc.frequency.linearRampToValueAtTime(freq, now + p.start + 0.08);

          // 로우패스 필터 — 따뜻한 경적 톤
          filter.type = 'lowpass';
          filter.frequency.value = 1200;
          filter.Q.value = 1.5;

          // 볼륨 엔벨로프: 부드러운 어택 → 유지 → 감쇄
          gain.gain.setValueAtTime(0.001, now + p.start);
          gain.gain.exponentialRampToValueAtTime(0.08, now + p.start + 0.06);
          gain.gain.setValueAtTime(0.08, now + p.start + p.dur - 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + p.start + p.dur);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + p.start);
          osc.stop(now + p.start + p.dur + 0.05);

          // 서브 옥타브 (깊은 울림)
          var sub = ctx.createOscillator();
          var subGain = ctx.createGain();
          sub.type = 'triangle';
          sub.frequency.value = freq * 0.5;
          subGain.gain.setValueAtTime(0.001, now + p.start);
          subGain.gain.exponentialRampToValueAtTime(0.04, now + p.start + 0.06);
          subGain.gain.setValueAtTime(0.04, now + p.start + p.dur - 0.15);
          subGain.gain.exponentialRampToValueAtTime(0.001, now + p.start + p.dur);
          sub.connect(subGain);
          subGain.connect(ctx.destination);
          sub.start(now + p.start);
          sub.stop(now + p.start + p.dur + 0.05);
        });
      });
    } catch(e) {}
  },

  /* ==================== TRAIN MOVEMENT ==================== */
  updateTrain() {
    if (!this.train || this.isPaused) return;
    var prevT = this.trainT;
    this.trainT = ((this.trainT + this.trainSpeed) % 1 + 1) % 1;

    var perimeter = this.getPerimeter();
    var carSpacing = 4.8 / perimeter;

    // 역 위치 감지 (오른쪽 커브 꼭대기 = seg1 + seg2/2)
    var seg1 = this.STRAIGHT_LEN / perimeter;
    var seg2 = (Math.PI * this.CURVE_RADIUS) / perimeter;
    var stationT = seg1 + seg2 * 0.5;
    var crossed = (prevT < stationT && this.trainT >= stationT) ||
                  (prevT > 0.9 && this.trainT < 0.1 && stationT < 0.1);
    if (crossed) this.playHorn();

    var self = this;
    this.train.children.forEach(function(car, i) {
      var t = ((self.trainT - i * carSpacing) % 1 + 1) % 1;
      var pt = self.getTrackPoint(t);
      car.position.set(pt.x, 0, pt.z);
      car.rotation.y = -pt.angle - Math.PI / 2;
    });

    this.trainWheels.forEach(function(w) { w.rotation.x += .15; });
  },

  /* ==================== DAY/NIGHT ==================== */
  toggleDayNight() {
    this.isNight = !this.isNight;
    var self = this;
    if (this.isNight) {
      this.scene.background.set(this.C.skyNight);
      this.scene.fog.color.set(this.C.skyNight);
      this.groundMesh.material.color.set(this.C.groundNight);
      this.ambientLight.intensity = .2;
      this.hemiLight.intensity = .2;
      this.dirLight.intensity = .3;
      this.dirLight.color.set(0x8888ff);
      this.dirLight.position.set(-50, 35, -30); // 달 위치에서 비춤
      this.houses.forEach(function(h) { h.traverse(function(c) {
        if (c.userData && c.userData.isWindow && c.material) {
          c.material.color.set(0xFFD700);
          c.material.emissive = new THREE.Color(0xFFD700);
          c.material.emissiveIntensity = .5;
        }
      }); });

      // 태양 숨기고 달 보이기
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
      this.dirLight.position.set(60, 28, -40); // 태양 위치
      this.houses.forEach(function(h) { h.traverse(function(c) {
        if (c.userData && c.userData.isWindow && c.material) {
          c.material.color.set(self.C.houseWindow);
          c.material.emissive = new THREE.Color(0);
          c.material.emissiveIntensity = 0;
        }
      }); });

      // 달 숨기고 태양 보이기
      if (this.sunGroup) this.sunGroup.visible = true;
      if (this.moonGroup) this.moonGroup.visible = false;
    }
  },

  /* ==================== EVENTS ==================== */
  bindEvents() {
    var self = this;

    var _btn = function(id, fn) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('click', function(e) { e.stopPropagation(); fn(); });
      return el;
    };

    // 회전 버튼: 60° 단위 스텝 (0°=기차역 정면)
    _btn('c4-rotate-btn', function() {
      self.camAngleIndex = (self.camAngleIndex + 1) % 6;
      self.targetTheta = -Math.PI / 2 + self.camAngleIndex * (Math.PI / 3);
    });
    var dnBtn = _btn('c4-daynight-btn', function() {
      self.toggleDayNight();
      if (dnBtn) dnBtn.textContent = self.isNight ? '🌙' : '☀️';
    });
    var plBtn = _btn('c4-play-btn', function() {
      self.isPaused = !self.isPaused;
      if (plBtn) plBtn.textContent = self.isPaused ? '▶️' : '⏸️';
    });
    var spBtn = _btn('c4-speed-btn', function() {
      if (self.trainSpeed < 0.002) { self.trainSpeed = 0.003; if (spBtn) spBtn.textContent = '🐇'; }
      else { self.trainSpeed = 0.0012; if (spBtn) spBtn.textContent = '🐢'; }
    });

    // 칸 추가/제거
    _btn('c4-add-wagon', function() { self.addWagon(); });
    _btn('c4-remove-wagon', function() { self.removeWagon(); });

    // 경적 음소거
    var hornBtn = _btn('c4-horn-btn', function() {
      self.hornEnabled = !self.hornEnabled;
      if (hornBtn) hornBtn.textContent = self.hornEnabled ? '🔔' : '🔕';
    });

    // 마우스 추적 (눈동자용) + 드래그: 왼쪽=이동, 오른쪽=회전
    var dragging = false, dragBtn = -1, ds = {x:0, y:0};
    this.sheepRaycaster = new THREE.Raycaster();
    this.sheepMouse = new THREE.Vector2();

    this.container.addEventListener('mousedown', function(e) {
      if (!self.card.classList.contains('fullscreen')) return;
      dragging = true; dragBtn = e.button; ds = {x:e.clientX, y:e.clientY};
    });
    window.addEventListener('mousemove', function(e) {
      var rect = self.container.getBoundingClientRect();
      self.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      self.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!dragging || !self.card.classList.contains('fullscreen')) return;
      var ddx = e.clientX - ds.x, ddy = e.clientY - ds.y;
      if (dragBtn === 0) {
        // 왼쪽 드래그: 팬 (카메라 방향 기준)
        var panSpeed = self.camRadius * 0.008;
        self.targetPanX -= (ddx * Math.cos(self.camTheta) + ddy * Math.sin(self.camTheta) * Math.cos(self.camPhi)) * panSpeed * 0.01;
        self.targetPanZ += (ddx * Math.sin(self.camTheta) - ddy * Math.cos(self.camTheta) * Math.cos(self.camPhi)) * panSpeed * 0.01;
        // 범위 제한
        self.targetPanX = Math.max(-60, Math.min(60, self.targetPanX));
        self.targetPanZ = Math.max(-60, Math.min(60, self.targetPanZ));
      } else if (dragBtn === 2) {
        // 오른쪽 드래그: 회전
        self.targetTheta -= ddx * .005;
        self.targetPhi = Math.max(.3, Math.min(Math.PI/2.2, self.targetPhi + ddy * .003));
      }
      ds = {x:e.clientX, y:e.clientY};
    });
    window.addEventListener('mouseup', function() { dragging = false; dragBtn = -1; });

    // 양 클릭 감지
    this.container.addEventListener('click', function(e) {
      if (!self.card.classList.contains('fullscreen')) return;
      var rect = self.container.getBoundingClientRect();
      self.sheepMouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      self.sheepMouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      self.sheepRaycaster.setFromCamera(self.sheepMouse, self.camera);

      // 양 메쉬 모으기
      var sheepMeshes = [];
      self.sheep.forEach(function(s) {
        s.mesh.traverse(function(c) { if (c.isMesh) sheepMeshes.push(c); });
      });
      var hits = self.sheepRaycaster.intersectObjects(sheepMeshes);
      if (hits.length > 0) {
        // 어떤 양인지 찾기
        var hitObj = hits[0].object;
        for (var si = 0; si < self.sheep.length; si++) {
          var found = false;
          self.sheep[si].mesh.traverse(function(c) { if (c === hitObj) found = true; });
          if (found) { self.toggleSheepDance(si); break; }
        }
      }
    });

    // 줌 (마우스 휠)
    this.container.addEventListener('wheel', function(e) {
      if (!self.card.classList.contains('fullscreen')) return;
      e.preventDefault(); e.stopPropagation();
      self.targetRadius = Math.max(30, Math.min(120, self.targetRadius + e.deltaY * .05));
    }, { passive: false });

    // Touch: 1핑거=이동, 2핑거=줌
    var ts = null, td = 0;
    this.container.addEventListener('touchstart', function(e) {
      if (!self.card.classList.contains('fullscreen')) return;
      if (e.touches.length === 1) ts = {x:e.touches[0].clientX, y:e.touches[0].clientY};
      else if (e.touches.length === 2) td = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    }, { passive: true });
    this.container.addEventListener('touchmove', function(e) {
      if (!self.card.classList.contains('fullscreen')) return;
      if (e.touches.length === 1 && ts) {
        var ddx = e.touches[0].clientX - ts.x, ddy = e.touches[0].clientY - ts.y;
        var panSpeed = self.camRadius * 0.012;
        self.targetPanX -= (ddx * Math.cos(self.camTheta) + ddy * Math.sin(self.camTheta) * Math.cos(self.camPhi)) * panSpeed * 0.01;
        self.targetPanZ += (ddx * Math.sin(self.camTheta) - ddy * Math.cos(self.camTheta) * Math.cos(self.camPhi)) * panSpeed * 0.01;
        self.targetPanX = Math.max(-60, Math.min(60, self.targetPanX));
        self.targetPanZ = Math.max(-60, Math.min(60, self.targetPanZ));
        ts = {x:e.touches[0].clientX, y:e.touches[0].clientY};
      } else if (e.touches.length === 2) {
        var nd = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
        self.targetRadius = Math.max(30, Math.min(120, self.targetRadius - (nd-td)*.1));
        td = nd;
      }
    }, { passive: true });

    window.addEventListener('resize', function() { if (self.isInitialized) self.handleResize(); });

    // 우클릭 메뉴 방지
    this.container.addEventListener('contextmenu', function(e) { e.preventDefault(); });
  },

  /* ==================== RESIZE ==================== */
  handleResize() {
    if (!this.renderer || !this.container) return;
    var r = this.container.getBoundingClientRect();
    var w = Math.round(r.width)||1, h = Math.round(r.height)||1;
    this.camera.aspect = w/h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    var cv = this.renderer.domElement;
    cv.style.width = '100%'; cv.style.height = '100%'; cv.style.display = 'block';
  },

  /* ==================== ANIMATE ==================== */
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    var t = this.clock.getElapsedTime();

    this.updateTrain();
    this.updateCameraPosition();
    this.updateSmoke();
    this.updateSkyVehicle(t);
    this.updateSheep(t);

    this.clouds.forEach(function(c) { c.mesh.position.x += c.speed; if (c.mesh.position.x > 80) c.mesh.position.x = -80; });
    if (this.windmillBlade) this.windmillBlade.rotation.z += .02;
    if (this.waterMesh) this.waterMesh.material.opacity = .6 + Math.sin(t*2)*.1;
    this.trees.forEach(function(tr, i) { tr.rotation.z = Math.sin(t*.5+i*.3)*.02; });

    // 태양/달: 항상 카메라를 향하도록 (빌보드)
    if (this.sunGroup && this.sunGroup.visible) {
      this.sunGroup.quaternion.copy(this.camera.quaternion);
    }
    if (this.moonGroup && this.moonGroup.visible) {
      this.moonGroup.quaternion.copy(this.camera.quaternion);
    }

    // 눈동자 마우스 추적
    this.updateCelestialEyes();

    this.renderer.render(this.scene, this.camera);
  },
};
