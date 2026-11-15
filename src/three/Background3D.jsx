import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sparkles } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';

const BLUE = new THREE.Color('#38bdf8');
const VIOLET = new THREE.Color('#818cf8');
const RED = new THREE.Color('#f43f5e');
const ORANGE = new THREE.Color('#f97316');

// Twinkling, drifting data-particles.
function ParticleField({ count = 2200, danger }) {
  const ref = useRef();
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 6 + Math.random() * 38;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 10;
      seeds[i] = Math.random();
    }
    return { positions, seeds };
  }, [count]);
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uColA: { value: BLUE.clone() }, uColB: { value: VIOLET.clone() } }), []);
  useFrame((state, dt) => {
    uniforms.uTime.value += dt;
    uniforms.uColA.value.lerp(danger ? RED : BLUE, 0.04);
    uniforms.uColB.value.lerp(danger ? ORANGE : VIOLET, 0.04);
    if (ref.current) ref.current.rotation.y += dt * (danger ? 0.04 : 0.012);
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={`
          attribute float aSeed; uniform float uTime; varying float vSeed; varying float vTw;
          void main(){
            vSeed = aSeed;
            vec3 p = position;
            p.y += sin(uTime*0.3 + aSeed*40.0) * 0.6;
            vec4 mv = modelViewMatrix * vec4(p,1.0);
            vTw = 0.55 + 0.45*sin(uTime*(1.0+aSeed*3.0) + aSeed*100.0);
            gl_PointSize = (1.5 + aSeed*3.5) * (60.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`}
        fragmentShader={`
          uniform vec3 uColA; uniform vec3 uColB; varying float vSeed; varying float vTw;
          void main(){
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.0, d);
            vec3 c = mix(uColA, uColB, vSeed);
            gl_FragColor = vec4(c * 1.6, a * vTw);
          }`}
      />
    </points>
  );
}

// Slowly rotating holographic rings.
function DataRings({ danger }) {
  const g = useRef();
  const mats = useRef([]);
  useFrame((_, dt) => {
    if (!g.current) return;
    g.current.children.forEach((m, i) => { m.rotation.z += dt * (0.05 + i * 0.03) * (i % 2 ? -1 : 1) * (danger ? 2.5 : 1); });
    mats.current.forEach((m) => m && m.color.lerp(danger ? RED : BLUE, 0.04));
  });
  return (
    <group ref={g} position={[0, -1, -18]} rotation={[1.25, 0, 0]}>
      {[7, 10, 13.5, 17].map((r, i) => (
        <mesh key={r}>
          <torusGeometry args={[r, 0.02 + i * 0.006, 8, 220]} />
          <meshBasicMaterial ref={(m) => (mats.current[i] = m)} color={BLUE} transparent opacity={0.55 - i * 0.09} />
        </mesh>
      ))}
    </group>
  );
}

function Crystal({ position, scale = 1, speed = 1, danger }) {
  const ref = useRef();
  const mat = useRef();
  useFrame((_, dt) => {
    if (ref.current) { ref.current.rotation.x += dt * 0.2 * speed; ref.current.rotation.y += dt * 0.3 * speed; }
    mat.current?.color.lerp(danger ? RED : VIOLET, 0.04);
  });
  return (
    <Float speed={1.4 * speed} rotationIntensity={0.6} floatIntensity={1.2}>
      <mesh ref={ref} position={position} scale={scale}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial ref={mat} color={VIOLET} wireframe transparent opacity={0.5} />
      </mesh>
    </Float>
  );
}

function Grid({ danger }) {
  const mat = useRef();
  useFrame((_, dt) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value += dt;
    mat.current.uniforms.uCol.value.lerp(danger ? RED : BLUE, 0.04);
  });
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uCol: { value: BLUE.clone() } }), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -9, -10]}>
      <planeGeometry args={[160, 160, 1, 1]} />
      <shaderMaterial
        ref={mat}
        transparent
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={`varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`}
        fragmentShader={`
          uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
          void main(){
            vec2 uv = vUv*80.0; uv.y += uTime*0.6;
            vec2 g = abs(fract(uv-0.5)-0.5)/fwidth(uv);
            float line = 1.0 - min(min(g.x,g.y),1.0);
            float fade = smoothstep(0.5, 0.05, distance(vUv, vec2(0.5)));
            gl_FragColor = vec4(uCol, line*fade*0.35);
          }`}
      />
    </mesh>
  );
}

function Rig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x += (pointer.x * 1.6 - camera.position.x) * 0.03;
    camera.position.y += (pointer.y * 1.0 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, -12);
  });
  return null;
}

export default function Background3D({ danger = false, reduced = false }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} aria-hidden>
      <Canvas eventSource={document.body} eventPrefix="client" dpr={1} camera={{ position: [0, 0, 8], fov: 60 }} gl={{ antialias: false, powerPreference: 'high-performance' }} frameloop={reduced ? 'demand' : 'always'}>
        <color attach="background" args={[danger ? '#0a0205' : '#02040c']} />
        <fog attach="fog" args={[danger ? '#0a0205' : '#02040c', 18, 60]} />
        <ParticleField danger={danger} count={reduced ? 800 : 2200} />
        <DataRings danger={danger} />
        <Grid danger={danger} />
        <Crystal position={[-11, 3, -14]} scale={1.6} danger={danger} />
        <Crystal position={[12, -2, -16]} scale={2.2} speed={0.7} danger={danger} />
        <Crystal position={[6, 6, -22]} scale={1.1} speed={1.3} danger={danger} />
        <Sparkles count={60} scale={[30, 16, 10]} position={[0, 0, -8]} size={3} speed={0.3} color={danger ? '#fb7185' : '#7dd3fc'} />
        <Rig />
        <EffectComposer multisampling={0}>
          <Bloom intensity={1.1} luminanceThreshold={0.15} luminanceSmoothing={0.8} mipmapBlur />
          <Vignette eskil={false} offset={0.2} darkness={0.85} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
