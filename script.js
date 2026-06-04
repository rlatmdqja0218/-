const introScreen = document.querySelector("#introScreen");
const introCanvas = document.querySelector("#introCanvas");
const introCtx = introCanvas.getContext("2d");
const introFormButtons = document.querySelectorAll("[data-intro-form]");
const canvas = document.querySelector("#toolpathCanvas");
const ctx = canvas.getContext("2d");
const gcodeOutput = document.querySelector("#gcodeOutput");
const downloadButton = document.querySelector("#downloadButton");
const copyButton = document.querySelector("#copyButton");
const macroPreset = document.querySelector("#macroPreset");
const filamentPreset = document.querySelector("#filamentPreset");
const useGradientInput = document.querySelector("#useGradient");
const gradientSliders = document.querySelector("#gradientSliders");
const useZModInput = document.querySelector("#useZMod");
const zModSliders = document.querySelector("#zModSliders");
const geometryControlsPanel = document.querySelector("#geometryControlsPanel");
const imageControlsPanel = document.querySelector("#imageControlsPanel");
const imageModeUploader = document.querySelector("#imageModeUploader");
const imageUploadStatus = document.querySelector("#imageUploadStatus");
const modeSwitchButtons = document.querySelectorAll("[data-target-mode]");
const viewModeButtons = document.querySelectorAll("[data-view-mode]");
const settingsModeInputs = document.querySelectorAll('input[name="settingsMode"]');
const advancedSettingSections = document.querySelectorAll('[data-mode="advanced"]');
const patternTitle = document.querySelector("#patternTitle");
const pathCount = document.querySelector("#pathCount");
const lineLength = document.querySelector("#lineLength");
const gcodeSummary = document.querySelector("#gcodeSummary");

const state = {
  workspaceMode: "geometry",
  viewMode: "top",
  formFactor: "flat",
  patternMode: "weave",
  width: 120,
  height: 120,
  solidRadius: 40,
  solidHeight: 100,
  solidWidth: 80,
  solidDepth: 80,
  solidWeaveFrequency: 8,
  cylinderBaseEnabled: true,
  cylinderBaseLayers: 3,
  cylinderUpExtrusionBoost: 1.12,
  density: 1.6,
  spacing: 4.2,
  crossAngle: 90,
  weaveAmplitude: 1.4,
  useGradient: false,
  gradientStrength: 1.0,
  useZMod: false,
  zModAmplitude: 0.8,
  zModFrequency: 0.5,
  imageStrength: 1.0,
  travelSpeed: 7200,
  printSpeed: 900,
  extrusionMultiplier: 1.15,
  fanSpeed: 255,
  retractionLength: 1.0,
  retractionSpeed: 1800,
  layerHeight: 0.32,
  layers: 4,
  totalHeight: 1.28,
  nozzleDiameter: 0.4,
  filamentDiameter: 1.75,
  filamentDensity: 1.24,
  skirtCount: 2,
  skirtDistance: 5.0,
  bedTemp: 65,
  nozzleTemp: 235,
  originX: 128,
  originY: 128,
  macroPreset: "minimal",
  filamentPreset: "custom",
};

const previewState = { zoom: 1.0, offsetX: 0, offsetY: 0, isDragging: false, startX: 0, startY: 0 };

const patternNames = {
  grid: "직교 격자",
  weave: "직조 편향",
  mesh: "미세 메시",
};

const ultraWeave04Process = {
  nozzleDiameter: 0.4,
  layerHeight: 0.32,
  travelSpeed: 6000,
  spacing: 4.2,
  useZMod: true,
  zModAmplitude: 0.8,
};

const filamentPresets = {
  pla: {
    ...ultraWeave04Process,
    nozzleTemp: 230,
    bedTemp: 65,
    printSpeed: 900,
    extrusionMultiplier: 1.15,
    filamentDensity: 1.24,
    fanSpeed: 255,
  },
  petg: {
    ...ultraWeave04Process,
    nozzleTemp: 265,
    bedTemp: 75,
    printSpeed: 720,
    extrusionMultiplier: 1.12,
    filamentDensity: 1.27,
    fanSpeed: 102,
  },
  abs: {
    ...ultraWeave04Process,
    nozzleTemp: 270,
    bedTemp: 100,
    printSpeed: 900,
    extrusionMultiplier: 1.12,
    filamentDensity: 1.04,
    fanSpeed: 0,
  },
  tpu: {
    ...ultraWeave04Process,
    nozzleTemp: 235,
    bedTemp: 45,
    printSpeed: 600,
    extrusionMultiplier: 1.15,
    filamentDensity: 1.21,
    fanSpeed: 128,
  },
  silkPla: {
    ...ultraWeave04Process,
    nozzleTemp: 240,
    bedTemp: 65,
    printSpeed: 800,
    extrusionMultiplier: 1.18,
    filamentDensity: 1.24,
    fanSpeed: 255,
  },
  carbonPla: {
    ...ultraWeave04Process,
    nozzleTemp: 245,
    bedTemp: 65,
    printSpeed: 850,
    extrusionMultiplier: 1.12,
    filamentDensity: 1.3,
    fanSpeed: 153,
  },
  "ultraWeave0.4": {
    ...ultraWeave04Process,
    nozzleTemp: 235,
    bedTemp: 65,
    printSpeed: 900,
    extrusionMultiplier: 1.15,
    filamentDensity: 1.24,
    fanSpeed: 255,
  },
};

const filamentPresetParams = [
  "nozzleTemp",
  "bedTemp",
  "printSpeed",
  "travelSpeed",
  "extrusionMultiplier",
  "filamentDensity",
  "fanSpeed",
  "nozzleDiameter",
  "layerHeight",
  "spacing",
  "useZMod",
  "zModAmplitude",
];

const referenceCylinderA104Gcode =
  typeof window !== "undefined" && typeof window.REFERENCE_CYLINDER_A1_04_GCODE === "string"
    ? window.REFERENCE_CYLINDER_A1_04_GCODE
    : "";
const referenceCubeA104Gcode =
  typeof window !== "undefined" && typeof window.REFERENCE_CUBE_A1_04_GCODE === "string"
    ? window.REFERENCE_CUBE_A1_04_GCODE
    : "";
let referenceCylinderA104Cache = null;
let referenceCubeA104Cache = null;

function parseReferenceA104Data(gcode, family) {
  if (!gcode) return null;
  const points = [];
  let inModel = false;
  let feed = 0;
  let position = { x: 128, y: 128, z: 0 };
  let totalExtrusion = 0;
  let totalPrintDistance = 0;
  let totalPrintMinutes = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let maxZ = 0;

  const createPreviewPoint = (machinePoint, strokeType, extrusion = 0) => ({
    x: machinePoint.x - 128,
    y: machinePoint.y - 128,
    z: machinePoint.z,
    zBase: machinePoint.z,
    loopLift: strokeType === "up" ? 1 : 0,
    strokeType,
    extrusion,
    feed,
  });

  gcode.split(/\r?\n/).forEach((line) => {
    if (line.includes("; ===== begin model =====")) {
      inModel = true;
      return;
    }
    if (line.includes("; ===== End sequence =====")) {
      inModel = false;
      return;
    }
    if (!inModel || !/^G[01]\s/.test(line)) return;

    const words = {};
    line.replace(/([XYZEF])(-?\d+(?:\.\d+)?)/g, (match, key, value) => {
      words[key.toLowerCase()] = Number(value);
      return match;
    });
    if (Number.isFinite(words.f)) feed = words.f;

    const next = {
      x: Number.isFinite(words.x) ? words.x : position.x,
      y: Number.isFinite(words.y) ? words.y : position.y,
      z: Number.isFinite(words.z) ? words.z : position.z,
    };
    const extrusion = Number.isFinite(words.e) ? words.e : 0;

    if (extrusion > 0) {
      const distance = getPointDistance(position, next);
      const planarDistance = Math.hypot(next.x - position.x, next.y - position.y);
      const zDelta = next.z - position.z;
      const strokeType = planarDistance < 0.05 && zDelta > 0 ? "up" : zDelta < 0 ? "down" : "reference";

      if (!points.length) points.push(createPreviewPoint(position, strokeType));
      points.push(createPreviewPoint(next, strokeType, extrusion));
      totalExtrusion += extrusion;
      totalPrintDistance += distance;
      if (feed > 0) totalPrintMinutes += distance / feed;
      minX = Math.min(minX, next.x);
      maxX = Math.max(maxX, next.x);
      minY = Math.min(minY, next.y);
      maxY = Math.max(maxY, next.y);
      maxZ = Math.max(maxZ, next.z);
    }

    position = next;
  });

  const radius = Math.max(maxX - minX, maxY - minY) / 2;
  const width = maxX - minX;
  const depth = maxY - minY;
  const filamentArea = Math.PI * (state.filamentDiameter / 2) ** 2;
  const estimatedWeight = (totalExtrusion * filamentArea * state.filamentDensity) / 1000;
  const paths = [{ points, family, accent: false, layerIndex: 0, continuous: true }];

  return {
    text: gcode,
    paths,
    radius,
    width,
    depth,
    height: maxZ,
    totalExtrusion,
    totalMoves: Math.max(0, points.length - 1),
    totalPrintDistance,
    estimatedWeight,
    estimatedTime: formatEstimatedTime(totalPrintMinutes),
  };
}

function getReferenceCylinderA104Data() {
  if (referenceCylinderA104Cache) return referenceCylinderA104Cache;
  referenceCylinderA104Cache = parseReferenceA104Data(referenceCylinderA104Gcode, "referenceCylinder04");
  return referenceCylinderA104Cache;
}

function getReferenceCubeA104Data() {
  if (referenceCubeA104Cache) return referenceCubeA104Cache;
  referenceCubeA104Cache = parseReferenceA104Data(referenceCubeA104Gcode, "referenceCube04");
  return referenceCubeA104Cache;
}

function getReferenceA104DataForFormFactor(formFactor) {
  if (formFactor === "cylinder") return getReferenceCylinderA104Data();
  if (formFactor === "cube") return getReferenceCubeA104Data();
  return null;
}

function getReferenceA104Result(formFactor) {
  const reference = getReferenceA104DataForFormFactor(formFactor);
  if (!reference) return null;
  return {
    text: reference.text,
    totalExtrusion: reference.totalExtrusion,
    totalMoves: reference.totalMoves,
    estimatedWeight: reference.estimatedWeight,
    estimatedTime: reference.estimatedTime,
  };
}

const introPalette = [
  "rgba(17, 17, 17, 0.52)",
  "rgba(85, 85, 85, 0.38)",
  "rgba(255, 106, 0, 0.32)",
  "rgba(120, 125, 112, 0.3)",
];
const introLines = Array.from({ length: 54 }, (_, index) => ({
  yRatio: 0.2 + Math.random() * 0.62,
  xOffset: Math.random() * 900,
  speed: 0.018 + Math.random() * 0.034,
  lengthRatio: 0.24 + Math.random() * 0.42,
  amplitude: 1.2 + Math.random() * 5.4,
  frequency: 0.008 + Math.random() * 0.02,
  phase: Math.random() * Math.PI * 2,
  dotStep: 4 + Math.random() * 5,
  radius: 0.6 + Math.random() * 1.1,
  opacity: 0.42 + Math.random() * 0.42,
  color: introPalette[index % introPalette.length],
}));

let introAnimationFrame = 0;
let introIsRunning = false;
let uploadedImage = { data: null, width: 0, height: 0, name: "" };

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function fixed(value, digits = 3) {
  const output = Number(value).toFixed(digits);
  if (digits === 0) return output;
  return output.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function resizeIntroCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = introCanvas.getBoundingClientRect();
  introCanvas.width = Math.max(1, Math.round(rect.width * dpr));
  introCanvas.height = Math.max(1, Math.round(rect.height * dpr));
  introCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawIntroFrame(time) {
  const width = introCanvas.width / (window.devicePixelRatio || 1);
  const height = introCanvas.height / (window.devicePixelRatio || 1);

  introCtx.clearRect(0, 0, width, height);
  introCtx.fillStyle = "#f1f2f1";
  introCtx.fillRect(0, 0, width, height);

  introLines.forEach((line, index) => {
    const layerDrift = Math.sin(time * 0.00024 + index) * 18;
    const yBase = height * line.yRatio + layerDrift;
    const lineLength = width * line.lengthRatio;
    const travel = (time * line.speed + line.xOffset) % (width + lineLength * 1.6);
    const startX = travel - lineLength * 0.8;
    const endX = Math.min(width + 24, startX + lineLength);

    introCtx.beginPath();
    introCtx.strokeStyle = line.color;
    introCtx.globalAlpha = line.opacity * 0.42;
    introCtx.lineWidth = 0.55;

    for (let x = startX; x <= endX; x += line.dotStep) {
      const y = yBase + Math.sin(x * line.frequency + line.phase + time * 0.0012) * line.amplitude;
      if (x < -24 || x > width + 24) continue;
      if (x === startX) introCtx.moveTo(x, y);
      else introCtx.lineTo(x, y);
    }
    introCtx.stroke();

    introCtx.fillStyle = line.color;
    introCtx.globalAlpha = line.opacity;
    for (let x = startX; x <= endX; x += line.dotStep) {
      if (x < -24 || x > width + 24) continue;
      const y = yBase + Math.sin(x * line.frequency + line.phase + time * 0.0012) * line.amplitude;
      introCtx.beginPath();
      introCtx.arc(x, y, line.radius, 0, Math.PI * 2);
      introCtx.fill();
    }
  });

  introCtx.globalAlpha = 1;
  if (introIsRunning) {
    introAnimationFrame = window.requestAnimationFrame(drawIntroFrame);
  }
}

function startIntroAnimation() {
  resizeIntroCanvas();
  introIsRunning = true;
  introAnimationFrame = window.requestAnimationFrame(drawIntroFrame);
}

function stopIntroAnimation() {
  introIsRunning = false;
  if (introAnimationFrame) {
    window.cancelAnimationFrame(introAnimationFrame);
    introAnimationFrame = 0;
  }
}

function normalizeFormFactor(formFactor) {
  return ["flat", "cylinder", "cube"].includes(formFactor) ? formFactor : "flat";
}

function getPageMode() {
  return state.workspaceMode === "image" ? "image" : state.formFactor;
}

function syncModeDataset() {
  document.body.dataset.workspaceMode = state.workspaceMode;
  document.body.dataset.formFactor = state.formFactor;
  document.body.dataset.pageMode = getPageMode();
}

function syncModeSwitchButtons() {
  const activeMode = getPageMode();
  modeSwitchButtons.forEach((button) => {
    const isActive = button.dataset.targetMode === activeMode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function applyWorkspaceRoute(mode, formFactor = "flat", shouldRender = true) {
  resetPreviewView();
  state.workspaceMode = mode === "image" ? "image" : "geometry";
  state.formFactor = state.workspaceMode === "image" ? "flat" : normalizeFormFactor(formFactor);

  geometryControlsPanel.classList.toggle("hidden", state.workspaceMode !== "geometry");
  imageControlsPanel.classList.toggle("hidden", state.workspaceMode !== "image");
  if (isSolidFormFactor(state)) {
    state.useZMod = false;
    useZModInput.checked = false;
    zModSliders.classList.add("hidden");
  }
  syncModeDataset();
  syncParamInputs("formFactor", state.formFactor);
  setViewMode(state.formFactor === "cylinder" || state.formFactor === "cube" ? "iso" : "top", false);
  syncModeSwitchButtons();

  if (shouldRender) render();
}

function setFormFactor(formFactor, shouldRender = true) {
  applyWorkspaceRoute("geometry", formFactor, shouldRender);
}

function enterWorkspace(mode, formFactor = "flat") {
  applyWorkspaceRoute(mode, formFactor);
  stopIntroAnimation();
  introScreen.classList.add("is-exiting");
  document.body.classList.remove("intro-active");
  window.setTimeout(() => {
    introScreen.style.display = "none";
    drawPreview();
  }, 820);
}

function segmentLength(points) {
  return points.slice(1).reduce((total, point, index) => {
    const prev = points[index];
    return total + getPointDistance(prev, point);
  }, 0);
}

function getPointDistance(start, end) {
  return Math.hypot(end.x - start.x, end.y - start.y, (end.z || 0) - (start.z || 0));
}

function getLineSegment(angle, offset, width, height) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const nx = -Math.sin(angle);
  const ny = Math.cos(angle);
  const px = nx * offset;
  const py = ny * offset;
  const candidates = [];
  const halfW = width / 2;
  const halfH = height / 2;
  const epsilon = 0.0001;

  if (Math.abs(dx) > epsilon) {
    [-halfW, halfW].forEach((x) => {
      const t = (x - px) / dx;
      const y = py + dy * t;
      if (y >= -halfH - epsilon && y <= halfH + epsilon) {
        candidates.push({ x, y: clamp(y, -halfH, halfH), t });
      }
    });
  }

  if (Math.abs(dy) > epsilon) {
    [-halfH, halfH].forEach((y) => {
      const t = (y - py) / dy;
      const x = px + dx * t;
      if (x >= -halfW - epsilon && x <= halfW + epsilon) {
        candidates.push({ x: clamp(x, -halfW, halfW), y, t });
      }
    });
  }

  const unique = candidates
    .sort((a, b) => a.t - b.t)
    .filter((point, index, list) => {
      if (index === 0) return true;
      return Math.hypot(point.x - list[index - 1].x, point.y - list[index - 1].y) > 0.01;
    });

  if (unique.length < 2) return null;
  return [unique[0], unique[unique.length - 1]];
}

function subdividePolyline(points, maxStep = 1) {
  if (points.length < 2) return points;

  const subdivided = [points[0]];
  for (let i = 1; i < points.length; i += 1) {
    const start = points[i - 1];
    const end = points[i];
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const steps = Math.max(1, Math.ceil(distance / maxStep));

    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;
      subdivided.push({
        ...end,
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      });
    }
  }

  return subdivided;
}

function getGradientSpacing(baseSpacing, position, maxDistance, params) {
  if (!params.useGradient) return baseSpacing;

  const normalized = maxDistance > 0 ? Math.min(Math.abs(position) / maxDistance, 1) : 0;
  const strength = clamp(params.gradientStrength, 0.1, 3);
  const densityFactor = 1 + strength * (1 - normalized);
  return Math.max(0.45, baseSpacing / densityFactor);
}

function generateStraightSet(angle, spacing, width, height, phase = 0, params = state) {
  const diagonal = Math.hypot(width, height);
  const paths = [];
  let index = 0;
  let offset = -diagonal / 2;
  const shouldSubdivide = params.useZMod === true;
  const subdivisionStep = 2.5;

  while (offset <= diagonal / 2) {
    const segment = getLineSegment(angle, offset + phase, width, height);
    if (segment) {
      if (index % 2 === 1) segment.reverse();
      paths.push({
        points: shouldSubdivide ? subdividePolyline(segment, subdivisionStep) : segment,
        family: "straight",
      });
      index += 1;
    }
    offset += getGradientSpacing(spacing, offset, diagonal / 2, params);
  }

  return paths;
}

function generateWeaveSet(params, spacing) {
  const paths = [];
  const halfW = params.width / 2;
  const halfH = params.height / 2;
  const sampleCount = Math.max(18, Math.round(params.width));
  const period = Math.max(spacing * 2.4, 8);
  let rowIndex = 0;

  let y = -halfH;
  while (y <= halfH) {
    const points = [];
    const phase = rowIndex % 2 === 0 ? 0 : Math.PI;
    for (let i = 0; i <= sampleCount; i += 1) {
      const x = -halfW + (params.width * i) / sampleCount;
      const wave = Math.sin((x / period) * Math.PI * 2 + phase) * params.weaveAmplitude;
      points.push({ x, y: clamp(y + wave, -halfH, halfH) });
    }
    if (rowIndex % 2 === 1) points.reverse();
    paths.push({ points, family: "weave" });
    rowIndex += 1;
    y += getGradientSpacing(spacing, y, halfH, params);
  }

  return paths;
}

function getImageSample(x, y, params) {
  if (!uploadedImage.data || uploadedImage.width === 0 || uploadedImage.height === 0) {
    return { brightness: 1, imgX: 0, imgY: 0 };
  }

  const u = clamp((x + params.width / 2) / params.width, 0, 1);
  const v = clamp((y + params.height / 2) / params.height, 0, 1);
  const imgX = Math.min(uploadedImage.width - 1, Math.max(0, Math.floor(u * (uploadedImage.width - 1))));
  const imgY = Math.min(uploadedImage.height - 1, Math.max(0, Math.floor((1 - v) * (uploadedImage.height - 1))));
  const pixelIdx = imgY * uploadedImage.width + imgX;
  const brightness = uploadedImage.data[pixelIdx] !== undefined ? uploadedImage.data[pixelIdx] : 255;

  return { brightness: clamp(brightness / 255, 0, 1), imgX, imgY };
}

function sampleImageBrightness(x, y, params) {
  return getImageSample(x, y, params).brightness;
}

function getRowBrightness(y, params) {
  if (!uploadedImage.data) return 1;

  const samples = 18;
  let total = 0;
  for (let i = 0; i < samples; i += 1) {
    const x = -params.width / 2 + (params.width * i) / Math.max(samples - 1, 1);
    total += sampleImageBrightness(x, y, params);
  }

  return total / samples;
}

function generateImageModulationPaths(params, layerIndex = 0) {
  if (!uploadedImage.data) return [];

  const paths = [];
  const halfW = params.width / 2;
  const halfH = params.height / 2;
  const spacing = Math.max(0.6, params.spacing / params.density);
  const baseStep = Math.max(0.85, spacing * 0.42);
  const period = Math.max(spacing * 2.4, 8);
  const strength = clamp(params.imageStrength, 0.1, 3);
  const darkCutoff = clamp(0.22 - strength * 0.035, 0.08, 0.24);
  let rowIndex = 0;
  let y = -halfH;

  while (y <= halfH) {
    const rowBrightness = getRowBrightness(y, params);
    const phase = (rowIndex % 2 === 0 ? 0 : Math.PI) + layerIndex * 0.35;
    const rowStep = spacing / (0.72 + rowBrightness * strength * 0.55);
    let points = [];
    let pointIndex = 0;
    let x = -halfW;
    const pushLine = () => {
      if (points.length <= 1) return;
      const linePoints = rowIndex % 2 === 1 ? [...points].reverse() : [...points];
      paths.push({ points: linePoints, family: "imageLine" });
    };

    while (x <= halfW) {
      const { brightness } = getImageSample(x, y, params);
      const visible = brightness > darkCutoff;
      const localStep = baseStep / (0.55 + brightness * strength * 0.9);

      if (!visible) {
        pushLine();
        points = [];
        x += baseStep * 1.15;
        pointIndex += 1;
        continue;
      }

      const amplitude = params.weaveAmplitude * strength * brightness;
      const wave = Math.sin((x / period) * Math.PI * 2 + phase) * amplitude;
      const point = {
        x,
        y: clamp(y + wave, -halfH, halfH),
        brightness,
        radius: 0.45 + brightness * strength * 0.5,
      };
      points.push(point);

      if (brightness > 0.62) {
        const cadence = Math.max(3, Math.round(8 - brightness * strength * 2));
        if ((rowIndex * 19 + pointIndex * 7 + layerIndex * 5) % cadence === 0) {
          const dotLength = clamp(params.nozzleDiameter * (1.5 + brightness * strength), 0.55, spacing * 0.8);
          paths.push({
            points: [
              { x: clamp(x - dotLength / 2, -halfW, halfW), y: point.y, brightness, radius: point.radius },
              { x: clamp(x + dotLength / 2, -halfW, halfW), y: point.y, brightness, radius: point.radius },
            ],
            family: "imageDot",
          });
        }
      }

      x += clamp(localStep, 0.45, baseStep * 1.8);
      pointIndex += 1;
    }

    pushLine();
    rowIndex += 1;
    y += clamp(rowStep, spacing * 0.38, spacing * 1.35);
  }

  return paths;
}

function generateSkirtPaths(params) {
  const isCircularSolid = params.formFactor === "cylinder" || params.formFactor === "solid";
  if (isCircularSolid) {
    const nozzleDiameter = Math.max(0.1, params.nozzleDiameter || state.nozzleDiameter);
    const radius = Math.max(nozzleDiameter, params.solidRadius || state.solidRadius);
    const z = Math.max(0.05, params.layerHeight || state.layerHeight);
    const requestedCount = Math.max(
      1,
      Math.round(Number.isFinite(params.cylinderBaseLayers) ? params.cylinderBaseLayers : 3)
    );
    const count = Math.min(3, requestedCount);
    const outerRadius = radius + nozzleDiameter * (count - 1);
    const sampleCount = Math.max(180, Math.ceil((Math.PI * 2 * outerRadius) / nozzleDiameter));
    const paths = [];

    for (let loopIndex = 0; loopIndex < count; loopIndex += 1) {
      const loopRadius = radius + nozzleDiameter * (count - 1 - loopIndex);
      const points = [];

      for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
        const theta = (sampleIndex / sampleCount) * Math.PI * 2;
        points.push({
          x: Math.cos(theta) * loopRadius,
          y: Math.sin(theta) * loopRadius,
          z,
          theta,
          radius: loopRadius,
          layerIndex: 0,
          strokeType: "base",
          strokeProgress: sampleIndex / sampleCount,
        });
      }

      paths.push({ points, family: "circularBrim", accent: false, layerIndex: 0 });
    }

    return paths;
  }

  const paths = [];
  const count = Math.max(0, Math.round(params.skirtCount));
  const stepOut = params.nozzleDiameter * 1.2;
  const halfW = params.width / 2;
  const halfH = params.height / 2;

  for (let i = 0; i < count; i += 1) {
    const offset = params.skirtDistance + stepOut * i;
    const x = halfW + offset;
    const y = halfH + offset;
    const points = [
      { x: -x, y: -y },
      { x, y: -y },
      { x, y },
      { x: -x, y },
      { x: -x, y: -y },
    ];

    paths.push({ points, family: "skirt" });
  }

  return paths;
}

function generatePaths(params, layerIndex = 0) {
  const spacing = Math.max(0.6, params.spacing / params.density);
  const layerShift = (layerIndex % 2) * spacing * 0.5;

  if (params.patternMode === "grid") {
    return [
      ...generateStraightSet(0, spacing, params.width, params.height, layerShift, params),
      ...generateStraightSet(toRadians(params.crossAngle), spacing, params.width, params.height, -layerShift, params),
    ];
  }

  if (params.patternMode === "mesh") {
    return [
      ...generateStraightSet(0, spacing, params.width, params.height, layerShift, params),
      ...generateStraightSet(toRadians(params.crossAngle), spacing * 1.18, params.width, params.height, 0, params),
      ...generateStraightSet(toRadians(-params.crossAngle), spacing * 1.18, params.width, params.height, 0, params),
    ];
  }

  return [
    ...generateWeaveSet(params, spacing),
    ...generateStraightSet(toRadians(params.crossAngle), spacing * 1.65, params.width, params.height, layerShift, params),
  ];
}

function getAllLayerPaths(params) {
  if (isSolidFormFactor(params)) {
    return generateSolidToolpaths(params).map((path) => ({ ...path, layer: 0 }));
  }

  const paths = [];
  for (let layer = 0; layer < params.layers; layer += 1) {
    generateModePaths(params, layer).forEach((path) => {
      paths.push({ ...path, layer });
    });
  }
  return paths;
}

function generateModePaths(params, layerIndex = 0) {
  if (isSolidFormFactor(params)) {
    return generateSolidToolpaths(params);
  }

  if (params.workspaceMode === "image") {
    return generateImageModulationPaths(params, layerIndex);
  }

  return generatePaths(params, layerIndex);
}

function isSolidFormFactor(params) {
  return params.formFactor === "cylinder" || params.formFactor === "cube";
}

function getSolidLayerCount(params) {
  const layerHeight = Math.max(0.05, params.layerHeight || state.layerHeight);
  const solidHeight = Math.max(layerHeight, params.solidHeight || state.solidHeight);
  return Math.max(1, Math.ceil(solidHeight / layerHeight));
}

function getSolidTargetHeight(params) {
  const layerHeight = Math.max(0.05, params.layerHeight || state.layerHeight);
  return Math.max(layerHeight, params.solidHeight || state.solidHeight);
}

function getSolidZ(params, layerIndex, layerProgress) {
  const layerHeight = Math.max(0.05, params.layerHeight || state.layerHeight);
  const solidHeight = getSolidTargetHeight(params);
  return clamp((layerIndex + 1 + layerProgress) * layerHeight, layerHeight, solidHeight);
}

function generateSolidToolpaths(params) {
  if (params.formFactor === "cylinder") {
    const reference = getReferenceCylinderA104Data();
    if (reference) return reference.paths;
    if (isUltraWeavePreset(params)) {
      return generateCylinderSpiralToolpaths(params);
    }
    return generateCylinderToolpaths(params);
  }

  if (params.formFactor === "cube") {
    const reference = getReferenceCubeA104Data();
    if (reference) return reference.paths;
    return generateCubeToolpaths(params);
  }

  return [];
}

function isUltraWeavePreset(params) {
  return params.filamentPreset === "ultraWeave0.4";
}

function getSolidSurfaceSpacing(params) {
  return Math.max(1.2, (params.spacing || state.spacing) / Math.max(0.5, params.density || state.density));
}

function getSolidSurfaceStep(params) {
  return Math.max(0.9, (params.nozzleDiameter || state.nozzleDiameter) * 3.2);
}

function getSolidPatternFrequency(params) {
  return Math.max(1, Math.round(params.solidWeaveFrequency || state.solidWeaveFrequency));
}

function getCylinderColumnCount(params) {
  const frequency = getSolidPatternFrequency(params);
  const radius = Math.max(1, params.solidRadius || state.solidRadius);
  const nozzleDiameter = Math.max(0.2, params.nozzleDiameter || state.nozzleDiameter);
  const circumference = Math.PI * 2 * radius;
  const requestedSpacing = Math.max(nozzleDiameter * 2, params.spacing || state.spacing);
  const spacingLimitedColumns = Math.max(4, Math.floor(circumference / requestedSpacing));
  const lowFrequencyColumns = Math.max(4, Math.round(frequency * 2));
  return Math.min(spacingLimitedColumns, lowFrequencyColumns);
}

function getCylinderVerticalSteps(params, solidHeight) {
  const nozzleDiameter = Math.max(0.2, params.nozzleDiameter || state.nozzleDiameter);
  const verticalStep = Math.max(0.75, nozzleDiameter * 2.8);
  return Math.max(24, Math.ceil(solidHeight / verticalStep));
}

function wrapSurfaceU(u, surfaceWidth) {
  return ((u % surfaceWidth) + surfaceWidth) % surfaceWidth;
}

function getSurfaceSpacingAt(baseSpacing, position, maxDistance, params) {
  return getGradientSpacing(baseSpacing, position - maxDistance, maxDistance, params);
}

function getCubePerimeterPoint(width, depth, progress) {
  const halfW = width / 2;
  const halfD = depth / 2;
  const edge = progress * 4;
  const side = Math.min(3, Math.floor(edge));
  const local = edge - side;

  if (side === 0) return { x: -halfW + width * local, y: -halfD };
  if (side === 1) return { x: halfW, y: -halfD + depth * local };
  if (side === 2) return { x: halfW - width * local, y: halfD };
  return { x: -halfW, y: halfD - depth * local };
}

function getCubeSurfacePoint(u, z, width, depth, perimeter) {
  return {
    ...getCubePerimeterPoint(width, depth, wrapSurfaceU(u, perimeter) / perimeter),
    z,
  };
}

function createSolidSurfacePatternPaths(params, surfaceWidth, surfaceHeight, mapSurfacePoint, familyPrefix, surfaceOptions = {}) {
  const spacing = getSolidSurfaceSpacing(params);
  const step = getSolidSurfaceStep(params);
  const minZ = Math.max(0.05, params.layerHeight || state.layerHeight);
  const maxZ = Math.max(minZ, surfaceHeight);
  const waveFrequency = getSolidPatternFrequency(params);
  const waveAmplitude = clamp(spacing * 0.28, 0.4, 3.2);
  const paths = [];

  const addHorizontalRows = (options = {}) => {
    let rowIndex = 0;
    let z = minZ;
    while (z <= maxZ + 0.001) {
      const points = [];
      const uSteps = surfaceOptions.surfaceSegments || Math.max(32, Math.ceil(surfaceWidth / step));
      const phase = rowIndex % 2 === 0 ? 0 : Math.PI;
      for (let i = 0; i <= uSteps; i += 1) {
        const u = (surfaceWidth * i) / uSteps;
        const wave =
          options.weave && !surfaceOptions.useLoopingZ
            ? Math.sin((u / surfaceWidth) * Math.PI * 2 * waveFrequency + phase) * waveAmplitude
            : 0;
        points.push(mapSurfacePoint(u, clamp(z + wave, minZ, maxZ), { phaseShift: phase, family: "horizontal" }));
      }
      if (rowIndex % 2 === 1) points.reverse();
      paths.push({ points, family: `${familyPrefix}Horizontal`, accent: options.accent === true });
      rowIndex += 1;
      z += getSurfaceSpacingAt(spacing, z, maxZ / 2, params);
    }
  };

  const addVerticalColumns = (options = {}) => {
    const uLimit = surfaceWidth - 0.001;
    let columnIndex = 0;
    let u = 0;
    while (u <= uLimit) {
      const points = [];
      const zSteps = Math.max(18, Math.ceil((maxZ - minZ) / step));
      const phase = columnIndex % 2 === 0 ? 0 : Math.PI;
      for (let i = 0; i <= zSteps; i += 1) {
        const t = i / zSteps;
        const z = minZ + (maxZ - minZ) * t;
        const wave = options.weave ? Math.sin(t * Math.PI * 2 * waveFrequency + phase) * waveAmplitude : 0;
        points.push(mapSurfacePoint(u + wave, z, { phaseShift: phase, family: "vertical" }));
      }
      if (columnIndex % 2 === 1) points.reverse();
      paths.push({ points, family: `${familyPrefix}Vertical`, accent: options.accent !== false });
      columnIndex += 1;
      u += getSurfaceSpacingAt(spacing, u, surfaceWidth / 2, params);
    }
  };

  const addDiagonalSet = (direction, options = {}) => {
    const zSteps = Math.max(24, Math.ceil((maxZ - minZ) / step));
    const slope = surfaceWidth / Math.max(maxZ - minZ, 1) / Math.max(1, 90 / Math.max(15, params.crossAngle || state.crossAngle));
    let lineIndex = 0;
    for (let startU = 0; startU < surfaceWidth; startU += spacing * (options.dense ? 0.92 : 1.18)) {
      const points = [];
      const phase = lineIndex % 2 === 0 ? 0 : Math.PI;
      for (let i = 0; i <= zSteps; i += 1) {
        const t = i / zSteps;
        const z = minZ + (maxZ - minZ) * t;
        const weaveOffset = options.weave ? Math.sin(t * Math.PI * 2 * waveFrequency + phase) * waveAmplitude * 0.42 : 0;
        points.push(mapSurfacePoint(startU + direction * (z - minZ) * slope + weaveOffset, z, { phaseShift: phase, family: "diagonal" }));
      }
      if (lineIndex % 2 === 1) points.reverse();
      paths.push({ points, family: `${familyPrefix}Diagonal`, accent: true });
      lineIndex += 1;
    }
  };

  if (params.patternMode === "grid") {
    addHorizontalRows();
    addVerticalColumns();
    return paths;
  }

  if (params.patternMode === "mesh") {
    addHorizontalRows({ accent: false });
    addDiagonalSet(1, { dense: true });
    addDiagonalSet(-1, { dense: true });
    return paths;
  }

  addHorizontalRows({ weave: true });
  addVerticalColumns({ weave: true });
  addDiagonalSet(1, { weave: true });
  return paths;
}

function generateCylinderToolpaths(params) {
  const radius = Math.max(1, params.solidRadius || state.solidRadius);
  const minZ = Math.max(0.05, params.layerHeight || state.layerHeight);
  const layerHeight = Math.max(0.05, params.layerHeight || state.layerHeight);
  const nozzleDiameter = Math.max(0.2, params.nozzleDiameter || state.nozzleDiameter);
  const localLift = clamp(params.weaveAmplitude || state.weaveAmplitude, 0.5, 1.4);
  const minimumPitch = Math.max(layerHeight, nozzleDiameter * 1.1);
  const maximumPitch = Math.max(minimumPitch, localLift * 0.75);
  const verticalPitch = clamp((params.spacing || state.spacing) * 0.08, minimumPitch, maximumPitch);
  const diagonalRadius = radius + localLift * 0.3;
  const segments = getCylinderColumnCount(params);
  const solidHeight = getSolidTargetHeight(params);
  const layerCount = Math.max(1, Math.floor(Math.max(0, solidHeight - minZ - localLift) / verticalPitch) + 1);
  const zSampleStep = clamp(localLift / 6, 0.18, 0.3);
  const layerBuildStep = verticalPitch / segments;
  const upSteps = Math.max(2, Math.round(localLift / zSampleStep));
  const downSteps = Math.max(2, Math.round((localLift - layerBuildStep) / zSampleStep));
  const segmentAngle = (Math.PI * 2) / segments;
  const baseEnabled = params.cylinderBaseEnabled !== false;
  const paths = baseEnabled ? generateSkirtPaths(params) : [];

  for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
    const zBase = minZ + layerIndex * verticalPitch;
    const points = [];

    const pushPolarPoint = ({ theta, zHeight, segmentBase, segmentIndex, strokeType, progress, pointRadius }) => {
      const liftRatio = clamp((zHeight - segmentBase) / localLift, 0, 1);
      const r = Math.max(0.1, pointRadius);
      points.push({
        x: Math.cos(theta) * r,
        y: Math.sin(theta) * r,
        z: zHeight,
        zBase: segmentBase,
        layerBase: zBase,
        theta,
        zPhase: layerIndex * Math.PI + segmentIndex * Math.PI,
        wave: liftRatio * 2 - 1,
        radialCushion: strokeType === "down" ? 1 : 0,
        radius: r,
        loopLift: liftRatio,
        columnIndex: segmentIndex,
        layerIndex,
        strokeType,
        heightProgress: clamp((zHeight - minZ) / Math.max(0.001, getSolidTargetHeight(params) - minZ), 0, 1),
        strokeProgress: progress,
      });
    };

    for (let segmentOrder = 0; segmentOrder < segments; segmentOrder += 1) {
      const segmentIndex = (segments - segmentOrder) % segments;
      const segmentBase = zBase + segmentOrder * layerBuildStep;
      const handoffBase = segmentBase + layerBuildStep;
      const segmentTop = segmentBase + localLift;
      const theta = -segmentOrder * segmentAngle;
      const prevTheta = theta - segmentAngle;

      const upStartIndex = segmentOrder === 0 ? 0 : 1;
      for (let upIndex = upStartIndex; upIndex <= upSteps; upIndex += 1) {
        const upProgress = upIndex / upSteps;
        pushPolarPoint({
          theta,
          zHeight: segmentBase + localLift * upProgress,
          segmentBase,
          segmentIndex,
          strokeType: "up",
          progress: upProgress,
          pointRadius: radius,
        });
      }

      for (let downIndex = 1; downIndex <= downSteps; downIndex += 1) {
        const downProgress = downIndex / downSteps;
        pushPolarPoint({
          theta: theta + (prevTheta - theta) * downProgress,
          zHeight: segmentTop + (handoffBase - segmentTop) * downProgress,
          segmentBase,
          segmentIndex,
          strokeType: "down",
          progress: downProgress,
          pointRadius: diagonalRadius,
        });
      }
    }

    paths.push({ points, family: "cylinderVerticalDrop", accent: layerIndex % 2 === 1, layerIndex });
  }

  return paths;
}

function getCylinderSpiralTurnCount(params) {
  const minZ = Math.max(0.05, params.layerHeight || state.layerHeight);
  const solidHeight = getSolidTargetHeight(params);
  const spiralPitch = Math.max(minZ, params.spacing || state.spacing);
  return Math.max(1, Math.ceil(Math.max(0.001, solidHeight - minZ) / spiralPitch));
}

function generateCylinderSpiralToolpaths(params) {
  const radius = Math.max(1, params.solidRadius || state.solidRadius);
  const minZ = Math.max(0.05, params.layerHeight || state.layerHeight);
  const solidHeight = getSolidTargetHeight(params);
  const heightRange = Math.max(0.001, solidHeight - minZ);
  const amplitude = clamp(params.zModAmplitude || state.zModAmplitude, 0.05, 1.4);
  const waveFrequency = Math.max(1, Math.round(getSolidPatternFrequency(params) * 0.5));
  const totalTurns = getCylinderSpiralTurnCount(params);
  const totalAngle = totalTurns * Math.PI * 2;
  const circumference = Math.PI * 2 * radius;
  const nozzleDiameter = Math.max(0.2, params.nozzleDiameter || state.nozzleDiameter);
  const samplesPerTurn = Math.max(120, Math.ceil(circumference / Math.max(0.6, nozzleDiameter * 1.5)));
  const totalSamples = totalTurns * samplesPerTurn;
  const baseEnabled = params.cylinderBaseEnabled !== false;
  const points = baseEnabled ? generateSkirtPaths(params).flatMap((path) => path.points.map((point) => ({ ...point }))) : [];

  for (let sampleIndex = 0; sampleIndex <= totalSamples; sampleIndex += 1) {
    const progress = sampleIndex / totalSamples;
    const cumulativeAngle = progress * totalAngle;
    const wavePhase = cumulativeAngle * waveFrequency;
    const wave = Math.sin(wavePhase);
    const waveSlope = Math.cos(wavePhase);
    const baseZ = minZ + progress * heightRange;
    const z = clamp(baseZ + wave * amplitude, minZ, solidHeight);
    const layerIndex = Math.min(totalTurns - 1, Math.floor(progress * totalTurns));
    const point = {
      x: Math.cos(cumulativeAngle) * radius,
      y: Math.sin(cumulativeAngle) * radius,
      z,
      zBase: baseZ,
      layerBase: minZ + layerIndex * (heightRange / totalTurns),
      theta: cumulativeAngle,
      cumulativeAngle,
      wave,
      waveSlope,
      radius,
      loopLift: (wave + 1) / 2,
      columnIndex: sampleIndex % samplesPerTurn,
      layerIndex,
      strokeType: "spiral",
      extrusionPulse: waveSlope >= 0 ? 1.15 : 0.75,
      heightProgress: progress,
      strokeProgress: (sampleIndex % samplesPerTurn) / samplesPerTurn,
    };

    const previous = points[points.length - 1];
    if (previous && getPointDistance(previous, point) < 0.0001) continue;
    points.push(point);
  }

  return [{ points, family: "cylinderSpiral", accent: true, layerIndex: 0, continuous: true }];
}

function generateCubeToolpaths(params) {
  const solidWidth = Math.max(1, params.solidWidth || state.solidWidth);
  const solidDepth = Math.max(1, params.solidDepth || state.solidDepth);
  const perimeter = (solidWidth + solidDepth) * 2;
  const solidHeight = getSolidTargetHeight(params);
  return createSolidSurfacePatternPaths(
    params,
    perimeter,
    solidHeight,
    (u, z) => getCubeSurfacePoint(u, z, solidWidth, solidDepth, perimeter),
    "cube"
  );
}

function getStats(paths) {
  const length = paths.reduce((total, path) => total + segmentLength(path.points), 0);
  const moves = paths.reduce((total, path) => total + Math.max(path.points.length - 1, 0), 0);
  return { length, moves };
}

function getPreviewZHeight(point, path, pointIndex, params) {
  if (!params.useZMod || path.family === "skirt") return 0;

  const baseZ = params.layerHeight;
  return getZModulatedHeight(baseZ, point, params) - baseZ;
}

function applyPreviewTransform(x, y, centerX, centerY) {
  return {
    x: (x - centerX) * previewState.zoom + centerX + previewState.offsetX,
    y: (y - centerY) * previewState.zoom + centerY + previewState.offsetY,
  };
}

function projectPreviewPoint(point, path, pointIndex, params, centerX, centerY, scale) {
  if (params.viewMode === "iso") {
    const isoX = (point.x - point.y) * Math.cos(Math.PI / 6);
    const isSolidPoint = params.formFactor === "cylinder" || params.formFactor === "cube";
    const zHeight = isSolidPoint && Number.isFinite(point.z) ? point.z : getPreviewZHeight(point, path, pointIndex, params);
    const zWeight = isSolidPoint ? 12 : 24;
    const isoY = (point.x + point.y) * Math.sin(Math.PI / 6) - zHeight * zWeight;
    return applyPreviewTransform(centerX + isoX * scale, centerY + isoY * scale, centerX, centerY);
  }

  return applyPreviewTransform(centerX + point.x * scale, centerY - point.y * scale, centerX, centerY);
}

function getFormFactorName(formFactor) {
  if (formFactor === "cylinder") return "원통 세로 직조 조형";
  if (formFactor === "cube") return "육면체 외벽 조형";
  return "평면판";
}

function projectSolidPoint(point, params, centerX, centerY, scale) {
  return projectPreviewPoint(point, { family: "solid" }, 0, params, centerX, centerY, scale);
}

function getSolidFootprintPoints(params) {
  if (params.formFactor === "cylinder") {
    const radius = Math.max(1, params.solidRadius || state.solidRadius);
    const points = [];
    for (let i = 0; i <= 96; i += 1) {
      const theta = (i / 96) * Math.PI * 2;
      points.push({ x: Math.cos(theta) * radius, y: Math.sin(theta) * radius, z: 0 });
    }
    return points;
  }

  const solidWidth = Math.max(1, params.solidWidth || state.solidWidth);
  const solidDepth = Math.max(1, params.solidDepth || state.solidDepth);
  const halfW = solidWidth / 2;
  const halfD = solidDepth / 2;
  return [
    { x: -halfW, y: -halfD, z: 0 },
    { x: halfW, y: -halfD, z: 0 },
    { x: halfW, y: halfD, z: 0 },
    { x: -halfW, y: halfD, z: 0 },
    { x: -halfW, y: -halfD, z: 0 },
  ];
}

function mixPreviewColor(start, end, amount) {
  const value = clamp(amount, 0, 1);
  const mixed = start.map((channel, index) => Math.round(channel + (end[index] - channel) * value));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

function getCylinderPreviewLiftRatio(point) {
  if (Number.isFinite(point.loopLift)) return clamp(point.loopLift, 0, 1);
  if (!Number.isFinite(point.z) || !Number.isFinite(point.zBase)) return 0;

  const amplitude = Math.max(0.001, state.weaveAmplitude || 0.001);
  return clamp((point.z - point.zBase) / amplitude, 0, 1);
}

function drawCylinderPreviewPath(path, centerX, centerY, scale, stride, params = state) {
  const sampledPoints = path.points.filter((point, index) => index % stride === 0 || index === path.points.length - 1);
  if (sampledPoints.length < 2) return;

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let index = 1; index < sampledPoints.length; index += 1) {
    const prevPoint = sampledPoints[index - 1];
    const nextPoint = sampledPoints[index];
    const prevProjected = projectPreviewPoint(prevPoint, path, index - 1, params, centerX, centerY, scale);
    const nextProjected = projectPreviewPoint(nextPoint, path, index, params, centerX, centerY, scale);
    const liftRatio = (getCylinderPreviewLiftRatio(prevPoint) + getCylinderPreviewLiftRatio(nextPoint)) / 2;
    const layerRatio = clamp(((prevPoint.z || 0) + (nextPoint.z || 0)) / Math.max(1, getSolidTargetHeight(params) * 2), 0, 1);
    const isUpStroke = nextPoint.strokeType === "up";
    const isSpiral = nextPoint.strokeType === "spiral";
    const isReference = path.family === "referenceCylinder04" || path.family === "referenceCube04";
    const isRisingSpiral = isSpiral && nextPoint.waveSlope >= 0;
    const useRisingStyle = isUpStroke || isRisingSpiral;
    const startX = isUpStroke ? prevProjected.x + (nextProjected.x - prevProjected.x) * 0.18 : prevProjected.x;
    const startY = isUpStroke ? prevProjected.y + (nextProjected.y - prevProjected.y) * 0.18 : prevProjected.y;
    const endX = isUpStroke ? prevProjected.x + (nextProjected.x - prevProjected.x) * 0.82 : nextProjected.x;
    const endY = isUpStroke ? prevProjected.y + (nextProjected.y - prevProjected.y) * 0.82 : nextProjected.y;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle =
      useRisingStyle
        ? mixPreviewColor([154, 90, 46], [205, 132, 74], liftRatio * 0.55)
        : mixPreviewColor([17, 17, 17], [78, 78, 78], liftRatio * 0.24);
    ctx.globalAlpha = isSpiral
      ? 0.92
      : isReference
        ? 0.92
      : isUpStroke
        ? 0.68
        : clamp(0.94 - liftRatio * 0.38 + layerRatio * 0.08, 0.42, 0.98);
    ctx.lineWidth = isReference
      ? isUpStroke
        ? 1.1
        : 0.84
      : isSpiral
      ? isRisingSpiral
        ? 1.08
        : 0.82
      : isUpStroke
        ? 0.9
        : clamp(1.2 - liftRatio * 0.36 + layerRatio * 0.1, 0.68, 1.45);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawSolidPreviewScene(width, height) {
  const margin = 38;
  const reference = getReferenceA104DataForFormFactor(state.formFactor);
  const previewParams = reference
    ? {
        ...state,
        solidRadius: reference.radius,
        solidWidth: reference.width,
        solidDepth: reference.depth,
        solidHeight: reference.height,
      }
    : state;
  const footprintSize =
    state.formFactor === "cylinder"
      ? Math.max(1, previewParams.solidRadius) * 2 + previewParams.nozzleDiameter * 6
      : Math.hypot(Math.max(1, state.solidWidth), Math.max(1, state.solidDepth));
  const projectedWidth = state.viewMode === "iso" ? footprintSize * Math.cos(Math.PI / 6) * 2 : footprintSize;
  const zPreviewWeight = state.viewMode === "iso" ? 12 : 1;
  const projectedHeight =
    state.viewMode === "iso" ? footprintSize * Math.sin(Math.PI / 6) + getSolidTargetHeight(previewParams) * zPreviewWeight : footprintSize;
  const scale = Math.min((width - margin * 2) / projectedWidth, (height - margin * 2) / projectedHeight) * 0.88;
  const centerX = width / 2;
  const centerY =
    state.viewMode === "iso" ? height / 2 + getSolidTargetHeight(previewParams) * zPreviewWeight * scale * 0.42 : height / 2;
  const paths = generateSolidToolpaths(previewParams);
  const stats = getStats(paths);
  const footprint = getSolidFootprintPoints(previewParams);

  ctx.save();
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  footprint.forEach((point, index) => {
    const projected = projectSolidPoint(point, previewParams, centerX, centerY, scale);
    if (index === 0) ctx.moveTo(projected.x, projected.y);
    else ctx.lineTo(projected.x, projected.y);
  });
  ctx.stroke();

  if (state.viewMode === "iso") {
    const top = footprint.map((point) => ({ ...point, z: getSolidTargetHeight(previewParams) }));
    ctx.beginPath();
    top.forEach((point, index) => {
      const projected = projectSolidPoint(point, previewParams, centerX, centerY, scale);
      if (index === 0) ctx.moveTo(projected.x, projected.y);
      else ctx.lineTo(projected.x, projected.y);
    });
    ctx.strokeStyle = "#e5e5e5";
    ctx.stroke();
  }

  paths.forEach((path, index) => {
    const stride = Math.max(1, Math.floor(path.points.length / 9000));
    if (state.formFactor === "cylinder" || path.family === "referenceCube04") {
      drawCylinderPreviewPath(path, centerX, centerY, scale, stride, previewParams);
      return;
    }

    ctx.beginPath();
    path.points.forEach((point, pointIndex) => {
      if (pointIndex % stride !== 0 && pointIndex !== path.points.length - 1) return;
      const projected = projectPreviewPoint(point, path, pointIndex, state, centerX, centerY, scale);
      if (pointIndex === 0) ctx.moveTo(projected.x, projected.y);
      else ctx.lineTo(projected.x, projected.y);
    });
    ctx.strokeStyle = path.accent ? "#9a5a2e" : index % 2 ? "#555555" : "#111111";
    ctx.lineWidth = path.accent ? 0.9 : 1.05;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  });

  ctx.fillStyle = "#111";
  ctx.font = "12px ui-sans-serif, system-ui";
  const solidLabel = reference
    ? `Reference A1 0.4 ${state.formFactor === "cube" ? "Cube" : "Cylinder"} / ${reference.totalMoves} exact moves / H ${fixed(reference.height, 1)} mm`
    : state.formFactor === "cylinder"
      ? isUltraWeavePreset(state)
        ? `${getFormFactorName(state.formFactor)} / continuous spiral / ${getCylinderSpiralTurnCount(state)} turns`
        : `${getFormFactorName(state.formFactor)} / ${paths.length} layers / ${getCylinderColumnCount(state)} columns`
      : `${getFormFactorName(state.formFactor)} / ${patternNames[state.patternMode]} / H ${fixed(getSolidTargetHeight(state), 1)} mm`;
  ctx.fillText(
    solidLabel,
    margin,
    height - margin * 0.62
  );
  ctx.restore();

  patternTitle.textContent = reference
    ? `${getFormFactorName(state.formFactor)} · 원본 G-code 0.4 ${state.formFactor === "cube" ? "정사각 투영" : "변환"}`
    : state.formFactor === "cylinder"
      ? isUltraWeavePreset(state)
        ? `${getFormFactorName(state.formFactor)} · 연속 나선 직조`
        : getFormFactorName(state.formFactor)
      : `${getFormFactorName(state.formFactor)} · ${patternNames[state.patternMode]}`;
  pathCount.textContent = `${paths.length} paths`;
  lineLength.textContent = `${Math.round(stats.length)} mm`;
}

function drawPreview() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const width = rect.width;
  const height = rect.height;
  ctx.clearRect(0, 0, width, height);

  if (isSolidFormFactor(state)) {
    drawSolidPreviewScene(width, height);
    return;
  }

  const margin = 38;
  const projectedWidth = state.viewMode === "iso" ? (state.width + state.height) * Math.cos(Math.PI / 6) : state.width;
  const projectedHeight =
    state.viewMode === "iso" ? (state.width + state.height) * Math.sin(Math.PI / 6) + state.zModAmplitude * 24 : state.height;
  const baseScale = Math.min((width - margin * 2) / projectedWidth, (height - margin * 2) / projectedHeight);
  const scale = state.viewMode === "iso" ? baseScale * 0.8 : baseScale;
  const centerX = width / 2;
  const centerY = state.viewMode === "iso" ? height / 2 + 42 : height / 2;
  const halfW = (state.width * scale) / 2;
  const halfH = (state.height * scale) / 2;
  const paths = generateModePaths(state, 0);
  const stats = getStats(paths);

  ctx.save();
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = 1;
  if (state.viewMode === "iso") {
    const footprint = [
      { x: -state.width / 2, y: -state.height / 2 },
      { x: state.width / 2, y: -state.height / 2 },
      { x: state.width / 2, y: state.height / 2 },
      { x: -state.width / 2, y: state.height / 2 },
      { x: -state.width / 2, y: -state.height / 2 },
    ].map((point) => projectPreviewPoint(point, { family: "footprint" }, 0, { ...state, useZMod: false }, centerX, centerY, scale));

    ctx.beginPath();
    footprint.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();
  } else {
    ctx.strokeRect(centerX - halfW, centerY - halfH, halfW * 2, halfH * 2);

    ctx.beginPath();
    ctx.moveTo(centerX - halfW, centerY);
    ctx.lineTo(centerX + halfW, centerY);
    ctx.moveTo(centerX, centerY - halfH);
    ctx.lineTo(centerX, centerY + halfH);
    ctx.strokeStyle = "#e5e5e5";
    ctx.stroke();
  }

  paths.forEach((path, index) => {
    ctx.beginPath();
    path.points.forEach((point, pointIndex) => {
      const projected = projectPreviewPoint(point, path, pointIndex, state, centerX, centerY, scale);
      if (pointIndex === 0) ctx.moveTo(projected.x, projected.y);
      else ctx.lineTo(projected.x, projected.y);
    });
    if (path.family === "imageLine" || path.family === "imageDot") {
      const brightness = path.points.reduce((total, point) => total + (point.brightness || 0.7), 0) / path.points.length;
      ctx.strokeStyle = brightness > 0.78 ? "#111111" : brightness > 0.45 ? "#4b4b4b" : "#7c8277";
      ctx.lineWidth = path.family === "imageDot" ? clamp(1.2 + brightness * 1.8, 1.2, 3) : clamp(0.55 + brightness * 1.45, 0.55, 2.2);
      ctx.lineCap = "round";
    } else {
      ctx.strokeStyle = path.family === "weave" ? "#111111" : index % 2 ? "#555555" : "#9a5a2e";
      ctx.lineWidth = path.family === "weave" ? 1.35 : 1;
      ctx.lineCap = "butt";
    }
    ctx.stroke();

    if (path.family === "imageDot") {
      const point = path.points[0];
      const projected = projectPreviewPoint(point, path, 0, state, centerX, centerY, scale);
      const brightness = point.brightness || 0.8;
      ctx.beginPath();
      ctx.fillStyle = brightness > 0.78 ? "#111111" : "#545454";
      ctx.arc(projected.x, projected.y, clamp((point.radius || 0.8) * scale, 1, 3.8), 0, Math.PI * 2);
      ctx.fill();
    }
  });

  if (state.workspaceMode === "image" && !uploadedImage.data) {
    ctx.fillStyle = "rgba(17, 17, 17, 0.42)";
    ctx.font = "11px ui-sans-serif, system-ui";
    ctx.textAlign = "center";
    ctx.fillText("IMAGE SOURCE EMPTY", centerX, centerY);
    ctx.textAlign = "start";
  }

  ctx.fillStyle = "#111";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(
    `${fixed(state.width, 1)} x ${fixed(state.height, 1)} mm`,
    state.viewMode === "iso" ? margin : centerX - halfW,
    state.viewMode === "iso" ? height - margin * 0.62 : centerY + halfH + 22
  );
  ctx.restore();

  patternTitle.textContent = state.workspaceMode === "image" ? "이미지 변조" : patternNames[state.patternMode];
  pathCount.textContent = `${paths.length} paths`;
  lineLength.textContent = `${Math.round(stats.length)} mm`;
}

function getStartMacro(params) {
  if (params.macroPreset === "customOnly") return ["; toolpath only: no start macro"];

  if (params.macroPreset === "bambu") {
    return [
      "; Bambu Studio layer-compatible insert",
      "; Paste this block after the printer start sequence if preferred",
      "G90 ; absolute positioning",
      "M83 ; relative extrusion",
      "G92 E0",
      `G1 Z${fixed(params.layerHeight)} F600`,
    ];
  }

  return [
    "; Minimal safe start macro",
    `M140 S${fixed(params.bedTemp, 0)} ; set bed temperature`,
    `M104 S${fixed(params.nozzleTemp, 0)} ; set nozzle temperature`,
    `M190 S${fixed(params.bedTemp, 0)} ; wait for bed`,
    `M109 S${fixed(params.nozzleTemp, 0)} ; final nozzle temperature check`,
    "G90 ; absolute positioning",
    "M83 ; relative extrusion",
    "G28 ; home all axes",
    "G92 E0",
    `G1 Z${fixed(params.layerHeight)} F600`,
  ];
}

function getEndMacro(params) {
  if (params.macroPreset === "customOnly") return ["; toolpath only: no end macro"];
  if (params.macroPreset === "bambu") {
    return ["G92 E0", "M400 ; wait for moves to finish", "; end of insert block"];
  }

  return [
    "; Minimal safe end macro",
    "M400 ; wait for moves to finish",
    "G92 E0 ; reset extrusion distance",
    "G1 E-1 F1800 ; retract filament",
    "G91 ; switch to relative positioning",
    "G1 Z10 F900 ; safely lift nozzle 10mm up from current layer",
    "G90 ; switch back to absolute positioning",
    "M104 S0 ; turn off nozzle heater",
    "M140 S0 ; turn off bed heater",
    "M106 S0 ; turn off cooling fan",
    "G1 X0 Y220 F6000 ; push bed forward for easy removal",
    "M84 ; disable stepper motors",
  ];
}

function pointToMachine(point, params) {
  return {
    x: params.originX + point.x,
    y: params.originY + point.y,
  };
}

function extrusionForDistance(distance, params) {
  const lineArea = params.nozzleDiameter * params.layerHeight;
  const filamentArea = Math.PI * (params.filamentDiameter / 2) ** 2;
  return Math.max(0, Math.abs((distance * lineArea * params.extrusionMultiplier) / filamentArea));
}

function getPositiveExtrusion(extrusion) {
  if (!Number.isFinite(extrusion)) return 0;
  return Math.max(0, Math.abs(extrusion));
}

function getSegmentIntersection(startA, endA, startB, endB) {
  const directionAX = endA.x - startA.x;
  const directionAY = endA.y - startA.y;
  const directionBX = endB.x - startB.x;
  const directionBY = endB.y - startB.y;
  const denominator = directionAX * directionBY - directionAY * directionBX;
  const epsilon = 0.00001;

  if (Math.abs(denominator) < epsilon) return null;

  const deltaX = startB.x - startA.x;
  const deltaY = startB.y - startA.y;
  const tA = (deltaX * directionBY - deltaY * directionBX) / denominator;
  const tB = (deltaX * directionAY - deltaY * directionAX) / denominator;

  if (tA <= epsilon || tA >= 1 - epsilon || tB <= epsilon || tB >= 1 - epsilon) return null;

  return {
    x: startA.x + directionAX * tA,
    y: startA.y + directionAY * tA,
    tA,
    tB,
  };
}

function preparePathsWithIntersectionFade(paths, params) {
  if (params.workspaceMode !== "geometry" || paths.length < 2) return paths;

  const splitMarkers = paths.map((path) =>
    Array.from({ length: Math.max(0, (path.points?.length || 0) - 1) }, () => [])
  );
  const pathGeometry = paths.map((path, pathIndex) => {
    if (path.family === "skirt" || !path.points || path.points.length < 2) return null;

    const segments = [];
    for (let segmentIndex = 0; segmentIndex < path.points.length - 1; segmentIndex += 1) {
      const start = path.points[segmentIndex];
      const end = path.points[segmentIndex + 1];
      if (Math.hypot(end.x - start.x, end.y - start.y) < 0.0001) continue;

      segments.push({
        pathIndex,
        segmentIndex,
        start,
        end,
        minX: Math.min(start.x, end.x),
        maxX: Math.max(start.x, end.x),
        minY: Math.min(start.y, end.y),
        maxY: Math.max(start.y, end.y),
      });
    }

    if (!segments.length) return null;

    return {
      pathIndex,
      segments,
      minX: Math.min(...segments.map((segment) => segment.minX)),
      maxX: Math.max(...segments.map((segment) => segment.maxX)),
      minY: Math.min(...segments.map((segment) => segment.minY)),
      maxY: Math.max(...segments.map((segment) => segment.maxY)),
    };
  });

  for (let aPathIndex = 0; aPathIndex < pathGeometry.length; aPathIndex += 1) {
    const pathA = pathGeometry[aPathIndex];
    if (!pathA) continue;

    for (let bPathIndex = aPathIndex + 1; bPathIndex < pathGeometry.length; bPathIndex += 1) {
      const pathB = pathGeometry[bPathIndex];
      if (
        !pathB ||
        pathA.maxX < pathB.minX ||
        pathA.minX > pathB.maxX ||
        pathA.maxY < pathB.minY ||
        pathA.minY > pathB.maxY
      ) {
        continue;
      }

      pathA.segments.forEach((segmentA) => {
        pathB.segments.forEach((segmentB) => {
          if (
            segmentA.maxX < segmentB.minX ||
            segmentA.minX > segmentB.maxX ||
            segmentA.maxY < segmentB.minY ||
            segmentA.minY > segmentB.maxY
          ) {
            return;
          }

          const intersection = getSegmentIntersection(segmentA.start, segmentA.end, segmentB.start, segmentB.end);
          if (!intersection) return;

          splitMarkers[segmentA.pathIndex][segmentA.segmentIndex].push(intersection.tA);
          splitMarkers[segmentB.pathIndex][segmentB.segmentIndex].push(intersection.tB);
        });
      });
    }
  }

  const fadeDistance = Math.max(0.5, params.nozzleDiameter * 1.5);

  return paths.map((path, pathIndex) => {
    if (path.family === "skirt" || !path.points || path.points.length < 2) return path;

    const points = [{ ...path.points[0] }];
    for (let segmentIndex = 0; segmentIndex < path.points.length - 1; segmentIndex += 1) {
      const start = path.points[segmentIndex];
      const end = path.points[segmentIndex + 1];
      const distance = Math.hypot(end.x - start.x, end.y - start.y);
      const markers = splitMarkers[pathIndex][segmentIndex];

      if (!markers.length || distance < 0.0001) {
        points.push({ ...end });
        continue;
      }

      const fadeRatio = Math.min(0.45, fadeDistance / distance);
      const entries = [{ t: 1, intersectionFade: false }];
      markers.forEach((t) => {
        entries.push({ t: clamp(t - fadeRatio, 0.00001, 0.99999), intersectionFade: false });
        entries.push({ t, intersectionFade: true });
        entries.push({ t: clamp(t + fadeRatio, 0.00001, 0.99999), intersectionFade: false });
      });
      entries.sort((a, b) => a.t - b.t);

      const uniqueEntries = [];
      entries.forEach((entry) => {
        const previous = uniqueEntries[uniqueEntries.length - 1];
        if (previous && Math.abs(previous.t - entry.t) < 0.00001) {
          previous.intersectionFade = previous.intersectionFade || entry.intersectionFade;
          return;
        }
        uniqueEntries.push({ ...entry });
      });

      uniqueEntries.forEach((entry) => {
        const point = {
          ...end,
          x: start.x + (end.x - start.x) * entry.t,
          y: start.y + (end.y - start.y) * entry.t,
        };
        if (entry.intersectionFade) point.intersectionFade = true;
        else delete point.intersectionFade;
        points.push(point);
      });
    }

    return { ...path, points };
  });
}

function getRetractionMove(params, direction) {
  const length = params.retractionLength * direction;
  return `G1 E${fixed(length, 4)} F${fixed(params.retractionSpeed, 0)}`;
}

function getSafeFanSpeed(params) {
  const fanSpeed = Number(params.fanSpeed);
  if (!Number.isFinite(fanSpeed)) return 255;
  return Math.round(clamp(fanSpeed, 0, 255));
}

function getZModOffset(point, params) {
  const amplitude = clamp(params.zModAmplitude, 0.05, 0.6);
  const frequency = clamp(params.zModFrequency, 0.1, 2);
  const absoluteX = params.originX + point.x;
  const absoluteY = params.originY + point.y;
  return Math.sin(absoluteX * frequency) * Math.cos(absoluteY * frequency) * amplitude;
}

function getZModulatedHeight(baseZ, point, params) {
  const zModHeight = getZModOffset(point, params);
  return Math.max(baseZ, baseZ + zModHeight);
}

function formatEstimatedTime(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0분";

  const roundedMinutes = Math.max(1, Math.round(minutes));
  const hours = Math.floor(roundedMinutes / 60);
  const remainingMinutes = roundedMinutes % 60;

  if (hours > 0) {
    return `${hours}시간 ${remainingMinutes}분`;
  }

  return `${remainingMinutes}분`;
}

function getSolidLayerIndex(z, params) {
  const layerHeight = Math.max(0.05, params.layerHeight || state.layerHeight);
  return Math.max(0, Math.floor((z + 0.0001) / layerHeight) - 1);
}

function getSolidFootprintSummary(params) {
  if (params.formFactor === "cylinder") {
    return `Cylinder R${fixed(params.solidRadius, 1)} x H${fixed(getSolidTargetHeight(params), 1)} mm`;
  }

  return `Cube ${fixed(params.solidWidth, 1)} x ${fixed(params.solidDepth, 1)} x ${fixed(getSolidTargetHeight(params), 1)} mm`;
}

function getCylinderBodyFlowScale(point, params) {
  if (params.formFactor !== "cylinder") return 1;
  if (isUltraWeavePreset(params)) return 1;
  return Number.isFinite(point.layerIndex) && point.layerIndex > 0 ? 0.87 : 1;
}

function getCylinderLoopMoveTuning(prevPoint, nextPoint, params) {
  if (params.formFactor !== "cylinder") {
    return { extrusionScale: 1, speed: params.printSpeed };
  }

  const bodyFlowScale = getCylinderBodyFlowScale(nextPoint, params);

  if (nextPoint.strokeType === "spiral") {
    const extrusionPulse = nextPoint.extrusionPulse === 1.15 ? 1.15 : 0.75;
    return {
      extrusionScale: extrusionPulse * bodyFlowScale,
      speed: isUltraWeavePreset(params) ? 900 : params.printSpeed,
    };
  }

  if (nextPoint.strokeType === "up") {
    const upBoost = clamp(params.cylinderUpExtrusionBoost || state.cylinderUpExtrusionBoost || 1.12, 1, 1.6);
    return { extrusionScale: upBoost * bodyFlowScale, speed: clamp(params.printSpeed * 0.9, 300, params.printSpeed) };
  }

  if (nextPoint.strokeType === "down") {
    return { extrusionScale: 0.96 * bodyFlowScale, speed: params.printSpeed };
  }

  const extrusionScale = bodyFlowScale;
  const speed = params.printSpeed;

  return { extrusionScale, speed };
}

function generateSolidGcode(params) {
  const solidPaths = generateSolidToolpaths(params);
  const solidLayerCount =
    params.formFactor === "cylinder"
      ? isUltraWeavePreset(params)
        ? getCylinderSpiralTurnCount(params)
        : Math.max(1, solidPaths.filter((path) => path.family === "cylinderVerticalDrop").length)
      : getSolidLayerCount(params);
  const lines = [
    "; Generated by G-CODE TOOL",
    "; Mode: Solid Geometry",
    `; Form factor: ${params.formFactor}`,
    `; Pattern: ${patternNames[params.patternMode]}`,
    `; Footprint: ${getSolidFootprintSummary(params)}`,
    `; Layers: ${fixed(solidLayerCount, 0)}`,
    `; Layer height: ${fixed(params.layerHeight, 2)} mm`,
    `; Total height: ${fixed(getSolidTargetHeight(params), 2)} mm`,
    ...getStartMacro(params),
    "M83 ; enforce relative positive extrusion for solid toolpaths",
    "G92 E0",
  ];

  let totalExtrusion = 0;
  let totalMoves = 0;
  let totalPrintDistance = 0;
  let totalPrintMinutes = 0;
  let totalTravelDistance = 0;
  let retractionCount = 0;
  let currentPosition = null;
  let hasPrintedPath = false;
  let announcedLayer = 0;
  const isContinuousCylinder = params.formFactor === "cylinder";
  const shouldRetract = params.retractionLength > 0 && !isContinuousCylinder;

  if (isContinuousCylinder) {
    lines.push(
      isUltraWeavePreset(params)
        ? "; Continuous Ultra Weave spiral cylinder path"
        : "; Continuous vertical zig-zag cylinder path"
    );
    lines.push(";LAYER:0");
    lines.push(`;Z:${fixed(params.layerHeight, 3)}`);
    lines.push("; First layer welding: 135% extrusion at F900");
    lines.push("M106 S0 ; turn off fan for layer 0 root adhesion");
  } else {
    lines.push(";LAYER:0");
    lines.push(`;Z:${fixed(params.layerHeight, 3)}`);
    lines.push(`G1 Z${fixed(params.layerHeight)} F600`);
    lines.push("M106 S0 ; turn off fan for layer 0 root adhesion");
  }

  solidPaths.forEach((path, pathIndex) => {
    if (!path.points || path.points.length < 2) return;

    const startPoint = path.points[0];
    const start = pointToMachine(startPoint, params);
    const startZ = startPoint.z || params.layerHeight;
    const pathLayerIndex = Number.isFinite(path.layerIndex) ? path.layerIndex : getSolidLayerIndex(startZ, params);
    const isFirstLayerPath = isContinuousCylinder && pathLayerIndex === 0;
    const layerExtrusionScale = isFirstLayerPath ? 1.35 : 1;
    const layerPrintSpeed = isFirstLayerPath ? 900 : params.printSpeed;

    if (isContinuousCylinder) {
      while (pathLayerIndex > announcedLayer) {
        announcedLayer += 1;
        lines.push(`;LAYER:${announcedLayer}`);
        lines.push("G92 E0");
        lines.push(`;Z:${fixed(startZ, 3)}`);
        if (announcedLayer === 1) {
          lines.push(`M106 S${getSafeFanSpeed(params)} ; enable cooling fan from layer 1`);
          lines.push(
            isUltraWeavePreset(params)
              ? "; Ultra Weave spiral flow pulse: rising 115%, falling 75%"
              : "; Cylinder body flow thinning: 87%"
          );
        }
      }
    }

    lines.push(`; path ${pathIndex + 1} / ${solidPaths.length} (${path.family})`);
    if (hasPrintedPath && shouldRetract) {
      lines.push(getRetractionMove(params, -1));
      retractionCount += 1;
    }
    if (currentPosition) {
      const transitionDistance = getPointDistance(currentPosition, { x: start.x, y: start.y, z: startZ });
      if (isContinuousCylinder && transitionDistance > 0.0001) {
        const transitionExtrusion = getPositiveExtrusion(
          extrusionForDistance(transitionDistance, params) *
            layerExtrusionScale *
            getCylinderBodyFlowScale(startPoint, params)
        );
        totalExtrusion += transitionExtrusion;
        totalPrintDistance += transitionDistance;
        totalPrintMinutes += transitionDistance / layerPrintSpeed;
        totalMoves += 1;
        lines.push(
          `G1 X${fixed(start.x)} Y${fixed(start.y)} Z${fixed(startZ)} E${fixed(Math.abs(transitionExtrusion), 5)} F${fixed(layerPrintSpeed, 0)}`
        );
      } else {
        totalTravelDistance += transitionDistance;
      }
    }
    if (!currentPosition || !isContinuousCylinder) {
      lines.push(`G0 X${fixed(start.x)} Y${fixed(start.y)} Z${fixed(startZ)} F${fixed(params.travelSpeed, 0)}`);
    }
    if (hasPrintedPath && shouldRetract) {
      lines.push(getRetractionMove(params, 1));
    }

    for (let i = 1; i < path.points.length; i += 1) {
      const prevLocal = path.points[i - 1];
      const nextLocal = path.points[i];
      const prev = pointToMachine(prevLocal, params);
      const next = pointToMachine(nextLocal, params);
      const nextZ = nextLocal.z || params.layerHeight;
      const nextLayer = Number.isFinite(nextLocal.layerIndex)
        ? Math.min(solidLayerCount - 1, nextLocal.layerIndex)
        : Math.min(solidLayerCount - 1, getSolidLayerIndex(nextZ, params));

      while (nextLayer > announcedLayer) {
        announcedLayer += 1;
        lines.push(`;LAYER:${announcedLayer}`);
        lines.push("G92 E0");
        lines.push(`;Z:${fixed(Math.min(nextZ, getSolidTargetHeight(params)), 3)}`);
        if (announcedLayer === 1) {
          lines.push(`M106 S${getSafeFanSpeed(params)} ; enable cooling fan from layer 1`);
          if (isContinuousCylinder) {
            lines.push(
              isUltraWeavePreset(params)
                ? "; Ultra Weave spiral flow pulse: rising 115%, falling 75%"
                : "; Cylinder body flow thinning: 87%"
            );
          }
        }
      }

      const distance = getPointDistance(
        { x: prev.x, y: prev.y, z: prevLocal.z || params.layerHeight },
        { x: next.x, y: next.y, z: nextZ }
      );
      const moveTuning = getCylinderLoopMoveTuning(prevLocal, nextLocal, params);
      const isFirstLayerMove = isContinuousCylinder && nextLayer === 0;
      const moveLayerExtrusionScale = isFirstLayerMove ? 1.35 : 1;
      const extrusion = getPositiveExtrusion(
        extrusionForDistance(distance, params) * moveTuning.extrusionScale * moveLayerExtrusionScale
      );
      const printSpeed = isFirstLayerMove ? 900 : moveTuning.speed;
      totalExtrusion += extrusion;
      totalPrintDistance += distance;
      totalPrintMinutes += distance / printSpeed;
      totalMoves += 1;
      lines.push(
        `G1 X${fixed(next.x)} Y${fixed(next.y)} Z${fixed(nextZ)} E${fixed(Math.abs(extrusion), 5)} F${fixed(printSpeed, 0)}`
      );
    }

    const lastPoint = path.points[path.points.length - 1];
    const last = pointToMachine(lastPoint, params);
    currentPosition = { x: last.x, y: last.y, z: lastPoint.z || params.layerHeight };
    hasPrintedPath = true;
  });

  const filamentArea = Math.PI * (params.filamentDiameter / 2) ** 2;
  const estimatedWeight = (totalExtrusion * filamentArea * params.filamentDensity) / 1000;
  const retractionDriveTime =
    shouldRetract && params.retractionSpeed > 0 ? (params.retractionLength / params.retractionSpeed) * 2 : 0;
  const estimatedMinutes =
    totalPrintMinutes +
    totalTravelDistance / params.travelSpeed +
    retractionCount * retractionDriveTime;
  const estimatedTime = formatEstimatedTime(estimatedMinutes);

  lines.push(...getEndMacro(params));
  lines.push(`; Total extrusion estimate: ${fixed(totalExtrusion, 3)} mm`);
  lines.push(`; Total print distance: ${fixed(totalPrintDistance, 2)} mm`);
  lines.push(`; Total travel distance: ${fixed(totalTravelDistance, 2)} mm`);
  lines.push(`; Retractions: ${retractionCount}`);
  lines.push(`; Estimated time: ${estimatedTime}`);
  lines.push(`; Estimated material: ${fixed(estimatedWeight, 2)} g`);
  lines.push(`; Extrusion moves: ${totalMoves}`);
  lines.push("; End of G-CODE TOOL file");

  return {
    text: `${lines.join("\n")}\n`,
    totalExtrusion,
    totalMoves,
    estimatedWeight,
    estimatedTime,
  };
}

function generateGcode(params) {
  if (params.formFactor === "cylinder" || params.formFactor === "cube") {
    const referenceResult = getReferenceA104Result(params.formFactor);
    if (referenceResult) return referenceResult;
  }

  if (isSolidFormFactor(params)) {
    return generateSolidGcode(params);
  }

  const lines = [
    "; Generated by G-CODE TOOL",
    `; Mode: ${params.workspaceMode === "image" ? "Image Modulation" : "Pure Geometry"}`,
    `; Pattern: ${params.workspaceMode === "image" ? "luminance weave" : patternNames[params.patternMode]}`,
    `; Footprint: ${fixed(params.width, 1)} x ${fixed(params.height, 1)} mm`,
    `; Layers: ${fixed(params.layers, 0)}`,
    `; Layer height: ${fixed(params.layerHeight, 2)} mm`,
    `; Total height: ${fixed(params.totalHeight, 2)} mm`,
    `; Density: ${fixed(params.density, 2)}, spacing: ${fixed(params.spacing, 2)} mm, angle: ${fixed(params.crossAngle, 1)} deg`,
    ...getStartMacro(params),
  ];

  let totalExtrusion = 0;
  let totalMoves = 0;
  let totalPrintDistance = 0;
  let totalPrintMinutes = 0;
  let totalTravelDistance = 0;
  let retractionCount = 0;
  let currentPosition = null;
  let hasPrintedPath = false;
  const shouldRetract = params.retractionLength > 0;

  for (let layer = 0; layer < params.layers; layer += 1) {
    const isFirstLayer = layer === 0;
    const layerExtrusionScale = isFirstLayer ? 1.35 : 1;
    const layerPrintSpeed = isFirstLayer ? 900 : params.printSpeed;
    const z = params.layerHeight * (layer + 1);
    let currentZ = z;
    let paths = generateModePaths(params, layer);
    if (params.workspaceMode === "geometry" && layer === 0 && params.skirtCount > 0) {
      paths = [...generateSkirtPaths(params), ...paths];
    }
    paths = preparePathsWithIntersectionFade(paths, params);
    lines.push(`;LAYER:${layer}`);
    lines.push("G92 E0");
    lines.push(`;Z:${fixed(z, 3)}`);
    lines.push(`G1 Z${fixed(z)} F600`);
    if (layer === 0) {
      lines.push("; First layer welding: 135% extrusion at F900");
      lines.push("M106 S0 ; turn off fan for layer 0 root adhesion");
    } else if (layer === 1) {
      lines.push(`M106 S${getSafeFanSpeed(params)} ; enable cooling fan from layer 1`);
    }
    currentZ = z;

    paths.forEach((path, pathIndex) => {
      if (!path.points || path.points.length < 2) return;

      const start = pointToMachine(path.points[0], params);
      const usePathZMod = params.useZMod && path.family !== "skirt";
      lines.push(`; path ${pathIndex + 1} / ${paths.length}`);
      if (params.useZMod && Math.abs(currentZ - z) > 0.0001) {
        lines.push(`G1 Z${fixed(z)} F600 ; reset Z modulation before travel`);
        currentZ = z;
      }
      if (hasPrintedPath && shouldRetract) {
        lines.push(getRetractionMove(params, -1));
        retractionCount += 1;
      }
      if (currentPosition) {
        totalTravelDistance += Math.hypot(start.x - currentPosition.x, start.y - currentPosition.y);
      }
      lines.push(`G0 X${fixed(start.x)} Y${fixed(start.y)} F${fixed(params.travelSpeed, 0)}`);
      if (hasPrintedPath && shouldRetract) {
        lines.push(getRetractionMove(params, 1));
      }

      for (let i = 1; i < path.points.length; i += 1) {
        const prevLocal = path.points[i - 1];
        const nextLocal = path.points[i];
        const prev = pointToMachine(prevLocal, params);
        const next = pointToMachine(nextLocal, params);
        const distance = Math.hypot(next.x - prev.x, next.y - prev.y);
        const intersectionScale = prevLocal.intersectionFade || nextLocal.intersectionFade ? 0.8 : 1;
        const extrusion = getPositiveExtrusion(
          extrusionForDistance(distance, params) * layerExtrusionScale * intersectionScale
        );
        const nextZ = usePathZMod ? getZModulatedHeight(z, nextLocal, params) : z;
        totalExtrusion += extrusion;
        totalPrintDistance += distance;
        totalPrintMinutes += distance / layerPrintSpeed;
        totalMoves += 1;
        if (usePathZMod) {
          lines.push(
            `G1 X${fixed(next.x)} Y${fixed(next.y)} Z${fixed(nextZ)} E${fixed(Math.abs(extrusion), 5)} F${fixed(layerPrintSpeed, 0)}`
          );
        } else {
          lines.push(
            `G1 X${fixed(next.x)} Y${fixed(next.y)} E${fixed(Math.abs(extrusion), 5)} F${fixed(layerPrintSpeed, 0)}`
          );
        }
        currentZ = nextZ;
      }
      currentPosition = pointToMachine(path.points[path.points.length - 1], params);
      hasPrintedPath = true;
    });
  }

  const filamentArea = Math.PI * (params.filamentDiameter / 2) ** 2;
  const estimatedWeight = (totalExtrusion * filamentArea * params.filamentDensity) / 1000;
  const retractionDriveTime =
    shouldRetract && params.retractionSpeed > 0 ? (params.retractionLength / params.retractionSpeed) * 2 : 0;
  const estimatedMinutes =
    totalPrintMinutes +
    totalTravelDistance / params.travelSpeed +
    retractionCount * retractionDriveTime;
  const estimatedTime = formatEstimatedTime(estimatedMinutes);

  lines.push(...getEndMacro(params));
  lines.push(`; Total extrusion estimate: ${fixed(totalExtrusion, 3)} mm`);
  lines.push(`; Total print distance: ${fixed(totalPrintDistance, 2)} mm`);
  lines.push(`; Total travel distance: ${fixed(totalTravelDistance, 2)} mm`);
  lines.push(`; Retractions: ${retractionCount}`);
  lines.push(`; Estimated time: ${estimatedTime}`);
  lines.push(`; Estimated material: ${fixed(estimatedWeight, 2)} g`);
  lines.push(`; Extrusion moves: ${totalMoves}`);
  lines.push("; End of G-CODE TOOL file");

  return {
    text: `${lines.join("\n")}\n`,
    totalExtrusion,
    totalMoves,
    estimatedWeight,
    estimatedTime,
  };
}

function updateGcode() {
  const result = generateGcode(state);
  gcodeOutput.value = result.text;
  const bytes = new Blob([result.text]).size;
  gcodeSummary.textContent = `${result.totalMoves} moves | 예상 시간: ${result.estimatedTime} | 예상 소모량: ${fixed(result.estimatedWeight, 2)}g | 용량: ${Math.round(bytes / 1024)} KB`;
}

function render() {
  syncTotalHeightStep();
  drawPreview();
  updateGcode();
}

function resetPreviewView() {
  previewState.zoom = 1.0;
  previewState.offsetX = 0;
  previewState.offsetY = 0;
  previewState.isDragging = false;
  previewState.startX = 0;
  previewState.startY = 0;
}

function syncTotalHeightStep() {
  const layerStep = Number.isFinite(state.layerHeight) && state.layerHeight > 0 ? state.layerHeight : 0.01;
  document.querySelectorAll('[data-param="totalHeight"]').forEach((input) => {
    const alignedStep = fixed(layerStep, 3);
    input.setAttribute("step", alignedStep);
    input.setAttribute("min", alignedStep);
  });
}

function syncParamInputs(name, value) {
  document.querySelectorAll(`[data-param="${name}"]`).forEach((input) => {
    if (input.type === "checkbox") {
      input.checked = Boolean(value);
    } else {
      input.value = value;
    }
  });

  if (name === "totalHeight" || name === "layerHeight") {
    syncTotalHeightStep();
  }
}

function syncHeightParams(changedParam) {
  syncTotalHeightStep();

  if (changedParam === "totalHeight") {
    state.layers = Math.max(1, Math.round(state.totalHeight / state.layerHeight));
    state.totalHeight = Number((state.layers * state.layerHeight).toFixed(2));
    syncParamInputs("layers", state.layers);
    syncParamInputs("totalHeight", state.totalHeight);
    return;
  }

  if (changedParam === "layerHeight" || changedParam === "layers") {
    if (changedParam === "layers") {
      state.layers = Math.max(1, Math.round(state.layers));
      syncParamInputs("layers", state.layers);
    }
    state.totalHeight = Number((state.layers * state.layerHeight).toFixed(2));
    syncParamInputs("totalHeight", state.totalHeight);
  }
}

function handleParamInput(event) {
  const input = event.target;
  const name = input.dataset.param;

  if (name === "formFactor") {
    setFormFactor(input.value);
    render();
    return;
  }

  if (input.type === "checkbox") {
    state[name] = input.checked;
    syncParamInputs(name, state[name]);
    render();
    return;
  }

  const value = Number(input.value);
  if (!Number.isFinite(value)) return;

  state[name] = value;
  syncParamInputs(name, value);
  syncHeightParams(name);

  render();
}

function applyFilamentPreset(presetName) {
  const preset = filamentPresets[presetName];
  if (!preset) return;

  filamentPresetParams.forEach((name) => {
    if (!Object.prototype.hasOwnProperty.call(preset, name)) return;
    state[name] = preset[name];
    syncParamInputs(name, preset[name]);
  });

  state.filamentPreset = presetName;
  filamentPreset.value = presetName;
  if (Object.prototype.hasOwnProperty.call(preset, "layerHeight")) {
    syncHeightParams("layerHeight");
  }
  if (Object.prototype.hasOwnProperty.call(preset, "useZMod")) {
    useZModInput.checked = state.useZMod;
    zModSliders.classList.toggle("hidden", !state.useZMod);
  }

  render();
}

document.querySelectorAll("[data-param]").forEach((input) => {
  input.addEventListener("input", handleParamInput);
  input.addEventListener("change", handleParamInput);
});

function stepParamInput(input, direction) {
  if (!input || !input.dataset.param || !direction) return;

  if (input.dataset.param === "totalHeight" || input.dataset.param === "layerHeight") {
    syncTotalHeightStep();
  }

  try {
    if (direction > 0 && typeof input.stepUp === "function") {
      input.stepUp();
    } else if (direction < 0 && typeof input.stepDown === "function") {
      input.stepDown();
    } else {
      const step = Number(input.step) || 1;
      input.value = Number(input.value || 0) + step * direction;
    }
  } catch (error) {
    const step = Number(input.step) || 1;
    input.value = Number(input.value || 0) + step * direction;
  }

  handleParamInput({ target: input });
}

function handleNativeNumberSpin(event) {
  const input = event.currentTarget;
  if (event.button !== 0 || input.type !== "number" || !input.dataset.param) return;

  const rect = input.getBoundingClientRect();
  const spinZoneWidth = Math.min(28, rect.width * 0.3);
  if (event.clientX < rect.right - spinZoneWidth) return;

  event.preventDefault();
  const direction = event.clientY < rect.top + rect.height / 2 ? 1 : -1;
  stepParamInput(input, direction);
}

document.querySelectorAll('input[type="number"][data-param]').forEach((input) => {
  input.addEventListener("pointerdown", handleNativeNumberSpin);
});

function getStepperDirection(button) {
  if (button.dataset.stepDirection === "up" || button.dataset.step === "up") return 1;
  if (button.dataset.stepDirection === "down" || button.dataset.step === "down") return -1;
  if (button.matches(".param-step-up, .step-up, .spinner-up, .increment, [data-step-up]")) return 1;
  if (button.matches(".param-step-down, .step-down, .spinner-down, .decrement, [data-step-down]")) return -1;
  return 0;
}

function getStepperInput(button) {
  const explicitParam = button.dataset.paramTarget || button.dataset.param;
  if (explicitParam) return document.querySelector(`[data-param="${explicitParam}"]`);

  const explicitSelector = button.dataset.inputTarget;
  if (explicitSelector) return document.querySelector(explicitSelector);

  const field = button.closest(".field, .range-field, .setting-group");
  return field ? field.querySelector("input[data-param]") : null;
}

document.addEventListener("click", (event) => {
  const button = event.target.closest(
    "[data-step-direction], [data-step], [data-step-up], [data-step-down], .param-step-up, .param-step-down, .step-up, .step-down, .spinner-up, .spinner-down, .increment, .decrement"
  );
  if (!button) return;

  const direction = getStepperDirection(button);
  const input = getStepperInput(button);
  if (!direction || !input || !input.dataset.param) return;

  event.preventDefault();
  stepParamInput(input, direction);
});

useGradientInput.addEventListener("change", () => {
  state.useGradient = useGradientInput.checked;
  gradientSliders.classList.toggle("hidden", !state.useGradient);
  render();
});

useZModInput.addEventListener("change", () => {
  state.useZMod = useZModInput.checked;
  zModSliders.classList.toggle("hidden", !state.useZMod);
  render();
});

function clearImageModulationData() {
  uploadedImage = { data: null, width: 0, height: 0, name: "" };
  imageUploadStatus.textContent = "No image source";
}

function loadImageModulationFile(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const image = new Image();
    image.addEventListener("load", () => {
      const imageCanvas = document.createElement("canvas");
      const imageContext = imageCanvas.getContext("2d");
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      imageCanvas.width = width;
      imageCanvas.height = height;
      imageContext.drawImage(image, 0, 0, width, height);

      const pixels = imageContext.getImageData(0, 0, width, height).data;
      const luminance = new Uint8Array(width * height);
      for (let i = 0, j = 0; i < pixels.length; i += 4, j += 1) {
        luminance[j] = Math.round(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
      }

      uploadedImage = { data: luminance, width, height, name: file.name || "Pasted image" };
      imageUploadStatus.textContent = `${uploadedImage.name} / ${width} x ${height}`;
      render();
    });
    image.src = reader.result;
  });
  reader.readAsDataURL(file);
}

imageModeUploader.addEventListener("change", () => {
  const file = imageModeUploader.files && imageModeUploader.files[0];
  if (!file) {
    clearImageModulationData();
    render();
    return;
  }

  loadImageModulationFile(file);
});

window.addEventListener("paste", (event) => {
  if (state.workspaceMode !== "image") return;

  const items = event.clipboardData && Array.from(event.clipboardData.items || []);
  const imageItem = items.find((item) => item.type.startsWith("image/"));
  if (!imageItem) return;

  const file = imageItem.getAsFile();
  if (!file) return;

  event.preventDefault();
  loadImageModulationFile(file);
});

function setWorkspaceMode(mode) {
  applyWorkspaceRoute(mode, mode === "image" ? "flat" : state.formFactor);
}

function setViewMode(mode, shouldRender = true) {
  resetPreviewView();
  state.viewMode = mode;
  viewModeButtons.forEach((button) => {
    const isActive = button.dataset.viewMode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  if (shouldRender) render();
}

function setSettingsMode(mode) {
  advancedSettingSections.forEach((section) => {
    section.classList.toggle("hidden", mode === "basic");
  });
}

document.querySelectorAll('input[name="patternMode"]').forEach((input) => {
  input.addEventListener("change", () => {
    state.patternMode = input.value;
    render();
  });
});

macroPreset.addEventListener("change", () => {
  state.macroPreset = macroPreset.value;
  render();
});

filamentPreset.addEventListener("change", () => {
  state.filamentPreset = filamentPreset.value;
  applyFilamentPreset(state.filamentPreset);
});

settingsModeInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) setSettingsMode(input.value);
  });
});

modeSwitchButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetMode = button.dataset.targetMode;
    if (targetMode === "image") {
      applyWorkspaceRoute("image", "flat");
    } else {
      applyWorkspaceRoute("geometry", targetMode);
    }
  });
});

viewModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setViewMode(button.dataset.viewMode);
  });
});

downloadButton.addEventListener("click", () => {
  const result = generateGcode(state);
  const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  const modeSlug = isSolidFormFactor(state) ? state.formFactor : state.workspaceMode === "image" ? "image-modulation" : state.patternMode;
  link.href = URL.createObjectURL(blob);
  link.download = `g-code-tool-${modeSlug}-${timestamp}.gcode`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 0);
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(gcodeOutput.value);
    copyButton.textContent = "복사됨";
  } catch (error) {
    gcodeOutput.select();
    document.execCommand("copy");
    copyButton.textContent = "복사됨";
  }
  window.setTimeout(() => {
    copyButton.textContent = "복사";
  }, 1200);
});

introFormButtons.forEach((button) => {
  button.addEventListener("click", () => {
    enterWorkspace(button.dataset.introMode, button.dataset.introForm);
  });
});

canvas.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    const zoomDelta = event.deltaY < 0 ? 1.12 : 1 / 1.12;
    previewState.zoom = clamp(previewState.zoom * zoomDelta, 0.5, 12.0);
    drawPreview();
  },
  { passive: false }
);

canvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  previewState.isDragging = true;
  previewState.startX = event.clientX;
  previewState.startY = event.clientY;
  if (typeof canvas.setPointerCapture === "function") {
    canvas.setPointerCapture(event.pointerId);
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!previewState.isDragging) return;
  const deltaX = event.clientX - previewState.startX;
  const deltaY = event.clientY - previewState.startY;
  previewState.offsetX += deltaX;
  previewState.offsetY += deltaY;
  previewState.startX = event.clientX;
  previewState.startY = event.clientY;
  drawPreview();
});

function stopPreviewDrag(event) {
  previewState.isDragging = false;
  if (event && typeof canvas.releasePointerCapture === "function" && canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

canvas.addEventListener("pointerup", stopPreviewDrag);
canvas.addEventListener("pointerleave", stopPreviewDrag);

window.addEventListener("resize", () => {
  drawPreview();
  if (introIsRunning) resizeIntroCanvas();
});

startIntroAnimation();
applyWorkspaceRoute(state.workspaceMode, state.formFactor);
setSettingsMode("basic");
