import type { APIRoute } from 'astro';
import { validateEmail } from '@/utils/security';

// Simple in-memory storage for newsletter subscribers (use KV in production)
// For production, store in D1 database or KV

export const POST: APIRoute = async ({ request, env }) => {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || !validateEmail(email)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid email address' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Store in KV for rate limiting and tracking
    const kv = (env as any).KV as KVNamespace;
    if (kv) {
      const key = `newsletter:${email}`;
      const exists = await kv.get(key);
      
      if (exists) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Email already subscribed' 
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Store with TTL (1 year)
      await kv.put(key, 'subscribed', {
        expirationTtl: 31536000
      });
    }

    // TODO: Store in D1 database for persistent storage
    // const db = createDb();
    // await db.execute({
    //   sql: `INSERT INTO newsletter_subscribers (email, subscribed_at) VALUES (?, strftime('%s', 'now'))`,
    //   args: [email]
    // });

    // TODO: Send welcome email
    // await sendWelcomeEmail(email);

    return new Response(JSON.stringify({
      success: true,
      message: 'Successfully subscribed to newsletter'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ request }) => {
  // This could return subscriber count or status
  return new Response(JSON.stringify({
    success: true,
    data: { message: 'Newsletter API endpoint' }
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};
