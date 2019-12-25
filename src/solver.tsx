import _ from "lodash";

type Block = [number, number, number];
type Piece = {
  blocks: Block[];
  originalIndex: number;
  rotations: ("x" | "y" | "z")[];
  dX: number;
  dY: number;
  dZ: number;
};
type PlacedPiece = [number, number, number, Piece];
export type SolvedPiece = {
  x: number;
  y: number;
  z: number;
  rotations: ("x" | "y" | "z")[];
  originalIndex: number;
};

export function solve(
  width: number,
  height: number,
  board: number[],
  pieces: Piece[]
) {
  if (width * height !== board.length) {
    throw new Error("invalid board/width/heigh");
  }
  const PROFILE = false;
  const startTime = performance.now();
  if (PROFILE) console.profile();

  const depth = 2;
  //const board = [0, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 1];

  /*const pieces: Piece[] = [
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0]
    ],
    [
      [0, 0, 0],
      [0, 1, 0],
      [1, 0, 0],
      [1, 0, 1]
    ],
    [
      [1, 0, 0],
      [1, 1, 0],
      [1, 2, 0],
      [0, 2, 0]
    ],
    [
      [0, 0, 0],
      [0, 1, 0],
      [1, 0, 0],
      [1, 1, 0],
      [1, 0, 1]
    ]
  ];
var board = [1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0];
var width = 4;
var height = 3;
var depth = 2;
var pieces = [[[0, 0, 0], [0, 0, 1], [0, 1, 0], [0, 2, 0]],
			  [[0, 0, 1], [1, 0, 1], [1, 1, 1], [1, 2, 1], [1, 2, 0]],
			  [[0, 0, 0], [0, 0, 1], [0, 1, 0], [1, 0, 0], [1, 1, 0]]];
var pieces = [[[0, 2, 1], [0, 2, 0], [1, 2, 0], [1, 1, 0], [1, 0, 0]],
			  [[0, 0, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0], [1, 1, 0]],
			  [[0, 2, 0], [1, 2, 0], [1, 1, 0], [1, 0, 0]]];
*/

  // make the board 2 deep. why even bother reading depth...
  board = board.concat(board);

  function rotateWithFunc(
    piece: Piece,
    rotation: "x" | "y" | "z",
    f: (block: Block) => Block
  ) {
    return {
      ...piece,
      blocks: piece.blocks.map(f),
      originalIndex: piece.originalIndex,
      rotations: piece.rotations.concat(rotation)
    };
  }

  function rotateX(piece: Piece) {
    return rotateWithFunc(piece, "x", b => [b[0], -b[2], b[1]]);
  }

  function rotateY(piece: Piece) {
    //return rotateWithFunc(piece, 0, 1, 0, b => [-b[2], b[1], b[0]]);
    return rotateWithFunc(piece, "y", b => [b[2], b[1], -b[0]]);
  }

  function rotateZ(piece: Piece) {
    //return rotateWithFunc(piece, 0, 0, 1, b => [b[1], -b[0], b[2]]);
    return rotateWithFunc(piece, "z", b => [-b[1], b[0], b[2]]);
  }

  // makes piece blocks based on origo and sorts them always similarly
  function canonize(piece: Piece) {
    let minx = Number.MAX_VALUE,
      miny = Number.MAX_VALUE,
      minz = Number.MAX_VALUE;
    piece.blocks.forEach(b => {
      if (b[0] < minx) minx = b[0];
      if (b[1] < miny) miny = b[1];
      if (b[2] < minz) minz = b[2];
    });
    const result = {
      ...piece,
      blocks: piece.blocks.map(
        b => [b[0] - minx, b[1] - miny, b[2] - minz] as [number, number, number]
      ),
      dX: piece.dX - minx,
      dY: piece.dY - miny,
      dZ: piece.dZ - minz
    };
    result.blocks.sort((a, b) => {
      const dx = a[0] - b[0];
      const dy = a[1] - b[1];
      const dz = a[2] - b[2];
      if (dx !== 0) return dx;
      if (dy !== 0) return dy;
      if (dz !== 0) return dz;
      return 0;
    });
    return result;
  }

  function setAdd(permutation: Piece, permutations: Piece[]) {
    for (let i = 0; i < permutations.length; i++) {
      let match = true;
      for (let j = 0; j < permutations[i].blocks.length; j++) {
        const p1 = permutation.blocks[j];
        const p2 = permutations[i].blocks[j];
        match = match && p1[0] === p2[0] && p1[1] === p2[1] && p1[2] === p2[2];
      }
      if (match) return;
    }
    permutations.push(permutation);
  }

  function generatePermutations(pieces: Piece[]) {
    const result = [];
    for (let i = 0; i < pieces.length; i++) {
      const curPermutations: Piece[] = [];
      let piece = pieces[i];
      for (let j = 0; j < 4; j++) {
        for (let k = 0; k < 4; k++) {
          for (let l = 0; l < 4; l++) {
            setAdd(canonize(piece), curPermutations);
            piece = rotateY(piece);
          }
          piece = rotateZ(piece);
        }
        piece = rotateX(piece);
      }
      result.push(curPermutations);
    }
    return result;
  }

  const rotatedPieces = generatePermutations(pieces);

  function isFree(x: number, y: number, z: number) {
    if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth)
      return false;

    return board[z * width * height + y * width + x] === 1;
  }

  function setFree(x: number, y: number, z: number, val: number) {
    if (x < 0 || x >= width || y < 0 || y >= height || z < 0 || z >= depth)
      throw new Error("out of bounds! " + x + ", " + y + ", " + z);
    board[z * width * height + y * width + x] = +val;
  }

  function canPlacePiece(x: number, y: number, z: number, piece: Piece) {
    for (let i = 0; i < piece.blocks.length; i++) {
      const b = piece.blocks[i];
      if (!isFree(b[0] + x, b[1] + y, b[2] + z)) return false;
    }
    return true;
  }

  function placePiece(x: number, y: number, z: number, piece: Piece) {
    piece.blocks.forEach(b => {
      setFree(b[0] + x, b[1] + y, b[2] + z, 0);
    });
  }

  function unplacePiece(x: number, y: number, z: number, piece: Piece) {
    piece.blocks.forEach(b => {
      setFree(b[0] + x, b[1] + y, b[2] + z, 1);
    });
  }

  const placedPieces: PlacedPiece[] = [];
  function solveBoard(piecesLeft: Piece[][]): PlacedPiece[] | null {
    if (piecesLeft.length === 0) {
      console.log("Solved the board!");
      return _.cloneDeep(placedPieces);
    }

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        for (let z = 0; z < depth; z++) {
          for (let i = 0; i < piecesLeft[0].length; i++) {
            const piece = piecesLeft[0][i];
            if (canPlacePiece(x, y, z, piece)) {
              placePiece(x, y, z, piece);
              placedPieces.push([
                x + piece.dX,
                y + piece.dY,
                z + piece.dZ,
                piece
              ]);
              const res = solveBoard(piecesLeft.slice(1));
              placedPieces.pop();
              unplacePiece(x, y, z, piece);
              if (res) return res;
            }
          }
        }
      }
    }
    return null;
  }

  const result = solveBoard(rotatedPieces);
  let realResult = null;

  if (result) {
    realResult = _.sortBy(result, placedPiece => {
      const z = placedPiece[2] - placedPiece[3].dZ;
      return (
        _.sum(
          placedPiece[3].blocks.map(block => {
            return z + block[2];
          })
        ) / placedPiece[3].blocks.length
      );
    }).map(placedPiece => ({
      x: placedPiece[0],
      y: placedPiece[1],
      z: placedPiece[2],
      rotations: placedPiece[3].rotations,
      originalIndex: placedPiece[3].originalIndex
    }));
  }

  if (PROFILE) console.profileEnd();

  console.log("solver ran in " + (performance.now() - startTime) + "ms");
  return realResult;
  /*
  // convert board to visualizer format
  const vis_board = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push(board[y * width + x]);
    }
    vis_board.push(row);
  }
  //board = vis_board;
  //pieces = vis_pieces;
  */
}
