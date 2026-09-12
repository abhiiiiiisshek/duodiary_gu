import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Palette } from '../palette';
import { leatherTextures, ruledPaperTexture } from '../textures';

/* ---------------------------------------------------------------- ink shader */
/**
 * Ink spreading into paper: fbm-warped distance field revealed by uProgress,
 * with a darker wet edge that lags the bleed. Used for the writing reveal and
 * for the "the diary burns the page" effect on a sealed private thought.
 */
const INK_FRAG = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform vec3 uInk;
  uniform float uBurn;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1,0)), f.x),
               mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float grain = fbm(uv * 7.0 + uTime * 0.03);
    // ink creeps from the left edge, warped by the paper fibre
    float front = uProgress * 1.35 - 0.15;
    float field = uv.x + (grain - 0.5) * 0.28;
    float ink = smoothstep(front + 0.06, front - 0.02, field);
    float wet = smoothstep(front + 0.10, front + 0.02, field) - ink;

    vec3 color = mix(uInk, uInk * 0.55, wet);
    float alpha = ink * 0.9 + wet * 0.5;

    // burn: the page chars away from the ink outward, leaving nothing
    if (uBurn > 0.0) {
      float edge = fbm(uv * 5.0 + 3.1) - uBurn * 1.4;
      float charred = smoothstep(0.02, -0.02, edge);
      float ember = smoothstep(0.06, 0.02, edge) - charred;
      color = mix(color, vec3(1.0, 0.42, 0.08), ember);
      alpha = alpha * (1.0 - charred) + ember * 0.9;
    }

    if (alpha < 0.01) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

const BASIC_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export function InkOverlay({
  progress, burn = 0, color = '#131019', size = [1.05, 1.5] as [number, number],
}: {
  progress: number; burn?: number; color?: string; size?: [number, number];
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uBurn: { value: 0 },
      uInk: { value: new THREE.Color(color) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state, delta) => {
    if (!mat.current) return;
    const u = mat.current.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uProgress.value = THREE.MathUtils.damp(u.uProgress.value, progress, 3, delta);
    u.uBurn.value = THREE.MathUtils.damp(u.uBurn.value, burn, 2.5, delta);
  });

  return (
    <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={size} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={BASIC_VERT}
        fragmentShader={INK_FRAG}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------- book */

const PAGE_COUNT = 7;

export interface DiaryProps {
  palette: Palette;
  /** 0 = shut, 1 = lying open. Tweened, never snapped. */
  open: number;
  /** ink reveal on the right-hand page */
  inkProgress?: number;
  burn?: number;
  /** slow presentation spin while the book floats in the dark */
  spin?: boolean;
  onClick?: () => void;
  position?: [number, number, number];
  scale?: number;
}

export function Diary({
  palette, open, inkProgress = 0, burn = 0, spin = false, onClick, position = [0, 0, 0], scale = 1,
}: DiaryProps) {
  const group = useRef<THREE.Group>(null);
  const centering = useRef<THREE.Group>(null);
  const frontCover = useRef<THREE.Group>(null);
  const pageRefs = useRef<(THREE.Group | null)[]>([]);
  const [hovered, setHovered] = useState(false);
  const opened = useRef(0);

  const leather = leatherTextures();
  const ruled = ruledPaperTexture();

  const W = 1.15;   // half-width of a leaf
  const D = 1.55;   // depth (spine length)
  const T = 0.055;  // cover thickness

  useFrame((state, delta) => {
    opened.current = THREE.MathUtils.damp(opened.current, open, 2.6, delta);
    const o = opened.current;

    if (frontCover.current) frontCover.current.rotation.z = -Math.PI * o;
    // shut, the leaves sit to one side of the spine; open, they straddle it
    if (centering.current) centering.current.position.x = -W * 0.5 * (1 - o);

    pageRefs.current.forEach((page, i) => {
      if (!page) return;
      // pages fan open on a stagger so the spread riffles instead of snapping
      const stagger = THREE.MathUtils.clamp((o - i * 0.045) / 0.7, 0, 1);
      page.rotation.z = -Math.PI * stagger;
      page.position.y = 0.003 * i;
    });

    if (group.current) {
      const t = state.clock.elapsedTime;
      if (spin) group.current.rotation.y += delta * 0.18;
      // the book breathes — it never sits perfectly still
      group.current.position.y = position[1] + Math.sin(t * 0.6) * 0.045 * (1 - o);
      group.current.rotation.x = THREE.MathUtils.damp(
        group.current.rotation.x,
        hovered && o < 0.1 ? -0.12 : 0,
        4,
        delta
      );
    }
  });

  const goldMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: palette.gold, metalness: 1, roughness: 0.22 }),
    [palette.gold]
  );

  const Cover = ({ side }: { side: 1 | -1 }) => (
    <group position={[side * W * 0.5, 0, 0]}>
      <RoundedBox args={[W, T, D]} radius={0.02} smoothness={3} castShadow receiveShadow>
        <meshStandardMaterial
          map={leather.map}
          roughnessMap={leather.rough}
          color={palette.leather}
          roughness={0.72}
          metalness={0.08}
        />
      </RoundedBox>
      {/* gold rule inlaid a few millimetres inside the cover edge */}
      <mesh position={[0, T / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.001, 0.002, 4]} />
        <primitive object={goldMaterial} attach="material" />
      </mesh>
      {[[0, D * 0.44], [0, -D * 0.44]].map(([x, z], i) => (
        <mesh key={`h${i}`} position={[x, T / 2 + 0.002, z]} material={goldMaterial}>
          <boxGeometry args={[W * 0.86, 0.004, 0.012]} />
        </mesh>
      ))}
      {[[W * 0.42, 0], [-W * 0.42, 0]].map(([x, z], i) => (
        <mesh key={`v${i}`} position={[x, T / 2 + 0.002, z]} material={goldMaterial}>
          <boxGeometry args={[0.012, 0.004, D * 0.88]} />
        </mesh>
      ))}
    </group>
  );

  return (
    <group
      ref={group}
      position={position}
      scale={scale}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      <group ref={centering}>
      {/* back cover — always face up */}
      <Cover side={1} />

      {/* the block of leaves, hinged on the spine */}
      {Array.from({ length: PAGE_COUNT }).map((_, i) => (
        <group key={i} ref={(el) => { pageRefs.current[i] = el; }}>
          <mesh position={[W * 0.5, T / 2 + 0.004 + i * 0.0022, 0]} castShadow receiveShadow>
            <boxGeometry args={[W * 0.93, 0.0018, D * 0.92]} />
            <meshStandardMaterial map={ruled} color={palette.paper} roughness={0.95} />
          </mesh>
        </group>
      ))}

      {/* front cover, hinged on the spine */}
      <group ref={frontCover}>
        <group position={[0, T + 0.03, 0]}>
          <Cover side={1} />
        </group>
      </group>

      {/* spine */}
      <mesh position={[0, T * 0.5 + 0.015, 0]}>
        <cylinderGeometry args={[T * 0.9, T * 0.9, D, 16, 1, false, 0, Math.PI]} />
        <meshStandardMaterial map={leather.map} color={palette.leather} roughness={0.7} />
      </mesh>

      {/* ink appears on the right-hand leaf once the book is open */}
      <group position={[W * 0.5, T + 0.02, 0]} visible={open > 0.55}>
        <InkOverlay progress={inkProgress} burn={burn} color={palette.ink} size={[W * 0.8, D * 0.8]} />
      </group>

      </group>

      {/* hover halo while shut */}
      <pointLight
        position={[0, 0.7, 0]}
        color={palette.gold}
        intensity={hovered ? 3.2 : 0.9}
        distance={4}
        decay={2}
      />
    </group>
  );
}
