import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Palette } from '../palette';
import { woodTexture } from '../textures';
import { Candle } from './Atmosphere';

/** The writing desk the diary lives on, plus the props that make the room breathe. */
export function Room({ palette }: { palette: Palette }) {
  const wood = woodTexture();

  return (
    <group>
      {/* floor catches the candle pool and the moon rim */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.02, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <meshStandardMaterial color={palette.fog} roughness={0.95} metalness={0.05} />
      </mesh>

      {/* desk top */}
      <mesh position={[0, -0.06, 0]} receiveShadow castShadow>
        <boxGeometry args={[5.2, 0.12, 3.0]} />
        <meshStandardMaterial map={wood} color="#8a6a4a" roughness={0.66} metalness={0.06} />
      </mesh>
      {[[-2.3, 1.3], [2.3, 1.3], [-2.3, -1.3], [2.3, -1.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.56, z]} castShadow>
          <cylinderGeometry args={[0.07, 0.09, 0.9, 12]} />
          <meshStandardMaterial map={wood} color="#6d523a" roughness={0.75} />
        </mesh>
      ))}

      <Candle position={[-1.7, 0.0, 0.55]} height={0.52} />
      <Candle position={[-1.42, 0.0, 0.9]} height={0.33} />

      <Inkwell position={[1.55, 0.0, 0.6]} palette={palette} />
      <Vase position={[2.0, 0.0, -0.75]} palette={palette} />
      <BookStack position={[-1.95, 0.0, -0.85]} palette={palette} />
    </group>
  );
}

function Inkwell({ position, palette }: { position: [number, number, number]; palette: Palette }) {
  const pen = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (pen.current) pen.current.rotation.z = -0.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.03;
  });
  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.14, 0.17, 0.16, 24]} />
        <meshPhysicalMaterial
          color="#101018"
          roughness={0.08}
          metalness={0.1}
          transmission={0.55}
          thickness={0.4}
          ior={1.5}
        />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.115, 0.115, 0.02, 24]} />
        <meshStandardMaterial color={palette.ink} roughness={0.15} metalness={0.35} />
      </mesh>
      <group ref={pen} position={[0.06, 0.16, 0]}>
        <mesh position={[0, 0.16, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.02, 0.42, 10]} />
          <meshStandardMaterial color="#1a1420" roughness={0.35} metalness={0.4} />
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <coneGeometry args={[0.017, 0.09, 10]} />
          <meshStandardMaterial color={palette.gold} metalness={1} roughness={0.25} />
        </mesh>
      </group>
    </group>
  );
}

/** Stems sway on their own phase so the bunch never moves as one block. */
function Vase({ position, palette }: { position: [number, number, number]; palette: Palette }) {
  const stems = useRef<THREE.Group[]>([]);
  const seeds = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ({
      angle: (i / 7) * Math.PI * 2,
      lean: 0.12 + Math.random() * 0.2,
      phase: Math.random() * 6.28,
      height: 0.42 + Math.random() * 0.22,
    })),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    stems.current.forEach((stem, i) => {
      if (!stem) return;
      const s = seeds[i];
      stem.rotation.z = Math.sin(s.angle) * s.lean + Math.sin(t * 0.7 + s.phase) * 0.05;
      stem.rotation.x = Math.cos(s.angle) * s.lean + Math.cos(t * 0.6 + s.phase) * 0.05;
    });
  });

  return (
    <group position={position}>
      <mesh castShadow>
        <cylinderGeometry args={[0.1, 0.14, 0.34, 20]} />
        <meshPhysicalMaterial
          color="#243040"
          roughness={0.06}
          transmission={0.8}
          thickness={0.5}
          ior={1.45}
        />
      </mesh>
      {seeds.map((s, i) => (
        <group key={i} position={[0, 0.16, 0]} ref={(el) => { if (el) stems.current[i] = el; }}>
          <mesh position={[0, s.height / 2, 0]}>
            <cylinderGeometry args={[0.005, 0.008, s.height, 6]} />
            <meshStandardMaterial color="#3f5c3a" roughness={0.9} />
          </mesh>
          <mesh position={[0, s.height, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial
              color={i % 2 ? palette.accent : palette.paper}
              emissive={palette.accent}
              emissiveIntensity={0.25}
              roughness={0.7}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function BookStack({ position, palette }: { position: [number, number, number]; palette: Palette }) {
  const books = useMemo(
    () => [
      { h: 0.07, w: 0.62, d: 0.44, c: palette.leather, r: 0.02 },
      { h: 0.05, w: 0.56, d: 0.4, c: palette.accent, r: -0.05 },
      { h: 0.06, w: 0.6, d: 0.42, c: '#4a3423', r: 0.08 },
    ],
    [palette]
  );
  let y = 0.03;
  return (
    <group position={position}>
      {books.map((b, i) => {
        const el = (
          <mesh key={i} position={[0, y, 0]} rotation={[0, b.r, 0]} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color={b.c} roughness={0.8} />
          </mesh>
        );
        y += b.h + 0.004;
        return el;
      })}
    </group>
  );
}
