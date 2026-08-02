import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput } from '@/utils/security';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;
    const db = createDb();

    const result = await db.execute({
      sql: `SELECT * FROM advertisements WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!result.results || result.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Advertisement not found' 
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
    console.error('Advertisement fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = requireAuth(requireRole(['super_admin', 'admin'])(async (request, user) => {
  try {
    const { id } = request.params;
    const body = await request.json();
    const db = createDb();

    // Check if advertisement exists
    const existing = await db.execute({
      sql: `SELECT * FROM advertisements WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Advertisement not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ad = existing.results[0];

    await db.execute({
      sql: `
        UPDATE advertisements SET
          name = ?, position = ?, code = ?,
          is_active = ?, start_date = ?, end_date = ?, priority = ?,
          updated_at = strftime('%s', 'now')
        WHERE id = ?
      `,
      args: [
        body.name || ad.name,
        body.position || ad.position,
        body.code || ad.code,
        body.is_active !== undefined ? body.is_active : ad.is_active,
        body.start_date || ad.start_date,
        body.end_date || ad.end_date,
        body.priority || ad.priority || 0,
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
    console.error('Advertisement update error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export const DELETE: APIRoute = requireAuth(requireRole(['super_admin', 'admin'])(async (request, user) => {
  try {
    const { id } = request.params;
    const db = createDb();

    // Check if advertisement exists
    const existing = await db.execute({
      sql: `SELECT id FROM advertisements WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Advertisement not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.execute({
      sql: `DELETE FROM advertisements WHERE id = ?`,
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
    console.error('Advertisement deletion error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
