import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput, generateSlug } from '@/utils/security';

export const GET: APIRoute = async ({ params }) => {
  try {
    const { id } = params;
    const db = createDb();

    const result = await db.execute({
      sql: `SELECT * FROM categories WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!result.results || result.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Category not found' 
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
    console.error('Category fetch error:', error);
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

    // Check if category exists
    const existing = await db.execute({
      sql: `SELECT * FROM categories WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Category not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const category = existing.results[0];
    const slug = body.slug || generateSlug(body.name || category.name);

    // Check if slug is taken by another category
    if (slug !== category.slug) {
      const slugCheck = await db.execute({
        sql: `SELECT id FROM categories WHERE slug = ? AND id != ?`,
        args: [slug, parseInt(id)]
      });

      if (slugCheck.results && slugCheck.results.length > 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Slug already exists' 
        }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    await db.execute({
      sql: `
        UPDATE categories SET
          name = ?, slug = ?, description = ?,
          icon = ?, image = ?, parent_id = ?,
          order_index = ?, seo_title = ?, seo_description = ?,
          is_active = ?, updated_at = strftime('%s', 'now')
        WHERE id = ?
      `,
      args: [
        body.name || category.name,
        slug,
        body.description || category.description || '',
        body.icon || category.icon || '',
        body.image || category.image || '',
        body.parent_id || category.parent_id || null,
        body.order_index || category.order_index || 0,
        body.seo_title || body.name || category.name,
        body.seo_description || body.description || category.description || '',
        body.is_active !== undefined ? body.is_active : category.is_active,
        parseInt(id)
      ]
    });

    return new Response(JSON.stringify({
      success: true,
      data: { id: parseInt(id), slug }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Category update error:', error);
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

    // Check if category exists
    const existing = await db.execute({
      sql: `SELECT id FROM categories WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Category not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if category has news
    const newsCheck = await db.execute({
      sql: `SELECT COUNT(*) as count FROM news WHERE category_id = ?`,
      args: [parseInt(id)]
    });

    if (newsCheck.results && newsCheck.results[0]?.count > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Cannot delete category with associated news. Reassign or delete news first.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete category
    await db.execute({
      sql: `DELETE FROM categories WHERE id = ?`,
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
    console.error('Category deletion error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
