import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

// A swirling dimensional gate rendered with a custom vortex shader.
function Vortex({ hover }) {
  const mat = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uPower: { value: 0 } }), []);
  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    uniforms.uPower.value += ((hover.current ? 1 : 0) - uniforms.uPower.value) * 0.05;
  });
  return (
    <mesh>
      <circleGeometry args={[3.2, 128]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={`
          uniform float uTime; uniform float uPower; varying vec2 vUv;
          float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
          float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
          float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.0; a*=0.5; } return v; }
          void main(){
            vec2 p = vUv - 0.5;
            float r = length(p) * 2.0;
            float ang = atan(p.y, p.x);
            float speed = 0.6 + uPower * 1.4;
            float swirl = ang + 3.5 / (r + 0.25) - uTime * speed;
            vec2 q = vec2(cos(swirl), sin(swirl)) * r * 3.0;
            float n = fbm(q + uTime * 0.15);
            float rim = smoothstep(1.0, 0.86, r) * smoothstep(0.55, 0.96, r);
            float core = smoothstep(0.55, 0.0, r);
            vec3 blue = vec3(0.22, 0.74, 0.97);
            vec3 violet = vec3(0.51, 0.55, 0.97);
            vec3 white = vec3(0.9, 0.97, 1.0);
            vec3 col = mix(violet, blue, n);
            col += white * pow(n, 3.0) * 1.5;
            col *= 0.3 + 1.4 * rim + core * (0.2 + uPower * 0.9);
            float alpha = smoothstep(1.0, 0.9, r) * (0.55 + n * 0.6);
            gl_FragColor = vec4(col * (1.2 + uPower * 0.8), alpha);
          }`}
      />
    </mesh>
  );
}

function Rings({ hover }) {
  const g = useRef();
  useFrame((state, dt) => {
    const boost = hover.current ? 3 : 1;
    g.current.children.forEach((m, i) => {
      m.rotation.z += dt * (0.2 + i * 0.12) * (i % 2 ? -1 : 1) * boost;
      m.rotation.x = Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.15;
    });
  });
  return (
    <group ref={g}>
      {[3.35, 3.7, 4.2, 5].map((r, i) => (
        <mesh key={r}>
          <torusGeometry args={[r, i === 0 ? 0.05 : 0.015, 16, 256, i === 3 ? Math.PI * 1.6 : Math.PI * 2]} />
          <meshBasicMaterial color={i % 2 ? '#818cf8' : '#7dd3fc'} transparent opacity={i === 0 ? 1 : 0.7} />
        </mesh>
      ))}
      {/* rune ticks */}
      {Array.from({ length: 48 }).map((_, i) => {
        const a = (i / 48) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 4.45, Math.sin(a) * 4.45, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[i % 4 ? 0.12 : 0.3, 0.025, 0.02]} />
            <meshBasicMaterial color="#bae6fd" />
          </mesh>
        );
      })}
    </group>
  );
}

// Particles spiralling into the gate.
function Inflow({ count = 1400, hover }) {
  const ref = useRef();
  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const meta = [];
    for (let i = 0; i < count; i++) meta.push({ r: 3 + Math.random() * 9, a: Math.random() * Math.PI * 2, z: (Math.random() - 0.5) * 4, s: 0.2 + Math.random() * 0.8 });
    return { pos, meta };
  }, [count]);
  useFrame((_, dt) => {
    const boost = hover.current ? 3 : 1;
    data.meta.forEach((m, i) => {
      m.a += dt * m.s * (1.6 / m.r) * boost;
      m.r -= dt * m.s * 0.9 * boost;
      if (m.r < 0.4) { m.r = 9 + Math.random() * 4; m.a = Math.random() * Math.PI * 2; }
      data.pos[i * 3] = Math.cos(m.a) * m.r;
      data.pos[i * 3 + 1] = Math.sin(m.a) * m.r;
      data.pos[i * 3 + 2] = m.z * (m.r / 10);
    });
    ref.current.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data.pos, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#a5f3fc" transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function Shards() {
  const shards = useMemo(() => Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const r = 6.5 + (i % 3) * 1.4;
    return { p: [Math.cos(a) * r, Math.sin(a) * r * 0.6, -2 - (i % 4)], s: 0.25 + (i % 5) * 0.12 };
  }), []);
  return shards.map((s, i) => (
    <Float key={i} speed={1 + (i % 3)} floatIntensity={2} rotationIntensity={2}>
      <mesh position={s.p} scale={s.s}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={i % 2 ? '#818cf8' : '#38bdf8'} wireframe />
      </mesh>
    </Float>
  ));
}

function Rig({ hover }) {
  useFrame((state) => {
    const { camera, pointer } = state;
    const targetZ = hover.current ? 9.5 : 11;
    camera.position.x += (pointer.x * 2 - camera.position.x) * 0.04;
    camera.position.y += (pointer.y * 1.4 - camera.position.y) * 0.04;
    camera.position.z += (targetZ - camera.position.z) * 0.04;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

export default function PortalScene({ hover }) {
  return (
    <Canvas eventSource={document.body} eventPrefix="client" dpr={1} camera={{ position: [0, 0, 11], fov: 55 }} gl={{ antialias: false }}>
      <color attach="background" args={['#02040c']} />
      <group position={[0, 0.2, 0]}>
        <Vortex hover={hover} />
        <Rings hover={hover} />
        <Inflow hover={hover} />
      </group>
      <Shards />
      <Sparkles count={120} scale={[24, 14, 8]} size={2.5} speed={0.4} color="#7dd3fc" />
      <Rig hover={hover} />
      <EffectComposer multisampling={0}>
        <Bloom intensity={1.6} luminanceThreshold={0.1} luminanceSmoothing={0.9} mipmapBlur />
        <ChromaticAberration offset={[0.0012, 0.0012]} />
        <Vignette offset={0.25} darkness={0.9} />
      </EffectComposer>
    </Canvas>
  );
}
