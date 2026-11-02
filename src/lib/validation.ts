/**
 * Input normalisation & validation shared by forms. React already escapes text
 * output, so this layer focuses on data quality and on rejecting dangerous URLs
 * (javascript:, data:, protocol-relative) before they reach the database.
 */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{2,41}$/;
export const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 72; // bcrypt limit used by Supabase Auth

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

/** Strips control characters (except newlines/tabs) and trims; caps length. */
export function cleanText(value: string, max = 2000) {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '').trim().slice(0, max);
}

/** Accepts only absolute https URLs (plain http on localhost only in development builds). */
export function safeUrl(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw.length > 2048) return '';
  try {
    const url = new URL(raw);
    if (url.protocol === 'https:') return url.href;
    if (import.meta.env.DEV && url.protocol === 'http:' && /^(localhost|127\.0\.0\.1)$/.test(url.hostname)) return url.href;
    return '';
  } catch { return ''; }
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) && value.length <= 254;
}

export type PasswordCheck = { score: 0 | 1 | 2 | 3 | 4; label: string; ok: boolean; hints: string[] };
export function checkPassword(password: string, username = ''): PasswordCheck {
  const hints: string[] = [];
  if (password.length < PASSWORD_MIN) hints.push(`almeno ${PASSWORD_MIN} caratteri`);
  if (new TextEncoder().encode(password).length > PASSWORD_MAX) hints.push(`al massimo ${PASSWORD_MAX} caratteri`);
  if (!/[a-z]/i.test(password)) hints.push('una lettera');
  if (!/\d/.test(password)) hints.push('un numero');
  if (username && password.toLowerCase().includes(username.toLowerCase())) hints.push('non contenere lo username');
  let score = 0;
  if (password.length >= PASSWORD_MIN) score++;
  if (password.length >= 14) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password) && /[^a-z0-9]/i.test(password)) score++;
  const ok = hints.length === 0;
  const clamped = (ok ? Math.max(1, score) : Math.min(score, 1)) as PasswordCheck['score'];
  const label = ['Troppo debole', 'Debole', 'Discreta', 'Buona', 'Ottima'][clamped];
  return { score: clamped, label, ok, hints };
}

/**
 * Accounts are username + password only. Supabase Auth still needs an email-shaped
 * identifier, so each username maps to an internal alias on a reserved, undeliverable
 * domain (RFC 2606 ".invalid"). No email is ever sent or shown.
 * ⚠ Choose the domain before launch: changing it later breaks existing logins.
 */
export const AUTH_EMAIL_DOMAIN = import.meta.env.VITE_AUTH_EMAIL_DOMAIN?.trim() || 'users.italfut.invalid';
export const usernameToEmail = (username: string) => normalizeUsername(username) + '@' + AUTH_EMAIL_DOMAIN;
export const isInternalEmail = (email: string | undefined | null) => Boolean(email?.toLowerCase().endsWith('@' + AUTH_EMAIL_DOMAIN));

/** 20 random characters from an unambiguous alphabet, grouped as XXXX-XXXX-XXXX-XXXX-XXXX (~100 bits). */
export function generateRecoveryCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  const chars = Array.from(bytes, byte => alphabet[byte % alphabet.length]).join('');
  return chars.match(/.{4}/g)!.join('-');
}
export const RECOVERY_CODE_PATTERN = /^[A-Z0-9]{4}(-[A-Z0-9]{4}){4}$/;
