import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { hashPassword } from '@/utils/auth';
import { validateInput, validateEmail } from '@/utils/security';

export const GET: APIRoute = requireAuth(requireRole(['super_admin', 'admin'])(async (request, user) => {
  try {
    const db = createDb();
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;
    const role = url.searchParams.get('role');

    let sql = `
      SELECT id, name, email, mobile, role, avatar, is_verified, is_active, last_login, created_at
      FROM users
      WHERE 1=1
    `;
    const args: any[] = [];

    if (role) {
      sql += ` AND role = ?`;
      args.push(role);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const result = await db.execute({ sql, args });

    // Get total count
    let countSql = `SELECT COUNT(*) as total FROM users WHERE 1=1`;
    const countArgs: any[] = [];

    if (role) {
      countSql += ` AND role = ?`;
      countArgs.push(role);
    }

    const countResult = await db.execute({ sql: countSql, args: countArgs });
    const total = countResult.results?.[0]?.total || 0;

    return new Response(JSON.stringify({
      success: true,
      data: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Users fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export const POST: APIRoute = requireAuth(requireRole(['super_admin', 'admin'])(async (request, user) => {
  try {
    const body = await request.json();
    const db = createDb();

    const validation = validateInput(body, {
      name: { required: true, minLength: 2, maxLength: 100 },
      email: { required: true, type: 'email' },
      password: { required: true, minLength: 8 },
      role: { required: true }
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

    // Check if user exists
    const existing = await db.execute({
      sql: `SELECT id FROM users WHERE email = ?`,
      args: [body.email]
    });

    if (existing.results && existing.results.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User already exists' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const hashedPassword = hashPassword(body.password);

    const result = await db.execute({
      sql: `
        INSERT INTO users (
          name, email, password, mobile, role, country, state, city,
          is_verified, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        body.name,
        body.email,
        hashedPassword,
        body.mobile || '',
        body.role,
        body.country || '',
        body.state || '',
        body.city || '',
        body.is_verified || 0,
        body.is_active !== undefined ? body.is_active : 1
      ]
    });

    return new Response(JSON.stringify({
      success: true,
      data: { id: result.meta?.last_row_id }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('User creation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
