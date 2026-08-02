import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { hashPassword } from '@/utils/auth';
import { validateInput, validateEmail } from '@/utils/security';

export const GET: APIRoute = requireAuth(requireRole(['super_admin', 'admin'])(async (request, user) => {
  try {
    const { id } = request.params;
    const db = createDb();

    const result = await db.execute({
      sql: `
        SELECT id, name, email, mobile, role, avatar, bio, country, state, city,
        is_verified, is_active, last_login, created_at, updated_at
        FROM users
        WHERE id = ?
      `,
      args: [parseInt(id)]
    });

    if (!result.results || result.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: result.results[0]
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('User fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export const PUT: APIRoute = requireAuth(requireRole(['super_admin', 'admin'])(async (request, user) => {
  try {
    const { id } = request.params;
    const body = await request.json();
    const db = createDb();

    // Check if user exists
    const existing = await db.execute({
      sql: `SELECT id, password FROM users WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userData = existing.results[0];
    let hashedPassword = userData.password;

    // Update password if provided
    if (body.password) {
      hashedPassword = hashPassword(body.password);
    }

    const result = await db.execute({
      sql: `
        UPDATE users SET
          name = ?, email = ?, mobile = ?, role = ?,
          avatar = ?, bio = ?, country = ?, state = ?, city = ?,
          is_verified = ?, is_active = ?, password = ?,
          updated_at = strftime('%s', 'now')
        WHERE id = ?
      `,
      args: [
        body.name || userData.name,
        body.email || userData.email,
        body.mobile || userData.mobile || '',
        body.role || userData.role,
        body.avatar || userData.avatar || '',
        body.bio || userData.bio || '',
        body.country || userData.country || '',
        body.state || userData.state || '',
        body.city || userData.city || '',
        body.is_verified !== undefined ? body.is_verified : userData.is_verified,
        body.is_active !== undefined ? body.is_active : userData.is_active,
        hashedPassword,
        parseInt(id)
      ]
    });

    return new Response(JSON.stringify({
      success: true,
      data: { id: parseInt(id) }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('User update error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export const DELETE: APIRoute = requireAuth(requireRole(['super_admin'])(async (request, user) => {
  try {
    const { id } = request.params;
    const db = createDb();

    // Prevent deleting self
    if (parseInt(id) === user.id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Cannot delete your own account' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user exists
    const existing = await db.execute({
      sql: `SELECT id FROM users WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete user (cascade will handle related data)
    await db.execute({
      sql: `DELETE FROM users WHERE id = ?`,
      args: [parseInt(id)]
    });

    return new Response(JSON.stringify({
      success: true,
      data: { id: parseInt(id) }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('User deletion error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
