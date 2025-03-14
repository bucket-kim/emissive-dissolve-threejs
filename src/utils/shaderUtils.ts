import * as THREE from "three";
import snoise from "../lib/noise/snoise.glsl";

/**
 * Creates a custom shader material for the dissolve effect
 */
export const createDissolveMaterial = (
  uniformData: any
): THREE.MeshPhysicalMaterial => {
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0x636363),
    metalness: 2.0,
    roughness: 0.0,
    side: THREE.DoubleSide,
  });

  // Setup the material to use custom shaders
  material.onBeforeCompile = (shader) => {
    // Add uniforms
    Object.keys(uniformData).forEach((key) => {
      shader.uniforms[key] = uniformData[key];
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
};

/**
 * Creates a custom shader material for particles
 */
export const createParticleMaterial = (uniforms: any): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms,
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
          if(vNoise < uProgress) discard;
          if(vNoise > uProgress + uEdge) discard;

          vec2 coord = gl_PointCoord;
          coord = coord - 0.5; // get the coordinate from 0-1 ot -0.5 to 0.5
          coord = coord * mat2(cos(vAngle),sin(vAngle) , -sin(vAngle), cos(vAngle)); // apply the rotation transformaion
          coord = coord +  0.5; // reset the coordinate to 0-1  

          vec4 texture = texture2D(uTexture,coord);

          gl_FragColor = vec4(vec3(uColor.xyz * texture.xyz),1.0);
      }
    `,
  });
};

/**
 * Creates a bloom shader pass
 */
export const createBloomShaderPass = (
  bloomTexture: THREE.Texture,
  strength: number
): THREE.ShaderMaterial => {
  return new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      uBloomTexture: { value: bloomTexture },
      uStrength: { value: strength },
    },
    vertexShader: `
      varying vec2 vUv;
      void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D uBloomTexture;
      uniform float uStrength;
      varying vec2 vUv;
      void main(){
          vec4 baseEffect = texture2D(tDiffuse,vUv);
          vec4 bloomEffect = texture2D(uBloomTexture,vUv);
          gl_FragColor = baseEffect + bloomEffect * uStrength;
      }
    `,
  });
};
