import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { hashPassword, verifyPassword, generateToken, setAuthCookie, JWTPayload } from '@/utils/auth';
import { validateInput } from '@/utils/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    const validation = validateInput({ email, password }, {
      email: { required: true, type: 'email' },
      password: { required: true, minLength: 8 }
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

    const db = createDb();

    // Find user
    const userResult = await db.execute({
      sql: `SELECT * FROM users WHERE email = ? AND is_active = 1`,
      args: [email]
    });

    if (!userResult.results || userResult.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid credentials' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = userResult.results[0];

    // Verify password
    if (!verifyPassword(password, user.password)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid credentials' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user permissions
    const permResult = await db.execute({
      sql: `SELECT permissions FROM permissions WHERE role = ?`,
      args: [user.role]
    });

    let permissions: string[] = [];
    if (permResult.results && permResult.results.length > 0) {
      try {
        permissions = JSON.parse(permResult.results[0].permissions || '[]');
      } catch {
        permissions = [];
      }
    }

    // Generate JWT
    const payload: JWTPayload = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions
    };

    const token = await generateToken(payload);

    // Update last login
    await db.execute({
      sql: `UPDATE users SET last_login = strftime('%s', 'now') WHERE id = ?`,
      args: [user.id]
    });

    // Create session
    await db.execute({
      sql: `INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, strftime('%s', 'now') + 604800)`,
      args: [user.id, token]
    });

    // Set cookie
    const cookie = setAuthCookie(token);

    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
