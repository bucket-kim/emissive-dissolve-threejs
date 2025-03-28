/* eslint-disable react/react-in-jsx-scope */
import { Environment, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import Mesh from "./R3F/Mesh/Mesh";
import { Suspense, useEffect } from "react";

const scale = 1;

function App() {
  const envMapArr = [
    "./envMap002/px.png",
    "./envMap002/nx.png",
    "./envMap002/py.png",
    "./envMap002/ny.png",
    "./envMap002/pz.png",
    "./envMap002/nz.png",
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
      <OrbitControls enableDamping dampingFactor={0.05} />
      <Suspense fallback={null}>
        <Mesh />
      </Suspense>
      <Environment files={envMapArr} background={false} />
    </Canvas>
  );
}

export default App;
