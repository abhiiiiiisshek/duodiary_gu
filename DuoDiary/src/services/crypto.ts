/**
 * Client-Side Encryption Service for DuoDiary Private Reflections
 * Uses Web Crypto API (AES-GCM 256-bit + PBKDF2 key derivation)
 * 
 * Each user's private reflections are strictly encrypted client-side.
 * Even if the owner or partner accesses the raw store, the ciphertext
 * cannot be decrypted without the author's personal key/passphrase.
 */

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive AES-GCM key from user secret passphrase and salt
async function deriveKey(passphrase: string, saltBuffer: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer as unknown as BufferSource,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  salt: string;
}

/**
 * Encrypt a private reflection
 */
export async function encryptPrivateText(
  plainText: string,
  userSecretKey: string
): Promise<EncryptedPayload> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(userSecretKey, salt);

  const enc = new TextEncoder();
  const encodedText = enc.encode(plainText);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    encodedText
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
    salt: bufferToBase64(salt.buffer),
  };
}

/**
 * Decrypt a private reflection
 */
export async function decryptPrivateText(
  ciphertextBase64: string,
  ivBase64: string,
  saltBase64: string,
  userSecretKey: string
): Promise<string> {
  try {
    const salt = new Uint8Array(base64ToBuffer(saltBase64));
    const iv = new Uint8Array(base64ToBuffer(ivBase64));
    const ciphertext = base64ToBuffer(ciphertextBase64);

    const key = await deriveKey(userSecretKey, salt);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      ciphertext
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Decryption failed: Key mismatch or unauthorized attempt', err);
    throw new Error('Access Denied: Private key mismatch or unauthenticated user');
  }
}
