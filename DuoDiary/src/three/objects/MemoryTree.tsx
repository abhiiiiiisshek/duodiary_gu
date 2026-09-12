import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Chapter } from '../../types/diary';
import { Palette } from '../palette';

/** What a day turns into on the tree. */
type LeafKind = 'leaf' | 'flower' | 'golden' | 'scar';

function classify(chapter: Chapter): LeafKind {
  const moods = Object.values(chapter.sharedEntries).map((e) => e.mood);
  const text = Object.values(chapter.sharedEntries).map((e) => e.text).join(' ').toLowerCase();
  if (chapter.milestoneTag) return 'golden';
  if (/\b(trip|travel|train|beach|mountain|flight|getaway|vacation)\b/.test(text)) return 'flower';
  if (moods.some((m) => ['anxious', 'tired', 'angry', 'hurt'].includes(m)) || /\b(argued|fought|argument)\b/.test(text)) {
    return 'scar';
  }
  return 'leaf';
}

interface Segment {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  depth: number;
}

/** Deterministic pseudo-random so the tree is the same tree every time it is opened. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function growSegments(total: number): Segment[] {
  const rand = rng(20260910);
  const segments: Segment[] = [];
  const depthLimit = Math.min(6, 3 + Math.floor(Math.log2(Math.max(2, total))));

  const branch = (start: THREE.Vector3, dir: THREE.Vector3, length: number, radius: number, depth: number) => {
    const end = start.clone().addScaledVector(dir, length);
    segments.push({ start, end, radius, depth });
    if (depth >= depthLimit) return;
    const children = depth < 2 ? 3 : 2;
    for (let i = 0; i < children; i++) {
      const next = dir
        .clone()
        .applyAxisAngle(new THREE.Vector3(1, 0, 0), (rand() - 0.5) * 0.95)
        .applyAxisAngle(new THREE.Vector3(0, 0, 1), (rand() - 0.5) * 0.95)
        .normalize()
        .lerp(new THREE.Vector3(0, 1, 0), 0.18)
        .normalize();
      branch(end, next, length * (0.62 + rand() * 0.16), radius * 0.62, depth + 1);
    }
  };

  branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 1, 0), 1.5, 0.16, 0);
  return segments;
}

/**
 * The relationship timeline as a tree instead of a year list. Days become leaves,
 * trips bloom, milestones gild, hard days leave a broken stub. More writing, more tree.
 */
export function MemoryTree({
  palette, chapters, position = [0, 0, 0], onSelectChapter,
}: {
  palette: Palette;
  chapters: Chapter[];
  position?: [number, number, number];
  onSelectChapter?: (chapterId: string) => void;
}) {
  const segments = useMemo(() => growSegments(chapters.length), [chapters.length]);
  const tips = useMemo(() => segments.filter((s) => s.depth >= 3), [segments]);

  const leaves = useMemo(() => {
    const rand = rng(77);
    return chapters.map((chapter, i) => {
      const tip = tips[i % Math.max(1, tips.length)];
      const jitter = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.35);
      return {
        chapter,
        kind: classify(chapter),
        position: (tip ? tip.end.clone() : new THREE.Vector3(0, 2, 0)).add(jitter),
        phase: rand() * Math.PI * 2,
      };
    });
  }, [chapters, tips]);

  const trunk = useMemo(() => {
    const geometries = segments.map((s) => {
      const dir = s.end.clone().sub(s.start);
      const length = dir.length();
      const geo = new THREE.CylinderGeometry(s.radius * 0.7, s.radius, length, 7, 1);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      const matrix = new THREE.Matrix4()
        .makeRotationFromQuaternion(quat)
        .setPosition(s.start.clone().addScaledVector(dir, 0.5));
      geo.applyMatrix4(matrix);
      return geo;
    });
    // one merged buffer instead of ~200 draw calls
    const merged = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    geometries.forEach((g) => {
      positions.push(...Array.from(g.attributes.position.array as Float32Array));
      normals.push(...Array.from(g.attributes.normal.array as Float32Array));
      g.dispose();
    });
    merged.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    return merged;
  }, [segments]);

  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (group.current) group.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.14;
  });

  return (
    <group ref={group} position={position}>
      <mesh geometry={trunk} castShadow receiveShadow>
        <meshStandardMaterial color="#3b2b1e" roughness={0.95} />
      </mesh>

      {leaves.map((leaf, i) => (
        <Leaf
          key={leaf.chapter.id + i}
          {...leaf}
          palette={palette}
          onClick={() => onSelectChapter?.(leaf.chapter.id)}
        />
      ))}

      {/* roots pool of light */}
      <pointLight position={[0, 0.4, 1.6]} color={palette.key} intensity={9} distance={9} decay={2} />
    </group>
  );
}

function Leaf({
  kind, position, phase, palette, onClick,
}: {
  kind: LeafKind;
  position: THREE.Vector3;
  phase: number;
  palette: Palette;
  onClick: () => void;
}) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.z = Math.sin(t * 1.1 + phase) * 0.35;
    ref.current.rotation.x = Math.cos(t * 0.9 + phase) * 0.25;
  });

  const style = {
    leaf: { color: '#6f9a63', emissive: '#1d2f1c', scale: 1 },
    flower: { color: palette.accent, emissive: palette.accent, scale: 1.25 },
    golden: { color: palette.gold, emissive: palette.gold, scale: 1.4 },
    scar: { color: '#5b4438', emissive: '#000000', scale: 0.9 },
  }[kind];

  return (
    <mesh
      ref={ref}
      position={position}
      scale={style.scale}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {kind === 'flower' ? (
        <sphereGeometry args={[0.075, 10, 10]} />
      ) : kind === 'scar' ? (
        <coneGeometry args={[0.03, 0.16, 5]} />
      ) : (
        <sphereGeometry args={[0.06, 8, 6]} />
      )}
      <meshStandardMaterial
        color={style.color}
        emissive={style.emissive}
        emissiveIntensity={kind === 'golden' ? 1.4 : kind === 'flower' ? 0.8 : 0.15}
        roughness={0.65}
        flatShading
      />
    </mesh>
  );
}
