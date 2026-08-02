import type { APIRoute } from 'astro';
import { validateInput, validateEmail } from '@/utils/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    // Validate input
    const validation = validateInput({ name, email, subject, message }, {
      name: { required: true, minLength: 2, maxLength: 100 },
      email: { required: true, type: 'email' },
      subject: { required: true, minLength: 3, maxLength: 200 },
      message: { required: true, minLength: 10, maxLength: 5000 }
    });

    if (!validation.valid) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: validation.errors[0] 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid email format' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // TODO: Send email notification
    // For now, just log the message
    console.log('Contact Form Submission:', { name, email, subject, message });

    // Store in KV for rate limiting
    const env = (request as any).env;
    const kv = env?.KV as KVNamespace;
    
    if (kv) {
      const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown';
      const key = `contact:${ip}`;
      const recent = await kv.get(key);
      
      if (recent) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Too many requests. Please try again later.' 
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Store with 1 hour TTL
      await kv.put(key, '1', { expirationTtl: 3600 });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Message sent successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Contact form error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
