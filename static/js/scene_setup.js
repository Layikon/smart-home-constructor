// static/js/scene_setup.js

export function initScene(containerId) {
    const container = document.getElementById(containerId);
    const THREE = window.THREE;

    // 1. Сцена та Туман (Оновлено для контрасту)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9); // Світло-сірий фон (Slate 100)

    // Туман налаштований так, щоб не приховувати кімнату, але м'яко ховати край світу
    scene.fog = new THREE.Fog(0xf1f5f9, 60, 180);

    // 2. Камера
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(15, 15, 15);

    // 3. Рендерер
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        logarithmicDepthBuffer: true // Важливо для уникнення мерехтіння накладених площин
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;

    container.appendChild(renderer.domElement);

    // 4. Контроли
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.05; // Заборона дивитися знизу підлоги

    // 5. Світло
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.4);
    dirLight.position.set(20, 30, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // 6. СІТКА СЦЕНИ (Оновлений стиль)
    // Основна сітка - темніша для видності на сірому фоні
    const mainGrid = new THREE.GridHelper(100, 20, 0x3b82f6, 0xcbd5e1);
    mainGrid.material.opacity = 0.3;
    mainGrid.material.transparent = true;
    mainGrid.position.y = -0.01;
    scene.add(mainGrid);

    // Допоміжна сітка - ледь помітна
    const subGrid = new THREE.GridHelper(100, 100, 0xe2e8f0, 0xe2e8f0);
    subGrid.material.opacity = 0.2;
    subGrid.material.transparent = true;
    subGrid.position.y = -0.015;
    scene.add(subGrid);

    // 7. Контактна тінь
    const shadowPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.ShadowMaterial({ opacity: 0.05 })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -0.02;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    const draggableObjects = [];

    function onWindowResize() {
        if (!container) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }

    return {
        scene,
        camera,
        renderer,
        controls,
        draggableObjects,
        onWindowResize
    };
}