import * as THREE from "three";

const piece0 = [
  [1, 1],
  [0, 1]
];

const piece1 = [
  [2, 0],
  [1, 1]
];

const piece1_1 = [
  [2, 1],
  [0, 1]
];

const piece2 = [
  [1, 1],
  [1, 0],
  [1, 1]
];

const piece3 = [
  [1, 1, 1],
  [0, 1, 0]
];

const piece4 = [
  [1, 1],
  [0, 1],
  [0, 2]
];

const piece4Mirror = [
  [1, 1],
  [1, 0],
  [2, 0]
];

const piece7 = [
  [2, 0, 0],
  [1, 1, 1]
];

const piece7Mirror = [
  [1, 1, 1],
  [2, 0, 0]
];

const piece8 = [
  [1, 1, 1],
  [1, 0, 0]
];

const piece9 = [
  [0, 1, 1],
  [1, 1, 1]
];

const piece10 = [
  [1, 1],
  [1, 2]
];

const piece11 = [
  [1, 1, 0],
  [0, 1, 1]
];

const piece12 = [
  [2, 1, 0],
  [0, 1, 1]
];

const piece12Mirror = [
  [0, 1, 1],
  [2, 1, 0]
];

const piece13 = [
  [0, 1, 0],
  [2, 1, 1]
];

export const PIECES = [
  piece0,
  piece1,
  piece1_1,
  piece2,
  piece13,
  piece3,

  piece4,
  piece4Mirror,
  piece7,
  piece7Mirror,
  piece8,
  piece9,

  piece10,
  piece11,
  piece12,
  piece12Mirror
];

export const COLORS = [0x39375b, 0x745c97, 0xd597ce, 0xf5b0cb];

export function computePieceObjects(
  blockGeometry: THREE.Geometry
): THREE.Object3D[] {
  blockGeometry.computeBoundingBox();
  const size = new THREE.Vector3();
  blockGeometry.boundingBox.getSize(size);
  return PIECES.map((packedGeo, pieceIndex) => {
    const objectMaterial = new THREE.MeshStandardMaterial({
      color: COLORS[pieceIndex % COLORS.length],
      roughness: 0.9
    });
    const geo = new THREE.Geometry();
    packedGeo.forEach((row, y) => {
      row.forEach((piece, x) => {
        for (let z = 0; z < piece; z++) {
          const thisGeo = blockGeometry.clone();
          thisGeo.translate(x * size.x, y * size.y, z * size.z);
          geo.mergeMesh(new THREE.Mesh(thisGeo));
          geo.mergeVertices();
        }
      });
    });
    geo.mergeVertices();
    const mesh = new THREE.Mesh(geo, objectMaterial);
    mesh.receiveShadow = true;
    mesh.castShadow = true;

    return mesh;
  });
}
