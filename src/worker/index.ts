import { createDb } from '@/db/index';
import { securityHeaders } from '@/middleware/security';
import { rateLimitMiddleware } from '@/middleware/rateLimit';

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  JWT_SECRET: string;
  JWT_EXPIRY: string;
  BCRYPT_ROUNDS: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD: string;
  SITE_NAME: string;
  SITE_URL: string;
  CLOUDFLARE_ACCOUNT_ID: string;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Security headers
    const headers = securityHeaders();

    // CORS
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }

    // Rate limiting for API routes
    if (path.startsWith('/api/')) {
      const rateLimitResult = await rateLimitMiddleware(request, env.KV);
      if (rateLimitResult) {
        return rateLimitResult;
      }
    }

    // Pass environment to Astro
    const astroRequest = new Request(request, {
      headers: new Headers(request.headers)
    });

    // Add env to request context
    (astroRequest as any).env = env;

    try {
      // Let Astro handle routing
      const response = await import('astro');
      return await (response as any).render(astroRequest);
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', {
        status: 500,
        headers
      });
    }
  }
};
