/**
 * ========================================
 * card4.js - Choo-Choo World 트랙 빌더 (최종 수정)
 * ========================================
 */
window.Card4 = {
  card: null,
  container: null,
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  train: null,
  wagonList: [],
  trainWheels: [],
  smoke: [],
  clouds: [],
  trackSegments: [],
  trackGroup: null,
  stationGroup: null,

  // 상태값
  isInitialized: false,
  isActive: false,
  isPaused: true,
  trainSpeed: 0.15, // 이동 속도 조정
  trainDistance: 0,
  trainDirection: 1,
  camTheta: -Math.PI / 2,
  camRadius: 75,
  targetTheta: -Math.PI / 2,

  // 트랙 설정
  SEGMENT_LENGTH: 8,
  CURVE_RADIUS: 10,
  MAX_SEGMENTS: 60,
  TRACK_START_X: -4,
  TRACK_START_Z: 0,
  TRACK_START_ANGLE: 0,

  C: {
    skyDay: 0x87ceeb,
    groundDay: 0x7ec850,
    trackWood: 0xc4944a,
    trackRail: 0x8b7355,
    trainBody: 0xe74c3c,
    wagonBlue: 0x3498db,
  },

  init() {
    this.card = document.querySelector("#card-4");
    this.container = document.querySelector("#train-container");
    if (!this.card || !this.container || this.isInitialized) return;

    this.initThree();
  },

  initThree() {
    this.isInitialized = true;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.C.skyDay);

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.5, 500);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const d = new THREE.DirectionalLight(0xffffff, 0.8);
    d.position.set(50, 50, 20);
    this.scene.add(d);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshLambertMaterial({ color: this.C.groundDay }),
    );
    ground.rotation.x = -Math.PI / 2;
    this.scene.add(ground);

    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);

    // 시작 트랙 2개 자동 설치
    this.addTrackSegment("straight");
    this.addTrackSegment("straight");

    this.createTrain();
    this.bindEvents();
    this.handleResize();
    this.animate();
  },

  // 마지막 트랙의 끝점 정보를 가져오는 함수
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

  /**
   * 충돌 감지 로직 (수정 핵심!)
   */
  checkTrackCollision(newSegment) {
    const minDistance = 3.5;
    const newPoints = newSegment.points;

    // 마지막 트랙(length - 1)은 검사하지 않음! (서로 붙어있어야 하니까)
    for (let i = 0; i < this.trackSegments.length - 1; i++) {
      const existingPoints = this.trackSegments[i].points;

      for (let k = 0; k < newPoints.length; k += 2) {
        const np = newPoints[k];
        for (let j = 0; j < existingPoints.length; j += 2) {
          const ep = existingPoints[j];
          const distSq = (ep.x - np.x) ** 2 + (ep.z - np.z) ** 2;

          if (distSq < minDistance * minDistance) {
            console.warn("트랙이 겹칩니다! 설치 불가.");
            return true;
          }
        }
      }
    }
    return false;
  },

  addTrackSegment(type) {
    if (this.trackSegments.length >= this.MAX_SEGMENTS) return;

    // 1. 마지막 트랙 끝부분 좌표를 시작점으로 잡음
    const start = this.getTrackEnd();

    // 2. 새로운 트랙 데이터 생성
    const segment = this.createTrackSegmentData(
      type,
      start.x,
      start.z,
      start.angle,
    );

    // 3. 충돌 검사 (방금 전 트랙은 제외하고 검사)
    if (this.trackSegments.length > 1 && this.checkTrackCollision(segment)) {
      return;
    }

    // 4. 루프 완성 로직 (시작점 근처면 자동 자석 연결)
    const distToStart = Math.sqrt(
      (segment.endX - this.TRACK_START_X) ** 2 +
        (segment.endZ - this.TRACK_START_Z) ** 2,
    );
    if (this.trackSegments.length > 5 && distToStart < 7) {
      segment.endX = this.TRACK_START_X;
      segment.endZ = this.TRACK_START_Z;
      segment.isLoopCloser = true;
    }

    // 5. 화면에 추가
    segment.mesh = this.createTrackMesh(segment);
    this.trackGroup.add(segment.mesh);
    this.trackSegments.push(segment);
    this.updateTrackCounter();
  },

  createTrackSegmentData(type, startX, startZ, startAngle) {
    const points = [];
    let endX, endZ, endAngle, length;

    if (type === "straight") {
      length = this.SEGMENT_LENGTH;
      endX = startX + Math.cos(startAngle) * length;
      endZ = startZ + Math.sin(startAngle) * length;
      endAngle = startAngle;
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        points.push({
          x: startX + (endX - startX) * t,
          z: startZ + (endZ - startZ) * t,
          angle: startAngle,
        });
      }
    } else {
      const dir = type === "left" ? 1 : -1;
      const curveAngle = (Math.PI / 4) * dir;
      const R = this.CURVE_RADIUS;
      const centerX = startX + Math.cos(startAngle + (Math.PI / 2) * dir) * R;
      const centerZ = startZ + Math.sin(startAngle + (Math.PI / 2) * dir) * R;

      endAngle = startAngle + curveAngle;
      length = R * Math.abs(curveAngle);

      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        const a = startAngle + curveAngle * t;
        const pA = startAngle + (Math.PI / 2) * dir + curveAngle * t;
        points.push({
          x: centerX - Math.cos(pA) * R,
          z: centerZ - Math.sin(pA) * R,
          angle: a,
        });
      }
      const lastP = points[points.length - 1];
      endX = lastP.x;
      endZ = lastP.z;
    }
    return {
      type,
      startX,
      startZ,
      startAngle,
      endX,
      endZ,
      endAngle,
      length,
      points,
      isLoopCloser: false,
    };
  },

  createTrackMesh(segment) {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshLambertMaterial({ color: this.C.trackWood });
    const railMat = new THREE.MeshLambertMaterial({ color: this.C.trackRail });

    segment.points.forEach((p, i) => {
      if (i % 3 !== 0) return;
      const sleeper = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.2, 4.5),
        woodMat,
      );
      sleeper.position.set(p.x, 0.1, p.z);
      sleeper.rotation.y = -p.angle;
      group.add(sleeper);
    });

    [-1, 1].forEach((side) => {
      const railPts = segment.points.map((p) => {
        const ox = -Math.sin(p.angle) * side * 1.6;
        const oz = Math.cos(p.angle) * side * 1.6;
        return new THREE.Vector3(p.x + ox, 0.3, p.z + oz);
      });
      const curve = new THREE.CatmullRomCurve3(railPts);
      const tube = new THREE.TubeGeometry(curve, 20, 0.1, 8, false);
      group.add(new THREE.Mesh(tube, railMat));
    });
    return group;
  },

  updateTrain() {
    if (!this.train || this.isPaused) return;
    const totalLen = this.trackSegments.reduce((s, seg) => s + seg.length, 0);
    if (totalLen < 1) return;

    this.trainDistance += this.trainSpeed * this.trainDirection;
    const lastSeg = this.trackSegments[this.trackSegments.length - 1];
    const isLoop = lastSeg.isLoopCloser;

    if (isLoop) {
      if (this.trainDistance > totalLen) this.trainDistance -= totalLen;
      if (this.trainDistance < 0) this.trainDistance += totalLen;
    } else {
      if (this.trainDistance >= totalLen - 2) this.trainDirection = -1;
      if (this.trainDistance <= 2) this.trainDirection = 1;
    }

    this.train.children.forEach((car, i) => {
      const d = (this.trainDistance - i * 5 + totalLen) % totalLen;
      const pt = this.getPointAt(d);
      car.position.set(pt.x, 0, pt.z);
      car.rotation.y =
        -pt.angle + (this.trainDirection === 1 ? -Math.PI / 2 : Math.PI / 2);
    });
  },

  getPointAt(dist) {
    let acc = 0;
    for (const seg of this.trackSegments) {
      if (acc + seg.length >= dist) {
        const t = (dist - acc) / seg.length;
        const idx = Math.min(
          Math.floor(t * (seg.points.length - 1)),
          seg.points.length - 2,
        );
        return seg.points[idx];
      }
      acc += seg.length;
    }
    return this.trackSegments[0].points[0];
  },

  createTrain() {
    this.train = new THREE.Group();
    const loco = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 4),
      new THREE.MeshLambertMaterial({ color: this.C.trainBody }),
    );
    body.position.y = 1.2;
    loco.add(body);
    this.train.add(loco);
    this.scene.add(this.train);
  },

  bindEvents() {
    const _click = (id, fn) => {
      const el = document.getElementById(id);
      if (el)
        el.onclick = (e) => {
          e.stopPropagation();
          fn();
        };
    };

    _click("c4-add-straight", () => this.addTrackSegment("straight"));
    _click("c4-add-left", () => this.addTrackSegment("left"));
    _click("c4-add-right", () => this.addTrackSegment("right"));
    _click("c4-remove-track", () => {
      if (this.trackSegments.length > 2) {
        const s = this.trackSegments.pop();
        this.trackGroup.remove(s.mesh);
        this.updateTrackCounter();
      }
    });
    _click("c4-play-btn", () => {
      this.isPaused = !this.isPaused;
      document.getElementById("c4-play-btn").textContent = this.isPaused
        ? "▶️"
        : "⏸️";
    });
    _click("c4-rotate-btn", () => {
      this.targetTheta += Math.PI / 2;
    });

    let drag = false,
      lastX;
    this.container.onmousedown = (e) => {
      drag = true;
      lastX = e.clientX;
    };
    window.onmousemove = (e) => {
      if (drag) {
        this.targetTheta -= (e.clientX - lastX) * 0.01;
        lastX = e.clientX;
      }
    };
    window.onmouseup = () => (drag = false);
  },

  updateTrackCounter() {
    document.getElementById("c4-track-count").textContent =
      this.trackSegments.length;
  },

  handleResize() {
    const r = this.container.getBoundingClientRect();
    this.camera.aspect = r.width / r.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(r.width, r.height);
  },

  animate() {
    requestAnimationFrame(() => this.animate());
    this.updateTrain();
    this.camTheta += (this.targetTheta - this.camTheta) * 0.1;
    this.camera.position.set(
      Math.cos(this.camTheta) * this.camRadius,
      45,
      Math.sin(this.camTheta) * this.camRadius,
    );
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  },
};
