export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

export class RateLimiter {
  private kv: KVNamespace;
  private config: RateLimitConfig;

  constructor(kv: KVNamespace, config: RateLimitConfig) {
    this.kv = kv;
    this.config = config;
  }

  async checkLimit(identifier: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `${this.config.keyPrefix}:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing data
    let data = await this.kv.get(key);
    let requests: number[] = [];

    if (data) {
      try {
        requests = JSON.parse(data);
        // Filter out old requests
        requests = requests.filter(timestamp => timestamp > windowStart);
      } catch {
        requests = [];
      }
    }

    // Check if over limit
    const allowed = requests.length < this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - requests.length);
    const oldestRequest = requests.length > 0 ? Math.min(...requests) : now;
    const resetTime = oldestRequest + this.config.windowMs;

    if (allowed) {
      // Add new request
      requests.push(now);
      // Store updated data with TTL
      await this.kv.put(key, JSON.stringify(requests), {
        expirationTtl: Math.ceil(this.config.windowMs / 1000)
      });
    }

    return { allowed, remaining, resetTime };
  }
}

export function createRateLimiter(kv: KVNamespace): RateLimiter {
  return new RateLimiter(kv, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'rate_limit'
  });
}

export async function rateLimitMiddleware(request: Request, kv: KVNamespace) {
  const url = new URL(request.url);
  const ip = request.headers.get('cf-connecting-ip') || 
             request.headers.get('x-forwarded-for') || 
             'unknown';
  const limiter = createRateLimiter(kv);
  const result = await limiter.checkLimit(ip);

  if (!result.allowed) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString()
      }
    });
  }

  return null;
}
