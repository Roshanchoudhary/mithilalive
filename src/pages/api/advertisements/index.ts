import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput } from '@/utils/security';

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = createDb();
    const position = url.searchParams.get('position');
    const activeOnly = url.searchParams.get('active') !== 'false';

    let sql = `SELECT * FROM advertisements WHERE 1=1`;
    const args: any[] = [];

    if (position) {
      sql += ` AND position = ?`;
      args.push(position);
    }

    if (activeOnly) {
      sql += ` AND is_active = 1`;
      sql += ` AND (start_date IS NULL OR start_date <= strftime('%s', 'now'))`;
      sql += ` AND (end_date IS NULL OR end_date >= strftime('%s', 'now'))`;
    }

    sql += ` ORDER BY priority DESC, created_at DESC`;

    const result = await db.execute({ sql, args });

    return new Response(JSON.stringify({
      success: true,
      data: result.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Advertisements fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = requireAuth(requireRole(['super_admin', 'admin'])(async (request, user) => {
  try {
    const body = await request.json();
    const db = createDb();

    const validation = validateInput(body, {
      name: { required: true, minLength: 2, maxLength: 100 },
      position: { required: true },
      code: { required: true }
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

    const result = await db.execute({
      sql: `
        INSERT INTO advertisements (
          name, position, code, is_active, start_date, end_date, priority
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        body.name,
        body.position,
        body.code,
        body.is_active !== undefined ? body.is_active : 1,
        body.start_date || null,
        body.end_date || null,
        body.priority || 0
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
    console.error('Advertisement creation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
