import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput } from '@/utils/security';

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = createDb();
    const location = url.searchParams.get('location');

    let sql = `SELECT * FROM menus WHERE is_active = 1`;
    const args: any[] = [];

    if (location) {
      sql += ` AND location = ?`;
      args.push(location);
    }

    sql += ` ORDER BY id ASC`;

    const result = await db.execute({ sql, args });

    // Parse items JSON
    const menus = (result.results || []).map(menu => ({
      ...menu,
      items: menu.items ? JSON.parse(menu.items) : []
    }));

    return new Response(JSON.stringify({
      success: true,
      data: menus
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Menus fetch error:', error);
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
      location: { required: true }
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

    const items = body.items ? JSON.stringify(body.items) : '[]';

    const result = await db.execute({
      sql: `
        INSERT INTO menus (name, location, items, is_active)
        VALUES (?, ?, ?, ?)
      `,
      args: [
        body.name,
        body.location,
        items,
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
    console.error('Menu creation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
