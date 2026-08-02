export function securityHeaders(): Headers {
  const headers = new Headers();
  
  // Helmet headers
  headers.set('X-DNS-Prefetch-Control', 'on');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
    "style-src 'self' 'unsafe-inline' https:; " +
    "img-src 'self' data: https: blob:; " +
    "font-src 'self' https:; " +
    "connect-src 'self' https:; " +
    "frame-src 'self' https:; " +
    "media-src 'self' https:;"
  );
  
  // HSTS (only in production)
  if (import.meta.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  // Permissions Policy
  headers.set('Permissions-Policy', 
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  
  return headers;
}

export function csrfProtection() {
  return async (request: Request, next: Function) => {
    // Skip CSRF check for GET, HEAD, OPTIONS
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next(request);
    }

    const cookieHeader = request.headers.get('cookie');
    const csrfToken = request.headers.get('x-csrf-token') || 
                     (await request.clone().json().catch(() => ({})))?.csrf_token;

    if (!csrfToken) {
      return new Response(JSON.stringify({ error: 'CSRF token missing' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get CSRF token from cookie or session
    const cookies = cookieHeader?.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {} as Record<string, string>);

    const storedToken = cookies?.['csrf_token'];

    if (!storedToken || csrfToken !== storedToken) {
      return new Response(JSON.stringify({ error: 'Invalid CSRF token' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return next(request);
  };
}

export function generateCsrfCookie(): { name: string; value: string; options: any } {
  const token = crypto.randomUUID();
  return {
    name: 'csrf_token',
    value: token,
    options: {
      httpOnly: true,
      secure: import.meta.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    }
  };
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeInput(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}
