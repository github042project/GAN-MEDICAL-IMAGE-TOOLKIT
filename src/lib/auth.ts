import { useEffect, useState } from 'react';

/**
 * Prototype accounts stored on this device only (localStorage). There is no
 * server: this personalises the toolkit, it does not protect data. Passwords
 * are never stored; only a salted PBKDF2 hash is kept.
 */

export interface Session {
  name: string;
  email: string;
  guest: boolean;
}

interface Account {
  name: string;
  email: string;
  salt: string;
  hash: string;
}

const ACCOUNTS_KEY = 'gan-accounts';
const SESSION_KEY = 'gan-session';
const EVENT = 'gan-auth-change';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the session lasts for this visit only */
  }
};

let memorySession: Session | null = read<Session | null>(SESSION_KEY, null);

export function getSession(): Session | null {
  return memorySession;
}

function setSession(s: Session | null) {
  memorySession = s;
  write(SESSION_KEY, s);
  window.dispatchEvent(new Event(EVENT));
}

export function useSession(): Session | null {
  const [s, setS] = useState(getSession);
  useEffect(() => {
    const on = () => setS(getSession());
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return s;
}

const toHex = (buf: ArrayBuffer | Uint8Array) =>
  Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

async function hashPassword(password: string, saltHex: string): Promise<string> {
  if (!crypto?.subtle) throw new Error('Sign-in needs a secure (https or localhost) connection.');
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
  return toHex(bits);
}

const normEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

export async function signUp(name: string, email: string, password: string): Promise<void> {
  const accounts = read<Account[]>(ACCOUNTS_KEY, []);
  const em = normEmail(email);
  if (!name.trim()) throw new Error('Please enter your name.');
  if (!validEmail(em)) throw new Error('Please enter a valid email address.');
  if (password.length < 6) throw new Error('Use at least 6 characters for the password.');
  if (accounts.some((a) => a.email === em)) throw new Error('An account with this email already exists on this device. Sign in instead.');
  const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = await hashPassword(password, salt);
  write(ACCOUNTS_KEY, [...accounts, { name: name.trim(), email: em, salt, hash }]);
  setSession({ name: name.trim(), email: em, guest: false });
}

export async function signIn(email: string, password: string): Promise<void> {
  const em = normEmail(email);
  const acc = read<Account[]>(ACCOUNTS_KEY, []).find((a) => a.email === em);
  if (!acc) throw new Error('No account with that email on this device. Create one first.');
  if ((await hashPassword(password, acc.salt)) !== acc.hash) throw new Error('That password does not match. Try again.');
  setSession({ name: acc.name, email: acc.email, guest: false });
}

export function continueAsGuest() {
  setSession({ name: 'Guest', email: '', guest: true });
}

export function signOut() {
  setSession(null);
}
