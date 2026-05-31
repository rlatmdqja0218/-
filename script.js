const introScreen = document.querySelector("#introScreen");
const introCanvas = document.querySelector("#introCanvas");
const introCtx = introCanvas.getContext("2d");
const enterButton = document.querySelector("#enterButton");
const canvas = document.querySelector("#toolpathCanvas");
const ctx = canvas.getContext("2d");
const gcodeOutput = document.querySelector("#gcodeOutput");
const downloadButton = document.querySelector("#downloadButton");
const copyButton = document.querySelector("#copyButton");
const macroPreset = document.querySelector("#macroPreset");
const filamentPreset = document.querySelector("#filamentPreset");
const settingsModeInputs = document.querySelectorAll('input[name="settingsMode"]');
const advancedSettingSections = document.querySelectorAll('[data-mode="advanced"]');
const patternTitle = document.querySelector("#patternTitle");
const pathCount = document.querySelector("#pathCount");
const lineLength = document.querySelector("#lineLength");
const gcodeSummary = document.querySelector("#gcodeSummary");

const state = {
  patternMode: "weave",
  width: 120,
  height: 120,
  density: 1.6,
  spacing: 7.5,
  crossAngle: 90,
  weaveAmplitude: 1.4,
  travelSpeed: 7200,
  printSpeed: 1800,
  extrusionMultiplier: 0.92,
  retractionLength: 1.0,
  retractionSpeed: 1800,
  layerHeight: 0.28,
  layers: 4,
  totalHeight: 1.12,
  nozzleDiameter: 0.4,
  filamentDiameter: 1.75,
  bedTemp: 60,
  nozzleTemp: 210,
  originX: 60,
  originY: 60,
  macroPreset: "minimal",
  filamentPreset: "custom",
};

const patternNames = {
  grid: "직교 격자",
  weave: "직조 편향",
  mesh: "미세 메시",
};

const filamentPresets = {
  pla: { nozzleTemp: 220, bedTemp: 55, printSpeed: 1800, extrusionMultiplier: 0.98 },
  petg: { nozzleTemp: 255, bedTemp: 70, printSpeed: 1200, extrusionMultiplier: 0.93 },
  abs: { nozzleTemp: 260, bedTemp: 90, printSpeed: 2100, extrusionMultiplier: 0.95 },
  tpu: { nozzleTemp: 230, bedTemp: 35, printSpeed: 720, extrusionMultiplier: 1.02 },
  silkPla: { nozzleTemp: 230, bedTemp: 55, printSpeed: 1200, extrusionMultiplier: 0.97 },
  carbonPla: { nozzleTemp: 235, bedTemp: 55, printSpeed: 1600, extrusionMultiplier: 0.95 },
};

const filamentPresetParams = ["nozzleTemp", "bedTemp", "printSpeed", "extrusionMultiplier"];
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

function enterWorkspace() {
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

function generateStraightSet(angle, spacing, width, height, phase = 0) {
  const diagonal = Math.hypot(width, height);
  const paths = [];
  let index = 0;

  for (let offset = -diagonal / 2; offset <= diagonal / 2; offset += spacing) {
    const segment = getLineSegment(angle, offset + phase, width, height);
    if (segment) {
      if (index % 2 === 1) segment.reverse();
      paths.push({ points: segment, family: "straight" });
      index += 1;
    }
  }

  return paths;
}

function generateWeaveSet(params, spacing) {
  const paths = [];
  const halfW = params.width / 2;
  const halfH = params.height / 2;
  const sampleCount = Math.max(18, Math.round(params.width / 3));
  const period = Math.max(spacing * 2.4, 8);
  let rowIndex = 0;

  for (let y = -halfH; y <= halfH; y += spacing) {
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
  }

  return paths;
}

function generatePaths(params, layerIndex = 0) {
  const spacing = Math.max(0.6, params.spacing / params.density);
  const layerShift = (layerIndex % 2) * spacing * 0.5;

  if (params.patternMode === "grid") {
    return [
      ...generateStraightSet(0, spacing, params.width, params.height, layerShift),
      ...generateStraightSet(toRadians(params.crossAngle), spacing, params.width, params.height, -layerShift),
    ];
  }

  if (params.patternMode === "mesh") {
    return [
      ...generateStraightSet(0, spacing, params.width, params.height, layerShift),
      ...generateStraightSet(toRadians(params.crossAngle), spacing * 1.18, params.width, params.height, 0),
      ...generateStraightSet(toRadians(-params.crossAngle), spacing * 1.18, params.width, params.height, 0),
    ];
  }

  return [
    ...generateWeaveSet(params, spacing),
    ...generateStraightSet(toRadians(params.crossAngle), spacing * 1.65, params.width, params.height, layerShift),
  ];
}

function getAllLayerPaths(params) {
  const paths = [];
  for (let layer = 0; layer < params.layers; layer += 1) {
    generatePaths(params, layer).forEach((path) => {
      paths.push({ ...path, layer });
    });
  }
  return paths;
}

function getStats(paths) {
  const length = paths.reduce((total, path) => total + segmentLength(path.points), 0);
  const moves = paths.reduce((total, path) => total + Math.max(path.points.length - 1, 0), 0);
  return { length, moves };
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
  const scale = Math.min((width - margin * 2) / state.width, (height - margin * 2) / state.height);
  const centerX = width / 2;
  const centerY = height / 2;
  const halfW = (state.width * scale) / 2;
  const halfH = (state.height * scale) / 2;
  const paths = generatePaths(state, 0);
  const stats = getStats(paths);

  ctx.save();
  ctx.strokeStyle = "#d0d0d0";
  ctx.lineWidth = 1;
  ctx.strokeRect(centerX - halfW, centerY - halfH, halfW * 2, halfH * 2);

  ctx.beginPath();
  ctx.moveTo(centerX - halfW, centerY);
  ctx.lineTo(centerX + halfW, centerY);
  ctx.moveTo(centerX, centerY - halfH);
  ctx.lineTo(centerX, centerY + halfH);
  ctx.strokeStyle = "#e5e5e5";
  ctx.stroke();

  paths.forEach((path, index) => {
    ctx.beginPath();
    path.points.forEach((point, pointIndex) => {
      const x = centerX + point.x * scale;
      const y = centerY - point.y * scale;
      if (pointIndex === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = path.family === "weave" ? "#111111" : index % 2 ? "#555555" : "#2b5f55";
    ctx.lineWidth = path.family === "weave" ? 1.35 : 1;
    ctx.stroke();
  });

  ctx.fillStyle = "#111";
  ctx.font = "12px ui-sans-serif, system-ui";
  ctx.fillText(`${fixed(state.width, 1)} x ${fixed(state.height, 1)} mm`, centerX - halfW, centerY + halfH + 22);
  ctx.restore();

  patternTitle.textContent = patternNames[state.patternMode];
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

  const safeZ = fixed(params.layerHeight * params.layers + 8);
  return [
    "; Minimal safe end macro",
    "M400",
    "G92 E0",
    "G1 E-1 F1800",
    `G1 Z${safeZ} F900`,
    "M104 S0",
    "M140 S0",
    "M106 S0",
    "G1 X0 Y0 F6000",
    "M84",
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

function generateGcode(params) {
  const lines = [
    "; Generated by G-CODE TOOL",
    `; Pattern: ${patternNames[params.patternMode]}`,
    `; Footprint: ${fixed(params.width, 1)} x ${fixed(params.height, 1)} mm`,
    `; Layers: ${fixed(params.layers, 0)}`,
    `; Layer height: ${fixed(params.layerHeight, 2)} mm`,
    `; Total height: ${fixed(params.totalHeight, 2)} mm`,
    `; Density: ${fixed(params.density, 2)}, spacing: ${fixed(params.spacing, 2)} mm, angle: ${fixed(params.crossAngle, 1)} deg`,
    ...getStartMacro(params),
  ];

  let totalExtrusion = 0;
  let totalMoves = 0;
  let hasPrintedPath = false;
  const shouldRetract = params.retractionLength > 0;

  for (let layer = 0; layer < params.layers; layer += 1) {
    const z = params.layerHeight * (layer + 1);
    const paths = generatePaths(params, layer);
    lines.push(`;LAYER:${layer}`);
    lines.push("G92 E0");
    lines.push(`;Z:${fixed(z, 3)}`);
    lines.push(`G1 Z${fixed(z)} F600`);

    paths.forEach((path, pathIndex) => {
      const start = pointToMachine(path.points[0], params);
      lines.push(`; path ${pathIndex + 1} / ${paths.length}`);
      if (hasPrintedPath && shouldRetract) {
        lines.push(getRetractionMove(params, -1));
      }
      lines.push(`G0 X${fixed(start.x)} Y${fixed(start.y)} F${fixed(params.travelSpeed, 0)}`);
      if (hasPrintedPath && shouldRetract) {
        lines.push(getRetractionMove(params, 1));
      }

      for (let i = 1; i < path.points.length; i += 1) {
        const prev = pointToMachine(path.points[i - 1], params);
        const next = pointToMachine(path.points[i], params);
        const distance = Math.hypot(next.x - prev.x, next.y - prev.y);
        const extrusion = extrusionForDistance(distance, params);
        totalExtrusion += extrusion;
        totalMoves += 1;
        lines.push(
          `G1 X${fixed(next.x)} Y${fixed(next.y)} E${fixed(extrusion, 5)} F${fixed(params.printSpeed, 0)}`
        );
      }
      hasPrintedPath = true;
    });
  }

  lines.push(...getEndMacro(params));
  lines.push(`; Total extrusion estimate: ${fixed(totalExtrusion, 3)} mm`);
  lines.push(`; Extrusion moves: ${totalMoves}`);
  lines.push("; End of G-CODE TOOL file");

  return {
    text: `${lines.join("\n")}\n`,
    totalExtrusion,
    totalMoves,
  };
}

function updateGcode() {
  const result = generateGcode(state);
  gcodeOutput.value = result.text;
  const bytes = new Blob([result.text]).size;
  gcodeSummary.textContent = `${result.totalMoves} extrusion moves, ${Math.round(bytes / 1024)} KB`;
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

downloadButton.addEventListener("click", () => {
  const result = generateGcode(state);
  const blob = new Blob([result.text], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
  link.href = URL.createObjectURL(blob);
  link.download = `g-code-tool-${state.patternMode}-${timestamp}.gcode`;
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

enterButton.addEventListener("click", enterWorkspace);

window.addEventListener("resize", () => {
  drawPreview();
  if (introIsRunning) resizeIntroCanvas();
});

startIntroAnimation();
setSettingsMode("basic");
render();
