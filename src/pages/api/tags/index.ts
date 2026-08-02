import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput, generateSlug } from '@/utils/security';

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = createDb();
    const withCount = url.searchParams.get('withCount') === 'true';

    let sql = `SELECT * FROM tags`;

    if (withCount) {
      sql = `
        SELECT t.*, COUNT(nt.news_id) as news_count
        FROM tags t
        LEFT JOIN news_tags nt ON t.id = nt.tag_id
        LEFT JOIN news n ON nt.news_id = n.id AND n.status = 'published'
        GROUP BY t.id
      `;
    }

    sql += ` ORDER BY t.name ASC`;

    const result = await db.execute({ sql });

    return new Response(JSON.stringify({
      success: true,
      data: result.results || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Tags fetch error:', error);
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
      name: { required: true, minLength: 2, maxLength: 50 }
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

    // Check if tag exists
    const existing = await db.execute({
      sql: `SELECT id FROM tags WHERE slug = ?`,
      args: [slug]
    });

    if (existing.results && existing.results.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Tag already exists' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await db.execute({
      sql: `
        INSERT INTO tags (name, slug, description, seo_title, seo_description)
        VALUES (?, ?, ?, ?, ?)
      `,
      args: [
        body.name,
        slug,
        body.description || '',
        body.seo_title || body.name,
        body.seo_description || body.description || ''
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
    console.error('Tag creation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
