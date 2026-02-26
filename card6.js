window.Card6 = {
  card: null,
  container: null,
  tooltip: null,
  parallaxText: null,
  scene: null,
  camera: null,
  renderer: null,
  clock: null,
  raycaster: new THREE.Raycaster(),
  mouse: new THREE.Vector2(-1, -1),

  nodes: [],
  linesMesh: null,
  activeConnections: [],
  pulses: [],
  pulseGroup: null,

  isInitialized: false,
  isActive: false,
  isZoomed: false,
  zoomNode: null,
  isHoveringSpecial: false,
  lastHoveredId: null,

  scroll: 0,
  targetScroll: 0,
  customTime: 0,
  hueTime: 0, // 항상 진행 (hover/zoom 정지 무관)
  accentColor: null,
  lineColor: "#223355",
  auroraLayers: null,
  auroraCurtains: null,

  // Radio 선택: 하나의 special 노드만 선택 가능
  selectedNode: null,

  // 재사용 Vector3 (per-frame 할당 방지)
  _v3ScaleSelected: null,
  _v3ScaleHovered: null,
  _v3ScaleNormal: null,
  _v3CamTarget: null,

  // Three.js 공간음향 (AudioListener → 카메라, PositionalAudio → 선택된 노드)
  listener: null, // THREE.AudioListener
  positionalAudio: null, // THREE.PositionalAudio
  audioEl: null,

  // 공개 도메인 클래식 음악 10곡 (special 노드 10개에 1:1 매핑)
  // Wikimedia Commons 음원 — CORS 지원, 공개 도메인
  TRACKS: [
    {
      title: "01-Beethoven-Piano_Sonata_No32_op111-Michelangeli1962-Track01",
      composer: "Beethoven",
      scr: "/Song/01.mp3",
    },
    {
      title: "02-Beethoven-Piano_Sonata_No32_op111-Michelangeli1962-Track02",
      composer: "Beethoven",
      scr: "/Song/02.mp3",
    },
    {
      title: "03-Beethoven-Piano_Sonata_No3_op2-3-Michelangeli1962-Track1",
      composer: "Beethoven",
      scr: "/Song/03.mp3",
    },
    {
      title: "04-Beethoven-Piano_Sonata_No3_op2-3-Michelangeli1962-Track2",
      composer: "Beethoven",
      scr: "/Song/04.mp3",
    },
    {
      title: "05-Beethoven-Piano_Sonata_No3_op2-3-Michelangeli1962-Track3",
      composer: "Beethoven",
      scr: "/Song/05.mp3",
    },
    {
      title: "06-Beethoven-Piano_Sonata_No3_op2-3-Michelangeli1962-Track4",
      composer: "Beethoven",
      scr: "/Song/06.mp3",
    },
    {
      title: "07-Galuppi-Piano_Sonata_in_C-Michelangeli1962-Track1",
      composer: "Galuppi",
      scr: "/Song/07.mp3",
    },
    {
      title: "08-Galuppi-Piano_Sonata_in_C-Michelangeli1962-Track2",
      composer: "Galuppi",
      scr: "/Song/08.mp3",
    },
    {
      title: "09-Galuppi-Piano_Sonata_in_C-Michelangeli1962-Track3",
      composer: "Galuppi",
      scr: "/Song/09.mp3",
    },
    {
      title: "10-Scarlatti-Sonata_K11-Michelangeli1962",
      composer: "Galuppi",
      scr: "/Song/10.mp3",
    },
    {
      title: "11-Scarlatti-Sonata_K159-Michelangeli1962",
      composer: "Galuppi",
      scr: "/Song/11.mp3",
    },
    {
      title: "12-Scarlatti-Sonata_K322-Michelangeli1962",
      composer: "Galuppi",
      scr: "/Song/12.mp3",
    },
    {
      title: "13-Scarlatti-Sonata_K27-Michelangeli1962",
      composer: "Galuppi",
      scr: "/Song/13.mp3",
    },
  ],

  init() {
    this.card = document.querySelector("#card-6");
    this.container = document.querySelector("#three-container-6");
    if (!this.card || !this.container) return;
    if (this.isInitialized) return;

    this.setupTheme();
    this.createDOM();
    this.initThree();
    this.bindEvents();

    new ResizeObserver(() => this.handleResize()).observe(this.container);
    this.isInitialized = true;
    this.animate();
  },

  setupTheme() {
    const hues = [180, 260, 320, 150];
    const selected = hues[Math.floor(Math.random() * hues.length)];
    this.accentColor = `hsl(${selected}, 100%, 75%)`;
    document.documentElement.style.setProperty(
      "--aurora-color",
      this.accentColor,
    );
    document.documentElement.style.setProperty(
      "--node-accent",
      this.accentColor,
    );
  },

  createDOM() {
    // 오로라 레이어 5개 + 정지 버튼
    this.container.innerHTML = `
      <div id="aurora-bg-6">
        <div class="aurora-layer"></div>
        <div class="aurora-layer"></div>
        <div class="aurora-layer"></div>
        <div class="aurora-layer"></div>
        <div class="aurora-layer"></div>
      </div>
      <div id="parallax-text-6"></div>
      <div id="node-tooltip-6">
        <div class="tooltip-content">
          <div class="typewriter" id="tp-id"></div>
          <div class="typewriter" id="tp-stat"></div>
          <div class="typewriter" id="tp-sig"></div>
        </div>
      </div>
      <button id="c6-stop-btn" title="재생 중단">
        <span class="c6-stop-icon">■</span>
        <span class="c6-stop-label">STOP</span>
        <span class="c6-stop-track"></span>
      </button>
    `;
    this.tooltip = document.querySelector("#node-tooltip-6");
    this.parallaxText = document.querySelector("#parallax-text-6");
  },

  createNodes() {
    const numSpecial = this.TRACKS.length;     // tracks 수 = special 노드 수
    const numNormal  = numSpecial * 5;         // 일반 노드는 special의 5배
    const specialGeo = new THREE.OctahedronGeometry(0.4, 0);
    const normalGeo  = new THREE.IcosahedronGeometry(0.18, 0);
    const glowGeo    = new THREE.SphereGeometry(0.75, 12, 12);

    const matAccent = new THREE.MeshBasicMaterial({ color: new THREE.Color(this.accentColor) });
    const matWhite  = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });

    // ── Special 노드: TRACKS.length 개, 각각 랜덤 t → 포메이션 내 랜덤 위치 ──
    for (let s = 0; s < numSpecial; s++) {
      const t = Math.random();   // 0~1 랜덤 → 포메이션 위치 랜덤화
      const mesh = new THREE.Mesh(specialGeo, matAccent.clone());

      const glowMat  = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.accentColor),
        transparent: true, opacity: 0, side: THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      mesh.add(glowMesh);

      const targets = {};
      ["sphere", "helix", "cube", "torus", "scatter"].forEach((f) => {
        targets[f] = this.getFormationPos(t, f);
      });

      mesh.position.set(...targets.scatter);
      mesh.userData = {
        id: s + 1001,
        isSpecial: true,
        isSelected: false,
        trackIndex: s,
        power: Math.floor(Math.random() * 100),
        originalColor: new THREE.Color(this.accentColor),
        glowMesh,
      };
      this.scene.add(mesh);
      this.nodes.push({ mesh, targets, isSpecial: true });
    }

    // ── 일반 노드: 균등 배치 (순차 t) ────────────────────────────────────
    for (let n = 0; n < numNormal; n++) {
      const t = n / numNormal;
      const mesh = new THREE.Mesh(normalGeo, matWhite.clone());

      const targets = {};
      ["sphere", "helix", "cube", "torus", "scatter"].forEach((f) => {
        targets[f] = this.getFormationPos(t, f);
      });

      mesh.position.set(...targets.scatter);
      mesh.userData = {
        id: n + 101,
        isSpecial: false,
        isSelected: false,
        trackIndex: -1,
        power: Math.floor(Math.random() * 100),
        glowMesh: null,
      };
      this.scene.add(mesh);
      this.nodes.push({ mesh, targets, isSpecial: false });
    }

    const lineGeo = new THREE.BufferGeometry();
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(this.lineColor),
      transparent: true,
      opacity: 0.2,
    });
    this.linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    this.scene.add(this.linesMesh);

    this.pulseGroup = new THREE.Group();
    this.scene.add(this.pulseGroup);
  },

  // t: 0~1 (포메이션 내 위치 비율) — special 노드는 랜덤값, 일반 노드는 순차값
  getFormationPos(t, type) {
    const pi = Math.PI;
    switch (type) {
      case "sphere":
        return [
          10 * Math.sin(pi * t) * Math.cos(4 * pi * t),
          10 * Math.sin(pi * t) * Math.sin(4 * pi * t),
          10 * Math.cos(pi * t),
        ];
      case "helix":
        return [7 * Math.cos(t * 12), (t - 0.5) * 22, 7 * Math.sin(t * 12)];
      case "cube": {
        // t → 4×4×4 grid index
        const idx = Math.floor(t * 64) % 64;
        return [
          ((idx % 4) - 1.5) * 5,
          ((Math.floor(idx / 4) % 4) - 1.5) * 5,
          (Math.floor(idx / 16) - 1.5) * 5,
        ];
      }
      case "torus":
        return [
          (9 + 3 * Math.cos(t * 20)) * Math.cos(t * 2 * pi),
          (9 + 3 * Math.cos(t * 20)) * Math.sin(t * 2 * pi),
          3 * Math.sin(t * 20),
        ];
      default: // scatter
        return [
          (Math.random() - 0.5) * 35,
          (Math.random() - 0.5) * 35,
          (Math.random() - 0.5) * 35,
        ];
    }
  },

  updateLines() {
    const positions = [];
    this.activeConnections = [];
    const maxDistSq = 64;
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const p1 = this.nodes[i].mesh.position;
        const p2 = this.nodes[j].mesh.position;
        if (p1.distanceToSquared(p2) < maxDistSq) {
          positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
          this.activeConnections.push({ a: p1, b: p2 });
        }
      }
    }
    this.linesMesh.geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    this.linesMesh.geometry.attributes.position.needsUpdate = true;
  },

  triggerPulse() {
    if (this.activeConnections.length === 0) return;
    const conn =
      this.activeConnections[
        Math.floor(Math.random() * this.activeConnections.length)
      ];
    const hue = (this.hueTime * 0.08) % 1;
    const pulseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue, 1, 0.75),
        transparent: true,
        opacity: 0.8,
      }),
    );
    this.pulseGroup.add(pulseMesh);
    this.pulses.push({
      mesh: pulseMesh,
      start: conn.a.clone(),
      end: conn.b.clone(),
      life: 0,
      speed: 0.02,
    });
  },

  /* ==================== AUDIO (Three.js Spatial) ==================== */

  // THREE.PositionalAudio + THREE.AudioListener로 Web Audio 공간음향 구현.
  // AudioListener는 initThree()에서 카메라에 부착 → renderer.render() 시
  // Three.js가 자동으로 listener 위치를 업데이트.
  // PositionalAudio는 선택된 노드 mesh에 부착 → 노드 이동과 함께 panner 위치 자동 갱신.
  initAudio() {
    if (this.positionalAudio) return;
    try {
      this.audioEl = new Audio();
      this.audioEl.crossOrigin = "anonymous";
      this.audioEl.loop = true;

      // THREE.PositionalAudio — HRTF 입체 공간음향 (PannerNode 내장)
      this.positionalAudio = new THREE.PositionalAudio(this.listener);
      this.positionalAudio.setMediaElementSource(this.audioEl);
      // refDistance = 35: 카메라 궤도 반경과 동일 → 궤도 중 항상 최대 음량
      // rolloffFactor = 0.4: 완만한 감쇠 → 먼 거리에서도 충분히 들림
      // maxDistance = 500: 사실상 거리 한계 없음
      this.positionalAudio.setRefDistance(35);
      this.positionalAudio.setMaxDistance(500);
      this.positionalAudio.setRolloffFactor(0.4);
      this.positionalAudio.setVolume(1.0);
    } catch (e) {
      console.warn("PositionalAudio 초기화 실패:", e);
      this.positionalAudio = null;
    }
  },

  // 즉시 재생 중단: 선택 해제 + 오디오 정지 + 버튼 숨김
  stopPlayback() {
    if (this.selectedNode) {
      this.selectedNode.userData.isSelected = false;
      const gm = this.selectedNode.userData.glowMesh;
      if (gm) gm.material.opacity = 0;
      if (this.positionalAudio) {
        this.selectedNode.remove(this.positionalAudio);
      }
      this.selectedNode = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    this.isZoomed = false;
    this.zoomNode = null;
    this._updateStopBtn();
  },

  // 정지 버튼 표시/숨김 + 트랙명 갱신
  _updateStopBtn() {
    const btn = document.getElementById("c6-stop-btn");
    if (!btn) return;
    const isPlaying = this.selectedNode && this.audioEl && !this.audioEl.paused;
    btn.classList.toggle("visible", !!isPlaying);
    if (isPlaying) {
      const track = this.TRACKS[this.selectedNode.userData.trackIndex];
      const label = btn.querySelector(".c6-stop-track");
      if (label && track) label.textContent = `${track.composer} — ${track.title}`;
    }
  },

  // Radio 선택: 같은 노드 재클릭 시 해제, 다른 노드 클릭 시 교체.
  // PositionalAudio를 이전 mesh에서 제거하고 새 mesh에 부착.
  selectNode(nodeData) {
    const mesh = nodeData.mesh;
    const isSame = this.selectedNode === mesh;

    // 현재 선택 해제
    if (this.selectedNode) {
      this.selectedNode.userData.isSelected = false;
      const gm = this.selectedNode.userData.glowMesh;
      if (gm) gm.material.opacity = 0;
      // PositionalAudio를 이전 노드에서 분리
      if (this.positionalAudio) {
        this.selectedNode.remove(this.positionalAudio);
      }
      this.selectedNode = null;
    }
    if (this.audioEl) {
      this.audioEl.pause();
      this.audioEl.currentTime = 0;
    }
    this.isZoomed = false;
    this.zoomNode = null;
    this._updateStopBtn();

    if (isSame) return; // 토글 OFF

    // 새 노드 선택
    this.selectedNode = mesh;
    mesh.userData.isSelected = true;
    this.isZoomed = true;
    this.zoomNode = mesh;

    const track = this.TRACKS[mesh.userData.trackIndex];
    if (!track) return;

    this.initAudio();
    if (!this.positionalAudio || !this.audioEl) return;

    // PositionalAudio를 선택된 노드 mesh에 부착
    // → Three.js가 render() 시 panner 위치를 mesh 위치와 동기화
    mesh.add(this.positionalAudio);

    // 음소거 상태면 볼륨 0으로 재생 (재생 자체는 진행)
    const isMuted = !document
      .getElementById("mute-btn")
      ?.classList.contains("unmuted");
    this.positionalAudio.setVolume(isMuted ? 0 : 1.0);

    this.audioEl.src = track.scr;
    const ctx = this.listener.context;
    ctx.resume().then(() => {
      this.audioEl
        .play()
        .then(() => this._updateStopBtn())
        .catch((e) => console.warn("재생 실패:", e));
    });
  },

  /* ==================== AURORA COLOR ANIMATION ==================== */

  updateAuroraColors(t) {
    if (!this.auroraLayers || this.auroraLayers.length === 0) {
      this.auroraLayers = document.querySelectorAll("#aurora-bg-6 .aurora-layer");
    }

    this.auroraLayers.forEach((layer, i) => {
      // 레이어마다 다른 속도·위상 — 느리게 순환 (t*5: 이전 t*11보다 절반 이하)
      const hue1 = (t * 5 + i * 62) % 360;
      const hue2 = (hue1 + 50 + Math.sin(t * 0.25 + i) * 20) % 360;

      // 타원형 그라디언트 중심·크기 — 이전보다 느리고 이동 폭 줄임
      const cx = 48 + Math.sin(t * 0.15 + i * 1.25) * 28;
      const cy = 45 + Math.cos(t * 0.12 + i * 0.95) * 28;
      const rw = 54 + Math.sin(t * 0.08 + i * 2.0) * 22;
      const rh = 30 + Math.cos(t * 0.10 + i * 1.6) * 15;

      // blur 완만한 변동 (±8px) — 이전 ±30px에서 대폭 줄임
      const blurPx = 65 + Math.sin(t * 0.6 + i * 0.75) * 8;
      layer.style.filter = `blur(${blurPx}px)`;

      // opacity — 아주 느린 맥박 (±0.08), 급격한 깜박임 없음
      const op = 0.72 + Math.sin(t * 0.4 + i * 1.1) * 0.08;
      layer.style.opacity = op;

      layer.style.background =
        `radial-gradient(ellipse ${rw}% ${rh}% at ${cx}% ${cy}%, ` +
        `hsl(${hue1},85%,58%) 0%, ` +
        `hsl(${hue2},80%,40%) 45%, transparent 72%)`;
    });
  },

  /* ==================== NODE COLOR ANIMATION ==================== */

  updateNodeColors(t) {
    this.nodes.forEach((n, i) => {
      const ud = n.mesh.userData;
      if (n.isSpecial) {
        if (ud.isSelected) {
          // 선택됨: 금/흰색 펄스 + 회전
          const pulse = 0.5 + Math.sin(t * 7) * 0.5;
          n.mesh.material.color.setHSL(
            0.12 + pulse * 0.05,
            1,
            0.75 + pulse * 0.2,
          );
          n.mesh.scale.lerp(this._v3ScaleSelected, 0.1);
          n.mesh.rotation.y += 0.04;
          // 외곽 glow 구체 — 선택된 노드만 빛남
          if (ud.glowMesh) {
            ud.glowMesh.material.opacity = 0.22 + Math.sin(t * 5) * 0.14;
            ud.glowMesh.scale.setScalar(1.4 + Math.sin(t * 4) * 0.3);
            ud.glowMesh.material.color.setHSL(0.12 + pulse * 0.05, 1, 0.92);
          }
        } else {
          // 미선택 special: 자연스러운 무지개 색상 순환
          const hue = (t * 0.07 + i * 0.13) % 1;
          n.mesh.material.color.setHSL(hue, 1, 0.72);
          n.mesh.scale.lerp(this._v3ScaleNormal, 0.08);
          if (ud.glowMesh) ud.glowMesh.material.opacity = 0;
        }
      } else {
        // 일반 노드: 은은한 무지개 + opacity 맥박
        const hue = (t * 0.04 + i * 0.018) % 1;
        const opc = 0.22 + Math.sin(t * 0.4 + i * 0.31) * 0.14;
        n.mesh.material.color.setHSL(hue, 0.55, 0.82);
        n.mesh.material.opacity = Math.max(0.08, Math.min(0.52, opc));
      }
    });

    // 연결선 색상: 시간에 따라 자연스럽게 변화
    if (this.linesMesh) {
      const lh = (t * 0.04) % 1;
      this.linesMesh.material.color.setHSL(lh, 0.7, 0.42);
      this.linesMesh.material.opacity = 0.14 + Math.sin(t * 0.3) * 0.07;
    }
  },

  /* ==================== THREE.JS INIT ==================== */

  initThree() {
    this._v3ScaleSelected = new THREE.Vector3(2.3, 2.3, 2.3);
    this._v3ScaleHovered  = new THREE.Vector3(1.8, 1.8, 1.8);
    this._v3ScaleNormal   = new THREE.Vector3(1, 1, 1);
    this._v3CamTarget     = new THREE.Vector3();

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    this.camera.position.z = 35;

    // THREE.AudioListener를 카메라에 부착
    // → renderer.render() 시 Three.js가 AudioContext listener 위치를 자동 갱신
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.container.appendChild(this.renderer.domElement);
    this.createNodes();
    this.handleResize();
  },

  bindEvents() {
    const updateMouse = (e) => {
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    this.container.addEventListener("mousemove", updateMouse);

    // 정지 버튼 클릭 → 즉시 재생 중단
    const stopBtn = document.getElementById("c6-stop-btn");
    if (stopBtn) {
      stopBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.stopPlayback();
      });
    }

    // 클릭 → radio 선택 (풀스크린 전용)
    this.container.addEventListener("click", (e) => {
      if (!this.isActive) return;
      if (!this.card.classList.contains("fullscreen")) return;
      updateMouse(e);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const targets = this.nodes.filter((n) => n.isSpecial).map((n) => n.mesh);
      const hits = this.raycaster.intersectObjects(targets);

      if (hits.length > 0) {
        const nodeData = this.nodes.find((n) => n.mesh === hits[0].object);
        if (nodeData) this.selectNode(nodeData);
        e.stopPropagation();
      } else {
        if (this.isZoomed) {
          this.isZoomed = false;
          this.zoomNode = null;
        }
      }
    });

    window.addEventListener(
      "wheel",
      (e) => {
        if (
          !this.isActive ||
          !this.card.classList.contains("fullscreen") ||
          this.isHoveringSpecial
        )
          return;
        this.targetScroll = Math.max(
          0,
          Math.min(100, this.targetScroll + e.deltaY * 0.05),
        );
      },
      { passive: true },
    );
  },

  handleResize() {
    if (!this.renderer || !this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  },

  updateScene(dt) {
    this.hueTime += dt; // 항상 진행

    const isFullscreen = this.card.classList.contains("fullscreen");

    // Raycasting: 풀스크린에서만 실행 (비풀스크린에서 hover 효과 전부 차단)
    let hovered = null;
    if (isFullscreen) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const specialMeshes = this.nodes
        .filter((n) => n.isSpecial)
        .map((n) => n.mesh);
      const intersects = this.raycaster.intersectObjects(specialMeshes);
      hovered = intersects.length > 0 ? intersects[0] : null;
    }

    this.isHoveringSpecial = !!hovered;
    const effectiveDt = this.isHoveringSpecial || this.isZoomed ? 0 : dt;
    this.customTime += effectiveDt;

    // 오로라 배경 색상 + 커튼 (매 프레임)
    this.updateAuroraColors(this.hueTime);

    // Scroll & Formations
    this.scroll += (this.targetScroll - this.scroll) * 0.1;
    const progress = this.scroll / 100;
    const formations = ["SPHERE", "HELIX", "CUBE", "TORUS", "SCATTER"];
    const step = 1 / (formations.length - 1);
    const idx = Math.min(Math.floor(progress / step), formations.length - 2);
    const sub = (progress % step) / step;

    if (sub > 0.05 && sub < 0.95) {
      this.parallaxText.textContent = formations[idx + 1];
      this.parallaxText.style.opacity = Math.sin(sub * Math.PI) * 0.5;
    } else {
      this.parallaxText.style.opacity = 0;
    }

    this.nodes.forEach((n) => {
      const p1 = n.targets[formations[idx].toLowerCase()];
      const p2 = n.targets[formations[idx + 1].toLowerCase()];
      this._v3CamTarget.set(
        p1[0] + (p2[0] - p1[0]) * sub,
        p1[1] + (p2[1] - p1[1]) * sub,
        p1[2] + (p2[2] - p1[2]) * sub,
      );
      const targetPos = this._v3CamTarget;

      if (hovered && hovered.object === n.mesh) {
        n.mesh.scale.lerp(this._v3ScaleHovered, 0.1);
      } else if (n.mesh.userData.isSelected) {
        // 선택된 노드는 포메이션에 느리게 따라감
        n.mesh.position.lerp(targetPos, 0.03);
      } else {
        n.mesh.position.lerp(targetPos, 0.05);
        if (n.isSpecial) n.mesh.rotation.y += effectiveDt * 1.5;
      }
    });

    // 노드 & 라인 색상 애니메이션
    this.updateNodeColors(this.hueTime);

    this.updateLines();

    // Pulse
    if (!this.isHoveringSpecial && Math.random() < 0.12) this.triggerPulse();
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.life += p.speed;
      p.mesh.position.lerpVectors(p.start, p.end, p.life);
      if (p.life >= 1) {
        this.pulseGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.pulses.splice(i, 1);
      } else {
        p.mesh.material.opacity = Math.sin(p.life * Math.PI) * 0.8;
      }
    }

    // 공간음향: THREE.PositionalAudio + AudioListener가 renderer.render() 시
    // 자동으로 위치를 갱신하므로 수동 업데이트 불필요.

    // Tooltip (풀스크린 전용 — hovered는 isFullscreen일 때만 non-null)
    if (hovered) {
      const d = hovered.object.userData;
      const track = d.trackIndex >= 0 ? this.TRACKS[d.trackIndex] : null;

      if (this.lastHoveredId !== d.id) {
        this.lastHoveredId = d.id;
        this.tooltip.classList.remove("visible");
        ["tp-id", "tp-stat", "tp-sig"].forEach(
          (id) => (document.getElementById(id).textContent = ""),
        );
        void this.tooltip.offsetWidth;

        document.getElementById("tp-id").textContent = track
          ? `> ${track.title}`
          : `> REF_ID: ${d.id}`;
        document.getElementById("tp-stat").textContent = track
          ? `> ${track.composer}`
          : `> SIGNAL: ${d.power}% STABLE`;
        document.getElementById("tp-sig").textContent = d.isSelected
          ? `> ♪ PLAYING`
          : `> CLICK TO PLAY`;
        this.tooltip.classList.add("visible");
      } else {
        // hover 중에도 재생 상태 동적 반영
        const sigEl = document.getElementById("tp-sig");
        if (sigEl) {
          sigEl.textContent = d.isSelected ? `> ♪ PLAYING` : `> CLICK TO PLAY`;
        }
      }

      const rect = this.container.getBoundingClientRect();
      this.tooltip.style.left = `${((this.mouse.x + 1) / 2) * rect.width + 25}px`;
      this.tooltip.style.top = `${(-(this.mouse.y - 1) / 2) * rect.height - 50}px`;
    } else {
      if (this.lastHoveredId !== null) {
        this.tooltip.classList.remove("visible");
        this.lastHoveredId = null;
      }
    }

    // Camera
    if (this.isZoomed && this.zoomNode) {
      this._v3CamTarget.copy(this.zoomNode.position).add({ x: 0, y: 0, z: 7 });
      this.camera.position.lerp(this._v3CamTarget, 0.1);
      this.camera.lookAt(this.zoomNode.position);
    } else {
      const camX = Math.cos(this.customTime * 0.15) * 35;
      const camZ = Math.sin(this.customTime * 0.15) * 35;
      this._v3CamTarget.set(camX, 4, camZ);
      this.camera.position.lerp(this._v3CamTarget, 0.05);
      this.camera.lookAt(0, 0, 0);
    }
  },

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.isActive) {
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }
    const dt = this.clock.getDelta();
    this.updateScene(dt);
    // renderer.render()이 scene graph를 순회하면서
    // AudioListener와 PositionalAudio의 updateMatrixWorld()를 호출하여
    // AudioContext listener/panner 위치를 자동 갱신
    if (this.renderer) this.renderer.render(this.scene, this.camera);
  },

  activate() {
    this.isActive = true;
    this.handleResize();
    if (this.clock) this.clock.getDelta();
    // 복귀 시 선택된 노드의 음악 재개
    if (this.listener && this.selectedNode && this.audioEl) {
      this.listener.context.resume().then(() => {
        this.audioEl
          .play()
          .then(() => this._updateStopBtn())
          .catch(() => {});
      });
    }
  },

  deactivate() {
    this.isActive = false;
    this.isZoomed = false;
    this.zoomNode = null;
    if (this.tooltip) this.tooltip.classList.remove("visible");
    // 카드 비활성화 시 음악 일시 정지
    if (this.audioEl && !this.audioEl.paused) this.audioEl.pause();
    if (this.listener && this.listener.context.state !== "closed") {
      this.listener.context.suspend();
    }
  },
};

window.addEventListener("load", () => Card6.init());
