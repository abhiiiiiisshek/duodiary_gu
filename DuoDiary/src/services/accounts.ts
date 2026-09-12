/**
 * Accounts, sign-in and pairing.
 *
 * There is no server in this build, so an account lives in this browser and its
 * passphrase is never stored — only a PBKDF2 salt and an encrypted verifier blob.
 * The key derived at sign-in is the SAME key that opens that member's private
 * reflections, which is why signing in genuinely unlocks the journal rather than
 * pretending to. Swap this module for API calls and nothing above it changes.
 */

import { EncryptedBlob, UserProfile } from '../types/diary';
import { checkVerifier, deriveKey, makeVerifier, randomSaltB64 } from './crypto';
import { todayISO } from '../lib/time';

const ACCOUNTS_KEY = 'duodiary_accounts_v4';

export interface Account {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinedDate: string;
  keySalt: string;
  verifier: EncryptedBlob;
}

export interface Session {
  account: Account;
  key: CryptoKey;
}

export function loadAccounts(): Account[] {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? '[]') as Account[];
  } catch {
    return [];
  }
}

export function saveAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

const normalise = (email: string) => email.trim().toLowerCase();

/** Deterministic monogram avatar — no upload, no external image host, no tracking. */
export function avatarFor(name: string, id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hue = Math.abs(hash) % 360;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="hsl(${hue} 55% 42%)"/><stop offset="1" stop-color="hsl(${(hue + 48) % 360} 48% 22%)"/>
</linearGradient></defs>
<rect width="96" height="96" fill="url(#g)"/>
<text x="48" y="60" font-family="Georgia,serif" font-size="38" fill="rgba(255,255,255,.92)" text-anchor="middle">${initials}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface AuthResult {
  session?: Session;
  error?: string;
}

export async function register(name: string, email: string, passphrase: string): Promise<AuthResult> {
  const trimmedName = name.trim();
  if (trimmedName.length < 2) return { error: 'Tell the diary what to call you.' };
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return { error: 'That email address does not look right.' };
  if (passphrase.length < 8) return { error: 'Use at least 8 characters — this key also encrypts your private pages.' };

  const accounts = loadAccounts();
  if (accounts.some((a) => normalise(a.email) === normalise(email))) {
    return { error: 'An account already exists for that email on this device.' };
  }

  const id = `user_${crypto.randomUUID().slice(0, 8)}`;
  const keySalt = randomSaltB64();
  const key = await deriveKey(passphrase, keySalt);
  const account: Account = {
    id,
    name: trimmedName,
    email: email.trim(),
    avatar: avatarFor(trimmedName, id),
    joinedDate: todayISO(),
    keySalt,
    verifier: await makeVerifier(key),
  };

  saveAccounts([...accounts, account]);
  return { session: { account, key } };
}

export async function signIn(email: string, passphrase: string): Promise<AuthResult> {
  const account = loadAccounts().find((a) => normalise(a.email) === normalise(email));
  // Same message either way: do not leak which emails have accounts.
  const rejection = { error: 'That email and passphrase do not open anything here.' };
  if (!account) return rejection;

  const key = await deriveKey(passphrase, account.keySalt);
  if (!(await checkVerifier(key, account.verifier))) return rejection;

  return { session: { account, key } };
}

export function toProfile(account: Account, role: UserProfile['role']): UserProfile {
  return {
    id: account.id,
    name: account.name,
    email: account.email,
    avatar: account.avatar,
    role,
    joinedDate: account.joinedDate,
    keySalt: account.keySalt,
    verifier: account.verifier,
  };
}

/** Human-readable, unambiguous (no O/0/I/1), and short enough to read aloud. */
export function makeInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((n) => alphabet[n % alphabet.length])
      .join('');
  return `DUO-${block()}-${block()}`;
}
