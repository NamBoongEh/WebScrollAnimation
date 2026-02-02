// Card 5 - Three.js 나선형 계단
(function() {
  var card5 = document.getElementById('card-5');
  var container = document.getElementById('c5-container');
  var progressEl = document.getElementById('c5-progress');
  var particleContainer = document.getElementById('particle-container-5');
  var videoPopup = document.getElementById('c5-video-popup');
  var videoEl = document.getElementById('c5-video');
  var videoClose = document.getElementById('c5-video-close');

  if (!card5 || !container || typeof THREE === 'undefined') return;

  // === 파라미터 ===
  var TOTAL_STAIRS = 30;
  var STAIR_HEIGHT = 2.0;       // 계단 간 높이 차이
  var SPIRAL_RADIUS = 6.0;      // 나선 반경
  var ANGLE_PER_STAIR = 25;     // 계단당 회전 각도
  var BOX_W = 5.0, BOX_H = 0.6, BOX_D = 1.8;  // 직사각형 계단 크기

  // 액자가 있는 계단 인덱스와 비디오 경로
  var FRAME_STAIRS = [
    { index: 2,  video: 'Video/vid1.mp4' },
    { index: 5,  video: 'Video/vid2.mp4' },
    { index: 8,  video: 'Video/vid3.mp4' },
    { index: 11, video: 'Video/vid4.mp4' },
    { index: 14, video: 'Video/vid5.mp4' },
    { index: 17, video: 'Video/vid6.mp4' },
    { index: 20, video: 'Video/vid1.mp4' },
    { index: 23, video: 'Video/vid2.mp4' },
    { index: 26, video: 'Video/vid3.mp4' },
    { index: 29, video: 'Video/vid4.mp4' }
  ];

  // === Three.js 셋업 ===
  var scene, camera, renderer, raycaster, mouse;
  var stairMeshes = [];      // 계단 메쉬 배열
  var frameMeshes = [];      // 액자 메쉬 배열 (클릭 가능)
  var frameVideoMap = {};    // mesh.uuid → video src
  var pillarMesh;
  var particleGroup;         // 파티클 그룹
  var particles = [];

  var scrollProgress = 0;
  var targetScrollProgress = 0;
  var maxScroll = 100;
  var hasExploded = false;
  var explodeThreshold = 85;
  var isInitialized = false;

  // === 초기화 ===
  function initThree() {
    if (isInitialized) return;
    isInitialized = true;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15);
    scene.fog = new THREE.Fog(0x0a0a15, 15, 60);

    // Camera - 1인칭 (아래에서 위를 올려다봄)
    camera = new THREE.PerspectiveCamera(65, 1, 0.1, 100);
    camera.position.set(0, 2, 0);
    camera.lookAt(0, 20, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Raycaster
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // 조명
    var ambientLight = new THREE.AmbientLight(0x334466, 0.6);
    scene.add(ambientLight);

    var dirLight = new THREE.DirectionalLight(0xffeedd, 0.8);
    dirLight.position.set(5, 30, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // 아래에서 위로 올라오는 포인트 라이트
    var pointLight = new THREE.PointLight(0x667eea, 0.5, 50);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // 위쪽 따뜻한 포인트 라이트
    var topLight = new THREE.PointLight(0xf4d03f, 0.4, 80);
    topLight.position.set(0, TOTAL_STAIRS * STAIR_HEIGHT, 0);
    scene.add(topLight);

    // 중앙 기둥
    createPillar();

    // 계단 생성
    createStairs();

    // 파티클 그룹
    particleGroup = new THREE.Group();
    scene.add(particleGroup);

    // 리사이즈
    handleResize();

    // 렌더 루프
    animate();
  }

  // === 중앙 기둥 ===
  function createPillar() {
    var height = TOTAL_STAIRS * STAIR_HEIGHT + 10;
    var geo = new THREE.CylinderGeometry(0.15, 0.15, height, 16);
    var mat = new THREE.MeshStandardMaterial({
      color: 0x4a4a6a,
      metalness: 0.6,
      roughness: 0.4
    });
    pillarMesh = new THREE.Mesh(geo, mat);
    pillarMesh.position.y = height / 2 - 2;
    pillarMesh.castShadow = true;
    scene.add(pillarMesh);
  }

  // === 계단 생성 ===
  function createStairs() {
    var stairGeo = new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D);

    // 액자 인덱스 맵
    var frameMap = {};
    FRAME_STAIRS.forEach(function(f) { frameMap[f.index] = f.video; });

    for (var i = 0; i < TOTAL_STAIRS; i++) {
      var angle = (i * ANGLE_PER_STAIR) * Math.PI / 180;
      var x = Math.sin(angle) * SPIRAL_RADIUS;
      var y = i * STAIR_HEIGHT;
      var z = Math.cos(angle) * SPIRAL_RADIUS;

      // 계단 색상 - 높이에 따라 그라디언트
      var t = i / TOTAL_STAIRS;
      var stairColor = new THREE.Color().lerpColors(
        new THREE.Color(0x2c3e50),
        new THREE.Color(0x4a6785),
        t
      );

      var stairMat = new THREE.MeshStandardMaterial({
        color: stairColor,
        metalness: 0.3,
        roughness: 0.7
      });

      var stairMesh = new THREE.Mesh(stairGeo, stairMat);
      stairMesh.position.set(x, y, z);
      stairMesh.rotation.y = -angle;
      stairMesh.castShadow = true;
      stairMesh.receiveShadow = true;
      scene.add(stairMesh);
      stairMeshes.push(stairMesh);

      // 난간
      var railGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8);
      var railMat = new THREE.MeshStandardMaterial({
        color: 0xc9a86c,
        metalness: 0.7,
        roughness: 0.3
      });
      var rail = new THREE.Mesh(railGeo, railMat);
      // 계단 외측 끝에 배치
      rail.position.set(
        x + Math.sin(angle) * (BOX_W * 0.45),
        y + 0.75,
        z + Math.cos(angle) * (BOX_W * 0.45)
      );
      rail.castShadow = true;
      scene.add(rail);

      // 액자
      if (frameMap[i]) {
        createFrame(x, y, z, angle, frameMap[i]);
      }
    }
  }

  // === 액자 생성 ===
  function createFrame(sx, sy, sz, angle, videoSrc) {
    var frameGroup = new THREE.Group();

    // 액자 테두리 (골드)
    var borderGeo = new THREE.BoxGeometry(1.2, 1.0, 0.1);
    var borderMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xd4af37,
      emissiveIntensity: 0.1
    });
    var borderMesh = new THREE.Mesh(borderGeo, borderMat);
    frameGroup.add(borderMesh);

    // 액자 내부 (어두운 면 - 클릭 대상)
    var innerGeo = new THREE.BoxGeometry(1.0, 0.8, 0.12);
    var innerMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      metalness: 0.1,
      roughness: 0.9,
      emissive: 0x667eea,
      emissiveIntensity: 0.15
    });
    var innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.position.z = 0.02;
    frameGroup.add(innerMesh);

    // ▶ 재생 아이콘 (삼각형)
    var triShape = new THREE.Shape();
    triShape.moveTo(-0.12, -0.15);
    triShape.lineTo(-0.12, 0.15);
    triShape.lineTo(0.15, 0);
    triShape.lineTo(-0.12, -0.15);
    var triGeo = new THREE.ShapeGeometry(triShape);
    var triMat = new THREE.MeshBasicMaterial({ color: 0x667eea });
    var triMesh = new THREE.Mesh(triGeo, triMat);
    triMesh.position.z = 0.08;
    frameGroup.add(triMesh);

    // 계단 내측(기둥 쪽)으로 떠있게 배치
    var offsetInward = BOX_W * 0.15;
    var fx = sx - Math.sin(angle) * offsetInward;
    var fy = sy + 1.5;
    var fz = sz - Math.cos(angle) * offsetInward;

    frameGroup.position.set(fx, fy, fz);
    frameGroup.rotation.y = -angle;

    scene.add(frameGroup);

    // 클릭 감지용 - innerMesh를 대상으로 등록
    innerMesh.userData.videoSrc = videoSrc;
    innerMesh.userData.isFrame = true;
    frameMeshes.push(innerMesh);
    frameVideoMap[innerMesh.uuid] = videoSrc;
  }

  // === 카메라 업데이트 ===
  function updateCamera() {
    var t = scrollProgress / maxScroll;
    var stairIndex = t * TOTAL_STAIRS;
    var currentHeight = stairIndex * STAIR_HEIGHT;
    var currentAngle = (stairIndex * ANGLE_PER_STAIR) * Math.PI / 180;

    // 카메라 위치: 기둥 가까이, 현재 계단 높이
    var camRadius = SPIRAL_RADIUS * 0.3;
    var camX = Math.sin(currentAngle) * camRadius;
    var camY = currentHeight + 1.5;
    var camZ = Math.cos(currentAngle) * camRadius;

    camera.position.set(camX, camY, camZ);

    // 위를 올려다봄 (몇 층 위의 계단 방향)
    var lookAheadStairs = 8;
    var lookIndex = Math.min(stairIndex + lookAheadStairs, TOTAL_STAIRS - 1);
    var lookHeight = lookIndex * STAIR_HEIGHT;
    var lookAngle = (lookIndex * ANGLE_PER_STAIR) * Math.PI / 180;
    var lookX = Math.sin(lookAngle) * SPIRAL_RADIUS * 0.5;
    var lookY = lookHeight + 2;
    var lookZ = Math.cos(lookAngle) * SPIRAL_RADIUS * 0.5;

    camera.lookAt(lookX, lookY, lookZ);

    // 진행률 UI
    if (progressEl) {
      var floor = Math.floor(stairIndex) + 1;
      progressEl.textContent = floor + 'F';
    }

    // 파티클 폭발
    if (scrollProgress >= explodeThreshold && !hasExploded) {
      hasExploded = true;
      createExplosion();
    }
    if (scrollProgress < explodeThreshold - 10) {
      hasExploded = false;
    }
  }

  // === 파티클 폭발 (Three.js 내부) ===
  function createExplosion() {
    var colors = [0xd4af37, 0xf4d03f, 0x667eea, 0x764ba2, 0xffffff];
    for (var i = 0; i < 60; i++) {
      var geo = new THREE.SphereGeometry(Math.random() * 0.15 + 0.05, 6, 6);
      var mat = new THREE.MeshBasicMaterial({
        color: colors[Math.floor(Math.random() * colors.length)],
        transparent: true,
        opacity: 1
      });
      var p = new THREE.Mesh(geo, mat);
      p.position.copy(camera.position);
      p.position.y += 3;

      var speed = Math.random() * 0.3 + 0.1;
      var theta = Math.random() * Math.PI * 2;
      var phi = Math.random() * Math.PI;
      p.userData.velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );
      p.userData.life = 1.0;
      p.userData.decay = Math.random() * 0.015 + 0.01;

      particleGroup.add(p);
      particles.push(p);
    }

    // DOM 파티클도 생성 (화면 오버레이 효과)
    createDOMParticles();
  }

  function createDOMParticles() {
    if (!particleContainer) return;
    var colors = ['#d4af37', '#f4d03f', '#667eea', '#764ba2', '#fff'];
    for (var i = 0; i < 80; i++) {
      var p = document.createElement('div');
      p.className = 'particle';
      var size = Math.random() * 12 + 4;
      var color = colors[Math.floor(Math.random() * colors.length)];
      var sx = window.innerWidth / 2;
      var sy = window.innerHeight * 0.3;
      var a = Math.random() * Math.PI * 2;
      var d = Math.random() * 400 + 80;
      p.style.cssText = 'width:' + size + 'px;height:' + size + 'px;background:' + color +
        ';left:' + sx + 'px;top:' + sy + 'px;--tx:' + (Math.cos(a)*d) + 'px;--ty:' +
        (Math.sin(a)*d) + 'px;box-shadow:0 0 ' + size + 'px ' + color;
      particleContainer.appendChild(p);
      setTimeout(function(el){ el.remove(); }, 1500, p);
    }
  }

  // === 파티클 업데이트 ===
  function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.position.add(p.userData.velocity);
      p.userData.velocity.y -= 0.003; // 중력
      p.userData.life -= p.userData.decay;
      p.material.opacity = Math.max(0, p.userData.life);

      if (p.userData.life <= 0) {
        particleGroup.remove(p);
        p.geometry.dispose();
        p.material.dispose();
        particles.splice(i, 1);
      }
    }
  }

  // === 애니메이션 루프 ===
  function animate() {
    requestAnimationFrame(animate);

    // 부드러운 스크롤 보간
    var diff = targetScrollProgress - scrollProgress;
    if (Math.abs(diff) > 0.01) {
      scrollProgress += diff * 0.08;
    } else {
      scrollProgress = targetScrollProgress;
    }

    updateCamera();
    updateParticles();

    // 리사이즈 체크
    var w = container.clientWidth;
    var h = container.clientHeight;
    if (renderer.domElement.width !== w || renderer.domElement.height !== h) {
      handleResize();
    }

    renderer.render(scene, camera);
  }

  // === 리사이즈 ===
  function handleResize() {
    var w = container.clientWidth || 1;
    var h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  // === 비디오 팝업 ===
  function openVideo(src) {
    if (videoEl && src) {
      videoEl.src = src;
      videoEl.load();
      videoPopup.classList.add('active');
      videoEl.play();
    }
  }

  function closeVideo() {
    videoPopup.classList.remove('active');
    if (videoEl) {
      videoEl.pause();
      videoEl.src = '';
    }
  }

  if (videoClose) videoClose.addEventListener('click', closeVideo);
  if (videoPopup) videoPopup.addEventListener('click', function(e) {
    if (e.target === videoPopup) closeVideo();
  });

  // === 클릭 이벤트 (액자 Raycasting) ===
  container.addEventListener('click', function(e) {
    if (!card5.classList.contains('fullscreen')) return;
    if (videoPopup.classList.contains('active')) return;
    if (!renderer || !camera) return;

    var rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(frameMeshes);

    if (intersects.length > 0) {
      var hit = intersects[0].object;
      var src = hit.userData.videoSrc || frameVideoMap[hit.uuid];
      if (src) openVideo(src);
    }
  });

  // === 휠 이벤트 ===
  function handleWheel(e) {
    if (!card5.classList.contains('fullscreen')) return;
    if (videoPopup.classList.contains('active')) return;
    e.preventDefault();
    e.stopPropagation();
    var delta = e.deltaY > 0 ? 3 : -3;
    targetScrollProgress = Math.max(0, Math.min(maxScroll, targetScrollProgress + delta));
  }
  card5.addEventListener('wheel', handleWheel, { passive: false });

  // === 터치 이벤트 ===
  var touchStartY = 0, touchCurrentY = 0, isTouching = false;

  card5.addEventListener('touchstart', function(e) {
    if (!card5.classList.contains('fullscreen')) return;
    if (videoPopup.classList.contains('active')) return;
    touchStartY = e.touches[0].clientY;
    touchCurrentY = touchStartY;
    isTouching = true;
  }, { passive: true });

  card5.addEventListener('touchmove', function(e) {
    if (!card5.classList.contains('fullscreen')) return;
    if (videoPopup.classList.contains('active')) return;
    if (!isTouching) return;
    var newY = e.touches[0].clientY;
    var deltaY = touchCurrentY - newY;
    touchCurrentY = newY;
    targetScrollProgress = Math.max(0, Math.min(maxScroll, targetScrollProgress + deltaY * 0.5));
  }, { passive: true });

  card5.addEventListener('touchend', function() { isTouching = false; }, { passive: true });

  // === ESC 키 ===
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && videoPopup.classList.contains('active')) closeVideo();
  });

  // === 카드 진입 시 초기화 ===
  // MutationObserver로 fullscreen 감지하여 Three.js 지연 초기화
  var observer = new MutationObserver(function() {
    if (card5.classList.contains('fullscreen') && !isInitialized) {
      initThree();
    }
    if (card5.classList.contains('fullscreen') && renderer) {
      // 리사이즈 보정
      setTimeout(handleResize, 100);
      setTimeout(handleResize, 700);
    }
  });
  observer.observe(card5, { attributes: true, attributeFilter: ['class'] });

  // 즉시 초기화도 시도 (이미 보일 경우 — 카드 스택 축소 뷰)
  // 카드 미니 뷰에서도 3D 보이게
  setTimeout(function() {
    initThree();
    handleResize();
  }, 500);

  // === 전역 함수 ===
  window.initCard5 = function() {
    scrollProgress = 0;
    targetScrollProgress = 0;
    hasExploded = false;
  };

  window.stopCard5Video = closeVideo;
})();
