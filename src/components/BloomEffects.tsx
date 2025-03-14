import { useRef, useEffect, useMemo, FC } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import {
  EffectComposer,
  RenderPass,
  UnrealBloomPass,
  ShaderPass,
  OutputPass,
} from "@react-three/drei";
import * as THREE from "three";
import { getScale } from "../utils/deviceUtils";
import { createBloomShaderPass } from "../utils/shaderUtils";

interface BloomEffectProps {
  strength?: number;
  radius?: number;
  threshold?: number;
}

const BloomEffect: FC<BloomEffectProps> = ({
  strength = 0.5,
  radius = 0.25,
  threshold = 0.2,
}) => {
  const { gl, scene, camera, size } = useThree();
  const bloomComposerRef = useRef<any>();
  const finalComposerRef = useRef<any>();
  const scale = getScale();

  // Load cube texture for background
  const cubeTexture = useMemo(() => {
    const loader = new THREE.CubeTextureLoader();
    return loader.load([
      "/cubeMap2/posx.png",
      "/cubeMap2/negx.png",
      "/cubeMap2/posy.png",
      "/cubeMap2/negy.png",
      "/cubeMap2/posz.png",
      "/cubeMap2/negz.png",
    ]);
  }, []);

  // Keep track of original scene background
  const originalBackground = useRef(scene.background);

  useEffect(() => {
    // Store the original scene background
    originalBackground.current = scene.background;

    // Set environment map
    scene.environment = cubeTexture;

    return () => {
      // Restore original background on cleanup
      scene.background = originalBackground.current;
      scene.environment = null;
    };
  }, [scene, cubeTexture]);

  // Update on resize
  useEffect(() => {
    const handleResize = () => {
      const width = size.width * scale;
      const height = size.height * scale;
      if (bloomComposerRef.current && finalComposerRef.current) {
        bloomComposerRef.current.setSize(width, height);
        finalComposerRef.current.setSize(width, height);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [size, scale]);

  // Rendering loop
  useFrame(() => {
    // Set black background for bloom pass
    const blackColor = new THREE.Color(0x000000);
    scene.background = blackColor;

    // Render bloom pass
    if (bloomComposerRef.current) {
      bloomComposerRef.current.render();
    }

    // Reset background and render final pass
    scene.background = cubeTexture;
    if (finalComposerRef.current) {
      finalComposerRef.current.render();
    }
  }, 1);

  return (
    <>
      {/* First composer for bloom effect */}
      <EffectComposer ref={bloomComposerRef} disableNormalPass>
        <RenderPass scene={scene} camera={camera} />
        <UnrealBloomPass
          args={[
            new THREE.Vector2(size.width * scale, size.height * scale),
            strength,
            radius,
            threshold,
          ]}
        />
      </EffectComposer>

      {/* Second composer for combining bloom with scene */}
      <EffectComposer ref={finalComposerRef} disableNormalPass>
        <RenderPass scene={scene} camera={camera} />
        <ShaderPass
          args={[
            createBloomShaderPass(
              bloomComposerRef.current?.renderTarget2.texture,
              strength * 10
            ),
          ]}
        />
        <OutputPass />
      </EffectComposer>
    </>
  );
};

export default BloomEffect;
