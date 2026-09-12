/**
 * The private vault.
 *
 * Supabase Auth proves who you are. It does not — and must not — give the server
 * the ability to read your private pages, so those are encrypted under a second
 * passphrase that is never sent anywhere. Only a random salt and an encrypted
 * verifier blob are stored on your profile row; both are useless on their own.
 *
 * Keeping this separate from the login password is deliberate: a password reset
 * goes through Supabase and must not be able to destroy years of private writing.
 */

import { checkVerifier, deriveKey, makeVerifier, randomSaltB64 } from './crypto';
import { fetchProfile, updateProfile } from './api';

export interface VaultOpenResult {
  key?: CryptoKey;
  error?: string;
  /** True when this passphrase has just created the vault for the first time. */
  created?: boolean;
}

export async function openVault(userId: string, passphrase: string): Promise<VaultOpenResult> {
  if (passphrase.length < 8) {
    return { error: 'Use at least 8 characters — this is the only key to those pages.' };
  }

  const profile = await fetchProfile(userId);
  if (!profile) return { error: 'Your profile is still being created. Try again in a moment.' };

  if (!profile.vault_salt || !profile.vault_verifier) {
    // First time: this passphrase becomes the key, and there is no way back.
    const salt = randomSaltB64();
    const key = await deriveKey(passphrase, salt);
    await updateProfile(userId, { vault_salt: salt, vault_verifier: await makeVerifier(key) });
    return { key, created: true };
  }

  const key = await deriveKey(passphrase, profile.vault_salt);
  if (!(await checkVerifier(key, profile.vault_verifier))) {
    return { error: 'That passphrase does not open this vault.' };
  }
  return { key };
}

export async function hasVault(userId: string): Promise<boolean> {
  const profile = await fetchProfile(userId);
  return Boolean(profile?.vault_salt && profile?.vault_verifier);
}
