import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput, generateSlug, sanitizeHtml } from '@/utils/security';
import { calculateReadingTime } from '@/utils/helpers';

export const GET: APIRoute = async ({ params }) => {
  try {
    const db = createDb();
    const { id } = params;

    const result = await db.execute({
      sql: `
        SELECT n.*, u.name as author, u.id as author_id, c.name as category_name
        FROM news n
        LEFT JOIN users u ON n.author_id = u.id
        LEFT JOIN categories c ON n.category_id = c.id
        WHERE n.id = ?
      `,
      args: [parseInt(id)]
    });

    if (!result.results || result.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'News not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get tags
    const tagsResult = await db.execute({
      sql: `
        SELECT t.* FROM tags t
        INNER JOIN news_tags nt ON t.id = nt.tag_id
        WHERE nt.news_id = ?
      `,
      args: [parseInt(id)]
    });

    const news = result.results[0];
    news.tags = tagsResult.results || [];

    return new Response(JSON.stringify({
      success: true,
      data: news
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('News fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PUT: APIRoute = requireAuth(async (request, user) => {
  try {
    const { id } = request.params;
    const body = await request.json();
    const db = createDb();

    // Check if news exists
    const existing = await db.execute({
      sql: `SELECT author_id, status FROM news WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'News not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const news = existing.results[0];

    // Check permissions
    const isAuthor = news.author_id === user.id;
    const isAdmin = ['super_admin', 'admin'].includes(user.role);
    const isEditor = user.role === 'editor';

    if (!isAuthor && !isAdmin && !isEditor) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Forbidden: You can only edit your own articles' 
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const slug = body.slug || generateSlug(body.title || news.title);
    const readingTime = body.content ? calculateReadingTime(body.content) : news.reading_time;

    // Update news
    await db.execute({
      sql: `
        UPDATE news SET
          title = ?, slug = ?, summary = ?, content = ?,
          featured_image = ?, gallery = ?, category_id = ?,
          status = ?, is_featured = ?, is_breaking = ?,
          is_sticky = ?, is_trending = ?, reading_time = ?,
          publish_date = ?, seo_title = ?, seo_description = ?,
          keywords = ?, canonical_url = ?, meta_json = ?,
          updated_at = strftime('%s', 'now')
        WHERE id = ?
      `,
      args: [
        body.title || news.title,
        slug,
        body.summary || news.summary || '',
        body.content ? sanitizeHtml(body.content) : news.content,
        body.featured_image || news.featured_image || '',
        body.gallery || news.gallery || '',
        body.category_id || news.category_id || null,
        body.status || news.status,
        body.is_featured !== undefined ? body.is_featured : news.is_featured,
        body.is_breaking !== undefined ? body.is_breaking : news.is_breaking,
        body.is_sticky !== undefined ? body.is_sticky : news.is_sticky,
        body.is_trending !== undefined ? body.is_trending : news.is_trending,
        readingTime,
        body.publish_date || news.publish_date || Math.floor(Date.now() / 1000),
        body.seo_title || news.seo_title || body.title || news.title,
        body.seo_description || news.seo_description || body.summary || news.summary || '',
        body.keywords || news.keywords || '',
        body.canonical_url || news.canonical_url || '',
        body.meta_json || news.meta_json || '',
        parseInt(id)
      ]
    });

    // Update tags
    if (body.tags && Array.isArray(body.tags)) {
      // Remove existing tags
      await db.execute({
        sql: `DELETE FROM news_tags WHERE news_id = ?`,
        args: [parseInt(id)]
      });

      // Add new tags
      for (const tagName of body.tags) {
        const tagSlug = generateSlug(tagName);
        let tagResult = await db.execute({
          sql: `SELECT id FROM tags WHERE slug = ?`,
          args: [tagSlug]
        });

        let tagId;
        if (tagResult.results && tagResult.results.length > 0) {
          tagId = tagResult.results[0].id;
        } else {
          const newTag = await db.execute({
            sql: `INSERT INTO tags (name, slug) VALUES (?, ?)`,
            args: [tagName, tagSlug]
          });
          tagId = newTag.meta?.last_row_id;
        }

        if (tagId) {
          await db.execute({
            sql: `INSERT INTO news_tags (news_id, tag_id) VALUES (?, ?)`,
            args: [parseInt(id), tagId]
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: { id: parseInt(id), slug }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('News update error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

export const DELETE: APIRoute = requireAuth(requireRole(['super_admin', 'admin', 'editor'])(async (request, user) => {
  try {
    const { id } = request.params;
    const db = createDb();

    // Check if news exists
    const existing = await db.execute({
      sql: `SELECT id FROM news WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'News not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete news (cascade will delete related data)
    await db.execute({
      sql: `DELETE FROM news WHERE id = ?`,
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
    console.error('News delete error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
