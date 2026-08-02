import { SignJWT, jwtVerify } from 'jose';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';
import { parse, serialize } from 'cookie';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'default-secret-change-this';
const JWT_EXPIRY = import.meta.env.JWT_EXPIRY || '7d';

export interface JWTPayload {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export function hashPassword(password: string): string {
  const hash = sha256(new TextEncoder().encode(password));
  return Array.from(hash, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export async function generateToken(payload: JWTPayload): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET);
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export function parseAuthHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

export function getCookieToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = parse(cookieHeader);
  return cookies.auth_token || null;
}

export function setAuthCookie(token: string): string {
  return serialize('auth_token', token, {
    httpOnly: true,
    secure: import.meta.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export function clearAuthCookie(): string {
  return serialize('auth_token', '', {
    httpOnly: true,
    secure: import.meta.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

export function generateCSRFToken(): string {
  const bytes = randomBytes(32);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function verifyCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken;
}
