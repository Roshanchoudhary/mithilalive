import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput, generateSlug } from '@/utils/security';

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = createDb();
    const withCount = url.searchParams.get('withCount') === 'true';

    let sql = `
      SELECT c.*
      FROM categories c
      WHERE c.is_active = 1
    `;

    if (withCount) {
      sql = `
        SELECT c.*, COUNT(n.id) as news_count
        FROM categories c
        LEFT JOIN news n ON c.id = n.category_id AND n.status = 'published'
        WHERE c.is_active = 1
        GROUP BY c.id
      `;
    }

    sql += ` ORDER BY c.order_index ASC, c.name ASC`;

    const result = await db.execute({ sql });

    return new Response(JSON.stringify({
      success: true,
      data: result.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Categories fetch error:', error);
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
      slug: { required: false }
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

    const slug = body.slug || generateSlug(body.name);

    // Check if slug exists
    const slugCheck = await db.execute({
      sql: `SELECT id FROM categories WHERE slug = ?`,
      args: [slug]
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

    const result = await db.execute({
      sql: `
        INSERT INTO categories (
          name, slug, description, icon, image, parent_id, 
          order_index, seo_title, seo_description, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        body.name, slug, body.description || '',
        body.icon || '', body.image || '',
        body.parent_id || null, body.order_index || 0,
        body.seo_title || body.name, body.seo_description || body.description || '',
        body.is_active !== undefined ? body.is_active : 1
      ]
    });

    return new Response(JSON.stringify({
      success: true,
      data: { id: result.meta?.last_row_id, slug }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Category create error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
