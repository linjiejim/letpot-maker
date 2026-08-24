"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  ADAPTER_STANDARD,
  createModel,
  DEFAULT_OPTIONS,
  disposeObject,
  getDefaultShapeParameters,
  MODEL_LIBRARY,
  MODEL_TAGS,
  type ModelDefinition,
  type ModelId,
  type ModelOptions,
  type ModelTag,
} from "../lib/model-factory";
import styles from "./PodStyler.module.css";

type PodAssignment = ModelId | null;
type Category = "all" | ModelTag;
type MachineId = "max" | "se" | "air" | "mini";

type PodPosition = {
  x: number;
  z: number;
  mapColumn: number;
  mapRow: number;
};

type MachineSpec = {
  id: MachineId;
  name: string;
  code: string;
  descriptor: string;
  podCount: number;
  mapColumns: number;
  capacity: string;
  power: string;
  dimensions: string;
  bodyWidth: number;
  bodyDepth: number;
  bodyHeight: number;
  bodyColor: string;
  deckColor: string;
  trimColor: string;
  lampColor: string;
  deckY: number;
  poleZ: number;
  lampY: number;
  lampWidth: number;
  lampDepth: number;
  lightIntensity: number;
  finish: "steel" | "abs";
  hasDisplay: boolean;
  waterWindowX: number;
  fillPortX: number;
  pods: PodPosition[];
  camera: [number, number, number];
  targetY: number;
};

type SceneHandles = {
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  renderer: THREE.WebGLRenderer;
  anchors: THREE.Group[];
  targets: THREE.Mesh[];
  rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[];
  lampMaterial: THREE.MeshStandardMaterial;
  growLight: THREE.RectAreaLight;
};

const MODEL_SCALE = 0.024;
const ADAPTER_HEIGHT_WORLD = ADAPTER_STANDARD.totalHeight * MODEL_SCALE;
const LOW_POLY_MODELS = MODEL_LIBRARY.filter((item) => item.style === "lowpoly");

function gridPods(columns: number, rows: number, xGap: number, zGap: number): PodPosition[] {
  const pods: PodPosition[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      pods.push({
        x: (column - (columns - 1) / 2) * xGap,
        z: (row - (rows - 1) / 2) * zGap,
        mapColumn: column + 1,
        mapRow: row + 1,
      });
    }
  }
  return pods;
}

const MACHINE_SPECS: Record<MachineId, MachineSpec> = {
  max: {
    id: "max",
    name: "Max",
    code: "LPH-MAX",
    descriptor: "21-pod automatic garden",
    podCount: 21,
    mapColumns: 7,
    capacity: "7.5 L",
    power: "36 W",
    dimensions: "15.75 × 7.09 in",
    bodyWidth: 14.6,
    bodyDepth: 6.55,
    bodyHeight: 4.35,
    bodyColor: "#aeb6b1",
    deckColor: "#202823",
    trimColor: "#303832",
    lampColor: "#252c28",
    deckY: 4.53,
    poleZ: -3.18,
    lampY: 15.35,
    lampWidth: 14.7,
    lampDepth: 6.2,
    lightIntensity: 4.6,
    finish: "steel",
    hasDisplay: true,
    waterWindowX: -6.15,
    fillPortX: 6.05,
    pods: gridPods(7, 3, 1.86, 1.76),
    camera: [20.4, 19.8, 27.8],
    targetY: 7.2,
  },
  se: {
    id: "se",
    name: "SE",
    code: "LPH-SE",
    descriptor: "12-pod stainless garden",
    podCount: 12,
    mapColumns: 6,
    capacity: "5.5 L",
    power: "24 W",
    dimensions: "16 × 7 in",
    bodyWidth: 13.1,
    bodyDepth: 5.78,
    bodyHeight: 3.55,
    bodyColor: "#d9deda",
    deckColor: "#28312c",
    trimColor: "#aab3ad",
    lampColor: "#29312d",
    deckY: 3.72,
    poleZ: -2.73,
    lampY: 13.4,
    lampWidth: 13.15,
    lampDepth: 5.5,
    lightIntensity: 3.8,
    finish: "steel",
    hasDisplay: false,
    waterWindowX: -5.48,
    fillPortX: 5.38,
    pods: gridPods(6, 2, 1.93, 2.12),
    camera: [18.2, 17.2, 24.5],
    targetY: 6.15,
  },
  air: {
    id: "air",
    name: "Air",
    code: "LPH-AIR",
    descriptor: "10-pod compact garden",
    podCount: 10,
    mapColumns: 5,
    capacity: "4 L",
    power: "24 W",
    dimensions: "15 × 7 in",
    bodyWidth: 12.25,
    bodyDepth: 5.35,
    bodyHeight: 3.08,
    bodyColor: "#c7d7c1",
    deckColor: "#dfe7da",
    trimColor: "#91a68e",
    lampColor: "#dde5d9",
    deckY: 3.25,
    poleZ: -2.48,
    lampY: 11.65,
    lampWidth: 12.35,
    lampDepth: 4.9,
    lightIntensity: 3.4,
    finish: "abs",
    hasDisplay: false,
    waterWindowX: 5.08,
    fillPortX: 5.05,
    pods: gridPods(5, 2, 2.16, 1.92),
    camera: [16.4, 15.2, 22.2],
    targetY: 5.45,
  },
  mini: {
    id: "mini",
    name: "Mini",
    code: "LPH-MINI",
    descriptor: "5-pod starter garden",
    podCount: 5,
    mapColumns: 3,
    capacity: "1.5 L",
    power: "10 W",
    dimensions: "8.7 × 5.3 in",
    bodyWidth: 7.45,
    bodyDepth: 4.55,
    bodyHeight: 3.18,
    bodyColor: "#eef0ea",
    deckColor: "#dfe7da",
    trimColor: "#91a68e",
    lampColor: "#f0f1eb",
    deckY: 3.34,
    poleZ: -2.02,
    lampY: 11.25,
    lampWidth: 7.75,
    lampDepth: 4.55,
    lightIntensity: 2.6,
    finish: "abs",
    hasDisplay: false,
    waterWindowX: 2.78,
    fillPortX: 2.82,
    pods: [
      { x: -1.86, z: 0.92, mapColumn: 1, mapRow: 2 },
      { x: 0, z: 0.92, mapColumn: 2, mapRow: 2 },
      { x: 1.86, z: 0.92, mapColumn: 3, mapRow: 2 },
      { x: -1.05, z: -0.92, mapColumn: 1, mapRow: 1 },
      { x: 1.05, z: -0.92, mapColumn: 3, mapRow: 1 },
    ],
    camera: [12.7, 14.2, 18.5],
    targetY: 5.15,
  },
};

const INITIAL_ASSIGNMENTS: Record<MachineId, PodAssignment[]> = {
  max: ["sprout", null, null, "mushroom", null, null, "pine", null, "frog", null, null, null, "sunflower", null, "cactus", null, null, "hedgehog", null, null, null],
  se: ["sprout", null, null, "mushroom", null, "frog", null, null, "pine", null, "sunflower", null],
  air: ["sprout", null, "mushroom", null, "frog", null, "pine", null, "sunflower", null],
  mini: ["sprout", null, "frog", null, "mushroom"],
};

const TAG_LABELS: Record<ModelTag, string> = {
  lowpoly: "Low poly",
  realistic: "Realistic",
  veggie: "Veggie",
  herbs: "Herbs",
  tree: "Tree",
  fruit: "Fruit",
  flower: "Flower",
  animal: "Animal",
  christmas: "Christmas",
  other: "Other",
};
const AVAILABLE_TAGS = MODEL_TAGS.filter((tag) => LOW_POLY_MODELS.some((model) => model.tags.includes(tag)));

function optionsFor(definition: ModelDefinition): ModelOptions {
  return {
    ...DEFAULT_OPTIONS,
    modelId: definition.id,
    ...definition.defaults,
    faceted: true,
    shape: getDefaultShapeParameters(definition),
  };
}

function material(color: THREE.ColorRepresentation, roughness = 0.58, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function setShadows(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material.visible) {
      if (child.userData.noShadow) {
        child.castShadow = false;
        child.receiveShadow = false;
        return;
      }
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
}

function makeLogoTexture(color = "#173820") {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 180;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  if (!context) return texture;

  const drawWordmark = (icon?: HTMLImageElement) => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = color;
    if (icon) {
      const iconCanvas = document.createElement("canvas");
      iconCanvas.width = 99;
      iconCanvas.height = 130;
      const iconContext = iconCanvas.getContext("2d");
      if (iconContext) {
        iconContext.drawImage(icon, 0, 0, 99, 130);
        iconContext.globalCompositeOperation = "source-in";
        iconContext.fillStyle = color;
        iconContext.fillRect(0, 0, 99, 130);
        context.drawImage(iconCanvas, 78, 24, 91, 119);
      }
    }
    context.font = "700 92px Arial, Helvetica, sans-serif";
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.fillText("LetPot", 192, 94);
    texture.needsUpdate = true;
  };

  drawWordmark();
  const icon = new Image();
  icon.onload = () => drawWordmark(icon);
  icon.src = "/logo-icon.png";
  return texture;
}

function wordmarkMesh(color: string, width: number, height: number) {
  const logo = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: makeLogoTexture(color), transparent: true, alphaTest: 0.04, toneMapped: false, depthWrite: false, side: THREE.DoubleSide }),
  );
  logo.renderOrder = 4;
  logo.userData.noShadow = true;
  return logo;
}

function addBranding(machine: THREE.Group, spec: MachineSpec) {
  if (spec.id === "max") {
    const logo = wordmarkMesh("#ffffff", 3.25, 0.76);
    logo.name = "max_lamp_top_logo";
    logo.rotation.x = -Math.PI / 2;
    logo.position.set(0, spec.lampY + 0.34, 0);
    machine.add(logo);
    return;
  }

  const logo = wordmarkMesh(
    spec.finish === "steel" ? "#294334" : "#22472d",
    spec.id === "mini" ? 2.15 : 2.6,
    spec.id === "mini" ? 0.5 : 0.61,
  );
  logo.name = `${spec.id}_centered_tank_logo`;
  logo.position.set(0, spec.bodyHeight * 0.55 + 0.15, spec.bodyDepth / 2 + 0.071);
  machine.add(logo);
}

function addFrontDetails(machine: THREE.Group, spec: MachineSpec, deep: THREE.Material, accent: THREE.Material) {
  const detailZ = spec.bodyDepth / 2 + 0.07;
  if (spec.hasDisplay) {
    const displayFrame = new THREE.Mesh(new RoundedBoxGeometry(4.75, 2.08, 0.13, 4, 0.12), deep);
    displayFrame.name = "max_centered_display";
    displayFrame.position.set(0, 2.35, detailZ);
    machine.add(displayFrame);
    const displayGlass = new THREE.Mesh(new RoundedBoxGeometry(4.08, 1.34, 0.08, 4, 0.09), material("#10211a", 0.22, 0.12));
    displayGlass.position.set(0, 2.53, detailZ + 0.08);
    machine.add(displayGlass);
    const readout = new THREE.Mesh(new THREE.PlaneGeometry(2.55, 0.28), new THREE.MeshBasicMaterial({ color: "#79a76e" }));
    readout.position.set(0, 2.68, detailZ + 0.13);
    machine.add(readout);
    for (let index = 0; index < 6; index += 1) {
      const button = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.13, 16), new THREE.MeshBasicMaterial({ color: index === 2 ? "#8cc63f" : "#718078" }));
      button.position.set(-1.9 + index * 0.76, 1.55, detailZ + 0.12);
      machine.add(button);
    }
  }

  const window = new THREE.Mesh(new RoundedBoxGeometry(0.38, spec.id === "mini" ? 1.36 : 1.55, 0.08, 3, 0.08), deep);
  window.position.set(spec.waterWindowX, spec.bodyHeight * 0.48, detailZ);
  machine.add(window);
  const water = new THREE.Mesh(new RoundedBoxGeometry(0.19, spec.id === "mini" ? 0.75 : 0.92, 0.09, 3, 0.05), material("#72a9a3", 0.32));
  water.position.set(spec.waterWindowX, spec.bodyHeight * 0.42, detailZ + 0.065);
  machine.add(water);
  const status = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), accent);
  status.position.set(-spec.bodyWidth * 0.39, spec.bodyHeight * 0.3, detailZ + 0.03);
  machine.add(status);
}

function addLampControls(machine: THREE.Group, spec: MachineSpec) {
  if (spec.hasDisplay) return;
  const isMini = spec.id === "mini";
  const padWidth = isMini ? 1.1 : 2.55;
  const padMaterial = material(spec.id === "se" ? "#cbd2cd" : "#edf1e9", 0.42, spec.id === "se" ? 0.22 : 0.02);
  const pad = new THREE.Mesh(new RoundedBoxGeometry(padWidth, 0.08, isMini ? 0.48 : 0.58, 3, 0.12), padMaterial);
  pad.name = `${spec.id}_lamp_control_pad`;
  pad.position.set(0, spec.lampY + 0.38, 0);
  pad.userData.noShadow = true;
  machine.add(pad);
  const count = isMini ? 1 : 4;
  for (let index = 0; index < count; index += 1) {
    const control = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.105, 16), new THREE.MeshBasicMaterial({ color: index === 0 ? "#4f9152" : "#66736b", depthWrite: false }));
    control.name = `${spec.id}_lamp_button_${index + 1}`;
    control.rotation.x = -Math.PI / 2;
    control.position.set((index - (count - 1) / 2) * 0.48, spec.lampY + 0.425, 0);
    control.renderOrder = 4;
    control.userData.noShadow = true;
    machine.add(control);
  }
}

function createMachine(scene: THREE.Scene, spec: MachineSpec) {
  const machine = new THREE.Group();
  machine.name = `${spec.code} pod styling preview`;
  const bodyMaterial = material(spec.bodyColor, spec.finish === "steel" ? 0.3 : 0.62, spec.finish === "steel" ? 0.58 : 0.03);
  const trimMaterial = material(spec.trimColor, spec.finish === "steel" ? 0.34 : 0.55, spec.finish === "steel" ? 0.42 : 0.02);
  const deckMaterial = material(spec.deckColor, 0.48, spec.finish === "steel" ? 0.14 : 0.02);
  const deep = material("#1d2822", 0.42, 0.12);
  const poleMaterial = material(spec.id === "air" ? "#87988a" : "#3b4540", 0.36, 0.28);
  const telescopingMaterial = material("#aab2ad", 0.28, 0.52);
  const accent = material("#568f52", 0.52);

  const body = new THREE.Mesh(new RoundedBoxGeometry(spec.bodyWidth, spec.bodyHeight, spec.bodyDepth, 8, spec.id === "mini" ? 0.38 : 0.46), bodyMaterial);
  // Keep the tank top below the tray instead of sharing a depth plane with it.
  // The old coplanar surfaces caused the bright edge flicker while orbiting.
  body.position.y = spec.deckY - 0.15 - spec.bodyHeight / 2;
  machine.add(body);
  const baseBand = new THREE.Mesh(new RoundedBoxGeometry(spec.bodyWidth * 0.97, 0.38, spec.bodyDepth * 1.005, 6, 0.18), trimMaterial);
  baseBand.position.y = 0.34;
  machine.add(baseBand);
  const deck = new THREE.Mesh(new RoundedBoxGeometry(spec.bodyWidth * 0.975, 0.18, spec.bodyDepth * 0.93, 6, 0.2), trimMaterial);
  deck.position.y = spec.deckY - 0.035;
  machine.add(deck);
  const deckInset = new THREE.Mesh(new RoundedBoxGeometry(spec.bodyWidth * 0.91, 0.09, spec.bodyDepth * 0.82, 5, 0.16), deckMaterial);
  deckInset.position.y = spec.deckY + 0.105;
  machine.add(deckInset);

  // This is the physical top face used as the Pod installation datum.
  const deckSurfaceY = spec.deckY + 0.15;

  const anchors: THREE.Group[] = [];
  const targets: THREE.Mesh[] = [];
  const rings: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>[] = [];
  spec.pods.forEach((position, index) => {
    const pod = new THREE.Group();
    pod.position.set(position.x, 0, position.z);
    // These are visual overlays rather than boolean holes. Give every layer a
    // distinct height so the solid tray, opening, rim, adapter and selection
    // ring never compete for the same depth value while the camera moves.
    const openingMaterial = new THREE.MeshBasicMaterial({ color: "#1d2822", polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const opening = new THREE.Mesh(new THREE.CircleGeometry(0.47, 32), openingMaterial);
    opening.rotation.x = -Math.PI / 2;
    opening.position.y = deckSurfaceY + 0.012;
    opening.renderOrder = 1;
    opening.userData.noShadow = true;
    const rimMaterial = new THREE.MeshBasicMaterial({ color: spec.trimColor, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.55, 32), rimMaterial);
    rim.rotation.x = -Math.PI / 2;
    rim.position.y = deckSurfaceY + 0.026;
    rim.renderOrder = 2;
    rim.userData.noShadow = true;
    pod.add(rim, opening);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: "#2e8b3d", transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
    const selectionRing = new THREE.Mesh(new THREE.RingGeometry(0.59, 0.7, 36), ringMaterial);
    selectionRing.rotation.x = -Math.PI / 2;
    selectionRing.position.y = deckSurfaceY + 0.075;
    selectionRing.renderOrder = 6;
    selectionRing.userData.noShadow = true;
    pod.add(selectionRing);
    rings.push(selectionRing);
    const anchor = new THREE.Group();
    // The Ø41 mm adapter face sits flush with the machine cover. Its Ø33 mm
    // locator and tapered lower section therefore remain inside the tank. A
    // sub-millimetre preview lift prevents the face from z-fighting the tray.
    anchor.position.y = deckSurfaceY + 0.04 - ADAPTER_HEIGHT_WORLD;
    pod.add(anchor);
    anchors.push(anchor);
    const target = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.76, 0.7, 20),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    target.position.y = deckSurfaceY + 0.12;
    target.userData.podIndex = index;
    pod.add(target);
    targets.push(target);
    machine.add(pod);
  });

  if (spec.id !== "max") {
    const fillRing = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 28), trimMaterial);
    fillRing.position.y = deckSurfaceY + 0.05;
    const fillCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.07, 24), deep);
    fillCenter.position.y = deckSurfaceY + 0.135;
    const fillPort = new THREE.Group();
    fillPort.add(fillRing, fillCenter);
    fillPort.position.set(spec.fillPortX, 0, spec.bodyDepth * 0.31);
    machine.add(fillPort);
  }

  const armBaseWidth = spec.id === "air" ? 1.12 : spec.id === "mini" ? 0.82 : 1.18;
  const armBase = new THREE.Mesh(new RoundedBoxGeometry(armBaseWidth, 0.62, 0.85, 4, 0.14), deep);
  armBase.position.set(0, spec.deckY + 0.22, spec.poleZ);
  machine.add(armBase);
  const lowerPoleHeight = (spec.lampY - spec.deckY) * 0.63;
  const lowerPole = new THREE.Mesh(new RoundedBoxGeometry(armBaseWidth * 0.67, lowerPoleHeight, 0.58, 4, 0.1), poleMaterial);
  lowerPole.position.set(0, spec.deckY + lowerPoleHeight / 2 + 0.42, spec.poleZ);
  machine.add(lowerPole);
  const upperPoleHeight = (spec.lampY - spec.deckY) * 0.36;
  const upperPole = new THREE.Mesh(new RoundedBoxGeometry(armBaseWidth * 0.48, upperPoleHeight, 0.42, 4, 0.09), telescopingMaterial);
  upperPole.position.set(0, spec.lampY - upperPoleHeight / 2 - 0.42, spec.poleZ);
  machine.add(upperPole);
  if (spec.id === "air") {
    const adjustButton = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.84, 0.08, 4, 0.09), deep);
    adjustButton.position.set(0, spec.deckY + lowerPoleHeight * 0.72, spec.poleZ + 0.34);
    machine.add(adjustButton);
  }
  for (let index = 0; index < 3; index += 1) {
    const collar = new THREE.Mesh(new RoundedBoxGeometry(armBaseWidth * 0.57, 0.11, 0.48, 3, 0.04), deep);
    collar.position.set(0, spec.lampY - 1.25 - index * 1.08, spec.poleZ);
    machine.add(collar);
  }

  const neck = new THREE.Mesh(new RoundedBoxGeometry(1.18, 0.46, Math.max(0.9, Math.abs(spec.poleZ) * 1.7), 4, 0.12), deep);
  neck.position.set(0, spec.lampY - 0.25, spec.poleZ / 2);
  machine.add(neck);
  const lamp = new THREE.Mesh(new RoundedBoxGeometry(spec.lampWidth, 0.62, spec.lampDepth, 8, spec.id === "mini" ? 0.34 : 0.42), material(spec.lampColor, 0.48, spec.finish === "steel" ? 0.22 : 0.02));
  lamp.position.set(0, spec.lampY, 0);
  machine.add(lamp);
  const lampMaterial = new THREE.MeshStandardMaterial({ color: "#727b75", roughness: 0.7, emissive: new THREE.Color("#dff7b1"), emissiveIntensity: 0.02 });
  const lampPanel = new THREE.Mesh(new RoundedBoxGeometry(spec.lampWidth * 0.92, 0.06, spec.lampDepth * 0.82, 4, 0.16), lampMaterial);
  lampPanel.position.set(0, spec.lampY - 0.39, 0.02);
  machine.add(lampPanel);
  addLampControls(machine, spec);
  addBranding(machine, spec);
  addFrontDetails(machine, spec, deep, accent);

  const growLight = new THREE.RectAreaLight("#efffd9", 0, spec.lampWidth * 0.88, spec.lampDepth * 0.78);
  growLight.position.set(0, spec.lampY - 0.62, 0);
  growLight.lookAt(0, 0, 0);
  machine.add(growLight);
  setShadows(machine);
  deck.castShadow = false;
  deck.receiveShadow = true;
  deckInset.castShadow = false;
  deckInset.receiveShadow = true;
  lampPanel.castShadow = false;
  lampPanel.receiveShadow = false;
  targets.forEach((target) => { target.castShadow = false; target.receiveShadow = false; });
  scene.add(machine);
  return { machine, anchors, targets, rings, lampMaterial, growLight };
}

function setGrowLight(handles: Pick<SceneHandles, "growLight" | "lampMaterial">, spec: MachineSpec, on: boolean) {
  handles.growLight.intensity = on ? spec.lightIntensity : 0;
  handles.lampMaterial.emissiveIntensity = on ? 1.45 : 0.02;
  handles.lampMaterial.color.set(on ? "#eef6d9" : "#727b75");
}

function modelMatchesCategory(model: ModelDefinition, category: Category) {
  if (category === "all") return true;
  return model.tags.includes(category);
}

const thumbnailCache = new Map<ModelId, string>();
let thumbnailRenderer: THREE.WebGLRenderer | null = null;

function renderModelThumbnail(definition: ModelDefinition) {
  const cached = thumbnailCache.get(definition.id);
  if (cached) return cached;

  try {
    if (!thumbnailRenderer) {
      thumbnailRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: "low-power" });
      thumbnailRenderer.setPixelRatio(1);
      thumbnailRenderer.outputColorSpace = THREE.SRGBColorSpace;
      thumbnailRenderer.toneMapping = THREE.ACESFilmicToneMapping;
      thumbnailRenderer.toneMappingExposure = 1.04;
    }
    thumbnailRenderer.setSize(320, 244, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#edf5ea");
    scene.add(new THREE.HemisphereLight("#fffdf6", "#708271", 2.8));
    const key = new THREE.DirectionalLight("#fff8e8", 4.5);
    key.position.set(45, 72, 55);
    scene.add(key);
    const fill = new THREE.DirectionalLight("#bfe0c2", 1.7);
    fill.position.set(-36, 28, -30);
    scene.add(fill);

    const build = createModel(optionsFor(definition));
    build.assembly.rotation.y = -0.42;
    build.assembly.updateMatrixWorld(true);
    scene.add(build.assembly);
    const bounds = new THREE.Box3().setFromObject(build.assembly);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const diameter = Math.max(size.x, size.y, size.z);
    const camera = new THREE.PerspectiveCamera(31, 320 / 244, 0.1, 600);
    camera.position.set(center.x + diameter * 1.1, center.y + diameter * 0.55, center.z + diameter * 1.55);
    camera.lookAt(center.x, center.y + size.y * 0.04, center.z);
    thumbnailRenderer.render(scene, camera);
    const preview = thumbnailRenderer.domElement.toDataURL("image/webp", 0.86);
    thumbnailCache.set(definition.id, preview);
    disposeObject(build.assembly);
    return preview;
  } catch {
    return "";
  }
}

function ModelThumbnail({ model }: { model: ModelDefinition }) {
  const [preview, setPreview] = useState(() => thumbnailCache.get(model.id) ?? "");

  useEffect(() => {
    if (preview) return;
    const frame = window.requestAnimationFrame(() => setPreview(renderModelThumbnail(model)));
    return () => window.cancelAnimationFrame(frame);
  }, [model, preview]);

  return (
    <span className={`${styles.modelPreview} ${preview ? styles.readyPreview : ""}`} style={preview ? { backgroundImage: `url(${preview})` } : undefined} aria-hidden="true">
      {!preview && model.symbol}
    </span>
  );
}

export function PodStyler() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SceneHandles | null>(null);
  const renderedAssignmentsRef = useRef<PodAssignment[]>([]);
  const lightOnRef = useRef(false);
  const autoRotateRef = useRef(false);
  const [machineId, setMachineId] = useState<MachineId>("se");
  const [assignments, setAssignments] = useState<PodAssignment[]>(INITIAL_ASSIGNMENTS.se);
  const [history, setHistory] = useState<PodAssignment[][]>([]);
  const [selectedPod, setSelectedPod] = useState(5);
  const [selectedPods, setSelectedPods] = useState<number[]>([5]);
  const [activeModel, setActiveModel] = useState<ModelId>("frog");
  const [category, setCategory] = useState<Category>("all");
  const [autoRotate, setAutoRotate] = useState(false);
  const [lightOn, setLightOn] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [message, setMessage] = useState("SE · Pod 06 selected");
  const spec = MACHINE_SPECS[machineId];

  const selectedDefinition = useMemo(() => MODEL_LIBRARY.find((item) => item.id === assignments[selectedPod]) ?? null, [assignments, selectedPod]);
  const selectedPodsWithContent = selectedPods.filter((index) => Boolean(assignments[index]));
  const selectedPodLabel = selectedPods.length === 1
    ? `Pod ${String(selectedPod + 1).padStart(2, "0")}`
    : `${selectedPods.length} Pods`;
  const selectedPodDetail = selectedPods.length === 1
    ? selectedDefinition?.name ?? "Empty"
    : selectedPods.map((index) => String(index + 1).padStart(2, "0")).join(" · ");
  const visibleModels = useMemo(() => LOW_POLY_MODELS.filter((item) => modelMatchesCategory(item, category)), [category]);
  const assignedCount = assignments.filter(Boolean).length;

  useEffect(() => { lightOnRef.current = lightOn; }, [lightOn]);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

  const remember = useCallback((snapshot: PodAssignment[]) => {
    setHistory((current) => [...current.slice(-9), [...snapshot]]);
  }, []);

  const assignModelToPods = useCallback((podIndexes: number[], modelId: PodAssignment) => {
    const validIndexes = [...new Set(podIndexes)].filter((index) => index >= 0 && index < assignments.length);
    if (!validIndexes.length || validIndexes.every((index) => assignments[index] === modelId)) return;
    remember(assignments);
    const next = [...assignments];
    validIndexes.forEach((index) => { next[index] = modelId; });
    setAssignments(next);
    setSelectedPods(validIndexes);
    setSelectedPod(validIndexes.at(-1) ?? 0);
    const podDescription = validIndexes.length === 1
      ? `pod ${String(validIndexes[0] + 1).padStart(2, "0")}`
      : `${validIndexes.length} selected pods`;
    if (modelId) {
      setActiveModel(modelId);
      const model = MODEL_LIBRARY.find((item) => item.id === modelId);
      setMessage(`${model?.name ?? "Character"} placed on ${spec.name} ${podDescription}`);
    } else {
      setMessage(`${spec.name} ${podDescription} cleared`);
    }
  }, [assignments, remember, spec.name]);

  const switchMachine = (nextId: MachineId) => {
    if (nextId === machineId) return;
    const nextSpec = MACHINE_SPECS[nextId];
    setMachineId(nextId);
    setAssignments([...INITIAL_ASSIGNMENTS[nextId]]);
    setHistory([]);
    const initialPod = Math.min(nextSpec.podCount - 1, nextId === "mini" ? 2 : 5);
    setSelectedPod(initialPod);
    setSelectedPods([initialPod]);
    setSceneError(false);
    setMessage(`${nextSpec.name} loaded · ${nextSpec.podCount} pod layout`);
  };

  const raycastPod = useCallback((clientX: number, clientY: number) => {
    const handles = sceneRef.current;
    const mount = mountRef.current;
    if (!handles || !mount) return null;
    const rect = mount.getBoundingClientRect();
    const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, handles.camera);
    const hit = raycaster.intersectObjects(handles.targets, false)[0];
    return typeof hit?.object.userData.podIndex === "number" ? hit.object.userData.podIndex as number : null;
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      const timer = window.setTimeout(() => setSceneError(true), 0);
      return () => window.clearTimeout(timer);
    }
    const currentSpec = MACHINE_SPECS[machineId];
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#eaf2e7");
    scene.fog = new THREE.Fog("#eaf2e7", 28, 58);
    // The complete product fits comfortably inside this range. Tightening the
    // depth interval gives the pod/deck layers substantially more precision.
    const camera = new THREE.PerspectiveCamera(33, 1, 0.5, 70);
    camera.position.set(...currentSpec.camera);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute("aria-label", `Interactive 3D LetPot ${currentSpec.name} with ${currentSpec.podCount} pod positions. Select a pod in the preview, then choose a character below.`);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, currentSpec.targetY, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = currentSpec.id === "mini" ? 11 : 15;
    controls.maxDistance = 38;
    controls.minPolarAngle = 0.42;
    controls.maxPolarAngle = Math.PI / 2.04;
    controls.autoRotateSpeed = 0.48;
    controls.autoRotate = autoRotateRef.current;

    scene.add(new THREE.HemisphereLight("#ffffff", "#91a094", 2.35));
    const key = new THREE.DirectionalLight("#fffef7", 3.15);
    key.position.set(10, 20, 13);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.00045;
    key.shadow.normalBias = 0.035;
    key.shadow.camera.left = -15;
    key.shadow.camera.right = 15;
    key.shadow.camera.top = 19;
    key.shadow.camera.bottom = -5;
    key.shadow.camera.near = 2;
    key.shadow.camera.far = 45;
    scene.add(key);
    const fill = new THREE.DirectionalLight("#b9d5bd", 1.25);
    fill.position.set(-13, 10, -8);
    scene.add(fill);
    const warm = new THREE.PointLight("#ffe8cb", 8, 28, 2);
    warm.position.set(11, 8, 11);
    scene.add(warm);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(31, 96), new THREE.MeshStandardMaterial({ color: "#f6faf4", roughness: 0.94 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const machine = createMachine(scene, currentSpec);
    const handles: SceneHandles = { camera, controls, renderer, anchors: machine.anchors, targets: machine.targets, rings: machine.rings, lampMaterial: machine.lampMaterial, growLight: machine.growLight };
    setGrowLight(handles, currentSpec, lightOnRef.current);
    sceneRef.current = handles;
    renderedAssignmentsRef.current = Array(currentSpec.podCount).fill(undefined);

    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let pointerStart = { x: 0, y: 0 };
    const onPointerDown = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; };
    const onPointerUp = (event: PointerEvent) => {
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 7) return;
      const index = raycastPod(event.clientX, event.clientY);
      if (index === null) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey) {
        setSelectedPods((current) => {
          const next = current.includes(index) ? current.filter((podIndex) => podIndex !== index) : [...current, index];
          const stableSelection = next.length ? next : [index];
          setSelectedPod(stableSelection.at(-1) ?? index);
          setMessage(`${currentSpec.name} · ${stableSelection.length} pods selected · choose a character`);
          return stableSelection;
        });
      } else {
        setSelectedPod(index);
        setSelectedPods([index]);
        setMessage(`${currentSpec.name} pod ${String(index + 1).padStart(2, "0")} selected · hold ⌘ or Shift to add more`);
      }
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    let frame = 0;
    const render = () => {
      frame = window.requestAnimationFrame(render);
      controls.update();
      renderer.render(scene, camera);
    };
    render();
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      controls.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      renderedAssignmentsRef.current = [];
    };
  }, [machineId, raycastPod]);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;
    assignments.forEach((modelId, index) => {
      if (renderedAssignmentsRef.current[index] === modelId) return;
      const anchor = handles.anchors[index];
      if (!anchor) return;
      [...anchor.children].forEach((child) => { anchor.remove(child); disposeObject(child); });
      if (modelId) {
        const definition = MODEL_LIBRARY.find((item) => item.id === modelId);
        if (definition) {
          const build = createModel(optionsFor(definition));
          const bounds = new THREE.Box3().setFromObject(build.assembly);
          const center = bounds.getCenter(new THREE.Vector3());
          build.assembly.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return;
            const isFitHardware = child.name === "locator_skirt"
              || child.name === "pod_fit_transition_and_upper_band"
              || child.name.includes("connector_pin");
            if (isFitHardware || child.name === "letpot_icon_engraving_cutter") {
              child.castShadow = false;
              child.receiveShadow = false;
            }
            if (child.name === "letpot_icon_engraving_cutter") {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((logoMaterial) => {
                logoMaterial.depthWrite = false;
                logoMaterial.polygonOffset = true;
                logoMaterial.polygonOffsetFactor = -4;
                logoMaterial.polygonOffsetUnits = -4;
              });
              child.renderOrder = 7;
            }
          });
          build.assembly.scale.setScalar(MODEL_SCALE);
          build.assembly.position.set(-center.x * MODEL_SCALE, -bounds.min.y * MODEL_SCALE, -center.z * MODEL_SCALE);
          build.assembly.rotation.y = -(spec.pods[index]?.x ?? 0) * 0.025;
          anchor.add(build.assembly);
        }
      }
      renderedAssignmentsRef.current[index] = modelId;
    });
  }, [assignments, machineId, spec.pods]);

  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;
    handles.rings.forEach((ring, index) => {
      const selected = selectedPods.includes(index);
      ring.material.opacity = selected ? 0.95 : assignments[index] ? 0.22 : 0;
      ring.material.color.set(selected ? "#2e8b3d" : "#8cc63f");
      ring.scale.setScalar(selected ? 1.04 : 1);
    });
  }, [assignments, selectedPods, machineId]);

  useEffect(() => { if (sceneRef.current) sceneRef.current.controls.autoRotate = autoRotate; }, [autoRotate]);
  useEffect(() => {
    const handles = sceneRef.current;
    if (!handles) return;
    setGrowLight(handles, spec, lightOn);
  }, [lightOn, spec]);

  const resetView = () => {
    const handles = sceneRef.current;
    if (!handles) return;
    handles.camera.position.set(...spec.camera);
    handles.controls.target.set(0, spec.targetY, 0);
    handles.controls.update();
    setMessage(`${spec.name} view reset`);
  };
  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setAssignments(previous);
    setHistory((current) => current.slice(0, -1));
    setMessage("Last placement undone");
  };
  const tryMix = () => {
    remember(assignments);
    const pool: PodAssignment[] = ["sprout", null, "mushroom", null, "frog", null, "cactus", null, "pine", null, "sunflower", null, "hedgehog"];
    setAssignments(Array.from({ length: spec.podCount }, (_, index) => pool[index % pool.length]));
    const nextSelectedPod = Math.min(5, spec.podCount - 1);
    setSelectedPod(nextSelectedPod);
    setSelectedPods([nextSelectedPod]);
    setActiveModel("frog");
    setMessage(`A balanced ${spec.name} mix is ready`);
  };
  const clearAll = () => {
    if (!assignments.some(Boolean)) return;
    remember(assignments);
    setAssignments(Array(spec.podCount).fill(null));
    setMessage(`All ${spec.name} pods cleared`);
  };
  const selectPodFromPicker = (index: number, additive: boolean) => {
    if (additive) {
      setSelectedPods((current) => {
        const next = current.includes(index) ? current.filter((podIndex) => podIndex !== index) : [...current, index];
        const stableSelection = next.length ? next : [index];
        setSelectedPod(stableSelection.at(-1) ?? index);
        setMessage(`${spec.name} · ${stableSelection.length} pods selected · choose a character`);
        return stableSelection;
      });
      return;
    }

    setSelectedPod(index);
    setSelectedPods([index]);
    setMessage(`${spec.name} pod ${String(index + 1).padStart(2, "0")} selected · choose a character`);
  };
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const modelId = event.dataTransfer.getData("application/x-letpot-model") as ModelId;
    if (!LOW_POLY_MODELS.some((item) => item.id === modelId)) return;
    const podIndex = raycastPod(event.clientX, event.clientY);
    if (podIndex === null) { setMessage("Drop directly over a pod opening"); return; }
    assignModelToPods(selectedPods.includes(podIndex) ? selectedPods : [podIndex], modelId);
  };

  return (
    <main className={styles.page}>
      <h1 className="sr-only">LetPot Pod Styler: preview printable accessories on your indoor garden</h1>
      <a className={styles.skipLink} href="#pod-styler-workspace">Skip to Pod Styler workspace</a>
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="LetPot Maker home"><span className={styles.brandMark} aria-hidden="true" /><span><b>LetPot</b> Maker</span></a>
        <nav className={styles.machinePicker} aria-label="Choose LetPot model">
          {(Object.keys(MACHINE_SPECS) as MachineId[]).map((id) => <button type="button" key={id} className={machineId === id ? styles.activeMachine : ""} onClick={() => switchMachine(id)} aria-pressed={machineId === id}><small>{MACHINE_SPECS[id].code}</small><b>{MACHINE_SPECS[id].name}</b><span>{MACHINE_SPECS[id].podCount}</span></button>)}
        </nav>
        <a className={styles.studioLink} href="/studio">Customize in Studio <span>↗</span></a>
      </header>

      <section className={styles.workspace} id="pod-styler-workspace">
        <section className={`${styles.stage} ${dragging ? styles.dragging : ""} ${lightOn ? styles.lightOn : ""}`}>
          <div className={styles.canvas} ref={mountRef} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; }} onDrop={handleDrop} aria-label="Device preview drop area" />
          {sceneError && <div className={styles.sceneError}><b>3D preview unavailable</b><span>Reload the page to reconnect the device preview.</span></div>}
          <div className={styles.viewTools} aria-label="3D view tools">
            <button type="button" onClick={resetView}><span>↺</span> Reset</button>
            <button type="button" className={autoRotate ? styles.activeTool : ""} onClick={() => setAutoRotate((current) => !current)} aria-pressed={autoRotate}><span>↻</span> Orbit</button>
            <button type="button" className={lightOn ? styles.activeTool : ""} onClick={() => setLightOn((current) => !current)} aria-pressed={lightOn}><span>☼</span> Light</button>
          </div>
          {dragging && <div className={styles.dropHint}><span>↓</span><b>Drop onto a pod</b></div>}
          <div className={styles.screenReaderStatus} role="status" aria-live="polite">{message}</div>
          <div className={styles.stageDock}>
            <div className={styles.podPicker} role="group" aria-label={`Choose a ${spec.name} pod`}>
              <span>Choose pod</span>
              <div>
                {Array.from({ length: spec.podCount }, (_, index) => {
                  const assignedModel = MODEL_LIBRARY.find((model) => model.id === assignments[index]);
                  return (
                    <button
                      type="button"
                      key={index}
                      className={selectedPods.includes(index) ? styles.activePod : ""}
                      aria-pressed={selectedPods.includes(index)}
                      aria-label={`Pod ${index + 1}${assignedModel ? `, ${assignedModel.name}` : ", empty"}`}
                      onClick={(event) => selectPodFromPicker(index, event.metaKey || event.ctrlKey || event.shiftKey)}
                    >
                      {String(index + 1).padStart(2, "0")}{assignedModel && <i aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className={styles.stageActions}>
              <button type="button" onClick={() => assignModelToPods(selectedPods, null)} disabled={!selectedPodsWithContent.length}>{selectedPods.length > 1 ? "Clear selected" : "Clear pod"}</button>
              <button type="button" onClick={undo} disabled={!history.length}>↶ Undo</button>
              <button type="button" onClick={tryMix}>Try a mix</button>
              <button type="button" onClick={clearAll} disabled={!assignedCount}>Clear all</button>
            </div>
          </div>
        </section>

        <section className={styles.library} aria-label="Character selection">
          <div className={styles.libraryToolbar}>
            <div className={styles.librarySelection}>
              <strong>{selectedPodLabel}</strong>
              <small>{selectedPodDetail}</small>
            </div>
            <span className={styles.multiSelectHint}>⌘ / Shift + click pods to select several</span>
            <div className={styles.filters} role="group" aria-label="Filter characters by tag">
              <button type="button" className={category === "all" ? styles.activeFilter : ""} onClick={() => setCategory("all")} aria-pressed={category === "all"}>All <b>{LOW_POLY_MODELS.length}</b></button>
              {AVAILABLE_TAGS.map((tag) => <button type="button" key={tag} className={category === tag ? styles.activeFilter : ""} onClick={() => setCategory(tag)} aria-pressed={category === tag}>{TAG_LABELS[tag]} <b>{LOW_POLY_MODELS.filter((model) => model.tags.includes(tag)).length}</b></button>)}
            </div>
          </div>
          <div className={styles.modelGrid}>
            {visibleModels.map((model) => (
              <button type="button" key={model.id} className={`${styles.modelCard} ${activeModel === model.id ? styles.activeModel : ""}`}
                onClick={() => { setActiveModel(model.id); assignModelToPods(selectedPods, model.id); }} draggable
                onDragStart={(event) => { event.dataTransfer.setData("application/x-letpot-model", model.id); event.dataTransfer.effectAllowed = "copy"; setDragging(true); setActiveModel(model.id); }} onDragEnd={() => setDragging(false)}
                aria-label={`Place ${model.name} on ${spec.name} ${selectedPods.length === 1 ? `pod ${selectedPod + 1}` : `${selectedPods.length} selected pods`}`}>
                <ModelThumbnail model={model} />
                <span className={styles.modelCardCopy}>
                  <strong>{model.name}</strong>
                  <em>{model.subtitle}</em>
                </span>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
