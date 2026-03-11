/* ============================================================
   ForestScope — 森林デジタルツイン・ダッシュボード
   Main Application Logic
   ============================================================ */

// ============================================================
// DATA — Satellite Catalog
// ============================================================
const SATELLITE_DATA = [
  {
    id: 'sentinel2-rgb',
    name: 'Sentinel-2 RGB',
    category: 'optical',
    description: 'ESAの光学衛星。10m解像度のRGB真カラー画像で、森林被覆や土地利用の変化を可視化。',
    resolution: '10m',
    source: 'ESA Copernicus',
    sourceUrl: 'https://scihub.copernicus.eu/',
    free: true,
    color: [34, 139, 34]
  },
  {
    id: 'landsat8-oli',
    name: 'Landsat 8 OLI',
    category: 'optical',
    description: 'NASA/USGSの高精度光学センサー。30m解像度で森林の広域モニタリングに最適。',
    resolution: '30m',
    source: 'USGS EarthExplorer',
    sourceUrl: 'https://earthexplorer.usgs.gov/',
    free: true,
    color: [70, 130, 180]
  },
  {
    id: 'modis-terra',
    name: 'MODIS Terra',
    category: 'optical',
    description: 'NASAのTerra衛星搭載。250m~1km解像度で全球を毎日観測。火災検知にも利用。',
    resolution: '250m–1km',
    source: 'NASA Worldview',
    sourceUrl: 'https://worldview.earthdata.nasa.gov/',
    free: true,
    color: [255, 140, 0]
  },
  {
    id: 'ndvi-sentinel',
    name: 'NDVI (Sentinel-2)',
    category: 'vegetation',
    description: '正規化植生指数。植物の活性度を赤〜緑のカラースケールでマッピング。森林の健康状態を即座に把握。',
    resolution: '10m',
    source: 'Google Earth Engine',
    sourceUrl: 'https://earthengine.google.com/',
    free: true,
    color: [0, 180, 0]
  },
  {
    id: 'evi-modis',
    name: 'EVI (MODIS)',
    category: 'vegetation',
    description: '強化植生指数。NDVIより大気補正に優れ、密生林のバイオマス推定に高精度。',
    resolution: '250m',
    source: 'NASA LP DAAC',
    sourceUrl: 'https://lpdaac.usgs.gov/',
    free: true,
    color: [0, 128, 64]
  },
  {
    id: 'lai-sentinel',
    name: 'LAI (葉面積指数)',
    category: 'vegetation',
    description: '単位面積あたりの葉面積を推定。森林の光合成能力やCO₂吸収量の推定に不可欠。',
    resolution: '20m',
    source: 'Copernicus Global Land',
    sourceUrl: 'https://land.copernicus.eu/',
    free: true,
    color: [50, 205, 50]
  },
  {
    id: 'sar-sentinel1',
    name: 'Sentinel-1 SAR',
    category: 'radar',
    description: 'ESAのCバンドSAR。雲を透過し、全天候型で森林構造やバイオマスの変動を検出。',
    resolution: '10m',
    source: 'ESA Copernicus',
    sourceUrl: 'https://scihub.copernicus.eu/',
    free: true,
    color: [100, 100, 180]
  },
  {
    id: 'alos2-palsar',
    name: 'ALOS-2 PALSAR-2',
    category: 'radar',
    description: 'JAXAのLバンドSAR。森林のバイオマスを高精度に推定。違法伐採の監視にも活用。',
    resolution: '10m',
    source: 'JAXA Earth API',
    sourceUrl: 'https://www.eorc.jaxa.jp/',
    free: true,
    color: [70, 70, 150]
  },
  {
    id: 'srtm-dem',
    name: 'SRTM DEM (標高)',
    category: 'terrain',
    description: 'NASAのシャトルレーダーで取得した全球標高データ。傾斜や流域解析で林業計画を支援。',
    resolution: '30m',
    source: 'USGS',
    sourceUrl: 'https://www.usgs.gov/centers/eros',
    free: true,
    color: [139, 90, 43]
  },
  {
    id: 'slope-terrain',
    name: '傾斜角マップ',
    category: 'terrain',
    description: 'DEMから算出した傾斜角の可視化。急傾斜地の林業機械到達性や崩壊リスク評価に使用。',
    resolution: '30m',
    source: 'Google Earth Engine',
    sourceUrl: 'https://earthengine.google.com/',
    free: true,
    color: [160, 82, 45]
  },
  {
    id: 'gfc-hansen',
    name: 'Global Forest Change',
    category: 'other',
    description: 'Hansen et al.の森林減少・増加マップ。2000年〜現在までの年次森林変動を可視化。',
    resolution: '30m',
    source: 'University of Maryland',
    sourceUrl: 'https://glad.umd.edu/dataset/gfw',
    free: true,
    color: [220, 20, 60]
  },
  {
    id: 'viirs-fire',
    name: 'VIIRS Active Fire',
    category: 'other',
    description: '準リアルタイムの熱異常検知。森林火災の早期発見と被害範囲の推定に不可欠。',
    resolution: '375m',
    source: 'NASA FIRMS',
    sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/',
    free: true,
    color: [255, 69, 0]
  }
];

// ============================================================
// DATA — Regional Forest Data
// ============================================================
const REGIONS_DATA = [
  { flag: '🌎', name: '南アメリカ', trees: '392B', area: '842M ha', pct: 82 },
  { flag: '🌍', name: 'アフリカ', trees: '379B', area: '636M ha', pct: 75 },
  { flag: '🌏', name: 'アジア', trees: '400B', area: '593M ha', pct: 72 },
  { flag: '🌎', name: '北アメリカ', trees: '318B', area: '753M ha', pct: 70 },
  { flag: '🌍', name: 'ヨーロッパ', trees: '160B', area: '1,017M ha', pct: 65 },
  { flag: '🌏', name: 'オセアニア', trees: '53B', area: '174M ha', pct: 40 },
];

// ============================================================
// DATA — Tree Species
// ============================================================
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

// ============================================================
// STATE
// ============================================================
let state = {
  is3D: false,
  currentPreview: null,
  activeLayers: [],
  uploadedFiles: [],
  mapRotation: 0,
  mapTilt: 0,
  mapZoom: 3,
  mapCenter: { lat: 35, lng: 137 },
  isDragging: false,
  lastMouse: { x: 0, y: 0 },
};

// ============================================================
// DOM References
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  initMiniEarth();
  renderRegions();
  renderSpecies();
  renderSatelliteCatalog();
  bindEvents();
  animateForestDots();
});

// ============================================================
// MAP — Canvas rendering (simulated satellite view)
// ============================================================
function initMap() {
  const canvas = $('#map-canvas');
  const ctx = canvas.getContext('2d');
  resizeCanvas(canvas);
  window.addEventListener('resize', () => {
    resizeCanvas(canvas);
    drawMap(ctx, canvas);
  });
  drawMap(ctx, canvas);

  // Mouse interaction for map dragging
  canvas.addEventListener('mousedown', (e) => {
    state.isDragging = true;
    state.lastMouse = { x: e.clientX, y: e.clientY };
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', (e) => {
    if (!state.isDragging) return;
    const dx = e.clientX - state.lastMouse.x;
    const dy = e.clientY - state.lastMouse.y;
    state.mapCenter.lng -= dx * 0.15;
    state.mapCenter.lat += dy * 0.15;
    state.lastMouse = { x: e.clientX, y: e.clientY };
    if (state.is3D) {
      state.mapRotation += dx * 0.2;
    }
    drawMap(ctx, canvas);
  });
  window.addEventListener('mouseup', () => {
    state.isDragging = false;
    canvas.style.cursor = 'grab';
  });
  canvas.style.cursor = 'grab';

  // Mouse wheel zoom
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    state.mapZoom = Math.max(1, Math.min(20, state.mapZoom + (e.deltaY > 0 ? -0.3 : 0.3)));
    drawMap(ctx, canvas);
  }, { passive: false });
}

function resizeCanvas(canvas) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function drawMap(ctx, canvas) {
  const w = canvas.width;
  const h = canvas.height;

  // Deep ocean background
  const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.8);
  bgGrad.addColorStop(0, '#0d2137');
  bgGrad.addColorStop(0.5, '#142d4c');
  bgGrad.addColorStop(1, '#0a1628');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, w, h);

  // Save context for 3D tilt
  ctx.save();
  if (state.is3D) {
    ctx.translate(w / 2, h / 2);
    ctx.transform(1, 0, 0, 0.7, 0, 0); // perspective
    ctx.translate(-w / 2, -h / 2);
  }

  // Draw continental shapes (simplified)
  drawContinents(ctx, w, h);

  // Draw forest density heatmap
  drawForestHeatmap(ctx, w, h);

  // Draw grid lines
  drawGridLines(ctx, w, h);

  ctx.restore();

  // Draw forest dots (data points)
  drawDataPoints(ctx, w, h);

  // Cloud layer (subtle)
  drawClouds(ctx, w, h);
}

function drawContinents(ctx, w, h) {
  const ox = -state.mapCenter.lng * state.mapZoom * 0.5;
  const oy = state.mapCenter.lat * state.mapZoom * 0.5;
  const zoom = state.mapZoom;

  // Continent definitions (simplified polygons in screen %)
  const continents = [
    // North America
    { points: [[0.15, 0.15], [0.35, 0.12], [0.38, 0.25], [0.32, 0.38], [0.20, 0.42], [0.12, 0.30]], color: '#1a3a1a' },
    // South America
    { points: [[0.22, 0.48], [0.30, 0.45], [0.33, 0.55], [0.30, 0.72], [0.24, 0.78], [0.20, 0.65]], color: '#0f3a0f' },
    // Africa
    { points: [[0.45, 0.30], [0.55, 0.28], [0.58, 0.40], [0.55, 0.62], [0.48, 0.65], [0.43, 0.50]], color: '#1a3a15' },
    // Europe
    { points: [[0.44, 0.12], [0.56, 0.10], [0.58, 0.22], [0.52, 0.30], [0.44, 0.28]], color: '#1f3f1f' },
    // Asia
    { points: [[0.56, 0.10], [0.82, 0.12], [0.85, 0.30], [0.78, 0.42], [0.60, 0.38], [0.58, 0.22]], color: '#173517' },
    // Japan
    { points: [[0.82, 0.26], [0.84, 0.24], [0.85, 0.30], [0.83, 0.34], [0.81, 0.30]], color: '#1a4a1a' },
    // Southeast Asia
    { points: [[0.72, 0.40], [0.80, 0.42], [0.82, 0.52], [0.76, 0.56], [0.70, 0.48]], color: '#143514' },
    // Australia
    { points: [[0.78, 0.58], [0.90, 0.56], [0.92, 0.68], [0.85, 0.74], [0.76, 0.68]], color: '#2a3a18' },
  ];

  continents.forEach(c => {
    ctx.beginPath();
    c.points.forEach(([px, py], i) => {
      const x = (px * w + ox) % w;
      const y = py * h + oy;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    // Fill with gradient
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, c.color);
    grad.addColorStop(1, lightenColor(c.color, 15));
    ctx.fillStyle = grad;
    ctx.fill();

    // Subtle border
    ctx.strokeStyle = 'rgba(76, 175, 80, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

function drawForestHeatmap(ctx, w, h) {
  // Forest density clusters
  const clusters = [
    { x: 0.25, y: 0.55, r: 0.08, intensity: 0.7 }, // Amazon
    { x: 0.52, y: 0.42, r: 0.06, intensity: 0.5 }, // Congo
    { x: 0.72, y: 0.35, r: 0.07, intensity: 0.6 }, // SE Asia
    { x: 0.60, y: 0.16, r: 0.08, intensity: 0.5 }, // Russia/Taiga
    { x: 0.82, y: 0.28, r: 0.03, intensity: 0.6 }, // Japan
    { x: 0.30, y: 0.25, r: 0.04, intensity: 0.4 }, // North America
    { x: 0.48, y: 0.20, r: 0.04, intensity: 0.4 }, // Europe
  ];

  clusters.forEach(c => {
    const grad = ctx.createRadialGradient(
      c.x * w, c.y * h, 0,
      c.x * w, c.y * h, c.r * w
    );
    grad.addColorStop(0, `rgba(76, 175, 80, ${c.intensity * 0.5})`);
    grad.addColorStop(0.5, `rgba(56, 142, 60, ${c.intensity * 0.25})`);
    grad.addColorStop(1, 'rgba(56, 142, 60, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

function drawGridLines(ctx, w, h) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 0.5;

  // Latitude lines
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, (i / 8) * h);
    ctx.lineTo(w, (i / 8) * h);
    ctx.stroke();
  }
  // Longitude lines
  for (let i = 1; i < 12; i++) {
    ctx.beginPath();
    ctx.moveTo((i / 12) * w, 0);
    ctx.lineTo((i / 12) * w, h);
    ctx.stroke();
  }
}

function drawDataPoints(ctx, w, h) {
  // Animated forest data points
  const time = Date.now() * 0.001;
  const points = [
    { x: 0.25, y: 0.55, label: 'アマゾン', size: 14 },
    { x: 0.52, y: 0.42, label: 'コンゴ盆地', size: 11 },
    { x: 0.72, y: 0.35, label: '東南アジア', size: 10 },
    { x: 0.60, y: 0.16, label: 'タイガ', size: 13 },
    { x: 0.82, y: 0.28, label: '日本', size: 7 },
    { x: 0.30, y: 0.25, label: '北米東部', size: 9 },
    { x: 0.48, y: 0.22, label: '北欧', size: 8 },
  ];

  points.forEach((p, i) => {
    const px = p.x * w;
    const py = p.y * h;
    const pulse = Math.sin(time + i * 0.8) * 0.3 + 0.7;

    // Glow
    const glow = ctx.createRadialGradient(px, py, 0, px, py, p.size + 8);
    glow.addColorStop(0, `rgba(76, 175, 80, ${0.4 * pulse})`);
    glow.addColorStop(1, 'rgba(76, 175, 80, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(px - 25, py - 25, 50, 50);

    // Dot
    ctx.beginPath();
    ctx.arc(px, py, 3 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(129, 199, 132, ${0.8 + pulse * 0.2})`;
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '11px "Noto Sans JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.label, px, py - 12);
  });
}

function drawClouds(ctx, w, h) {
  const time = Date.now() * 0.0001;
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 0.22 + time * 0.3) % 1.2 - 0.1) * w;
    const cy = (0.2 + i * 0.15) * h;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.12);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.02)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

function lightenColor(hex, amount) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
  const b = Math.min(255, (num & 0x0000FF) + amount);
  return `rgb(${r},${g},${b})`;
}

// ============================================================
// MAP ANIMATION LOOP
// ============================================================
function animateForestDots() {
  const canvas = $('#map-canvas');
  const ctx = canvas.getContext('2d');
  function loop() {
    drawMap(ctx, canvas);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

// ============================================================
// MINI EARTH
// ============================================================
function initMiniEarth() {
  const canvas = $('#mini-earth-canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  drawMiniEarth(ctx, canvas);
}

function drawMiniEarth(ctx, canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) / 2 - 2;

  // Earth circle
  const earthGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r);
  earthGrad.addColorStop(0, '#1a6b3c');
  earthGrad.addColorStop(0.3, '#14523b');
  earthGrad.addColorStop(0.6, '#0d3b5e');
  earthGrad.addColorStop(1, '#091e3a');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = earthGrad;
  ctx.fill();

  // Simple land masses
  ctx.fillStyle = 'rgba(34, 139, 34, 0.5)';
  // Asia-ish
  ctx.beginPath();
  ctx.ellipse(cx + 8, cy - 8, 18, 14, 0.3, 0, Math.PI * 2);
  ctx.fill();
  // Africa-ish
  ctx.beginPath();
  ctx.ellipse(cx - 8, cy + 8, 8, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Atmosphere glow
  const atmoGrad = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r);
  atmoGrad.addColorStop(0, 'rgba(100, 200, 255, 0)');
  atmoGrad.addColorStop(1, 'rgba(100, 200, 255, 0.2)');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = atmoGrad;
  ctx.fill();
}

// ============================================================
// RENDER — Region List
// ============================================================
function renderRegions() {
  const container = $('#region-list');
  container.innerHTML = REGIONS_DATA.map(r => `
    <div class="region-item" data-region="${r.name}">
      <span class="region-flag">${r.flag}</span>
      <div class="region-info">
        <div class="region-name">${r.name}</div>
        <div class="region-stats">${r.trees} 本 · ${r.area}</div>
      </div>
      <div class="region-bar">
        <div class="region-bar-fill" style="width: 0%;" data-target="${r.pct}"></div>
      </div>
    </div>
  `).join('');

  // Animate bars
  requestAnimationFrame(() => {
    setTimeout(() => {
      $$('.region-bar-fill').forEach(bar => {
        bar.style.width = bar.dataset.target + '%';
      });
    }, 100);
  });
}

// ============================================================
// RENDER — Species List
// ============================================================
function renderSpecies() {
  const container = $('#species-list');
  container.innerHTML = SPECIES_DATA.map(s => `
    <div class="species-item">
      <div class="species-icon" style="background: ${s.color}22;">
        <span>${s.emoji}</span>
      </div>
      <div class="species-info">
        <div class="species-name">${s.name}</div>
        <div class="species-count">${s.count}</div>
      </div>
      <div class="species-pct">${s.pct}</div>
    </div>
  `).join('');
}

// ============================================================
// RENDER — Satellite Catalog
// ============================================================
function renderSatelliteCatalog(filter = 'all') {
  const container = $('#satellite-catalog');
  const filtered = filter === 'all'
    ? SATELLITE_DATA
    : SATELLITE_DATA.filter(s => s.category === filter);

  container.innerHTML = filtered.map(s => `
    <div class="satellite-card" data-id="${s.id}">
      <div class="satellite-thumb">
        <canvas data-sat-id="${s.id}"></canvas>
        <span class="satellite-badge${s.free ? ' free' : ''}">${s.free ? '無料' : '有料'}</span>
      </div>
      <div class="satellite-card-body">
        <div class="satellite-card-title">${s.name}</div>
        <div class="satellite-card-desc">${s.description}</div>
        <div class="satellite-card-meta">
          <a class="satellite-source-link" href="${s.sourceUrl}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
            <span class="material-icons">open_in_new</span>
            ${s.source}
          </a>
          <span class="satellite-resolution">${s.resolution}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Draw thumbnail canvases
  filtered.forEach(s => {
    const thumbCanvas = document.querySelector(`canvas[data-sat-id="${s.id}"]`);
    if (thumbCanvas) drawSatelliteThumb(thumbCanvas, s);
  });

  // Bind click
  $$('.satellite-card').forEach(card => {
    card.addEventListener('click', () => {
      selectSatelliteForPreview(card.dataset.id);
    });
  });
}

function drawSatelliteThumb(canvas, data) {
  canvas.width = 520;
  canvas.height = 260;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const [r, g, b] = data.color;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.7)`);
  grad.addColorStop(0.5, `rgba(${r * 0.5}, ${g * 0.5}, ${b * 0.5}, 0.9)`);
  grad.addColorStop(1, `rgba(${r * 0.3}, ${g * 0.3}, ${b * 0.3}, 1)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Noise-like texture
  for (let i = 0; i < 200; i++) {
    const nx = Math.random() * w;
    const ny = Math.random() * h;
    const nr = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r + 40}, ${g + 40}, ${b + 40}, ${Math.random() * 0.3})`;
    ctx.fill();
  }

  // Terrain-like shapes
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    const sx = Math.random() * w;
    const sy = Math.random() * h;
    ctx.ellipse(sx, sy, Math.random() * 80 + 20, Math.random() * 40 + 10, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r + 20}, ${g + 20}, ${b + 20}, ${Math.random() * 0.2 + 0.1})`;
    ctx.fill();
  }
}

// ============================================================
// SATELLITE PREVIEW FLOW
// ============================================================
function selectSatelliteForPreview(satId) {
  const satData = SATELLITE_DATA.find(s => s.id === satId);
  if (!satData) return;

  state.currentPreview = satData;

  // Update preview bar
  $('#preview-name').textContent = satData.name;
  $('#preview-desc').textContent = satData.description;
  $('#preview-bar').classList.remove('hidden');

  // Show overlay on map canvas
  const overlayCanvas = $('#satellite-overlay-canvas');
  overlayCanvas.width = window.innerWidth;
  overlayCanvas.height = window.innerHeight;
  drawSatelliteOverlay(overlayCanvas, satData);
  overlayCanvas.classList.add('visible');

  // Highlight card in modal
  $$('.satellite-card').forEach(c => c.classList.remove('selected'));
  const card = document.querySelector(`.satellite-card[data-id="${satId}"]`);
  if (card) card.classList.add('selected');

  // Close modal
  $('#layer-modal').classList.add('hidden');

  showToast('info', `${satData.name} のプレビューを表示中`);
}

function drawSatelliteOverlay(canvas, satData) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const [r, g, b] = satData.color;

  ctx.clearRect(0, 0, w, h);

  // Semi-transparent overlay simulating satellite data
  for (let i = 0; i < 30; i++) {
    const cx = Math.random() * w;
    const cy = Math.random() * h;
    const cr = Math.random() * 120 + 40;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr);
    grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${Math.random() * 0.3 + 0.1})`);
    grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

// ============================================================
// LAYER APPLICATION
// ============================================================
function applyCurrentPreview() {
  if (!state.currentPreview) return;

  const layer = { ...state.currentPreview, opacity: parseInt($('#preview-opacity').value) };
  state.activeLayers.push(layer);
  renderActiveLayers();

  // Keep overlay visible
  const overlayCanvas = $('#satellite-overlay-canvas');
  overlayCanvas.style.opacity = layer.opacity / 100;

  // Reset preview
  state.currentPreview = null;
  $('#preview-bar').classList.add('hidden');

  showToast('success', `${layer.name} をマップに適用しました`);
}

function cancelPreview() {
  state.currentPreview = null;
  $('#preview-bar').classList.add('hidden');
  const overlayCanvas = $('#satellite-overlay-canvas');
  overlayCanvas.classList.remove('visible');
}

function renderActiveLayers() {
  const container = $('#active-layers');

  if (state.activeLayers.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="material-icons">layer_clear</span>
        <p>適用中のレイヤーはありません</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.activeLayers.map((l, i) => `
    <div class="active-layer-item" data-index="${i}">
      <div class="active-layer-thumb">
        <canvas data-active-thumb="${i}"></canvas>
      </div>
      <div class="active-layer-info">
        <div class="active-layer-name">${l.name}</div>
        <a class="active-layer-source" href="${l.sourceUrl}" target="_blank" rel="noopener">${l.source}</a>
        <div class="layer-opacity-slider">
          <input type="range" min="0" max="100" value="${l.opacity}" data-layer-idx="${i}">
        </div>
      </div>
      <div class="active-layer-actions">
        <button class="toggle-visibility-btn" data-index="${i}" title="表示切替">
          <span class="material-icons">visibility</span>
        </button>
        <button class="remove-layer-btn" data-index="${i}" title="削除">
          <span class="material-icons">delete_outline</span>
        </button>
      </div>
    </div>
  `).join('');

  // Draw small thumbnails
  state.activeLayers.forEach((l, i) => {
    const canvas = document.querySelector(`canvas[data-active-thumb="${i}"]`);
    if (canvas) {
      canvas.width = 72;
      canvas.height = 72;
      const ctx = canvas.getContext('2d');
      const [r, g, b] = l.color;
      const grad = ctx.createRadialGradient(36, 36, 0, 36, 36, 36);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.8)`);
      grad.addColorStop(1, `rgba(${r * 0.5}, ${g * 0.5}, ${b * 0.5}, 1)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 72, 72);
    }
  });

  // Bind opacity sliders
  $$('.layer-opacity-slider input').forEach(slider => {
    slider.addEventListener('input', (e) => {
      const idx = parseInt(e.target.dataset.layerIdx);
      state.activeLayers[idx].opacity = parseInt(e.target.value);
      const overlayCanvas = $('#satellite-overlay-canvas');
      overlayCanvas.style.opacity = e.target.value / 100;
    });
  });

  // Bind remove
  $$('.remove-layer-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const name = state.activeLayers[idx].name;
      state.activeLayers.splice(idx, 1);
      renderActiveLayers();
      if (state.activeLayers.length === 0) {
        const overlayCanvas = $('#satellite-overlay-canvas');
        overlayCanvas.classList.remove('visible');
        overlayCanvas.style.opacity = 0;
      }
      showToast('info', `${name} を削除しました`);
    });
  });

  // Bind visibility toggle
  $$('.toggle-visibility-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const icon = btn.querySelector('.material-icons');
      if (icon.textContent === 'visibility') {
        icon.textContent = 'visibility_off';
        const overlayCanvas = $('#satellite-overlay-canvas');
        overlayCanvas.style.opacity = 0;
      } else {
        icon.textContent = 'visibility';
        const idx = parseInt(btn.dataset.index);
        const overlayCanvas = $('#satellite-overlay-canvas');
        overlayCanvas.style.opacity = state.activeLayers[idx].opacity / 100;
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

      state.uploadedFiles.push({
        name: file.name,
        size: formatFileSize(file.size),
        type: file.name.split('.').pop().toUpperCase(),
      });

      if (i === fileArr.length - 1) {
        setTimeout(() => {
          progressEl.classList.add('hidden');
          progressFill.style.width = '0%';
          renderUploadedFiles();
          showToast('success', `${fileArr.length} 件のファイルを取り込みました`);
        }, 500);
      }
    }, (i + 1) * 800);
  });
}

function renderUploadedFiles() {
  const container = $('#uploaded-files');
  container.innerHTML = state.uploadedFiles.map((f, i) => `
    <div class="uploaded-file-item" data-index="${i}">
      <span class="material-icons">description</span>
      <div class="uploaded-file-info">
        <div class="uploaded-file-name">${f.name}</div>
        <div class="uploaded-file-meta">${f.type} · ${f.size}</div>
      </div>
      <button class="uploaded-file-remove" data-index="${i}">
        <span class="material-icons">close</span>
      </button>
    </div>
  `).join('');

  $$('.uploaded-file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      state.uploadedFiles.splice(idx, 1);
      renderUploadedFiles();
    });
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
// 3D MODE
// ============================================================
function toggle3D() {
  state.is3D = !state.is3D;
  const btn = $('#toggle-3d-btn');
  btn.classList.toggle('active', state.is3D);

  // Show/hide 3D indicator
  let indicator = $('.mode-3d-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.className = 'mode-3d-indicator';
    indicator.innerHTML = '<span class="material-icons">3d_rotation</span> 3D ビュー';
    document.body.appendChild(indicator);
  }
  indicator.classList.toggle('visible', state.is3D);

  showToast('info', state.is3D ? '3D表示に切り替えました' : '2D表示に切り替えました');
}

// ============================================================
// EVENT BINDINGS
// ============================================================
function bindEvents() {
  // Search bar
  $('#search-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) showToast('info', `"${q}" を検索中...`);
    }
  });

  // Menu button — toggle forest panel
  $('#menu-btn').addEventListener('click', () => {
    $('#forest-panel').classList.toggle('hidden');
  });

  // Panel close buttons
  $$('.panel-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const panelId = btn.dataset.panel;
      $(`#${panelId}`).classList.add('hidden');
      // Remove active state from toolbar buttons
      if (panelId === 'satellite-panel') {
        $('#satellite-panel-toggle').classList.remove('active');
      }
    });
  });

  // Satellite panel toggle
  $('#satellite-panel-toggle').addEventListener('click', () => {
    const panel = $('#satellite-panel');
    const btn = $('#satellite-panel-toggle');
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    btn.classList.toggle('active', isHidden);

    // Close upload panel if open
    if (isHidden) {
      const uploadPanel = $('#upload-panel');
      if (uploadPanel) uploadPanel.classList.add('hidden');
      $('#upload-toggle-btn').classList.remove('active');
    }
  });

  // Upload toggle
  $('#upload-toggle-btn').addEventListener('click', () => {
    const panel = $('#satellite-panel');
    const btn = $('#upload-toggle-btn');
    const isHidden = panel.classList.contains('hidden');
    // Open satellite panel with focus on upload
    if (isHidden) {
      panel.classList.remove('hidden');
    }
    btn.classList.toggle('active');
    // Scroll to upload area
    const dropzone = $('#upload-dropzone');
    if (dropzone) {
      dropzone.scrollIntoView({ behavior: 'smooth', block: 'center' });
      dropzone.classList.add('dragover');
      setTimeout(() => dropzone.classList.remove('dragover'), 800);
    }
  });

  // Layer toggle button
  $('#layers-toggle-btn').addEventListener('click', () => {
    const panel = $('#satellite-panel');
    const isHidden = panel.classList.contains('hidden');
    panel.classList.toggle('hidden');
    if (isHidden) {
      $('#satellite-panel-toggle').classList.add('active');
    }
  });

  // 3D toggle
  $('#toggle-3d-btn').addEventListener('click', toggle3D);

  // Zoom buttons
  $('#zoom-in-btn').addEventListener('click', () => {
    state.mapZoom = Math.min(20, state.mapZoom + 1);
  });
  $('#zoom-out-btn').addEventListener('click', () => {
    state.mapZoom = Math.max(1, state.mapZoom - 1);
  });

  // Compass
  $('#compass-btn').addEventListener('click', () => {
    state.mapRotation = 0;
    state.mapTilt = 0;
    showToast('info', '方位をリセットしました');
  });

  // My location
  $('#my-location-btn').addEventListener('click', () => {
    state.mapCenter = { lat: 35, lng: 137 };
    showToast('info', '現在地に移動しました');
  });

  // Add Layer button → Open modal
  $('#add-layer-btn').addEventListener('click', () => {
    $('#layer-modal').classList.remove('hidden');
  });

  // Modal close
  $('#modal-close-btn').addEventListener('click', () => {
    $('#layer-modal').classList.add('hidden');
  });

  // Modal overlay click to close
  $('#layer-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      $('#layer-modal').classList.add('hidden');
    }
  });

  // Modal tab filters
  $$('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
      $$('.tab-btn').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderSatelliteCatalog(tab.dataset.category);
    });
  });

  // Preview bar controls
  $('#apply-layer-btn').addEventListener('click', applyCurrentPreview);
  $('#cancel-preview-btn').addEventListener('click', cancelPreview);

  // Opacity slider
  $('#preview-opacity').addEventListener('input', (e) => {
    const val = e.target.value;
    $('#opacity-value').textContent = val + '%';
    const overlayCanvas = $('#satellite-overlay-canvas');
    overlayCanvas.style.opacity = val / 100;
  });

  // Upload dropzone
  const dropzone = $('#upload-dropzone');
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    handleFileUpload(e.dataTransfer.files);
  });
  dropzone.addEventListener('click', () => {
    $('#file-input').click();
  });
  $('#file-input').addEventListener('change', (e) => {
    handleFileUpload(e.target.files);
  });
  $('#browse-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#file-input').click();
  });

  // Mini earth click — reset view
  $('#mini-earth').addEventListener('click', () => {
    state.mapZoom = 2;
    state.mapCenter = { lat: 20, lng: 0 };
    state.is3D = false;
    $('#toggle-3d-btn').classList.remove('active');
    const indicator = $('.mode-3d-indicator');
    if (indicator) indicator.classList.remove('visible');
    showToast('info', 'グローバルビューに切り替えました');
  });

  // Region click — fly to region
  document.addEventListener('click', (e) => {
    const regionItem = e.target.closest('.region-item');
    if (regionItem) {
      const region = regionItem.dataset.region;
      showToast('info', `${region} エリアにフォーカス`);
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      $('#layer-modal').classList.add('hidden');
      cancelPreview();
    }
  });
}
