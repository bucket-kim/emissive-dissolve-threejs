import React, { FC, useMemo, useEffect } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { isMobileDevice } from "../../utils/deviceUtils";

interface BloomEffectProps {
  controls: any;
}

const BloomEffect: FC<BloomEffectProps> = ({ controls }) => {
  const { scene } = useThree();

  // Load cubemap for environment
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

  // Set environment and store original background
  useEffect(() => {
    scene.environment = cubeTexture;
    return () => {
      scene.environment = null;
    };
  }, [scene, cubeTexture]);

  // Make sure the scene background is set properly for rendering
  useFrame(() => {
    scene.background = cubeTexture;
  });

  return (
    <EffectComposer multisampling={isMobileDevice() ? 0 : 4}>
      <Bloom
        intensity={controls[0].bloomStrength}
        luminanceThreshold={0.2}
        luminanceSmoothing={0.025}
        mipmapBlur={true}
        radius={isMobileDevice() ? 0.2 : 0.4}
      />
    </EffectComposer>
  );
};

export default BloomEffect;
