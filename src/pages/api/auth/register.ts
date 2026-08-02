import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { hashPassword } from '@/utils/auth';
import { validateInput, validateEmail, validatePassword } from '@/utils/security';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, password, mobile, country, state, city } = body;

    // Validate input
    const validation = validateInput({ name, email, password }, {
      name: { required: true, minLength: 2, maxLength: 100 },
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

    // Validate password strength
    if (!validatePassword(password)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Password must be at least 8 characters' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const db = createDb();

    // Check if user already exists
    const existingUser = await db.execute({
      sql: `SELECT id FROM users WHERE email = ?`,
      args: [email]
    });

    if (existingUser.results && existingUser.results.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User already exists with this email' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash password
    const hashedPassword = hashPassword(password);

    // Create user
    const result = await db.execute({
      sql: `
        INSERT INTO users (name, email, password, mobile, country, state, city, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'user')
      `,
      args: [name, email, hashedPassword, mobile || '', country || '', state || '', city || '']
    });

    return new Response(JSON.stringify({
      success: true,
      data: { 
        id: result.meta?.last_row_id,
        name,
        email
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
