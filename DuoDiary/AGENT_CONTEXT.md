# DuoDiary — Agent Context & Memory

This file is maintained by AI agents to keep track of the project's current architectural state, recent decisions, and ongoing progress.

## Current Architectural State
- **Major Refactor**: The project recently underwent a significant restructuring. The traditional React component structure (`src/components/`) was deleted.
- **New UI Paradigm**: The application is now built around a split architecture:
  - `src/three/`: Contains the 3D `<Experience />` component (likely using Three.js / React Three Fiber) for the primary visual interface and cinematic atmosphere.
  - `src/ui/`: Contains the `<Overlay />` for traditional DOM-based UI layered over the 3D canvas.
- **State Management**: Using `DiaryProvider` within `src/context/DiaryContext.tsx`.

## Recent Progress (as of Sept 2026)
- **Component Cleanup**: Removed old landing views, timeline storybooks, vaults, and ambient canvas components.
- **Entry Point**: `App.tsx` now purely mounts the `DiaryProvider`, the `Shell` (which handles theme classes), the `Experience` (3D), and the `Overlay` (UI).
- **New Services**: Added `src/services/memoryGraph.ts` and `src/services/writingCompanion.ts` to manage the intelligent companion logic and memory linking.

## Agent Guidelines
- When adding new UI elements, consider whether they belong in the 3D `<Experience />` (`src/three/`) or as a 2D DOM element in `<Overlay />` (`src/ui/`).
- Refer to `README.md` for overarching product goals (Two Truths, the companion, etc.).
- **There is no client-side encryption.** It was removed in migration `0004`: private pages
  are plain text, and an account in `public.admins` can read every diary on the instance via
  `#admin`. `PRIVACY.md` is the statement users are shown; keep it true if you change this.
- Update this file whenever making significant architectural changes or creating new core services.
