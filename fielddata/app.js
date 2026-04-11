/* ============================================================
   ForestScope — 森林デジタルツイン・ダッシュボード
   Three.js 3D Globe + Full Dashboard Logic
   ============================================================ */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// ============================================================
// CONSTANTS
// ============================================================
const EARTH_RADIUS = 1;
const CLOUD_RADIUS = 1.003;
const ATMO_RADIUS = 1.12;
const TEXTURE_BASE = 'https://unpkg.com/three-globe@2.31.1/example/img/';

// ============================================================
// DATA — Satellite Catalog
// ============================================================
const SATELLITE_DATA = [
  {
    id: 'sentinel2-rgb', name: 'Sentinel-2 RGB', category: 'optical',
    description: 'ESAの光学衛星。10m解像度のRGB真カラー画像で、森林被覆や土地利用の変化を可視化。',
    resolution: '10m', source: 'ESA Copernicus', sourceUrl: 'https://scihub.copernicus.eu/', free: true, color: [34, 139, 34]
  },
  {
    id: 'landsat8-oli', name: 'Landsat 8 OLI', category: 'optical',
    description: 'NASA/USGSの高精度光学センサー。30m解像度で森林の広域モニタリングに最適。',
    resolution: '30m', source: 'USGS EarthExplorer', sourceUrl: 'https://earthexplorer.usgs.gov/', free: true, color: [70, 130, 180]
  },
  {
    id: 'modis-terra', name: 'MODIS Terra', category: 'optical',
    description: 'NASAのTerra衛星搭載。250m~1km解像度で全球を毎日観測。火災検知にも利用。',
    resolution: '250m–1km', source: 'NASA Worldview', sourceUrl: 'https://worldview.earthdata.nasa.gov/', free: true, color: [255, 140, 0]
  },
  {
    id: 'ndvi-sentinel', name: 'NDVI (Sentinel-2)', category: 'vegetation',
    description: '正規化植生指数。植物の活性度を赤〜緑のカラースケールでマッピング。森林の健康状態を即座に把握。',
    resolution: '10m', source: 'Google Earth Engine', sourceUrl: 'https://earthengine.google.com/', free: true, color: [0, 180, 0]
  },
  {
    id: 'evi-modis', name: 'EVI (MODIS)', category: 'vegetation',
    description: '強化植生指数。NDVIより大気補正に優れ、密生林のバイオマス推定に高精度。',
    resolution: '250m', source: 'NASA LP DAAC', sourceUrl: 'https://lpdaac.usgs.gov/', free: true, color: [0, 128, 64]
  },
  {
    id: 'lai-sentinel', name: 'LAI (葉面積指数)', category: 'vegetation',
    description: '単位面積あたりの葉面積を推定。森林の光合成能力やCO₂吸収量の推定に不可欠。',
    resolution: '20m', source: 'Copernicus Global Land', sourceUrl: 'https://land.copernicus.eu/', free: true, color: [50, 205, 50]
  },
  {
    id: 'sar-sentinel1', name: 'Sentinel-1 SAR', category: 'radar',
    description: 'ESAのCバンドSAR。雲を透過し、全天候型で森林構造やバイオマスの変動を検出。',
    resolution: '10m', source: 'ESA Copernicus', sourceUrl: 'https://scihub.copernicus.eu/', free: true, color: [100, 100, 180]
  },
  {
    id: 'alos2-palsar', name: 'ALOS-2 PALSAR-2', category: 'radar',
    description: 'JAXAのLバンドSAR。森林のバイオマスを高精度に推定。違法伐採の監視にも活用。',
    resolution: '10m', source: 'JAXA Earth API', sourceUrl: 'https://www.eorc.jaxa.jp/', free: true, color: [70, 70, 150]
  },
  {
    id: 'srtm-dem', name: 'SRTM DEM (標高)', category: 'terrain',
    description: 'NASAのシャトルレーダーで取得した全球標高データ。傾斜や流域解析で林業計画を支援。',
    resolution: '30m', source: 'USGS', sourceUrl: 'https://www.usgs.gov/centers/eros', free: true, color: [139, 90, 43]
  },
  {
    id: 'slope-terrain', name: '傾斜角マップ', category: 'terrain',
    description: 'DEMから算出した傾斜角の可視化。急傾斜地の林業機械到達性や崩壊リスク評価に使用。',
    resolution: '30m', source: 'Google Earth Engine', sourceUrl: 'https://earthengine.google.com/', free: true, color: [160, 82, 45]
  },
  {
    id: 'gfc-hansen', name: 'Global Forest Change', category: 'other',
    description: 'Hansen et al.の森林減少・増加マップ。2000年〜現在までの年次森林変動を可視化。',
    resolution: '30m', source: 'University of Maryland', sourceUrl: 'https://glad.umd.edu/dataset/gfw', free: true, color: [220, 20, 60]
  },
  {
    id: 'viirs-fire', name: 'VIIRS Active Fire', category: 'other',
    description: '準リアルタイムの熱異常検知。森林火災の早期発見と被害範囲の推定に不可欠。',
    resolution: '375m', source: 'NASA FIRMS', sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/', free: true, color: [255, 69, 0]
  },
];

const REGIONS_DATA = [
  { flag: '🌎', name: '南アメリカ', trees: '392B', area: '842M ha', pct: 82, lat: -10, lng: -55 },
  { flag: '🌍', name: 'アフリカ', trees: '379B', area: '636M ha', pct: 75, lat: 0, lng: 22 },
  { flag: '🌏', name: 'アジア', trees: '400B', area: '593M ha', pct: 72, lat: 30, lng: 105 },
  { flag: '🌎', name: '北アメリカ', trees: '318B', area: '753M ha', pct: 70, lat: 48, lng: -100 },
  { flag: '🌍', name: 'ヨーロッパ', trees: '160B', area: '1,017M ha', pct: 65, lat: 52, lng: 15 },
  { flag: '🌏', name: 'オセアニア', trees: '53B', area: '174M ha', pct: 40, lat: -25, lng: 135 },
];

const SPECIES_DATA = [
  { name: 'スプルース (Picea)', count: '約 500B 本', pct: '16.4%', emoji: '🌲', color: '#1b5e20' },
  { name: 'マツ (Pinus)', count: '約 440B 本', pct: '14.5%', emoji: '🌲', color: '#2e7d32' },
  { name: 'カバ (Betula)', count: '約 310B 本', pct: '10.2%', emoji: '🌳', color: '#388e3c' },
  { name: 'ブナ (Fagus)', count: '約 260B 本', pct: '8.6%', emoji: '🌳', color: '#43a047' },
  { name: 'オーク (Quercus)', count: '約 240B 本', pct: '7.9%', emoji: '🌳', color: '#4caf50' },
  { name: 'ユーカリ (Eucalyptus)', count: '約 180B 本', pct: '5.9%', emoji: '🌿', color: '#66bb6a' },
  { name: 'タケ (Bambusoideae)', count: '約 140B 本', pct: '4.6%', emoji: '🎋', color: '#81c784' },
  { name: 'スギ (Cryptomeria)', count: '約 12B 本', pct: '0.4%', emoji: '🌲', color: '#a5d6a7' },
];

// Forest cluster locations for 3D tree instances
const FOREST_CLUSTERS = [
  { name: 'アマゾン', lat: -3, lng: -60, spread: 15, count: 800, heightScale: 1.0 },
  { name: 'コンゴ盆地', lat: 0, lng: 22, spread: 10, count: 600, heightScale: 0.8 },
  { name: '東南アジア', lat: 5, lng: 108, spread: 10, count: 500, heightScale: 0.7 },
  { name: 'タイガ (東)', lat: 58, lng: 100, spread: 25, count: 700, heightScale: 0.6 },
  { name: 'タイガ (西)', lat: 60, lng: 50, spread: 15, count: 500, heightScale: 0.5 },
  { name: '北米西部', lat: 48, lng: -122, spread: 8, count: 300, heightScale: 0.7 },
  { name: '北米東部', lat: 40, lng: -80, spread: 8, count: 300, heightScale: 0.6 },
  { name: '日本', lat: 36, lng: 137, spread: 5, count: 400, heightScale: 0.8 },
  { name: '北欧', lat: 62, lng: 18, spread: 8, count: 400, heightScale: 0.5 },
  { name: 'オーストラリア', lat: -28, lng: 148, spread: 8, count: 200, heightScale: 0.4 },
];

// ============================================================
// STATE
// ============================================================
let state = {
  is3D: true,
  currentPreview: null,
  activeLayers: [],
  uploadedFiles: [],
  // Field Data
  observations: [],
  fieldDataPanelOpen: false,
  locationPickerActive: false,
  pendingLocationObservation: null,
};

// ============================================================
// THREE.JS GLOBALS
// ============================================================
let scene, camera, renderer, labelRenderer, controls;
let earthGroup, earth, clouds, atmosphere, stars;
let sunLight;
let treeTrunks, treeCrowns;
let overlayMesh;
let clock;
const labels = [];
const TOTAL_TREES = FOREST_CLUSTERS.reduce((s, c) => s + c.count, 0);

// Detailed forest scene
let detailedForestGroup;
let leafParticles;
let animalMeshes = [];
let butterflyMeshes = [];
let healthLabels = [];
const skyColor = new THREE.Color(0x87CEEB);
const spaceColor = new THREE.Color(0x000008);

// ============================================================
// DOM HELPERS
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  clock = new THREE.Clock();
  initScene();
  createStarField();
  createEarth();
  createAtmosphere();
  createClouds();
  createSatelliteOverlay();
  // Trees & detailed forest removed per user request
  createRegionLabels();
  renderRegions();
  renderSpecies();
  renderSatelliteCatalog();
  bindEvents();
  animate();
  // Field Data initialization
  initFieldDataDB().then(() => loadObservationsToGlobe());
  showPrivacyNotice();
  setupOfflineHandling();
});

// ============================================================
// SCENE SETUP
// ============================================================
function initScene() {
  const container = $('#globe-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.0001, 100);
  camera.position.set(0, 0.8, 2.8);

  // WebGL Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  container.appendChild(renderer.domElement);

  // CSS2D Renderer (for labels)
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.domElement.style.position = 'absolute';
  labelRenderer.domElement.style.top = '0';
  labelRenderer.domElement.style.left = '0';
  labelRenderer.domElement.style.pointerEvents = 'none';
  container.appendChild(labelRenderer.domElement);

  // Lights — sunLight stored globally so animate() can update it
  sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
  sunLight.position.set(5, 3, 5);
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0x222244, 0.8);
  scene.add(ambientLight);

  const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
  rimLight.position.set(-3, -1, -3);
  scene.add(rimLight);

  // Controls — Google Earth-like sensitivity
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.002;
  controls.maxDistance = 8;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;
  controls.enablePan = false;
  controls.rotateSpeed = 0.5;
  controls.zoomSpeed = 0.8;

  // Earth group (holds earth, clouds, trees, etc.)
  earthGroup = new THREE.Group();
  scene.add(earthGroup);

  // Handle resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
  });
}

// ============================================================
// EARTH
// ============================================================
function createEarth() {
  const loader = new THREE.TextureLoader();

  const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 96, 96);
  const earthMat = new THREE.MeshPhongMaterial({
    map: loader.load(TEXTURE_BASE + 'earth-blue-marble.jpg'),
    bumpMap: loader.load(TEXTURE_BASE + 'earth-topology.png'),
    bumpScale: 0.015,
    specularMap: loader.load(TEXTURE_BASE + 'earth-water.png'),
    specular: new THREE.Color(0x444444),
    shininess: 15,
  });

  earth = new THREE.Mesh(earthGeo, earthMat);
  earthGroup.add(earth);
}

// ============================================================
// ATMOSPHERE
// ============================================================
function createAtmosphere() {
  // Inner atmosphere glow on earth surface
  const innerGeo = new THREE.SphereGeometry(EARTH_RADIUS + 0.001, 64, 64);
  const innerMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
        float intensity = pow(rim, 3.0) * 0.65;
        gl_FragColor = vec4(0.35, 0.6, 1.0, intensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    blending: THREE.AdditiveBlending,
  });
  const innerAtmo = new THREE.Mesh(innerGeo, innerMat);
  earthGroup.add(innerAtmo);

  // Outer atmosphere glow
  const outerGeo = new THREE.SphereGeometry(ATMO_RADIUS, 64, 64);
  const outerMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      void main() {
        vec3 viewDir = normalize(-vPosition);
        float rim = 1.0 - max(0.0, dot(vNormal, viewDir));
        float intensity = pow(rim, 1.8) * 0.4;
        gl_FragColor = vec4(0.3, 0.55, 1.0, intensity);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
  });
  atmosphere = new THREE.Mesh(outerGeo, outerMat);
  earthGroup.add(atmosphere);
}

// ============================================================
// CLOUDS
// ============================================================
function createClouds() {
  const loader = new THREE.TextureLoader();
  const cloudGeo = new THREE.SphereGeometry(CLOUD_RADIUS, 64, 64);
  const cloudMat = new THREE.MeshPhongMaterial({
    map: loader.load(TEXTURE_BASE + 'earth-clouds.png'),
    transparent: true,
    opacity: 0.25,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  clouds = new THREE.Mesh(cloudGeo, cloudMat);
  earthGroup.add(clouds);
}

// ============================================================
// STAR FIELD
// ============================================================
function createStarField() {
  const count = 8000;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = 30 + Math.random() * 40;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = Math.random() * 1.5 + 0.5;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
  });

  stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
}

// ============================================================
// SATELLITE OVERLAY (for preview/apply)
// ============================================================
function createSatelliteOverlay() {
  const overlayGeo = new THREE.SphereGeometry(EARTH_RADIUS + 0.002, 96, 96);
  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.width = 2048;
  overlayCanvas.height = 1024;
  const overlayTexture = new THREE.CanvasTexture(overlayCanvas);
  const overlayMat = new THREE.MeshBasicMaterial({
    map: overlayTexture,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  overlayMesh = new THREE.Mesh(overlayGeo, overlayMat);
  overlayMesh.userData = { canvas: overlayCanvas, texture: overlayTexture };
  earthGroup.add(overlayMesh);
}

// ============================================================
// 3D FOREST TREES (InstancedMesh)
// ============================================================
function createForestTrees() {
  // Tree crown (cone)
  const crownGeo = new THREE.ConeGeometry(0.004, 0.012, 5);
  crownGeo.translate(0, 0.006, 0);
  const crownMat = new THREE.MeshLambertMaterial({
    color: 0x228B22,
    transparent: true,
    opacity: 0,
  });
  treeCrowns = new THREE.InstancedMesh(crownGeo, crownMat, TOTAL_TREES);

  // Tree trunk (cylinder)
  const trunkGeo = new THREE.CylinderGeometry(0.0006, 0.001, 0.005, 4);
  trunkGeo.translate(0, -0.0015, 0);
  const trunkMat = new THREE.MeshLambertMaterial({
    color: 0x5D4037,
    transparent: true,
    opacity: 0,
  });
  treeTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, TOTAL_TREES);

  // Place trees
  let idx = 0;
  const dummy = new THREE.Object3D();
  const colorVariation = new THREE.Color();

  FOREST_CLUSTERS.forEach(cluster => {
    for (let i = 0; i < cluster.count; i++) {
      // Random position within cluster spread
      const lat = cluster.lat + (Math.random() - 0.5) * cluster.spread * 2;
      const lng = cluster.lng + (Math.random() - 0.5) * cluster.spread * 2;
      const pos = latLngToVec3(lat, lng, EARTH_RADIUS);

      // Orient tree outward from globe center
      dummy.position.copy(pos);
      dummy.lookAt(0, 0, 0);
      dummy.rotateX(Math.PI / 2);

      // Random scale variation
      const scale = (0.6 + Math.random() * 0.8) * cluster.heightScale;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      treeCrowns.setMatrixAt(idx, dummy.matrix);
      treeTrunks.setMatrixAt(idx, dummy.matrix);

      // Crown color variation (darker/lighter greens)
      const hue = 0.28 + (Math.random() - 0.5) * 0.08;
      const sat = 0.6 + Math.random() * 0.3;
      const light = 0.2 + Math.random() * 0.25;
      colorVariation.setHSL(hue, sat, light);
      treeCrowns.setColorAt(idx, colorVariation);

      idx++;
    }
  });

  treeCrowns.instanceMatrix.needsUpdate = true;
  treeCrowns.instanceColor.needsUpdate = true;
  treeTrunks.instanceMatrix.needsUpdate = true;

  earthGroup.add(treeCrowns);
  earthGroup.add(treeTrunks);
}

// ============================================================
// REGION LABELS (CSS2D)
// ============================================================
function createRegionLabels() {
  const labelData = [
    { name: 'アマゾン熱帯雨林', sub: '3,920億本', lat: -3, lng: -60 },
    { name: 'コンゴ盆地', sub: '2,800億本', lat: 0, lng: 22 },
    { name: '東南アジア', sub: '1,800億本', lat: 5, lng: 108 },
    { name: 'タイガ (シベリア)', sub: '7,500億本', lat: 58, lng: 100 },
    { name: '日本列島', sub: '120億本', lat: 36, lng: 137 },
    { name: '北欧森林', sub: '450億本', lat: 62, lng: 18 },
    { name: '北米森林', sub: '3,180億本', lat: 48, lng: -100 },
  ];

  labelData.forEach(d => {
    const div = document.createElement('div');
    div.className = 'globe-label';
    div.innerHTML = `
      <div class="globe-label-dot"></div>
      <div class="globe-label-text">
        <strong>${d.name}</strong>
        <span>${d.sub}</span>
      </div>
    `;

    const labelObj = new CSS2DObject(div);
    const pos = latLngToVec3(d.lat, d.lng, EARTH_RADIUS + 0.02);
    labelObj.position.copy(pos);
    labelObj.userData = { baseDist: 2.5 };
    earthGroup.add(labelObj);
    labels.push(labelObj);
  });
}

// ============================================================
// DETAILED FOREST SCENE (Deep Zoom)
// ============================================================
function createDetailedForest() {
  detailedForestGroup = new THREE.Group();
  detailedForestGroup.visible = false;

  // Position at Japan (lat:36, lng:137)
  const centerPos = latLngToVec3(36, 137, EARTH_RADIUS);
  detailedForestGroup.position.copy(centerPos);
  detailedForestGroup.lookAt(new THREE.Vector3(0, 0, 0));
  detailedForestGroup.rotateX(-Math.PI / 2);

  // Forest floor
  createForestFloor();
  // Detailed trees with branches & leaves
  createDetailedTrees();
  // Leaf particle systems
  createLeafParticles();
  // Animals & insects
  createAnimals();
  // Health status labels
  createHealthStatusLabels();

  earthGroup.add(detailedForestGroup);
}

function createForestFloor() {
  const floorSize = 0.06;
  const geo = new THREE.PlaneGeometry(floorSize, floorSize, 32, 32);
  geo.rotateX(-Math.PI / 2);
  // Displacement for terrain undulation
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = Math.sin(x * 200) * Math.cos(z * 150) * 0.0004
      + Math.sin(x * 80 + 1) * Math.cos(z * 120 + 2) * 0.0002;
    pos.setY(i, pos.getY(i) + h);
  }
  geo.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ color: 0x2d5a1e, transparent: true, opacity: 0 });
  const floor = new THREE.Mesh(geo, mat);
  floor.userData.type = 'floor';
  detailedForestGroup.add(floor);

  // Grass tufts (instanced small cones)
  const grassGeo = new THREE.ConeGeometry(0.0002, 0.0008, 3);
  grassGeo.translate(0, 0.0004, 0);
  const grassMat = new THREE.MeshLambertMaterial({ color: 0x3a7d2c, transparent: true, opacity: 0 });
  const grassCount = 2000;
  const grass = new THREE.InstancedMesh(grassGeo, grassMat, grassCount);
  const dummy = new THREE.Object3D();
  const gc = new THREE.Color();
  for (let i = 0; i < grassCount; i++) {
    dummy.position.set(
      (Math.random() - 0.5) * 0.05, 0,
      (Math.random() - 0.5) * 0.05
    );
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.scale.setScalar(0.3 + Math.random() * 1.2);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    gc.setHSL(0.28 + Math.random() * 0.06, 0.6 + Math.random() * 0.3, 0.25 + Math.random() * 0.15);
    grass.setColorAt(i, gc);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.instanceColor.needsUpdate = true;
  grass.userData.type = 'grass';
  detailedForestGroup.add(grass);
}

function createDetailedTrees() {
  const treeData = [];
  const healthStates = ['healthy', 'healthy', 'healthy', 'healthy', 'healthy',
    'healthy', 'healthy', 'stressed', 'stressed', 'sick'];
  for (let i = 0; i < 60; i++) {
    treeData.push({
      x: (Math.random() - 0.5) * 0.045,
      z: (Math.random() - 0.5) * 0.045,
      height: 0.003 + Math.random() * 0.004,
      health: healthStates[Math.floor(Math.random() * healthStates.length)],
    });
  }

  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5D4037, transparent: true, opacity: 0 });

  treeData.forEach(td => {
    const tree = new THREE.Group();
    tree.position.set(td.x, 0, td.z);
    tree.userData = { health: td.health };

    // Trunk
    const tH = td.height * 0.55;
    const tR = td.height * 0.035;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(tR * 0.6, tR, tH, 6),
      trunkMat
    );
    trunk.position.y = tH / 2;
    tree.add(trunk);

    // Branches (4-6)
    const branchCount = 4 + Math.floor(Math.random() * 3);
    for (let b = 0; b < branchCount; b++) {
      const angle = (b / branchCount) * Math.PI * 2 + Math.random() * 0.4;
      const bLen = td.height * 0.18 * (0.5 + Math.random());
      const bR = tR * 0.3;
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(bR * 0.4, bR, bLen, 4),
        trunkMat
      );
      branch.position.y = tH * (0.45 + Math.random() * 0.45);
      branch.position.x = Math.cos(angle) * tR * 2.5;
      branch.position.z = Math.sin(angle) * tR * 2.5;
      branch.rotation.z = Math.cos(angle) * 0.7;
      branch.rotation.x = Math.sin(angle) * 0.7;
      tree.add(branch);
    }

    // Leaf clusters
    const leafColor = td.health === 'healthy' ? 0x228B22 :
      td.health === 'stressed' ? 0xBDB76B : 0x8B6914;
    const clusterCount = 6 + Math.floor(Math.random() * 5);
    for (let c = 0; c < clusterCount; c++) {
      const cSize = td.height * 0.12 * (0.5 + Math.random());
      const cMat = new THREE.MeshLambertMaterial({
        color: new THREE.Color(leafColor).offsetHSL(
          (Math.random() - 0.5) * 0.05,
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1
        ),
        transparent: true,
        opacity: 0,
      });
      const cluster = new THREE.Mesh(
        new THREE.IcosahedronGeometry(cSize, 1),
        cMat
      );
      cluster.position.y = tH * 0.6 + Math.random() * td.height * 0.4;
      cluster.position.x = (Math.random() - 0.5) * td.height * 0.35;
      cluster.position.z = (Math.random() - 0.5) * td.height * 0.35;
      cluster.userData.type = 'leafCluster';
      tree.add(cluster);
    }

    // Individual leaves (visible at extreme zoom)
    const leafCount = 15 + Math.floor(Math.random() * 10);
    for (let l = 0; l < leafCount; l++) {
      const lSize = td.height * 0.015;
      const leafShape = new THREE.PlaneGeometry(lSize, lSize * 1.6);
      const leafM = new THREE.MeshLambertMaterial({
        color: new THREE.Color(leafColor).offsetHSL(Math.random() * 0.04 - 0.02, 0, Math.random() * 0.1),
        transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
      });
      const leaf = new THREE.Mesh(leafShape, leafM);
      leaf.position.set(
        (Math.random() - 0.5) * td.height * 0.3,
        tH * 0.5 + Math.random() * td.height * 0.5,
        (Math.random() - 0.5) * td.height * 0.3
      );
      leaf.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      leaf.userData.type = 'leaf';
      tree.add(leaf);
    }

    // Insects on trunk (beetles)
    const bugCount = Math.floor(Math.random() * 3);
    for (let bg = 0; bg < bugCount; bg++) {
      const bug = new THREE.Mesh(
        new THREE.SphereGeometry(td.height * 0.006, 4, 3),
        new THREE.MeshLambertMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0 })
      );
      const bAngle = Math.random() * Math.PI * 2;
      bug.position.set(
        Math.cos(bAngle) * tR * 1.2,
        tH * (0.2 + Math.random() * 0.5),
        Math.sin(bAngle) * tR * 1.2
      );
      bug.userData.type = 'insect';
      tree.add(bug);
    }

    detailedForestGroup.add(tree);
  });
}

function createLeafParticles() {
  const count = 8000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 0.05;
    positions[i * 3 + 1] = 0.001 + Math.random() * 0.008;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    c.setHSL(0.28 + Math.random() * 0.08, 0.5 + Math.random() * 0.4, 0.2 + Math.random() * 0.3);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.0004, vertexColors: true, transparent: true, opacity: 0,
    sizeAttenuation: true, depthWrite: false,
  });
  leafParticles = new THREE.Points(geo, mat);
  detailedForestGroup.add(leafParticles);
}

function createAnimals() {
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x8B6914, transparent: true, opacity: 0 });

  // Deer (4)
  for (let i = 0; i < 4; i++) {
    const deer = new THREE.Group();
    const bodyLen = 0.0012;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.0003, bodyLen, 4, 6), bodyMat);
    body.rotation.z = Math.PI / 2;
    body.position.y = 0.0008;
    deer.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.00022, 5, 5), bodyMat);
    head.position.set(bodyLen * 0.55, 0.001, 0);
    deer.add(head);
    // Antlers
    const antlerMat = new THREE.MeshLambertMaterial({ color: 0x5D4037, transparent: true, opacity: 0 });
    for (let a = -1; a <= 1; a += 2) {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.00002, 0.00004, 0.0005, 3), antlerMat);
      antler.position.set(bodyLen * 0.55, 0.0013, a * 0.0001);
      antler.rotation.z = a * 0.4;
      deer.add(antler);
    }
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.00004, 0.00004, 0.0007, 3);
    const legPositions = [[-0.0004, 0.0001], [-0.0002, -0.0001], [0.0003, 0.0001], [0.0005, -0.0001]];
    legPositions.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, bodyMat);
      leg.position.set(lx, 0.00035, lz);
      deer.add(leg);
    });

    deer.position.set(
      (Math.random() - 0.5) * 0.035,
      0,
      (Math.random() - 0.5) * 0.035
    );
    deer.rotation.y = Math.random() * Math.PI * 2;
    deer.userData.type = 'animal';
    detailedForestGroup.add(deer);
    animalMeshes.push(deer);
  }

  // Birds (6, above canopy)
  const birdMat = new THREE.MeshLambertMaterial({ color: 0x2c2c2c, transparent: true, opacity: 0 });
  for (let i = 0; i < 6; i++) {
    const bird = new THREE.Group();
    const bBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.0001, 0.0003, 3, 4), birdMat);
    bBody.rotation.z = Math.PI / 2;
    bird.add(bBody);
    for (let w = -1; w <= 1; w += 2) {
      const wing = new THREE.Mesh(
        new THREE.PlaneGeometry(0.0006, 0.0002),
        new THREE.MeshLambertMaterial({ color: 0x444444, side: THREE.DoubleSide, transparent: true, opacity: 0 })
      );
      wing.position.set(0, 0, w * 0.0003);
      wing.userData.wingDir = w;
      wing.userData.type = 'wing';
      bird.add(wing);
    }
    bird.position.set(
      (Math.random() - 0.5) * 0.04,
      0.006 + Math.random() * 0.003,
      (Math.random() - 0.5) * 0.04
    );
    bird.userData.type = 'bird';
    bird.userData.baseY = bird.position.y;
    bird.userData.phase = Math.random() * Math.PI * 2;
    detailedForestGroup.add(bird);
    animalMeshes.push(bird);
  }

  // Butterflies (10)
  for (let i = 0; i < 10; i++) {
    const bf = new THREE.Group();
    const colors = [0xff6b35, 0xffdd00, 0x00bcd4, 0xe91e63, 0x9c27b0, 0xff9800];
    const bfColor = colors[Math.floor(Math.random() * colors.length)];
    const bfBody = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.00004, 0.00015, 2, 3),
      new THREE.MeshLambertMaterial({ color: 0x222222, transparent: true, opacity: 0 })
    );
    bf.add(bfBody);
    for (let w = -1; w <= 1; w += 2) {
      const wing = new THREE.Mesh(
        new THREE.CircleGeometry(0.00025, 5),
        new THREE.MeshLambertMaterial({ color: bfColor, side: THREE.DoubleSide, transparent: true, opacity: 0 })
      );
      wing.position.set(0, 0, w * 0.00015);
      wing.userData.wingDir = w;
      wing.userData.type = 'bfWing';
      bf.add(wing);
    }
    bf.position.set(
      (Math.random() - 0.5) * 0.04,
      0.001 + Math.random() * 0.004,
      (Math.random() - 0.5) * 0.04
    );
    bf.userData.type = 'butterfly';
    bf.userData.phase = Math.random() * Math.PI * 2;
    bf.userData.basePos = bf.position.clone();
    detailedForestGroup.add(bf);
    butterflyMeshes.push(bf);
  }
}

function createHealthStatusLabels() {
  const trees = detailedForestGroup.children.filter(c => c.userData && c.userData.health);
  const sampleTrees = trees.slice(0, 12);
  sampleTrees.forEach(tree => {
    const status = tree.userData.health;
    const icon = status === 'healthy' ? '🟢' : status === 'stressed' ? '🟡' : '🔴';
    const text = status === 'healthy' ? '健康' : status === 'stressed' ? '要注意' : '病害検出';
    const extra = status === 'sick' ? '<br><small>キクイムシ被害の疑い</small>' : '';

    const div = document.createElement('div');
    div.className = 'health-label';
    div.innerHTML = `<span class="health-icon">${icon}</span><span class="health-text">${text}${extra}</span>`;
    div.style.opacity = '0';

    const labelObj = new CSS2DObject(div);
    const treeH = tree.children[0] ? tree.children[0].geometry.parameters.height || 0.003 : 0.003;
    labelObj.position.set(0, treeH + 0.001, 0);
    tree.add(labelObj);
    healthLabels.push(labelObj);
  });
}

// ============================================================
// HELPERS
// ============================================================
function latLngToVec3(lat, lng, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lng + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function flyTo(lat, lng, distance = 1.8) {
  const target = latLngToVec3(lat, lng, distance);
  const start = camera.position.clone();
  const startTime = clock.getElapsedTime();
  const duration = 1.5;

  controls.autoRotate = false;

  function flyStep() {
    const elapsed = clock.getElapsedTime() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(start, target, ease);
    controls.target.set(0, 0, 0);
    controls.update();

    if (t < 1) requestAnimationFrame(flyStep);
    else {
      setTimeout(() => { controls.autoRotate = true; }, 3000);
    }
  }
  flyStep();
}

// ============================================================
// ANIMATION LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Rotate clouds slowly
  if (clouds) clouds.rotation.y += delta * 0.02;

  // Twinkle stars
  if (stars) stars.rotation.y += delta * 0.005;

  // Update detail levels based on camera distance
  const dist = camera.position.length();
  updateLabelVisibility(dist);
  updateSceneBackground(dist);
  updateObservationMarkerVisibility(dist);

  // ---- Sun follows camera (always daytime on visible face) ----
  if (sunLight) {
    sunLight.position.copy(camera.position).normalize().multiplyScalar(10);
  }

  // ---- Dynamic rotate speed (Google Earth-like) ----
  // When zoomed in, reduce sensitivity so the globe moves proportionally
  const normalizedDist = (dist - controls.minDistance) / (controls.maxDistance - controls.minDistance);
  controls.rotateSpeed = 0.15 + normalizedDist * 0.6; // 0.15 when close, 0.75 when far

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// ============================================================
// LOD — TREE VISIBILITY
// ============================================================
function updateTreeVisibility(dist) {
  if (!treeCrowns || !treeTrunks) return;
  const nearThreshold = 2.2;
  const farThreshold = 3.2;
  let opacity = 0;
  if (dist < nearThreshold) opacity = 1;
  else if (dist < farThreshold) opacity = 1 - (dist - nearThreshold) / (farThreshold - nearThreshold);

  treeCrowns.material.opacity = opacity;
  treeTrunks.material.opacity = opacity * 0.8;
}

function updateLabelVisibility(dist) {
  labels.forEach(label => {
    const el = label.element;
    if (dist < 4.5) {
      el.style.opacity = Math.min(1, (4.5 - dist) / 1.5);
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

// ============================================================
// LOD — DETAILED FOREST
// ============================================================
function updateDetailedForest(dist, time, delta) {
  if (!detailedForestGroup) return;

  // Forest appears when camera < 1.12
  const showDist = 1.12;
  const fullDist = 1.06;
  const leafDist = 1.03;
  const bugDist = 1.015;
  const healthDist = 1.04;

  if (dist > showDist) {
    detailedForestGroup.visible = false;
    return;
  }
  detailedForestGroup.visible = true;

  // Base opacity for forest elements
  const forestOpacity = Math.min(1, (showDist - dist) / (showDist - fullDist));
  const leafOpacity = dist < leafDist ? Math.min(1, (leafDist - dist) / 0.01) : 0;
  const bugOpacity = dist < bugDist ? Math.min(1, (bugDist - dist) / 0.005) : 0;
  const animalOpacity = Math.min(1, forestOpacity * 1.2);

  detailedForestGroup.traverse(child => {
    if (!child.material) return;
    const type = child.userData.type;
    if (type === 'floor' || type === 'grass') {
      child.material.opacity = forestOpacity;
    } else if (type === 'leaf') {
      child.material.opacity = leafOpacity;
    } else if (type === 'insect') {
      child.material.opacity = bugOpacity;
    } else if (type === 'leafCluster') {
      child.material.opacity = forestOpacity;
    } else if (type === 'bfWing' || type === 'wing') {
      child.material.opacity = animalOpacity;
    } else if (child.material.transparent) {
      child.material.opacity = forestOpacity;
    }
  });

  // Leaf particles
  if (leafParticles) leafParticles.material.opacity = forestOpacity * 0.7;

  // Health labels
  healthLabels.forEach(label => {
    label.element.style.opacity = dist < healthDist ? Math.min(1, (healthDist - dist) / 0.015) : 0;
  });

  // Animate butterflies
  butterflyMeshes.forEach(bf => {
    const p = bf.userData.phase + time * 3;
    bf.position.x = bf.userData.basePos.x + Math.sin(p) * 0.003;
    bf.position.y = bf.userData.basePos.y + Math.sin(p * 1.3) * 0.001;
    bf.position.z = bf.userData.basePos.z + Math.cos(p * 0.7) * 0.003;
    bf.rotation.y = Math.sin(p) * 0.5;
    bf.children.forEach(c => {
      if (c.userData.type === 'bfWing') {
        c.rotation.y = c.userData.wingDir * Math.sin(time * 12 + bf.userData.phase) * 0.8;
      }
    });
  });

  // Animate birds
  animalMeshes.forEach(m => {
    if (m.userData.type === 'bird') {
      m.position.y = m.userData.baseY + Math.sin(time * 0.8 + m.userData.phase) * 0.0005;
      m.position.x += Math.sin(time * 0.3 + m.userData.phase) * delta * 0.0005;
      m.children.forEach(c => {
        if (c.userData.type === 'wing') {
          c.rotation.x = c.userData.wingDir * Math.sin(time * 6 + m.userData.phase) * 0.5;
        }
      });
    }
  });
}

function updateSceneBackground(dist) {
  // Transition from space-black to sky-blue when zoomed close
  if (dist < 1.15 && dist > 1.0) {
    const t = Math.min(1, (1.15 - dist) / 0.1);
    scene.background.lerpColors(spaceColor, skyColor, t);
    if (stars) stars.material.opacity = 0.85 * (1 - t);
    if (clouds) clouds.material.opacity = 0.25 * (1 - t * 0.8);
  } else if (dist <= 1.0) {
    scene.background.copy(skyColor);
    if (stars) stars.material.opacity = 0;
  } else {
    scene.background.copy(spaceColor);
    if (stars) stars.material.opacity = 0.85;
  }
}

// ============================================================
// SATELLITE PREVIEW / APPLY ON 3D GLOBE
// ============================================================
function drawSatelliteOn3DGlobe(satData, opacity) {
  const cvs = overlayMesh.userData.canvas;
  const ctx = cvs.getContext('2d');
  const w = cvs.width, h = cvs.height;
  const [r, g, b] = satData.color;

  ctx.clearRect(0, 0, w, h);

  // Draw semi-transparent satellite data visualization
  for (let i = 0; i < 60; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const cr = Math.random() * 200 + 50;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    grad.addColorStop(0, `rgba(${r},${g},${b},${Math.random() * 0.4 + 0.1})`);
    grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  overlayMesh.userData.texture.needsUpdate = true;
  overlayMesh.material.opacity = opacity / 100;
}

function clearSatelliteOverlay() {
  const cvs = overlayMesh.userData.canvas;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, cvs.width, cvs.height);
  overlayMesh.userData.texture.needsUpdate = true;
  overlayMesh.material.opacity = 0;
}

function selectSatelliteForPreview(satId) {
  const satData = SATELLITE_DATA.find(s => s.id === satId);
  if (!satData) return;
  state.currentPreview = satData;

  $('#preview-name').textContent = satData.name;
  $('#preview-desc').textContent = satData.description;
  $('#preview-bar').classList.remove('hidden');
  $('#preview-opacity').value = 60;
  $('#opacity-value').textContent = '60%';

  drawSatelliteOn3DGlobe(satData, 60);

  $$('.satellite-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`.satellite-card[data-id="${satId}"]`);
  if (card) card.classList.add('selected');

  $('#layer-modal').classList.add('hidden');
  showToast('info', `${satData.name} のプレビューを表示中`);
}

function applyCurrentPreview() {
  if (!state.currentPreview) return;
  const layer = { ...state.currentPreview, opacity: parseInt($('#preview-opacity').value) };
  state.activeLayers.push(layer);
  renderActiveLayers();
  drawSatelliteOn3DGlobe(layer, layer.opacity);

  state.currentPreview = null;
  $('#preview-bar').classList.add('hidden');
  showToast('success', `${layer.name} をマップに適用しました`);
}

function cancelPreview() {
  state.currentPreview = null;
  $('#preview-bar').classList.add('hidden');
  if (state.activeLayers.length === 0) clearSatelliteOverlay();
}

// ============================================================
// RENDER — PANELS (Regions, Species, Satellite Catalog)
// ============================================================
function renderRegions() {
  const container = $('#region-list');
  container.innerHTML = REGIONS_DATA.map(r => `
    <div class="region-item" data-region="${r.name}" data-lat="${r.lat}" data-lng="${r.lng}">
      <span class="region-flag">${r.flag}</span>
      <div class="region-info">
        <div class="region-name">${r.name}</div>
        <div class="region-stats">${r.trees} 本 · ${r.area}</div>
      </div>
      <div class="region-bar">
        <div class="region-bar-fill" style="width:0%;" data-target="${r.pct}"></div>
      </div>
    </div>
  `).join('');
  requestAnimationFrame(() => {
    setTimeout(() => {
      $$('.region-bar-fill').forEach(bar => { bar.style.width = bar.dataset.target + '%'; });
    }, 100);
  });
}

function renderSpecies() {
  const container = $('#species-list');
  container.innerHTML = SPECIES_DATA.map(s => `
    <div class="species-item">
      <div class="species-icon" style="background:${s.color}22;"><span>${s.emoji}</span></div>
      <div class="species-info">
        <div class="species-name">${s.name}</div>
        <div class="species-count">${s.count}</div>
      </div>
      <div class="species-pct">${s.pct}</div>
    </div>
  `).join('');
}

function renderSatelliteCatalog(filter = 'all') {
  const container = $('#satellite-catalog');
  const filtered = filter === 'all' ? SATELLITE_DATA : SATELLITE_DATA.filter(s => s.category === filter);
  container.innerHTML = filtered.map(s => `
    <div class="satellite-card" data-id="${s.id}">
      <div class="satellite-thumb"><canvas data-sat-id="${s.id}"></canvas>
        <span class="satellite-badge${s.free ? ' free' : ''}">${s.free ? '無料' : '有料'}</span>
      </div>
      <div class="satellite-card-body">
        <div class="satellite-card-title">${s.name}</div>
        <div class="satellite-card-desc">${s.description}</div>
        <div class="satellite-card-meta">
          <a class="satellite-source-link" href="${s.sourceUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
            <span class="material-icons">open_in_new</span>${s.source}</a>
          <span class="satellite-resolution">${s.resolution}</span>
        </div>
      </div>
    </div>
  `).join('');
  filtered.forEach(s => {
    const c = document.querySelector(`canvas[data-sat-id="${s.id}"]`);
    if (c) drawSatelliteThumb(c, s);
  });
  $$('.satellite-card').forEach(card => {
    card.addEventListener('click', () => selectSatelliteForPreview(card.dataset.id));
  });
}

function drawSatelliteThumb(canvas, data) {
  canvas.width = 520; canvas.height = 260;
  const ctx = canvas.getContext('2d');
  const [r, g, b] = data.color;
  const grad = ctx.createLinearGradient(0, 0, 520, 260);
  grad.addColorStop(0, `rgba(${r},${g},${b},0.7)`);
  grad.addColorStop(0.5, `rgba(${r * 0.5},${g * 0.5},${b * 0.5},0.9)`);
  grad.addColorStop(1, `rgba(${r * 0.3},${g * 0.3},${b * 0.3},1)`);
  ctx.fillStyle = grad; ctx.fillRect(0, 0, 520, 260);
  for (let i = 0; i < 200; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 520, Math.random() * 260, Math.random() * 3 + 1, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r + 40},${g + 40},${b + 40},${Math.random() * 0.3})`;
    ctx.fill();
  }
}

// ============================================================
// ACTIVE LAYERS
// ============================================================
function renderActiveLayers() {
  const container = $('#active-layers');
  if (state.activeLayers.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="material-icons">layer_clear</span><p>適用中のレイヤーはありません</p></div>`;
    return;
  }
  container.innerHTML = state.activeLayers.map((l, i) => `
    <div class="active-layer-item" data-index="${i}">
      <div class="active-layer-thumb"><canvas data-active-thumb="${i}"></canvas></div>
      <div class="active-layer-info">
        <div class="active-layer-name">${l.name}</div>
        <a class="active-layer-source" href="${l.sourceUrl}" target="_blank" rel="noopener">${l.source}</a>
        <div class="layer-opacity-slider"><input type="range" min="0" max="100" value="${l.opacity}" data-layer-idx="${i}"></div>
      </div>
      <div class="active-layer-actions">
        <button class="toggle-visibility-btn" data-index="${i}" title="表示切替"><span class="material-icons">visibility</span></button>
        <button class="remove-layer-btn" data-index="${i}" title="削除"><span class="material-icons">delete_outline</span></button>
      </div>
    </div>
  `).join('');
  state.activeLayers.forEach((l, i) => {
    const c = document.querySelector(`canvas[data-active-thumb="${i}"]`);
    if (c) {
      c.width = 72; c.height = 72; const ctx = c.getContext('2d');
      const [r, g, b] = l.color;
      const grad = ctx.createRadialGradient(36, 36, 0, 36, 36, 36);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.8)`);
      grad.addColorStop(1, `rgba(${r * 0.5},${g * 0.5},${b * 0.5},1)`);
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 72, 72);
    }
  });
  $$('.layer-opacity-slider input').forEach(s => {
    s.addEventListener('input', e => {
      const idx = parseInt(e.target.dataset.layerIdx);
      state.activeLayers[idx].opacity = parseInt(e.target.value);
      overlayMesh.material.opacity = e.target.value / 100;
    });
  });
  $$('.remove-layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const name = state.activeLayers[idx].name;
      state.activeLayers.splice(idx, 1);
      renderActiveLayers();
      if (state.activeLayers.length === 0) clearSatelliteOverlay();
      showToast('info', `${name} を削除しました`);
    });
  });
  $$('.toggle-visibility-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const icon = btn.querySelector('.material-icons');
      if (icon.textContent === 'visibility') {
        icon.textContent = 'visibility_off';
        overlayMesh.material.opacity = 0;
      } else {
        icon.textContent = 'visibility';
        const idx = parseInt(btn.dataset.index);
        overlayMesh.material.opacity = state.activeLayers[idx].opacity / 100;
      }
    });
  });
}

// ============================================================
// FILE UPLOAD
// ============================================================
function handleFileUpload(files) {
  if (!files || files.length === 0) return;
  const fileArr = Array.from(files);
  const progressEl = $('#upload-progress');
  const progressFill = progressEl.querySelector('.progress-fill');
  const progressText = progressEl.querySelector('.progress-text');
  progressEl.classList.remove('hidden');
  let progress = 0;
  const step = 100 / fileArr.length;
  fileArr.forEach((file, i) => {
    setTimeout(() => {
      progress += step;
      progressFill.style.width = Math.min(progress, 100) + '%';
      progressText.textContent = `処理中... ${file.name} (${i + 1}/${fileArr.length})`;
      state.uploadedFiles.push({ name: file.name, size: formatFileSize(file.size), type: file.name.split('.').pop().toUpperCase() });
      if (i === fileArr.length - 1) {
        setTimeout(() => { progressEl.classList.add('hidden'); progressFill.style.width = '0%'; renderUploadedFiles(); showToast('success', `${fileArr.length} 件のファイルを取り込みました`); }, 500);
      }
    }, (i + 1) * 800);
  });
}

function renderUploadedFiles() {
  const container = $('#uploaded-files');
  container.innerHTML = state.uploadedFiles.map((f, i) => `
    <div class="uploaded-file-item" data-index="${i}">
      <span class="material-icons">description</span>
      <div class="uploaded-file-info"><div class="uploaded-file-name">${f.name}</div><div class="uploaded-file-meta">${f.type} · ${f.size}</div></div>
      <button class="uploaded-file-remove" data-index="${i}"><span class="material-icons">close</span></button>
    </div>
  `).join('');
  $$('.uploaded-file-remove').forEach(btn => {
    btn.addEventListener('click', () => { state.uploadedFiles.splice(parseInt(btn.dataset.index), 1); renderUploadedFiles(); });
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ============================================================
// TOAST
// ============================================================
function showToast(type, message) {
  const container = $('#toast-container');
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="material-icons">${icons[type] || 'info'}</span>${message}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ============================================================
// EVENT BINDINGS
// ============================================================
function bindEvents() {
  // Search
  $('#search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') { const q = e.target.value.trim(); if (q) showToast('info', `"${q}" を検索中...`); }
  });

  // Menu → forest panel
  $('#menu-btn').addEventListener('click', () => { $('#forest-panel').classList.toggle('hidden'); });

  // Panel close
  $$('.panel-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $(`#${btn.dataset.panel}`).classList.add('hidden');
      if (btn.dataset.panel === 'satellite-panel') $('#satellite-panel-toggle').classList.remove('active');
    });
  });

  // Satellite panel toggle
  $('#satellite-panel-toggle').addEventListener('click', () => {
    const panel = $('#satellite-panel'), btn = $('#satellite-panel-toggle');
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    btn.classList.toggle('active', isHidden);
  });

  // Upload toggle → Field Data Panel
  $('#upload-toggle-btn').addEventListener('click', () => {
    const panel = $('#fielddata-panel');
    const isHidden = panel.classList.contains('hidden');
    // Close satellite panel if open
    $('#satellite-panel').classList.add('hidden');
    panel.classList.toggle('hidden');
    $('#upload-toggle-btn').classList.toggle('active', isHidden);
    state.fieldDataPanelOpen = isHidden;
    if (isHidden) renderFieldDataPanel();
  });

  // Layer toggle
  $('#layers-toggle-btn').addEventListener('click', () => {
    const panel = $('#satellite-panel');
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (isHidden) $('#satellite-panel-toggle').classList.add('active');
  });

  // 3D toggle (reset rotation)
  $('#toggle-3d-btn').addEventListener('click', () => {
    state.is3D = !state.is3D;
    $('#toggle-3d-btn').classList.toggle('active', state.is3D);
    if (state.is3D) {
      camera.position.set(0, 0.8, 2.8);
      controls.autoRotate = true;
      showToast('info', '3D地球儀ビューに切り替えました');
    } else {
      // Top-down 2D-like view
      camera.position.set(0, 3, 0.01);
      controls.autoRotate = false;
      showToast('info', '2D平面ビューに切り替えました');
    }
  });

  // Zoom buttons
  $('#zoom-in-btn').addEventListener('click', () => {
    const dir = camera.position.clone().normalize();
    camera.position.addScaledVector(dir, -0.3);
    const d = camera.position.length();
    if (d < controls.minDistance) camera.position.setLength(controls.minDistance);
  });
  $('#zoom-out-btn').addEventListener('click', () => {
    const dir = camera.position.clone().normalize();
    camera.position.addScaledVector(dir, 0.3);
    const d = camera.position.length();
    if (d > controls.maxDistance) camera.position.setLength(controls.maxDistance);
  });

  // Compass → reset
  $('#compass-btn').addEventListener('click', () => {
    camera.position.set(0, 0.8, 2.8);
    controls.target.set(0, 0, 0);
    controls.autoRotate = true;
    showToast('info', '方位をリセットしました');
  });

  // My location → Japan
  $('#my-location-btn').addEventListener('click', () => {
    flyTo(36, 137, 1.6);
    showToast('info', '日本に移動しました');
  });

  // Add Layer → modal
  $('#add-layer-btn').addEventListener('click', () => { $('#layer-modal').classList.remove('hidden'); });
  $('#modal-close-btn').addEventListener('click', () => { $('#layer-modal').classList.add('hidden'); });
  $('#layer-modal').addEventListener('click', e => { if (e.target === e.currentTarget) $('#layer-modal').classList.add('hidden'); });

  // Modal tabs
  $$('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSatelliteCatalog(tab.dataset.category);
    });
  });

  // Preview controls
  $('#apply-layer-btn').addEventListener('click', applyCurrentPreview);
  $('#cancel-preview-btn').addEventListener('click', cancelPreview);
  $('#preview-opacity').addEventListener('input', e => {
    const val = e.target.value;
    $('#opacity-value').textContent = val + '%';
    if (state.currentPreview) drawSatelliteOn3DGlobe(state.currentPreview, parseInt(val));
  });

  // Upload dropzone
  const dropzone = $('#upload-dropzone');
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => { dropzone.classList.remove('dragover'); });
  dropzone.addEventListener('drop', e => { e.preventDefault(); dropzone.classList.remove('dragover'); handleFileUpload(e.dataTransfer.files); });
  dropzone.addEventListener('click', () => { $('#file-input').click(); });
  $('#file-input').addEventListener('change', e => { handleFileUpload(e.target.files); });
  $('#browse-btn').addEventListener('click', e => { e.stopPropagation(); $('#file-input').click(); });

  // Mini earth → reset global view
  $('#mini-earth').addEventListener('click', () => {
    camera.position.set(0, 0.5, 4);
    controls.autoRotate = true;
    showToast('info', 'グローバルビューに切り替えました');
  });

  // Region click → fly to
  document.addEventListener('click', e => {
    const regionItem = e.target.closest('.region-item');
    if (regionItem) {
      const lat = parseFloat(regionItem.dataset.lat);
      const lng = parseFloat(regionItem.dataset.lng);
      flyTo(lat, lng, 1.8);
      showToast('info', `${regionItem.dataset.region} エリアにフォーカス`);
    }
  });

  // Keyboard
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      $('#layer-modal').classList.add('hidden');
      cancelPreview();
      // Close field data modals
      ['observation-popup','confirm-modal','manual-input-modal','export-modal','settings-modal','privacy-modal'].forEach(id => {
        const el = $('#' + id); if (el) el.classList.add('hidden');
      });
      if (state.locationPickerActive) cancelLocationPicker();
    }
  });

  // Stop auto-rotate on user interaction, resume after idle
  let idleTimer;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
  });
  controls.addEventListener('end', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { controls.autoRotate = true; }, 5000);
  });
  // ====== FIELD DATA Event Bindings ======

  // Photo add button
  $('#fd-add-photo-btn').addEventListener('click', () => { $('#photo-input').click(); });
  $('#photo-input').addEventListener('change', e => { handlePhotoUpload(e.target.files); e.target.value = ''; });

  // Photo dropzone
  const photoDropzone = $('#photo-dropzone');
  photoDropzone.addEventListener('dragover', e => { e.preventDefault(); photoDropzone.classList.add('dragover'); });
  photoDropzone.addEventListener('dragleave', () => { photoDropzone.classList.remove('dragover'); });
  photoDropzone.addEventListener('drop', e => { e.preventDefault(); photoDropzone.classList.remove('dragover'); handlePhotoUpload(e.dataTransfer.files); });
  photoDropzone.addEventListener('click', () => { $('#photo-input').click(); });

  // Export button
  $('#fd-export-btn').addEventListener('click', showExportModal);

  // Settings button
  $('#fd-settings-btn').addEventListener('click', showSettingsModal);

  // Modal close buttons (generic)
  $$('.fd-popup-close').forEach(b => b.addEventListener('click', () => $('#observation-popup').classList.add('hidden')));
  $$('.fd-confirm-close').forEach(b => b.addEventListener('click', () => $('#confirm-modal').classList.add('hidden')));
  $$('.fd-manual-close').forEach(b => b.addEventListener('click', () => $('#manual-input-modal').classList.add('hidden')));
  $$('.fd-export-close').forEach(b => b.addEventListener('click', () => $('#export-modal').classList.add('hidden')));
  $$('.fd-settings-close').forEach(b => b.addEventListener('click', () => $('#settings-modal').classList.add('hidden')));

  // Modal overlay click to close
  ['observation-popup','confirm-modal','manual-input-modal','export-modal','settings-modal'].forEach(id => {
    const el = $('#' + id);
    if (el) el.addEventListener('click', e => { if (e.target === e.currentTarget) el.classList.add('hidden'); });
  });

  // Privacy accept
  $('#fd-privacy-accept').addEventListener('click', () => {
    localStorage.setItem('forestscope-privacy-accepted', 'true');
    $('#privacy-modal').classList.add('hidden');
  });

  // Location picker cancel
  $('#location-picker-cancel').addEventListener('click', cancelLocationPicker);

  // Globe click for location picking
  renderer.domElement.addEventListener('click', handleGlobeClickForLocation);
}

// ============================================================
// FIELD DATA — Helpers
// ============================================================
const CATEGORY_ICONS = { plant: 'eco', animal: 'pets', bird: 'flutter', insect: 'bug_report', other: 'help_outline' };

function vec3ToLatLng(vec3) {
  const r = vec3.length();
  const lat = 90 - (Math.acos(vec3.y / r) * 180 / Math.PI);
  const lng = (Math.atan2(vec3.z, -vec3.x) * 180 / Math.PI) - 180;
  return { lat, lng: lng < -180 ? lng + 360 : lng > 180 ? lng - 360 : lng };
}

function resizeImage(file, maxSize = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else { w = Math.round(w * maxSize / h); h = maxSize; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function generateId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatDateTime(dateStr) {
  if (!dateStr) return '日時不明';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return dateStr; }
}

// ============================================================
// FIELD DATA — IndexedDB
// ============================================================
let fieldDB = null;

async function initFieldDataDB() {
  try {
    fieldDB = await idb.openDB('forestscope-fielddata', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('observations')) {
          db.createObjectStore('observations', { keyPath: 'id' });
        }
      }
    });
  } catch (err) {
    console.error('IndexedDB init failed:', err);
    showToast('error', 'データベースの初期化に失敗しました');
  }
}

async function saveObservation(obs) {
  if (!fieldDB) return;
  await fieldDB.put('observations', obs);
}

async function getAllObservations() {
  if (!fieldDB) return [];
  return await fieldDB.getAll('observations');
}

async function deleteObservation(id) {
  if (!fieldDB) return;
  await fieldDB.delete('observations', id);
}

async function clearAllObservations() {
  if (!fieldDB) return;
  await fieldDB.clear('observations');
}

async function updateObservation(id, updates) {
  if (!fieldDB) return;
  const obs = await fieldDB.get('observations', id);
  if (obs) {
    Object.assign(obs, updates);
    await fieldDB.put('observations', obs);
  }
}

// ============================================================
// FIELD DATA — AI Identification
// ============================================================
async function identifyWithPlantNet(base64) {
  const key = localStorage.getItem('forestscope-plantnet-key');
  if (!key) return null;
  try {
    const blob = await fetch(base64).then(r => r.blob());
    const formData = new FormData();
    formData.append('images', blob, 'photo.jpg');
    formData.append('organs', 'auto');
    const resp = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${key}&include-related-images=false`, {
      method: 'POST', body: formData
    });
    if (!resp.ok) throw new Error(`PlantNet API error: ${resp.status}`);
    const data = await resp.json();
    if (!data.results || data.results.length === 0) return null;
    return data.results.slice(0, 3).map(r => ({
      name: r.species?.commonNames?.[0] || r.species?.scientificNameWithoutAuthor || '不明',
      scientificName: r.species?.scientificNameWithoutAuthor || '',
      category: 'plant',
      confidence: r.score || 0,
      source: 'plantnet'
    }));
  } catch (err) {
    console.error('PlantNet error:', err);
    return null;
  }
}

async function identifyWithINaturalist(base64) {
  const useINat = localStorage.getItem('forestscope-use-inaturalist') !== 'false';
  if (!useINat) return null;
  try {
    const blob = await fetch(base64).then(r => r.blob());
    const formData = new FormData();
    formData.append('image', blob, 'photo.jpg');
    const resp = await fetch('https://api.inaturalist.org/v1/computervision/score_image', {
      method: 'POST', body: formData
    });
    if (!resp.ok) throw new Error(`iNaturalist API error: ${resp.status}`);
    const data = await resp.json();
    if (!data.results || data.results.length === 0) return null;
    const categoryMap = { 'Plantae': 'plant', 'Animalia': 'animal', 'Aves': 'bird', 'Insecta': 'insect' };
    return data.results.slice(0, 3).map(r => ({
      name: r.taxon?.preferred_common_name || r.taxon?.name || '不明',
      scientificName: r.taxon?.name || '',
      category: categoryMap[r.taxon?.iconic_taxon_name] || 'other',
      confidence: r.combined_score ? r.combined_score / 100 : 0,
      source: 'inaturalist'
    }));
  } catch (err) {
    console.error('iNaturalist error:', err);
    return null;
  }
}

async function identifySpecies(base64) {
  // Try PlantNet first
  let species = await identifyWithPlantNet(base64);
  if (species) return { species, source: 'plantnet' };
  // Try iNaturalist
  species = await identifyWithINaturalist(base64);
  if (species) return { species, source: 'inaturalist' };
  // Both failed
  return null;
}

// ============================================================
// FIELD DATA — Photo Upload Flow
// ============================================================
async function handlePhotoUpload(files) {
  if (!files || files.length === 0) return;
  const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (fileArr.length === 0) { showToast('error', '画像ファイルを選択してください'); return; }

  for (const file of fileArr) {
    await processPhoto(file);
  }
}

async function processPhoto(file) {
  showProcessingOverlay('写真を処理中...');
  try {
    // 1. Resize image
    const imageBase64 = await resizeImage(file);

    // 2. Extract EXIF GPS
    let lat = null, lng = null, capturedAt = null;
    try {
      const gps = await exifr.gps(file);
      if (gps && gps.latitude && gps.longitude) {
        lat = gps.latitude;
        lng = gps.longitude;
      }
      const exifData = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
      if (exifData) {
        capturedAt = exifData.DateTimeOriginal || exifData.CreateDate || null;
        if (capturedAt instanceof Date) capturedAt = capturedAt.toISOString();
      }
    } catch (exifErr) {
      console.warn('EXIF extraction failed:', exifErr);
    }

    // 2b. Fallback: use device GPS if EXIF has no location
    if (lat === null || lng === null) {
      showProcessingOverlay('位置情報を取得中...');
      try {
        const pos = await getDeviceLocation();
        lat = pos.latitude;
        lng = pos.longitude;
        showToast('success', `現在地を取得: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } catch (geoErr) {
        console.warn('Device geolocation failed:', geoErr);
      }
    }

    if (!capturedAt) capturedAt = new Date().toISOString();

    const observation = {
      id: generateId(),
      imageBase64,
      lat, lng,
      capturedAt,
      createdAt: new Date().toISOString(),
      species: [],
      userNote: '',
      locationName: '',
      pendingAIIdentification: false,
    };

    // 3. If still no GPS (user denied or unavailable), ask to pick on globe
    if (lat === null || lng === null) {
      hideProcessingOverlay();
      await showLocationPicker(observation);
      return;
    }

    // 4. Run AI identification and auto-save
    await runAIAndAutoSave(observation);
  } catch (err) {
    hideProcessingOverlay();
    console.error('Photo processing error:', err);
    showToast('error', '写真の処理に失敗しました');
  }
}

// Device GPS helper
function getDeviceLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      err => reject(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  });
}

async function runAIAndConfirm(observation) {
  showProcessingOverlay('AI判定中...');
  const result = await identifySpecies(observation.imageBase64);
  hideProcessingOverlay();

  if (result) {
    observation.species = result.species;
    showConfirmModal(observation);
  } else {
    // No API results — show manual input
    observation.pendingAIIdentification = false;
    showManualInputModal(observation);
  }
}

// Auto-save flow: identify → save → plot → show result toast
async function runAIAndAutoSave(observation) {
  showProcessingOverlay('AI判定中...');
  const result = await identifySpecies(observation.imageBase64);
  hideProcessingOverlay();

  if (result) {
    observation.species = result.species;
    observation.pendingAIIdentification = false;
  } else {
    // No AI result — mark as pending, save anyway
    observation.pendingAIIdentification = !navigator.onLine;
  }

  // Auto-save
  await saveObservation(observation);
  addObservationMarker(observation);
  state.observations.push(observation);
  renderFieldDataPanel();

  // Fly to the observation location
  flyTo(observation.lat, observation.lng, 2.0);

  // Show result
  if (observation.species.length > 0) {
    const top = observation.species[0];
    const confidence = Math.round((top.confidence || 0) * 100);
    showToast('success', `📸 ${top.name} (${confidence}%) — 保存しました`);
    // Show inline result popup
    showQuickResult(observation);
  } else {
    showToast('info', '📸 写真を保存しました（種不明）');
    showManualInputModal(observation);
  }
}

// Quick result display
function showQuickResult(observation) {
  const existing = document.querySelector('.fd-quick-result');
  if (existing) existing.remove();

  const sp = observation.species[0];
  const div = document.createElement('div');
  div.className = 'fd-quick-result';
  div.innerHTML = `
    <div class="fd-qr-content">
      <img src="${observation.imageBase64}" class="fd-qr-thumb" alt="">
      <div class="fd-qr-info">
        <div class="fd-qr-name">${sp.name}</div>
        <div class="fd-qr-scientific">${sp.scientificName || ''}</div>
        <div class="fd-qr-meta">
          <span class="material-icons" style="font-size:14px;">${CATEGORY_ICONS[sp.category] || 'help_outline'}</span>
          ${Math.round((sp.confidence || 0) * 100)}% · ${sp.source}
        </div>
      </div>
      <button class="fd-qr-close"><span class="material-icons">close</span></button>
    </div>
  `;
  document.body.appendChild(div);

  div.querySelector('.fd-qr-close').addEventListener('click', () => div.remove());
  div.addEventListener('click', (e) => {
    if (e.target.closest('.fd-qr-close')) return;
    div.remove();
    showObservationPopup(observation);
  });

  // Auto-dismiss after 8 seconds
  setTimeout(() => { if (div.parentNode) div.remove(); }, 8000);
}

function showProcessingOverlay(text) {
  let ol = document.querySelector('.fd-processing-overlay');
  if (!ol) {
    ol = document.createElement('div');
    ol.className = 'fd-processing-overlay';
    ol.innerHTML = `<div class="fd-processing-spinner"></div><div class="fd-processing-text">${text}</div>`;
    document.body.appendChild(ol);
  } else {
    ol.querySelector('.fd-processing-text').textContent = text;
    ol.style.display = '';
  }
}

function hideProcessingOverlay() {
  const ol = document.querySelector('.fd-processing-overlay');
  if (ol) ol.remove();
}

// ============================================================
// FIELD DATA — Location Picker
// ============================================================
function showLocationPicker(observation) {
  return new Promise(resolve => {
    state.locationPickerActive = true;
    state.pendingLocationObservation = observation;
    state._locationPickerResolve = resolve;
    $('#location-picker-hint').classList.remove('hidden');
    showToast('info', 'GPS情報が見つかりません。地球上をクリックしてください');
  });
}

function cancelLocationPicker() {
  state.locationPickerActive = false;
  state.pendingLocationObservation = null;
  state._locationPickerResolve = null;
  $('#location-picker-hint').classList.add('hidden');
}

function handleGlobeClickForLocation(event) {
  if (!state.locationPickerActive) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const mouse = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(earth);

  if (intersects.length > 0) {
    const point = intersects[0].point;
    // Convert from world coords (earthGroup might be rotated)
    const localPoint = earthGroup.worldToLocal(point.clone());
    const { lat, lng } = vec3ToLatLng(localPoint);

    const obs = state.pendingLocationObservation;
    obs.lat = lat;
    obs.lng = lng;

    $('#location-picker-hint').classList.add('hidden');
    state.locationPickerActive = false;
    state.pendingLocationObservation = null;

    showToast('success', `位置を設定: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

    // Continue with AI identification and auto-save
    runAIAndAutoSave(obs);
  }
}

// ============================================================
// FIELD DATA — Confirm Modal
// ============================================================
function showConfirmModal(observation) {
  const body = $('#fd-confirm-body');
  const speciesHtml = observation.species.length > 0 ? observation.species.map(s => `
    <div class="fd-species-item">
      <div class="fd-species-icon"><span class="material-icons">${CATEGORY_ICONS[s.category] || 'help_outline'}</span></div>
      <div class="fd-species-info">
        <div class="fd-species-name">${s.name}</div>
        <div class="fd-species-scientific">${s.scientificName}</div>
        <div class="fd-species-source">${s.source}</div>
      </div>
      <div class="fd-confidence-bar"><div class="fd-confidence-fill" style="width:${Math.round(s.confidence * 100)}%"></div></div>
      <div class="fd-confidence-text">${Math.round(s.confidence * 100)}%</div>
    </div>
  `).join('') : '<p style="color:var(--gm-text-tertiary);font-size:13px;">種の判定結果がありません</p>';

  body.innerHTML = `
    <div class="fd-confirm-preview">
      <div class="fd-confirm-thumb"><img src="${observation.imageBase64}" alt="撮影写真"></div>
      <div class="fd-confirm-meta">
        <p><span class="material-icons" style="font-size:14px;vertical-align:middle;">schedule</span> <strong>${formatDateTime(observation.capturedAt)}</strong></p>
        <p><span class="material-icons" style="font-size:14px;vertical-align:middle;">location_on</span> <strong>${observation.lat?.toFixed(4) || '?'}, ${observation.lng?.toFixed(4) || '?'}</strong></p>
      </div>
    </div>
    <div class="fd-popup-species-title">検出された種</div>
    ${speciesHtml}
    <div class="fd-popup-note">
      <label>メモ（任意）</label>
      <textarea id="fd-confirm-note" placeholder="観察メモを入力..."></textarea>
    </div>
  `;

  $('#confirm-modal').classList.remove('hidden');
  $('#confirm-modal')._observation = observation;

  // Bind save button
  $('#fd-confirm-save').onclick = async () => {
    const obs = $('#confirm-modal')._observation;
    obs.userNote = ($('#fd-confirm-note')?.value || '').trim();
    await saveObservation(obs);
    addObservationMarker(obs);
    state.observations.push(obs);
    $('#confirm-modal').classList.add('hidden');
    renderFieldDataPanel();
    showToast('success', '観測データを保存しました');
  };

  // Bind edit button
  $('#fd-confirm-edit').onclick = () => {
    $('#confirm-modal').classList.add('hidden');
    showManualInputModal($('#confirm-modal')._observation);
  };

  // Bind cancel
  $('#fd-confirm-cancel').onclick = () => {
    $('#confirm-modal').classList.add('hidden');
  };
}

// ============================================================
// FIELD DATA — Manual Input Modal
// ============================================================
function showManualInputModal(observation) {
  const body = $('#fd-manual-body');
  body.innerHTML = `
    <div class="fd-confirm-preview" style="margin-bottom:16px;">
      <div class="fd-confirm-thumb"><img src="${observation.imageBase64}" alt="撮影写真"></div>
      <div class="fd-confirm-meta">
        <p><span class="material-icons" style="font-size:14px;vertical-align:middle;">schedule</span> <strong>${formatDateTime(observation.capturedAt)}</strong></p>
        <p><span class="material-icons" style="font-size:14px;vertical-align:middle;">location_on</span> <strong>${observation.lat?.toFixed(4) || '?'}, ${observation.lng?.toFixed(4) || '?'}</strong></p>
      </div>
    </div>
    <div class="fd-form-group">
      <label>カテゴリ</label>
      <select id="fd-manual-category">
        <option value="plant">🌿 植物</option>
        <option value="animal">🦊 動物</option>
        <option value="bird">🐦 鳥</option>
        <option value="insect">🦋 昆虫</option>
        <option value="other">❓ その他</option>
      </select>
    </div>
    <div class="fd-form-group">
      <label>名称（和名）</label>
      <input type="text" id="fd-manual-name" placeholder="例: スギ">
    </div>
    <div class="fd-form-group">
      <label>学名（任意）</label>
      <input type="text" id="fd-manual-scientific" placeholder="例: Cryptomeria japonica">
    </div>
    <div class="fd-form-group">
      <label>場所の名前（任意）</label>
      <input type="text" id="fd-manual-location" placeholder="例: 奈良公園 東側">
    </div>
    <div class="fd-form-group">
      <label>メモ（任意）</label>
      <textarea id="fd-manual-note" rows="2" placeholder="観察メモを入力..."></textarea>
    </div>
    <button id="fd-manual-save" class="primary-btn" style="background: var(--forest-primary); margin-top:8px;">
      <span class="material-icons">save</span> 保存
    </button>
  `;

  $('#manual-input-modal').classList.remove('hidden');
  $('#manual-input-modal')._observation = observation;

  $('#fd-manual-save').onclick = async () => {
    const obs = $('#manual-input-modal')._observation;
    const name = $('#fd-manual-name').value.trim() || '不明';
    obs.species = [{
      name,
      scientificName: $('#fd-manual-scientific').value.trim(),
      category: $('#fd-manual-category').value,
      confidence: 1.0,
      source: 'manual'
    }];
    obs.userNote = $('#fd-manual-note').value.trim();
    obs.locationName = $('#fd-manual-location').value.trim();
    obs.pendingAIIdentification = false;
    await saveObservation(obs);
    addObservationMarker(obs);
    state.observations.push(obs);
    $('#manual-input-modal').classList.add('hidden');
    renderFieldDataPanel();
    showToast('success', '観測データを保存しました');
  };
}

// ============================================================
// FIELD DATA — Markers on Globe
// ============================================================
const observationMarkers = [];

function addObservationMarker(observation) {
  const div = document.createElement('div');
  div.className = 'observation-marker';
  div.innerHTML = `
    <div class="observation-marker-pin ${observation.pendingAIIdentification ? 'pending' : ''}">
      <span class="material-icons">${observation.pendingAIIdentification ? 'sync' : 'photo_camera'}</span>
    </div>
  `;
  div.addEventListener('click', (e) => { e.stopPropagation(); showObservationPopup(observation); });

  const labelObj = new CSS2DObject(div);
  const pos = latLngToVec3(observation.lat, observation.lng, EARTH_RADIUS + 0.005);
  labelObj.position.copy(pos);
  labelObj.userData = { observation };
  earthGroup.add(labelObj);
  observationMarkers.push({ obj: labelObj, observation });
}

function removeObservationMarker(observationId) {
  const idx = observationMarkers.findIndex(m => m.observation.id === observationId);
  if (idx !== -1) {
    earthGroup.remove(observationMarkers[idx].obj);
    observationMarkers.splice(idx, 1);
  }
}

async function loadObservationsToGlobe() {
  try {
    const observations = await getAllObservations();
    state.observations = observations;
    observations.forEach(obs => addObservationMarker(obs));
    if (observations.length > 0 && state.fieldDataPanelOpen) renderFieldDataPanel();
  } catch (err) {
    console.error('Failed to load observations:', err);
  }
}

function updateObservationMarkerVisibility(dist) {
  observationMarkers.forEach(({ obj }) => {
    const el = obj.element;
    if (dist < 4.5) {
      el.style.opacity = Math.min(1, (4.5 - dist) / 1.5);
      el.style.display = '';
    } else {
      el.style.display = 'none';
    }
  });
}

// ============================================================
// FIELD DATA — Observation Popup
// ============================================================
function showObservationPopup(observation) {
  const body = $('#fd-popup-body');
  const speciesHtml = (observation.species || []).map(s => `
    <div class="fd-species-item">
      <div class="fd-species-icon"><span class="material-icons">${CATEGORY_ICONS[s.category] || 'help_outline'}</span></div>
      <div class="fd-species-info">
        <div class="fd-species-name">${s.name}</div>
        <div class="fd-species-scientific">${s.scientificName || ''}</div>
        <div class="fd-species-source">${s.source || ''}</div>
      </div>
      <div class="fd-confidence-bar"><div class="fd-confidence-fill" style="width:${Math.round((s.confidence || 0) * 100)}%"></div></div>
      <div class="fd-confidence-text">${Math.round((s.confidence || 0) * 100)}%</div>
    </div>
  `).join('');

  body.innerHTML = `
    <img class="fd-popup-image" src="${observation.imageBase64}" alt="観測写真" id="fd-popup-img">
    <div class="fd-popup-details">
      <div class="fd-popup-datetime">
        <span class="material-icons">schedule</span> ${formatDateTime(observation.capturedAt)}
      </div>
      <div class="fd-popup-coords">
        📍 ${observation.lat?.toFixed(6) || '?'}, ${observation.lng?.toFixed(6) || '?'}
        ${observation.locationName ? ` — ${observation.locationName}` : ''}
      </div>
      ${observation.pendingAIIdentification ? '<p style="color:var(--gm-yellow);font-size:12px;margin-bottom:8px;">🔄 AI判定保留中</p>' : ''}
      <div class="fd-popup-species-title">検出された種</div>
      ${speciesHtml || '<p style="color:var(--gm-text-tertiary);font-size:13px;">データなし</p>'}
      <div class="fd-popup-note">
        <label>メモ</label>
        <textarea id="fd-obs-note">${observation.userNote || ''}</textarea>
      </div>
    </div>
    <div class="fd-popup-actions">
      <button class="primary-btn" style="background:var(--forest-primary);" id="fd-popup-flyto">
        <span class="material-icons">flight</span> この地点へ飛ぶ
      </button>
      <button class="secondary-btn fd-danger-btn" id="fd-popup-delete">
        <span class="material-icons">delete</span> 削除
      </button>
    </div>
  `;

  $('#observation-popup').classList.remove('hidden');

  // Lightbox
  $('#fd-popup-img').addEventListener('click', () => {
    const lb = document.createElement('div');
    lb.className = 'fd-lightbox';
    lb.innerHTML = `<img src="${observation.imageBase64}" alt="拡大写真">`;
    lb.addEventListener('click', () => lb.remove());
    document.body.appendChild(lb);
  });

  // Fly to
  $('#fd-popup-flyto').addEventListener('click', () => {
    $('#observation-popup').classList.add('hidden');
    flyTo(observation.lat, observation.lng, 1.5);
    showToast('info', '観測地点へ移動中...');
  });

  // Delete
  $('#fd-popup-delete').addEventListener('click', async () => {
    if (!confirm('この観測データを削除しますか？')) return;
    await deleteObservation(observation.id);
    removeObservationMarker(observation.id);
    state.observations = state.observations.filter(o => o.id !== observation.id);
    $('#observation-popup').classList.add('hidden');
    renderFieldDataPanel();
    showToast('info', '観測データを削除しました');
  });

  // Save note on blur
  const noteEl = $('#fd-obs-note');
  if (noteEl) {
    noteEl.addEventListener('blur', async () => {
      const newNote = noteEl.value.trim();
      if (newNote !== (observation.userNote || '')) {
        observation.userNote = newNote;
        await updateObservation(observation.id, { userNote: newNote });
      }
    });
  }
}

// ============================================================
// FIELD DATA — CSV Export
// ============================================================
function showExportModal() {
  const body = $('#fd-export-body');
  body.innerHTML = `
    <div class="fd-form-group">
      <label>エリア指定</label>
      <div class="fd-radio-group">
        <div class="fd-radio-item">
          <input type="radio" name="fd-area" value="all" id="fd-area-all" checked>
          <label for="fd-area-all">すべて</label>
        </div>
        <div class="fd-radio-item">
          <input type="radio" name="fd-area" value="visible" id="fd-area-visible">
          <label for="fd-area-visible">現在表示中の範囲</label>
        </div>
      </div>
    </div>
    <div class="fd-form-group">
      <label>期間指定</label>
      <div class="fd-date-range">
        <div class="fd-form-group">
          <label>開始日</label>
          <input type="date" id="fd-date-start">
        </div>
        <div class="fd-form-group">
          <label>終了日</label>
          <input type="date" id="fd-date-end">
        </div>
      </div>
    </div>
    <div class="fd-export-preview">
      <div class="fd-preview-count" id="fd-export-count">${state.observations.length}</div>
      <div class="fd-preview-label">件が該当</div>
    </div>
    <button id="fd-do-export" class="primary-btn" style="background: var(--forest-primary);">
      <span class="material-icons">file_download</span> エクスポート実行
    </button>
  `;

  $('#export-modal').classList.remove('hidden');

  // Update count on filter change
  const updateCount = () => {
    const filtered = filterObservations();
    $('#fd-export-count').textContent = filtered.length;
  };
  body.querySelectorAll('input[name="fd-area"], #fd-date-start, #fd-date-end').forEach(el => {
    el.addEventListener('change', updateCount);
  });

  $('#fd-do-export').onclick = () => {
    const filtered = filterObservations();
    if (filtered.length === 0) { showToast('error', 'エクスポートするデータがありません'); return; }
    exportToCSV(filtered);
    $('#export-modal').classList.add('hidden');
  };
}

function filterObservations() {
  let obs = [...state.observations];
  const areaType = document.querySelector('input[name="fd-area"]:checked')?.value || 'all';
  const startDate = $('#fd-date-start')?.value;
  const endDate = $('#fd-date-end')?.value;

  if (startDate) obs = obs.filter(o => o.capturedAt >= startDate);
  if (endDate) obs = obs.filter(o => o.capturedAt <= endDate + 'T23:59:59Z');

  return obs;
}

function exportToCSV(observations) {
  const rows = observations.map(obs => {
    const row = {
      id: obs.id,
      captured_at: obs.capturedAt || '',
      latitude: obs.lat || '',
      longitude: obs.lng || '',
      location_name: obs.locationName || '',
    };
    for (let i = 0; i < 3; i++) {
      const s = obs.species?.[i];
      row[`species_${i+1}_name`] = s?.name || '';
      row[`species_${i+1}_scientific`] = s?.scientificName || '';
      row[`species_${i+1}_category`] = s?.category || '';
      row[`species_${i+1}_confidence`] = s?.confidence != null ? Math.round(s.confidence * 100) / 100 : '';
    }
    row.user_note = obs.userNote || '';
    row.source_api = obs.species?.[0]?.source || '';
    return row;
  });

  const csv = Papa.unparse(rows);
  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const filename = `forestscope_observations_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.csv`;

  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('success', `${observations.length} 件のデータをCSV出力しました`);
}

// ============================================================
// FIELD DATA — Settings
// ============================================================
function showSettingsModal() {
  const plantNetKey = localStorage.getItem('forestscope-plantnet-key') || '';
  const useINat = localStorage.getItem('forestscope-use-inaturalist') !== 'false';
  const body = $('#fd-settings-body');

  body.innerHTML = `
    <div class="fd-settings-section">
      <div class="fd-settings-section-title"><span class="material-icons">vpn_key</span> Pl@ntNet API キー</div>
      <div class="fd-form-group">
        <input type="password" id="fd-set-plantnet-key" value="${plantNetKey}" placeholder="APIキーを入力...">
      </div>
      <div class="fd-settings-hint">
        <a href="https://my.plantnet.org/" target="_blank" rel="noopener">my.plantnet.org</a> でアカウント作成後、APIキーを取得できます。
      </div>
    </div>

    <div class="fd-settings-section">
      <div class="fd-settings-section-title"><span class="material-icons">nature_people</span> iNaturalist</div>
      <div class="fd-toggle-row">
        <label>iNaturalist Computer Vision を使用</label>
        <div class="fd-toggle">
          <input type="checkbox" id="fd-set-inat" ${useINat ? 'checked' : ''}>
          <span class="fd-toggle-slider"></span>
        </div>
      </div>
      <div class="fd-settings-hint">APIキー不要ですが、レート制限があります。</div>
    </div>

    <div class="fd-settings-section">
      <div class="fd-settings-section-title"><span class="material-icons">backup</span> バックアップ</div>
      <div style="display:flex;gap:8px;margin-bottom:8px;">
        <button id="fd-set-export-json" class="secondary-btn" style="flex:1;">
          <span class="material-icons">cloud_download</span> JSONバックアップ
        </button>
        <button id="fd-set-import-json" class="secondary-btn" style="flex:1;">
          <span class="material-icons">cloud_upload</span> JSON復元
        </button>
      </div>
      <input type="file" id="fd-json-import-input" accept=".json" hidden>
    </div>

    <div class="fd-settings-section">
      <div class="fd-settings-section-title"><span class="material-icons" style="color:var(--gm-red);">warning</span> データ管理</div>
      <button id="fd-set-clear-all" class="secondary-btn fd-danger-btn" style="width:100%;">
        <span class="material-icons">delete_forever</span> 全データ削除
      </button>
    </div>

    <button id="fd-set-save" class="primary-btn" style="background: var(--forest-primary); margin-top:8px;">
      <span class="material-icons">save</span> 設定を保存
    </button>
  `;

  $('#settings-modal').classList.remove('hidden');

  // Save settings
  $('#fd-set-save').onclick = () => {
    localStorage.setItem('forestscope-plantnet-key', $('#fd-set-plantnet-key').value.trim());
    localStorage.setItem('forestscope-use-inaturalist', $('#fd-set-inat').checked ? 'true' : 'false');
    $('#settings-modal').classList.add('hidden');
    showToast('success', '設定を保存しました');
  };

  // JSON export
  $('#fd-set-export-json').onclick = async () => {
    const obs = await getAllObservations();
    const json = JSON.stringify(obs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'forestscope_backup.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'バックアップをエクスポートしました');
  };

  // JSON import
  $('#fd-set-import-json').onclick = () => { $('#fd-json-import-input').click(); };
  $('#fd-json-import-input').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      for (const obs of data) { await saveObservation(obs); }
      // Reload markers
      observationMarkers.forEach(m => earthGroup.remove(m.obj));
      observationMarkers.length = 0;
      await loadObservationsToGlobe();
      renderFieldDataPanel();
      showToast('success', `${data.length} 件のデータを復元しました`);
    } catch (err) {
      showToast('error', 'バックアップの復元に失敗しました');
      console.error(err);
    }
  };

  // Clear all
  $('#fd-set-clear-all').onclick = async () => {
    if (!confirm('すべての観測データを削除しますか？')) return;
    if (!confirm('本当に削除しますか？この操作は取り消せません。')) return;
    await clearAllObservations();
    observationMarkers.forEach(m => earthGroup.remove(m.obj));
    observationMarkers.length = 0;
    state.observations = [];
    renderFieldDataPanel();
    $('#settings-modal').classList.add('hidden');
    showToast('info', 'すべてのデータを削除しました');
  };
}

// ============================================================
// FIELD DATA — Privacy & Offline
// ============================================================
function showPrivacyNotice() {
  if (localStorage.getItem('forestscope-privacy-accepted') === 'true') return;
  $('#privacy-modal').classList.remove('hidden');
}

function setupOfflineHandling() {
  window.addEventListener('online', async () => {
    showToast('info', 'オンラインに復帰しました');
    await retryPendingIdentifications();
  });

  window.addEventListener('offline', () => {
    showToast('info', 'オフラインモードです。データはローカルに保存されます');
  });
}

async function retryPendingIdentifications() {
  const observations = await getAllObservations();
  const pending = observations.filter(o => o.pendingAIIdentification);
  if (pending.length === 0) return;

  showToast('info', `${pending.length} 件の保留中データをAI判定します...`);

  for (const obs of pending) {
    try {
      const result = await identifySpecies(obs.imageBase64);
      if (result) {
        obs.species = result.species;
        obs.pendingAIIdentification = false;
        await saveObservation(obs);
        // Update marker
        removeObservationMarker(obs.id);
        addObservationMarker(obs);
        // Update state
        const idx = state.observations.findIndex(o => o.id === obs.id);
        if (idx !== -1) state.observations[idx] = obs;
      }
    } catch (err) {
      console.error('Retry failed for:', obs.id, err);
    }
  }

  renderFieldDataPanel();
  showToast('success', 'AI判定のリトライが完了しました');
}

// ============================================================
// FIELD DATA — Panel UI
// ============================================================
function renderFieldDataPanel() {
  // Update stats
  const countEl = $('#fd-count');
  const pendingCountEl = $('#fd-pending-count');
  const pendingRow = $('#fd-pending-row');

  if (countEl) countEl.textContent = state.observations.length;

  const pendingCount = state.observations.filter(o => o.pendingAIIdentification).length;
  if (pendingCountEl) pendingCountEl.textContent = pendingCount;
  if (pendingRow) pendingRow.classList.toggle('hidden', pendingCount === 0);

  // Render observation list
  renderObservationList(state.observations);
}

function renderObservationList(observations) {
  const container = $('#fd-observation-list');
  if (!container) return;

  if (observations.length === 0) {
    container.innerHTML = `<div class="empty-state"><span class="material-icons">photo_library</span><p>観測データはまだありません</p></div>`;
    return;
  }

  container.innerHTML = observations.slice().reverse().map(obs => {
    const species = obs.species?.[0];
    const name = species?.name || '不明';
    const catIcon = species ? CATEGORY_ICONS[species.category] || 'help_outline' : 'photo_camera';
    const dateStr = formatDateTime(obs.capturedAt);
    return `
      <div class="fd-obs-item" data-obs-id="${obs.id}">
        <div class="fd-obs-thumb"><img src="${obs.imageBase64}" alt="" loading="lazy"></div>
        <div class="fd-obs-info">
          <div class="fd-obs-name">${name}</div>
          <div class="fd-obs-meta">${dateStr}${obs.locationName ? ' — ' + obs.locationName : ''}</div>
        </div>
        ${obs.pendingAIIdentification ? '<span class="fd-obs-pending">🔄</span>' : `<div class="fd-obs-category-icon"><span class="material-icons">${catIcon}</span></div>`}
      </div>
    `;
  }).join('');

  container.querySelectorAll('.fd-obs-item').forEach(item => {
    item.addEventListener('click', () => {
      const obs = state.observations.find(o => o.id === item.dataset.obsId);
      if (obs) {
        showObservationPopup(obs);
        flyTo(obs.lat, obs.lng, 2.0);
      }
    });
  });
}

// ============================================================
// BOTTOM NAVIGATION & BOTTOM SHEET (Mobile)
// ============================================================
let currentBnavTab = 'home';

function initBottomNav() {
  const nav = $('#bottom-nav');
  if (!nav) return;

  nav.querySelectorAll('.bnav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      // Update active state
      nav.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (tab === 'home') {
        closeBsheet();
        currentBnavTab = 'home';
        return;
      }

      currentBnavTab = tab;
      openBsheetForTab(tab);
    });
  });
}

function openBsheetForTab(tab) {
  const sheet = $('#bottom-sheet');
  const content = $('#bsheet-content');
  if (!sheet || !content) return;

  switch (tab) {
    case 'camera':
      renderBsheetCamera(content);
      break;
    case 'data':
      renderBsheetData(content);
      break;
    case 'regions':
      renderBsheetRegions(content);
      break;
    case 'settings':
      renderBsheetSettings(content);
      break;
    default:
      return;
  }

  sheet.classList.remove('hidden');
}

function closeBsheet() {
  const sheet = $('#bottom-sheet');
  if (sheet) sheet.classList.add('hidden');
}

// ---- Camera Tab ----
function renderBsheetCamera(container) {
  const count = state.observations.length;
  const pendingCount = state.observations.filter(o => o.pendingAIIdentification).length;

  container.innerHTML = `
    <div class="bsheet-title">
      <span class="material-icons">photo_camera</span>
      撮影 & データ追加
    </div>
    <button class="bsheet-camera-btn" id="bsheet-photo-btn">
      <span class="material-icons">add_a_photo</span>
      📸 写真を撮影 / 選択
    </button>
    <div class="upload-dropzone fd-dropzone" id="bsheet-dropzone">
      <span class="material-icons upload-icon">add_photo_alternate</span>
      <p>写真をドラッグ＆ドロップ</p>
      <span class="upload-hint">JPG, PNG に対応 · GPS付き写真推奨</span>
    </div>
    <div class="bsheet-stats-grid">
      <div class="bsheet-stat">
        <div class="bsheet-stat-value">${count}</div>
        <div class="bsheet-stat-label">観測データ</div>
      </div>
      <div class="bsheet-stat">
        <div class="bsheet-stat-value">${pendingCount}</div>
        <div class="bsheet-stat-label">AI判定保留</div>
      </div>
    </div>
  `;

  // Bind photo button
  container.querySelector('#bsheet-photo-btn').addEventListener('click', () => {
    $('#photo-input').click();
  });

  // Bind dropzone
  const dz = container.querySelector('#bsheet-dropzone');
  dz.addEventListener('click', () => { $('#photo-input').click(); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => { dz.classList.remove('dragover'); });
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); handlePhotoUpload(e.dataTransfer.files); });
}

// ---- Data Tab ----
function renderBsheetData(container) {
  const count = state.observations.length;

  let listHtml = '';
  if (count === 0) {
    listHtml = `<div class="empty-state" style="padding:20px 0;"><span class="material-icons">photo_library</span><p>観測データはまだありません</p></div>`;
  } else {
    listHtml = state.observations.slice().reverse().map(obs => {
      const species = obs.species?.[0];
      const name = species?.name || '不明';
      const catIcon = species ? CATEGORY_ICONS[species.category] || 'help_outline' : 'photo_camera';
      const dateStr = formatDateTime(obs.capturedAt);
      return `
        <div class="fd-obs-item" data-obs-id="${obs.id}">
          <div class="fd-obs-thumb"><img src="${obs.imageBase64}" alt="" loading="lazy"></div>
          <div class="fd-obs-info">
            <div class="fd-obs-name">${name}</div>
            <div class="fd-obs-meta">${dateStr}</div>
          </div>
          ${obs.pendingAIIdentification ? '<span class="fd-obs-pending">🔄</span>' : `<div class="fd-obs-category-icon"><span class="material-icons">${catIcon}</span></div>`}
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="bsheet-title">
      <span class="material-icons">analytics</span>
      観測データ（${count}件）
    </div>
    <div class="bsheet-obs-list">${listHtml}</div>
    <div class="bsheet-action-row">
      <button class="secondary-btn" id="bsheet-export-btn">
        <span class="material-icons">file_download</span> CSV出力
      </button>
      <button class="secondary-btn" id="bsheet-backup-btn">
        <span class="material-icons">cloud_download</span> バックアップ
      </button>
    </div>
  `;

  // Bind observation items
  container.querySelectorAll('.fd-obs-item').forEach(item => {
    item.addEventListener('click', () => {
      const obs = state.observations.find(o => o.id === item.dataset.obsId);
      if (obs) {
        closeBsheet();
        showObservationPopup(obs);
        flyTo(obs.lat, obs.lng, 2.0);
      }
    });
  });

  // Bind export
  container.querySelector('#bsheet-export-btn')?.addEventListener('click', () => {
    closeBsheet();
    showExportModal();
  });

  // Bind backup
  container.querySelector('#bsheet-backup-btn')?.addEventListener('click', async () => {
    const obs = await getAllObservations();
    const json = JSON.stringify(obs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'forestscope_backup.json';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('success', 'バックアップをエクスポートしました');
  });
}

// ---- Regions Tab ----
function renderBsheetRegions(container) {
  const regionsHtml = REGIONS_DATA.map(r => `
    <div class="bsheet-region-item" data-lat="${r.lat}" data-lng="${r.lng}" data-name="${r.name}">
      <span class="bsheet-region-flag">${r.flag}</span>
      <div class="bsheet-region-info">
        <div class="bsheet-region-name">${r.name}</div>
        <div class="bsheet-region-stats">${r.trees} · ${r.area}</div>
      </div>
      <div class="bsheet-region-bar">
        <div class="bsheet-region-bar-fill" data-target="${r.pct}" style="width: 0%;"></div>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="bsheet-title">
      <span class="material-icons">forest</span>
      地域別森林データ
    </div>
    <div class="bsheet-stats-grid">
      <div class="bsheet-stat">
        <div class="bsheet-stat-value">3.04T</div>
        <div class="bsheet-stat-label">推定樹木数</div>
        <div class="bsheet-stat-trend up"><span class="material-icons">trending_up</span> +0.3%</div>
      </div>
      <div class="bsheet-stat">
        <div class="bsheet-stat-value">4.06B ha</div>
        <div class="bsheet-stat-label">森林面積</div>
        <div class="bsheet-stat-trend down"><span class="material-icons">trending_down</span> −4.7M/年</div>
      </div>
      <div class="bsheet-stat">
        <div class="bsheet-stat-value">2.6Gt</div>
        <div class="bsheet-stat-label">CO₂吸収量</div>
        <div class="bsheet-stat-trend neutral"><span class="material-icons">trending_flat</span> 安定</div>
      </div>
      <div class="bsheet-stat">
        <div class="bsheet-stat-value">73,300+</div>
        <div class="bsheet-stat-label">樹種数</div>
        <div class="bsheet-stat-trend up"><span class="material-icons">trending_up</span> +9,200</div>
      </div>
    </div>
    <div class="bsheet-section-title">地域をタップして移動</div>
    ${regionsHtml}
  `;

  // Animate bars
  requestAnimationFrame(() => {
    setTimeout(() => {
      container.querySelectorAll('.bsheet-region-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.target + '%';
      });
    }, 100);
  });

  // Bind region items
  container.querySelectorAll('.bsheet-region-item').forEach(item => {
    item.addEventListener('click', () => {
      const lat = parseFloat(item.dataset.lat);
      const lng = parseFloat(item.dataset.lng);
      closeBsheet();
      flyTo(lat, lng, 1.8);
      showToast('info', `${item.dataset.name} エリアにフォーカス`);
    });
  });
}

// ---- Settings Tab ----
function renderBsheetSettings(container) {
  const plantNetKey = localStorage.getItem('forestscope-plantnet-key') || '';
  const useINat = localStorage.getItem('forestscope-use-inaturalist') !== 'false';

  container.innerHTML = `
    <div class="bsheet-title">
      <span class="material-icons" style="color: var(--gm-text-tertiary);">settings</span>
      設定
    </div>

    <div class="bsheet-section">
      <div class="bsheet-section-title">AI 判定エンジン</div>
      <div class="fd-form-group">
        <label>Pl@ntNet API キー</label>
        <input type="password" id="bsheet-plantnet-key" value="${plantNetKey}" placeholder="APIキーを入力...">
      </div>
      <div class="fd-settings-hint" style="margin-bottom:12px;">
        <a href="https://my.plantnet.org/" target="_blank" rel="noopener">my.plantnet.org</a> で取得
      </div>
      <div class="fd-toggle-row">
        <label>iNaturalist を使用</label>
        <div class="fd-toggle">
          <input type="checkbox" id="bsheet-inat" ${useINat ? 'checked' : ''}>
          <span class="fd-toggle-slider"></span>
        </div>
      </div>
    </div>

    <div class="bsheet-section">
      <div class="bsheet-section-title">データ管理</div>
      <div class="bsheet-action-row">
        <button class="secondary-btn" id="bsheet-import-btn">
          <span class="material-icons">cloud_upload</span> 復元
        </button>
        <button class="secondary-btn fd-danger-btn" id="bsheet-clear-btn">
          <span class="material-icons">delete_forever</span> 全削除
        </button>
      </div>
      <input type="file" id="bsheet-import-input" accept=".json" hidden>
    </div>

    <button class="primary-btn" style="background: var(--forest-primary); border-radius:10px;" id="bsheet-save-settings">
      <span class="material-icons">save</span> 設定を保存
    </button>
  `;

  // Save
  container.querySelector('#bsheet-save-settings').addEventListener('click', () => {
    localStorage.setItem('forestscope-plantnet-key', container.querySelector('#bsheet-plantnet-key').value.trim());
    localStorage.setItem('forestscope-use-inaturalist', container.querySelector('#bsheet-inat').checked ? 'true' : 'false');
    showToast('success', '設定を保存しました');
    closeBsheet();
  });

  // Import
  container.querySelector('#bsheet-import-btn').addEventListener('click', () => {
    container.querySelector('#bsheet-import-input').click();
  });
  container.querySelector('#bsheet-import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Invalid format');
      for (const obs of data) { await saveObservation(obs); }
      observationMarkers.forEach(m => earthGroup.remove(m.obj));
      observationMarkers.length = 0;
      await loadObservationsToGlobe();
      showToast('success', `${data.length} 件のデータを復元しました`);
    } catch (err) {
      showToast('error', '復元に失敗しました');
    }
  });

  // Clear
  container.querySelector('#bsheet-clear-btn').addEventListener('click', async () => {
    if (!confirm('すべての観測データを削除しますか？')) return;
    await clearAllObservations();
    observationMarkers.forEach(m => earthGroup.remove(m.obj));
    observationMarkers.length = 0;
    state.observations = [];
    showToast('info', 'すべてのデータを削除しました');
    closeBsheet();
  });
}

// Initialize bottom nav on page load
document.addEventListener('DOMContentLoaded', () => {
  initBottomNav();
});
