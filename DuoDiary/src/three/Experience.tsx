import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';
import {
  Bloom, ChromaticAberration, DepthOfField, EffectComposer, Noise, Vignette,
} from '@react-three/postprocessing';
import * as THREE from 'three';
import { useDiary } from '../context/DiaryContext';
import { paletteFor } from './palette';
import { SceneId } from '../types/diary';
import { Candle, DustField, FloatingPages, Moon } from './objects/Atmosphere';
import { Diary } from './objects/Diary';
import { Room } from './objects/Room';
import { Bookshelf } from './objects/Bookshelf';
import { Constellation } from './objects/Constellation';
import { MemoryTree } from './objects/MemoryTree';
import { Vault } from './objects/Vault';

/**
 * One world, one canvas. Every "page" of this app is a place inside the same
 * room and the camera flies between them — nothing unmounts, nothing cuts,
 * which is the only way the navigation reads as continuous rather than as tabs.
 */

/**
 * Where the camera stands in each place. The offsets are deliberate: every view
 * frames its subject on the side of the screen the DOM panel does NOT occupy,
 * so the words and the world never fight for the same pixels.
 */
const VIEWS: Record<SceneId, { pos: [number, number, number]; look: [number, number, number] }> = {
  intro:    { pos: [0, 1.75, 5.6],     look: [0, 1.45, 0] },
  auth:     { pos: [1.15, 2.1, 5.0],   look: [-0.55, 1.45, 0] },
  room:     { pos: [0, 2.5, 6.6],      look: [0, 0.45, 0] },
  chapter:  { pos: [0, 2.35, 2.55],    look: [0, 0.1, 0] },
  timeline: { pos: [-13.4, 1.5, 5.6],  look: [-11, 0.7, 0] },   // panel left
  threads:  { pos: [13.6, 2.4, 8.8],   look: [11, 2.0, 0] },    // panel right
  tree:     { pos: [-2.6, 3.4, 9.6],   look: [0, 2.6, 17] },    // panel left
  vault:    { pos: [2.4, -7.1, 5.6],   look: [0, -8, 0] },      // panel right
};

const LANDMARKS = {
  shelf: [-11, 0, 0] as [number, number, number],
  stars: [11, 2, 0] as [number, number, number],
  tree: [0, 0.2, 17] as [number, number, number],
  vault: [0, -8, 0] as [number, number, number],
};

function CameraRig({ scene, reducedMotion }: { scene: SceneId; reducedMotion: boolean }) {
  const { camera } = useThree();
  const base = useRef(new THREE.Vector3(...VIEWS.intro.pos));
  const target = useRef(new THREE.Vector3(...VIEWS.intro.look));
  const pointer = useRef({ x: 0, y: 0 });

  // Scratch vectors, allocated once: this runs sixty times a second.
  const wantPos = useRef(new THREE.Vector3());
  const wantLook = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.current.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((state, delta) => {
    // The flight is a frame-rate independent damp read straight off the current
    // scene, not a tween fired on a change: no tween can be missed, interrupted
    // or left behind when scenes are switched faster than the flight takes.
    const view = VIEWS[scene];
    wantPos.current.set(...view.pos);
    wantLook.current.set(...view.look);

    const ease = reducedMotion ? 1 : 1 - Math.pow(0.06, delta); // ~1.5s to settle
    base.current.lerp(wantPos.current, ease);
    target.current.lerp(wantLook.current, ease);

    const sway = reducedMotion ? 0 : 1;
    // parallax is deliberately tiny: enough to feel handheld, not enough to nauseate
    desired.current.set(
      base.current.x + pointer.current.x * 0.42 * sway,
      base.current.y - pointer.current.y * 0.26 * sway + Math.sin(state.clock.elapsedTime * 0.4) * 0.035 * sway,
      base.current.z
    );

    camera.position.lerp(desired.current, reducedMotion ? 1 : 1 - Math.pow(0.0015, delta));
    camera.lookAt(target.current);
  });

  return null;
}

function World() {
  const {
    scene, settings, activeTheme, chapters, threads, userReflections, isReflectionOpen,
    setScene, setActiveChapterId, hasDiary,
  } = useDiary();
  const palette = paletteFor(activeTheme);
  const reducedMotion = settings?.reducedMotion ?? false;
  // The room only exists once there is a diary to sit in it.
  const isSignedIn = hasDiary;
  const [hoveredThread, setHoveredThread] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedCapsule, setSelectedCapsule] = useState<string | null>(null);

  // shut on the desk, open only where you are actually reading or writing
  const bookOpen = scene === 'auth' ? 0.85 : scene === 'chapter' ? 1 : 0;
  const bookY = isSignedIn ? 0.06 : 1.5;

  const volumes = useMemo(() => {
    const byYear = new Map<string, number>();
    chapters.forEach((c) => byYear.set(c.date.slice(0, 4), (byYear.get(c.date.slice(0, 4)) ?? 0) + 1));
    return [...byYear.entries()].sort().map(([year, chapterCount]) => ({ year, chapterCount }));
  }, [chapters]);

  const bookRef = useRef<THREE.Group>(null);
  // Before sign-in the book stands up and presents itself; once you are inside it
  // lies down on the desk where a real diary would be.
  const bookTilt = isSignedIn ? 0 : -1.15;
  const bookScale = isSignedIn ? 1 : 1.05;
  useFrame((_, delta) => {
    const group = bookRef.current;
    if (!group) return;
    group.position.y = THREE.MathUtils.damp(group.position.y, bookY, 1.6, delta);
    group.rotation.x = THREE.MathUtils.damp(group.rotation.x, bookTilt, 2, delta);
    const s = THREE.MathUtils.damp(group.scale.x, bookScale, 2, delta);
    group.scale.setScalar(s);
  });

  return (
    <>
      <color attach="background" args={[palette.fog]} />
      <fogExp2 attach="fog" args={[palette.fog, reducedMotion ? 0.03 : palette.fogDensity]} />

      <ambientLight color={palette.ambient} intensity={isSignedIn ? 0.5 : 0.85} />
      <hemisphereLight color={palette.rim} groundColor={palette.fog} intensity={0.35} />
      <Moon palette={palette} position={[-15, 13, -34]} />

      <DustField palette={palette} count={reducedMotion ? 400 : 1600} />
      {!isSignedIn && <FloatingPages palette={palette} count={reducedMotion ? 8 : 26} />}

      {/* the desk and its props do not exist until you are inside */}
      {isSignedIn && <Room palette={palette} />}

      {/* key and rim on the book: without them the leather reads as a black cut-out */}
      <pointLight
        position={[2.1, bookY + 1.5, 2.6]}
        color={palette.key}
        intensity={isSignedIn ? 11 : 44}
        distance={14}
        decay={2}
        castShadow
      />
      {/* rim light sits well clear of the desk props — parked on top of them it
          washed the candles cold and blue */}
      <pointLight
        position={[-4.6, bookY + 2.4, 3.2]}
        color={palette.rim}
        intensity={isSignedIn ? 14 : 22}
        distance={16}
        decay={2}
      />

      <group ref={bookRef} position={[0, bookY, 0]}>
        <Diary
          palette={palette}
          open={bookOpen}
          inkProgress={scene === 'auth' || scene === 'chapter' ? 1 : 0}
          spin={scene === 'intro'}
          onClick={() => setScene(isSignedIn ? 'chapter' : 'auth')}
        />
      </group>

      <Bookshelf
        palette={palette}
        volumes={volumes}
        selected={selectedYear}
        onSelect={setSelectedYear}
        position={LANDMARKS.shelf}
      />

      <Constellation
        palette={palette}
        threads={threads}
        hoveredId={hoveredThread}
        onHover={setHoveredThread}
        onSelect={setHoveredThread}
        position={LANDMARKS.stars}
      />

      <MemoryTree
        palette={palette}
        chapters={chapters}
        position={LANDMARKS.tree}
        onSelectChapter={(id) => { setActiveChapterId(id); setScene('chapter'); }}
      />

      <Vault
        palette={palette}
        reflections={userReflections}
        isOpen={isReflectionOpen}
        selectedId={selectedCapsule}
        onSelect={setSelectedCapsule}
        position={LANDMARKS.vault}
      />

      {/* a lantern travelling with the camera so the world is never pitch black */}
      <Candle position={[0, -8.9, 1.6]} height={0.6} />
    </>
  );
}

function Effects() {
  const { settings, activeTheme, scene } = useDiary();
  const palette = paletteFor(activeTheme);
  const reducedMotion = settings?.reducedMotion ?? false;
  // Focus on whatever the camera is actually pointed at, in world units — the
  // normalized focusDistance is meaningless once near/far are tuned per project.
  const view = VIEWS[scene];
  const focus = Math.hypot(
    view.pos[0] - view.look[0],
    view.pos[1] - view.look[1],
    view.pos[2] - view.look[2]
  );

  if (reducedMotion) {
    return (
      <EffectComposer>
        <Vignette eskil={false} offset={0.25} darkness={0.72} />
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={0}>
      <DepthOfField focusDistance={0.012} focalLength={0.05} bokehScale={3.2} height={480} />
      <Bloom intensity={palette.bloom} luminanceThreshold={0.35} luminanceSmoothing={0.5} mipmapBlur />
      <Vignette eskil={false} offset={0.2} darkness={0.85} />
    </EffectComposer>
  );
}

export function Experience() {
  const { scene, settings } = useDiary();
  const reducedMotion = settings?.reducedMotion ?? false;

  return (
    <Canvas
      className="fixed inset-0"
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ position: VIEWS.intro.pos, fov: 42, near: 0.1, far: 120 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.32;
      }}
    >
      <Suspense fallback={null}>
        <World />
        <Effects />
        <Preload all />
      </Suspense>
      <CameraRig scene={scene} reducedMotion={reducedMotion} />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
