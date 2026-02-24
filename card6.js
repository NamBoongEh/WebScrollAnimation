/**
 * ========================================
 * card6.js - Full Interactive Logic
 * ========================================
 * 수정: 클릭 피드백 개선, 비활성화 시 동작 중지
 */
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
  clickedNode: null, // 클릭된 노드 추적

  scroll: 0,
  targetScroll: 0,
  customTime: 0,
  accentColor: null,
  lineColor: "#223355",

  init() {
    this.card = document.querySelector("#card-6");
    this.container = document.querySelector("#three-container-6");
    if (!this.card || !this.container) return;

    // 이미 초기화되었으면 스킵
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
    this.container.innerHTML = `
      <div id="aurora-bg-6">
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
    `;
    this.tooltip = document.querySelector("#node-tooltip-6");
    this.parallaxText = document.querySelector("#parallax-text-6");
  },

  createNodes() {
    const normalGeo = new THREE.IcosahedronGeometry(0.18, 0);
    const specialGeo = new THREE.OctahedronGeometry(0.4, 0);

    const matWhite = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.4,
    });
    const matAccent = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.accentColor),
    });

    for (let i = 0; i < 80; i++) {
      const isSpecial = i % 8 === 0;
      const mesh = new THREE.Mesh(
        isSpecial ? specialGeo : normalGeo,
        isSpecial ? matAccent.clone() : matWhite, // 클릭 피드백을 위해 clone
      );

      const targets = {};
      ["sphere", "helix", "cube", "torus", "scatter"].forEach((f) => {
        targets[f] = this.getFormationPos(i, f);
      });

      mesh.position.set(...targets.scatter);
      mesh.userData = {
        id: i + 101,
        isSpecial,
        power: Math.floor(Math.random() * 100),
        originalColor: isSpecial ? new THREE.Color(this.accentColor) : null,
        isClicked: false,
      };
      this.scene.add(mesh);
      this.nodes.push({ mesh, targets, isSpecial });
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

  getFormationPos(index, type) {
    const t = index / 80;
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
      case "cube":
        return [
          ((index % 4) - 1.5) * 5,
          ((Math.floor(index / 4) % 4) - 1.5) * 5,
          (Math.floor(index / 16) - 1.5) * 5,
        ];
      case "torus":
        return [
          (9 + 3 * Math.cos(t * 20)) * Math.cos(t * 2 * pi),
          (9 + 3 * Math.cos(t * 20)) * Math.sin(t * 2 * pi),
          3 * Math.sin(t * 20),
        ];
      default:
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
    const pulseMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.accentColor),
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

  // 클릭된 노드에서 폭발 이펙트 생성
  createClickEffect(node) {
    const position = node.position.clone();
    
    // 링 이펙트
    const ringGeo = new THREE.RingGeometry(0.3, 0.5, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(this.accentColor),
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.lookAt(this.camera.position);
    this.scene.add(ring);

    // 파티클 이펙트
    const particles = [];
    for (let i = 0; i < 8; i++) {
      const partGeo = new THREE.SphereGeometry(0.08, 4, 4);
      const partMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(this.accentColor),
        transparent: true,
        opacity: 1,
      });
      const particle = new THREE.Mesh(partGeo, partMat);
      particle.position.copy(position);
      const angle = (i / 8) * Math.PI * 2;
      particle.userData.velocity = new THREE.Vector3(
        Math.cos(angle) * 0.15,
        Math.sin(angle) * 0.15,
        (Math.random() - 0.5) * 0.1
      );
      this.scene.add(particle);
      particles.push(particle);
    }

    // 애니메이션
    let frame = 0;
    const animateEffect = () => {
      frame++;
      
      // 링 확장
      ring.scale.setScalar(1 + frame * 0.15);
      ring.material.opacity = Math.max(0, 1 - frame * 0.05);
      
      // 파티클 이동
      particles.forEach(p => {
        p.position.add(p.userData.velocity);
        p.material.opacity = Math.max(0, 1 - frame * 0.04);
        p.scale.setScalar(Math.max(0.1, 1 - frame * 0.03));
      });

      if (frame < 25) {
        requestAnimationFrame(animateEffect);
      } else {
        // 정리
        this.scene.remove(ring);
        ring.geometry.dispose();
        ring.material.dispose();
        particles.forEach(p => {
          this.scene.remove(p);
          p.geometry.dispose();
          p.material.dispose();
        });
      }
    };
    animateEffect();
  },

  // 노드 클릭 시 색상 토글 효과
  toggleNodeClick(mesh) {
    const userData = mesh.userData;
    
    if (!userData.isClicked) {
      // 클릭 ON - 밝은 색상으로 변경
      userData.isClicked = true;
      mesh.material.color.setHSL(
        (this.customTime * 0.1) % 1,
        1.0,
        0.9
      );
      mesh.material.opacity = 1;
      
      // 클릭 이펙트 생성
      this.createClickEffect(mesh);
      
      // 일정 시간 후 자동 리셋
      setTimeout(() => {
        if (userData.isClicked) {
          userData.isClicked = false;
          if (userData.originalColor) {
            mesh.material.color.copy(userData.originalColor);
          }
        }
      }, 2000);
    } else {
      // 클릭 OFF - 원래 색상으로
      userData.isClicked = false;
      if (userData.originalColor) {
        mesh.material.color.copy(userData.originalColor);
      }
    }
  },

  initThree() {
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    this.camera.position.z = 35;
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

    // 클릭 이벤트 - mousedown 대신 click 사용하여 더 명확한 상호작용
    this.container.addEventListener("click", (e) => {
      // 비활성화 상태면 무시
      if (!this.isActive) return;
      
      updateMouse(e);
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const targets = this.nodes.filter((n) => n.isSpecial).map((n) => n.mesh);
      const hits = this.raycaster.intersectObjects(targets);

      if (hits.length > 0) {
        const clicked = hits[0].object;
        
        // 줌 토글
        if (this.zoomNode === clicked) {
          this.isZoomed = false;
          this.zoomNode = null;
        } else {
          this.isZoomed = true;
          this.zoomNode = clicked;
        }
        
        // 클릭 시각 효과
        this.toggleNodeClick(clicked);
        
        e.stopPropagation(); // 이벤트 버블링 방지
      } else {
        // 빈 공간 클릭 시 줌 해제
        if (this.isZoomed) {
          this.isZoomed = false;
          this.zoomNode = null;
        }
      }
    });

    window.addEventListener(
      "wheel",
      (e) => {
        // 비활성화 상태거나 풀스크린 아니면 무시
        if (!this.isActive || !this.card.classList.contains("fullscreen") || this.isHoveringSpecial) return;
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
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const specialMeshes = this.nodes
      .filter((n) => n.isSpecial)
      .map((n) => n.mesh);
    const intersects = this.raycaster.intersectObjects(specialMeshes);
    const hovered = intersects.length > 0 ? intersects[0] : null;

    this.isHoveringSpecial = !!hovered;
    const effectiveDt = this.isHoveringSpecial || this.isZoomed ? 0 : dt;
    this.customTime += effectiveDt;

    // Scroll & Formations
    this.scroll += (this.targetScroll - this.scroll) * 0.1;
    const progress = this.scroll / 100;
    const formations = ["SPHERE", "HELIX", "CUBE", "TORUS", "SCATTER"];
    const step = 1 / (formations.length - 1);
    const idx = Math.min(Math.floor(progress / step), formations.length - 2);
    const sub = (progress % step) / step;

    // Parallax Text Visibility
    if (sub > 0.05 && sub < 0.95) {
      this.parallaxText.textContent = formations[idx + 1];
      this.parallaxText.style.opacity = Math.sin(sub * Math.PI) * 0.5;
    } else {
      this.parallaxText.style.opacity = 0;
    }

    this.nodes.forEach((n) => {
      const p1 = n.targets[formations[idx].toLowerCase()];
      const p2 = n.targets[formations[idx + 1].toLowerCase()];
      const targetPos = new THREE.Vector3(
        p1[0] + (p2[0] - p1[0]) * sub,
        p1[1] + (p2[1] - p1[1]) * sub,
        p1[2] + (p2[2] - p1[2]) * sub,
      );

      if (hovered && hovered.object === n.mesh) {
        n.mesh.scale.lerp(new THREE.Vector3(1.8, 1.8, 1.8), 0.1);
      } else {
        n.mesh.position.lerp(targetPos, 0.05);
        if (n.isSpecial) n.mesh.rotation.y += effectiveDt * 1.5;
        n.mesh.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
      
      // 클릭된 노드는 색상 펄스 효과
      if (n.mesh.userData.isClicked) {
        const pulse = Math.sin(this.customTime * 10) * 0.2 + 0.8;
        n.mesh.material.opacity = pulse;
      }
    });

    this.updateLines();
    
    // Pulse animation logic
    if (!this.isHoveringSpecial && Math.random() < 0.12) this.triggerPulse();
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.life += p.speed;
      p.mesh.position.lerpVectors(p.start, p.end, p.life);
      if (p.life >= 1) {
        this.pulseGroup.remove(p.mesh);
        this.pulses.splice(i, 1);
      } else {
        p.mesh.material.opacity = Math.sin(p.life * Math.PI) * 0.8;
      }
    }

    // Tooltip Logic
    if (hovered) {
      const d = hovered.object.userData;
      if (this.lastHoveredId !== d.id) {
        this.lastHoveredId = d.id;
        this.tooltip.classList.remove("visible");
        ["tp-id", "tp-stat", "tp-sig"].forEach(
          (id) => (document.getElementById(id).textContent = ""),
        );
        void this.tooltip.offsetWidth; // Trigger reflow
        document.getElementById("tp-id").textContent = `> REF_ID: ${d.id}`;
        document.getElementById("tp-stat").textContent =
          `> STATUS: ${d.isClicked ? 'ACTIVATED' : 'SPECIAL_LOCK'}`;
        document.getElementById("tp-sig").textContent =
          `> SIGNAL: ${d.power}% STABLE`;
        this.tooltip.classList.add("visible");
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

    // Camera Zoom Animation
    if (this.isZoomed && this.zoomNode) {
      const targetCamPos = this.zoomNode.position
        .clone()
        .add(new THREE.Vector3(0, 0, 7));
      this.camera.position.lerp(targetCamPos, 0.1);
      this.camera.lookAt(this.zoomNode.position);
    } else {
      const camX = Math.cos(this.customTime * 0.15) * 35;
      const camZ = Math.sin(this.customTime * 0.15) * 35;
      this.camera.position.lerp(new THREE.Vector3(camX, 4, camZ), 0.05);
      this.camera.lookAt(0, 0, 0);
    }
  },

  animate() {
    requestAnimationFrame(() => this.animate());
    
    // 비활성화 상태면 렌더링만 하고 업데이트 스킵 (메모리 최적화)
    if (!this.isActive) {
      // 최소한의 렌더링만 수행 (정지 화면)
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }
    
    const dt = this.clock.getDelta();
    this.updateScene(dt);
    if (this.renderer) this.renderer.render(this.scene, this.camera);
  },

  activate() {
    this.isActive = true;
    this.handleResize();
    // 시계 리셋하여 델타 타임 정상화
    if (this.clock) this.clock.getDelta();
  },
  
  deactivate() {
    this.isActive = false;
    // 줌 상태 리셋
    this.isZoomed = false;
    this.zoomNode = null;
    // 툴팁 숨기기
    if (this.tooltip) {
      this.tooltip.classList.remove("visible");
    }
  },
};

window.addEventListener("load", () => Card6.init());
