import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Palette } from '../palette';

/* ------------------------------------------------------------------ dust */
/**
 * GLSL dust field. Points drift on a slow curl, twinkle out of phase, and fade
 * with distance so the volume reads as depth rather than as a flat sprite sheet.
 */
const DUST_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uSize;
  attribute float aScale;
  attribute float aPhase;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float t = uTime * 0.08 + aPhase;
    p.x += sin(t * 1.7 + p.y * 0.6) * 0.55;
    p.y += sin(t * 1.1 + p.z * 0.4) * 0.42 + mod(uTime * 0.035 + aPhase, 1.0) * 0.6;
    p.z += cos(t * 1.3 + p.x * 0.5) * 0.55;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float twinkle = 0.45 + 0.55 * sin(uTime * 1.6 + aPhase * 9.0);
    vAlpha = twinkle * smoothstep(46.0, 6.0, -mv.z);
    gl_PointSize = uSize * aScale * (34.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const DUST_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying float vAlpha;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float mask = smoothstep(0.5, 0.0, length(d));
    if (mask < 0.01) discard;
    gl_FragColor = vec4(uColor, mask * vAlpha * 0.55);
  }
`;

export function DustField({ palette, count = 1400, radius = 26 }: { palette: Palette; count?: number; radius?: number }) {
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * radius * 2;
      positions[i * 3 + 1] = (Math.random() - 0.4) * radius;
      positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
      scales[i] = 0.35 + Math.random() * 1.4;
      phases[i] = Math.random() * Math.PI * 2;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return g;
  }, [count, radius]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 3.1 },
      uColor: { value: new THREE.Color(palette.dust) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state) => {
    if (!material.current) return;
    material.current.uniforms.uTime.value = state.clock.elapsedTime;
    (material.current.uniforms.uColor.value as THREE.Color).lerp(new THREE.Color(palette.dust), 0.03);
  });

  return (
    <points geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={DUST_VERT}
        fragmentShader={DUST_FRAG}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ----------------------------------------------------------- floating pages */
/** Old handwritten leaves drifting through the dark — Scene 1 of the brief. */
export function FloatingPages({ palette, count = 26 }: { palette: Palette; count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const seeds = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        origin: new THREE.Vector3((Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 20),
        spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.25),
        phase: Math.random() * Math.PI * 2,
        scale: 0.35 + Math.random() * 0.7,
      })),
    [count]
  );

  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    seeds.forEach((seed, i) => {
      dummy.position.set(
        seed.origin.x + Math.sin(t * 0.16 + seed.phase) * 1.5,
        seed.origin.y + Math.sin(t * 0.11 + seed.phase * 1.7) * 1.1,
        seed.origin.z + Math.cos(t * 0.14 + seed.phase) * 1.5
      );
      dummy.rotation.set(
        seed.phase + t * seed.spin.x * 0.25,
        seed.phase + t * seed.spin.y * 0.3,
        Math.sin(t * 0.2 + seed.phase) * 0.5
      );
      dummy.scale.setScalar(seed.scale);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[0.62, 0.84, 1, 1]} />
      <meshStandardMaterial
        color={palette.paper}
        roughness={0.95}
        metalness={0}
        side={THREE.DoubleSide}
        transparent
        opacity={0.5}
      />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------- moon */
const GLOW_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = smoothstep(1.0, 0.0, d);
    float halo = pow(core, 3.0);
    float breathe = 0.9 + 0.1 * sin(uTime * 0.5);
    gl_FragColor = vec4(uColor, halo * 0.55 * breathe);
  }
`;

const GLOW_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function Moon({ palette, position = [-9, 9, -18] }: { palette: Palette; position?: [number, number, number] }) {
  const glow = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({ uColor: { value: new THREE.Color(palette.rim) }, uTime: { value: 0 } }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state) => {
    if (!glow.current) return;
    glow.current.uniforms.uTime.value = state.clock.elapsedTime;
    (glow.current.uniforms.uColor.value as THREE.Color).lerp(new THREE.Color(palette.rim), 0.03);
  });

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[2.1, 48, 48]} />
        <meshStandardMaterial
          color={palette.paper}
          emissive={palette.rim}
          emissiveIntensity={1.4}
          roughness={1}
        />
      </mesh>
      <mesh scale={9}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          ref={glow}
          uniforms={uniforms}
          vertexShader={GLOW_VERT}
          fragmentShader={GLOW_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <pointLight color={palette.rim} intensity={40} distance={60} decay={2} />
    </group>
  );
}

/* ----------------------------------------------------------------- candle */
const FLAME_VERT = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 p = position;
    float sway = sin(uTime * 5.5 + p.y * 8.0) * 0.035 * smoothstep(0.0, 1.0, uv.y);
    p.x += sway;
    p.z += cos(uTime * 4.2 + p.y * 7.0) * 0.03 * smoothstep(0.0, 1.0, uv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FLAME_FRAG = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float body = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
    float edge = 1.0 - abs(vUv.x - 0.5) * 2.0;
    float flicker = 0.85 + 0.15 * sin(uTime * 17.0) * sin(uTime * 6.3);
    vec3 hot = vec3(1.0, 0.93, 0.72);
    vec3 warm = vec3(1.0, 0.55, 0.16);
    vec3 color = mix(warm, hot, smoothstep(0.15, 0.6, edge * body));
    float alpha = body * edge * flicker;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

export function Candle({ position = [0, 0, 0], height = 0.5 }: { position?: [number, number, number]; height?: number }) {
  const flame = useRef<THREE.ShaderMaterial>(null);
  const light = useRef<THREE.PointLight>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (flame.current) flame.current.uniforms.uTime.value = t;
    if (light.current) {
      // Real candlelight is never steady — two out-of-phase sines beat against each other.
      light.current.intensity = 5.2 + Math.sin(t * 11) * 0.7 + Math.sin(t * 3.7) * 0.5;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} receiveShadow>
        <cylinderGeometry args={[0.055, 0.065, height, 20]} />
        <meshStandardMaterial color="#f4e6c6" roughness={0.55} emissive="#b8701f" emissiveIntensity={0.7} />
      </mesh>
      {[0, Math.PI / 2].map((yaw) => (
        <mesh key={yaw} position={[0, height + 0.09, 0]} rotation={[0, yaw, 0]}>
          <planeGeometry args={[0.12, 0.24]} />
          <shaderMaterial
            ref={yaw === 0 ? flame : undefined}
            uniforms={uniforms}
            vertexShader={FLAME_VERT}
            fragmentShader={FLAME_FRAG}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
      <pointLight ref={light} position={[0, height + 0.12, 0]} color="#ffb066" distance={7} decay={2} />
    </group>
  );
}
