import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Palette } from '../palette';
import { woodTexture } from '../textures';

export interface YearVolume {
  year: string;
  chapterCount: number;
}

/**
 * The timeline is a shelf, not a list. Each year is a bound volume whose spine
 * height grows with how much was written that year; selecting one pulls it out
 * and turns it to face the reader.
 */
export function Bookshelf({
  palette, volumes, selected, onSelect, position = [0, 0, 0],
}: {
  palette: Palette;
  volumes: YearVolume[];
  selected: string | null;
  onSelect: (year: string) => void;
  position?: [number, number, number];
}) {
  const wood = woodTexture();
  const shelfWidth = Math.max(4.2, volumes.length * 0.45 + 1.2);

  return (
    <group position={position}>
      {/* carcass */}
      <mesh position={[0, 0, -0.34]} receiveShadow>
        <boxGeometry args={[shelfWidth, 3.1, 0.08]} />
        <meshStandardMaterial map={wood} color="#4a3626" roughness={0.85} />
      </mesh>
      {[-1.05, 0.35, 1.75].map((y, i) => (
        <mesh key={i} position={[0, y, 0]} receiveShadow castShadow>
          <boxGeometry args={[shelfWidth, 0.08, 0.72]} />
          <meshStandardMaterial map={wood} color="#5c4530" roughness={0.8} />
        </mesh>
      ))}
      {[-shelfWidth / 2, shelfWidth / 2].map((x, i) => (
        <mesh key={i} position={[x, 0.35, 0]} receiveShadow>
          <boxGeometry args={[0.09, 3.1, 0.72]} />
          <meshStandardMaterial map={wood} color="#4a3626" roughness={0.85} />
        </mesh>
      ))}

      {volumes.map((volume, i) => (
        <Volume
          key={volume.year}
          palette={palette}
          volume={volume}
          index={i}
          shelfWidth={shelfWidth}
          isSelected={selected === volume.year}
          onSelect={() => onSelect(volume.year)}
        />
      ))}

      <pointLight position={[0, 1.9, 1.6]} color={palette.key} intensity={12} distance={9} decay={2} />
    </group>
  );
}

function Volume({
  palette, volume, index, shelfWidth, isSelected, onSelect,
}: {
  palette: Palette;
  volume: YearVolume;
  index: number;
  shelfWidth: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const spec = useMemo(() => {
    const thickness = 0.16 + Math.min(volume.chapterCount, 60) * 0.004;
    const height = 0.78 + Math.min(volume.chapterCount, 60) * 0.005;
    const hue = new THREE.Color(palette.leather).offsetHSL((index % 5) * 0.035, 0.04, (index % 3) * 0.03);
    return { thickness, height, color: hue };
  }, [volume.chapterCount, palette.leather, index]);

  // fill the top shelf first, then wrap down
  const perShelf = Math.max(1, Math.floor((shelfWidth - 0.4) / 0.42));
  const row = Math.floor(index / perShelf);
  const col = index % perShelf;
  const baseX = -shelfWidth / 2 + 0.42 + col * 0.42;
  const baseY = [1.24, -0.16][Math.min(row, 1)] + spec.height / 2;

  useFrame((_, delta) => {
    if (!group.current) return;
    const pulled = isSelected ? 0.75 : hovered ? 0.16 : 0;
    group.current.position.z = THREE.MathUtils.damp(group.current.position.z, pulled, 4, delta);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, isSelected ? -Math.PI / 2 : 0, 4, delta);
    group.current.rotation.z = THREE.MathUtils.damp(group.current.rotation.z, isSelected ? 0 : hovered ? -0.06 : 0, 5, delta);
  });

  return (
    <group
      ref={group}
      position={[baseX, baseY, 0]}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[spec.thickness, spec.height, 0.56]} />
        <meshStandardMaterial color={spec.color} roughness={0.78} metalness={0.06} />
      </mesh>
      {/* gilt bands on the spine */}
      {[0.24, -0.24].map((y, i) => (
        <mesh key={i} position={[0, y * spec.height, 0.283]}>
          <boxGeometry args={[spec.thickness * 0.86, 0.018, 0.006]} />
          <meshStandardMaterial color={palette.gold} metalness={1} roughness={0.2} />
        </mesh>
      ))}
      {/* page block peeking past the boards */}
      <mesh position={[0, 0, -0.02]}>
        <boxGeometry args={[spec.thickness * 0.8, spec.height * 0.94, 0.54]} />
        <meshStandardMaterial color={palette.paper} roughness={0.95} />
      </mesh>
    </group>
  );
}
