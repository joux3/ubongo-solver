import _ from "lodash";
import * as THREE from "three";
import ThreeBSPConstructor from "three-js-csg";

const ThreeBSP = ThreeBSPConstructor(THREE);

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

const BLUE = 0x6892c1;
const YELLOW = 0xf1c148;
const RED = 0xea584c;
const GREEN = 0x7da442;
export const COLORS = [BLUE, YELLOW, RED, GREEN];

const RED_PIECES = [piece1, piece4, piece10, piece11];
const GREEN_PIECES = [piece8, piece3, piece7, piece8, piece12Mirror];
const BLUE_PIECES = [piece0, piece7Mirror, piece9, piece12];
const YELLOW_PIECES = [piece1_1, piece2, piece13, piece4Mirror];

const PIECE_GROUPS = [
  { color: RED, pieces: RED_PIECES },
  { color: YELLOW, pieces: YELLOW_PIECES },
  { color: GREEN, pieces: GREEN_PIECES },
  { color: BLUE, pieces: BLUE_PIECES }
];

export function computePieceObjects(
  blockGeometry: THREE.Geometry
): THREE.Object3D[] {
  blockGeometry.computeBoundingBox();
  const size = new THREE.Vector3();
  blockGeometry.boundingBox.getSize(size);
  return _(PIECE_GROUPS)
    .flatMap(group =>
      group.pieces.map(piece => ({
        packedGeo: piece,
        color: group.color
      }))
    )
    .map(({ packedGeo, color }) => {
      const objectMaterial = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.9
      });
      let pieceBSP: any = null;
      packedGeo.forEach((row, y) => {
        row.forEach((piece, x) => {
          for (let z = 0; z < piece; z++) {
            const thisGeo = blockGeometry.clone();
            thisGeo.translate(x * size.x, y * size.y, z * size.z);
            const mesh = new THREE.Mesh(thisGeo);
            if (pieceBSP) {
              pieceBSP = pieceBSP.union(new ThreeBSP(mesh));
            } else {
              pieceBSP = new ThreeBSP(mesh);
            }
          }
        });
      });
      const mesh = pieceBSP.toMesh();
      mesh.material = objectMaterial;
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.userData.originalPiece = packedGeo;

      return mesh;
    })
    .value();
}
