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
};

// ============================================================
// THREE.JS GLOBALS
// ============================================================
let scene, camera, renderer, labelRenderer, controls;
let earthGroup, earth, clouds, atmosphere, stars;
let treeTrunks, treeCrowns;
let overlayMesh;
let clock;
const labels = [];
const TOTAL_TREES = FOREST_CLUSTERS.reduce((s, c) => s + c.count, 0);

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
  createForestTrees();
  createRegionLabels();
  renderRegions();
  renderSpecies();
  renderSatelliteCatalog();
  bindEvents();
  animate();
});

// ============================================================
// SCENE SETUP
// ============================================================
function initScene() {
  const container = $('#globe-container');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000008);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
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

  // Lights
  const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
  sunLight.position.set(5, 3, 5);
  scene.add(sunLight);

  const ambientLight = new THREE.AmbientLight(0x222244, 0.8);
  scene.add(ambientLight);

  const rimLight = new THREE.DirectionalLight(0x4488ff, 0.3);
  rimLight.position.set(-3, -1, -3);
  scene.add(rimLight);

  // Controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 1.15;
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

  // Rotate clouds slowly
  if (clouds) clouds.rotation.y += delta * 0.02;

  // Twinkle stars
  if (stars) stars.rotation.y += delta * 0.005;

  // Update detail levels based on camera distance
  const dist = camera.position.length();
  updateTreeVisibility(dist);
  updateLabelVisibility(dist);

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

// ============================================================
// LOD — TREE VISIBILITY
// ============================================================
function updateTreeVisibility(dist) {
  if (!treeCrowns || !treeTrunks) return;
  // Trees become visible as you zoom in
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

  // Upload toggle
  $('#upload-toggle-btn').addEventListener('click', () => {
    const panel = $('#satellite-panel');
    if (panel.classList.contains('hidden')) panel.classList.remove('hidden');
    $('#upload-toggle-btn').classList.toggle('active');
    const dropzone = $('#upload-dropzone');
    if (dropzone) { dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' }); dropzone.classList.add('dragover'); setTimeout(() => dropzone.classList.remove('dragover'), 800); }
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
    if (e.key === 'Escape') { $('#layer-modal').classList.add('hidden'); cancelPreview(); }
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
}
