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
  _mobileHoveredNode: null, // 모바일 1탭으로 고정된 hover 노드

  scroll: 0,
  targetScroll: 0,
  customTime: 0,
  hueTime: 0, // 항상 진행 (hover/zoom 정지 무관)
  accentColor: null,
  lineColor: "#3366cc",
  auroraScene: null,
  auroraCamera: null,
  auroraMesh: null,
  starsMesh: null, // 여기! 배경 별자리용 메쉬 추가
  shootingStars: [],

  // Radio 선택: 하나의 special 노드만 선택 가능
  selectedNode: null,

  // 재사용 Vector3 (per-frame 할당 방지)
  _v3ScaleSelected: null,
  _v3ScaleHovered: null,
  _v3ScaleNormal: null,
  _v3CamTarget: null,

  audioLoader: null,
  audioListener: null,
  positionalAudio: null,
  _rawCache: {},    // src → ArrayBuffer (압축 MP3, ~3-8MB/track, 프리페치 저장소)
  _bufferCache: {}, // src → AudioBuffer (디코딩 완료, 재생된 트랙만)

  // 공개 도메인 클래식 음악 13곡 — Internet Archive "Classical Music Mix" (Public Domain Mark 1.0)
  // https://archive.org/details/classical-music-mix-by-various-artists
  TRACKS: [
    {
      title: "Moonlight Sonata — Adagio / Presto",
      composer: "Beethoven",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/07%20-%20Beethoven%20-%20Piano%20Sonata%2C%20No.%2014%20in%20C%23%20Minor%2C%20Op.%2027%2C%20No.%202%2C%20Moonlight%20Adagio_Presto.mp3",
    },
    {
      title: "Für Elise",
      composer: "Beethoven",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/18%20-%20Beethoven%20-%20Fur%20Elise%20(Original).mp3",
    },
    {
      title: "Étude in E Major, Op. 10 No. 3 (Tristesse)",
      composer: "Chopin",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/04%20-%20Chopin%20-%20Etude%20in%20E%20Major%2C%20Op.%2010%2C%20No.%203.mp3",
    },
    {
      title: "Waltz No. 6 in D♭ Major, Op. 64 No. 1",
      composer: "Chopin",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/10%20-%20Chopin%20-%20Waltz%20No.%206%20in%20Db%20Major%2C%20Op.%2064%2C%20No.%201.mp3",
    },
    {
      title: "Piano Concerto No. 2 in C Minor — Moderato",
      composer: "Rachmaninov",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/06%20-%20Rachmaninov%20-%20Piano%20Concert%2C%20No.%202%20in%20C%20Minor%2C%20Op.%2018%2C%20Moderato.mp3",
    },
    {
      title: "Piano Concerto No. 2 in C Minor — Adagio sostenuto",
      composer: "Rachmaninov",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/08%20-%20Rachmaninov%20-%20Piano%20Concerto%20No.%202%20in%20C%20Minor%2C%20Op.%2018%2C%20Adagio%20sostenuto.mp3",
    },
    {
      title: "Scenes from Childhood, Op. 15",
      composer: "Schumann",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/09%20-%20Schumann%20-%20Scenes%20from%20childhood%2C%20Op.%2015.mp3",
    },
    {
      title: "Canon in D Major",
      composer: "Pachelbel",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/10%20-%20Pachelbel%20-%20Canon%20in%20D%20Major.mp3",
    },
    {
      title: "Rondo alla Turca, K. 331",
      composer: "Mozart",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/12%20-%20Mozart%20-%20Rondo%20a%20la%20Turc%2C%20K331%2C%20No.%203.mp3",
    },
    {
      title: "Hungarian Fantasy for Piano and Orchestra",
      composer: "Liszt",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/13%20-%20Liszt%20-%20Hungarian%20Fantasy%20for%20Piano%20and%20Orchestra.mp3",
    },
    {
      title: "Peer Gynt Suite No. 1, Op. 46",
      composer: "Grieg",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/18%20-%20Grieg%20-%20Per%20Gynt%20Suite%20No.%201%2C%20Op%2064.mp3",
    },
    {
      title: "Pictures at an Exhibition",
      composer: "Mussorgsky",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/19%20-%20Mussorgsky%20-%20Pictures%20at%20an%20Exhibition.mp3",
    },
    {
      title: "Piano Concerto No. 1 in B♭ Minor — Allegro non troppo",
      composer: "Tchaikovsky",
      scr: "https://archive.org/download/classical-music-mix-by-various-artists/05%20-%20Tchaikovsky%20-%20Piano%20Concerto%20No.%201%20in%20B%20flat%20Minor%2C%20Op.%2023%2C%20Allegro%20non%20troppo.mp3",
    },
  ],

  init() {
    this.card = document.querySelector("#card-6");
    this.container = document.querySelector("#three-container-6");
    if (!this.card || !this.container) return;
    if (this.isInitialized) return;

    // 모바일 감지: pixelRatio 제한·antialias 제어에 사용
    this._isMobile =
      /Mobi|Android|iPad|Tablet/i.test(navigator.userAgent) ||
      ("ontouchstart" in window && window.innerWidth < 1024) ||
      (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent)); // iPadOS 13+

    this.setupTheme();
    this.createDOM();
    this.initThree();
    this.bindEvents();

    new ResizeObserver(() => this.handleResize()).observe(this.container);
    this.isInitialized = true;
    this._boundAnimate = this.animate.bind(this);
    this.animate();
  },

  setupTheme() {
    // 밤하늘 컨셉: 청백색 별빛 계열 (시리우스·베가·알타이르 느낌)
    const hues = [200, 215, 235, 250];
    const selected = hues[Math.floor(Math.random() * hues.length)];
    this.accentColor = `hsl(${selected}, 90%, 80%)`;
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
    // aurora는 WebGL shader로 렌더링 — DOM 레이어 불필요
    this.container.innerHTML = `
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
    const numSpecial = this.TRACKS.length; // tracks 수 = special 노드 수
    const numNormal = numSpecial * 5; // 일반 노드는 special의 5배
    // 8각형 3D 형태: OctahedronGeometry (8면체 — 다이아몬드/크리스탈 형태)
    const specialGeo = new THREE.OctahedronGeometry(0.52, 0);
    const normalGeo = new THREE.OctahedronGeometry(0.19, 0);
    // 별 스파이크 glow: billboard PlaneGeometry + ShaderMaterial (AdditiveBlending)
    const starGlowGeo = new THREE.PlaneGeometry(3, 3);
    const starVert = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const starFrag = `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        // 코어: 밝은 중심
        float core = exp(-r * r * 5.0);
        // 4방향 십자 스파이크 (수평/수직)
        float sx = exp(-p.y*p.y*75.0) * exp(-p.x*p.x*1.1) * max(0.0, 1.0 - r*0.95);
        float sy = exp(-p.x*p.x*75.0) * exp(-p.y*p.y*1.1) * max(0.0, 1.0 - r*0.95);
        // 2방향 대각선 스파이크 (45°, 조금 가늘게)
        float d1 = (p.x + p.y) * 0.7071;
        float d2 = (p.x - p.y) * 0.7071;
        float sd1 = exp(-d2*d2*110.0) * exp(-d1*d1*1.8) * max(0.0, 1.0 - r*1.05) * 0.5;
        float sd2 = exp(-d1*d1*110.0) * exp(-d2*d2*1.8) * max(0.0, 1.0 - r*1.05) * 0.5;
        float brightness = core + (sx + sy) * 0.85 + (sd1 + sd2);
        gl_FragColor = vec4(uColor, clamp(brightness, 0.0, 1.0) * uOpacity);
      }
    `;
    // 투명 hitbox: 클릭 가능 범위 확대 — 시각적 크기는 그대로
    const hitboxGeo = new THREE.SphereGeometry(1.4, 8, 8);
    const hitboxMat = new THREE.MeshBasicMaterial({ visible: false });

    const matWhite = new THREE.MeshBasicMaterial({
      color: 0xddeeff, // 청백색 별빛
      transparent: true,
      opacity: 0.65,
    });

    // ── Special 노드: TRACKS.length 개, 각각 랜덤 t → 포메이션 내 랜덤 위치 ──
    for (let s = 0; s < numSpecial; s++) {
      const t = Math.random(); // 0~1 랜덤 → 포메이션 위치 랜덤화

      // 파스텔 무지개: 각 노드별 고유 hue (균등 분포) — 밝고 다채로운 색
      const nodeHue = s / numSpecial; // 0~1 무지개 분포
      const nodeColor = new THREE.Color().setHSL(nodeHue, 0.7, 0.82);

      const mesh = new THREE.Mesh(
        specialGeo,
        new THREE.MeshBasicMaterial({ color: nodeColor.clone() }),
      );

      const glowMat = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: nodeColor.clone() },
          uOpacity: { value: 0.0 },
        },
        vertexShader: starVert,
        fragmentShader: starFrag,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: false,
        side: THREE.DoubleSide,
      });
      const glowMesh = new THREE.Mesh(starGlowGeo, glowMat);
      this.scene.add(glowMesh);

      // 투명 hitbox child: 실제 노드보다 3배 큰 구체 → 클릭/raycasting 범위 확대
      const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
      hitbox.userData.isHitbox = true;
      mesh.add(hitbox);

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
        nodeHue,
        originalColor: nodeColor.clone(),
        glowMesh,
        hitbox,
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

  /* ==================== AUDIO ==================== */

  initAudio() {
    if (this.audioLoader) return;
    this.audioLoader = new THREE.AudioLoader();
    this._mediaEl = new Audio(this._createSilentWavUrl());
    this._mediaEl.loop = true;
    this.positionalAudio = new THREE.PositionalAudio(this.audioListener);
    // HRTF: Three.js 버전에 따라 메서드 없을 수 있으므로 panner 직접 접근
    if (this.positionalAudio.panner) {
      this.positionalAudio.panner.panningModel = "HRTF";
    }
    this.positionalAudio.setRefDistance(7);
    this.positionalAudio.setMaxDistance(200);
    this.positionalAudio.setRolloffFactor(0);
    this.positionalAudio.setDistanceModel("inverse");
    this.positionalAudio.setLoop(true);
    this.scene.add(this.positionalAudio);

    // 데스크탑: HTMLMediaElement → createMediaElementSource → PositionalAudio panner
    // fetch() CORS preflight 없이 archive.org CDN 직접 접근 가능 + HRTF 3D 패닝 유지
    // 오디오 그래프: _mediaElPlayer → _mediaElSource → panner → gain → listener → destination
    if (!this._isMobile) {
      this._mediaElPlayer = new Audio();
      this._mediaElPlayer.crossOrigin = "anonymous";
      this._mediaElPlayer.loop = true;
      const ctx = this.audioListener.context;
      this._mediaElSource = ctx.createMediaElementSource(this._mediaElPlayer);
      this._mediaElSource.connect(this.positionalAudio.panner);
      this.positionalAudio.panner.connect(this.positionalAudio.gain);
      // positionalAudio.gain은 Three.js Audio 생성자에서 listener.getInput()에 이미 연결됨
    }
  },

  // 즉시 재생 중단: 선택 해제 + 오디오 정지 + 버튼 숨김
  stopPlayback() {
    if (this.selectedNode) {
      this.selectedNode.userData.isSelected = false;
      const gm = this.selectedNode.userData.glowMesh;
      if (gm) gm.material.uniforms.uOpacity.value = 0;
      // hitbox를 원래 크기로 복원
      const hitbox = this.selectedNode.userData.hitbox;
      if (hitbox) hitbox.scale.setScalar(1);
      this.selectedNode = null;
    }
    if (this.positionalAudio && this.positionalAudio.isPlaying) {
      this.positionalAudio.stop();
    }
    if (this._mediaElPlayer && !this._mediaElPlayer.paused) {
      this._mediaElPlayer.pause();
      this._mediaElPlayer.currentTime = 0;
    }
    if (this._mediaEl) {
      this._mediaEl.pause();
      this._mediaEl.currentTime = 0;
    }
    this._clearMediaSession();
    this.isZoomed = false;
    this.zoomNode = null;
    this._audioGain = undefined; // 다음 selectNode 시 거리 기반 볼륨 초기화
    this._updateStopBtn();
  },

  // 정지 버튼 표시/숨김 + 트랙명 갱신
  _updateStopBtn() {
    const btn = document.getElementById("c6-stop-btn");
    if (!btn) return;
    // AudioLoader 성공 시 positionalAudio, CORS 폴백 시 _mediaElPlayer 중 하나를 확인
    const isPlaying =
      this.selectedNode &&
      ((this.positionalAudio?.isPlaying) ||
        (this._mediaElPlayer && !this._mediaElPlayer.paused));
    btn.classList.toggle("visible", !!isPlaying);
    if (isPlaying) {
      const track = this.TRACKS[this.selectedNode.userData.trackIndex];
      const label = btn.querySelector(".c6-stop-track");
      if (label && track)
        label.textContent = `${track.composer} — ${track.title}`;
    }
  },

  // Radio 선택: 같은 노드 재클릭 시 해제, 다른 노드 클릭 시 교체.
  selectNode(nodeData) {
    const mesh = nodeData.mesh;
    const isSame = this.selectedNode === mesh;

    // 현재 선택 해제
    if (this.selectedNode) {
      this.selectedNode.userData.isSelected = false;
      const gm = this.selectedNode.userData.glowMesh;
      if (gm) gm.material.uniforms.uOpacity.value = 0;
      const prevHitbox = this.selectedNode.userData.hitbox;
      if (prevHitbox) prevHitbox.scale.setScalar(1);
      this.selectedNode = null;
    }
    if (this.positionalAudio && this.positionalAudio.isPlaying) {
      this.positionalAudio.stop();
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
    // hitbox를 노드 시각 크기로 축소 (0.52 / 1.4 ≈ 0.371)
    const selHitbox = mesh.userData.hitbox;
    if (selHitbox) selHitbox.scale.setScalar(0.52 / 1.4);

    const track = this.TRACKS[mesh.userData.trackIndex];
    if (!track) return;

    this.initAudio();

    // AudioContext resume: 모바일/태블릿은 user gesture(touchend/click) 내에서만 허용.
    // initThree()에서 생성된 AudioContext는 초기에 suspended 상태 → 여기서 재개.
    const ctx = this.audioListener.context;
    if (ctx.state === "suspended") ctx.resume();
    {
      const unlockSrc = ctx.createBufferSource();
      unlockSrc.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      unlockSrc.connect(ctx.destination);
      unlockSrc.start(0);
    }

    // phantom MediaElement 시작: user gesture 안에서 호출해야 iOS autoplay 정책 허용
    if (this._mediaEl) this._mediaEl.play().catch(() => {});

    // PositionalAudio를 선택된 노드 위치에 즉시 배치
    if (this.positionalAudio) {
      this.positionalAudio.position.copy(mesh.position);
    }

    // 음소거 상태 반영
    const isMuted = !document
      .getElementById("mute-btn")
      ?.classList.contains("unmuted");
    if (this.positionalAudio) {
      this.positionalAudio.setVolume(isMuted ? 0 : 1);
      this._audioGain = undefined; // updateScene 첫 프레임에 거리 기반 값으로 초기화
    }

    const requestedMesh = mesh; // 비동기 완료 전 노드 변경 감지용

    // 모바일: iOS/Android autoplay 정책상 play()는 user gesture 동기 컨텍스트에서만 허용.
    // HTMLMediaElement 직접 재생 (WebAudio 우회) — 공간음향 없이 안정적 재생 보장.
    if (this._isMobile) {
      if (!this._mediaElPlayer) {
        this._mediaElPlayer = new Audio();
        this._mediaElPlayer.loop = true;
      } else if (!this._mediaElPlayer.paused) {
        this._mediaElPlayer.pause();
        this._mediaElPlayer.currentTime = 0;
      }
      this._mediaElPlayer.volume = isMuted ? 0 : 1;
      this._mediaElPlayer.src = track.scr;
      this._mediaElPlayer
        .play()
        .then(() => {
          this._setupMediaSession(track);
          this._updateStopBtn();
        })
        .catch((e) => console.warn("모바일 재생 실패:", e));
    }

    // 데스크탑: HTMLMediaElement → WebAudio 그래프 경유 재생 (fetch() CORS 오류 없음)
    // _mediaElSource(createMediaElementSource)가 panner → gain → listener 체인에 연결되어 있어
    // 별도 코드 없이 HRTF 3D 패닝이 동작함.
    if (!this._isMobile) {
      if (!this._mediaElPlayer.paused) {
        this._mediaElPlayer.pause();
        this._mediaElPlayer.currentTime = 0;
      }
      this._mediaElPlayer.src = track.scr;
      this._mediaElPlayer
        .play()
        .then(() => {
          if (this.selectedNode !== requestedMesh) return;
          this._setupMediaSession(track);
          this._updateStopBtn();
        })
        .catch((e) => console.warn("데스크탑 재생 실패:", e));
    }
  },

  // AudioBuffer 로드: bufferCache → rawCache 디코딩 → fetch+decode 순서로 시도
  // 반환: Promise<AudioBuffer>
  _loadBuffer(src) {
    // 1. 이미 디코딩된 버퍼가 있으면 즉시 반환
    if (this._bufferCache[src]) return Promise.resolve(this._bufferCache[src]);

    const ctx = this.audioListener.context;
    const decode = (raw) =>
      new Promise((res, rej) => ctx.decodeAudioData(raw.slice(0), res, rej)).then(
        (buf) => {
          this._bufferCache[src] = buf;
          return buf;
        },
      );

    // 2. 압축 데이터가 프리페치된 경우 → 디코딩만 (빠름)
    if (this._rawCache[src]) return decode(this._rawCache[src]);

    // 3. 프리페치 안 된 경우 → fetch + decode
    return fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.arrayBuffer();
      })
      .then((raw) => {
        this._rawCache[src] = raw;
        return decode(raw);
      });
  },

  // 카드 활성화 시 백그라운드에서 순차 프리페치 (네트워크 부하 분산)
  // 모바일은 HTMLMediaElement 직접 재생이므로 _rawCache 불필요 → 스킵
  _startPreload() {
    if (this._isMobile) return;
    if (this._preloadQueue) return; // 이미 시작됨
    this._preloadQueue = this.TRACKS.map((t) => t.scr);
    this._preloadStep();
  },

  _preloadStep() {
    const src = this._preloadQueue?.shift();
    if (!src) return;
    if (this._rawCache[src]) {
      this._preloadStep(); // 이미 캐시됨, 다음으로
      return;
    }
    fetch(src)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        this._rawCache[src] = buf;
        setTimeout(() => this._preloadStep(), 300); // 트랙 간 300ms 간격으로 부하 분산
      })
      .catch(() => setTimeout(() => this._preloadStep(), 800)); // 실패 시 다음으로
  },

  // 1초 무음 WAV를 Blob URL로 생성 — phantom MediaElement 전용 (OS 미디어 알림 활성화용)
  _createSilentWavUrl() {
    const sr = 8000,
      samples = sr; // 8kHz 모노, 1초
    const buf = new ArrayBuffer(44 + samples * 2);
    const v = new DataView(buf);
    const w4 = (o, s) =>
      [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w4(0, "RIFF");
    v.setUint32(4, 36 + samples * 2, true);
    w4(8, "WAVE");
    w4(12, "fmt ");
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); // PCM
    v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); // mono, sampleRate
    v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    w4(36, "data");
    v.setUint32(40, samples * 2, true);
    // samples 전체 = 0 (무음) — DataView 기본값이 0이므로 별도 초기화 불필요
    return URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
  },

  // OS 미디어 알림에 트랙 정보 등록 + 미디어 컨트롤 핸들러 설정
  _setupMediaSession(track) {
    if (!("mediaSession" in navigator)) return;
    if (window.MediaMetadata) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.composer,
      });
    }
    navigator.mediaSession.playbackState = "playing";
    const s = (a, fn) => {
      try {
        navigator.mediaSession.setActionHandler(a, fn);
      } catch (e) {}
    };
    s("play", () => {
      if (this.positionalAudio?.buffer && !this.positionalAudio.isPlaying) {
        const ctx = this.audioListener.context;
        if (ctx.state === "suspended") ctx.resume();
        try {
          this.positionalAudio.play();
        } catch (e) {}
        if (this._mediaEl) this._mediaEl.play().catch(() => {});
        navigator.mediaSession.playbackState = "playing";
        this._updateStopBtn();
      }
    });
    s("pause", () => {
      if (this.positionalAudio?.isPlaying) {
        this.positionalAudio.pause();
        if (this._mediaEl) this._mediaEl.pause();
        navigator.mediaSession.playbackState = "paused";
        this._updateStopBtn();
      } else if (this._mediaElPlayer && !this._mediaElPlayer.paused) {
        // HTMLMediaElement 폴백 경로
        this._mediaElPlayer.pause();
        if (this._mediaEl) this._mediaEl.pause();
        navigator.mediaSession.playbackState = "paused";
        this._updateStopBtn();
      }
    });
    s("stop", () => this.stopPlayback());
  },

  // 글자 타이핑 효과: delayMs 후 charIntervalMs 간격으로 한 글자씩 추가
  _typeText(el, text, delayMs, charIntervalMs) {
    if (el._typeTimer) {
      clearInterval(el._typeTimer);
      el._typeTimer = null;
    }
    if (el._typeDelay) {
      clearTimeout(el._typeDelay);
      el._typeDelay = null;
    }
    el.textContent = "";
    el.classList.remove("typing");
    el._typeDelay = setTimeout(() => {
      el.classList.add("typing");
      let i = 0;
      el._typeTimer = setInterval(() => {
        el.textContent = text.slice(0, ++i);
        if (i >= text.length) {
          clearInterval(el._typeTimer);
          el._typeTimer = null;
          el.classList.remove("typing");
        }
      }, charIntervalMs);
    }, delayMs);
  },

  // OS 미디어 알림 해제
  _clearMediaSession() {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
    ["play", "pause", "stop"].forEach((a) => {
      try {
        navigator.mediaSession.setActionHandler(a, null);
      } catch (e) {}
    });
  },

  createStars() {
    const starCount = 1500;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(starCount * 3);
    const phase = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const r = 100 + Math.random() * 150;
      const theta = 2 * Math.PI * Math.random();
      const phi = Math.acos(2 * Math.random() - 1);

      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);

      phase[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0.0 } },
      vertexShader: `
        attribute float aPhase;
        varying float vPhase;
        void main() {
          vPhase = aPhase;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Increased from 120.0 to 450.0 to make them much more visible
          gl_PointSize = (450.0 / -mvPosition.z); 
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying float vPhase;
        void main() {
          vec2 pt = gl_PointCoord - vec2(0.5);
          if(dot(pt, pt) > 0.25) discard; 
          
          // Higher base alpha so they don't fade out completely and shine brighter
          float alpha = 0.1 + 0.3 * sin(uTime * 0.5 + vPhase);
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha); 
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.starsMesh = new THREE.Points(geo, mat);
    this.scene.add(this.starsMesh);
  },

  spawnShootingStar() {
    const length = 15 + Math.random() * 20;

    // Spawn high up and slightly in the background
    const startPoint = new THREE.Vector3(
      (Math.random() - 0.5) * 150,
      80 + Math.random() * 50,
      -50 - Math.random() * 80,
    );

    // Shoot diagonally downwards
    const endPoint = startPoint
      .clone()
      .add(new THREE.Vector3(length, -length * 0.8, 0));

    const geo = new THREE.BufferGeometry().setFromPoints([
      startPoint,
      endPoint,
    ]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    // Calculate speed and direction
    const velocity = new THREE.Vector3(
      endPoint.x - startPoint.x,
      endPoint.y - startPoint.y,
      endPoint.z - startPoint.z,
    )
      .normalize()
      .multiplyScalar(1.5 + Math.random() * 2.5);

    this.shootingStars.push({
      mesh: line,
      velocity: velocity,
      life: 1.0,
    });
  },

  /* ==================== AURORA SHADER ==================== */

  // WebGL fullscreen quad에 GLSL shader로 오로라 렌더링.
  // DOM blur/repaint 완전 제거 — GPU에서 모든 연산 처리.
  createAuroraShader() {
    this.auroraScene = new THREE.Scene();
    this.auroraCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0.0 } },
      depthTest: false,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;

        // HSL(0-1) → RGB
        vec3 hsl2rgb(vec3 c) {
          vec3 p = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return c.z + c.y * (p - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
        }

        void main() {
          float t = uTime;

          // 배경: 거의 순수 검정 (#000103)
          vec3 col = vec3(0.001, 0.002, 0.012);

          // 5개 오로라 blob — JS updateAuroraColors() 파라미터와 동일한 값 사용
          for (int i = 0; i < 5; i++) {
            float fi = float(i);
            float ph = fi * 1.25;

            // 중심 이동: JS cx = 0.48 + sin(t*0.15+ph)*0.28, cy = 0.45 + cos(t*0.12+ph*0.76)*0.28
            float cx = 0.48 + sin(t * 0.15 + ph) * 0.28;
            float cy = 0.45 + cos(t * 0.12 + ph * 0.76) * 0.28;

            // 타원형 Gaussian — CSS radial-gradient(ellipse) + blur(65px) 효과 재현
            // dx scale 0.75 → 수평 ~133%, dy scale 1.35 → 수직 ~74% 커버
            float dx = (vUv.x - cx) * 0.75;
            float dy = (vUv.y - cy) * 1.35;
            float dist2 = dx * dx + dy * dy;
            float blob  = exp(-dist2 * 2.0);

            // 밤하늘 오로라: 녹색→청록→파랑→보라 (북극광 색상 범위 0.30~0.75)
            float h1 = 0.30 + mod(t * 3.0 / 360.0 + fi * 48.0 / 360.0, 0.45);
            float h2 = mod(h1 + 0.09 + sin(t * 0.25 + fi) * 0.03, 1.0);
            vec3 c1 = hsl2rgb(vec3(h1, 0.80, 0.55));
            vec3 c2 = hsl2rgb(vec3(h2, 0.70, 0.35));
            vec3 blobCol = mix(c1, c2, smoothstep(0.0, 0.7, sqrt(dist2)));

            // opacity 맥박 (어두운 배경 유지를 위해 낮게)
            float op = 0.32 + sin(t * 0.4 + fi * 1.1) * 0.05;

            // Screen blend: 어두운 배경에 오로라 은은하게 합성
            col = 1.0 - (1.0 - col) * (1.0 - blobCol * blob * op * 0.40);
          }

          gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
      `,
    });

    this.auroraMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    this.auroraScene.add(this.auroraMesh);
  },

  // animate()에서 매 프레임 호출 — uTime uniform 갱신만 (GPU가 나머지 처리)

  /* ==================== NODE COLOR ANIMATION ==================== */

  updateNodeColors(t) {
    this.nodes.forEach((n, i) => {
      const ud = n.mesh.userData;
      if (n.isSpecial) {
        if (ud.isSelected) {
          // 선택됨: 자신의 파스텔 색으로 눈부신 별 펄스 (황금색 고정 아님)
          const pulse = 0.5 + Math.sin(t * 7) * 0.4;
          const hue = ud.nodeHue !== undefined ? ud.nodeHue : 0.12;
          n.mesh.material.color.setHSL(hue, 0.9, 0.75 + pulse * 0.2);
          n.mesh.scale.lerp(this._v3ScaleSelected, 0.1);
          n.mesh.rotation.y += 0.04;
          if (ud.glowMesh) {
            ud.glowMesh.position.copy(n.mesh.position);
            ud.glowMesh.quaternion.copy(this.camera.quaternion);
            ud.glowMesh.material.uniforms.uOpacity.value =
              0.38 + Math.sin(t * 5) * 0.18;
            ud.glowMesh.scale.setScalar(1.35 + Math.sin(t * 8) * 0.22);
            ud.glowMesh.material.uniforms.uColor.value.setHSL(hue, 1.0, 0.75);
          }
        } else {
          // 미선택 special: 자신의 고유 hue로 별처럼 빛나기 (상시 glow + 강한 twinkle)
          const twinkle = 0.1 + Math.sin(t * 2.0 + i * 1.3) * 0.3; // 0~1
          const hue = ud.nodeHue !== undefined ? ud.nodeHue : 0.1;
          n.mesh.material.color.setHSL(hue, 0.7, 0.78 + twinkle * 0.22); // 0.78~1.00
          if (n.mesh !== this._hoveredMesh) {
            n.mesh.scale.lerp(this._v3ScaleNormal, 0.08);
          }
          if (ud.glowMesh) {
            ud.glowMesh.position.copy(n.mesh.position);
            ud.glowMesh.quaternion.copy(this.camera.quaternion);
            ud.glowMesh.material.uniforms.uOpacity.value =
              0.14 + twinkle * 0.28; // 0.14~0.42
            ud.glowMesh.scale.setScalar(0.85 + twinkle * 0.45); // 0.85~1.30
            ud.glowMesh.material.uniforms.uColor.value.setHSL(hue, 0.9, 0.5);
          }
        }
      } else {
        // 일반 노드: 별 반짝임 (청백색 다중 주파수 twinkling)
        const tw =
          0.35 +
          Math.sin(t * 1.4 + i * 0.93) * 0.2 +
          Math.sin(t * 2.6 + i * 1.37) * 0.08;
        const hue = 0.6 + Math.sin(i * 0.27) * 0.06; // 미묘한 청색 편차
        n.mesh.material.color.setHSL(hue, 0.25, 0.9);
        n.mesh.material.opacity = Math.max(0.1, Math.min(0.7, tw));
      }
    });

    // 연결선: 연노랑/연분홍/하얀색 계열 (천천히 변화)
    if (this.linesMesh) {
      const lh = 0.08 + Math.sin(t * 0.06) * 0.07; // 0.01~0.15 (분홍~연노랑)
      const ls = 0.35 + Math.sin(t * 0.09) * 0.15; // 0.20~0.50 (연한 채도)
      const ll = 0.88 + Math.sin(t * 0.05) * 0.07; // 0.81~0.95 (밝음)
      this.linesMesh.material.color.setHSL(lh, ls, ll);
      this.linesMesh.material.opacity = 0.15 + Math.sin(t * 0.25) * 0.06;
    }
  },

  /* ==================== THREE.JS INIT ==================== */

  initThree() {
    this._v3ScaleSelected = new THREE.Vector3(2.3, 2.3, 2.3);
    this._v3ScaleHovered = new THREE.Vector3(1.8, 1.8, 1.8);
    this._v3ScaleNormal = new THREE.Vector3(1, 1, 1);
    this._v3CamTarget = new THREE.Vector3();

    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    this.camera.position.z = 35;

    // AudioListener:
    // PC: 별도 Object3D(_audioListenerObj)에 연결, 회전 고정(identity) + 위치만 카메라와 동기화
    //   → camera.lookAt(node)로 인해 리스너가 항상 음원 정면을 향하는 문제 해결
    //   → 카메라가 노드 주위를 공전할 때 음원이 리스너 기준 좌→앞→우→뒤로 이동 → HRTF 패닝
    // 모바일: 카메라에 직접 부착 (3D 음향 미사용, HTMLMediaElement 직접 재생)
    this.audioListener = new THREE.AudioListener();
    if (!this._isMobile) {
      this._audioListenerObj = new THREE.Object3D();
      this.scene.add(this._audioListenerObj);
      this._audioListenerObj.add(this.audioListener);
    } else {
      this.camera.add(this.audioListener);
    }

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this._isMobile,
      alpha: false,
    });
    // 모바일: pixel ratio 1x 고정 → 렌더링 해상도 절반으로 GPU/메모리 부하 대폭 감소
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this._isMobile ? 1 : 2),
    );
    // aurora + 노드 씬을 순서대로 렌더링하기 위해 자동 clear 비활성화
    this.renderer.autoClear = false;
    this.container.appendChild(this.renderer.domElement);
    this.createAuroraShader();
    this.createStars(); // 여기! 노드를 그리기 전에 별을 먼저 생성합니다.
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

    // ── 터치 상태 변수 ────────────────────────────────────────────
    let _touchStartX = 0,
      _touchStartY = 0,
      _prevTouchY = 0;
    let _touchScrolling = false; // 드래그 스크롤 중
    let _touchTapHandled = false; // touchend 탭 처리 → click 이벤트 중복 방지
    const MOVE_THRESHOLD = 10; // px

    // 모바일 컨텍스트 메뉴 방지
    this.container.addEventListener("contextmenu", (e) => {
      if (e.cancelable) e.preventDefault();
    });

    // touchstart: 좌표 기록
    this.container.addEventListener(
      "touchstart",
      (e) => {
        if (!this._isMobile) return; // PC 터치패드 오작동 방지
        if (!this.isActive || !this.card.classList.contains("fullscreen"))
          return;
        const touch = e.touches[0];
        const rect = this.container.getBoundingClientRect();
        _touchStartX = touch.clientX;
        _touchStartY = touch.clientY;
        _prevTouchY = touch.clientY;
        _touchScrolling = false;
        _touchTapHandled = false;

        // 마우스 좌표 업데이트 (raycasting용)
        this.mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      },
      { passive: true },
    );

    // touchmove: 세로 드래그 스크롤 처리
    this.container.addEventListener(
      "touchmove",
      (e) => {
        if (!this._isMobile) return; // PC 터치패드 오작동 방지
        if (!this.isActive || !this.card.classList.contains("fullscreen"))
          return;
        const touch = e.touches[0];
        const totalDx = Math.abs(touch.clientX - _touchStartX);
        const totalDy = Math.abs(touch.clientY - _touchStartY);
        const dy = _prevTouchY - touch.clientY; // 위로 드래그 시 양수

        // 이동량이 임계값 초과 → 스크롤 모드, hover 해제
        if (totalDx > MOVE_THRESHOLD || totalDy > MOVE_THRESHOLD) {
          _touchScrolling = true;
          this._mobileHoveredNode = null;
          this.mouse.set(-1, -1);
        }

        // 세로 드래그 스크롤 (hover 중에는 스크롤 차단)
        if (_touchScrolling && !this.isHoveringSpecial && totalDy > totalDx) {
          this.targetScroll = Math.max(
            0,
            Math.min(100, this.targetScroll + dy * 0.3),
          );
          if (e.cancelable) e.preventDefault(); // 페이지 스크롤 방지
        }

        _prevTouchY = touch.clientY;
      },
      { passive: false },
    );

    // touchend: 1탭→tooltip+정지, 같은 노드 2탭→확대+재생
    this.container.addEventListener(
      "touchend",
      () => {
        if (!this._isMobile) return; // PC 터치패드 오작동 방지

        if (
          this.isActive &&
          this.card.classList.contains("fullscreen") &&
          !_touchScrolling
        ) {
          // 탭 → raycasting (hitbox 포함 — 클릭 범위 확대)
          this.raycaster.setFromCamera(this.mouse, this.camera);
          const targets = this.nodes
            .filter((n) => n.isSpecial)
            .map((n) => n.mesh.userData.hitbox || n.mesh);
          const hits = this.raycaster.intersectObjects(targets);

          if (hits.length > 0) {
            const hit = hits[0];
            const hitMesh = hit.object.userData.isHitbox
              ? hit.object.parent
              : hit.object;
            const nodeData = this.nodes.find((n) => n.mesh === hitMesh);
            if (this._mobileHoveredNode === hitMesh) {
              // 같은 노드 2번째 탭
              if (nodeData) {
                if (this.selectedNode === hitMesh) {
                  // 이미 재생 중인 노드 → 확대 상태 복귀 (음악 유지, 꺼지지 않음)
                  this.isZoomed = true;
                  this.zoomNode = hitMesh;
                } else {
                  // 다른 노드 → 확대 + 음악 교체
                  this.selectNode(nodeData);
                }
              }
              this._mobileHoveredNode = null;
              this.mouse.set(-1, -1);
            } else {
              // 새 노드 1번째 탭 → tooltip 표시 + 멈춤 (mouse 좌표 유지)
              this._mobileHoveredNode = hitMesh;
              if (navigator.vibrate) navigator.vibrate(20);
            }
          } else {
            // 빈 공간 탭 → hover/zoom 해제 (음악은 유지)
            this._mobileHoveredNode = null;
            this.mouse.set(-1, -1);
            if (this.isZoomed) {
              this.isZoomed = false;
              this.zoomNode = null;
            }
          }
          _touchTapHandled = true;
        }

        _touchScrolling = false;
      },
      { passive: true },
    );

    // 정지 버튼 클릭 → 즉시 재생 중단
    const stopBtn = document.getElementById("c6-stop-btn");
    if (stopBtn) {
      stopBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!this.isActive || !this.card.classList.contains("fullscreen")) return; // 카드 축소 상태에서 클릭 차단
        this.stopPlayback();
      });
    }

    // 클릭 → 즉시 선택 (데스크톱 전용 — 터치 탭은 touchend에서 처리)
    this.container.addEventListener("click", (e) => {
      if (this._isMobile) return; // 모바일: touchend가 전담 — 합성 click 이벤트 완전 무시
      if (_touchTapHandled) {
        _touchTapHandled = false;
        return;
      } // 터치 중복 방지
      if (!this.isActive || !this.card.classList.contains("fullscreen")) return;
      updateMouse(e);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      // hitbox(투명 큰 구체)도 포함해 클릭 범위 확대
      const hitboxes = this.nodes
        .filter((n) => n.isSpecial)
        .map((n) => n.mesh.userData.hitbox || n.mesh);
      const hits = this.raycaster.intersectObjects(hitboxes);

      if (hits.length > 0) {
        const hit = hits[0];
        const hitParent = hit.object.userData.isHitbox
          ? hit.object.parent
          : hit.object;
        const nodeData = this.nodes.find((n) => n.mesh === hitParent);
        if (nodeData) {
          if (this.selectedNode === nodeData.mesh) {
            // PC: 같은 노드 재클릭 시 해제 없이 zoom 유지 (toggle off 없음)
            this.isZoomed = true;
            this.zoomNode = nodeData.mesh;
          } else {
            this.selectNode(nodeData);
          }
        }
        e.stopPropagation();
      } else {
        if (this.isZoomed) {
          this.isZoomed = false;
          this.zoomNode = null;
        }
      }
    });

    // 휠 스크롤 (데스크톱)
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
    this.renderer.setSize(w, h);
    // setSize()는 캔버스 버퍼를 재할당해 흑화면을 유발하므로
    // isActive 여부에 관계없이 즉시 현재 씬을 재렌더링해 검은 플래시 방지
    if (this.auroraScene && this.scene) {
      this.renderer.clear();
      this.renderer.render(this.auroraScene, this.auroraCamera);
      this.renderer.render(this.scene, this.camera);
    }
  },

  updateScene(dt) {
    this.hueTime += dt; // 항상 진행

    const isFullscreen = this.card.classList.contains("fullscreen");

    // Raycasting: 풀스크린에서만 실행 (비풀스크린에서 hover 효과 전부 차단)
    let hoveredMesh = null;
    if (isFullscreen) {
      if (this._isMobile && this._mobileHoveredNode) {
        // 모바일 1탭 후 hover 고정: 카메라가 회전해도 tooltip 유지
        hoveredMesh = this._mobileHoveredNode;
      } else if (!this._isMobile) {
        // PC: mousemove raycasting — hitbox(투명 큰 구체)도 포함
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const hitboxes = this.nodes
          .filter((n) => n.isSpecial)
          .map((n) => n.mesh.userData.hitbox || n.mesh);
        const intersects = this.raycaster.intersectObjects(hitboxes);
        if (intersects.length > 0) {
          const hit = intersects[0];
          hoveredMesh = hit.object.userData.isHitbox
            ? hit.object.parent
            : hit.object;
        }
      }
    }

    this._hoveredMesh = hoveredMesh; // updateNodeColors()가 scale 충돌 방지용으로 참조
    this.isHoveringSpecial = !!hoveredMesh;
    const effectiveDt = this.isHoveringSpecial || this.isZoomed ? 0 : dt;
    this.customTime += effectiveDt;

    // 배경 별: 매우 느린 y축 회전 + 반짝임 시간 갱신
    if (this.starsMesh) {
      this.starsMesh.material.uniforms.uTime.value = this.hueTime;
    }

    // Occasional shooting stars (about 0.5% chance per frame)
    if (Math.random() < 0.005) {
      this.spawnShootingStar();
    }

    // Update shooting stars movement and fading
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const star = this.shootingStars[i];
      star.mesh.position.add(star.velocity);
      star.life -= dt * 1.2; // Fades out over roughly 0.8 seconds

      if (star.life <= 0) {
        this.scene.remove(star.mesh);
        star.mesh.geometry.dispose();
        star.mesh.material.dispose();
        this.shootingStars.splice(i, 1);
      } else {
        star.mesh.material.opacity = star.life;
      }
    }

    // Scroll & Formations
    this.scroll += (this.targetScroll - this.scroll) * 0.1;
    const progress = this.scroll / 100;
    const formations = ["SPHERE", "HELIX", "CUBE", "TORUS", "SCATTER"];
    const step = 1 / (formations.length - 1);
    const idx = Math.min(Math.floor(progress / step), formations.length - 2);
    const sub = (progress % step) / step;

    if (sub > 0.05 && sub < 0.95) {
      this.parallaxText.textContent = formations[idx + 1];
      this.parallaxText.style.opacity = Math.sin(sub * Math.PI) * 0.8;
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

      if (hoveredMesh === n.mesh) {
        n.mesh.scale.lerp(this._v3ScaleHovered, 0.2);
      } else if (n.mesh.userData.isSelected) {
        // 선택된 노드는 포메이션에 느리게 따라감
        n.mesh.position.lerp(targetPos, 0.03);
      } else {
        n.mesh.position.lerp(targetPos, 0.05);
        if (n.isSpecial) n.mesh.rotation.y += effectiveDt * 1.5;
      }
    });

    // PositionalAudio 위치 + 거리 볼륨: 선택된 노드를 매 프레임 추적
    // 데스크탑: _mediaElSource → panner → gain 체인이므로 setVolume()으로 거리 볼륨 제어
    if (this.positionalAudio && this.selectedNode) {
      this.positionalAudio.position.copy(this.selectedNode.position);
      if (this._mediaElSource || this.positionalAudio.buffer) {
        const dist = this.camera.position.distanceTo(
          this.selectedNode.position,
        );
        const isMuted = !document
          .getElementById("mute-btn")
          ?.classList.contains("unmuted");
        const tg = isMuted
          ? 0
          : Math.min(1.0, Math.pow(14 / Math.max(dist, 1), 2));
        if (this._audioGain === undefined) this._audioGain = tg;
        this._audioGain += (tg - this._audioGain) * 0.08;
        this.positionalAudio.setVolume(this._audioGain);
      }
    }

    // 모바일 전용: _mediaElPlayer 볼륨 직접 제어 (WebAudio 미사용)
    // 데스크탑은 positionalAudio.gain(WebAudio)이 볼륨을 담당하므로 _mediaElPlayer.volume은 1 고정
    if (this._isMobile && this._mediaElPlayer && !this._mediaElPlayer.paused) {
      const isMutedEl = !document
        .getElementById("mute-btn")
        ?.classList.contains("unmuted");
      this._mediaElPlayer.volume = isMutedEl ? 0 : 1;
    }

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

    // Tooltip (풀스크린 전용 — hoveredMesh는 클릭 고정 시에만 non-null)
    if (hoveredMesh) {
      const d = hoveredMesh.userData;
      const track = d.trackIndex >= 0 ? this.TRACKS[d.trackIndex] : null;

      if (this.lastHoveredId !== d.id) {
        this.lastHoveredId = d.id;
        this.tooltip.classList.remove("visible");

        // 노드 고유 색으로 border-left 색 변경
        const accentColor =
          d.nodeHue !== undefined
            ? `hsl(${Math.round(d.nodeHue * 360)}, 70%, 82%)`
            : this.accentColor;
        this.tooltip.style.setProperty("--node-accent", accentColor);

        const text1 = track ? `> ${track.title}` : `> REF_ID: ${d.id}`;
        const text2 = track
          ? `> ${track.composer}`
          : `> SIGNAL: ${d.power}% STABLE`;
        const text3 = d.isSelected ? `> ♪ PLAYING` : `> CLICK TO PLAY`;
        // 각 줄을 순차 타이핑: 이전 줄이 끝나면 다음 줄 시작
        const cpm = 22,
          gap = 80;
        const d0 = 80;
        const d1 = d0 + text1.length * cpm + gap;
        const d2 = d1 + text2.length * cpm + gap;
        this._typeText(document.getElementById("tp-id"), text1, d0, cpm);
        this._typeText(document.getElementById("tp-stat"), text2, d1, cpm);
        this._typeText(document.getElementById("tp-sig"), text3, d2, cpm);
        this.tooltip.classList.add("visible");
      } else {
        // hover 중에도 재생 상태 동적 반영
        const sigEl = document.getElementById("tp-sig");
        if (sigEl) {
          sigEl.textContent = d.isSelected ? `> ♪ PLAYING` : `> CLICK TO PLAY`;
        }
      }

      const rect = this.container.getBoundingClientRect();
      const rawLeft = ((this.mouse.x + 1) / 2) * rect.width + 25;
      const rawTop = (-(this.mouse.y - 1) / 2) * rect.height - 50;
      // 툴팁이 컨테이너 밖으로 나가지 않도록 클램프
      const ttW = this.tooltip.offsetWidth || 220;
      const ttH = this.tooltip.offsetHeight || 80;
      const pad = 8;
      this.tooltip.style.left = `${Math.max(pad, Math.min(rawLeft, rect.width - ttW - pad))}px`;
      this.tooltip.style.top = `${Math.max(pad, Math.min(rawTop, rect.height - ttH - pad))}px`;
    } else {
      if (this.lastHoveredId !== null) {
        this.tooltip.classList.remove("visible");
        // 진행 중인 타이핑 취소
        ["tp-id", "tp-stat", "tp-sig"].forEach((id) => {
          const el = document.getElementById(id);
          if (!el) return;
          if (el._typeTimer) {
            clearInterval(el._typeTimer);
            el._typeTimer = null;
          }
          if (el._typeDelay) {
            clearTimeout(el._typeDelay);
            el._typeDelay = null;
          }
          el.classList.remove("typing");
        });
        this.lastHoveredId = null;
      }
    }

    // Camera
    if (this.isZoomed && this.zoomNode) {
      // 노드 주위를 느리게 공전: HRTF 방향이 front→right→back→left로 계속 변해 3D 음향 극대화
      // hueTime은 isZoomed 여부와 무관하게 항상 진행 → 안정적인 공전 각도
      const orbitR = 7;
      const a = this.hueTime * 0.25; // ~25초/바퀴
      this._v3CamTarget.set(
        this.zoomNode.position.x + orbitR * Math.sin(a),
        this.zoomNode.position.y + 2 + orbitR * 0.25 * Math.sin(a * 0.7),
        this.zoomNode.position.z + orbitR * Math.cos(a),
      );
      this.camera.position.lerp(this._v3CamTarget, 0.05);
      this.camera.lookAt(this.zoomNode.position);
    } else {
      const camX = Math.cos(this.customTime * 0.15) * 35;
      const camZ = Math.sin(this.customTime * 0.15) * 35;
      this._v3CamTarget.set(camX, 4, camZ);
      this.camera.position.lerp(this._v3CamTarget, 0.05);
      this.camera.lookAt(0, 0, 0);
    }
    // PC 전용: AudioListener 위치 동기화 (회전 고정 → HRTF 패닝)
    if (!this._isMobile && this._audioListenerObj) {
      this._audioListenerObj.position.copy(this.camera.position);
    }
  },

  animate() {
    requestAnimationFrame(this._boundAnimate);
    if (!this.isActive) return;
    const dt = this.clock.getDelta();
    this.updateScene(dt);
    if (this.renderer) {
      // 1. clear → 2. aurora 배경 quad → 3. 노드/라인/파티클 씬
      // autoClear=false이므로 수동 clear 후 두 씬을 순서대로 렌더링
      this.renderer.clear();
      this.renderer.render(this.auroraScene, this.auroraCamera);
      this.renderer.render(this.scene, this.camera);
    }
  },

  activate() {
    this.isActive = true;
    this.handleResize();
    if (this.clock) this.clock.getDelta();
    // _startPreload() 제거: fetch()는 archive.org CORS로 실패하며 bufferCache 미사용
    // 복귀 시 선택된 노드의 음악 재개
    if (this.selectedNode) {
      if (this._mediaElPlayer?.paused && this._mediaElPlayer.src) {
        // MediaElement 재개: 데스크탑은 WebAudio 그래프 경유, 모바일은 직접
        const ctx = this.audioListener.context;
        if (ctx.state === "suspended") ctx.resume();
        if (this._isMobile) {
          const isMuted = !document
            .getElementById("mute-btn")
            ?.classList.contains("unmuted");
          this._mediaElPlayer.volume = isMuted ? 0 : 1;
        }
        this._mediaElPlayer.play().catch(() => {});
        if (this._mediaEl) this._mediaEl.play().catch(() => {});
        const track = this.TRACKS[this.selectedNode.userData.trackIndex];
        if (track) this._setupMediaSession(track);
        this._updateStopBtn();
      }
    }
  },

  deactivate() {
    this.isActive = false;
    this.isZoomed = false;
    this.zoomNode = null;
    if (this.tooltip) this.tooltip.classList.remove("visible");
    // 정지 버튼 숨김: 카드가 축소될 때 visible 상태면 pointer-events: auto가 남아 클릭됨
    const stopBtn = document.getElementById("c6-stop-btn");
    if (stopBtn) stopBtn.classList.remove("visible");
    // 카드 비활성화 시 음악 일시 정지
    if (this.positionalAudio && this.positionalAudio.isPlaying) {
      this.positionalAudio.pause();
    }
    if (this._mediaElPlayer && !this._mediaElPlayer.paused) {
      this._mediaElPlayer.pause();
    }
    if (this._mediaEl) this._mediaEl.pause();
    if ("mediaSession" in navigator && this.selectedNode) {
      navigator.mediaSession.playbackState = "paused";
    }
  },
};

window.addEventListener("load", () => Card6.init());
