// Card 5 - Three.js 나선형 계단 (환부채꼴 모양)
(function () {
  var card5 = document.getElementById("card-5");
  var container = document.getElementById("c5-container");
  var progressEl = document.getElementById("c5-progress");
  var particleContainer = document.getElementById("particle-container-5");
  var videoPopup = document.getElementById("c5-video-popup");
  var videoEl = document.getElementById("c5-video");
  var videoClose = document.getElementById("c5-video-close");

  if (!card5 || !container || typeof THREE === "undefined") return;

  // === 파라미터 ===
  var TOTAL_STAIRS = 30;
  var STAIR_HEIGHT = 2.0;
  var ANGLE_PER_STAIR = 25; // 각 계단이 차지하는 각도
  var INNER_RADIUS = 1.0;   // 환부채꼴 안쪽 반지름
  var OUTER_RADIUS = 7.0;   // 환부채꼴 바깥쪽 반지름
  var STAIR_THICKNESS = 2.2; // 계단 두께 (높이)
  var EYE_HEIGHT = 4.5;

  // 액자 (3층마다)
  var FRAME_STAIRS = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27];
  var VIDEOS = [
    "Video/vid1.mp4",
    "Video/vid2.mp4",
    "Video/vid3.mp4",
    "Video/vid4.mp4",
    "Video/vid5.mp4",
    "Video/vid6.mp4",
  ];

  // Three.js
  var scene, camera, renderer, raycaster, mouse;
  var frameMeshes = [];
  var frameVideoMap = {};
  var scrollProgress = 0,
    targetScrollProgress = 0;
  var maxScroll = 100,
    hasExploded = false,
    explodeThreshold = 85;
  var isInitialized = false;
  var isMobile = window.innerWidth <= 768;

  // === 환부채꼴 지오메트리 생성 ===
  function createAnnularSectorGeometry(innerRadius, outerRadius, startAngle, endAngle, height) {
    var shape = new THREE.Shape();
    var segments = 12;
    var angleSpan = endAngle - startAngle;
    
    // 바깥쪽 호 (시작점)
    shape.moveTo(
      Math.cos(startAngle) * outerRadius,
      Math.sin(startAngle) * outerRadius
    );
    
    // 바깥쪽 호
    for (var i = 1; i <= segments; i++) {
      var angle = startAngle + (angleSpan * i) / segments;
      shape.lineTo(
        Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius
      );
    }
    
    // 안쪽 호로 연결
    for (var i = segments; i >= 0; i--) {
      var angle = startAngle + (angleSpan * i) / segments;
      shape.lineTo(
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius
      );
    }
    
    shape.closePath();
    
    // ExtrudeGeometry로 두께 생성
    var extrudeSettings = {
      depth: height,
      bevelEnabled: false
    };
    
    var geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    // XY 평면에서 XZ 평면으로 회전 (바닥에 놓이도록)
    geometry.rotateX(-Math.PI / 2);
    
    return geometry;
  }

  // === 초기화 ===
  function initThree() {
    if (isInitialized) return;
    isInitialized = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    scene.fog = new THREE.Fog(0xffffff, 20, 80);

    camera = new THREE.PerspectiveCamera(isMobile ? 80 : 75, 1, 0.1, 150);

    renderer = new THREE.WebGLRenderer({ antialias: !isMobile, alpha: false });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2)
    );
    container.appendChild(renderer.domElement);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 조명
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    var dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(10, 50, 10);
    scene.add(dirLight);

    createPillar();
    createStairs();

    handleResize();
    animate();
  }

  // === 기둥 ===
  function createPillar() {
    var h = TOTAL_STAIRS * STAIR_HEIGHT + 15;
    var geo = new THREE.CylinderGeometry(INNER_RADIUS * 0.8, INNER_RADIUS * 0.8, h, 16);
    var mat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = h / 2 - 2;
    scene.add(mesh);
  }

  // === 계단 (환부채꼴) ===
  function createStairs() {
    var mat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    var railGeo = new THREE.CylinderGeometry(0.1, 0.1, 2.0, 6);
    var railMat = new THREE.MeshBasicMaterial({ color: 0x333333 });

    for (var i = 0; i < TOTAL_STAIRS; i++) {
      // 계단 시작/끝 각도 (라디안)
      var startAngle = (i * ANGLE_PER_STAIR * Math.PI) / 180;
      var endAngle = ((i + 1) * ANGLE_PER_STAIR * Math.PI) / 180;
      var midAngle = (startAngle + endAngle) / 2;
      var y = i * STAIR_HEIGHT;

      // 환부채꼴 계단 생성
      var stairGeo = createAnnularSectorGeometry(
        INNER_RADIUS,
        OUTER_RADIUS,
        startAngle,
        endAngle,
        STAIR_THICKNESS
      );
      var stair = new THREE.Mesh(stairGeo, mat);
      stair.position.y = y;
      scene.add(stair);

      // 난간 (바깥쪽 끝)
      var railX = Math.cos(midAngle) * (OUTER_RADIUS - 0.3);
      var railZ = Math.sin(midAngle) * (OUTER_RADIUS - 0.3);
      var rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(railX, y + STAIR_THICKNESS + 1.0, railZ);
      scene.add(rail);

      // 액자 (3층마다)
      if (FRAME_STAIRS.indexOf(i) !== -1) {
        createFrame(midAngle, y, i);
      }
    }
  }

  // === 액자 ===
  function createFrame(angle, y, stairIndex) {
    var group = new THREE.Group();
    var videoSrc = VIDEOS[stairIndex % VIDEOS.length];

    // 프레임
    var outerGeo = new THREE.BoxGeometry(1.4, 1.1, 0.12);
    group.add(
      new THREE.Mesh(
        outerGeo,
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      )
    );

    var innerGeo = new THREE.BoxGeometry(1.2, 0.9, 0.13);
    var innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    var inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.z = 0.01;
    group.add(inner);

    // 재생 아이콘
    var tri = new THREE.Shape();
    tri.moveTo(-0.12, -0.15);
    tri.lineTo(-0.12, 0.15);
    tri.lineTo(0.15, 0);
    tri.lineTo(-0.12, -0.15);
    var triMesh = new THREE.Mesh(
      new THREE.ShapeGeometry(tri),
      new THREE.MeshBasicMaterial({ color: 0x222222 })
    );
    triMesh.position.z = 0.08;
    group.add(triMesh);

    // 위치: 계단 바깥쪽, 눈높이
    var frameRadius = OUTER_RADIUS + 0.8;
    group.position.set(
      Math.cos(angle) * frameRadius,
      y + EYE_HEIGHT,
      Math.sin(angle) * frameRadius
    );
    // 액자가 중심을 향하도록 회전
    group.rotation.y = -angle + Math.PI / 2;
    scene.add(group);

    inner.userData.videoSrc = videoSrc;
    frameMeshes.push(inner);
    frameVideoMap[inner.uuid] = videoSrc;
  }

  // === 카메라 ===
  function updateCamera() {
    var t = scrollProgress / maxScroll;
    var idx = t * TOTAL_STAIRS;
    var h = idx * STAIR_HEIGHT;
    var ang = (idx * ANGLE_PER_STAIR * Math.PI) / 180;

    // 위치: 계단 중간 반지름, 오른쪽으로 이동
    var camRadius = (INNER_RADIUS + OUTER_RADIUS) / 2 + 2.0;
    var camX = Math.cos(ang) * camRadius;
    var camZ = Math.sin(ang) * camRadius;
    camera.position.set(camX, h + 21, camZ);

    // 시선: 앞 계단
    var lookIdx = idx + 3;
    var lookAng = (lookIdx * ANGLE_PER_STAIR * Math.PI) / 180;
    var lookH = lookIdx * STAIR_HEIGHT;
    var lookRadius = (INNER_RADIUS + OUTER_RADIUS) / 2;
    camera.lookAt(
      Math.cos(lookAng) * lookRadius,
      lookH + 1,
      Math.sin(lookAng) * lookRadius
    );

    if (progressEl) progressEl.textContent = Math.floor(idx) + 1 + "F";

    // 파티클
    if (scrollProgress >= explodeThreshold && !hasExploded) {
      hasExploded = true;
      createParticles();
    }
    if (scrollProgress < explodeThreshold - 10) hasExploded = false;
  }

  // === 파티클 ===
  function createParticles() {
    if (!particleContainer) return;
    var colors = ["#000", "#333", "#666", "#999", "#ccc"];
    for (var i = 0; i < 60; i++) {
      var p = document.createElement("div");
      p.className = "particle";
      var size = Math.random() * 10 + 4;
      var color = colors[Math.floor(Math.random() * colors.length)];
      var cx = window.innerWidth / 2,
        cy = window.innerHeight * 0.3;
      var a = Math.random() * Math.PI * 2;
      var d = Math.random() * 300 + 60;
      p.style.cssText =
        "width:" + size + "px;height:" + size + "px;background:" + color +
        ";left:" + cx + "px;top:" + cy + "px;--tx:" + Math.cos(a) * d +
        "px;--ty:" + Math.sin(a) * d + "px";
      particleContainer.appendChild(p);
      setTimeout(function (el) { el.remove(); }, 1200, p);
    }
  }

  // === 애니메이션 ===
  function animate() {
    requestAnimationFrame(animate);

    var diff = targetScrollProgress - scrollProgress;
    if (Math.abs(diff) > 0.005) {
      var t = Math.min(Math.abs(diff) / 50, 1);
      var ease = 1 - Math.pow(t, 2);
      scrollProgress += diff * (0.01 + ease * 0.02);
    } else {
      scrollProgress = targetScrollProgress;
    }

    updateCamera();
    renderer.render(scene, camera);
  }

  // === 리사이즈 ===
  function handleResize() {
    var w = container.clientWidth || 1;
    var h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    isMobile = window.innerWidth <= 768;
  }
  window.addEventListener("resize", function () {
    if (isInitialized) handleResize();
  });

  // === 비디오 ===
  function openVideo(src) {
    if (videoEl && src) {
      videoEl.src = src;
      videoPopup.classList.add("active");
      videoEl.play();
    }
  }
  function closeVideo() {
    videoPopup.classList.remove("active");
    if (videoEl) {
      videoEl.pause();
      videoEl.src = "";
    }
  }
  if (videoClose) videoClose.onclick = closeVideo;
  if (videoPopup)
    videoPopup.onclick = function (e) {
      if (e.target === videoPopup) closeVideo();
    };

  // === 클릭 ===
  container.addEventListener("click", function (e) {
    if (
      !card5.classList.contains("fullscreen") ||
      videoPopup.classList.contains("active")
    )
      return;
    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var hits = raycaster.intersectObjects(frameMeshes);
    if (hits.length > 0) {
      var src =
        hits[0].object.userData.videoSrc || frameVideoMap[hits[0].object.uuid];
      if (src) openVideo(src);
    }
  });

  // === 휠 ===
  card5.addEventListener(
    "wheel",
    function (e) {
      if (
        !card5.classList.contains("fullscreen") ||
        videoPopup.classList.contains("active")
      )
        return;
      e.preventDefault();
      var delta = e.deltaY > 0 ? 1.5 : -1.5;
      targetScrollProgress = Math.max(
        0,
        Math.min(maxScroll, targetScrollProgress + delta)
      );
    },
    { passive: false }
  );

  // === 터치 ===
  var touchY = 0;
  card5.addEventListener(
    "touchstart",
    function (e) {
      if (
        !card5.classList.contains("fullscreen") ||
        videoPopup.classList.contains("active")
      )
        return;
      touchY = e.touches[0].clientY;
    },
    { passive: true }
  );
  card5.addEventListener(
    "touchmove",
    function (e) {
      if (
        !card5.classList.contains("fullscreen") ||
        videoPopup.classList.contains("active")
      )
        return;
      var dy = touchY - e.touches[0].clientY;
      touchY = e.touches[0].clientY;
      targetScrollProgress = Math.max(
        0,
        Math.min(maxScroll, targetScrollProgress + dy * 0.2)
      );
    },
    { passive: true }
  );

  // === ESC ===
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && videoPopup.classList.contains("active"))
      closeVideo();
  });

  // === 초기화 트리거 ===
  var observer = new MutationObserver(function () {
    if (card5.classList.contains("fullscreen")) {
      if (!isInitialized) initThree();
      setTimeout(handleResize, 100);
    }
  });
  observer.observe(card5, { attributes: true, attributeFilter: ["class"] });

  setTimeout(function () {
    initThree();
    handleResize();
  }, 300);

  window.initCard5 = function () {
    scrollProgress = targetScrollProgress = 0;
    hasExploded = false;
  };
  window.stopCard5Video = closeVideo;
})();
