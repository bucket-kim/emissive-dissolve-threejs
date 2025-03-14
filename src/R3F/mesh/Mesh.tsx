/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable react/no-unknown-property */
/* eslint-disable react/react-in-jsx-scope */
import * as THREE from "three";
import snoise from "../noise/snoise.glsl?raw";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { isMobileDevice } from "../../utils/deviceUtils";
import { useControls, folder } from "leva";
import { useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";

const Mesh = () => {
  const [dissolving, setDissolving] = useState<boolean>(true);

  const { scene } = useThree();

  const torusRef = useRef<THREE.Mesh>(null);
  const particleMeshRef = useRef<THREE.Points>(null);

  const geometryRef = useRef<THREE.BufferGeometry>(null);
  const particleAttRef = useRef<any>(null);

  const torusKnotGeometry = useMemo(
    () => new THREE.TorusKnotGeometry(2.5, 0.8, 140, 140),
    []
  );

  const cubeTexture = useMemo(() => {
    const loader = new THREE.CubeTextureLoader();
    return loader.load([
      "/envMap/px.png",
      "/envMap/nx.png",
      "/envMap/py.png",
      "/envMap/ny.png",
      "/envMap/pz.png",
      "/envMap/nz.png",
    ]);
  }, []);

  const dissolveUniformData = useRef({
    uEdgeColor: {
      value: new THREE.Color(0x4d9bff),
    },
    uFreq: {
      value: 0.25,
    },
    uAmp: {
      value: 16,
    },
    uProgress: {
      value: -7,
    },
    uEdge: {
      value: 0.8,
    },
  });

  const particleData = useRef({
    particleSpeedFactor: 0.02,
    velocityFactor: { x: 2.5, y: 2 },
    waveAmplitude: 0,
  });

  const particleTexture = useMemo(() => {
    return new THREE.TextureLoader().load("/particle.png");
  }, []);

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
      value: isMobileDevice() ? 40 : 80,
    },
    uColor: {
      value: dissolveUniformData.current.uEdgeColor.value,
    },
  });

  const dissolveMaterial = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      color: "#cecece",
      metalness: 2,
      roughness: 0,
      side: THREE.DoubleSide,
    });

    material.onBeforeCompile = (shader) => {
      // Add uniforms
      (
        Object.keys(dissolveUniformData.current) as Array<
          keyof typeof dissolveUniformData.current
        >
      ).forEach((key) => {
        shader.uniforms[key] = dissolveUniformData.current[key];
      });

      // Modify vertex shader
      shader.vertexShader = shader.vertexShader.replace(
        "#include <common>",
        `#include <common>
        varying vec3 vPos;
      `
      );

      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        vPos = position;
      `
      );

      // Modify fragment shader
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `#include <common>
        varying vec3 vPos;

        uniform float uFreq;
        uniform float uAmp;
        uniform float uProgress;
        uniform float uEdge;
        uniform vec3 uEdgeColor;

        ${snoise}
      `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
        float noise = snoise(vPos * uFreq) * uAmp; // calculate snoise in fragment shader for smooth dissolve edges

        if(noise < uProgress) discard; // discard any fragment where noise is lower than progress

        float edgeWidth = uProgress + uEdge;

        if(noise > uProgress && noise < edgeWidth){
            gl_FragColor = vec4(vec3(uEdgeColor),noise); // colors the edge
        }
        
        gl_FragColor = vec4(gl_FragColor.xyz,1.0);
        
      `
      );
    };

    return material;
  }, []);

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

  // Setup controls with Leva
  const controls = useControls(() => ({
    rotation: folder({
      rotationY: {
        value: 0,
        min: -(Math.PI * 2),
        max: Math.PI * 2,
        step: 0.01,
        onChange: (value) => {
          if (torusRef.current) torusRef.current.rotation.y = value;
          if (particleMeshRef.current)
            particleMeshRef.current.rotation.y = value;
        },
      },
    }),
    dissolve: folder({
      meshVisible: {
        value: true,
        onChange: (value) => {
          if (torusRef.current) torusRef.current.visible = value;
        },
      },
      dissolveProgress: {
        value: dissolveUniformData.current.uProgress.value,
        min: -20,
        max: 20,
        step: 0.0001,
        onChange: (value) => {
          dissolveUniformData.current.uProgress.value = value;
        },
      },
      autoDissolve: {
        value: false,
      },
      edgeWidth: {
        value: dissolveUniformData.current.uEdge.value,
        min: 0.1,
        max: 8,
        step: 0.001,
        onChange: (value) => {
          dissolveUniformData.current.uEdge.value = value;
        },
      },
      frequency: {
        value: dissolveUniformData.current.uFreq.value,
        min: 0.001,
        max: 2,
        step: 0.001,
        onChange: (value) => {
          dissolveUniformData.current.uFreq.value = value;
        },
      },
      amplitude: {
        value: dissolveUniformData.current.uAmp.value,
        min: 0.1,
        max: 20,
        step: 0.001,
        onChange: (value) => {
          dissolveUniformData.current.uAmp.value = value;
        },
      },
      meshColor: {
        value: "#bebebe",
        onChange: (value) => {
          if (dissolveMaterial) dissolveMaterial.color.set(value);
        },
      },
      edgeColor: {
        value: "#4d9bff",
        onChange: (value) => {
          dissolveUniformData.current.uEdgeColor.value.set(value);
        },
      },
    }),
    particles: folder({
      particleVisible: {
        value: true,
        onChange: (value) => {
          if (particleMeshRef.current) particleMeshRef.current.visible = value;
        },
      },
      particleBaseSize: {
        value: particlesUniformsData.current.uBaseSize.value,
        min: 10.0,
        max: 100,
        step: 0.01,
        onChange: (value) => {
          particlesUniformsData.current.uBaseSize.value = value;
        },
      },
      particleColor: {
        value: "#4d9bff",
        onChange: (value) => {
          particlesUniformsData.current.uColor.value.set(value);
        },
      },
      particleSpeedFactor: {
        value: particleData.current.particleSpeedFactor,
        min: 0.001,
        max: 0.1,
        step: 0.001,
        onChange: (value) => {
          particleData.current.particleSpeedFactor = value;
        },
      },
      waveAmplitude: {
        value: particleData.current.waveAmplitude,
        min: 0,
        max: 5,
        step: 0.01,
        onChange: (value) => {
          particleData.current.waveAmplitude = value;
        },
      },
      velocityFactor: {
        value: particleData.current.velocityFactor,
        onChange: (value) => {
          particleData.current.velocityFactor = value;
        },
      },
    }),
    bloom: folder({
      bloomStrength: {
        value: isMobileDevice() ? 6.0 : 8.0,
        min: 1,
        max: 20,
        step: 0.01,
      },
      luminanceThreshold: {
        value: 0.2,
        min: 0,
        max: 1,
        step: 0.01,
      },
    }),
  }));

  // Initialize particle attributes
  useEffect(() => {
    geometryRef.current = torusKnotGeometry;
    const attributes = initParticleAttributes(torusKnotGeometry);
    particleAttRef.current = attributes;
  }, [torusKnotGeometry]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    scene.background = cubeTexture;

    if (!torusRef.current || !particleMeshRef.current) return;

    torusRef.current.position.y = Math.sin(time * 2) * 0.5;
    particleMeshRef.current.position.y = Math.sin(time * 2) * 0.5;

    updateParticleAttributes();

    if (controls[0].autoDissolve) {
      const progress = dissolveUniformData.current.uProgress;
      if (dissolving) {
        progress.value += 0.08;
      } else {
        progress.value -= 0.08;
      }

      if (progress.value > 14 && dissolving) {
        setDissolving(false);
      }

      if (progress.value < -17 && !dissolving) {
        setDissolving(true);
      }
    }
  });

  return (
    <Fragment>
      <mesh
        ref={torusRef}
        material={dissolveMaterial}
        geometry={torusKnotGeometry}
      />
      <points
        ref={particleMeshRef}
        material={particleMaterial}
        geometry={torusKnotGeometry}
      />
      <EffectComposer>
        <Bloom
          intensity={controls[0].bloomStrength}
          luminanceThreshold={controls[0].luminanceThreshold}
          luminanceSmoothing={0.025}
          mipmapBlur={true}
          radius={0.4}
        />
      </EffectComposer>
    </Fragment>
  );
};

export default Mesh;
