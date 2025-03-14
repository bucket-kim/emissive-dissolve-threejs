/* eslint-disable react/react-in-jsx-scope */
import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import Mesh from "./R3F/Mesh/Mesh";
import { useEffect } from "react";
import { isMobileDevice } from "./utils/deviceUtils";

const scale = isMobileDevice() ? 0.7 : 1;

function App() {
  const envMapArr = [
    "./envMap/px.png",
    "./envMap/nx.png",
    "./envMap/py.png",
    "./envMap/ny.png",
    "./envMap/pz.png",
    "./envMap/nz.png",
  ];

  useEffect(() => {
    const handleOrientationChange = () => {
      location.reload();
    };

    window.addEventListener("orientationchange", handleOrientationChange);
    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  return (
    <Canvas
      camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 0, 10] }}
      gl={{
        toneMapping: THREE.ACESFilmicToneMapping,
        outputColorSpace: THREE.SRGBColorSpace,
        pixelRatio: window.devicePixelRatio * scale,
      }}>
      <OrbitControls />
      <Mesh />
      <Environment files={envMapArr} background={false} />
    </Canvas>
  );
}

export default App;
