/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react/no-unknown-property */
import { useRef, useEffect, useMemo, FC } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { getParticleBaseSize, isMobileDevice } from "../utils/deviceUtils";
import { createParticleMaterial } from "../utils/shaderUtils";
import {
  initParticleAttributes,
  updateParticleAttributes,
} from "../utils/particleUtils";

interface ParticleSystemProps {
  dissolveUniforms: any;
}

const ParticleSystem: FC<ParticleSystemProps> = ({ dissolveUniforms }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);
  const particleAttributesRef = useRef<any>(null);

  // Create TorusKnot geometry
  const segments = isMobileDevice() ? 90 : 140;
  const torusKnotGeometry = useMemo(
    () => new THREE.TorusKnotGeometry(2.5, 0.8, segments, segments),
    [segments]
  );

  // Load particle texture
  const particleTexture = useMemo(
    () => new THREE.TextureLoader().load("/particle.png"),
    []
  );

  // Particle data reference
  const particleDataRef = useRef({
    particleSpeedFactor: 0.02,
    velocityFactor: { x: 2.5, y: 2 },
    waveAmplitude: 0,
  });

  // Setup particle uniforms
  const particleUniformsRef = useRef({
    uTexture: {
      value: particleTexture,
    },
    uPixelDensity: {
      value: window.devicePixelRatio,
    },
    uProgress: dissolveUniforms.uProgress,
    uEdge: dissolveUniforms.uEdge,
    uAmp: dissolveUniforms.uAmp,
    uFreq: dissolveUniforms.uFreq,
    uBaseSize: {
      value: getParticleBaseSize(),
    },
    uColor: {
      value: new THREE.Color(0x4d9bff),
    },
  });

  // Create particle material
  const particleMaterial = useMemo(
    () => createParticleMaterial(particleUniformsRef.current),
    [particleTexture]
  );

  // Controls for particles

  // Initialize particle system
  useEffect(() => {
    if (pointsRef.current) {
      // Initialize particle attributes
      geometryRef.current = torusKnotGeometry;
      const attributes = initParticleAttributes(
        torusKnotGeometry,
        particleDataRef.current
      );
      particleAttributesRef.current = attributes;
    }
  }, [torusKnotGeometry]);

  // Update particles on each frame
  useFrame((state) => {
    if (particleAttributesRef.current && geometryRef.current) {
      updateParticleAttributes(
        geometryRef.current,
        particleAttributesRef.current.particleCount,
        particleAttributesRef.current.particleMaxOffsetArr,
        particleAttributesRef.current.particleInitPosArr,
        particleAttributesRef.current.particleCurrPosArr,
        particleAttributesRef.current.particleVelocityArr,
        particleAttributesRef.current.particleDistArr,
        particleAttributesRef.current.particleRotationArr,
        particleDataRef.current
      );
    }

    // Float the mesh up and down
    const time = state.clock.getElapsedTime();
    if (pointsRef.current) {
      pointsRef.current.position.y = Math.sin(time * 2.0) * 0.5;
    }
  });

  return (
    <points
      ref={pointsRef}
      material={particleMaterial}
      geometry={torusKnotGeometry}
    />
  );
};

export default ParticleSystem;
