/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react/no-unknown-property */
import * as THREE from "three";
import { useMemo, RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import snoise from "../../noise/snoise.glsl?raw";

interface TorusKnotProps {
  torusRef: RefObject<THREE.Mesh>;
  controls: any;
  dissolveUniformData: React.MutableRefObject<{
    uEdgeColor: { value: THREE.Color };
    uFreq: { value: number };
    uAmp: { value: number };
    uProgress: { value: number };
    uEdge: { value: number };
  }>;
  dissolving: boolean;
  setDissolving: (arg0: boolean) => void;
}

const TorusKnot = ({
  torusRef,
  controls,
  dissolveUniformData,
  dissolving,
  setDissolving,
}: TorusKnotProps) => {
  // Create geometry

  // const { nodes } = useGLTF("/models/circle.glb");

  const torusKnotGeometry = useMemo(
    () => new THREE.TorusKnotGeometry(2.5, 0.8, 140, 140),
    []
  );

  // const torusKnotGeometry = useMemo(
  //   () => new THREE.IcosahedronGeometry(4, 2),
  //   []
  // );

  // Create material
  const dissolveMaterial = useMemo(() => {
    const material = new THREE.MeshPhysicalMaterial({
      color: "#bebebe",
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
  }, [dissolveUniformData]);

  // Animation
  useFrame((state) => {
    const time = state.clock.getElapsedTime();

    if (!torusRef.current) return;

    torusRef.current.position.y = Math.sin(time * 2) * 0.5;
    torusRef.current.rotation.y = time * 0.35;

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
    <mesh
      ref={torusRef}
      material={dissolveMaterial}
      geometry={torusKnotGeometry}
    />
  );
};

export default TorusKnot;
export type { TorusKnotProps };
