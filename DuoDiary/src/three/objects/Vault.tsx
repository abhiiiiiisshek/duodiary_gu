import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PrivateReflection } from '../../types/diary';
import { Palette } from '../palette';
import { paperTexture } from '../textures';

/**
 * Time capsules float in the vault as folded letters under a wax seal.
 * A sealed one stays folded and dark; an open one has broken its seal and
 * lifts slightly, so the state is read from the object, not from an icon.
 */
export function Vault({
  palette, reflections, isOpen, selectedId, onSelect, position = [0, 0, 0],
}: {
  palette: Palette;
  reflections: PrivateReflection[];
  isOpen: (r: PrivateReflection) => boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  position?: [number, number, number];
}) {
  const layout = useMemo(
    () =>
      reflections.map((reflection, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        return {
          reflection,
          position: new THREE.Vector3((col - 1) * 1.5, 1.1 - row * 1.35, (row % 2) * -0.4),
          phase: i * 1.3,
        };
      }),
    [reflections]
  );

  return (
    <group position={position}>
      {layout.map(({ reflection, position: p, phase }) => (
        <Capsule
          key={reflection.id}
          palette={palette}
          open={isOpen(reflection)}
          selected={selectedId === reflection.id}
          position={p}
          phase={phase}
          onSelect={() => onSelect(reflection.id)}
        />
      ))}
      <pointLight position={[0, 0, 3]} color={palette.rim} intensity={14} distance={12} decay={2} />
    </group>
  );
}

function Capsule({
  palette, open, selected, position, phase, onSelect,
}: {
  palette: Palette;
  open: boolean;
  selected: boolean;
  position: THREE.Vector3;
  phase: number;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const flap = useRef<THREE.Mesh>(null);
  const paper = paperTexture();

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = position.y + Math.sin(t * 0.7 + phase) * 0.06;
    group.current.rotation.z = Math.sin(t * 0.5 + phase) * 0.05;
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, position.z + (selected ? 1.1 : 0), 4, delta);
    if (flap.current) {
      // an opened capsule has its fold lifted; a sealed one stays shut flat
      flap.current.rotation.x = THREE.MathUtils.damp(
        flap.current.rotation.x,
        open ? -Math.PI * 0.55 : 0,
        3,
        delta
      );
    }
  });

  return (
    <group
      ref={group}
      position={position}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {/* the letter body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1.0, 0.68, 0.014]} />
        <meshStandardMaterial
          map={paper}
          color={open ? palette.paper : '#8f8677'}
          roughness={0.95}
          emissive={open ? palette.paper : '#000000'}
          emissiveIntensity={open ? 0.06 : 0}
        />
      </mesh>

      {/* the fold */}
      <mesh ref={flap} position={[0, 0.34, 0.008]}>
        <planeGeometry args={[1.0, 0.34]} />
        <meshStandardMaterial map={paper} color={open ? palette.paper : '#7d7466'} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>

      {/* wax seal — cracked open, or holding */}
      <group position={[0, open ? 0.02 : 0.16, 0.014]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.11, 0.12, 0.028, 22]} />
          <meshPhysicalMaterial
            color={open ? '#6c2230' : '#a3182b'}
            roughness={0.42}
            clearcoat={0.9}
            clearcoatRoughness={0.3}
            emissive={selected ? '#ff5a4a' : '#000000'}
            emissiveIntensity={selected ? 0.5 : 0}
          />
        </mesh>
        <mesh position={[0, 0, 0.016]} rotation={[0, 0, Math.PI / 4]}>
          <torusGeometry args={[0.05, 0.012, 8, 4]} />
          <meshStandardMaterial color={palette.gold} metalness={1} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}
