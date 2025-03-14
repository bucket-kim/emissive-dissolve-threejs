/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react/no-unknown-property */
import { FC, Fragment, RefObject, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import UseMeshAssets from "../TorusMesh/UseTorusMeshAssets";
import { isMobileDevice } from "../../../utils/deviceUtils";
import snoise from "../../noise/snoise.glsl?raw";
import UseParticlesAssets from "./UseParticlesAssets";

interface ParticlesProps {
  particleMeshRef: RefObject<THREE.Points>;
  goemetryRef: RefObject<THREE.BufferGeometry>;
}

const Particles: FC<ParticlesProps> = ({ particleMeshRef, goemetryRef }) => {
  const { dissolveUniformData, torusKnotGeometry } = UseMeshAssets();
  const { particleAttRef, initParticleAttributes, updateParticleAttributes } =
    UseParticlesAssets();

  const particleTexture = useMemo(() => {
    new THREE.TextureLoader().load("/particle.png");
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
      value: new THREE.Color(0x4d9bff),
    },
  });

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
  }, [particleTexture]);

  useEffect(() => {
    goemetryRef.current = torusKnotGeometry;
    const attributes = initParticleAttributes(torusKnotGeometry);
    particleAttRef.current = attributes;
  }, [torusKnotGeometry]);

  return (
    <Fragment>
      <points
        ref={particleMeshRef}
        material={particleMaterial}
        geometry={torusKnotGeometry}
      />
    </Fragment>
  );
};

export default Particles;
