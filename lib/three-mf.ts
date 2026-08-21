import JSZip from "jszip";
import * as THREE from "three";
import a1MiniProfile from "./bambu-profiles/a1-mini.json";
import p1sProfile from "./bambu-profiles/p1s.json";

export type BambuPrinterId = "a1-mini" | "p1s";

export interface BambuPrinterProfile {
  id: BambuPrinterId;
  name: string;
  bedWidth: number;
  bedDepth: number;
  nozzle: number;
}

export const BAMBU_PRINTERS: Record<BambuPrinterId, BambuPrinterProfile> = {
  "a1-mini": {
    id: "a1-mini",
    name: "Bambu Lab A1 mini",
    bedWidth: 180,
    bedDepth: 180,
    nozzle: 0.4,
  },
  p1s: {
    id: "p1s",
    name: "Bambu Lab P1S",
    bedWidth: 256,
    bedDepth: 256,
    nozzle: 0.4,
  },
};

export const BAMBU_PRINT_PRESET = {
  enable_support: "1",
  support_type: "normal(auto)",
  support_style: "snug",
  support_on_build_plate_only: "0",
  support_threshold_angle: "30",
  support_top_z_distance: "0.2",
  support_bottom_z_distance: "0.2",
  support_interface_top_layers: "2",
  support_interface_spacing: "0.5",
  brim_type: "outer_only",
  brim_width: "4",
} as const;

const BAMBU_PROJECT_PROFILES: Record<BambuPrinterId, Record<string, string | string[]>> = {
  "a1-mini": {
    printer_model: "Bambu Lab A1 mini",
    printer_variant: "0.4",
    printer_settings_id: "Bambu Lab A1 mini 0.4 nozzle",
    print_settings_id: "0.20mm Standard @BBL A1M",
    filament_settings_id: ["Bambu PLA Basic @BBL A1M"],
    filament_type: ["PLA"],
    filament_vendor: ["Bambu Lab"],
    nozzle_diameter: ["0.4"],
    printable_area: ["0x0", "180x0", "180x180", "0x180"],
    printable_height: "180",
    curr_bed_type: "Textured PEI Plate",
    layer_height: "0.2",
  },
  p1s: {
    printer_model: "Bambu Lab P1S",
    printer_variant: "0.4",
    printer_settings_id: "Bambu Lab P1S 0.4 nozzle",
    print_settings_id: "0.20mm Standard @BBL X1C",
    filament_settings_id: ["Bambu PLA Basic @BBL P1S 0.4 nozzle"],
    filament_type: ["PLA"],
    filament_vendor: ["Bambu Lab"],
    nozzle_diameter: ["0.4"],
    printable_area: ["0x0", "256x0", "256x256", "0x256"],
    printable_height: "256",
    curr_bed_type: "Textured PEI Plate",
    layer_height: "0.2",
  },
};

const BAMBU_FULL_PROFILES: Record<BambuPrinterId, Record<string, unknown>> = {
  "a1-mini": a1MiniProfile,
  p1s: p1sProfile,
};

export interface ThreeMfPart {
  name: string;
  mesh: THREE.Mesh;
  color: string;
}

interface MeshData {
  name: string;
  color: string;
  vertices: Array<[number, number, number]>;
  triangles: Array<[number, number, number]>;
  bounds: THREE.Box3;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatNumber(value: number) {
  const rounded = Math.abs(value) < 1e-7 ? 0 : value;
  return Number(rounded.toFixed(5)).toString();
}

function normalizeColor(value: string) {
  const color = new THREE.Color(value);
  return `#${color.getHexString().toUpperCase()}FF`;
}

function bambuUuid(index: number, family: "object" | "part" | "instance") {
  const prefix = index.toString(16).padStart(8, "0");
  if (family === "object") return `${prefix}-61cb-4c03-9d28-80fed5dfa1dc`;
  if (family === "part") return `${prefix}-040e-4773-83ca-aaa4b024d7bb`;
  return `${prefix}-b1ec-4553-aec9-835e5b724bb4`;
}

function meshData(part: ThreeMfPart): MeshData {
  const geometry = part.mesh.geometry.clone();
  part.mesh.updateMatrixWorld(true);
  geometry.applyMatrix4(part.mesh.matrixWorld);
  const position = geometry.getAttribute("position");
  const vertices: Array<[number, number, number]> = [];
  for (let index = 0; index < position.count; index += 1) {
    vertices.push([position.getX(index), position.getY(index), position.getZ(index)]);
  }

  const triangles: Array<[number, number, number]> = [];
  if (geometry.index) {
    for (let index = 0; index < geometry.index.count; index += 3) {
      triangles.push([
        geometry.index.getX(index),
        geometry.index.getX(index + 1),
        geometry.index.getX(index + 2),
      ]);
    }
  } else {
    for (let index = 0; index < position.count; index += 3) {
      triangles.push([index, index + 1, index + 2]);
    }
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox?.clone() ?? new THREE.Box3();
  geometry.dispose();
  return { name: part.name, color: part.color, vertices, triangles, bounds };
}

function arrangeOnPlate(items: MeshData[], printer: BambuPrinterProfile) {
  const placements: Array<{ x: number; y: number }> = [];
  // P1-series beds reserve the front-left purge/cutter area; keep every part
  // clear of it so CLI and Studio validation do not require manual arranging.
  const margin = printer.id === "p1s" ? 35 : 10;
  const gap = 8;
  let cursorX = margin;
  let cursorY = margin;
  let rowDepth = 0;

  for (const item of items) {
    const size = item.bounds.getSize(new THREE.Vector3());
    if (cursorX > margin && cursorX + size.x > printer.bedWidth - margin) {
      cursorX = margin;
      cursorY += rowDepth + gap;
      rowDepth = 0;
    }
    if (cursorY + size.y > printer.bedDepth - margin) {
      throw new Error(`${item.name} does not fit on the ${printer.name} project plate`);
    }
    placements.push({
      x: cursorX - item.bounds.min.x,
      y: cursorY - item.bounds.min.y,
    });
    cursorX += size.x + gap;
    rowDepth = Math.max(rowDepth, size.y);
  }
  return placements;
}

export async function buildBambuThreeMf(
  parts: ThreeMfPart[],
  printerId: BambuPrinterId,
  projectName: string,
) {
  if (parts.length === 0) throw new Error("A 3MF project needs at least one printable part");
  const printer = BAMBU_PRINTERS[printerId];
  const items = parts.map(meshData);
  const placements = arrangeOnPlate(items, printer);

  const materials = items.map((item) =>
    `<base name="${escapeXml(item.name)}" displaycolor="${normalizeColor(item.color)}"/>`,
  ).join("");
  const objects = items.map((item, index) => {
    const vertices = item.vertices.map(([x, y, z]) =>
      `<vertex x="${formatNumber(x)}" y="${formatNumber(y)}" z="${formatNumber(z)}"/>`,
    ).join("");
    const triangles = item.triangles.map(([v1, v2, v3]) =>
      `<triangle v1="${v1}" v2="${v2}" v3="${v3}"/>`,
    ).join("");
    return `<object id="${index + 2}" p:UUID="${bambuUuid(index + 1, "object")}" type="model" name="${escapeXml(item.name)}" pid="1" pindex="${index}"><mesh><vertices>${vertices}</vertices><triangles>${triangles}</triangles></mesh></object>`;
  }).join("");
  const buildItems = items.map((_, index) => {
    const placement = placements[index];
    return `<item objectid="${index + 2}" p:UUID="${bambuUuid(index + 1, "instance")}" transform="1 0 0 0 1 0 0 0 1 ${formatNumber(placement.x)} ${formatNumber(placement.y)} 0" printable="1"/>`;
  }).join("");

  const objectSettings = items.map((item, index) => {
    const objectId = index + 2;
    return `<object id="${objectId}">
    <metadata key="name" value="${escapeXml(item.name)}"/>
    <metadata key="extruder" value="1"/>
    <metadata face_count="${item.triangles.length}"/>
    <part id="${objectId}" subtype="normal_part" uuid="${bambuUuid(index + 1, "part")}">
      <metadata key="name" value="${escapeXml(item.name)}"/>
      <mesh_stat face_count="${item.triangles.length}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>
    </part>
  </object>`;
  }).join("\n  ");
  const plateInstances = items.map((_, index) => `<model_instance>
      <metadata key="object_id" value="${index + 2}"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="${index + 1}"/>
    </model_instance>`).join("\n    ");
  const modelSettings = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  ${objectSettings}
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value="${escapeXml(projectName)}"/>
    <metadata key="locked" value="false"/>
    <metadata key="filament_map_mode" value="Auto For Flush"/>
    ${plateInstances}
  </plate>
  <assemble></assemble>
</config>`;
  const sliceInfo = `<?xml version="1.0" encoding="UTF-8"?>
<config><header><header_item key="X-BBL-Client-Type" value="slicer"/><header_item key="X-BBL-Client-Version" value="02.08.02.60"/></header></config>`;

  const modelXml = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:BambuStudio="http://schemas.bambulab.com/package/2021" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" requiredextensions="p">
  <metadata name="Title">${escapeXml(projectName)}</metadata>
  <metadata name="Designer">LetPot Maker</metadata>
  <metadata name="Application">BambuStudio-02.08.02.60</metadata>
  <metadata name="BambuStudio:3mfVersion">1</metadata>
  <metadata name="BambuStudio:FdmSupportsPaintingVersion">0</metadata>
  <metadata name="BambuStudio:SeamPaintingVersion">0</metadata>
  <metadata name="BambuStudio:MmPaintingVersion">0</metadata>
  <metadata name="Description">Print-ready project for ${escapeXml(printer.name)} with automatic snug supports and a 4 mm outer brim preset.</metadata>
  <resources><basematerials id="1">${materials}</basematerials>${objects}</resources>
  <build p:UUID="2c7c17d8-22b5-4d84-8835-1976022ea369">${buildItems}</build>
</model>`;
  const relationships = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="json" ContentType="application/json"/>
  <Default Extension="config" ContentType="application/octet-stream"/>
</Types>`;
  const manifest = {
    schema: "letpot-maker/bambu-handoff/v1",
    project: projectName,
    targetPrinter: printer,
    parts: items.map((item) => item.name),
    units: "millimetres",
    status: "print-ready-preset",
    slicingPreset: { ...BAMBU_PROJECT_PROFILES[printerId], ...BAMBU_PRINT_PRESET },
    instruction: "Open in Bambu Studio, confirm the matching printer and filament, then slice. Automatic snug supports and a 4 mm outer brim are already enabled.",
  };

  const zip = new JSZip();
  zip.file("[Content_Types].xml", contentTypes);
  zip.folder("_rels")?.file(".rels", relationships);
  zip.folder("3D")?.file("3dmodel.model", modelXml);
  zip.folder("Metadata")?.file("project_settings.config", JSON.stringify({
    ...BAMBU_FULL_PROFILES[printerId],
    ...BAMBU_PROJECT_PROFILES[printerId],
    ...BAMBU_PRINT_PRESET,
  }, null, 2));
  zip.folder("Metadata")?.file("model_settings.config", modelSettings);
  zip.folder("Metadata")?.file("slice_info.config", sliceInfo);
  zip.folder("Metadata")?.file("letpot.json", JSON.stringify(manifest, null, 2));
  return zip.generateAsync({
    type: "blob",
    mimeType: "model/3mf",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
