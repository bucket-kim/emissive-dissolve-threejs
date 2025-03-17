/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
/* eslint-disable react/no-unknown-property */
/* eslint-disable react/react-in-jsx-scope */
import * as THREE from "three";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { isMobileDevice } from "../../utils/deviceUtils";
import { useControls, folder } from "leva";
import BloomEffect from "../Bloom/BloomEffect";
import Particles from "./Particles/Particles";
import TorusKnot from "./TorusMesh/TorusMesh";

const Mesh = () => {
  const [dissolving, setDissolving] = useState<boolean>(true);

  // Shared uniform data between both components
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

  // Shared geometry for both the mesh and particles
  const torusKnotGeometry = useMemo(
    () => new THREE.TorusKnotGeometry(2.5, 0.8, 140, 140),
    []
  );

  // Setup controls with Leva
  const controls = useControls(() => ({
    rotation: folder({
      rotationY: {
        value: 0,
        min: -(Math.PI * 2),
        max: Math.PI * 2,
        step: 0.01,
      },
    }),
    dissolve: folder({
      meshVisible: {
        value: true,
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
        onChange: (value) => {
          // Reset dissolving state if auto is turned off
          if (!value) {
            setDissolving(true);
          }
        },
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
      },
      particleBaseSize: {
        value: isMobileDevice() ? 40 : 80,
        min: 10.0,
        max: 100,
        step: 0.01,
      },
      particleColor: {
        value: "#4d9bff",
      },
      particleSpeedFactor: {
        value: 0.02,
        min: 0.001,
        max: 0.1,
        step: 0.001,
      },
      waveAmplitude: {
        value: 0,
        min: 0,
        max: 5,
        step: 0.01,
      },
      velocityFactor: {
        value: { x: 2.5, y: 2 },
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

  // Effect for auto-dissolve toggling
  useEffect(() => {
    // if (!controls[0].autoDissolve) return;

    const checkDissolveProgress = () => {
      const progress = dissolveUniformData.current.uProgress.value;

      if (progress > 14 && dissolving) {
        setDissolving(false);
      }

      if (progress < -17 && !dissolving) {
        setDissolving(true);
      }
    };

    const interval = setInterval(checkDissolveProgress, 100);
    return () => clearInterval(interval);
  }, [controls, dissolving]);

  return (
    <Fragment>
      <TorusKnot
        controls={controls}
        dissolveUniformData={dissolveUniformData}
        dissolving={dissolving}
      />
      <Particles
        geometry={torusKnotGeometry}
        controls={controls}
        dissolveUniformData={dissolveUniformData}
      />
      <BloomEffect controls={controls} />
    </Fragment>
  );
};

export default Mesh;
