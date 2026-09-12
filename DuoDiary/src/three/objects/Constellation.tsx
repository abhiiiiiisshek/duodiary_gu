import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LifeThread } from '../../types/diary';
import { Palette } from '../palette';

const STAR_VERT = /* glsl */ `
  uniform float uTime;
  attribute float aSize;
  attribute float aPhase;
  attribute float aHot;
  varying float vHot;
  varying float vTwinkle;
  void main() {
    vHot = aHot;
    vTwinkle = 0.6 + 0.4 * sin(uTime * 2.0 + aPhase * 7.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (1.0 + aHot * 0.9) * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const STAR_FRAG = /* glsl */ `
  uniform vec3 uCool;
  uniform vec3 uHot;
  varying float vHot;
  varying float vTwinkle;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = length(d);
    float core = smoothstep(0.5, 0.0, r);
    // four-point diffraction spike, the thing that reads as "star" and not "dot"
    float spike = max(0.0, 1.0 - abs(d.x) * 26.0) + max(0.0, 1.0 - abs(d.y) * 26.0);
    spike *= smoothstep(0.5, 0.05, r) * 0.5;
    float alpha = (pow(core, 2.2) + spike) * vTwinkle;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(mix(uCool, uHot, vHot), alpha);
  }
`;

interface Node {
  thread: LifeThread;
  position: THREE.Vector3;
}

/** Deterministic placement — the same thread must land on the same star every visit. */
function hashPosition(id: string, index: number, total: number): THREE.Vector3 {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  const rand = (n: number) => (Math.abs(Math.sin(h * 0.0001 + n * 12.9898)) * 43758.5453) % 1;
  const golden = (index / Math.max(1, total)) * Math.PI * 2;
  const radius = 2.0 + rand(1) * 3.4;
  return new THREE.Vector3(
    Math.cos(golden) * radius + (rand(2) - 0.5) * 1.4,
    (rand(3) - 0.5) * 3.6,
    Math.sin(golden) * radius + (rand(4) - 0.5) * 1.4
  );
}

/**
 * Life threads as a galaxy: every thread is a star, every shared day is a line.
 * Hovering a star lights the whole family of memories that touch it.
 */
export function Constellation({
  palette, threads, hoveredId, onHover, onSelect, position = [0, 0, 0],
}: {
  palette: Palette;
  threads: LifeThread[];
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  position?: [number, number, number];
}) {
  const nodes: Node[] = useMemo(
    () => threads.map((thread, i) => ({ thread, position: hashPosition(thread.id, i, threads.length) })),
    [threads]
  );

  // Two threads are linked when they were written about on the same day.
  const links = useMemo(() => {
    const out: { a: Node; b: Node; shared: number }[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const datesA = new Set(nodes[i].thread.keyMoments.map((k) => k.date));
        const shared = nodes[j].thread.keyMoments.filter((k) => datesA.has(k.date)).length;
        const sameOwner = nodes[i].thread.associatedUserId === nodes[j].thread.associatedUserId;
        if (shared > 0 || (sameOwner && nodes[i].thread.category === nodes[j].thread.category)) {
          out.push({ a: nodes[i], b: nodes[j], shared: shared || 1 });
        }
      }
    }
    return out;
  }, [nodes]);

  const material = useRef<THREE.ShaderMaterial>(null);
  const group = useRef<THREE.Group>(null);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(nodes.length * 3);
    const size = new Float32Array(nodes.length);
    const phase = new Float32Array(nodes.length);
    const hot = new Float32Array(nodes.length);
    nodes.forEach((n, i) => {
      pos.set([n.position.x, n.position.y, n.position.z], i * 3);
      size[i] = 0.05 + Math.min(n.thread.mentionCount, 12) * 0.012;
      phase[i] = i * 1.7;
      hot[i] = n.thread.status === 'active' ? 1 : 0;
    });
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aHot', new THREE.BufferAttribute(hot, 1));
    return g;
  }, [nodes]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uCool: { value: new THREE.Color(palette.dust) },
      uHot: { value: new THREE.Color(palette.gold) },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFrame((state, delta) => {
    if (material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime;
    if (group.current) group.current.rotation.y += delta * 0.035;
  });

  const related = useMemo(() => {
    if (!hoveredId) return new Set<string>();
    const set = new Set<string>([hoveredId]);
    links.forEach((l) => {
      if (l.a.thread.id === hoveredId) set.add(l.b.thread.id);
      if (l.b.thread.id === hoveredId) set.add(l.a.thread.id);
    });
    return set;
  }, [hoveredId, links]);

  return (
    <group ref={group} position={position}>
      <points geometry={geometry}>
        <shaderMaterial
          ref={material}
          uniforms={uniforms}
          vertexShader={STAR_VERT}
          fragmentShader={STAR_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {links.map((link, i) => {
        const lit = hoveredId !== null && related.has(link.a.thread.id) && related.has(link.b.thread.id);
        return (
          <Link
            key={i}
            from={link.a.position}
            to={link.b.position}
            color={lit ? palette.gold : palette.accent}
            opacity={hoveredId === null ? 0.16 : lit ? 0.75 : 0.04}
            width={link.shared}
          />
        );
      })}

      {/* invisible hit spheres — points are not reliably pickable at these sizes */}
      {nodes.map((node) => (
        <mesh
          key={node.thread.id}
          position={node.position}
          onPointerOver={(e) => { e.stopPropagation(); onHover(node.thread.id); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { onHover(null); document.body.style.cursor = 'auto'; }}
          onClick={(e) => { e.stopPropagation(); onSelect(node.thread.id); }}
        >
          <sphereGeometry args={[0.28, 12, 12]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Link({
  from, to, color, opacity, width,
}: { from: THREE.Vector3; to: THREE.Vector3; color: string; opacity: number; width: number }) {
  const geometry = useMemo(() => {
    const mid = from.clone().lerp(to, 0.5).multiplyScalar(1.12);
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    return new THREE.TubeGeometry(curve, 18, 0.006 + width * 0.002, 5, false);
  }, [from, to, width]);

  const material = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((_, delta) => {
    if (material.current) material.current.opacity = THREE.MathUtils.damp(material.current.opacity, opacity, 5, delta);
  });

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial
        ref={material}
        color={color}
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
