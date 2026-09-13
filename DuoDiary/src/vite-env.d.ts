/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/*
 * The contrast test reads index.css off disk: Vite's `?raw` returns an empty
 * string for a stylesheet under vitest, because the CSS plugin claims the file
 * first. One function signature is a smaller thing to own than @types/node,
 * which nothing else in this project needs.
 */
declare module 'node:fs' {
  export function readFileSync(path: string | URL, encoding: 'utf8'): string;
}
