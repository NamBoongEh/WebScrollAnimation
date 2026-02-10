/**
 * ========================================
 * card4.js - Choo-Choo World 스타일 나무 기차 월드
 * ========================================
 * choochooworld.com 에서 영감을 받은 나무 장난감 기차 세계
 */
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
  trainWheels: [],
  smoke: [],
  clouds: [],
  windmillBlade: null,
  trees: [],
  houses: [],
  groundMesh: null,
  waterMesh: null,

  // Lights
  hemiLight: null,
  dirLight: null,
  ambientLight: null,

  // State
  isInitialized: false,
  isNight: false,
  trainSpeed: 0.008,
  trainAngle: 0,
  camTheta: Math.PI / 4,
  camPhi: Math.PI / 3.2,
  camRadius: 55,
  targetTheta: Math.PI / 4,
  targetPhi: Math.PI / 3.2,
  targetRadius: 55,
  isPaused: false,
  isMobile: false,

  // Track
  TRACK_RADIUS: 18,
  TRACK_RADIUS_INNER: 12,

  // Colors
  C: {
    skyDay: 0x87CEEB, groundDay: 0x7EC850, groundDark: 0x5CA03A,
    trackWood: 0xC4944A, trackRail: 0x8B7355,
    trainBody: 0xE74C3C, trainRoof: 0xC0392B, trainChimney: 0x2C3E50,
    trainWindow: 0xF7DC6F,
    wagonBlue: 0x3498DB, wagonGreen: 0x27AE60, wagonYellow: 0xF39C12,
    treeTrunk: 0x8B5E3C, treeLeaf: 0x27AE60, treeLeafDark: 0x1E8449, treeLeafLight: 0x58D68D,
    houseWall: 0xFAE5D3, houseRoof: 0xE74C3C, houseRoofBlue: 0x3498DB,
    houseDoor: 0x8B5E3C, houseWindow: 0xAED6F1,
    fenceWood: 0xD4A76A, waterDay: 0x5DADE2, stoneGray: 0x95A5A6,
    windmillBody: 0xFDF2E9, windmillBlade: 0xD5C4A1,
    skyNight: 0x1a1a3e, groundNight: 0x2d4a2d,
  },

  init() {
    this.card = Utils.$('#card-4');
    this.container = Utils.$('#train-container');
    if (!this.card || !this.container || typeof THREE === 'undefined') return;

    this.isMobile = window.innerWidth <= 768;

    const observer = new MutationObserver(() => {
      if (!this.isInitialized) return;
      this.handleResize();
      setTimeout(() => this.handleResize(), 100);
      setTimeout(() => this.handleResize(), 300);
      setTimeout(() => this.handleResize(), 600);
    });
    observer.observe(this.card, { attributes: true, attributeFilter: ['class', 'style'] });

    setTimeout(() => {
      this.initThree();
      this.handleResize();
    }, 300);
  },

  initThree() {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.clock = new THREE.Clock();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.C.skyDay);
    this.scene.fog = new THREE.Fog(this.C.skyDay, 60, 150);

    this.camera = new THREE.PerspectiveCamera(this.isMobile ? 55 : 45, 1, 0.5, 300);

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
    this.updateCameraPosition();
    this.bindEvents();
    this.handleResize();
    this.animate();
  },

  /* ==================== LIGHTS ==================== */
  setupLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x7EC850, 0.6);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.dirLight.position.set(30, 60, 30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(2048, 2048);
    const sc = this.dirLight.shadow.camera;
    sc.near = 1; sc.far = 150; sc.left = sc.bottom = -50; sc.right = sc.top = 50;
    this.scene.add(this.dirLight);
  },

  /* ==================== GROUND ==================== */
  createGround() {
    const gGeo = new THREE.CircleGeometry(80, 64);
    const gMat = new THREE.MeshLambertMaterial({ color: this.C.groundDay });
    this.groundMesh = new THREE.Mesh(gGeo, gMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // 트랙 아래 진한 잔디
    const ringGeo = new THREE.RingGeometry(this.TRACK_RADIUS_INNER - 2, this.TRACK_RADIUS + 2, 64);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshLambertMaterial({ color: this.C.groundDark }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.receiveShadow = true;
    this.scene.add(ring);

    // 돌길
    const stGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.1, 6);
    const stMat = new THREE.MeshLambertMaterial({ color: this.C.stoneGray });
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * Math.PI * 2;
      const r = 8 + Math.random() * 2;
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

    const mat = new THREE.MeshLambertMaterial({ color: this.C.waterDay, transparent: true, opacity: 0.7 });
    this.waterMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(-25, 0.08, 25);
    this.scene.add(this.waterMesh);

    // 다리
    const bg = new THREE.Group();
    const wm = new THREE.MeshLambertMaterial({ color: this.C.trackWood });
    for (let i = 0; i < 5; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 3), wm);
      p.position.set(i * 0.7 - 1.4, 0.5, 0);
      bg.add(p);
    }
    const rm = new THREE.MeshLambertMaterial({ color: this.C.fenceWood });
    for (let side of [-1, 1]) {
      for (let px of [-1.4, 1.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1), rm);
        post.position.set(px, 1, side * 1.3);
        bg.add(post);
      }
      const rail = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.08, 0.08), rm);
      rail.position.set(0, 1.3, side * 1.3);
      bg.add(rail);
    }
    bg.position.set(-22, 0, 22);
    bg.rotation.y = Math.PI / 4;
    this.scene.add(bg);
  },

  /* ==================== TRACK ==================== */
  createTrack() {
    const tg = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: this.C.trackWood });
    const railMat = new THREE.MeshLambertMaterial({ color: this.C.trackRail });

    // 침목
    const midR = (this.TRACK_RADIUS + this.TRACK_RADIUS_INNER) / 2;
    for (let i = 0; i < 80; i++) {
      const a = (i / 80) * Math.PI * 2;
      const sl = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 3.5), woodMat);
      sl.position.set(Math.cos(a) * midR, 0.12, Math.sin(a) * midR);
      sl.rotation.y = -a + Math.PI / 2;
      sl.receiveShadow = true;
      tg.add(sl);
    }

    // 레일
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(this.TRACK_RADIUS - 0.5, 0.12, 8, 64), railMat);
    r1.rotation.x = Math.PI / 2; r1.position.y = 0.25;
    tg.add(r1);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(this.TRACK_RADIUS_INNER + 0.5, 0.12, 8, 64), railMat);
    r2.rotation.x = Math.PI / 2; r2.position.y = 0.25;
    tg.add(r2);

    this.scene.add(tg);
    this.createStation();
  },

  createStation() {
    const st = new THREE.Group();
    const wallM = new THREE.MeshLambertMaterial({ color: this.C.houseWall });
    const roofM = new THREE.MeshLambertMaterial({ color: this.C.houseRoof });

    // 플랫폼
    const plat = new THREE.Mesh(new THREE.BoxGeometry(10, 0.4, 5), new THREE.MeshLambertMaterial({ color: 0xBDBDBD }));
    plat.position.y = 0.2; plat.receiveShadow = true; plat.castShadow = true;
    st.add(plat);

    // 건물
    const bld = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 3.5), wallM);
    bld.position.set(0, 1.9, 0); bld.castShadow = true;
    st.add(bld);

    // 지붕
    const roof = new THREE.Mesh(new THREE.ConeGeometry(5, 2, 4), roofM);
    roof.position.y = 4.4; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.6); roof.castShadow = true;
    st.add(roof);

    // 문/창문
    st.add(this._box(0.8, 1.5, 0.1, this.C.houseDoor, 0, 1.15, -1.76));
    const wM = new THREE.MeshLambertMaterial({ color: this.C.houseWindow });
    st.add(this._box(0.7, 0.7, 0.1, null, -1.5, 2.2, -1.76, wM));
    st.add(this._box(0.7, 0.7, 0.1, null, 1.5, 2.2, -1.76, wM));

    // 표지판
    st.add(this._box(3, 0.6, 0.1, 0x2C3E50, 0, 3.0, -1.76));

    // 기둥 + 캐노피
    const pM = new THREE.MeshLambertMaterial({ color: 0xECF0F1 });
    [[-4, 1.6, -2], [4, 1.6, -2], [-4, 1.6, 2], [4, 1.6, 2]].forEach(([x, y, z]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2), pM);
      p.position.set(x, y, z); st.add(p);
    });
    const cn = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 5), new THREE.MeshLambertMaterial({ color: 0xD35400 }));
    cn.position.set(0, 3.3, 0); st.add(cn);

    st.position.set(this.TRACK_RADIUS + 3, 0, 0);
    st.rotation.y = Math.PI / 2;
    this.scene.add(st);
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
    const loco = this.createLocomotive();
    this.train.add(loco);
    this.train.add(this.createWagon(this.C.wagonBlue));
    this.train.add(this.createWagon(this.C.wagonGreen));
    this.train.add(this.createWagon(this.C.wagonYellow));
    this.scene.add(this.train);
  },

  createLocomotive() {
    const g = new THREE.Group();
    const bM = new THREE.MeshLambertMaterial({ color: this.C.trainBody });
    const chM = new THREE.MeshLambertMaterial({ color: this.C.trainChimney });

    // 본체
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 3.5), bM);
    body.position.y = 1.2; body.castShadow = true; g.add(body);

    // 보일러
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2, 12), bM);
    boiler.rotation.x = Math.PI / 2; boiler.position.set(0, 1.4, -1.5); boiler.castShadow = true;
    g.add(boiler);

    // 지붕
    g.add(this._box(2.4, 0.2, 2, this.C.trainRoof, 0, 2.1, 0.5));

    // 굴뚝
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 1.2, 8), chM);
    ch.position.set(0, 2.4, -1.8); ch.castShadow = true; g.add(ch);
    const chTop = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.25, 0.3, 8), chM);
    chTop.position.set(0, 3.1, -1.8); g.add(chTop);

    // 얼굴
    const eyeG = new THREE.SphereGeometry(0.18, 8, 8);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupG = new THREE.SphereGeometry(0.1, 8, 8);
    const pupM = new THREE.MeshBasicMaterial({ color: 0x000000 });

    for (let sx of [-0.4, 0.4]) {
      const eye = new THREE.Mesh(eyeG, eyeM);
      eye.position.set(sx, 1.6, -2.55);
      g.add(eye);
      const pup = new THREE.Mesh(pupG, pupM);
      pup.position.set(sx, 1.6, -2.7);
      g.add(pup);
    }

    // 미소
    const smC = new THREE.EllipseCurve(0, 0, 0.3, 0.15, 0, Math.PI, false, 0);
    const sm = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(smC.getPoints(12)),
      new THREE.LineBasicMaterial({ color: 0x000000 })
    );
    sm.position.set(0, 1.15, -2.56); g.add(sm);

    // 창문
    const wM = new THREE.MeshLambertMaterial({ color: this.C.trainWindow });
    for (let s of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.8), wM);
      w.position.set(s * 1.12, 1.6, 0.5); g.add(w);
    }

    // 바퀴
    this.addWheels(g, [[-1, .35, -1.5], [1, .35, -1.5], [-1, .35, 0], [1, .35, 0], [-1, .35, 1.2], [1, .35, 1.2]]);

    // 연결부
    const cp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.6), new THREE.MeshLambertMaterial({ color: 0x555555 }));
    cp.position.set(0, 0.5, 2); g.add(cp);

    return g;
  },

  createWagon(color) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.2, 3), new THREE.MeshLambertMaterial({ color }));
    body.position.y = 1.0; body.castShadow = true; g.add(body);

    this.addWheels(g, [[-0.8, .3, -1], [0.8, .3, -1], [-0.8, .3, 1], [0.8, .3, 1]]);

    const cpM = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const cpFront = new THREE.Mesh(new THREE.BoxGeometry(.25, .25, .5), cpM);
    cpFront.position.set(0, .5, -1.7);
    g.add(cpFront);
    const cpBack = new THREE.Mesh(new THREE.BoxGeometry(.25, .25, .5), cpM);
    cpBack.position.set(0, .5, 1.7);
    g.add(cpBack);

    // 짐
    const cc = [0xD5A76A, 0xC0392B, 0x2ECC71, 0xF1C40F];
    for (let i = 0; i < 2; i++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(.6 + Math.random() * .4, .5 + Math.random() * .3, .6 + Math.random() * .4),
        new THREE.MeshLambertMaterial({ color: cc[Math.floor(Math.random() * cc.length)] })
      );
      c.position.set((Math.random() - .5) * .8, 1.8 + i * .4, (Math.random() - .5) * 1.2);
      c.rotation.y = Math.random() * .3; g.add(c);
    }
    return g;
  },

  addWheels(group, positions) {
    const wG = new THREE.CylinderGeometry(0.3, 0.3, 0.15, 12);
    const wM = new THREE.MeshLambertMaterial({ color: 0x333333 });
    positions.forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wG, wM);
      w.rotation.z = Math.PI / 2; w.position.set(x, y, z);
      group.add(w);
      this.trainWheels.push(w);
    });
  },

  /* ==================== SCENERY ==================== */
  createScenery() {
    // 바깥 나무
    [[28, 5], [30, -8], [26, 12], [32, 0], [25, -15], [35, 10], [33, -12], [27, 18], [38, -5], [24, -20], [40, 8], [36, 15], [42, -3], [29, -22], [34, 20]]
      .forEach(([x, z]) => this.createTree(x, 0, z));

    // 안쪽 나무
    [[0, 0], [3, -4], [-4, 3], [5, 5], [-3, -5], [-6, 0], [0, 7], [7, -2], [-5, -6], [2, -7]]
      .forEach(([x, z]) => this.createTree(x, 0, z));

    // 배경 나무
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 40 + Math.random() * 25;
      this.createTree(Math.cos(a) * d, 0, Math.sin(a) * d, true);
    }

    // 집
    this.createHouse(28, 0, -20, this.C.houseRoof, 0);
    this.createHouse(-28, 0, 15, this.C.houseRoofBlue, Math.PI / 3);
    this.createHouse(15, 0, 28, this.C.houseRoof, -Math.PI / 4);

    // 풍차
    this.createWindmill(-22, 0, -18);

    // 울타리
    this.createFence();

    // 꽃
    this.createFlowers();
  },

  createTree(x, y, z, bg) {
    const tree = new THREE.Group();
    const sc = bg ? .8 + Math.random() * .6 : 1 + Math.random() * .5;
    const type = Math.floor(Math.random() * 3);

    const tH = 1.5 + Math.random() * .5;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(.2 * sc, .3 * sc, tH * sc, 6),
      new THREE.MeshLambertMaterial({ color: this.C.treeTrunk })
    );
    trunk.position.y = tH * sc / 2; trunk.castShadow = true;
    tree.add(trunk);

    const lc = [this.C.treeLeaf, this.C.treeLeafDark, this.C.treeLeafLight];
    const lM = new THREE.MeshLambertMaterial({ color: lc[Math.floor(Math.random() * lc.length)] });

    if (type === 0) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(1.2 * sc, 8, 6), lM);
      l.position.y = tH * sc + .8 * sc; l.castShadow = true; tree.add(l);
    } else if (type === 1) {
      const c1 = new THREE.Mesh(new THREE.ConeGeometry(sc, 2.5 * sc, 8), lM);
      c1.position.y = tH * sc + sc; c1.castShadow = true; tree.add(c1);
      const c2 = new THREE.Mesh(new THREE.ConeGeometry(.7 * sc, 1.8 * sc, 8), lM);
      c2.position.y = tH * sc + 2 * sc; c2.castShadow = true; tree.add(c2);
    } else {
      for (let i = 0; i < 3; i++) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(.7 * sc, 6, 5), lM);
        l.position.set((Math.random() - .5) * .8 * sc, tH * sc + .5 * sc + i * .5 * sc, (Math.random() - .5) * .8 * sc);
        l.castShadow = true; tree.add(l);
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
    wall.position.y = 1.5; wall.castShadow = true; h.add(wall);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 2, 4), rM);
    roof.position.y = 4; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, .7); roof.castShadow = true;
    h.add(roof);

    h.add(this._box(.8, 1.5, .1, this.C.houseDoor, 0, .75, -1.76));
    const winM = new THREE.MeshLambertMaterial({ color: this.C.houseWindow });
    h.add(this._box(.6, .6, .1, null, -1.2, 2, -1.76, winM));
    h.add(this._box(.6, .6, .1, null, 1.2, 2, -1.76, winM));

    const ch = new THREE.Mesh(new THREE.BoxGeometry(.5, 1.5, .5), new THREE.MeshLambertMaterial({ color: 0x7F8C8D }));
    ch.position.set(1, 4.5, 0); h.add(ch);

    h.position.set(x, y, z); h.rotation.y = rot;
    this.houses.push(h);
    this.scene.add(h);
  },

  createWindmill(x, y, z) {
    const g = new THREE.Group();

    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1.5, 6, 8),
      new THREE.MeshLambertMaterial({ color: this.C.windmillBody })
    );
    tower.position.y = 3; tower.castShadow = true; g.add(tower);

    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 1.5, 8),
      new THREE.MeshLambertMaterial({ color: 0xC0392B })
    );
    roof.position.y = 6.75; roof.castShadow = true; g.add(roof);

    g.add(this._box(.7, 1.3, .1, this.C.houseDoor, 0, .65, -1.5));

    // 날개
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

  createFence() {
    const fM = new THREE.MeshLambertMaterial({ color: this.C.fenceWood });
    const R = this.TRACK_RADIUS + 6;
    let prev = null;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * .8 + Math.PI * .6;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;

      const post = new THREE.Mesh(new THREE.CylinderGeometry(.06, .08, 1.2, 5), fM);
      post.position.set(x, .6, z); this.scene.add(post);

      if (prev) {
        for (let ry of [.9, .5]) {
          const rail = new THREE.Mesh(
            new THREE.BoxGeometry(.05, .05, Math.sqrt((x - prev.x) ** 2 + (z - prev.z) ** 2)),
            fM
          );
          rail.position.set((x + prev.x) / 2, ry, (z + prev.z) / 2);
          rail.lookAt(x, ry, z);
          this.scene.add(rail);
        }
      }
      prev = { x, z };
    }
  },

  createFlowers() {
    const colors = [0xFF6B9D, 0xFFD93D, 0xFF6B35, 0xC44DFF, 0xFF4757];
    const sM = new THREE.MeshLambertMaterial({ color: 0x2ECC71 });
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 5 + Math.random() * 5;
      const f = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .4, 4), sM);
      stem.position.y = .2; f.add(stem);
      const petal = new THREE.Mesh(
        new THREE.SphereGeometry(.12, 6, 4),
        new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random() * colors.length)] })
      );
      petal.position.y = .45; f.add(petal);
      f.position.set(Math.cos(a) * d, 0, Math.sin(a) * d);
      this.scene.add(f);
    }
  },

  /* ==================== CLOUDS ==================== */
  createClouds() {
    const cM = new THREE.MeshLambertMaterial({ color: 0xFFFFFF, transparent: true, opacity: .9 });
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 3 + Math.floor(Math.random() * 4); j++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1 + Math.random() * 1.5, 8, 6), cM);
        m.position.set((Math.random() - .5) * 4, (Math.random() - .5), (Math.random() - .5) * 3);
        cloud.add(m);
      }
      cloud.position.set((Math.random() - .5) * 120, 20 + Math.random() * 15, (Math.random() - .5) * 120);
      this.clouds.push({ mesh: cloud, speed: .02 + Math.random() * .03 });
      this.scene.add(cloud);
    }
  },

  /* ==================== SMOKE ==================== */
  updateSmoke() {
    if (!this.isPaused && Math.random() > .5) {
      const sM = new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: .5 });
      const s = new THREE.Mesh(new THREE.SphereGeometry(.2 + Math.random() * .2, 6, 4), sM);
      const p = new THREE.Vector3(0, 3.5, -1.8);
      this.train.children[0].localToWorld(p);
      s.position.copy(p);
      this.smoke.push({ mesh: s, life: 0, maxLife: 60 + Math.random() * 30, vx: (Math.random() - .5) * .02, vy: .05 + Math.random() * .03, vz: (Math.random() - .5) * .02 });
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
        this.scene.remove(s.mesh); s.mesh.material.dispose(); this.smoke.splice(i, 1);
      }
    }
  },

  /* ==================== CAMERA ==================== */
  updateCameraPosition() {
    this.camTheta += (this.targetTheta - this.camTheta) * .05;
    this.camPhi += (this.targetPhi - this.camPhi) * .05;
    this.camRadius += (this.targetRadius - this.camRadius) * .05;

    const y = this.camRadius * Math.cos(this.camPhi);
    const hD = this.camRadius * Math.sin(this.camPhi);
    this.camera.position.set(hD * Math.sin(this.camTheta), y, hD * Math.cos(this.camTheta));
    this.camera.lookAt(0, 0, 0);
  },

  /* ==================== TRAIN MOVEMENT ==================== */
  updateTrain() {
    if (!this.train || this.isPaused) return;
    this.trainAngle -= this.trainSpeed;

    const midR = (this.TRACK_RADIUS + this.TRACK_RADIUS_INNER) / 2;
    const spacing = 4.5 / midR;

    this.train.children.forEach((car, i) => {
      const a = this.trainAngle + i * spacing;
      car.position.set(Math.cos(a) * midR, 0, Math.sin(a) * midR);
      car.rotation.y = -a;
    });

    this.trainWheels.forEach(w => { w.rotation.x += .15; });
  },

  /* ==================== DAY/NIGHT ==================== */
  toggleDayNight() {
    this.isNight = !this.isNight;
    if (this.isNight) {
      this.scene.background.set(this.C.skyNight);
      this.scene.fog.color.set(this.C.skyNight);
      this.groundMesh.material.color.set(this.C.groundNight);
      this.ambientLight.intensity = .2;
      this.hemiLight.intensity = .2;
      this.dirLight.intensity = .3;
      this.dirLight.color.set(0x8888ff);
      this.houses.forEach(h => h.traverse(c => {
        if (c.material?.color?.getHex() === this.C.houseWindow) {
          c.material.color.set(0xFFD700);
          c.material.emissive = new THREE.Color(0xFFD700);
          c.material.emissiveIntensity = .5;
        }
      }));
    } else {
      this.scene.background.set(this.C.skyDay);
      this.scene.fog.color.set(this.C.skyDay);
      this.groundMesh.material.color.set(this.C.groundDay);
      this.ambientLight.intensity = .5;
      this.hemiLight.intensity = .6;
      this.dirLight.intensity = .8;
      this.dirLight.color.set(0xffffff);
      this.houses.forEach(h => h.traverse(c => {
        if (c.material?.emissiveIntensity > 0) {
          c.material.color.set(this.C.houseWindow);
          c.material.emissive = new THREE.Color(0);
          c.material.emissiveIntensity = 0;
        }
      }));
    }
  },

  /* ==================== EVENTS ==================== */
  bindEvents() {
    const _btn = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
      return el;
    };

    _btn('c4-rotate-btn', () => { this.targetTheta += Math.PI / 4; });
    const dnBtn = _btn('c4-daynight-btn', () => {
      this.toggleDayNight();
      if (dnBtn) dnBtn.textContent = this.isNight ? '🌙' : '☀️';
    });
    const plBtn = _btn('c4-play-btn', () => {
      this.isPaused = !this.isPaused;
      if (plBtn) plBtn.textContent = this.isPaused ? '▶️' : '⏸️';
    });
    const spBtn = _btn('c4-speed-btn', () => {
      if (this.trainSpeed < .015) { this.trainSpeed = .02; if (spBtn) spBtn.textContent = '🐇'; }
      else { this.trainSpeed = .008; if (spBtn) spBtn.textContent = '🐢'; }
    });

    // 드래그 회전
    let dragging = false, ds = { x: 0, y: 0 };
    this.container.addEventListener('mousedown', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      dragging = true; ds = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mousemove', (e) => {
      if (!dragging || !this.card.classList.contains('fullscreen')) return;
      this.targetTheta -= (e.clientX - ds.x) * .005;
      this.targetPhi = Math.max(.3, Math.min(Math.PI / 2.2, this.targetPhi + (e.clientY - ds.y) * .003));
      ds = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', () => { dragging = false; });

    // 줌
    this.container.addEventListener('wheel', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      e.preventDefault(); e.stopPropagation();
      this.targetRadius = Math.max(25, Math.min(80, this.targetRadius + e.deltaY * .05));
    }, { passive: false });

    // Touch
    let ts = null, td = 0;
    this.container.addEventListener('touchstart', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      if (e.touches.length === 1) ts = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      else if (e.touches.length === 2) td = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    }, { passive: true });
    this.container.addEventListener('touchmove', (e) => {
      if (!this.card.classList.contains('fullscreen')) return;
      if (e.touches.length === 1 && ts) {
        this.targetTheta -= (e.touches[0].clientX - ts.x) * .008;
        this.targetPhi = Math.max(.3, Math.min(Math.PI / 2.2, this.targetPhi + (e.touches[0].clientY - ts.y) * .005));
        ts = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else if (e.touches.length === 2) {
        const nd = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.targetRadius = Math.max(25, Math.min(80, this.targetRadius - (nd - td) * .1));
        td = nd;
      }
    }, { passive: true });

    window.addEventListener('resize', () => { if (this.isInitialized) this.handleResize(); });
  },

  /* ==================== RESIZE ==================== */
  handleResize() {
    if (!this.renderer || !this.container) return;
    const r = this.container.getBoundingClientRect();
    const w = Math.round(r.width) || 1, h = Math.round(r.height) || 1;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    const cv = this.renderer.domElement;
    cv.style.width = '100%'; cv.style.height = '100%'; cv.style.display = 'block';
  },

  /* ==================== ANIMATE ==================== */
  animate() {
    requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    this.updateTrain();
    this.updateCameraPosition();
    this.updateSmoke();

    // 구름
    this.clouds.forEach(c => { c.mesh.position.x += c.speed; if (c.mesh.position.x > 70) c.mesh.position.x = -70; });

    // 풍차
    if (this.windmillBlade) this.windmillBlade.rotation.z += .02;

    // 물
    if (this.waterMesh) this.waterMesh.material.opacity = .6 + Math.sin(t * 2) * .1;

    // 나무 흔들림
    this.trees.forEach((tr, i) => { tr.rotation.z = Math.sin(t * .5 + i * .3) * .02; });

    this.renderer.render(this.scene, this.camera);
  },
};
