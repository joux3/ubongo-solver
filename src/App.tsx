import React from "react";
import "./App.css";
import * as THREE from "three";
import _ from "lodash";
import { computePieceObjects, PIECES, COLORS } from "./pieces";
import { solve, SolvedPiece } from "./solver";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

class App extends React.Component {
  componentDidMount() {
    new UbongoRenderer();
  }
  render() {
    return (
      <div id="overlay-container">
        <div id="text-container"></div>
        <div id="button"></div>
      </div>
    );
  }
}

const whiteMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const solidLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

const boardLinesGeometry = new THREE.Geometry();
boardLinesGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
boardLinesGeometry.vertices.push(new THREE.Vector3(0.1, 0, 0));
boardLinesGeometry.vertices.push(new THREE.Vector3(0.1, 0.1, 0));
boardLinesGeometry.vertices.push(new THREE.Vector3(0.0, 0.1, 0));
boardLinesGeometry.vertices.push(new THREE.Vector3(0, 0, 0));

const boardBoxGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.001);
const blockGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
const pieceObjects = computePieceObjects(blockGeometry);

const HOVER_OPACITY = 0.25;
const SELECTED_OPACITY = 0.8;
const PIECES_PER_ROW = 6;
const ANIM_SPEED = 0.025;
const ANIM_SPEED_MOVE = 0.01;

class UbongoRenderer {
  private overlayContainer = document.getElementById("overlay-container")!;
  private camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    100
  );
  private scene = new THREE.Scene();
  private renderer = new THREE.WebGLRenderer({ antialias: true });
  private state = 1;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private lastHoverTarget: THREE.Object3D | null = null;
  private buttonCallback = () => {};
  private boardGroup = new THREE.Group();
  private selectedBoard: boolean[][] = [];
  private selectPiecesGroup = new THREE.Group();
  private solveResult: SolvedPiece[] = [];
  private solvePiecesGroup = new THREE.Group();
  private mouseDown = false;
  private controls: OrbitControls | null = null;
  constructor() {
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera.position.z = 1;

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
    document.getElementById("button")!.addEventListener("click", () => {
      this.buttonCallback();
    });
    document.addEventListener("mousedown", () => {
      this.mouseDown = true;
    });
    document.addEventListener("mouseup", () => {
      this.mouseDown = false;
    });
    window.document.addEventListener("mousemove", ev => {
      this.mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
      if (this.state === 6 && this.mouseDown) {
      }
      this.scheduleFrame();
    });
    window.document.addEventListener("click", () => {
      const selected = this.lastHoverTarget as any;
      if (!selected) {
        return;
      }
      selected.material.opacity =
        selected.material.opacity === SELECTED_OPACITY
          ? HOVER_OPACITY
          : SELECTED_OPACITY;
      this.scheduleFrame();
    });

    for (let xIndex = 0; xIndex < 5; xIndex += 1) {
      for (let yIndex = 0; yIndex < 5; yIndex += 1) {
        const x = -0.2 + xIndex * 0.1;
        const y = -0.2 + yIndex * 0.1;
        const boardPiece = new THREE.Line(
          boardLinesGeometry.clone(),
          solidLineMaterial.clone()
        );
        boardPiece.position.x = x;
        boardPiece.position.y = y;
        (boardPiece as any).xIndex = xIndex;
        (boardPiece as any).yIndex = yIndex;
        (boardPiece as any).material.transparent = true;
        this.boardGroup.add(boardPiece);
        const boardPieceTarget = new THREE.Mesh(
          boardBoxGeometry,
          whiteMaterial.clone()
        );
        boardPieceTarget.position.x = x + 0.05;
        boardPieceTarget.position.y = y + 0.05;
        (boardPieceTarget as any).material.opacity = 0;
        (boardPieceTarget as any).material.transparent = true;
        (boardPieceTarget as any).isRayCastTarget = true;
        this.boardGroup.add(boardPieceTarget);
      }
    }
    this.scene.add(this.boardGroup);
    const light = new THREE.PointLight(0xffffff, 1, 0, 1);
    light.position.set(0, 0, 0.3);
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.bias = 0.00000000001;
    light.shadow.camera.near = 0.01;
    light.shadow.radius = 3;
    this.scene.add(light);
    const ambientLight = new THREE.AmbientLight();
    ambientLight.intensity = 0.5;
    this.scene.add(ambientLight);

    this.renderFrame();
  }
  renderFrame = () => {
    if (this.state === 1) {
      this.selectBoard();
    } else if (this.state === 2) {
      let maxOpacity = 0;
      this.boardGroup.children.forEach((obj: any) => {
        obj.material.opacity = Math.max(obj.material.opacity - ANIM_SPEED, 0);
        if (obj.material.opacity > maxOpacity) {
          maxOpacity = obj.material.opacity;
        }
      });
      if (maxOpacity === 0) {
        this.state = 3;
        this.camera.updateMatrixWorld();
        pieceObjects.forEach((obj, i) => {
          const x = i % PIECES_PER_ROW;
          const y = Math.floor(i / PIECES_PER_ROW);
          const viewObj = obj.clone();
          viewObj.translateX((-2.8 + x) * 0.5);
          viewObj.translateY(0.6 - y * 0.65);
          viewObj.translateZ(-1);
          viewObj.receiveShadow = true;
          viewObj.castShadow = true;
          (viewObj as any).material.transparent = true;
          (viewObj as any).pieceIndex = i;
          this.selectPiecesGroup.add(viewObj);

          const numberInput = document.createElement("input");
          numberInput.type = "number";
          numberInput.value = "0";
          numberInput.min = "0";
          this.overlayContainer.appendChild(numberInput);

          const widthHalf = window.innerWidth / 2,
            heightHalf = window.innerHeight / 2;
          const screenPos = viewObj.position.clone();
          screenPos.y -= 0.2;
          screenPos.project(this.camera);
          numberInput.style.opacity = "1";
          numberInput.dataset.pieceIndex = i.toString();
          numberInput.style.left = `${Math.round(
            screenPos.x * widthHalf + widthHalf
          )}px`;
          numberInput.style.top = `${Math.round(
            -(screenPos.y * heightHalf) + heightHalf
          )}px`;
        });
        this.scene.add(this.selectPiecesGroup);
      }
      this.scheduleFrame();
    } else if (this.state === 3) {
      this.selectPieces();
    } else if (this.state === 4) {
      let maxOpacity = 0;
      document.querySelectorAll("input").forEach(input => {
        const curOpacity = Number(input.style.opacity!);
        const newOpacity = Math.max(curOpacity - ANIM_SPEED, 0);
        input.style.opacity = newOpacity.toString();
        maxOpacity = Math.max(newOpacity, maxOpacity);
      });
      this.selectPiecesGroup.children.forEach((obj: any, i) => {
        obj.material.opacity = Math.max(obj.material.opacity - ANIM_SPEED, 0);
        maxOpacity = Math.max(obj.material.opacity, maxOpacity);
      });
      if (maxOpacity === 0) {
        this.scene.remove(this.selectPiecesGroup);
        Array.from(document.querySelectorAll("input")).forEach(input => {
          input.parentElement?.removeChild(input);
        });

        const childrenToRemove = this.boardGroup.children.filter(c => {
          if (!(c instanceof THREE.Line)) {
            return true;
          }
          return !this.selectedBoard[(c as any).yIndex][(c as any).xIndex];
        });
        childrenToRemove.forEach(c => {
          this.boardGroup.remove(c);
        });
        this.boardGroup.translateZ(-0.6);
        this.state = 5;
      }
      this.scheduleFrame();
    } else if (this.state === 5) {
      let maxLen = 0;
      let minOpacity = 1;
      this.solvePiecesGroup.children.forEach((obj, i) => {
        const targetPos = solveStartPosition(i);
        targetPos.sub(obj.position);
        targetPos.clampLength(0, ANIM_SPEED_MOVE);
        if (targetPos.length() > maxLen) {
          maxLen = targetPos.length();
        }
        obj.position.add(targetPos);
        obj.rotateX(0.005);
        obj.rotateY(0.0025);
      });
      this.boardGroup.children.forEach((obj: any) => {
        obj.material.opacity = Math.min(obj.material.opacity + ANIM_SPEED, 1);
        if (obj.material.opacity < minOpacity) {
          minOpacity = obj.material.minOpacity;
        }
      });
      if (maxLen <= 0.001 && minOpacity === 1) {
        this.controls = new OrbitControls(
          this.camera,
          document.getElementsByTagName("body")[0]
        );
        /*this.controls.rotateSpeed = 1.0;
        this.controls.zoomSpeed = 1.2;
        this.controls.panSpeed = 0.8;*/
        this.controls.target = new THREE.Vector3(0, 0, -0.6);
        this.state = 6;
      }
      this.scheduleFrame();
    } else if (this.state === 6) {
      this.controls?.update();
      let hasMoved = false;
      let handledIndices = 0;
      this.solvePiecesGroup.children.forEach((obj, i) => {
        if (hasMoved) {
          obj.rotation.x += 0.005;
          obj.rotation.y += 0.0025;
          const targetPos = solveStartPosition(i - handledIndices);
          targetPos.sub(obj.position);
          targetPos.clampLength(0, ANIM_SPEED_MOVE);
          if (targetPos.length() > 0.0001) {
            obj.position.add(targetPos);
          }
        } else {
          handledIndices += 1;
          const solvedPiece = this.solveResult[i];
          if (obj.userData.finalState === 0) {
            obj.rotation.x += 0.005;
            obj.rotation.y += 0.0025;
            const targetPos = finalPosition(solvedPiece);
            targetPos.z += 0.4;
            targetPos.sub(obj.position);
            targetPos.clampLength(0, ANIM_SPEED_MOVE);
            if (targetPos.length() > 0.0001) {
              obj.position.add(targetPos);
              hasMoved = true;
            } else {
              obj.userData.finalState = 1;
            }
          }
          if (obj.userData.finalState === 1) {
            const targetRotation = calculateTotalRotation(
              solvedPiece.rotations
            ).toVector3();
            const rotationVec = obj.rotation.toVector3();
            targetRotation.sub(rotationVec);
            targetRotation.clampLength(0, ANIM_SPEED * 2);
            if (targetRotation.length() > 0.000001) {
              rotationVec.add(targetRotation);
              obj.rotation.setFromVector3(rotationVec);
              hasMoved = true;
            } else {
              obj.userData.finalState = 2;
            }
          }
          if (obj.userData.finalState === 2) {
            const targetPos = finalPosition(solvedPiece);
            targetPos.sub(obj.position);
            targetPos.clampLength(0, ANIM_SPEED_MOVE);
            if (targetPos.length() > 0.0001) {
              obj.position.add(targetPos);
              hasMoved = true;
            } else {
              obj.userData.finalState = 3;
            }
          }
        }
      });
      /*this.camera.position.setX(this.mouse.x);
      this.camera.position.setY(this.mouse.y);
      this.camera.lookAt(new THREE.Vector3(0, 0, 0));*/
      if (hasMoved) {
        this.scheduleFrame();
      }
    }

    this.renderer.render(this.scene, this.camera);
  };
  selectBoard = () => {
    this.setText("1/3: Piirrä pelilauta");
    this.setButton("Jatka", () => {
      this.setButton(null, () => {});
      this.state = 2;
      this.selectedBoard = _(this.boardGroup.children)
        .filter((obj: any) => obj.isRayCastTarget)
        .groupBy(obj => obj.position.y)
        .values()
        .sortBy(objArray => objArray[0].position.y)
        .map(objArray =>
          _.sortBy(objArray, obj => obj.position.x).map(
            (obj: any) => obj.material.opacity === SELECTED_OPACITY
          )
        )
        .value();

      this.scheduleFrame();
    });
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.boardGroup.children
    );
    this.boardGroup.children.forEach((object: any) => {
      if (object.isRayCastTarget && object.material.opacity === HOVER_OPACITY) {
        object.material.opacity = 0;
      }
    });
    this.lastHoverTarget = null;
    for (const intersect of intersects) {
      const object = intersect.object as any;
      if (object.isRayCastTarget) {
        if (object.material.opacity !== SELECTED_OPACITY) {
          object.material.opacity = HOVER_OPACITY;
        }
        this.lastHoverTarget = object;
        break;
      }
    }
  };
  selectPieces = () => {
    this.setText("2/3: Valitse palat");
    this.setButton("Ratkaise lauta", () => {
      this.setButton(null, () => {});
      const pieceIndices = _(document.querySelectorAll("input"))
        .flatMap(input =>
          _.times(
            parseInt(input.value, 10),
            _.constant(parseInt(input.dataset.pieceIndex || "", 10))
          )
        )
        .value();
      const flatBoard = _.flatten(
        this.selectedBoard.map(row => row.map(t => (t ? 1 : 0)))
      );
      console.log("-------flatboard");
      console.log(flatBoard);
      const solverPieces = pieceIndices.map(i => toSolverPiece(PIECES[i], i));
      if (
        flatBoard.filter(x => x).length * 2 !==
        _(solverPieces)
          .map(solverPiece => solverPiece.blocks)
          .flatten()
          .value().length
      ) {
        alert(
          "Please select correct pieces or confirm that the board is correct"
        );
        return;
      }
      const solveResult = solve(5, 5, flatBoard, solverPieces);
      if (!solveResult) {
        alert("unable to solve, please check the pieces");
      } else {
        console.log(solveResult);
        solveResult.forEach((p, i) => {
          const cloned: any = this.selectPiecesGroup.children
            .find((c: any) => c.pieceIndex === p.originalIndex)!
            .clone();
          cloned.material = cloned.material.clone();
          cloned.material.color.setHex(COLORS[i % COLORS.length]);
          cloned.userData.finalState = 0;
          this.solvePiecesGroup.add(cloned);
        });
        this.scene.add(this.solvePiecesGroup);
        this.solveResult = solveResult;
        this.state = 4;
        this.setText("");
        this.scheduleFrame();
      }
    });
    this.selectPiecesGroup.children.forEach(obj => {
      obj.lookAt(
        obj.position.x - this.mouse.x,
        obj.position.y - this.mouse.y,
        1
      );
      obj.rotation.z = 0;
    });
  };
  private hasScheduled = false;
  private scheduleFrame = () => {
    if (this.hasScheduled) {
      return;
    }
    this.hasScheduled = true;
    requestAnimationFrame(this.scheduled);
  };
  private scheduled = () => {
    this.hasScheduled = false;
    this.renderFrame();
  };

  private lastText: string | null = null;
  setText = (text: string) => {
    if (text === this.lastText) {
      return;
    }
    this.lastText = text;
    document.getElementById("text-container")!.innerText = text;
  };
  setButton = (text: string | null, callback: () => void) => {
    const button = document.getElementById("button")!;
    if (text) {
      button.innerText = text;
      button.style.visibility = "visible";
      this.buttonCallback = callback;
    } else {
      button.style.visibility = "hidden";
    }
  };
}

function toSolverPiece(piece: number[][], originalIndex: number) {
  const result: [number, number, number][] = [];
  piece.forEach((row, y) => {
    row.forEach((depth, x) => {
      for (let z = 0; z < depth; z++) {
        result.push([x, y, z]);
      }
    });
  });
  console.log("-------");
  console.log(piece);
  console.log("--->");
  console.log(result);
  return {
    blocks: result,
    originalIndex,
    rotations: [],
    dX: 0,
    dY: 0,
    dZ: 0
  };
}

function calculateTotalRotation(steps: ("x" | "y" | "z")[]) {
  const obj = new THREE.Object3D();
  steps.forEach(rotation => {
    if (rotation === "x") {
      obj.rotateOnWorldAxis(
        new THREE.Vector3(1, 0, 0),
        (90 / 360) * (2 * Math.PI)
      );
    } else if (rotation === "y") {
      obj.rotateOnWorldAxis(
        new THREE.Vector3(0, 1, 0),
        (90 / 360) * (2 * Math.PI)
      );
    } else {
      obj.rotateOnWorldAxis(
        new THREE.Vector3(0, 0, 1),
        (90 / 360) * (2 * Math.PI)
      );
    }
  });
  return obj.rotation;
}

function solveStartPosition(i: number) {
  return new THREE.Vector3(-1, -0.6 * i, -0.4);
}

function finalPosition(solvedPiece: SolvedPiece) {
  return new THREE.Vector3(
    -0.15 + solvedPiece.x * 0.1,
    -0.15 + solvedPiece.y * 0.1,
    solvedPiece.z * 0.1 + 0.05 - 0.6
  );
}

export default App;
