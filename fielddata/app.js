/* ============================================================
   ForestScope — 現場データモード
   CesiumJS 3D Globe + Field Data Collection
   ============================================================ */

// ============================================================
// CONSTANTS & DATA
// ============================================================
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
  { name: 'カラマツ (Larix)', count: '約 160B 本', pct: '5.3%', emoji: '🌲', color: '#81c784' },
  { name: 'スギ (Cryptomeria)', count: '約 12B 本', pct: '0.4%', emoji: '🌲', color: '#a5d6a7' },
];

const SATELLITE_DATA = [
  { id: 'sentinel2-rgb', name: 'Sentinel-2 RGB', category: 'optical', description: 'ESAの光学衛星。10m解像度。', resolution: '10m', source: 'ESA', sourceUrl: 'https://scihub.copernicus.eu/', free: true, color: [34,139,34] },
  { id: 'landsat8-oli', name: 'Landsat 8 OLI', category: 'optical', description: 'NASA/USGSの高精度光学。30m解像度。', resolution: '30m', source: 'USGS', sourceUrl: 'https://earthexplorer.usgs.gov/', free: true, color: [70,130,180] },
  { id: 'ndvi-sentinel', name: 'NDVI (Sentinel-2)', category: 'vegetation', description: '正規化植生指数。植物の活性度を可視化。', resolution: '10m', source: 'GEE', sourceUrl: 'https://earthengine.google.com/', free: true, color: [0,180,0] },
  { id: 'viirs-fire', name: 'VIIRS Active Fire', category: 'other', description: '準リアルタイムの熱異常検知。', resolution: '375m', source: 'NASA FIRMS', sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/', free: true, color: [255,69,0] },
];

// ============================================================
// STATE
// ============================================================
let state = {
  is3D: true,
  observations: [],
  fieldDataPanelOpen: false,
  locationPickerActive: false,
  pendingLocationObservation: null,
};

// ============================================================
// CesiumJS GLOBALS
// ============================================================
let viewer;
let observationEntities = [];

// ============================================================
// DOM HELPERS
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initViewer();
  renderRegions();
  renderSpecies();
  renderSatelliteCatalog();
  bindEvents();
  initFieldDataDB().then(() => loadObservationsToGlobe());
  showPrivacyNotice();
  setupOfflineHandling();
  initBottomNav();
});

// ============================================================
// CesiumJS VIEWER SETUP
// ============================================================
function initViewer() {
  const container = $('#globe-container');

  // Cesium Ion token — default for 3D terrain (user can override in settings)
  const DEFAULT_ION_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxMTkwOGNkMy0wMGUzLTQwZTAtOTZhOS00M2M4YWMzMjUwYzgiLCJpZCI6NDE2OTUxLCJpYXQiOjE3NzU5NTAyNDV9.xnMVNYDmvJSObdgunY9268cjULxA5D4XZmPaJ1N7AX4';
  const ionToken = localStorage.getItem('forestscope-cesium-token') || DEFAULT_ION_TOKEN;
  Cesium.Ion.defaultAccessToken = ionToken;

  // Create Viewer with ESRI World Imagery
  viewer = new Cesium.Viewer(container, {
    baseLayer: Cesium.ImageryLayer.fromProviderAsync(
      Cesium.ArcGisMapServerImageryProvider.fromUrl(
        'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
      )
    ),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: false,
    timeline: false,
    animation: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    infoBox: false,
    fullscreenButton: false,
    selectionIndicator: false,
    shadows: false,
    requestRenderMode: false,
    maximumRenderTimeChange: Infinity,
  });

  // Hide default Cesium credits widget (we have our own attribution)
  viewer.cesiumWidget.creditContainer.style.display = 'none';

  // Always enable 3D terrain (Cesium World Terrain)
  viewer.scene.setTerrain(Cesium.Terrain.fromWorldTerrain());

  // Set initial camera to show Earth
  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(137, 36, 20000000),
  });

  // Atmosphere
  viewer.scene.globe.enableLighting = true;
  viewer.scene.globe.atmosphereLightIntensity = 3.0;

  // Globe appearance
  viewer.scene.globe.showGroundAtmosphere = true;
  viewer.scene.skyAtmosphere.show = true;

  // Sun always on camera side (like Google Earth)
  viewer.scene.preRender.addEventListener(() => {
    const camPos = viewer.camera.positionWC;
    const lightDir = Cesium.Cartesian3.normalize(camPos, new Cesium.Cartesian3());
    viewer.scene.light = new Cesium.DirectionalLight({
      direction: Cesium.Cartesian3.negate(lightDir, new Cesium.Cartesian3()),
      intensity: 2.0,
    });
  });

  // Handle resize
  window.addEventListener('resize', () => {
    // CesiumJS handles resize automatically
  });
}

// ============================================================
// CAMERA FUNCTIONS
// ============================================================
function flyTo(lat, lng, height) {
  // Calculate appropriate height based on zoom level
  const h = height || 5000;
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, h),
    duration: 1.5,
    orientation: {
      heading: 0,
      pitch: Cesium.Math.toRadians(-45),
      roll: 0,
    },
  });
}

function flyToRegion(lat, lng) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lng, lat, 2000000),
    duration: 2.0,
  });
}

// ============================================================
// OBSERVATION MARKERS (CesiumJS Entities)
// ============================================================
function addObservationMarker(obs) {
  if (!viewer || obs.lat === null || obs.lng === null) return;

  const species = obs.species?.[0];
  const label = species?.name || '観測データ';
  const catIcon = species ? CATEGORY_ICONS[species.category] || '📍' : '📍';

  const entity = viewer.entities.add({
    id: 'obs-' + obs.id,
    position: Cesium.Cartesian3.fromDegrees(obs.lng, obs.lat, 10),
    billboard: {
      image: createMarkerCanvas(catIcon === '📍' ? '📍' : getCategoryEmoji(species?.category)),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      scale: 0.5,
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
    },
    label: {
      text: label,
      font: '13px "Google Sans", sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE,
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      pixelOffset: new Cesium.Cartesian2(0, -40),
      heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      disableDepthTestDistance: Number.POSITIVE_INFINITY,
      scaleByDistance: new Cesium.NearFarScalar(1000, 1.0, 50000, 0.4),
    },
    properties: { obsId: obs.id },
  });

  observationEntities.push({ id: obs.id, entity });
}

function getCategoryEmoji(cat) {
  const map = { plant: '🌿', animal: '🐾', bird: '🐦', insect: '🐛' };
  return map[cat] || '📍';
}

function createMarkerCanvas(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // Green dot background
  ctx.beginPath();
  ctx.arc(32, 32, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#2e7d32';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Emoji
  ctx.font = '24px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, 32, 32);

  return canvas;
}

async function loadObservationsToGlobe() {
  const all = await getAllObservations();
  state.observations = all;
  for (const obs of all) {
    addObservationMarker(obs);
  }
  renderFieldDataPanel();
}

// ============================================================
// UI — PANEL RENDERING (Desktop)
// ============================================================
function renderRegions() {
  const container = $('#region-list');
  if (!container) return;
  container.innerHTML = REGIONS_DATA.map(r => `
    <div class="region-item" data-lat="${r.lat}" data-lng="${r.lng}">
      <div class="region-flag">${r.flag}</div>
      <div class="region-info">
        <div class="region-name">${r.name}</div>
        <div class="region-stats">${r.trees} 本 · ${r.area}</div>
      </div>
      <div class="region-bar"><div class="region-bar-fill" style="width: ${r.pct}%;"></div></div>
    </div>
  `).join('');
}

function renderSpecies() {
  const container = $('#species-list');
  if (!container) return;
  container.innerHTML = SPECIES_DATA.map(s => `
    <div class="species-item">
      <span class="species-emoji">${s.emoji}</span>
      <div class="species-info">
        <div class="species-name">${s.name}</div>
        <div class="species-count">${s.count} (${s.pct})</div>
      </div>
      <div class="species-bar"><div class="species-bar-fill" style="width: ${parseFloat(s.pct)}%; background: ${s.color};"></div></div>
    </div>
  `).join('');
}

function renderSatelliteCatalog() {
  const container = $('#satellite-grid');
  if (!container) return;
  container.innerHTML = SATELLITE_DATA.map(s => `
    <div class="satellite-card" data-id="${s.id}">
      <div class="sat-preview" style="background: rgb(${s.color.join(',')});">
        <span class="sat-tag">${s.free ? '無料' : '有料'}</span>
      </div>
      <div class="sat-info">
        <h3>${s.name}</h3>
        <p>${s.description}</p>
        <div class="sat-meta">${s.resolution} · <a href="${s.sourceUrl}" target="_blank">${s.source}</a></div>
      </div>
    </div>
  `).join('');
}

function renderFieldDataPanel() {
  const container = $('#fd-observation-list');
  if (!container) return;
  if (state.observations.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="material-icons">photo_library</span><p>観測データがありません</p></div>';
    return;
  }
  container.innerHTML = state.observations.slice().reverse().map(obs => {
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

// ============================================================
// EVENT BINDINGS
// ============================================================
function bindEvents() {
  // Sidebar toggle (desktop only — may not exist on mobile)
  const sidebarToggle = $('#sidebar-toggle');
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const panel = $('#forest-panel');
      if (panel) panel.classList.toggle('collapsed');
    });
  }

  // Region items
  document.addEventListener('click', e => {
    const ri = e.target.closest('.region-item');
    if (ri) {
      flyToRegion(parseFloat(ri.dataset.lat), parseFloat(ri.dataset.lng));
    }
  });

  // Search
  const searchInput = $('#search-input');
  if (searchInput) {
    searchInput.addEventListener('keyup', e => {
      if (e.key === 'Enter') {
        showToast('info', `"${searchInput.value}" を検索中...`);
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeBsheet();
      ['observation-popup', 'confirm-modal', 'manual-input-modal', 'export-modal', 'settings-modal'].forEach(id => {
        const el = $('#' + id); if (el) el.classList.add('hidden');
      });
      if (state.locationPickerActive) cancelLocationPicker();
    }
  });

  // ====== FIELD DATA Event Bindings ======
  const addPhotoBtn = $('#fd-add-photo-btn');
  if (addPhotoBtn) addPhotoBtn.addEventListener('click', () => { $('#photo-input').click(); });

  const photoInput = $('#photo-input');
  if (photoInput) photoInput.addEventListener('change', e => { handlePhotoUpload(e.target.files); e.target.value = ''; });

  const photoDropzone = $('#photo-dropzone');
  if (photoDropzone) {
    photoDropzone.addEventListener('dragover', e => { e.preventDefault(); photoDropzone.classList.add('dragover'); });
    photoDropzone.addEventListener('dragleave', () => { photoDropzone.classList.remove('dragover'); });
    photoDropzone.addEventListener('drop', e => { e.preventDefault(); photoDropzone.classList.remove('dragover'); handlePhotoUpload(e.dataTransfer.files); });
    photoDropzone.addEventListener('click', () => { $('#photo-input').click(); });
  }

  const exportBtn = $('#fd-export-btn');
  if (exportBtn) exportBtn.addEventListener('click', showExportModal);

  const settingsBtn = $('#fd-settings-btn');
  if (settingsBtn) settingsBtn.addEventListener('click', showSettingsModal);

  // Modal close buttons (safe — $$ returns empty array if none found)
  $$('.fd-popup-close').forEach(b => b.addEventListener('click', () => { const el = $('#observation-popup'); if (el) el.classList.add('hidden'); }));
  $$('.fd-confirm-close').forEach(b => b.addEventListener('click', () => { const el = $('#confirm-modal'); if (el) el.classList.add('hidden'); }));
  $$('.fd-manual-close').forEach(b => b.addEventListener('click', () => { const el = $('#manual-input-modal'); if (el) el.classList.add('hidden'); }));
  $$('.fd-export-close').forEach(b => b.addEventListener('click', () => { const el = $('#export-modal'); if (el) el.classList.add('hidden'); }));
  $$('.fd-settings-close').forEach(b => b.addEventListener('click', () => { const el = $('#settings-modal'); if (el) el.classList.add('hidden'); }));

  // Modal overlay click to close
  ['observation-popup', 'confirm-modal', 'manual-input-modal', 'export-modal', 'settings-modal'].forEach(id => {
    const el = $('#' + id);
    if (el) el.addEventListener('click', e => { if (e.target === e.currentTarget) el.classList.add('hidden'); });
  });

  // Privacy accept
  const privacyBtn = $('#fd-privacy-accept');
  if (privacyBtn) {
    privacyBtn.addEventListener('click', () => {
      localStorage.setItem('forestscope-privacy-accepted', 'true');
      const modal = $('#privacy-modal');
      if (modal) modal.classList.add('hidden');
    });
  }

  // Location picker cancel
  const locCancel = $('#location-picker-cancel');
  if (locCancel) locCancel.addEventListener('click', cancelLocationPicker);

  // Globe click for location picking (CesiumJS)
  if (viewer && viewer.scene) {
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction(click => {
      handleGlobeClick(click.position);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  // Field data panel toggle
  const fdToggle = $('#fd-panel-toggle');
  if (fdToggle) {
    fdToggle.addEventListener('click', () => {
      state.fieldDataPanelOpen = !state.fieldDataPanelOpen;
      const panel = $('#fielddata-panel');
      if (panel) panel.classList.toggle('open', state.fieldDataPanelOpen);
    });
  }
}

function handleGlobeClick(screenPos) {
  // Check if an entity was clicked
  const picked = viewer.scene.pick(screenPos);
  if (picked && picked.id && picked.id.properties && picked.id.properties.obsId) {
    const obsId = picked.id.properties.obsId.getValue();
    const obs = state.observations.find(o => o.id === obsId);
    if (obs) {
      showObservationPopup(obs);
      return;
    }
  }

  // Location picker mode
  if (state.locationPickerActive && state.pendingLocationObservation) {
    const ray = viewer.camera.getPickRay(screenPos);
    const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
    if (cartesian) {
      const carto = Cesium.Cartographic.fromCartesian(cartesian);
      const lat = Cesium.Math.toDegrees(carto.latitude);
      const lng = Cesium.Math.toDegrees(carto.longitude);

      const obs = state.pendingLocationObservation;
      obs.lat = lat;
      obs.lng = lng;

      $('#location-picker-hint').classList.add('hidden');
      state.locationPickerActive = false;
      state.pendingLocationObservation = null;

      showToast('success', `位置を設定: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      runAIAndAutoSave(obs);
    }
  }
}

// ============================================================
// FIELD DATA — Helpers
// ============================================================
const CATEGORY_ICONS = { plant: 'eco', animal: 'pets', bird: 'flutter', insect: 'bug_report', other: 'help_outline' };

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
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
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

async function saveObservation(obs) { if (!fieldDB) return; await fieldDB.put('observations', obs); }
async function getAllObservations() { if (!fieldDB) return []; return await fieldDB.getAll('observations'); }
async function deleteObservation(id) { if (!fieldDB) return; await fieldDB.delete('observations', id); }
async function clearAllObservations() { if (!fieldDB) return; await fieldDB.clear('observations'); }
async function updateObservation(id, updates) {
  if (!fieldDB) return;
  const obs = await fieldDB.get('observations', id);
  if (obs) { Object.assign(obs, updates); await fieldDB.put('observations', obs); }
}

// ============================================================
// FIELD DATA — Multi-Stage AI Identification Pipeline
// ============================================================

// Default API keys (built-in)
const DEFAULT_PLANTNET_KEY = '2b10VmN9DMVabEoiGlusHXve';

function getPlantNetKey() {
  return localStorage.getItem('forestscope-plantnet-key') || DEFAULT_PLANTNET_KEY;
}

// API rate limiting & tracking
const API_LIMITS = {
  plantnet: { perDay: 500, minIntervalMs: 1500 },
  inaturalist: { minIntervalMs: 1000 },
  gbif: { minIntervalMs: 100 },
  wikipedia: { minIntervalMs: 100 },
};
let lastApiCallTime = { plantnet: 0, inaturalist: 0, gbif: 0, wikipedia: 0 };

function getPlantNetDailyCount() {
  const d = new Date().toISOString().slice(0, 10);
  const stored = localStorage.getItem('fs-plantnet-daily');
  if (stored) { try { const p = JSON.parse(stored); if (p.date === d) return p.count; } catch {} }
  return 0;
}
function incrementPlantNetDailyCount() {
  const d = new Date().toISOString().slice(0, 10);
  const count = getPlantNetDailyCount() + 1;
  localStorage.setItem('fs-plantnet-daily', JSON.stringify({ date: d, count }));
}

// Species info cache (GBIF + Wikipedia) — 30 day TTL
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
function getCachedSpeciesInfo(scientificName) {
  try {
    const raw = localStorage.getItem('fs-species-' + scientificName);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.cachedAt > CACHE_TTL_MS) { localStorage.removeItem('fs-species-' + scientificName); return null; }
    return data;
  } catch { return null; }
}
function setCachedSpeciesInfo(scientificName, info) {
  try { localStorage.setItem('fs-species-' + scientificName, JSON.stringify({ ...info, cachedAt: Date.now() })); } catch {}
}

// Utility: base64 to Blob
async function base64ToBlob(base64) {
  return fetch(base64).then(r => r.blob());
}

// Throttle helper
async function throttleApi(apiName) {
  const limit = API_LIMITS[apiName];
  if (!limit) return;
  const now = Date.now();
  const wait = limit.minIntervalMs - (now - (lastApiCallTime[apiName] || 0));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastApiCallTime[apiName] = Date.now();
}

// ─── Stage 1: Image Preprocessing ───
// Returns the original resized image (variants are optional enhancement for future)
function preprocessImageForAI(imageBase64) {
  return { original: imageBase64 };
}

// ─── Stage 2: Scene Classification via iNaturalist ───
// Returns { sceneType, inatResults } so we can reuse iNat data in cross-check
async function classifySceneWithResults(imageBase64, lat, lng) {
  try {
    console.log('[Pipeline] Stage 2: Scene classification via iNaturalist...');
    const results = await _rawINaturalistIdentify(imageBase64, lat, lng);
    if (!results || results.length === 0) return { sceneType: 'unknown', inatResults: null };
    const top = results[0];
    const iconic = top.iconicTaxon || '';
    let sceneType = 'unknown';
    if (iconic === 'Plantae' || iconic === 'Fungi') sceneType = 'plant';
    else if (iconic === 'Aves') sceneType = 'bird';
    else if (iconic === 'Insecta' || iconic === 'Arachnida') sceneType = 'insect';
    else if (['Mammalia', 'Reptilia', 'Amphibia', 'Actinopterygii', 'Mollusca'].includes(iconic)) sceneType = 'animal';
    console.log(`[Pipeline] Scene classified as: ${sceneType} (${iconic})`);
    return { sceneType, inatResults: results };
  } catch (err) {
    console.warn('[Pipeline] Scene classification failed:', err);
    return { sceneType: 'unknown', inatResults: null };
  }
}

// ─── Stage 3a: Pl@ntNet Identification ───
async function identifyWithPlantNet(base64, organs = 'auto') {
  const key = getPlantNetKey();
  if (!key) return null;
  if (getPlantNetDailyCount() >= API_LIMITS.plantnet.perDay) {
    console.warn('PlantNet daily limit reached');
    return null;
  }
  await throttleApi('plantnet');
  try {
    const blob = await base64ToBlob(base64);
    const formData = new FormData();
    formData.append('images', blob, 'photo.jpg');
    formData.append('organs', organs);
    const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${key}&include-related-images=false&no-reject=false&lang=ja`;
    const resp = await fetch(url, { method: 'POST', body: formData });
    if (resp.status === 429) { const err = new Error('RATE_LIMITED'); err.status = 429; throw err; }
    if (!resp.ok) throw new Error(`PlantNet API error: ${resp.status}`);
    incrementPlantNetDailyCount();
    const data = await resp.json();
    if (!data.results || data.results.length === 0) return null;
    return data.results.slice(0, 5).map(r => ({
      scientificName: r.species?.scientificNameWithoutAuthor || '',
      name: r.species?.commonNames?.[0] || r.species?.scientificNameWithoutAuthor || '不明',
      commonNames: r.species?.commonNames || [],
      family: r.species?.family?.scientificNameWithoutAuthor || '',
      genus: r.species?.genus?.scientificNameWithoutAuthor || '',
      confidence: r.score || 0,
      source: 'plantnet',
      category: 'plant',
      organ: organs,
    }));
  } catch (err) {
    if (err.status === 429) throw err;
    console.error('PlantNet error:', err);
    return null;
  }
}

// ─── Stage 3b: iNaturalist Identification (raw) ───
async function _rawINaturalistIdentify(base64, lat, lng) {
  const useINat = localStorage.getItem('forestscope-use-inaturalist') !== 'false';
  if (!useINat) return null;
  await throttleApi('inaturalist');
  try {
    const blob = await base64ToBlob(base64);
    const formData = new FormData();
    formData.append('image', blob, 'photo.jpg');
    if (lat) formData.append('lat', String(lat));
    if (lng) formData.append('lng', String(lng));
    const resp = await fetch('https://api.inaturalist.org/v1/computervision/score_image', {
      method: 'POST', body: formData
    });
    if (!resp.ok) throw new Error(`iNaturalist error: ${resp.status}`);
    const data = await resp.json();
    if (!data.results || data.results.length === 0) return null;
    return data.results.slice(0, 5).map(r => {
      let category = 'other';
      const ic = r.taxon?.iconic_taxon_name || '';
      if (ic === 'Plantae' || ic === 'Fungi') category = 'plant';
      else if (['Mammalia', 'Reptilia', 'Amphibia'].includes(ic)) category = 'animal';
      else if (ic === 'Aves') category = 'bird';
      else if (ic === 'Insecta' || ic === 'Arachnida') category = 'insect';
      return {
        name: r.taxon?.preferred_common_name || r.taxon?.name || '不明',
        scientificName: r.taxon?.name || '',
        category,
        confidence: (r.combined_score || 0) / 100,
        source: 'inaturalist',
        iconicTaxon: ic,
        taxonId: r.taxon?.id,
        rank: r.taxon?.rank,
        wikipediaUrl: r.taxon?.wikipedia_url,
      };
    });
  } catch (err) { console.error('iNaturalist error:', err); return null; }
}

async function identifyWithINaturalist(base64, lat, lng) {
  return _rawINaturalistIdentify(base64, lat, lng);
}

// ─── Stage 4: Cross-check ───
// cachedInatResults: reuse iNat results from scene classification to avoid duplicate API calls
async function runCrossCheck(imageBase64, lat, lng, sceneType, cachedInatResults) {
  let plantnetResults = null, inatResults = cachedInatResults || null;

  // Pl@ntNet: run for plants or unknown scenes
  if (sceneType === 'plant' || sceneType === 'unknown') {
    console.log('[Pipeline] Stage 3a: Pl@ntNet identification...');
    try { plantnetResults = await identifyWithPlantNet(imageBase64); } catch (e) { console.warn('[Pipeline] PlantNet failed:', e); }
    if (plantnetResults) console.log(`[Pipeline] PlantNet top: ${plantnetResults[0]?.scientificName} (${Math.round((plantnetResults[0]?.confidence||0)*100)}%)`);
  }

  // iNaturalist: only call if we don't already have cached results
  if (!inatResults) {
    console.log('[Pipeline] Stage 3b: iNaturalist identification...');
    try { inatResults = await identifyWithINaturalist(imageBase64, lat, lng); } catch (e) { console.warn('[Pipeline] iNat failed:', e); }
  } else {
    console.log('[Pipeline] Reusing iNaturalist results from scene classification');
  }
  if (inatResults) console.log(`[Pipeline] iNat top: ${inatResults[0]?.scientificName} (${Math.round((inatResults[0]?.confidence||0)*100)}%)`);

  // Merge and cross-check
  const primary = (sceneType === 'plant' && plantnetResults) ? plantnetResults
    : (inatResults || plantnetResults || []);
  const secondary = primary === plantnetResults ? inatResults : plantnetResults;

  let crossCheckMatched = false;
  if (primary && primary.length > 0 && secondary && secondary.length > 0) {
    const pName = primary[0].scientificName?.toLowerCase();
    const match = secondary.find(s => s.scientificName?.toLowerCase() === pName);
    if (match) {
      crossCheckMatched = true;
      primary[0].confidence = Math.min(1.0, primary[0].confidence * 1.2);
      console.log('[Pipeline] ✅ Cross-check MATCHED! Confidence boosted.');
    } else {
      console.log(`[Pipeline] ⚠️ Cross-check mismatch: ${primary[0]?.scientificName} vs ${secondary[0]?.scientificName}`);
    }
  }

  // Merge alternatives from secondary
  const all = [...(primary || [])];
  if (secondary) {
    for (const s of secondary) {
      if (!all.find(a => a.scientificName?.toLowerCase() === s.scientificName?.toLowerCase())) {
        all.push(s);
      }
    }
  }

  return {
    results: all.slice(0, 5),
    crossCheckMatched,
    primarySource: primary === plantnetResults ? 'plantnet' : 'inaturalist',
  };
}

// ─── Stage 5: GBIF Enrichment ───
async function enrichWithGBIF(scientificName) {
  if (!scientificName) return null;
  const cached = getCachedSpeciesInfo(scientificName);
  if (cached && cached.gbif) return cached.gbif;

  await throttleApi('gbif');
  try {
    const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&strict=false`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const data = await resp.json();
    const result = {
      kingdom: data.kingdom || '',
      phylum: data.phylum || '',
      class: data.class || '',
      order: data.order || '',
      family: data.family || '',
      genus: data.genus || '',
      species: data.species || '',
      gbifTaxonKey: data.usageKey || null,
      matchType: data.matchType || 'NONE',
      iucnStatus: null,
    };

    // Try to get IUCN status
    if (result.gbifTaxonKey) {
      try {
        const iucnResp = await fetch(`https://api.gbif.org/v1/species/${result.gbifTaxonKey}/iucnRedListCategory`);
        if (iucnResp.ok) {
          const iucnData = await iucnResp.json();
          result.iucnStatus = iucnData.category || null;
        }
      } catch {}
    }

    // Update cache
    const existing = getCachedSpeciesInfo(scientificName) || {};
    setCachedSpeciesInfo(scientificName, { ...existing, gbif: result });
    return result;
  } catch (err) { console.error('GBIF error:', err); return null; }
}

// ─── Stage 6: Wikipedia/Wikidata Enrichment ───
async function enrichWithWikipedia(scientificName) {
  if (!scientificName) return null;
  const cached = getCachedSpeciesInfo(scientificName);
  if (cached && cached.wikipedia) return cached.wikipedia;

  await throttleApi('wikipedia');
  try {
    const result = { japaneseName: null, description: null, thumbnailUrl: null, wikipediaUrlJa: null, wikipediaUrlEn: null };

    // English Wikipedia summary
    try {
      const enResp = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(scientificName)}`);
      if (enResp.ok) {
        const enData = await enResp.json();
        result.description = enData.extract || null;
        result.thumbnailUrl = enData.thumbnail?.source || null;
        result.wikipediaUrlEn = enData.content_urls?.desktop?.page || null;
      }
    } catch {}

    // Wikidata for Japanese name (try multiple approaches)
    try {
      // Approach 1: Direct Wikidata lookup by enwiki title
      const wdResp = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(scientificName)}&languages=ja&props=labels|sitelinks&format=json&origin=*`);
      if (wdResp.ok) {
        const wdData = await wdResp.json();
        const entities = wdData.entities || {};
        const entity = Object.values(entities)[0];
        if (entity && entity.id !== '-1') {
          if (entity.labels?.ja) {
            result.japaneseName = entity.labels.ja.value;
          }
          if (entity.sitelinks?.jawiki) {
            result.wikipediaUrlJa = `https://ja.wikipedia.org/wiki/${encodeURIComponent(entity.sitelinks.jawiki.title)}`;
            // If no Japanese label, use jawiki title as fallback
            if (!result.japaneseName && entity.sitelinks.jawiki.title) {
              result.japaneseName = entity.sitelinks.jawiki.title;
            }
          }
        }
      }
    } catch {}

    // Approach 2: If still no Japanese name, try Japanese Wikipedia search directly
    if (!result.japaneseName) {
      try {
        const jaResp = await fetch(`https://ja.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(scientificName)}&limit=1&namespace=0&format=json&origin=*`);
        if (jaResp.ok) {
          const jaData = await jaResp.json();
          if (jaData[1] && jaData[1].length > 0) {
            result.japaneseName = jaData[1][0];
            result.wikipediaUrlJa = jaData[3]?.[0] || null;
          }
        }
      } catch {}
    }

    // Approach 3: If still no Japanese name, try genus-level lookup (e.g., "Cryptomeria" instead of "Cryptomeria japonica")
    if (!result.japaneseName && scientificName.includes(' ')) {
      const genus = scientificName.split(' ')[0];
      try {
        // Try Wikidata with genus name
        const wdGenusResp = await fetch(`https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(genus)}&languages=ja&props=labels|sitelinks&format=json&origin=*`);
        if (wdGenusResp.ok) {
          const wdGenusData = await wdGenusResp.json();
          const genusEntity = Object.values(wdGenusData.entities || {})[0];
          if (genusEntity && genusEntity.id !== '-1') {
            if (genusEntity.labels?.ja) result.japaneseName = genusEntity.labels.ja.value;
            if (!result.wikipediaUrlJa && genusEntity.sitelinks?.jawiki) {
              result.wikipediaUrlJa = `https://ja.wikipedia.org/wiki/${encodeURIComponent(genusEntity.sitelinks.jawiki.title)}`;
              if (!result.japaneseName) result.japaneseName = genusEntity.sitelinks.jawiki.title;
            }
          }
        }
      } catch {}
      // Also try ja.wikipedia search with genus
      if (!result.japaneseName) {
        try {
          const jaGenusResp = await fetch(`https://ja.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(genus)}&limit=1&namespace=0&format=json&origin=*`);
          if (jaGenusResp.ok) {
            const jaGenusData = await jaGenusResp.json();
            if (jaGenusData[1] && jaGenusData[1].length > 0) {
              result.japaneseName = jaGenusData[1][0];
              result.wikipediaUrlJa = jaGenusData[3]?.[0] || result.wikipediaUrlJa;
            }
          }
        } catch {}
      }
    }

    // Update cache
    const existing = getCachedSpeciesInfo(scientificName) || {};
    setCachedSpeciesInfo(scientificName, { ...existing, wikipedia: result });
    return result;
  } catch (err) { console.error('Wikipedia error:', err); return null; }
}

// ─── Stage 7: Integrated Confidence Score ───
function computeFinalConfidence(baseConf, crossCheckMatched, gbifMatchType, hasLocationBonus) {
  let score = baseConf;
  if (crossCheckMatched) score *= 1.2;
  if (gbifMatchType === 'EXACT') score *= 1.0;
  else if (gbifMatchType === 'FUZZY') score *= 0.9;
  else if (gbifMatchType === 'HIGHERRANK') score *= 0.7;
  if (hasLocationBonus) score *= 1.1;
  return Math.min(1.0, score);
}

function getConfidenceTier(confidence) {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.6) return 'medium';
  return 'low';
}

// ─── MAIN PIPELINE ───
async function runIdentificationPipeline(imageBase64, lat, lng) {
  console.log('[Pipeline] Starting multi-stage identification...');
  const stages = {
    preprocessing: true,
    sceneClassification: null,
    primaryAPI: null,
    crossCheck: false,
    gbifEnrichment: false,
    wikipediaEnrichment: false,
  };

  // Stage 1: Preprocessing
  const images = preprocessImageForAI(imageBase64);

  // Stage 2: Scene classification (returns both scene type AND iNat results)
  const { sceneType, inatResults } = await classifySceneWithResults(images.original, lat, lng);
  stages.sceneClassification = sceneType;

  // Stage 3 & 4: Cross-check identification (reuse iNat results from Stage 2)
  const crossResult = await runCrossCheck(images.original, lat, lng, sceneType, inatResults);
  stages.primaryAPI = crossResult.primarySource;
  stages.crossCheck = crossResult.crossCheckMatched;

  if (!crossResult.results || crossResult.results.length === 0) {
    console.warn('[Pipeline] All APIs failed — no results');
    return null;
  }

  const topResult = crossResult.results[0];
  console.log(`[Pipeline] Top result: ${topResult.scientificName} (${topResult.source})`);

  // Stage 5: GBIF enrichment
  let gbifData = null;
  if (topResult.scientificName) {
    console.log('[Pipeline] Stage 5: GBIF enrichment...');
    gbifData = await enrichWithGBIF(topResult.scientificName);
    if (gbifData) {
      stages.gbifEnrichment = true;
      console.log(`[Pipeline] GBIF: ${gbifData.family} / IUCN: ${gbifData.iucnStatus || 'N/A'}`);
    }
  }

  // Stage 6: Wikipedia enrichment
  let wikiData = null;
  if (topResult.scientificName) {
    console.log('[Pipeline] Stage 6: Wikipedia/Wikidata enrichment...');
    wikiData = await enrichWithWikipedia(topResult.scientificName);
    if (wikiData) {
      stages.wikipediaEnrichment = true;
      console.log(`[Pipeline] Wikipedia: 和名=${wikiData.japaneseName || 'N/A'}`);
    }
  }

  // Stage 7: Final confidence
  const finalConfidence = computeFinalConfidence(
    topResult.confidence,
    crossResult.crossCheckMatched,
    gbifData?.matchType || 'NONE',
    lat !== null
  );
  const confidenceTier = getConfidenceTier(finalConfidence);

  // Build identification object
  const identification = {
    primary: {
      scientificName: topResult.scientificName,
      name: wikiData?.japaneseName || topResult.name || topResult.scientificName,
      japaneseName: wikiData?.japaneseName || null,
      commonNames: topResult.commonNames || [topResult.name],
      confidence: finalConfidence,
      confidenceTier,
      category: topResult.category || stages.sceneClassification || 'other',
      kingdom: gbifData?.kingdom || '',
      phylum: gbifData?.phylum || '',
      class: gbifData?.class || '',
      order: gbifData?.order || '',
      family: gbifData?.family || topResult.family || '',
      genus: gbifData?.genus || topResult.genus || '',
      species: gbifData?.species || topResult.scientificName || '',
      iconicTaxon: topResult.iconicTaxon || stages.sceneClassification || '',
      source: topResult.source || stages.primaryAPI,
      crossCheckMatched: crossResult.crossCheckMatched,
      gbifTaxonKey: gbifData?.gbifTaxonKey || null,
      iucnStatus: gbifData?.iucnStatus || null,
      wikipediaSummary: wikiData?.description || null,
      thumbnailUrl: wikiData?.thumbnailUrl || null,
      wikipediaUrlJa: wikiData?.wikipediaUrlJa || null,
      wikipediaUrlEn: wikiData?.wikipediaUrlEn || null,
    },
    alternatives: crossResult.results.slice(1).map(r => ({
      scientificName: r.scientificName,
      name: r.name,
      confidence: r.confidence,
      category: r.category,
      source: r.source,
    })),
    pipelineStages: stages,
    processedAt: new Date().toISOString(),
  };

  // Also build legacy species array for backward compatibility
  const species = crossResult.results.map(r => ({
    name: r.scientificName === identification.primary.scientificName ? identification.primary.name : r.name,
    scientificName: r.scientificName,
    category: r.category,
    confidence: r === topResult ? finalConfidence : r.confidence,
    source: r.source,
    japaneseName: r === topResult ? wikiData?.japaneseName : null,
    family: r === topResult ? (gbifData?.family || r.family) : r.family,
    iucnStatus: r === topResult ? gbifData?.iucnStatus : null,
    confidenceTier: r === topResult ? confidenceTier : getConfidenceTier(r.confidence),
    crossCheckMatched: r === topResult ? crossResult.crossCheckMatched : false,
  }));

  return { species, identification, source: stages.primaryAPI };
}

// Legacy wrapper — called by existing code
async function identifySpecies(base64, lat, lng) {
  return runIdentificationPipeline(base64, lat, lng);
}

// ============================================================
// FIELD DATA — Photo Upload Flow
// ============================================================
let _photoProcessing = false;

async function handlePhotoUpload(files) {
  if (!files || files.length === 0) return;
  if (_photoProcessing) return;
  _photoProcessing = true;
  const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (fileArr.length === 0) { showToast('error', '画像ファイルを選択してください'); _photoProcessing = false; return; }
  for (const file of fileArr) { await processPhoto(file); }
  _photoProcessing = false;
}

async function processPhoto(file) {
  showProcessingOverlay('写真を処理中...');
  try {
    const imageBase64 = await resizeImage(file);
    let lat = null, lng = null, capturedAt = null;
    try {
      const gps = await exifr.gps(file);
      if (gps && gps.latitude && gps.longitude) { lat = gps.latitude; lng = gps.longitude; }
      const exifData = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
      if (exifData) {
        capturedAt = exifData.DateTimeOriginal || exifData.CreateDate || null;
        if (capturedAt instanceof Date) capturedAt = capturedAt.toISOString();
      }
    } catch (exifErr) { console.warn('EXIF extraction failed:', exifErr); }

    // Fallback: device GPS
    if (lat === null || lng === null) {
      showProcessingOverlay('位置情報を取得中...');
      try {
        const pos = await getDeviceLocation();
        lat = pos.latitude; lng = pos.longitude;
        showToast('success', `現在地を取得: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      } catch (geoErr) { console.warn('Device geolocation failed:', geoErr); }
    }

    if (!capturedAt) capturedAt = new Date().toISOString();

    const observation = {
      id: generateId(), imageBase64, lat, lng, capturedAt,
      createdAt: new Date().toISOString(), species: [], userNote: '', locationName: '',
      pendingAIIdentification: false,
    };

    if (lat === null || lng === null) {
      hideProcessingOverlay();
      await showLocationPicker(observation);
      return;
    }

    await runAIAndAutoSave(observation);
  } catch (err) {
    hideProcessingOverlay();
    console.error('Photo processing error:', err);
    showToast('error', '写真の処理に失敗しました');
  }
}

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
  showProcessingOverlay('AI多段判定中...');
  const result = await identifySpecies(observation.imageBase64, observation.lat, observation.lng);
  hideProcessingOverlay();
  if (result) {
    observation.species = result.species;
    observation.identification = result.identification;
    showConfirmModal(observation);
  } else {
    observation.pendingAIIdentification = false;
    showManualInputModal(observation);
  }
}

async function runAIAndAutoSave(observation) {
  showProcessingOverlay('AI多段判定中...');
  const result = await identifySpecies(observation.imageBase64, observation.lat, observation.lng);
  hideProcessingOverlay();

  if (result) {
    observation.species = result.species;
    observation.identification = result.identification;
    observation.pendingAIIdentification = false;
  } else {
    observation.pendingAIIdentification = !navigator.onLine;
  }

  await saveObservation(observation);
  addObservationMarker(observation);
  state.observations.push(observation);
  renderFieldDataPanel();
  flyTo(observation.lat, observation.lng, 2000);

  if (observation.species.length > 0) {
    const top = observation.species[0];
    const confidence = Math.round((top.confidence || 0) * 100);
    const tierBadge = top.confidenceTier === 'high' ? '🟢' : top.confidenceTier === 'medium' ? '🟡' : '🔴';
    const jaName = top.japaneseName ? ` (${top.japaneseName})` : '';
    showToast('success', `📸 ${top.name}${jaName} ${tierBadge}${confidence}% — 保存しました`);
    showQuickResult(observation);
  } else {
    showToast('info', '📸 写真を保存しました（種不明）');
    showManualInputModal(observation);
  }
}

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
  div.addEventListener('click', e => { if (!e.target.closest('.fd-qr-close')) { div.remove(); showObservationPopup(observation); } });
  setTimeout(() => { if (div.parentNode) div.remove(); }, 8000);
}

// ============================================================
// FIELD DATA — Processing Overlay
// ============================================================
function showProcessingOverlay(text) {
  let ol = document.querySelector('.fd-processing-overlay');
  if (!ol) {
    ol = document.createElement('div');
    ol.className = 'fd-processing-overlay';
    ol.innerHTML = `<div class="fd-processing-spinner"></div><div class="fd-processing-text"></div>`;
    document.body.appendChild(ol);
  }
  ol.querySelector('.fd-processing-text').textContent = text || '処理中...';
  ol.classList.remove('hidden');
}

function hideProcessingOverlay() {
  const ol = document.querySelector('.fd-processing-overlay');
  if (ol) ol.classList.add('hidden');
}

// ============================================================
// FIELD DATA — Location Picker
// ============================================================
function showLocationPicker(observation) {
  state.locationPickerActive = true;
  state.pendingLocationObservation = observation;
  const hint = $('#location-picker-hint');
  if (hint) hint.classList.remove('hidden');
  showToast('info', '地球上の撮影場所をタップしてください');
}

function cancelLocationPicker() {
  state.locationPickerActive = false;
  state.pendingLocationObservation = null;
  const hint = $('#location-picker-hint');
  if (hint) hint.classList.add('hidden');
}

// ============================================================
// FIELD DATA — Modals
// ============================================================
function showObservationPopup(obs) {
  const body = $('#fd-popup-body');
  const species = obs.species || [];
  const id = obs.identification?.primary;
  const alts = obs.identification?.alternatives || [];

  // Confidence badge
  const tierBadge = (tier) => tier === 'high' ? '<span class="conf-badge conf-high">高信頼</span>'
    : tier === 'medium' ? '<span class="conf-badge conf-medium">中信頼</span>'
    : '<span class="conf-badge conf-low">要確認</span>';

  // IUCN display
  const iucnLabels = { LC: '低懸念', NT: '準絶滅危惧', VU: '危急', EN: '絶滅危惧', CR: '近絶滅', EX: '絶滅' };
  const iucnHtml = id?.iucnStatus ? `<div class="fd-popup-iucn">🌍 IUCN: <strong>${id.iucnStatus}</strong> (${iucnLabels[id.iucnStatus] || id.iucnStatus})</div>` : '';

  // Primary species display
  let primaryHtml = '';
  if (id) {
    const conf = Math.round((id.confidence || 0) * 100);
    primaryHtml = `
      <div class="fd-popup-primary">
        <div class="fd-popup-species-main">
          <span class="material-icons" style="color: var(--forest-accent); font-size:28px;">${CATEGORY_ICONS[id.category] || 'eco'}</span>
          <div>
            <div class="fd-popup-main-name">${id.japaneseName || id.name} <span style="font-style:italic;color:var(--gm-text-secondary);">(${id.scientificName})</span></div>
            <div class="fd-popup-main-family">${id.family ? '科: ' + id.family : ''}</div>
            <div class="fd-popup-main-conf">${tierBadge(id.confidenceTier)} ${conf}% ${id.crossCheckMatched ? '✅ 両API一致' : ''}</div>
          </div>
        </div>
        ${iucnHtml}
        ${id.wikipediaSummary ? `<div class="fd-popup-wiki-summary">${id.wikipediaSummary.slice(0, 150)}...</div>` : ''}
        ${id.wikipediaUrlJa ? `<a href="${id.wikipediaUrlJa}" target="_blank" rel="noopener" class="fd-popup-wiki-link">📖 Wikipediaで詳しく見る</a>` : (id.wikipediaUrlEn ? `<a href="${id.wikipediaUrlEn}" target="_blank" rel="noopener" class="fd-popup-wiki-link">📖 Wikipedia (EN)</a>` : '')}
      </div>
    `;
  } else if (species.length > 0) {
    primaryHtml = species.map(s => `
      <div class="fd-popup-species">
        <span class="material-icons" style="color: var(--forest-accent);">${CATEGORY_ICONS[s.category] || 'eco'}</span>
        <div><strong>${s.name}</strong>
        <div style="font-size:11px; color:var(--gm-text-tertiary);">${s.scientificName || ''} · ${Math.round((s.confidence || 0) * 100)}% · ${s.source || ''}</div></div>
      </div>`).join('');
  } else {
    primaryHtml = '<p style="color:var(--gm-text-tertiary);">種情報なし</p>';
  }

  // Alternatives
  const altsHtml = alts.length > 0 ? `
    <div class="fd-popup-section-title" style="margin-top:12px;">その他の候補</div>
    ${alts.map(a => `<div class="fd-popup-alt">• ${a.name} <em>${a.scientificName}</em> (${Math.round((a.confidence || 0) * 100)}%)</div>`).join('')}
  ` : '';

  // User corrected badge
  const correctedHtml = obs.userCorrected ? '<div class="fd-popup-corrected">✏️ ユーザー訂正済み</div>' : '';

  body.innerHTML = `
    <div class="fd-popup-img"><img src="${obs.imageBase64}" alt="observation photo"></div>
    <div class="fd-popup-details">
      <div class="fd-popup-section-title">種同定</div>
      ${correctedHtml}
      ${primaryHtml}
      ${altsHtml}
      <div class="fd-popup-section-title" style="margin-top:12px;">位置情報</div>
      <p>📍 ${obs.lat?.toFixed(6) || '不明'}°N, ${obs.lng?.toFixed(6) || '不明'}°E</p>
      <p>📅 ${formatDateTime(obs.capturedAt)}</p>
      ${obs.userNote ? `<p>📝 ${obs.userNote}</p>` : ''}
    </div>
    <div class="fd-popup-actions">
      <button class="secondary-btn" id="fd-popup-reidentify"><span class="material-icons">refresh</span> 再判定</button>
      <button class="secondary-btn" id="fd-popup-edit"><span class="material-icons">edit</span> 訂正</button>
      <button class="secondary-btn" id="fd-popup-fly"><span class="material-icons">flight</span> 飛ぶ</button>
      <button class="secondary-btn fd-danger-btn" id="fd-popup-delete"><span class="material-icons">delete</span> 削除</button>
    </div>
  `;

  // Re-identify
  body.querySelector('#fd-popup-reidentify')?.addEventListener('click', async () => {
    $('#observation-popup').classList.add('hidden');
    showProcessingOverlay('再判定中...');
    const result = await identifySpecies(obs.imageBase64, obs.lat, obs.lng);
    hideProcessingOverlay();
    if (result) {
      obs.species = result.species;
      obs.identification = result.identification;
      obs.pendingAIIdentification = false;
      await updateObservation(obs.id, obs);
      showToast('success', '再判定が完了しました');
    } else {
      showToast('warning', '再判定に失敗しました');
    }
    showObservationPopup(obs);
  });

  // User correction
  body.querySelector('#fd-popup-edit')?.addEventListener('click', () => {
    $('#observation-popup').classList.add('hidden');
    showManualInputModal(obs);
  });

  // Fly to
  body.querySelector('#fd-popup-fly')?.addEventListener('click', () => {
    if (obs.lat && obs.lng) flyTo(obs.lat, obs.lng, 500);
  });

  // Delete
  body.querySelector('#fd-popup-delete')?.addEventListener('click', async () => {
    await deleteObservation(obs.id);
    state.observations = state.observations.filter(o => o.id !== obs.id);
    const ent = observationEntities.find(e => e.id === obs.id);
    if (ent) { viewer.entities.remove(ent.entity); observationEntities = observationEntities.filter(e => e.id !== obs.id); }
    renderFieldDataPanel();
    updateClustering();
    $('#observation-popup').classList.add('hidden');
    showToast('info', 'データを削除しました');
  });

  $('#observation-popup').classList.remove('hidden');
}

function showConfirmModal(obs) {
  const body = $('#fd-confirm-body');
  const sp = obs.species?.[0];
  body.innerHTML = `
    <div class="fd-confirm-preview">
      <img src="${obs.imageBase64}" class="fd-confirm-thumb" alt="">
      <div class="fd-confirm-info">
        <h3>${sp?.name || '不明'}</h3>
        <p style="font-style:italic; color:var(--gm-text-tertiary);">${sp?.scientificName || ''}</p>
        <p>信頼度: ${Math.round((sp?.confidence || 0) * 100)}%</p>
        <p>ソース: ${sp?.source || ''}</p>
      </div>
    </div>
  `;

  const saveBtn = $('#fd-confirm-save');
  const editBtn = $('#fd-confirm-edit');
  const cancelBtn = $('#fd-confirm-cancel');

  const saveFn = async () => {
    saveBtn.removeEventListener('click', saveFn);
    await saveObservation(obs);
    addObservationMarker(obs);
    state.observations.push(obs);
    renderFieldDataPanel();
    $('#confirm-modal').classList.add('hidden');
    flyTo(obs.lat, obs.lng, 2000);
    showToast('success', '観測データを保存しました');
  };
  saveBtn.addEventListener('click', saveFn);
  editBtn.onclick = () => { $('#confirm-modal').classList.add('hidden'); showManualInputModal(obs); };
  cancelBtn.onclick = () => { $('#confirm-modal').classList.add('hidden'); };

  $('#confirm-modal').classList.remove('hidden');
}

function showManualInputModal(obs) {
  const sp = obs.species?.[0] || {};
  const nameInput = $('#fd-manual-name');
  const sciInput = $('#fd-manual-scientific');
  const catSelect = $('#fd-manual-category');
  const noteInput = $('#fd-manual-note');

  if (nameInput) nameInput.value = sp.name || '';
  if (sciInput) sciInput.value = sp.scientificName || '';
  if (catSelect) catSelect.value = sp.category || 'plant';
  if (noteInput) noteInput.value = obs.userNote || '';

  const saveBtn = $('#fd-manual-save');
  const saveFn = async () => {
    saveBtn.removeEventListener('click', saveFn);
    obs.species = [{
      name: nameInput?.value || '不明',
      scientificName: sciInput?.value || '',
      category: catSelect?.value || 'plant',
      confidence: 1.0, source: 'manual'
    }];
    obs.userNote = noteInput?.value || '';
    obs.pendingAIIdentification = false;
    obs.userCorrected = true;
    obs.correctedAt = new Date().toISOString();

    await saveObservation(obs);
    if (!state.observations.find(o => o.id === obs.id)) {
      addObservationMarker(obs);
      state.observations.push(obs);
    } else {
      await updateObservation(obs.id, obs);
    }
    renderFieldDataPanel();
    $('#manual-input-modal').classList.add('hidden');
    if (obs.lat && obs.lng) flyTo(obs.lat, obs.lng, 2000);
    showToast('success', '観測データを保存しました');
  };
  saveBtn.addEventListener('click', saveFn);

  $('#manual-input-modal').classList.remove('hidden');
}

function showExportModal() {
  const countEl = $('#fd-export-count');
  if (countEl) countEl.textContent = `${state.observations.length} 件のデータ`;

  const exportBtn = $('#fd-export-csv');
  if (exportBtn) {
    exportBtn.onclick = () => {
      const rows = state.observations.map(o => {
        const sp = o.species?.[0] || {};
        const id = o.identification?.primary || {};
        return {
          id: o.id, lat: o.lat, lng: o.lng, capturedAt: o.capturedAt,
          species: sp.name || '', scientificName: sp.scientificName || '',
          japanese_name: id.japaneseName || sp.japaneseName || '',
          category: sp.category || '', confidence: sp.confidence || '',
          confidence_tier: sp.confidenceTier || id.confidenceTier || '',
          family: id.family || sp.family || '',
          genus: id.genus || '',
          kingdom: id.kingdom || '',
          iucn_status: id.iucnStatus || sp.iucnStatus || '',
          gbif_taxon_key: id.gbifTaxonKey || '',
          cross_check_matched: sp.crossCheckMatched || id.crossCheckMatched || false,
          user_corrected: o.userCorrected || false,
          source: sp.source || '', note: o.userNote || '',
        };
      });
      const csv = Papa.unparse(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'forestscope_observations.csv';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      showToast('success', 'CSVをエクスポートしました');
      $('#export-modal').classList.add('hidden');
    };
  }
  $('#export-modal').classList.remove('hidden');
}

function showSettingsModal() {
  const keyInput = $('#fd-plantnet-key');
  const inatToggle = $('#fd-inat-toggle');
  if (keyInput) keyInput.value = localStorage.getItem('forestscope-plantnet-key') || '';
  if (inatToggle) inatToggle.checked = localStorage.getItem('forestscope-use-inaturalist') !== 'false';

  const saveBtn = $('#fd-settings-save');
  if (saveBtn) {
    saveBtn.onclick = () => {
      localStorage.setItem('forestscope-plantnet-key', keyInput?.value?.trim() || '');
      localStorage.setItem('forestscope-use-inaturalist', inatToggle?.checked ? 'true' : 'false');
      showToast('success', '設定を保存しました');
      $('#settings-modal').classList.add('hidden');
    };
  }
  $('#settings-modal').classList.remove('hidden');
}

function showPrivacyNotice() {
  if (localStorage.getItem('forestscope-privacy-accepted') === 'true') return;
  const modal = $('#privacy-modal');
  if (modal) modal.classList.remove('hidden');
}

// ============================================================
// OFFLINE HANDLING
// ============================================================
function setupOfflineHandling() {
  window.addEventListener('online', async () => {
    showToast('success', 'オンラインに復帰しました');
    const pending = state.observations.filter(o => o.pendingAIIdentification);
    for (const obs of pending) {
      const result = await identifySpecies(obs.imageBase64, obs.lat, obs.lng);
      if (result) {
        obs.species = result.species;
        obs.identification = result.identification;
        obs.pendingAIIdentification = false;
        await updateObservation(obs.id, obs);
        renderFieldDataPanel();
      }
    }
  });
  window.addEventListener('offline', () => { showToast('warning', 'オフラインです。データはローカルに保存されます。'); });
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(type, message) {
  const container = $('#toast-container');
  if (!container) return;
  const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="material-icons">${icons[type] || 'info'}</span><span>${message}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
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
      nav.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (tab === 'home') { closeBsheet(); currentBnavTab = 'home'; return; }
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
    case 'camera': renderBsheetCamera(content); break;
    case 'data': renderBsheetData(content); break;
    case 'regions': renderBsheetRegions(content); break;
    case 'settings': renderBsheetSettings(content); break;
  }
  sheet.classList.remove('hidden');
}

function closeBsheet() {
  const sheet = $('#bottom-sheet');
  if (sheet) sheet.classList.add('hidden');
}

function renderBsheetCamera(container) {
  const count = state.observations.length;
  const pendingCount = state.observations.filter(o => o.pendingAIIdentification).length;
  container.innerHTML = `
    <div class="bsheet-title"><span class="material-icons">photo_camera</span> 撮影 & データ追加</div>
    <button class="bsheet-camera-btn" id="bsheet-photo-btn"><span class="material-icons">add_a_photo</span> 📸 写真を撮影 / 選択</button>
    <button class="bsheet-batch-btn" id="bsheet-batch-btn"><span class="material-icons">inventory_2</span> 📦 一括インポート（数百枚対応）</button>
    <div class="upload-dropzone fd-dropzone" id="bsheet-dropzone">
      <span class="material-icons upload-icon">add_photo_alternate</span>
      <p>写真をドラッグ＆ドロップ</p><span class="upload-hint">JPG, PNG に対応 · GPS付き写真推奨</span>
    </div>
    <div class="bsheet-stats-grid">
      <div class="bsheet-stat"><div class="bsheet-stat-value">${count}</div><div class="bsheet-stat-label">観測データ</div></div>
      <div class="bsheet-stat"><div class="bsheet-stat-value">${pendingCount}</div><div class="bsheet-stat-label">AI判定保留</div></div>
    </div>
  `;
  container.querySelector('#bsheet-photo-btn').addEventListener('click', () => { $('#photo-input').click(); });
  container.querySelector('#bsheet-batch-btn').addEventListener('click', () => { closeBsheet(); $('#batch-input').click(); });
  const dz = container.querySelector('#bsheet-dropzone');
  dz.addEventListener('click', () => { $('#photo-input').click(); });
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => { dz.classList.remove('dragover'); });
  dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('dragover'); handlePhotoUpload(e.dataTransfer.files); });
}

function renderBsheetData(container) {
  const count = state.observations.length;
  let listHtml = count === 0
    ? '<div class="empty-state" style="padding:20px 0;"><span class="material-icons">photo_library</span><p>観測データはまだありません</p></div>'
    : state.observations.slice().reverse().map(obs => {
      const species = obs.species?.[0];
      const name = species?.name || '不明';
      const catIcon = species ? CATEGORY_ICONS[species.category] || 'help_outline' : 'photo_camera';
      return `<div class="fd-obs-item" data-obs-id="${obs.id}">
        <div class="fd-obs-thumb"><img src="${obs.imageBase64}" alt="" loading="lazy"></div>
        <div class="fd-obs-info"><div class="fd-obs-name">${name}</div><div class="fd-obs-meta">${formatDateTime(obs.capturedAt)}</div></div>
        ${obs.pendingAIIdentification ? '<span class="fd-obs-pending">🔄</span>' : `<div class="fd-obs-category-icon"><span class="material-icons">${catIcon}</span></div>`}
      </div>`;
    }).join('');

  container.innerHTML = `
    <div class="bsheet-title"><span class="material-icons">analytics</span> 観測データ（${count}件）</div>
    <div class="bsheet-obs-list">${listHtml}</div>
    <div class="bsheet-action-row">
      <button class="secondary-btn" id="bsheet-export-btn"><span class="material-icons">file_download</span> CSV出力</button>
      <button class="secondary-btn" id="bsheet-backup-btn"><span class="material-icons">cloud_download</span> バックアップ</button>
    </div>
  `;
  container.querySelectorAll('.fd-obs-item').forEach(item => {
    item.addEventListener('click', () => {
      const obs = state.observations.find(o => o.id === item.dataset.obsId);
      if (obs) { closeBsheet(); showObservationPopup(obs); flyTo(obs.lat, obs.lng, 2000); }
    });
  });
  container.querySelector('#bsheet-export-btn')?.addEventListener('click', () => { closeBsheet(); showExportModal(); });
  container.querySelector('#bsheet-backup-btn')?.addEventListener('click', async () => {
    const obs = await getAllObservations();
    const blob = new Blob([JSON.stringify(obs, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'forestscope_backup.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    showToast('success', 'バックアップをエクスポートしました');
  });
}

function renderBsheetRegions(container) {
  const regionsHtml = REGIONS_DATA.map(r => `
    <div class="bsheet-region-item" data-lat="${r.lat}" data-lng="${r.lng}" data-name="${r.name}">
      <span class="bsheet-region-flag">${r.flag}</span>
      <div class="bsheet-region-info"><div class="bsheet-region-name">${r.name}</div><div class="bsheet-region-stats">${r.trees} · ${r.area}</div></div>
      <div class="bsheet-region-bar"><div class="bsheet-region-bar-fill" data-target="${r.pct}" style="width: 0%;"></div></div>
    </div>
  `).join('');
  container.innerHTML = `
    <div class="bsheet-title"><span class="material-icons">forest</span> 地域別森林データ</div>
    <div class="bsheet-stats-grid">
      <div class="bsheet-stat"><div class="bsheet-stat-value">3.04T</div><div class="bsheet-stat-label">推定樹木数</div><div class="bsheet-stat-trend up"><span class="material-icons">trending_up</span> +0.3%</div></div>
      <div class="bsheet-stat"><div class="bsheet-stat-value">4.06B ha</div><div class="bsheet-stat-label">森林面積</div><div class="bsheet-stat-trend down"><span class="material-icons">trending_down</span> −4.7M/年</div></div>
      <div class="bsheet-stat"><div class="bsheet-stat-value">2.6Gt</div><div class="bsheet-stat-label">CO₂吸収量</div><div class="bsheet-stat-trend neutral"><span class="material-icons">trending_flat</span> 安定</div></div>
      <div class="bsheet-stat"><div class="bsheet-stat-value">73,300+</div><div class="bsheet-stat-label">樹種数</div><div class="bsheet-stat-trend up"><span class="material-icons">trending_up</span> +9,200</div></div>
    </div>
    <div class="bsheet-section-title">地域をタップして移動</div>
    ${regionsHtml}
  `;
  requestAnimationFrame(() => {
    setTimeout(() => { container.querySelectorAll('.bsheet-region-bar-fill').forEach(bar => { bar.style.width = bar.dataset.target + '%'; }); }, 100);
  });
  container.querySelectorAll('.bsheet-region-item').forEach(item => {
    item.addEventListener('click', () => {
      closeBsheet();
      flyToRegion(parseFloat(item.dataset.lat), parseFloat(item.dataset.lng));
      showToast('info', `${item.dataset.name} エリアにフォーカス`);
    });
  });
}

function renderBsheetSettings(container) {
  const plantNetKey = localStorage.getItem('forestscope-plantnet-key') || DEFAULT_PLANTNET_KEY;
  const useINat = localStorage.getItem('forestscope-use-inaturalist') !== 'false';
  const cesiumToken = localStorage.getItem('forestscope-cesium-token') || '';

  container.innerHTML = `
    <div class="bsheet-title"><span class="material-icons" style="color: var(--gm-text-tertiary);">settings</span> 設定</div>
    <div class="bsheet-section">
      <div class="bsheet-section-title">3D地形 (Cesium Ion)</div>
      <div class="fd-form-group">
        <label>Cesium Ion アクセストークン</label>
        <input type="password" id="bsheet-cesium-token" value="${cesiumToken}" placeholder="3D地形を有効にするにはトークンを入力">
      </div>
      <div class="fd-settings-hint" style="margin-bottom:12px;">
        <a href="https://ion.cesium.com/tokens" target="_blank" rel="noopener">ion.cesium.com</a> で無料取得（山や建物の3D表示に必要）
      </div>
    </div>
    <div class="bsheet-section">
      <div class="bsheet-section-title">AI 判定エンジン</div>
      <div class="fd-form-group"><label>Pl@ntNet API キー</label><input type="password" id="bsheet-plantnet-key" value="${plantNetKey}" placeholder="APIキーを入力..."></div>
      <div class="fd-settings-hint" style="margin-bottom:12px;"><a href="https://my.plantnet.org/" target="_blank" rel="noopener">my.plantnet.org</a> で取得</div>
      <div class="fd-toggle-row"><label>iNaturalist を使用</label><div class="fd-toggle"><input type="checkbox" id="bsheet-inat" ${useINat ? 'checked' : ''}><span class="fd-toggle-slider"></span></div></div>
    </div>
    <div class="bsheet-section">
      <div class="bsheet-section-title">データ管理</div>
      <div class="bsheet-action-row">
        <button class="secondary-btn" id="bsheet-import-btn"><span class="material-icons">cloud_upload</span> 復元</button>
        <button class="secondary-btn fd-danger-btn" id="bsheet-clear-btn"><span class="material-icons">delete_forever</span> 全削除</button>
      </div>
      <input type="file" id="bsheet-import-input" accept=".json" hidden>
    </div>
    <button class="primary-btn" style="background: var(--forest-primary); border-radius:10px;" id="bsheet-save-settings">
      <span class="material-icons">save</span> 設定を保存
    </button>
  `;

  container.querySelector('#bsheet-save-settings').addEventListener('click', () => {
    localStorage.setItem('forestscope-plantnet-key', container.querySelector('#bsheet-plantnet-key').value.trim());
    localStorage.setItem('forestscope-use-inaturalist', container.querySelector('#bsheet-inat').checked ? 'true' : 'false');
    const newToken = container.querySelector('#bsheet-cesium-token').value.trim();
    const oldToken = localStorage.getItem('forestscope-cesium-token') || '';
    localStorage.setItem('forestscope-cesium-token', newToken);
    showToast('success', '設定を保存しました');
    closeBsheet();
    if (newToken && newToken !== oldToken) {
      showToast('info', 'Cesium Ionトークンを適用するにはページを再読み込みしてください');
    }
  });

  container.querySelector('#bsheet-import-btn').addEventListener('click', () => { container.querySelector('#bsheet-import-input').click(); });
  container.querySelector('#bsheet-import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data)) throw new Error('Invalid');
      for (const obs of data) { await saveObservation(obs); }
      viewer.entities.removeAll();
      observationEntities = [];
      await loadObservationsToGlobe();
      showToast('success', `${data.length} 件のデータを復元しました`);
    } catch { showToast('error', '復元に失敗しました'); }
  });

  container.querySelector('#bsheet-clear-btn').addEventListener('click', async () => {
    if (!confirm('すべての観測データを削除しますか？')) return;
    await clearAllObservations();
    viewer.entities.removeAll();
    observationEntities = [];
    clusterEntities = [];
    state.observations = [];
    showToast('info', 'すべてのデータを削除しました');
    closeBsheet();
  });
}

// ============================================================
// BATCH IMPORT ENGINE
// ============================================================
const CONCURRENCY_LIMIT = 3;
const PLANTNET_RATE_LIMIT_MS = 1500;
let batchState = {
  running: false, paused: false, cancelled: false,
  total: 0, waiting: 0, processing: 0, success: 0, nogps: 0, failed: 0,
  noGpsQueue: [], // observations without GPS for later fix
  lastApiCall: 0,
};

function resetBatchState(total) {
  batchState = {
    running: true, paused: false, cancelled: false,
    total, waiting: total, processing: 0, success: 0, nogps: 0, failed: 0,
    noGpsQueue: [], lastApiCall: 0,
  };
}

function updateBatchUI() {
  const b = batchState;
  const done = b.success + b.nogps + b.failed;
  const pct = b.total > 0 ? Math.round((done / b.total) * 100) : 0;
  const fill = $('#batch-progress-fill'); if (fill) fill.style.width = pct + '%';
  const pctEl = $('#batch-progress-pct'); if (pctEl) pctEl.textContent = pct + '%';
  const w = $('#bc-waiting'); if (w) w.textContent = b.waiting;
  const p = $('#bc-processing'); if (p) p.textContent = b.processing;
  const s = $('#bc-success'); if (s) s.textContent = b.success;
  const n = $('#bc-nogps'); if (n) n.textContent = b.nogps;
  const f = $('#bc-failed'); if (f) f.textContent = b.failed;
}

function setBatchCurrentFile(name) {
  const el = $('#batch-current-file');
  if (el) el.textContent = name;
}

// Throttled API call — ensures minimum interval between Pl@ntNet calls
async function throttledIdentify(base64, lat, lng) {
  const now = Date.now();
  const wait = PLANTNET_RATE_LIMIT_MS - (now - batchState.lastApiCall);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  batchState.lastApiCall = Date.now();
  return identifySpecies(base64, lat, lng);
}

// Process a single image in the batch
async function processBatchItem(file, retryCount = 0) {
  if (batchState.cancelled) return;
  while (batchState.paused) {
    await new Promise(r => setTimeout(r, 500));
    if (batchState.cancelled) return;
  }

  batchState.waiting--;
  batchState.processing++;
  updateBatchUI();
  setBatchCurrentFile(file.name);

  try {
    const imageBase64 = await resizeImage(file);
    let lat = null, lng = null, capturedAt = null;

    // EXIF extraction
    try {
      const gps = await exifr.gps(file);
      if (gps && gps.latitude && gps.longitude) { lat = gps.latitude; lng = gps.longitude; }
      const exifData = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate']);
      if (exifData) {
        capturedAt = exifData.DateTimeOriginal || exifData.CreateDate || null;
        if (capturedAt instanceof Date) capturedAt = capturedAt.toISOString();
      }
    } catch (e) { /* EXIF failed, continue */ }

    if (!capturedAt) capturedAt = new Date().toISOString();

    const observation = {
      id: generateId(), imageBase64, lat, lng, capturedAt,
      createdAt: new Date().toISOString(), species: [], userNote: '',
      locationName: file.name, pendingAIIdentification: false,
    };

    // AI identification with retry for 429
    try {
      const result = await throttledIdentify(imageBase64, lat, lng);
      if (result) {
        observation.species = result.species;
        observation.identification = result.identification;
      } else {
        observation.pendingAIIdentification = !navigator.onLine;
      }
    } catch (apiErr) {
      if (apiErr?.status === 429 && retryCount < 3) {
        batchState.processing--;
        batchState.waiting++;
        updateBatchUI();
        await new Promise(r => setTimeout(r, 5000));
        return processBatchItem(file, retryCount + 1);
      }
      observation.pendingAIIdentification = true;
    }

    // Save to IndexedDB
    await saveObservation(observation);
    state.observations.push(observation);

    if (lat !== null && lng !== null) {
      addObservationMarker(observation);
      batchState.success++;
    } else {
      batchState.nogps++;
      batchState.noGpsQueue.push(observation);
    }
  } catch (err) {
    console.error('Batch item failed:', file.name, err);
    batchState.failed++;
  } finally {
    batchState.processing--;
    updateBatchUI();
  }
}

// Main batch processor with semaphore
async function processBatchImport(files) {
  const fileArr = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (fileArr.length === 0) { showToast('error', '画像ファイルが選択されていません'); return; }

  resetBatchState(fileArr.length);

  // Show modal
  const modal = $('#batch-import-modal');
  const totalText = $('#batch-total-text');
  const resultDiv = $('#batch-result');
  const actionsDiv = modal.querySelector('.batch-actions');
  if (totalText) totalText.textContent = `${fileArr.length}枚の画像を処理します`;
  if (resultDiv) resultDiv.classList.add('hidden');
  if (actionsDiv) actionsDiv.style.display = '';
  modal.classList.remove('hidden');
  updateBatchUI();

  // Bind pause/cancel
  const pauseBtn = $('#batch-pause-btn');
  const cancelBtn = $('#batch-cancel-btn');
  pauseBtn.onclick = () => {
    batchState.paused = !batchState.paused;
    pauseBtn.innerHTML = batchState.paused
      ? '<span class="material-icons">play_arrow</span> 再開'
      : '<span class="material-icons">pause</span> 一時停止';
  };
  cancelBtn.onclick = () => {
    batchState.cancelled = true;
    batchState.running = false;
    showBatchResult();
  };

  // Semaphore-based parallel processing
  let idx = 0;
  const workers = [];
  for (let w = 0; w < CONCURRENCY_LIMIT; w++) {
    workers.push((async () => {
      while (idx < fileArr.length && !batchState.cancelled) {
        const i = idx++;
        await processBatchItem(fileArr[i]);
      }
    })());
  }
  await Promise.all(workers);
  batchState.running = false;
  showBatchResult();
  renderFieldDataPanel();
  updateClustering();
}

function showBatchResult() {
  const b = batchState;
  const actionsDiv = document.querySelector('#batch-import-modal .batch-actions');
  if (actionsDiv) actionsDiv.style.display = 'none';

  const resultDiv = $('#batch-result');
  const statsDiv = $('#batch-result-stats');
  if (statsDiv) {
    statsDiv.innerHTML = `
      <div class="batch-result-row">✅ 成功: <strong>${b.success}</strong>枚</div>
      <div class="batch-result-row">⚠️ GPS無し: <strong>${b.nogps}</strong>枚</div>
      <div class="batch-result-row">❌ 失敗: <strong>${b.failed}</strong>枚</div>
      ${b.cancelled ? '<div class="batch-result-row" style="color:var(--gm-red);">⏹ 処理が中断されました</div>' : ''}
    `;
  }
  if (resultDiv) resultDiv.classList.remove('hidden');

  // GPS fix button
  const gpsBtn = $('#batch-gps-fix-btn');
  if (gpsBtn) {
    if (b.noGpsQueue.length > 0) {
      gpsBtn.style.display = '';
      gpsBtn.onclick = () => { $('#batch-import-modal').classList.add('hidden'); startGpsFixMode(b.noGpsQueue); };
    } else {
      gpsBtn.style.display = 'none';
    }
  }
  const doneBtn = $('#batch-done-btn');
  if (doneBtn) doneBtn.onclick = () => { $('#batch-import-modal').classList.add('hidden'); };

  setBatchCurrentFile(b.cancelled ? '中断されました' : '処理完了');
}

// ============================================================
// GPS FIX MODE
// ============================================================
let gpsFixQueue = [];
let gpsFixIndex = 0;

function startGpsFixMode(queue) {
  gpsFixQueue = queue;
  gpsFixIndex = 0;
  showGpsFixItem();
}

function showGpsFixItem() {
  if (gpsFixIndex >= gpsFixQueue.length) {
    endGpsFixMode();
    return;
  }
  const obs = gpsFixQueue[gpsFixIndex];
  const bar = $('#gps-fix-bar');
  const thumb = $('#gps-fix-thumb');
  const fname = $('#gps-fix-filename');
  const counter = $('#gps-fix-counter');
  if (bar) bar.classList.remove('hidden');
  if (thumb) thumb.src = obs.imageBase64;
  if (fname) fname.textContent = obs.locationName || obs.id;
  if (counter) counter.textContent = `${gpsFixIndex + 1} / ${gpsFixQueue.length}`;

  // Enter location picker mode for this observation
  state.locationPickerActive = true;
  state.pendingLocationObservation = obs;
  state._gpsFixMode = true;
  showToast('info', '地球上をタップして撮影地点を指定');
}

function gpsFixNext() {
  gpsFixIndex++;
  showGpsFixItem();
}

function endGpsFixMode() {
  const bar = $('#gps-fix-bar');
  if (bar) bar.classList.add('hidden');
  state.locationPickerActive = false;
  state.pendingLocationObservation = null;
  state._gpsFixMode = false;
  gpsFixQueue = [];
  gpsFixIndex = 0;
  showToast('success', 'GPS配置モードを終了しました');
  updateClustering();
}

// ============================================================
// MARKER CLUSTERING
// ============================================================
let clusterEntities = [];
const CLUSTER_DISTANCE_THRESHOLD = 0.05; // ~5km at equator

function updateClustering() {
  // Remove old clusters
  for (const ce of clusterEntities) {
    viewer.entities.remove(ce);
  }
  clusterEntities = [];

  const validObs = state.observations.filter(o => o.lat !== null && o.lng !== null);
  if (validObs.length < 10) {
    // Too few — show all markers normally
    for (const oe of observationEntities) {
      if (oe.entity) oe.entity.show = true;
    }
    return;
  }

  // Get camera height to determine cluster level
  const camHeight = viewer.camera.positionCartographic.height;

  // Don't cluster when zoomed in close
  if (camHeight < 50000) {
    for (const oe of observationEntities) {
      if (oe.entity) oe.entity.show = true;
    }
    return;
  }

  // Build clusters using simple grid
  const gridSize = camHeight > 5000000 ? 5 : camHeight > 1000000 ? 2 : camHeight > 200000 ? 0.5 : CLUSTER_DISTANCE_THRESHOLD;
  const clusters = new Map();

  for (const obs of validObs) {
    const gx = Math.floor(obs.lat / gridSize);
    const gy = Math.floor(obs.lng / gridSize);
    const key = `${gx}_${gy}`;
    if (!clusters.has(key)) clusters.set(key, []);
    clusters.get(key).push(obs);
  }

  // Hide individual markers that are in clusters
  const clusteredIds = new Set();
  for (const [, group] of clusters) {
    if (group.length < 2) continue;
    for (const obs of group) clusteredIds.add(obs.id);
  }

  for (const oe of observationEntities) {
    if (oe.entity) oe.entity.show = !clusteredIds.has(oe.id);
  }

  // Create cluster entities
  for (const [, group] of clusters) {
    if (group.length < 2) continue;
    const avgLat = group.reduce((s, o) => s + o.lat, 0) / group.length;
    const avgLng = group.reduce((s, o) => s + o.lng, 0) / group.length;

    const clusterCanvas = createClusterCanvas(group.length);
    const entity = viewer.entities.add({
      position: Cesium.Cartesian3.fromDegrees(avgLng, avgLat, 100),
      billboard: {
        image: clusterCanvas,
        verticalOrigin: Cesium.VerticalOrigin.CENTER,
        scale: 0.6,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      properties: { isCluster: true, clusterLat: avgLat, clusterLng: avgLng, clusterIds: group.map(o => o.id) },
    });
    clusterEntities.push(entity);
  }
}

function createClusterCanvas(count) {
  const canvas = document.createElement('canvas');
  canvas.width = 80; canvas.height = 80;
  const ctx = canvas.getContext('2d');

  // Circle background
  ctx.beginPath();
  ctx.arc(40, 40, 32, 0, Math.PI * 2);
  const grad = ctx.createRadialGradient(40, 40, 10, 40, 40, 32);
  grad.addColorStop(0, '#43a047');
  grad.addColorStop(1, '#1b5e20');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Count text
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px Google Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📷' + count, 40, 40);

  return canvas;
}

// Update clustering on camera move
function setupClusteringListener() {
  if (!viewer) return;
  let clusterTimer;
  viewer.camera.changed.addEventListener(() => {
    clearTimeout(clusterTimer);
    clusterTimer = setTimeout(() => { updateClustering(); }, 300);
  });
}

// ============================================================
// CAROUSEL POPUP (Multiple observations at same location)
// ============================================================
function showObservationPopupCarousel(obsIds) {
  const observations = obsIds.map(id => state.observations.find(o => o.id === id)).filter(Boolean);
  if (observations.length === 0) return;
  if (observations.length === 1) { showObservationPopup(observations[0]); return; }

  let currentIdx = 0;
  const body = $('#fd-popup-body');

  function renderSlide(idx) {
    const obs = observations[idx];
    const species = obs.species || [];
    const speciesHtml = species.length > 0
      ? species.map(s => `
        <div class="fd-popup-species">
          <span class="material-icons" style="color: var(--forest-accent);">${CATEGORY_ICONS[s.category] || 'eco'}</span>
          <div><strong>${s.name}</strong>
          <div style="font-size:11px; color:var(--gm-text-tertiary);">${s.scientificName || ''} · ${Math.round((s.confidence || 0) * 100)}% · ${s.source || ''}</div></div>
        </div>`).join('')
      : '<p style="color:var(--gm-text-tertiary);">種情報なし</p>';

    body.innerHTML = `
      <div class="carousel-nav">
        <button class="carousel-prev ${idx === 0 ? 'disabled' : ''}" id="carousel-prev"><span class="material-icons">chevron_left</span></button>
        <span class="carousel-counter">${idx + 1} / ${observations.length}</span>
        <button class="carousel-next ${idx === observations.length - 1 ? 'disabled' : ''}" id="carousel-next"><span class="material-icons">chevron_right</span></button>
      </div>
      <div class="fd-popup-img"><img src="${obs.imageBase64}" alt="observation photo"></div>
      <div class="fd-popup-details">
        <div class="fd-popup-section-title">種同定</div>
        ${speciesHtml}
        <div class="fd-popup-section-title" style="margin-top:12px;">位置情報</div>
        <p>緯度: ${obs.lat?.toFixed(6) || '不明'} / 経度: ${obs.lng?.toFixed(6) || '不明'}</p>
        <p>撮影日時: ${formatDateTime(obs.capturedAt)}</p>
      </div>
      <div class="fd-popup-actions">
        <button class="secondary-btn fd-danger-btn" id="fd-popup-delete"><span class="material-icons">delete</span> 削除</button>
      </div>
    `;

    body.querySelector('#carousel-prev')?.addEventListener('click', () => { if (idx > 0) { currentIdx--; renderSlide(currentIdx); } });
    body.querySelector('#carousel-next')?.addEventListener('click', () => { if (idx < observations.length - 1) { currentIdx++; renderSlide(currentIdx); } });
    body.querySelector('#fd-popup-delete')?.addEventListener('click', async () => {
      const obs = observations[currentIdx];
      await deleteObservation(obs.id);
      state.observations = state.observations.filter(o => o.id !== obs.id);
      const ent = observationEntities.find(e => e.id === obs.id);
      if (ent) { viewer.entities.remove(ent.entity); observationEntities = observationEntities.filter(e => e.id !== obs.id); }
      observations.splice(currentIdx, 1);
      if (observations.length === 0) { $('#observation-popup').classList.add('hidden'); }
      else { currentIdx = Math.min(currentIdx, observations.length - 1); renderSlide(currentIdx); }
      renderFieldDataPanel();
      updateClustering();
    });
  }

  renderSlide(0);
  $('#observation-popup').classList.remove('hidden');
}

// ============================================================
// ENHANCED GLOBE CLICK — cluster + carousel support
// ============================================================
// Override the original handleGlobeClick to support clusters
const _origHandleGlobeClick = typeof handleGlobeClick === 'function' ? handleGlobeClick : null;

// We re-assign handleGlobeClick below to add cluster support
(function patchGlobeClick() {
  const origFn = handleGlobeClick;
  window._handleGlobeClickPatched = function(screenPos) {
    const picked = viewer.scene.pick(screenPos);

    // Cluster click → zoom in
    if (picked && picked.id && picked.id.properties && picked.id.properties.isCluster) {
      const clusterLat = picked.id.properties.clusterLat.getValue();
      const clusterLng = picked.id.properties.clusterLng.getValue();
      const ids = picked.id.properties.clusterIds.getValue();
      const camHeight = viewer.camera.positionCartographic.height;
      if (camHeight < 100000) {
        // Already zoomed — show carousel
        showObservationPopupCarousel(ids);
      } else {
        // Zoom in to cluster
        flyTo(clusterLat, clusterLng, Math.max(camHeight / 4, 1000));
      }
      return;
    }

    // Normal observation click
    if (picked && picked.id && picked.id.properties && picked.id.properties.obsId) {
      const obsId = picked.id.properties.obsId.getValue();
      const obs = state.observations.find(o => o.id === obsId);
      if (obs) {
        // Check for nearby observations (within ~10m)
        const nearby = state.observations.filter(o =>
          o.id !== obs.id && o.lat !== null && o.lng !== null &&
          Math.abs(o.lat - obs.lat) < 0.0001 && Math.abs(o.lng - obs.lng) < 0.0001
        );
        if (nearby.length > 0) {
          showObservationPopupCarousel([obs.id, ...nearby.map(n => n.id)]);
        } else {
          showObservationPopup(obs);
        }
        return;
      }
    }

    // Location picker (GPS fix mode support)
    if (state.locationPickerActive && state.pendingLocationObservation) {
      const ray = viewer.camera.getPickRay(screenPos);
      const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
      if (cartesian) {
        const carto = Cesium.Cartographic.fromCartesian(cartesian);
        const lat = Cesium.Math.toDegrees(carto.latitude);
        const lng = Cesium.Math.toDegrees(carto.longitude);

        const obs = state.pendingLocationObservation;
        obs.lat = lat;
        obs.lng = lng;

        // Update in IndexedDB
        updateObservation(obs.id, { lat, lng });
        addObservationMarker(obs);
        showToast('success', `位置を設定: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);

        if (state._gpsFixMode) {
          // GPS fix mode — advance to next
          state.locationPickerActive = false;
          state.pendingLocationObservation = null;
          gpsFixNext();
        } else {
          $('#location-picker-hint').classList.add('hidden');
          state.locationPickerActive = false;
          state.pendingLocationObservation = null;
          runAIAndAutoSave(obs);
        }
      }
    }
  };
})();

// ============================================================
// BATCH INPUT BINDING + INIT HOOKS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Batch file input
  const batchInput = $('#batch-input');
  if (batchInput) {
    batchInput.addEventListener('change', e => {
      if (e.target.files && e.target.files.length > 0) {
        processBatchImport(e.target.files);
      }
      e.target.value = '';
    });
  }

  // Batch modal close
  const batchClose = document.querySelector('.batch-close');
  if (batchClose) {
    batchClose.addEventListener('click', () => {
      if (batchState.running) {
        if (confirm('処理中のインポートを中止しますか？')) {
          batchState.cancelled = true;
          batchState.running = false;
        }
      }
      $('#batch-import-modal').classList.add('hidden');
    });
  }

  // GPS fix buttons
  const gpsSkip = $('#gps-fix-skip');
  if (gpsSkip) gpsSkip.addEventListener('click', () => {
    state.locationPickerActive = false;
    state.pendingLocationObservation = null;
    gpsFixNext();
  });
  const gpsStop = $('#gps-fix-stop');
  if (gpsStop) gpsStop.addEventListener('click', endGpsFixMode);

  // Setup clustering listener
  setTimeout(setupClusteringListener, 3000);

  // Patch globe click handler for cluster/carousel support
  if (viewer && viewer.scene) {
    const handler2 = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler2.setInputAction(click => {
      if (window._handleGlobeClickPatched) {
        window._handleGlobeClickPatched(click.position);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
});
