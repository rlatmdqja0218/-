const introScreen = document.querySelector("#introScreen");
const introCanvas = document.querySelector("#introCanvas");
const introCtx = introCanvas.getContext("2d");
const enterGeometryMode = document.querySelector("#enterGeometryMode");
const enterImageMode = document.querySelector("#enterImageMode");
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
const modeSwitchButtons = document.querySelectorAll("[data-workspace-mode]");
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
  patternMode: "weave",
  width: 120,
  height: 120,
  density: 1.6,
  spacing: 7.5,
  crossAngle: 90,
  weaveAmplitude: 1.4,
  useGradient: false,
  gradientStrength: 1.0,
  useZMod: false,
  zModAmplitude: 0.15,
  zModFrequency: 0.5,
  imageStrength: 1.0,
  travelSpeed: 7200,
  printSpeed: 1800,
  extrusionMultiplier: 0.92,
  fanSpeed: 255,
  retractionLength: 1.0,
  retractionSpeed: 1800,
  layerHeight: 0.28,
  layers: 4,
  totalHeight: 1.12,
  nozzleDiameter: 0.4,
  filamentDiameter: 1.75,
  filamentDensity: 1.24,
  skirtCount: 2,
  skirtDistance: 5.0,
  bedTemp: 60,
  nozzleTemp: 210,
  originX: 128,
  originY: 128,
  macroPreset: "minimal",
  filamentPreset: "custom",
};

const patternNames = {
  grid: "직교 격자",
  weave: "직조 편향",
  mesh: "미세 메시",
};

const filamentPresets = {
  pla: { nozzleTemp: 220, bedTemp: 55, printSpeed: 1800, extrusionMultiplier: 0.98, filamentDensity: 1.24, fanSpeed: 255 },
  petg: { nozzleTemp: 255, bedTemp: 70, printSpeed: 1200, extrusionMultiplier: 0.93, filamentDensity: 1.27, fanSpeed: 102 },
  abs: { nozzleTemp: 260, bedTemp: 90, printSpeed: 2100, extrusionMultiplier: 0.95, filamentDensity: 1.04, fanSpeed: 0 },
  tpu: { nozzleTemp: 230, bedTemp: 35, printSpeed: 720, extrusionMultiplier: 1.02, filamentDensity: 1.21, fanSpeed: 128 },
  silkPla: { nozzleTemp: 230, bedTemp: 55, printSpeed: 1200, extrusionMultiplier: 0.97, filamentDensity: 1.24, fanSpeed: 255 },
  carbonPla: { nozzleTemp: 235, bedTemp: 55, printSpeed: 1600, extrusionMultiplier: 0.95, filamentDensity: 1.3, fanSpeed: 153 },
};

const filamentPresetParams = ["nozzleTemp", "bedTemp", "printSpeed", "extrusionMultiplier", "filamentDensity", "fanSpeed"];
const introPalette = [
  "rgba(17, 17, 17, 0.52)",
  "rgba(85, 85, 85, 0.38)",
  "rgba(43, 95, 85, 0.32)",
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

function enterWorkspace(mode) {
  setWorkspaceMode(mode);
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
    return total + Math.hypot(point.x - prev.x, point.y - prev.y);
  }, 0);
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
  const paths = [];
  for (let layer = 0; layer < params.layers; layer += 1) {
    generateModePaths(params, layer).forEach((path) => {
      paths.push({ ...path, layer });
    });
  }
  return paths;
}

function generateModePaths(params, layerIndex = 0) {
  if (params.workspaceMode === "image") {
    return generateImageModulationPaths(params, layerIndex);
  }

  return generatePaths(params, layerIndex);
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

function projectPreviewPoint(point, path, pointIndex, params, centerX, centerY, scale) {
  if (params.viewMode === "iso") {
    const isoX = (point.x - point.y) * Math.cos(Math.PI / 6);
    const isoY = (point.x + point.y) * Math.sin(Math.PI / 6);
    const zModHeight = getPreviewZHeight(point, path, pointIndex, params);
    return {
      x: centerX + isoX * scale,
      y: centerY + (isoY - zModHeight * 24) * scale,
    };
  }

  return {
    x: centerX + point.x * scale,
    y: centerY - point.y * scale,
  };
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
      ctx.strokeStyle = path.family === "weave" ? "#111111" : index % 2 ? "#555555" : "#2b5f55";
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
    "G90 ; absolute positioning",
    "M83 ; relative extrusion",
    `M140 S${fixed(params.bedTemp, 0)} ; set bed temperature`,
    `M104 S${fixed(params.nozzleTemp, 0)} ; set nozzle temperature`,
    `M190 S${fixed(params.bedTemp, 0)} ; wait for bed`,
    `M109 S${fixed(params.nozzleTemp, 0)} ; wait for nozzle`,
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
  return (distance * lineArea * params.extrusionMultiplier) / filamentArea;
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

function generateGcode(params) {
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
  let totalTravelDistance = 0;
  let retractionCount = 0;
  let currentPosition = null;
  let hasPrintedPath = false;
  const shouldRetract = params.retractionLength > 0;

  for (let layer = 0; layer < params.layers; layer += 1) {
    const z = params.layerHeight * (layer + 1);
    let currentZ = z;
    let paths = generateModePaths(params, layer);
    if (params.workspaceMode === "geometry" && layer === 0 && params.skirtCount > 0) {
      paths = [...generateSkirtPaths(params), ...paths];
    }
    lines.push(`;LAYER:${layer}`);
    lines.push("G92 E0");
    lines.push(`;Z:${fixed(z, 3)}`);
    lines.push(`G1 Z${fixed(z)} F600`);
    if (layer === 0) {
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
        const prev = pointToMachine(path.points[i - 1], params);
        const next = pointToMachine(path.points[i], params);
        const nextLocal = path.points[i];
        const distance = Math.hypot(next.x - prev.x, next.y - prev.y);
        const extrusion = extrusionForDistance(distance, params);
        const nextZ = usePathZMod ? getZModulatedHeight(z, nextLocal, params) : z;
        totalExtrusion += extrusion;
        totalPrintDistance += distance;
        totalMoves += 1;
        if (usePathZMod) {
          lines.push(
            `G1 X${fixed(next.x)} Y${fixed(next.y)} Z${fixed(nextZ)} E${fixed(extrusion, 5)} F${fixed(params.printSpeed, 0)}`
          );
        } else {
          lines.push(
            `G1 X${fixed(next.x)} Y${fixed(next.y)} E${fixed(extrusion, 5)} F${fixed(params.printSpeed, 0)}`
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
    totalPrintDistance / params.printSpeed +
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
  drawPreview();
  updateGcode();
}

function syncParamInputs(name, value) {
  document.querySelectorAll(`[data-param="${name}"]`).forEach((input) => {
    input.value = value;
  });
}

function syncHeightParams(changedParam) {
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
    state[name] = preset[name];
    syncParamInputs(name, preset[name]);
  });

  render();
}

document.querySelectorAll("[data-param]").forEach((input) => {
  input.addEventListener("input", handleParamInput);
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
  state.workspaceMode = mode;
  geometryControlsPanel.classList.toggle("hidden", mode !== "geometry");
  imageControlsPanel.classList.toggle("hidden", mode !== "image");
  modeSwitchButtons.forEach((button) => {
    const isActive = button.dataset.workspaceMode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.body.dataset.workspaceMode = mode;
  render();
}

function setViewMode(mode) {
  state.viewMode = mode;
  viewModeButtons.forEach((button) => {
    const isActive = button.dataset.viewMode === mode;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  render();
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
    setWorkspaceMode(button.dataset.workspaceMode);
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
  const modeSlug = state.workspaceMode === "image" ? "image-modulation" : state.patternMode;
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

enterGeometryMode.addEventListener("click", () => enterWorkspace("geometry"));
enterImageMode.addEventListener("click", () => enterWorkspace("image"));

window.addEventListener("resize", () => {
  drawPreview();
  if (introIsRunning) resizeIntroCanvas();
});

startIntroAnimation();
setSettingsMode("basic");
render();
