var Utils = {
  $(selector) {
    return document.querySelector(selector);
  },
  $$(selector) {
    return document.querySelectorAll(selector);
  },
  lerp(start, end, factor) {
    return start + (end - start) * factor;
  },
  clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  },
};

// ========================================
// Popup
// ========================================
var Popup = {
  overlay: null,
  title: null,
  desc: null,

  init() {
    this.overlay = Utils.$("#popup-overlay");
    this.title = Utils.$("#popup-title");
    this.desc = Utils.$("#popup-desc");

    Utils.$("#popup-close")?.addEventListener("click", () => this.close());
    this.overlay?.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
  },

  open(title, desc) {
    if (this.title) this.title.textContent = title;
    if (this.desc) this.desc.textContent = desc;
    this.overlay?.classList.add("active");
  },

  close() {
    this.overlay?.classList.remove("active");
  },
};

// ========================================
// Video Popup
// ========================================
var VideoPopup = {
  popup: null,
  video: null,

  init() {
    this.popup = Utils.$("#video-popup");
    this.video = Utils.$("#popup-video");

    Utils.$("#video-close")?.addEventListener("click", () => this.close());
    this.popup?.addEventListener("click", (e) => {
      if (e.target === this.popup) this.close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });
  },

  open(src) {
    if (this.video) {
      this.video.src = src;
      this.popup?.classList.add("active");
      this.video.play();
    }
  },

  close() {
    this.popup?.classList.remove("active");
    if (this.video) {
      this.video.pause();
      this.video.src = "";
    }
  },
};

// ========================================
// ThreeStack: Three.js CSS3DRenderer 매니저
// ========================================
var ThreeStack = {
  scene: null,
  camera: null,
  renderer: null,
  objects: [], // CSS3DObject 배열
  cardElements: [], // DOM element 배열
  cardW: 0,
  cardH: 0,
  fov: 40,
  camBaseZ: 0,

  // 초기 상태 저장 (복원용)
  initialStates: [],

  /**
   * 카드 크기 계산 (반응형)
   */
  calcCardSize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    if (w <= 400) {
      this.cardW = w * 0.9;
      this.cardH = h * 0.55;
    } else if (w <= 768) {
      this.cardW = w * 0.85;
      this.cardH = h * 0.6;
    } else {
      this.cardW = Math.min(w * 0.7, 1200);
      this.cardH = Math.min(h * 0.7, 800);
    }
  },

  /**
   * 카메라가 카드를 원본 크기로 보는 거리 계산
   */
  calcCamDistance() {
    return (
      window.innerHeight / 2 / Math.tan(THREE.MathUtils.degToRad(this.fov / 2))
    );
  },

  /**
   * 초기화
   */
  init(cardEls) {
    this.cardElements = cardEls;
    this.calcCardSize();

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camBaseZ = this.calcCamDistance();
    this.camera = new THREE.PerspectiveCamera(
      this.fov,
      window.innerWidth / window.innerHeight,
      1,
      10000,
    );
    this.camera.position.set(0, 0, this.camBaseZ);

    // CSS3DRenderer
    this.renderer = new THREE.CSS3DRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    var el = this.renderer.domElement;
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.zIndex = "1";
    document.body.insertBefore(el, document.body.firstChild);

    // CSS3DObject 생성
    var self = this;
    cardEls.forEach(function (card, i) {
      card.style.width = self.cardW + "px";
      card.style.height = self.cardH + "px";

      var obj = new THREE.CSS3DObject(card);

      // userData: 현재값 + 목표값 (lerp용)
      obj.userData = {
        // 현재 보간 중인 값
        cx: 0,
        cy: 0,
        cz: 0,
        cScale: 1,
        cOpacity: i === 0 ? 1 : 0,
        cBrightness: 1,
        // 목표값
        tx: 0,
        ty: 0,
        tz: 0,
        tScale: 1,
        tOpacity: i === 0 ? 1 : 0,
        tBrightness: 1,
        // 상태
        visible: i === 0,
        tVisible: i === 0,
        interactive: i === 0,
        cInteractive: i === 0,
        // 인덱스 저장
        index: i,
      };

      // 초기 상태 저장
      self.initialStates[i] = {
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        scale: 1,
      };

      self.scene.add(obj);
      self.objects.push(obj);
    });

    // 리사이즈
    window.addEventListener("resize", function () {
      ThreeStack.onResize();
    });
  },

  onResize() {
    this.calcCardSize();
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.camBaseZ = this.calcCamDistance();
    this.camera.position.z = this.camBaseZ;
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    var self = this;
    this.objects.forEach(function (obj) {
      obj.element.style.width = self.cardW + "px";
      obj.element.style.height = self.cardH + "px";
    });
  },

  /**
   * 카드 상태 프리셋 (diff = cardIndex - currentIndex)
   */
  getPreset(diff) {
    var h = this.cardH;
    if (diff === 0) {
      return {
        x: 0,
        y: 0,
        z: 0,
        scale: 1,
        opacity: 1,
        visible: true,
        brightness: 1,
      };
    }
    if (diff === -1) {
      return {
        x: 0,
        y: -h * 0.55,
        z: -400,
        scale: 0.5,
        opacity: 1,
        visible: true,
        brightness: 0.9,
      };
    }
    if (diff <= -2) {
      return {
        x: 0,
        y: -h * 0.65,
        z: -700,
        scale: 0.4,
        opacity: 1,
        visible: false,
        brightness: 0.85,
      };
    }
    // diff >= 1 (다음 카드들)
    return {
      x: 0,
      y: -h * 0.55,
      z: 500,
      scale: 1.15,
      opacity: 0,
      visible: false,
      brightness: 1,
    };
  },

  /**
   * 모든 카드 목표값 세팅
   */
  setTargets(currentIndex) {
    var self = this;
    this.objects.forEach(function (obj, i) {
      var diff = i - currentIndex;
      var p = self.getPreset(diff);
      obj.userData.tx = p.x;
      obj.userData.ty = p.y;
      obj.userData.tz = p.z;
      obj.userData.tScale = p.scale;
      obj.userData.tOpacity = p.opacity;
      obj.userData.tVisible = p.visible;
      obj.userData.tBrightness = p.brightness;
      obj.userData.interactive = diff === 0;
    });
  },

  /**
   * CSS3DObject 완전 초기화 (뒤집힘 방지 핵심)
   */
  resetObject(obj) {
    // position 초기화
    obj.position.set(0, 0, 0);

    // rotation 초기화 (Euler) - 순서 명시
    obj.rotation.set(0, 0, 0, "XYZ");

    // quaternion 초기화 (identity quaternion)
    obj.quaternion.identity();

    // scale 초기화
    obj.scale.set(1, 1, 1);

    // matrix 강제 업데이트
    obj.matrixAutoUpdate = true;
    obj.updateMatrix();
    obj.updateMatrixWorld(true);

    // element의 transform 스타일 직접 초기화
    var el = obj.element;
    el.style.transform = "";
    el.style.webkitTransform = "";
    el.style.mozTransform = "";
    el.style.msTransform = "";
  },

  /**
   * 즉시 포지셔닝 (애니메이션 없이)
   */
  setImmediate(currentIndex) {
    var self = this;
    this.objects.forEach(function (obj, i) {
      var diff = i - currentIndex;
      var p = self.getPreset(diff);
      var d = obj.userData;

      d.cx = d.tx = p.x;
      d.cy = d.ty = p.y;
      d.cz = d.tz = p.z;
      d.cScale = d.tScale = p.scale;
      d.cOpacity = d.tOpacity = p.opacity;
      d.cBrightness = d.tBrightness = p.brightness;
      d.visible = d.tVisible = p.visible;
      d.interactive = diff === 0;

      // **핵심 수정: 회전 완전 초기화**
      obj.rotation.set(0, 0, 0, "XYZ");
      obj.quaternion.identity();

      // 위치 설정
      obj.position.set(p.x, p.y, p.z);
      obj.scale.setScalar(p.scale);

      // matrix 강제 업데이트
      obj.updateMatrix();
      obj.updateMatrixWorld(true);

      obj.visible = p.visible;
      obj.element.style.opacity = p.opacity;
      obj.element.style.filter = "brightness(" + p.brightness + ")";
      obj.element.style.pointerEvents = diff === 0 ? "auto" : "none";
    });
  },

  /**
   * 마우스 기반 카메라 패럴랙스
   */
  updateCamera(mx, my) {
    var targetX = (mx - window.innerWidth / 2) * 0.03;
    var targetY = -(my - window.innerHeight / 2) * 0.03;
    this.camera.position.x = Utils.lerp(this.camera.position.x, targetX, 0.06);
    this.camera.position.y = Utils.lerp(this.camera.position.y, targetY, 0.06);
    this.camera.position.z = Utils.lerp(
      this.camera.position.z,
      this.camBaseZ,
      0.06,
    );
  },

  /**
   * 스크롤 미리보기 효과 (active 카드 + next 카드)
   */
  applyScrollPreview(currentIndex, accumulator, threshold) {
    var absScroll = Math.abs(accumulator);
    var progress = Utils.clamp(absScroll / threshold, 0, 1);
    var obj = this.objects[currentIndex];
    if (!obj) return;

    if (accumulator > 0) {
      // 아래로 스크롤 → 현재 카드 뒤로 밀림
      obj.userData.ty = -absScroll * 0.3;
      obj.userData.tz = -absScroll * 1.0;
      obj.userData.tScale = 1 - progress * 0.08;

      // 다음 카드 미리 등장
      var nextObj = this.objects[currentIndex + 1];
      if (nextObj) {
        var h = this.cardH;
        nextObj.userData.tVisible = true;
        nextObj.userData.tOpacity = Utils.clamp(progress * 2.5, 0, 1);
        nextObj.userData.ty = -h * 0.55 * (1 - progress);
        nextObj.userData.tz = 500 * (1 - progress);
        nextObj.userData.tScale = 1.15 - progress * 0.15;
      }
    } else if (accumulator < 0) {
      // 위로 스크롤
      obj.userData.ty = -absScroll * 0.3;
      obj.userData.tz = absScroll * 1.2;
    }
  },

  /**
   * 스크롤 미리보기 리셋
   */
  resetScrollPreview(currentIndex) {
    this.setTargets(currentIndex);
  },

  /**
   * 매 프레임 보간 업데이트
   */
  update(currentIndex) {
    var speed = 0.1;

    this.objects.forEach(function (obj, i) {
      var d = obj.userData;

      // visible 상태 먼저 처리 (보여야 할 카드 활성화)
      if (d.tVisible && !d.visible) {
        d.visible = true;
        obj.visible = true;
      }

      // Position lerp
      d.cx = Utils.lerp(d.cx, d.tx, speed);
      d.cy = Utils.lerp(d.cy, d.ty, speed);
      d.cz = Utils.lerp(d.cz, d.tz, speed);
      obj.position.set(d.cx, d.cy, d.cz);

      // Scale lerp
      d.cScale = Utils.lerp(d.cScale, d.tScale, speed);
      obj.scale.setScalar(d.cScale);

      // Opacity lerp
      var prevOpacity = d.cOpacity;
      d.cOpacity = Utils.lerp(d.cOpacity, d.tOpacity, speed);
      if (Math.abs(d.cOpacity - prevOpacity) > 0.001) {
        obj.element.style.opacity = d.cOpacity;
      }

      // Brightness lerp
      var prevBrightness = d.cBrightness;
      d.cBrightness = Utils.lerp(d.cBrightness, d.tBrightness, speed);
      if (Math.abs(d.cBrightness - prevBrightness) > 0.001) {
        obj.element.style.filter = "brightness(" + d.cBrightness + ")";
      }

      // 완전히 투명해지면 숨김
      if (!d.tVisible && d.cOpacity < 0.01) {
        d.visible = false;
        obj.visible = false;
      }

      // 포인터 이벤트 (변경 시에만 style 업데이트)
      if (d.interactive !== d.cInteractive) {
        obj.element.style.pointerEvents = d.interactive ? "auto" : "none";
        d.cInteractive = d.interactive;
      }
    });
  },

  /**
   * 렌더
   */
  render() {
    this.renderer.render(this.scene, this.camera);
  },

  /**
   * 풀스크린 진입 시 씬에서 분리
   */
  detach(index) {
    var obj = this.objects[index];
    if (obj) {
      // 분리 전 현재 상태 저장
      this.initialStates[index] = {
        position: { x: obj.position.x, y: obj.position.y, z: obj.position.z },
        rotation: { x: obj.rotation.x, y: obj.rotation.y, z: obj.rotation.z },
        scale: obj.scale.x,
      };
      this.scene.remove(obj);
    }
  },

  /**
   * 풀스크린 종료 시 씬에 재연결 (완전 초기화)
   */
  reattach(index, currentIndex) {
    var obj = this.objects[index];
    if (!obj) return;

    var element = obj.element;

    // **핵심 수정: 기존 CSS3DObject 제거 후 새로 생성**
    // CSS3DObject의 내부 상태가 꼬일 수 있으므로 완전히 새로 만듦
    var newObj = new THREE.CSS3DObject(element);

    // userData 복사
    newObj.userData = obj.userData;

    // 완전 초기화
    newObj.position.set(0, 0, 0);
    newObj.rotation.set(0, 0, 0, "XYZ");
    newObj.quaternion.identity();
    newObj.scale.set(1, 1, 1);
    newObj.matrixAutoUpdate = true;
    newObj.updateMatrix();

    // objects 배열 업데이트
    this.objects[index] = newObj;

    // 씬에 추가
    this.scene.add(newObj);
  },
};

// ========================================
// App: Main Controller
// ========================================
var App = {
  cards: [],
  indicator: null,
  current: 0,
  isAnimating: false,
  isFullscreen: false,

  // Scroll state
  scroll: {
    accumulator: 0,
    threshold: 250,
    timeout: null,
  },

  // Mouse state
  mouse: { x: window.innerWidth / 2, y: window.innerHeight / 2 },

  _boundAnimate: null,

  init() {
    // 터치 기기 여부 (모바일/태블릿): 패럴랙스 비활성화에 사용
    this._isTouchDevice =
      navigator.maxTouchPoints > 0 || "ontouchstart" in window;

    // #card-source에서 카드 요소 수집
    var source = Utils.$("#card-source");
    this.cards = Array.from(source.querySelectorAll(".card"));

    this.indicator = Utils.$("#indicator");

    // Three.js 스택 초기화
    ThreeStack.init(this.cards);
    ThreeStack.setImmediate(this.current);

    this.createIndicator();
    this.bindEvents();
    this.updateTitle();
    this._boundAnimate = this.animate.bind(this);
    this.animate();
  },

  createIndicator() {
    this.indicator.innerHTML = "";
    var self = this;
    this.cards.forEach(function (_, i) {
      var dot = document.createElement("span");
      dot.className = "dot" + (i === self.current ? " active" : "");
      dot.onclick = function () {
        self.navigateTo(i);
      };
      self.indicator.appendChild(dot);
    });
  },

  updateIndicator() {
    var current = this.current;
    this.indicator.querySelectorAll(".dot").forEach(function (dot, i) {
      dot.classList.toggle("active", i === current);
    });
  },

  updateTitle() {
    document.title = "Card " + (this.current + 1) + " / " + this.cards.length;
  },

  setCardActive(index, active) {
    var card = this.cards[index];
    if (!card) return;

    var cardId = card.id;
    if (cardId === "card-4" && window.Card4) {
      if (active) Card4.activate();
      else Card4.deactivate();
    }
    if (cardId === "card-6" && window.Card6) {
      if (active) Card6.activate();
      else Card6.deactivate();
    }
    // 필요 시 다른 카드 추가
  },

  bindEvents() {
    var self = this;

    // Card clicks (풀스크린 진입)
    this.cards.forEach(function (card, i) {
      card.addEventListener("click", function (e) {
        if (i === self.current && !self.isFullscreen && !self.isAnimating) {
          e.stopPropagation();
          self.enterFullscreen(i);
        }
      });
    });

    // Close buttons
    Utils.$$(".close-btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (self.isFullscreen) history.back();
      });
    });

    // Browser back
    window.addEventListener("popstate", function () {
      if (self.isFullscreen) self.exitFullscreen();
    });

    // Keyboard
    document.addEventListener("keydown", function (e) {
      if (self.isFullscreen) return; // 풀스크린에서는 네비게이션 비활성화
      if (e.key === "ArrowDown") {
        e.preventDefault();
        self.navigateTo(self.current + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        self.navigateTo(self.current - 1);
      }
    });

    // Mouse tracking (터치 기기에서는 합성 mousemove가 패럴랙스를 오작동시키므로 무시)
    if (!self._isTouchDevice) {
      document.addEventListener("mousemove", function (e) {
        self.mouse.x = e.clientX;
        self.mouse.y = e.clientY;
      });
    }

    // Wheel
    document.addEventListener(
      "wheel",
      function (e) {
        self.handleWheel(e);
      },
      { passive: false },
    );

    // ── 줌 방지 ──────────────────────────────────────────────
    // iOS Safari/Chrome은 viewport user-scalable=no를 무시하므로 JS로 차단
    // gesture* : iOS Safari 핀치줌 이벤트
    document.addEventListener(
      "gesturestart",
      function (e) {
        e.preventDefault();
      },
      { passive: false },
    );
    document.addEventListener(
      "gesturechange",
      function (e) {
        e.preventDefault();
      },
      { passive: false },
    );
    document.addEventListener(
      "gestureend",
      function (e) {
        e.preventDefault();
      },
      { passive: false },
    );
    // 멀티터치(핀치) 차단
    document.addEventListener(
      "touchstart",
      function (e) {
        if (e.touches.length > 1) e.preventDefault();
      },
      { passive: false },
    );
    // 더블탭 줌 차단
    var _lastTap = 0;
    document.addEventListener(
      "touchend",
      function (e) {
        var now = Date.now();
        if (now - _lastTap < 300) e.preventDefault();
        _lastTap = now;
      },
      { passive: false },
    );
    // ─────────────────────────────────────────────────────────

    // Touch
    var touchStartY = 0,
      touchStartX = 0,
      touchActive = false;
    document.addEventListener(
      "touchstart",
      function (e) {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        touchActive = true;
      },
      { passive: true },
    );

    document.addEventListener(
      "touchmove",
      function (e) {
        // 멀티터치(핀치) 항상 차단
        if (e.touches.length > 1) {
          e.preventDefault();
          return;
        }
        if (!touchActive || self.isAnimating || self.isFullscreen) return;
        var deltaY = touchStartY - e.touches[0].clientY;
        var deltaX = touchStartX - e.touches[0].clientX;
        // 세로 스와이프만 처리 (가로보다 세로 이동이 클 때)
        if (Math.abs(deltaY) > Math.abs(deltaX)) {
          e.preventDefault(); // 브라우저 기본 동작(취소·스크롤) 방지
          ThreeStack.applyScrollPreview(
            self.current,
            deltaY,
            self.scroll.threshold,
          );
        } else {
          // 가로 터치 위치 → 카메라 패럴랙스에 사용
          self.mouse.x = e.touches[0].clientX;
          self.mouse.y = e.touches[0].clientY;
        }
      },
      { passive: false },
    );

    document.addEventListener(
      "touchend",
      function (e) {
        if (!touchActive) return;
        touchActive = false;
        // 터치 종료 후 패럴랙스를 화면 중심으로 부드럽게 복귀
        self.mouse.x = window.innerWidth / 2;
        self.mouse.y = window.innerHeight / 2;
        if (self.isAnimating || self.isFullscreen) {
          return;
        }
        var deltaY = touchStartY - e.changedTouches[0].clientY;
        var deltaX = touchStartX - e.changedTouches[0].clientX;
        ThreeStack.resetScrollPreview(self.current);
        // 세로 스와이프 & 50px 이상 이동 시 카드 전환
        if (Math.abs(deltaY) > 50 && Math.abs(deltaY) > Math.abs(deltaX)) {
          self.navigateTo(self.current + (deltaY > 0 ? 1 : -1));
        }
      },
      { passive: true },
    );

    document.addEventListener(
      "touchcancel",
      function () {
        touchActive = false;
        ThreeStack.resetScrollPreview(self.current);
      },
      { passive: true },
    );

    // 화면 회전 대응 (iOS에서 orientationchange 후 약간 딜레이 필요)
    window.addEventListener("orientationchange", function () {
      setTimeout(function () {
        ThreeStack.onResize();
      }, 200);
    });

    // visualViewport: iOS Safari/Chrome에서 주소창 표시/숨김 시 크기 변화 대응
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", function () {
        ThreeStack.onResize();
      });
    }
  },

  handleWheel(e) {
    e.preventDefault();
    if (this.isAnimating || this.isFullscreen) return;

    this.scroll.accumulator += e.deltaY * 0.8;
    var absScroll = Math.abs(this.scroll.accumulator);

    // 스크롤 미리보기 효과
    ThreeStack.applyScrollPreview(
      this.current,
      this.scroll.accumulator,
      this.scroll.threshold,
    );

    clearTimeout(this.scroll.timeout);

    if (absScroll > this.scroll.threshold) {
      var dir = this.scroll.accumulator > 0 ? 1 : -1;
      this.resetScroll();
      this.navigateTo(this.current + dir);
    } else {
      var self = this;
      this.scroll.timeout = setTimeout(function () {
        self.resetScroll();
      }, 800);
    }
  },

  resetScroll() {
    this.scroll.accumulator = 0;
    ThreeStack.resetScrollPreview(this.current);
  },

  navigateTo(index) {
    if (
      this.isAnimating ||
      index < 0 ||
      index >= this.cards.length ||
      index === this.current ||
      this.isFullscreen
    )
      return;

    this.isAnimating = true;
    var self = this;
    var direction = index > this.current ? "down" : "up";
    var oldIndex = this.current;
    this.current = index;

    // 이전 카드 즉시 비활성화 → WebGL 렌더 즉시 중단
    this.setCardActive(oldIndex, false);
    // 신규 카드 WebGL은 CSS3D 전환 완료 후 활성화 (전환 중 GPU 경합 제거)

    // Three.js 목표값 세팅 (모든 카드 재배치)
    ThreeStack.setTargets(this.current);

    // 트랜지션 애니메이션을 위한 중간 상태
    var oldObj = ThreeStack.objects[oldIndex];
    var newObj = ThreeStack.objects[index];

    if (direction === "down") {
      // 나가는 카드: 뒤로 밀림 (setTargets에서 이미 처리됨)

      // 들어오는 카드: 현재 위치에서 center로 이동
      newObj.userData.tVisible = true;
      newObj.userData.interactive = true;
      newObj.userData.tOpacity = 1;
      newObj.userData.tx = 0;
      newObj.userData.ty = 0;
      newObj.userData.tz = 0;
      newObj.userData.tScale = 1;
      newObj.userData.tBrightness = 1;

      // 나가는 카드 비활성
      oldObj.userData.interactive = false;
    } else {
      // 위로 올라감: 나가는 카드는 아래로 날아감
      oldObj.userData.ty = -ThreeStack.cardH * 0.8;
      oldObj.userData.tz = 600;
      oldObj.userData.tScale = 1.1;
      oldObj.userData.tOpacity = 0;
      oldObj.userData.interactive = false;

      // 들어오는 카드: center로 이동
      newObj.userData.tVisible = true;
      newObj.userData.interactive = true;
      newObj.userData.tOpacity = 1;
      newObj.userData.tx = 0;
      newObj.userData.ty = 0;
      newObj.userData.tz = 0;
      newObj.userData.tScale = 1;
      newObj.userData.tBrightness = 1;
    }

    this.updateIndicator();
    this.updateTitle();

    // CSS3D 전환 완료 후 신규 카드 WebGL 활성화 + 정리
    setTimeout(function () {
      ThreeStack.setImmediate(self.current);
      self.setCardActive(index, true);
      self.isAnimating = false;
    }, 850);
  },

  enterFullscreen(index) {
    var card = this.cards[index];
    this.isFullscreen = true;

    // 현재 카드의 시각적 위치(bounding rect) 캡처
    var rect = card.getBoundingClientRect();

    // Three.js 씬에서 분리
    ThreeStack.detach(index);

    // document.body로 이동, fixed 포지셔닝
    document.body.appendChild(card);

    // CSS3DRenderer가 적용한 inline transform 초기화
    Object.assign(card.style, {
      position: "fixed",
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      height: rect.height + "px",
      transform: "none",
      webkitTransform: "none",
      mozTransform: "none",
      msTransform: "none",
      transition: "none",
      zIndex: "1000",
      visibility: "visible",
      opacity: "1",
      filter: "none",
      pointerEvents: "auto",
      backfaceVisibility: "hidden",
    });

    card.offsetHeight; // reflow

    Object.assign(card.style, {
      transition: "all 0.6s cubic-bezier(0.4,0,0.2,1)",
      top: "0",
      left: "0",
      // iOS에서 100vh는 주소창 포함 전체 높이라 실제 보이는 영역을 초과함
      // window.innerWidth/Height는 실제 가시 영역을 반환
      width: window.innerWidth + "px",
      height: window.innerHeight + "px",
      borderRadius: "0",
    });

    card.classList.add("fullscreen");
    document.body.style.overflow = "hidden";
    history.pushState({ fullscreen: true }, "");

    // Card-specific actions
    if (card.id === "card-1" && window.Card1) Card1.onEnterFullscreen();
    if (card.id === "card-2" && window.Card2) Card2.resume();
  },

  exitFullscreen() {
    var card = this.cards[this.current];
    var index = this.current;
    var self = this;

    if (window.Card2) Card2.pauseAll();
    if (window.Card5) Card5.closeVideo();

    var targetW = ThreeStack.cardW;
    var targetH = ThreeStack.cardH;
    var targetL = (window.innerWidth - targetW) / 2;
    var targetT = (window.innerHeight - targetH) / 2;

    card.classList.add("shrinking");

    Object.assign(card.style, {
      transition: "all 0.6s cubic-bezier(0.4,0,0.2,1)",
      top: targetT + "px",
      left: targetL + "px",
      width: targetW + "px",
      height: targetH + "px",
      borderRadius: "24px",
      transform: "none",
      webkitTransform: "none",
    });

    setTimeout(function () {
      card.classList.remove("fullscreen", "shrinking");

      // **핵심 수정: 모든 스타일 완전 초기화**
      // CSS3DRenderer가 다시 제어할 수 있도록 inline 스타일 제거
      card.style.cssText = "";

      // 필수 속성만 다시 설정
      card.style.width = ThreeStack.cardW + "px";
      card.style.height = ThreeStack.cardH + "px";
      card.style.position = "absolute";
      card.style.visibility = "visible";
      card.style.opacity = "1";
      card.style.pointerEvents = "auto";
      card.style.backfaceVisibility = "hidden";

      // transform 관련 속성 명시적 초기화
      card.style.transform = "none";
      card.style.webkitTransform = "none";
      card.style.mozTransform = "none";
      card.style.msTransform = "none";

      // reflow 강제
      card.offsetHeight;

      // Three.js 씬에 재연결 (새 CSS3DObject 생성)
      ThreeStack.reattach(index, self.current);

      // 약간의 딜레이 후 위치 설정 (렌더링 안정화)
      requestAnimationFrame(function () {
        ThreeStack.setImmediate(self.current);

        // 추가 안정화
        requestAnimationFrame(function () {
          ThreeStack.setImmediate(self.current);
        });
      });

      self.isFullscreen = false;
      document.body.style.overflow = "";
    }, 600);
  },

  /**
   * 메인 애니메이션 루프
   */
  animate() {
    ThreeStack.updateCamera(this.mouse.x, this.mouse.y);

    // 카드 보간 업데이트
    ThreeStack.update(this.current);

    // Three.js 렌더
    ThreeStack.render();

    requestAnimationFrame(this._boundAnimate);
  },
};

// ========================================
// Initialize
// ========================================
document.addEventListener("DOMContentLoaded", function () {
  // 우클릭 컨텍스트 메뉴 차단
  document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
  });

  App.init();
  Popup.init();
  VideoPopup.init();

  // Card 모듈 초기화 (각 card*.js에서 window에 등록)
  if (window.Card1) Card1.init();
  if (window.Card2) Card2.init();
  if (window.Card4) Card4.init();
  if (window.Card5) Card5.init();
  if (window.Card6) Card6.init();

  // 초기 카드 활성화 (리소스 최적화 - 현재 카드만 애니메이션)
  setTimeout(function () {
    App.setCardActive(App.current, true);
  }, 100);

  // 뮤트 버튼 토글
  var muteBtn = document.getElementById("mute-btn");
  var muteIcon = document.getElementById("mute-icon");
  if (muteBtn) {
    muteBtn.addEventListener("click", function () {
      var isMuted = !muteBtn.classList.contains("unmuted");
      if (isMuted) {
        muteBtn.classList.add("unmuted");
        if (muteIcon) muteIcon.textContent = "🔊";
        // 현재 재생 중인 Card6 오디오 볼륨 복원
        if (window.Card6 && window.Card6.positionalAudio) {
          window.Card6.positionalAudio.setVolume(1.0);
        }
      } else {
        muteBtn.classList.remove("unmuted");
        if (muteIcon) muteIcon.textContent = "🔇";
        // 현재 재생 중인 Card6 오디오 음소거
        if (window.Card6 && window.Card6.positionalAudio) {
          window.Card6.positionalAudio.setVolume(0);
        }
      }
    });
  }
});
