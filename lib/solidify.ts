import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Manifold, ManifoldToplevel } from "manifold-3d";

let browserModulePromise: Promise<ManifoldToplevel> | null = null;
let nodeModulePromise: Promise<ManifoldToplevel> | null = null;

export async function loadBrowserManifold() {
  if (!browserModulePromise) {
    browserModulePromise = (async () => {
      const [{ getManifoldModule, setWasmUrl }, wasmAsset] = await Promise.all([
        import("manifold-3d/lib/wasm.js"),
        import("manifold-3d/manifold.wasm?url"),
      ]);
      setWasmUrl(wasmAsset.default);
      return getManifoldModule();
    })();
  }
  return browserModulePromise;
}

export async function loadNodeManifold() {
  if (!nodeModulePromise) {
    nodeModulePromise = (async () => {
      const { default: Module } = await import("manifold-3d");
      const wasm = await Module();
      wasm.setup();
      return wasm;
    })();
  }
  return nodeModulePromise;
}

function geometryToManifold(wasm: ManifoldToplevel, source: THREE.Mesh) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", source.geometry.getAttribute("position").clone());
  if (source.geometry.index) geometry.setIndex(source.geometry.index.clone());
  geometry.applyMatrix4(source.matrixWorld);

  const triangles = geometry.index ? geometry.toNonIndexed() : geometry;
  const welded = mergeVertices(triangles, 1e-5);
  const position = welded.getAttribute("position");
  const index = welded.index;
  if (!index) throw new Error(`Could not index geometry ${source.name || "mesh"}`);

  const cleanTriangles: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let i = 0; i < index.count; i += 3) {
    const ia = index.getX(i);
    const ib = index.getX(i + 1);
    const ic = index.getX(i + 2);
    if (ia === ib || ib === ic || ic === ia) continue;
    a.fromBufferAttribute(position, ia);
    b.fromBufferAttribute(position, ib);
    c.fromBufferAttribute(position, ic);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    if (ab.cross(ac).lengthSq() < 1e-10) continue;
    cleanTriangles.push(ia, ib, ic);
  }

  const mesh = new wasm.Mesh({
    numProp: 3,
    vertProperties: Float32Array.from(position.array as ArrayLike<number>),
    triVerts: Uint32Array.from(cleanTriangles),
  });
  mesh.merge();
  const manifold = new wasm.Manifold(mesh);
  if (manifold.status() !== "NoError") {
    manifold.delete();
    throw new Error(`${source.name || "mesh"} is not a valid closed solid`);
  }
  return manifold;
}

function manifoldToGeometry(solid: Manifold) {
  const mesh = solid.getMesh();
  const positions = new Float32Array(mesh.numVert * 3);
  for (let vertex = 0; vertex < mesh.numVert; vertex += 1) {
    positions[vertex * 3] = mesh.vertProperties[vertex * mesh.numProp];
    positions[vertex * 3 + 1] = mesh.vertProperties[vertex * mesh.numProp + 1];
    positions[vertex * 3 + 2] = mesh.vertProperties[vertex * mesh.numProp + 2];
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(mesh.triVerts), 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export async function solidifyObject(
  wasm: ManifoldToplevel,
  object: THREE.Object3D,
  options: { printerAxes?: boolean; normalize?: boolean; flipZ?: boolean } = {},
) {
  const root = object.clone(true);
  root.updateMatrixWorld(true);
  const solids: Manifold[] = [];
  const cutters: Manifold[] = [];
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && child.visible) {
      const converted = geometryToManifold(wasm, child);
      const components = converted.decompose();
      const target = child.userData.booleanOperation === "subtract" ? cutters : solids;
      if (components.length > 1) {
        // A single Three.js geometry may intentionally contain disconnected
        // engraving islands (for example separate letters). Feed every island
        // to its final boolean operation independently.
        converted.delete();
        target.push(...components);
      } else {
        components.forEach((component) => component.delete());
        target.push(converted);
      }
    }
  });
  if (solids.length === 0) throw new Error(`Part ${object.name || "unnamed"} contains no meshes`);

  let solid: Manifold;
  if (solids.length === 1) {
    solid = solids[0];
  } else {
    solid = wasm.Manifold.union(solids);
    if (solid.status() !== "NoError") {
      solids.forEach((entry) => entry.delete());
      solid.delete();
      throw new Error(`Boolean union failed for ${object.name || "part"}`);
    }
    solids.forEach((entry) => entry.delete());
  }

  if (cutters.length > 0) {
    let cutter: Manifold;
    if (cutters.length === 1) {
      cutter = cutters[0];
    } else {
      cutter = wasm.Manifold.union(cutters);
      cutters.forEach((entry) => entry.delete());
      if (cutter.status() !== "NoError") {
        solid.delete();
        cutter.delete();
        throw new Error(`Boolean cutter union failed for ${object.name || "part"}`);
      }
    }
    const engraved = solid.subtract(cutter);
    solid.delete();
    cutter.delete();
    if (engraved.status() !== "NoError") {
      engraved.delete();
      throw new Error(`Boolean subtraction failed for ${object.name || "part"}`);
    }
    solid = engraved;
  }

  const components = solid.decompose();
  const componentCount = components.length;
  components.forEach((entry) => entry.delete());
  if (componentCount !== 1) {
    solid.delete();
    throw new Error(`${object.name || "Part"} has ${componentCount} disconnected solids; exactly one is required`);
  }

  const geometry = manifoldToGeometry(solid);
  solid.delete();

  if (options.printerAxes !== false) {
    geometry.rotateX(Math.PI / 2);
    if (options.flipZ) geometry.rotateX(Math.PI);
  }
  if (options.normalize !== false) {
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    if (bounds) {
      if (options.printerAxes !== false) geometry.translate(0, 0, -bounds.min.z);
      else geometry.translate(0, -bounds.min.y, 0);
    }
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const result = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({ color: "#789269", roughness: 0.82, flatShading: true }),
  );
  result.name = object.name || "solid_part";
  result.updateMatrixWorld(true);
  return result;
}
