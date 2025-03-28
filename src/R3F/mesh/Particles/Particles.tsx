/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react/no-unknown-property */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import { useRef, useMemo, useEffect, RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import snoise from "../../noise/snoise.glsl?raw";

interface ParticleSystemProps {
  particleMeshRef: RefObject<THREE.Points>;
  geometry: THREE.BufferGeometry;
  controls: any;
  dissolveUniformData: RefObject<{
    uEdgeColor: { value: THREE.Color };
    uFreq: { value: number };
    uAmp: { value: number };
    uProgress: { value: number };
    uEdge: { value: number };
  }>;
}

interface ParticleAttributes {
  particleCount: number;
  particleMaxOffsetArr: Float32Array;
  particleInitPosArr: Float32Array;
  particleCurrPosArr: Float32Array;
  particleVelocityArr: Float32Array;
  particleDistArr: Float32Array;
  particleRotationArr: Float32Array;
}

const Particles = ({
  particleMeshRef,
  geometry,
  controls,
  dissolveUniformData,
}: ParticleSystemProps) => {
  const particleAttRef = useRef<ParticleAttributes | null>(null);

  // Particle data
  const particleData = useRef({
    particleSpeedFactor: 0.02,
    velocityFactor: { x: 2.5, y: 2, z: 1.5 },
    waveAmplitude: 0,
  });

  // Textures
  const particleTexture = useMemo(() => {
    return new THREE.TextureLoader().load("/particle.png");
  }, []);

  // Uniforms
  const particlesUniformsData = useRef({
    uTexture: {
      value: particleTexture,
    },
    uPixelDensity: {
      value: window.devicePixelRatio,
    },
    uProgress: dissolveUniformData.current.uProgress,
    uEdge: dissolveUniformData.current.uEdge,
    uAmp: dissolveUniformData.current.uAmp,
    uFreq: dissolveUniformData.current.uFreq,
    uBaseSize: {
      value: 80,
    },
    uColor: {
      value: dissolveUniformData.current.uEdgeColor.value,
    },
  });

  // Create material
  const particleMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: particlesUniformsData.current,
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        ${snoise}

        uniform float uPixelDensity;
        uniform float uBaseSize;
        uniform float uFreq;
        uniform float uAmp;
        uniform float uEdge;
        uniform float uProgress;

        varying float vNoise;
        varying float vAngle;

        attribute vec3 aCurrentPos;
        attribute float aDist;
        attribute float aAngle;

        void main() {
            vec3 pos = position;

            float noise = snoise(pos * uFreq) * uAmp;
            vNoise = noise;

            vAngle = aAngle;

            if(vNoise > uProgress-2.0 && vNoise < uProgress + uEdge+2.0){
                pos = aCurrentPos;
            }

            vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
            vec4 viewPosition = viewMatrix * modelPosition;
            vec4 projectedPosition = projectionMatrix * viewPosition;
            gl_Position = projectedPosition;

            float size = uBaseSize * uPixelDensity;
            size = size  / (aDist + 1.0);
            gl_PointSize = size / -viewPosition.z;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uEdge;
        uniform float uProgress;
        uniform sampler2D uTexture;

        varying float vNoise;
        varying float vAngle;

        void main(){

            float noise = vNoise;

            if(noise < uProgress) discard;
            if(noise > uProgress + uEdge) discard;

            vec2 coord = gl_PointCoord;
            coord = coord - 0.5; // get the coordinate from 0-1 ot -0.5 to 0.5
            coord = coord * mat2(cos(vAngle),sin(vAngle) , -sin(vAngle), cos(vAngle)); // apply the rotation transformaion
            coord = coord +  0.5; // reset the coordinate to 0-1  

            vec4 texture = texture2D(uTexture,coord);

            gl_FragColor = vec4(vec3(uColor.xyz * texture.xyz),1.0);
        }
      `,
    });
  }, [particleTexture]);

  // Initialize particle attributes
  const initParticleAttributes = (
    geo: THREE.BufferGeometry
  ): ParticleAttributes => {
    const particleCount = geo.attributes.position.count;

    // Create arrays for particles
    const particleMaxOffsetArr = new Float32Array(particleCount);
    const particleInitPosArr = new Float32Array(geo.attributes.position.array);
    const particleCurrPosArr = new Float32Array(geo.attributes.position.array);
    const particleVelocityArr = new Float32Array(particleCount * 3);
    const particleDistArr = new Float32Array(particleCount);
    const particleRotationArr = new Float32Array(particleCount);

    // Initialize particle data
    for (let i = 0; i < particleCount; i++) {
      let x = i * 3 + 0;
      let y = i * 3 + 1;
      let z = i * 3 + 2;

      particleMaxOffsetArr[i] = Math.random() * 5.5 + 1.5;

      particleVelocityArr[x] = Math.random() * 0.5 + 0.5;
      particleVelocityArr[y] = Math.random() * 0.5 + 0.5;
      particleVelocityArr[z] = Math.random() * 0.1;

      particleDistArr[i] = 0.001;
      particleRotationArr[i] = Math.random() * Math.PI * 2;
    }

    // Set attributes
    geo.setAttribute(
      "aOffset",
      new THREE.BufferAttribute(particleMaxOffsetArr, 1)
    );
    geo.setAttribute(
      "aCurrentPos",
      new THREE.BufferAttribute(particleCurrPosArr, 3)
    );
    geo.setAttribute(
      "aVelocity",
      new THREE.BufferAttribute(particleVelocityArr, 3)
    );
    geo.setAttribute("aDist", new THREE.BufferAttribute(particleDistArr, 1));
    geo.setAttribute(
      "aAngle",
      new THREE.BufferAttribute(particleRotationArr, 1)
    );

    return {
      particleCount,
      particleMaxOffsetArr,
      particleInitPosArr,
      particleCurrPosArr,
      particleVelocityArr,
      particleDistArr,
      particleRotationArr,
    };
  };

  // Helper functions for particle movement
  const calculateWaveOffset = (
    idx: number,
    particleCurrPosArr: Float32Array,
    waveAmplitude: number
  ) => {
    const posx = particleCurrPosArr[idx * 3 + 0];
    const posy = particleCurrPosArr[idx * 3 + 1];
    const posz = particleCurrPosArr[idx * 3 + 2];

    let xwave1 = Math.sin(posy * 2) * (0.8 + waveAmplitude);
    let ywave1 = Math.sin(posx * 2) * (0.6 + waveAmplitude);

    let xwave2 = Math.sin(posy * 5) * (0.2 + waveAmplitude);
    let ywave2 = Math.sin(posx * 1) * (0.9 + waveAmplitude);

    let xwave3 = Math.sin(posy * 8) * (0.8 + waveAmplitude);
    let ywave3 = Math.sin(posx * 5) * (0.6 + waveAmplitude);

    let xwave4 = Math.sin(posy * 3) * (0.8 + waveAmplitude);
    let ywave4 = Math.sin(posx * 7) * (0.6 + waveAmplitude);

    let zwave1 = Math.sin(posx * 3) * (0.5 + waveAmplitude);
    let zwave2 = Math.sin(posx * 2) * (0.4 + waveAmplitude);
    let zwave3 = Math.sin(posz * 4) * (0.3 + waveAmplitude);

    let xwave = xwave1 + xwave2 + xwave3 + xwave4;
    let ywave = ywave1 + ywave2 + ywave3 + ywave4;
    let zwave = zwave1 + zwave2 + zwave3;

    return { xwave, ywave, zwave };
  };

  const updateVelocity = (
    idx: number,
    particleVelocityArr: Float32Array,
    particleCurrPosArr: Float32Array
  ) => {
    let vx = particleVelocityArr[idx * 3 + 0];
    let vy = particleVelocityArr[idx * 3 + 1];
    let vz = particleVelocityArr[idx * 3 + 2];

    vx *= particleData.current.velocityFactor.x;
    vy *= particleData.current.velocityFactor.y;
    vz *= particleData.current.velocityFactor.z || 1.0;

    let { xwave, ywave, zwave } = calculateWaveOffset(
      idx,
      particleCurrPosArr,
      particleData.current.waveAmplitude
    );

    vx += xwave;
    vy += ywave;
    vz += zwave;

    vx *= Math.abs(particleData.current.particleSpeedFactor);
    vy *= Math.abs(particleData.current.particleSpeedFactor);
    vz *= Math.abs(particleData.current.particleSpeedFactor);

    return { vx, vy, vz };
  };

  // Main function to update all particle attributes
  const updateParticleAttributes = () => {
    if (!particleAttRef.current) return;

    const {
      particleCount,
      particleMaxOffsetArr,
      particleInitPosArr,
      particleCurrPosArr,
      particleVelocityArr,
      particleDistArr,
      particleRotationArr,
    } = particleAttRef.current;

    for (let i = 0; i < particleCount; i++) {
      let x = i * 3 + 0;
      let y = i * 3 + 1;
      let z = i * 3 + 2;

      // Calculate new velocities with wave effects
      let { vx, vy, vz } = updateVelocity(
        i,
        particleVelocityArr,
        particleCurrPosArr
      );

      // Update positions
      particleCurrPosArr[x] += vx;
      particleCurrPosArr[y] += vy;
      particleCurrPosArr[z] += vz;

      // Calculate distance from initial position
      const vec1 = new THREE.Vector3(
        particleInitPosArr[x],
        particleInitPosArr[y],
        particleInitPosArr[z]
      );
      const vec2 = new THREE.Vector3(
        particleCurrPosArr[x],
        particleCurrPosArr[y],
        particleCurrPosArr[z]
      );
      const dist = vec1.distanceTo(vec2);

      // Update distance and rotation
      particleDistArr[i] = dist;
      particleRotationArr[i] += 0.01;

      // Reset particle if it exceeds max offset
      if (dist > particleMaxOffsetArr[i]) {
        particleCurrPosArr[x] = particleInitPosArr[x];
        particleCurrPosArr[y] = particleInitPosArr[y];
        particleCurrPosArr[z] = particleInitPosArr[z];
      }
    }

    // Update attributes in the geometry
    geometry.setAttribute(
      "aOffset",
      new THREE.BufferAttribute(particleMaxOffsetArr, 1)
    );
    geometry.setAttribute(
      "aCurrentPos",
      new THREE.BufferAttribute(particleCurrPosArr, 3)
    );
    geometry.setAttribute(
      "aVelocity",
      new THREE.BufferAttribute(particleVelocityArr, 3)
    );
    geometry.setAttribute(
      "aDist",
      new THREE.BufferAttribute(particleDistArr, 1)
    );
    geometry.setAttribute(
      "aAngle",
      new THREE.BufferAttribute(particleRotationArr, 1)
    );
  };

  // Initialize particles on mount
  useEffect(() => {
    const attributes = initParticleAttributes(geometry);
    particleAttRef.current = attributes;
  }, [geometry]);

  // Update the control values
  useEffect(() => {
    particleData.current.particleSpeedFactor = controls[0].particleSpeedFactor;
    particleData.current.waveAmplitude = controls[0].waveAmplitude;
    particleData.current.velocityFactor = controls[0].velocityFactor;
    particlesUniformsData.current.uBaseSize.value =
      controls[0].particleBaseSize;
  }, [controls]);

  // Animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (!particleMeshRef.current) return;

    // Update position to match the torus
    particleMeshRef.current.position.y = Math.sin(time * 2) * 0.5;
    particleMeshRef.current.rotation.y = time * 0.35;

    // Update particles
    updateParticleAttributes();
  });

  return (
    <points
      ref={particleMeshRef}
      material={particleMaterial}
      geometry={geometry}
    />
  );
};

export default Particles;
