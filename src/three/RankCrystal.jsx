import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';

function Crystal({ color }) {
  const inner = useRef();
  const outer = useRef();
  useFrame((_, dt) => {
    inner.current.rotation.y += dt * 0.8;
    outer.current.rotation.y -= dt * 0.35;
    outer.current.rotation.x += dt * 0.2;
  });
  return (
    <Float speed={2} floatIntensity={0.6} rotationIntensity={0.3}>
      <mesh ref={inner} scale={[0.9, 1.4, 0.9]}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} metalness={0.4} roughness={0.15} flatShading transparent opacity={0.85} />
      </mesh>
      <mesh ref={outer} scale={1.75}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.1, 0.02, 8, 120]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </Float>
  );
}

export default function RankCrystal({ color = '#38bdf8' }) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 6], fov: 45 }} gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 4]} intensity={40} color="#ffffff" />
      <pointLight position={[-3, -2, 2]} intensity={25} color={color} />
      <Crystal color={color} />
    </Canvas>
  );
}
