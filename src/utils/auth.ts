import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { parse, serialize } from 'cookie';

const JWT_SECRET = import.meta.env.JWT_SECRET || 'default-secret-change-this';
const JWT_EXPIRY = import.meta.env.JWT_EXPIRY || '7d';
const BCRYPT_ROUNDS = parseInt(import.meta.env.BCRYPT_ROUNDS || '10');

export interface JWTPayload {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
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
  return crypto.randomUUID();
}

export function verifyCSRFToken(token: string, storedToken: string): boolean {
  return token === storedToken;
}
