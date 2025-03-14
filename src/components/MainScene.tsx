import React, { useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import BloomEffect from "./BloomEffect";
import DissolveMesh from "./DissolveMesh";
import ParticleSystem from "./ParticleSystem";
import { isMobileDevice } from "../utils/deviceUtils";

const MainScene: React.FC = () => {
  // Shared dissolve uniforms
  const dissolveUniformsRef = useRef({
    uEdgeColor: {
      value: new THREE.Color(0x4d9bff),
    },
    uFreq: {
      value: 0.25,
    },
    uAmp: {
      value: 16.0,
    },
    uProgress: {
      value: -7.0,
    },
    uEdge: {
      value: 0.8,
    },
  });

  return (
    <>
      {/* Camera controller */}
      <OrbitControls makeDefault />

      {/* Environment setup */}
      <color attach='background' args={["black"]} />

      {/* Main mesh with dissolve effect */}
      <DissolveMesh dissolveUniformsRef={dissolveUniformsRef} />

      {/* Particle system */}
      <ParticleSystem dissolveUniforms={dissolveUniformsRef.current} />

      {/* Bloom effect */}
      <BloomEffect
        strength={isMobileDevice() ? 6.0 : 8.0}
        radius={isMobileDevice() ? 0.1 : 0.25}
        threshold={0.2}
      />
    </>
  );
};

export default MainScene;
