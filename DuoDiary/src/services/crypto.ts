/**
 * Client-side encryption for DuoDiary private reflections.
 *
 * Threat model the product actually promises: the partner (and the diary owner)
 * share the device/store, so the ciphertext must be useless without the author's
 * own passphrase. That means:
 *   - plaintext is NEVER persisted (no "preview" field written to storage)
 *   - the key lives only in memory, only while its owner is unlocked
 *   - the passphrase is never stored; only a verifier blob is
 *
 * AES-GCM 256 + PBKDF2-SHA256. One key derivation per session, not per entry.
 */

const PBKDF2_ITERATIONS = 210_000; // OWASP 2023 floor for PBKDF2-SHA256
const VERIFIER_TOKEN = 'duodiary.verifier.v1';

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

function toB64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromB64(b64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(b64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomSaltB64(): string {
  return toB64(crypto.getRandomValues(new Uint8Array(16)).buffer);
}

/** Derive the per-user AES key. Keep the returned CryptoKey in memory only. */
export async function deriveKey(passphrase: string, saltB64: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(saltB64), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptWithKey(key: CryptoKey, plainText: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  );
  return { ciphertext: toB64(buf), iv: toB64(iv.buffer) };
}

/** Returns null on the wrong key — GCM auth failure is the whole point, don't throw noisily. */
export async function decryptWithKey(key: CryptoKey, payload: EncryptedPayload): Promise<string | null> {
  try {
    const buf = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(payload.iv) },
      key,
      fromB64(payload.ciphertext)
    );
    return new TextDecoder().decode(buf);
  } catch {
    return null;
  }
}

/** Verifier lets us reject a wrong passphrase without touching any real entry. */
export async function makeVerifier(key: CryptoKey): Promise<EncryptedPayload> {
  return encryptWithKey(key, VERIFIER_TOKEN);
}

export async function checkVerifier(key: CryptoKey, verifier: EncryptedPayload): Promise<boolean> {
  return (await decryptWithKey(key, verifier)) === VERIFIER_TOKEN;
}
