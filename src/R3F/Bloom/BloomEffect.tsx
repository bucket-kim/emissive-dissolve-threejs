/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/react-in-jsx-scope */
import { FC, useMemo, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { Environment } from "@react-three/drei";

interface BloomEffectProps {
  controls: any;
}

const BloomEffect: FC<BloomEffectProps> = ({ controls }) => {
  const { scene } = useThree();

  // Load cubemap for environment
  const cubeTexture = useMemo(() => {
    const loader = new THREE.CubeTextureLoader();
    return loader.load([
      "/envMap002/px.png",
      "/envMap002/nx.png",
      "/envMap002/py.png",
      "/envMap002/ny.png",
      "/envMap002/pz.png",
      "/envMap002/nz.png",
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

  return (
    <>
      <Environment
        files={[
          "/envMap002/px.png",
          "/envMap002/nx.png",
          "/envMap002/py.png",
          "/envMap002/ny.png",
          "/envMap002/pz.png",
          "/envMap002/nz.png",
        ]}
        background
        blur={0.3}
      />
      <EffectComposer multisampling={4}>
        <Bloom
          intensity={controls[0].bloomStrength}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.025}
          mipmapBlur={true}
          radius={0.4}
        />
      </EffectComposer>
    </>
  );
};

export default BloomEffect;
