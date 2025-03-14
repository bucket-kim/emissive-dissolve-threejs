/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react/no-unknown-property */
import { useRef } from "react";
import * as THREE from "three";
import UseMeshAssets from "../TorusMesh/UseTorusMeshAssets";

const UseParticlesAssets = () => {
  const { torusKnotGeometry } = UseMeshAssets();

  const particleAttRef = useRef<any>(null);

  const particleData = useRef({
    particleSpeedFactor: 0.2,
    velocityFactor: { x: 2.5, y: 2 },
    waveAmplitude: 0,
  });

  const initParticleAttributes = (geometry: THREE.BufferGeometry) => {
    const particleCount = geometry.attributes.position.count;

    // create arrays for particles
    const particleMaxOffsetArr = new Float32Array(particleCount);
    const particleInitPosArr = new Float32Array(
      geometry.attributes.position.array
    );
    const particleCurrPosArr = new Float32Array(
      geometry.attributes.position.array
    );
    const particleVelocityArr = new Float32Array(particleCount * 3);
    const particleDistArr = new Float32Array(particleCount);
    const particleRotationArr = new Float32Array(particleCount);

    // initialize particle data
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

  const calculateWaveOffset = (
    idx: number,
    particleCurrPosArr: Float32Array,
    waveAmplitude: number
  ) => {
    const posx = particleCurrPosArr[idx * 3 + 0];
    const posy = particleCurrPosArr[idx * 3 + 1];

    let xwave1 = Math.sin(posy * 2) * (0.8 + waveAmplitude);
    let ywave1 = Math.sin(posx * 2) * (0.6 + waveAmplitude);

    let xwave2 = Math.sin(posy * 5) * (0.2 + waveAmplitude);
    let ywave2 = Math.sin(posx * 1) * (0.9 + waveAmplitude);

    let xwave3 = Math.sin(posy * 8) * (0.8 + waveAmplitude);
    let ywave3 = Math.sin(posx * 5) * (0.6 + waveAmplitude);

    let xwave4 = Math.sin(posy * 3) * (0.8 + waveAmplitude);
    let ywave4 = Math.sin(posx * 7) * (0.6 + waveAmplitude);

    let xwave = xwave1 + xwave2 + xwave3 + xwave4;
    let ywave = ywave1 + ywave2 + ywave3 + ywave4;

    return { xwave, ywave };
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

    let { xwave, ywave } = calculateWaveOffset(
      idx,
      particleCurrPosArr,
      particleData.current.waveAmplitude
    );

    vx += xwave;
    vy += ywave;

    vx *= Math.abs(particleData.current.particleSpeedFactor);
    vy *= Math.abs(particleData.current.particleSpeedFactor);
    vz *= Math.abs(particleData.current.particleSpeedFactor);

    return { vx, vy, vz };
  };

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

    const geometry = torusKnotGeometry;

    for (let i = 0; i < particleCount; i++) {
      let x = i * 3 + 0;
      let y = i * 3 + 1;
      let z = i * 3 + 2;

      let { vx, vy, vz } = updateVelocity(
        i,
        particleVelocityArr,
        particleCurrPosArr
      );

      particleCurrPosArr[x] += vx;
      particleCurrPosArr[y] += vy;
      particleCurrPosArr[z] += vz;

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

      particleDistArr[i] = dist;
      particleRotationArr[i] += 0.01;

      if (dist > particleMaxOffsetArr[i]) {
        particleCurrPosArr[x] = particleInitPosArr[x];
        particleCurrPosArr[y] = particleInitPosArr[y];
        particleCurrPosArr[z] = particleInitPosArr[z];
      }
    }

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

  return {
    particleAttRef,
    initParticleAttributes,
    updateParticleAttributes,
  };
};

export default UseParticlesAssets;
