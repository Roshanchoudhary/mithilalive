import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput } from '@/utils/security';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;
    const db = createDb();

    const result = await db.execute({
      sql: `SELECT * FROM menus WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!result.results || result.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Menu not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const menu = result.results[0];
    menu.items = menu.items ? JSON.parse(menu.items) : [];

    return new Response(JSON.stringify({
      success: true,
      data: menu
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Menu fetch error:', error);
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

    // Check if menu exists
    const existing = await db.execute({
      sql: `SELECT * FROM menus WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Menu not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const menu = existing.results[0];
    const items = body.items ? JSON.stringify(body.items) : menu.items;

    await db.execute({
      sql: `
        UPDATE menus SET
          name = ?, location = ?, items = ?, is_active = ?,
          updated_at = strftime('%s', 'now')
        WHERE id = ?
      `,
      args: [
        body.name || menu.name,
        body.location || menu.location,
        items,
        body.is_active !== undefined ? body.is_active : menu.is_active,
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
    console.error('Menu update error:', error);
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

    // Check if menu exists
    const existing = await db.execute({
      sql: `SELECT id FROM menus WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Menu not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.execute({
      sql: `DELETE FROM menus WHERE id = ?`,
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
    console.error('Menu deletion error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
