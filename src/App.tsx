import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import Mesh from "./R3F/mesh/Mesh";

function App() {
  const envMapArr = [
    "./envMap/px.png",
    "./envMap/nx.png",
    "./envMap/py.png",
    "./envMap/ny.png",
    "./envMap/pz.png",
    "./envMap/nz.png",
  ];

  return (
    <Canvas
      camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 10] }}
      gl={{
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
      }}>
      <OrbitControls />
      <Environment files={envMapArr} background={false} />
      <Mesh />
    </Canvas>
  );
}

export default App;
