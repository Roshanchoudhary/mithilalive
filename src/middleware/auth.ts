import { verifyToken, getCookieToken, parseAuthHeader, JWTPayload } from '@/utils/auth';
import { createDb } from '@/db/index';

export async function getSession(request: Request): Promise<JWTPayload | null> {
  const cookieHeader = request.headers.get('cookie');
  const token = getCookieToken(cookieHeader) || 
                parseAuthHeader(request.headers.get('authorization'));
  
  if (!token) return null;
  
  const payload = await verifyToken(token);
  if (!payload) return null;
  
  // Verify user still exists and is active
  const db = createDb();
  const result = await db.execute({
    sql: `SELECT id, is_active FROM users WHERE id = ? AND is_active = 1`,
    args: [payload.id]
  });
  
  if (!result.results || result.results.length === 0) {
    return null;
  }
  
  return payload;
}

export function requireAuth(handler: Function) {
  return async (request: Request, ...args: any[]) => {
    const user = await getSession(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return handler(request, user, ...args);
  };
}

export function requireRole(roles: string[]) {
  return (handler: Function) => {
    return async (request: Request, ...args: any[]) => {
      const user = await getSession(request);
      if (!user || !roles.includes(user.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return handler(request, user, ...args);
    };
  };
}

export function requirePermission(permission: string) {
  return (handler: Function) => {
    return async (request: Request, ...args: any[]) => {
      const user = await getSession(request);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if user has permission
      const db = createDb();
      const result = await db.execute({
        sql: `SELECT permissions FROM permissions WHERE role = ?`,
        args: [user.role]
      });
      
      let userPermissions: string[] = [];
      if (result.results && result.results.length > 0) {
        try {
          userPermissions = JSON.parse(result.results[0].permissions || '[]');
        } catch {
          userPermissions = [];
        }
      }
      
      // Super admin has all permissions
      if (user.role === 'super_admin' || userPermissions.includes('*') || userPermissions.includes(permission)) {
        return handler(request, user, ...args);
      }
      
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    };
  };
}
