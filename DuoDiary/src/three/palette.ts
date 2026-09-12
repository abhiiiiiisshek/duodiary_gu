import { ThemeId } from '../types/diary';

export interface Palette {
  fog: string;
  ambient: string;
  key: string;      // main warm light (candle / lamp)
  rim: string;      // cool counter light (moon / window)
  dust: string;
  ink: string;
  gold: string;
  leather: string;
  paper: string;
  accent: string;
  bloom: number;
  fogDensity: number;
}

export const PALETTES: Record<ThemeId, Palette> = {
  moonlit: {
    fog: '#04060f', ambient: '#20304f', key: '#ffb765', rim: '#8fb4ff',
    dust: '#cfe0ff', ink: '#0a1020', gold: '#d8b45a', leather: '#2a2438',
    paper: '#e9e3d4', accent: '#8fb4ff', bloom: 0.85, fogDensity: 0.055,
  },
  parchment: {
    fog: '#0d0906', ambient: '#3a2a1c', key: '#ffbf73', rim: '#c98f4a',
    dust: '#f0d9a8', ink: '#2b1c0c', gold: '#e0b45a', leather: '#4a3423',
    paper: '#f3e6c8', accent: '#d9a441', bloom: 0.95, fogDensity: 0.05,
  },
  rainy: {
    fog: '#020610', ambient: '#1b2a3d', key: '#ffd9a0', rim: '#6f9fd8',
    dust: '#a8c4e6', ink: '#08111f', gold: '#a8b7c9', leather: '#25313f',
    paper: '#dfe6ec', accent: '#6f9fd8', bloom: 0.7, fogDensity: 0.075,
  },
  botanical: {
    fog: '#050d09', ambient: '#1f3527', key: '#ffd08a', rim: '#8fd6a8',
    dust: '#cdf0d6', ink: '#0d1a12', gold: '#c9b05a', leather: '#2c3d2e',
    paper: '#eaeddc', accent: '#8fd6a8', bloom: 0.8, fogDensity: 0.06,
  },
  aurora: {
    fog: '#06040d', ambient: '#2a2143', key: '#ffc0e8', rim: '#7ce7d8',
    dust: '#e3c8ff', ink: '#150c24', gold: '#c9a0ff', leather: '#33254d',
    paper: '#efe8f7', accent: '#7ce7d8', bloom: 1.1, fogDensity: 0.05,
  },
};

export const paletteFor = (theme: ThemeId): Palette => PALETTES[theme] ?? PALETTES.moonlit;
