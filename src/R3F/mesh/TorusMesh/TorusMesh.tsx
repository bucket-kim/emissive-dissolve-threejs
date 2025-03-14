/* eslint-disable react/react-in-jsx-scope */
/* eslint-disable react/no-unknown-property */
import { FC, RefObject } from "react";
import * as THREE from "three";
import UseTorusMeshAssets from "./UseTorusMeshAssets";

interface TorusMeshProps {
  torusRef: RefObject<THREE.Mesh>;
}

const TorusMesh: FC<TorusMeshProps> = ({ torusRef }) => {
  const { dissolveMaterial, torusKnotGeometry } = UseTorusMeshAssets();

  return (
    <mesh
      ref={torusRef}
      material={dissolveMaterial}
      geometry={torusKnotGeometry}
    />
  );
};

export default TorusMesh;
