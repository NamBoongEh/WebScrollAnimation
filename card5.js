// Card 5 - Three.js 3D 나선형 계단 (Bonhomme 스타일)
(function () {
  const card5 = document.getElementById("card-5");
  if (!card5) return;

  const container = document.getElementById("card5-threejs-container");
  const progressEl = document.getElementById("card5-progress");
  if (!container) return;

  let scene, camera, renderer;
  let stairs = [];
  let characters = [];
  let centralPillar;
  let isFullscreen = false;
  let animationId = null;
  let scrollProgress = 0;
  let targetScrollProgress = 0;

  // 계단 설정
  const totalSteps = 30;
  const stairHeight = 1.8;
  const stairRadius = 6;
  const anglePerStep = Math.PI / 6;

  // Three.js 초기화
  function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    scene.fog = new THREE.FogExp2(0xf5f5f5, 0.015);

    // Camera
    camera = new THREE.PerspectiveCamera(
      50,
      container.clientWidth / container.clientHeight,
      0.1,
      500,
    );

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(15, 30, 15);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -30;
    directionalLight.shadow.camera.right = 30;
    directionalLight.shadow.camera.top = 30;
    directionalLight.shadow.camera.bottom = -30;
    scene.add(directionalLight);

    // 중앙 기둥
    createCentralPillar();

    // 나선형 계단 생성
    createSpiralStairs();

    // Bonhomme 캐릭터 생성
    createCharacters();

    // 초기 카메라 위치
    updateCamera();
  }

  // 중앙 기둥
  function createCentralPillar() {
    const geometry = new THREE.CylinderGeometry(
      0.5,
      0.5,
      totalSteps * stairHeight + 5,
      32,
    );
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.2,
      roughness: 0.8,
    });
    centralPillar = new THREE.Mesh(geometry, material);
    centralPillar.position.y = (totalSteps * stairHeight) / 2;
    centralPillar.castShadow = true;
    centralPillar.receiveShadow = true;
    scene.add(centralPillar);
  }

  // 나선형 계단
  function createSpiralStairs() {
    const stepMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.1,
      roughness: 0.9,
    });

    for (let i = 0; i < totalSteps; i++) {
      const angle = i * anglePerStep;
      const y = i * stairHeight;

      const stairGroup = new THREE.Group();

      // 계단 - 부채꼴 모양
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.absarc(0, 0, 4.5, -0.3, 0.3, false);
      shape.lineTo(0, 0);

      const extrudeSettings = {
        depth: 0.3,
        bevelEnabled: true,
        bevelThickness: 0.05,
        bevelSize: 0.05,
        bevelSegments: 3,
      };

      const stepGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      stepGeometry.rotateX(-Math.PI / 2);

      const step = new THREE.Mesh(stepGeometry, stepMaterial);
      step.castShadow = true;
      step.receiveShadow = true;
      stairGroup.add(step);

      // 난간 기둥
      const railGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
      const rail = new THREE.Mesh(railGeometry, stepMaterial);
      rail.position.set(4.2, 0.6, 0);
      rail.castShadow = true;
      stairGroup.add(rail);

      // 난간 상단 볼
      const ballGeometry = new THREE.SphereGeometry(0.1, 16, 16);
      const ball = new THREE.Mesh(ballGeometry, stepMaterial);
      ball.position.set(4.2, 1.25, 0);
      ball.castShadow = true;
      stairGroup.add(ball);

      // 계단 위치 및 회전
      stairGroup.position.y = y;
      stairGroup.rotation.y = angle;

      stairs.push(stairGroup);
      scene.add(stairGroup);
    }
  }

  // Bonhomme 스타일 캐릭터들
  function createCharacters() {
    const positions = [
      { step: 2, angleOffset: 0, type: 0 },
      { step: 7, angleOffset: 0.2, type: 1 },
      { step: 12, angleOffset: -0.1, type: 2 },
      { step: 17, angleOffset: 0.15, type: 3 },
      { step: 22, angleOffset: -0.2, type: 4 },
      { step: 27, angleOffset: 0.1, type: 0 },
    ];

    positions.forEach((pos) => {
      const char = createBonhommeCharacter(pos.type);
      const angle = pos.step * anglePerStep + pos.angleOffset;
      const radius = stairRadius - 1.5;

      char.position.set(
        Math.sin(angle) * radius,
        pos.step * stairHeight + 0.5,
        Math.cos(angle) * radius,
      );

      char.userData = {
        baseY: pos.step * stairHeight + 0.5,
        step: pos.step,
        angle: angle,
        bouncePhase: Math.random() * Math.PI * 2,
        bounceSpeed: 0.03 + Math.random() * 0.02,
        baseRotation: angle + Math.PI,
      };

      characters.push(char);
      scene.add(char);
    });
  }

  // Bonhomme 캐릭터 생성
  function createBonhommeCharacter(type) {
    const group = new THREE.Group();

    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.1,
      roughness: 0.9,
    });

    const whiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.9,
    });

    switch (type % 5) {
      case 0: // 둥근 몸통
        const body0 = new THREE.Mesh(
          new THREE.SphereGeometry(0.4, 32, 32),
          blackMat,
        );
        body0.scale.set(1, 1.3, 1);
        body0.castShadow = true;
        group.add(body0);

        // 다리
        [-0.12, 0.12].forEach((x) => {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8),
            blackMat,
          );
          leg.position.set(x, -0.7, 0);
          leg.castShadow = true;
          group.add(leg);
        });
        break;

      case 1: // 키 큰 캐릭터
        const body1 = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.25, 0.8, 8, 16),
          blackMat,
        );
        body1.castShadow = true;
        group.add(body1);

        // 팔
        const armL = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.05, 0.4, 4, 8),
          blackMat,
        );
        armL.position.set(-0.35, 0.1, 0);
        armL.rotation.z = Math.PI / 6;
        armL.castShadow = true;
        group.add(armL);

        const armR = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.05, 0.4, 4, 8),
          blackMat,
        );
        armR.position.set(0.35, 0.1, 0);
        armR.rotation.z = -Math.PI / 6;
        armR.castShadow = true;
        group.add(armR);
        break;

      case 2: // 네모 캐릭터
        const body2 = new THREE.Mesh(
          new THREE.BoxGeometry(0.55, 0.55, 0.55),
          blackMat,
        );
        body2.castShadow = true;
        group.add(body2);

        [-0.15, 0.15].forEach((x) => {
          const leg = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.4, 0.12),
            blackMat,
          );
          leg.position.set(x, -0.5, 0);
          leg.castShadow = true;
          group.add(leg);
        });
        break;

      case 3: // 삼각형 캐릭터
        const body3 = new THREE.Mesh(
          new THREE.ConeGeometry(0.4, 0.9, 3),
          blackMat,
        );
        body3.rotation.y = Math.PI;
        body3.castShadow = true;
        group.add(body3);

        [-0.12, 0.12].forEach((x) => {
          const leg = new THREE.Mesh(
            new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8),
            blackMat,
          );
          leg.position.set(x, -0.6, 0);
          leg.castShadow = true;
          group.add(leg);
        });
        break;

      case 4: // 두 부분 캐릭터 (머리+몸통)
        const bodyLower = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 32, 32),
          blackMat,
        );
        bodyLower.scale.set(1, 1.2, 1);
        bodyLower.position.y = -0.15;
        bodyLower.castShadow = true;
        group.add(bodyLower);

        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 32, 32),
          blackMat,
        );
        head.position.y = 0.45;
        head.castShadow = true;
        group.add(head);
        break;
    }

    // 눈 (모든 캐릭터 공통)
    const eyeY = type === 4 ? 0.45 : 0.15;
    const eyeZ = type === 4 ? 0.18 : 0.35;

    [-0.1, 0.1].forEach((x, i) => {
      // 흰자
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.07, 16, 16),
        whiteMat,
      );
      eye.position.set(x, eyeY, eyeZ);
      group.add(eye);

      // 눈동자
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 16, 16),
        blackMat,
      );
      pupil.position.set(x, eyeY, eyeZ + 0.05);
      pupil.name = i === 0 ? "pupilL" : "pupilR";
      group.add(pupil);
    });

    return group;
  }

  // 카메라 업데이트
  function updateCamera() {
    const currentStep = scrollProgress * (totalSteps - 1);
    const angle = currentStep * anglePerStep;
    const y = currentStep * stairHeight;

    // 1인칭 시점: 계단 위에서 위를 올려다보는 느낌
    const cameraRadius = stairRadius - 2;
    const cameraHeight = y + 2;

    camera.position.set(
      Math.sin(angle) * cameraRadius,
      cameraHeight,
      Math.cos(angle) * cameraRadius,
    );

    // 계단 위쪽을 바라봄
    const lookAheadSteps = 5;
    const lookAtAngle = (currentStep + lookAheadSteps) * anglePerStep;
    const lookAtY = (currentStep + lookAheadSteps) * stairHeight;

    camera.lookAt(
      Math.sin(lookAtAngle) * (stairRadius - 1),
      lookAtY,
      Math.cos(lookAtAngle) * (stairRadius - 1),
    );

    // 진행률 표시
    if (progressEl) {
      const floor = Math.floor(currentStep) + 1;
      progressEl.textContent = `${floor}F`;
    }
  }

  // 캐릭터 애니메이션
  function animateCharacters() {
    characters.forEach((char) => {
      if (!char.userData) return;

      // 바운스 애니메이션
      char.userData.bouncePhase += char.userData.bounceSpeed;
      const bounce = Math.sin(char.userData.bouncePhase) * 0.08;
      char.position.y = char.userData.baseY + bounce;

      // 카메라를 바라보도록 회전
      const dx = camera.position.x - char.position.x;
      const dz = camera.position.z - char.position.z;
      char.rotation.y = Math.atan2(dx, dz);

      // 눈동자가 카메라를 따라감
      const pupilL = char.getObjectByName("pupilL");
      const pupilR = char.getObjectByName("pupilR");

      if (pupilL && pupilR) {
        const lookDir = new THREE.Vector3();
        lookDir.subVectors(camera.position, char.position).normalize();

        // 로컬 좌표로 변환
        const localLook = lookDir.clone();
        char.worldToLocal(localLook);

        const maxOffset = 0.025;
        pupilL.position.x = -0.1 + localLook.x * maxOffset;
        pupilL.position.y =
          char.userData.step === 27 || char.userData.step === 22 ? 0.45 : 0.15;
        pupilL.position.y += localLook.y * maxOffset;

        pupilR.position.x = 0.1 + localLook.x * maxOffset;
        pupilR.position.y = pupilL.position.y;
      }
    });
  }

  // 애니메이션 루프
  function animate() {
    if (!isFullscreen) {
      animationId = null;
      return;
    }

    // 부드러운 스크롤 보간
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.06;

    updateCamera();
    animateCharacters();

    renderer.render(scene, camera);
    animationId = requestAnimationFrame(animate);
  }

  // 휠 이벤트
  function handleWheel(e) {
    if (!isFullscreen) return;

    e.preventDefault();
    e.stopPropagation();

    const delta = e.deltaY > 0 ? 0.025 : -0.025;
    targetScrollProgress = Math.max(
      0,
      Math.min(1, targetScrollProgress + delta),
    );
  }

  // 터치 이벤트
  let touchStartY = 0;

  function handleTouchStart(e) {
    if (!isFullscreen) return;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchMove(e) {
    if (!isFullscreen) return;

    const deltaY = touchStartY - e.touches[0].clientY;
    touchStartY = e.touches[0].clientY;

    const delta = deltaY * 0.003;
    targetScrollProgress = Math.max(
      0,
      Math.min(1, targetScrollProgress + delta),
    );
  }

  // 리사이즈
  function handleResize() {
    if (!renderer || !camera || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    if (width === 0 || height === 0) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  // Fullscreen 감지
  const observer = new MutationObserver(() => {
    const wasFullscreen = isFullscreen;
    isFullscreen = card5.classList.contains("fullscreen");

    if (isFullscreen && !wasFullscreen) {
      setTimeout(() => {
        if (!scene) {
          init();
        }
        handleResize();
        scrollProgress = 0;
        targetScrollProgress = 0;
        if (!animationId) {
          animate();
        }
      }, 100);
    } else if (!isFullscreen && wasFullscreen) {
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }
  });

  observer.observe(card5, { attributes: true, attributeFilter: ["class"] });

  // 이벤트 리스너
  card5.addEventListener("wheel", handleWheel, { passive: false });
  card5.addEventListener("touchstart", handleTouchStart, { passive: true });
  card5.addEventListener("touchmove", handleTouchMove, { passive: true });
  window.addEventListener("resize", handleResize);

  // 전역 함수
  window.initCard5 = function () {
    if (isFullscreen && !scene) {
      init();
      handleResize();
      if (!animationId) animate();
    }
  };

  window.cleanupCard5 = function () {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };
})();
