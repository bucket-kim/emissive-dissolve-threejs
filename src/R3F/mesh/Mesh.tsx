import * as THREE from "three";

const Mesh = () => {
  return (
    <mesh>
      <torusKnotGeometry args={[2.5, 0.8, 140, 140]} />
      <meshPhysicalMaterial
        color={"#cecece"}
        metalness={2}
        roughness={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default Mesh;
