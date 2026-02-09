/**
 * card4.js - Three.js 기차 월드
 */

(function () {
  const container = document.getElementById("train-container");
  if (!container) return;

  // --- 1. 기본 설정 (Scene, Camera, Renderer) ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xa0d8ef);
  scene.fog = new THREE.Fog(0xa0d8ef, 10, 200);

  const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    1,
    1000,
  );
  camera.position.set(25, 25, 25);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // --- 2. 조명 ---
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(10, 20, 10);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // --- 3. 바닥 및 그리드 ---
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshPhongMaterial({ color: 0x999999 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const grid = new THREE.GridHelper(100, 50, 0x000000, 0x000000);
  grid.material.opacity = 0.1;
  grid.material.transparent = true;
  scene.add(grid);

  // --- 4. 에셋 생성 함수들 ---

  // [나무 생성 함수]
  function createTree(x, z) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 1, 8),
      new THREE.MeshLambertMaterial({ color: 0x8b4513 }),
    );
    trunk.position.y = 0.5;
    trunk.castShadow = true;

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 2, 8),
      new THREE.MeshLambertMaterial({ color: 0x228b22 }),
    );
    leaves.position.y = 1.5;
    leaves.castShadow = true;

    tree.add(trunk, leaves);
    tree.position.set(x, 0, z);
    scene.add(tree);
  }

  // [기차역 생성 함수]
  function createStation(x, z) {
    const station = new THREE.Group();
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.5, 4),
      new THREE.MeshLambertMaterial({ color: 0x666666 }),
    );
    platform.position.y = 0.25;
    platform.receiveShadow = true;

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(9, 0.2, 5),
      new THREE.MeshLambertMaterial({ color: 0xcc5555 }),
    );
    roof.position.y = 3.5;
    roof.castShadow = true;

    // 기둥 2개
    const p1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 3),
      new THREE.MeshLambertMaterial({ color: 0x333333 }),
    );
    p1.position.set(-3, 1.75, 1.5);
    const p2 = p1.clone();
    p2.position.set(3, 1.75, 1.5);

    station.add(platform, roof, p1, p2);
    station.position.set(x, 0, z);
    scene.add(station);
  }

  // --- 5. 오브젝트 배치 ---

  // 기차 만들기
  const train = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2, 1.5, 4),
    new THREE.MeshLambertMaterial({ color: 0xff0000 }),
  );
  body.position.y = 1;
  body.castShadow = true;

  // 굴뚝 추가
  const chimney = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.3, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x333333 }),
  );
  chimney.position.set(0, 2, -1);
  train.add(body, chimney);
  scene.add(train);

  // 역 만들기 (정차 위치: x=15, z=0 부근)
  createStation(19, 0);

  // 나무 랜덤 배치
  for (let i = 0; i < 30; i++) {
    let x = (Math.random() - 0.5) * 60;
    let z = (Math.random() - 0.5) * 60;
    if (Math.abs(x) < 20 && Math.abs(z) < 20) continue; // 선로 근처 피하기
    createTree(x, z);
  }

  // --- 6. 조작 및 애니메이션 ---
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  let time = 0;
  let isStopping = false;
  let stopTimer = 0;
  const radius = 15; // 기차 궤도 반지름

  function animate() {
    requestAnimationFrame(animate);

    if (!isStopping) {
      time += 0.01;

      // 기차 위치 (원형 이동)
      train.position.x = Math.cos(time) * radius;
      train.position.z = Math.sin(time) * radius;

      // 기차가 진행 방향을 보게 함
      train.rotation.y = -time + Math.PI;

      // 정차 체크 (역 위치 x=15, z=0 근처일 때)
      if (
        Math.abs(train.position.x - radius) < 0.1 &&
        Math.abs(train.position.z) < 0.5
      ) {
        isStopping = true;
        stopTimer = 0;
      }
    } else {
      // 정차 로직
      stopTimer++;
      if (stopTimer > 150) {
        // 약 2.5초 정차
        isStopping = false;
        time += 0.1; // 겹침 방지
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });

  animate();
})();
