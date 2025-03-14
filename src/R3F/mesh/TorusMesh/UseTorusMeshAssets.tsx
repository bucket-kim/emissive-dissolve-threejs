import { useMemo, useRef } from "react";
import * as THREE from "three";
import snoise from "../../noise/snoise.glsl?raw";

const UseTorusMeshAssets = () => {
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

  const torusKnotGeometry = useMemo(
    () => new THREE.TorusKnotGeometry(2.5, 0.8, 140, 140),
    []
  );

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
        }else{
            gl_FragColor = vec4(gl_FragColor.xyz,1.0);
        }
      `
      );
    };

    return material;
  }, []);
  return { dissolveUniformData, torusKnotGeometry, dissolveMaterial };
};

export default UseTorusMeshAssets;
