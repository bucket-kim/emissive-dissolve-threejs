import React, { useRef, useMemo, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useControls, folder } from "leva";
import { isMobileDevice } from "../utils/deviceUtils";
import { createDissolveMaterial } from "../utils/shaderUtils";

interface DissolveMeshProps {
  dissolveUniformsRef: React.MutableRefObject<any>;
}

const DissolveMesh: React.FC<DissolveMeshProps> = ({ dissolveUniformsRef }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Create TorusKnot geometry for testing
  const segments = isMobileDevice() ? 90 : 140;
  const torusKnotGeometry = useMemo(
    () => new THREE.TorusKnotGeometry(2.5, 0.8, segments, segments),
    [segments]
  );

  // Create dissolve material
  const dissolveMaterial = useMemo(
    () => createDissolveMaterial(dissolveUniformsRef.current),
    []
  );

  // Controls for dissolve effect
  const controls = useControls({
    mesh: folder({
      rotationY: {
        value: 0,
        min: -(Math.PI * 2),
        max: Math.PI * 2,
        step: 0.01,
        onChange: (value) => {
          if (meshRef.current) meshRef.current.rotation.y = value;
        },
      },
    }),
    dissolve: folder({
      meshVisible: {
        value: true,
        onChange: (value) => {
          if (meshRef.current) meshRef.current.visible = value;
        },
      },
      dissolveProgress: {
        value: dissolveUniformsRef.current.uProgress.value,
        min: -20,
        max: 20,
        step: 0.0001,
        onChange: (value) => {
          dissolveUniformsRef.current.uProgress.value = value;
        },
      },
      autoDissolve: {
        value: false,
      },
      edgeWidth: {
        value: dissolveUniformsRef.current.uEdge.value,
        min: 0.1,
        max: 8,
        step: 0.001,
        onChange: (value) => {
          dissolveUniformsRef.current.uEdge.value = value;
        },
      },
      frequency: {
        value: dissolveUniformsRef.current.uFreq.value,
        min: 0.001,
        max: 2,
        step: 0.001,
        onChange: (value) => {
          dissolveUniformsRef.current.uFreq.value = value;
        },
      },
      amplitude: {
        value: dissolveUniformsRef.current.uAmp.value,
        min: 0.1,
        max: 20,
        step: 0.001,
        onChange: (value) => {
          dissolveUniformsRef.current.uAmp.value = value;
        },
      },
      meshColor: {
        value: "#636363",
        onChange: (value) => {
          if (dissolveMaterial) dissolveMaterial.color.set(value);
        },
      },
      edgeColor: {
        value: "#4d9bff",
        onChange: (value) => {
          dissolveUniformsRef.current.uEdgeColor.value.set(value);
        },
      },
    }),
  });

  // Animate dissolve effect
  useFrame((state) => {
    // Animate the mesh position (floating effect)
    const time = state.clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(time * 2.0) * 0.5;
    }

    // Auto-dissolve animation
    if (controls.dissolve.autoDissolve) {
      const progress = dissolveUniformsRef.current.uProgress;
      const autoSpeed = isMobileDevice() ? 0.12 : 0.08;

      // Simple back-and-forth animation
      progress.value = -7 + Math.sin(time * 0.5) * 10;
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={torusKnotGeometry}
      material={dissolveMaterial}
    />
  );
};

export default DissolveMesh;
