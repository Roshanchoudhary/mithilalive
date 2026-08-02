import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput, generateSlug, sanitizeHtml } from '@/utils/security';
import { calculateReadingTime } from '@/utils/helpers';

export const GET: APIRoute = async ({ request, url }) => {
  try {
    const db = createDb();
    const searchParams = url.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const author = searchParams.get('author');
    const status = searchParams.get('status');
    const breaking = searchParams.get('breaking') === 'true';
    const featured = searchParams.get('featured') === 'true';
    const trending = searchParams.get('trending') === 'true';

    let sql = `
      SELECT n.*, u.name as author, c.name as category_name, c.slug as category_slug
      FROM news n
      LEFT JOIN users u ON n.author_id = u.id
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (category) {
      sql += ` AND c.slug = ?`;
      args.push(category);
    }

    if (tag) {
      sql += ` AND n.id IN (SELECT news_id FROM news_tags nt INNER JOIN tags t ON nt.tag_id = t.id WHERE t.slug = ?)`;
      args.push(tag);
    }

    if (author) {
      sql += ` AND u.slug = ?`;
      args.push(author);
    }

    if (status) {
      sql += ` AND n.status = ?`;
      args.push(status);
    } else {
      sql += ` AND n.status = 'published' AND n.publish_date <= strftime('%s', 'now')`;
    }

    if (breaking) {
      sql += ` AND n.is_breaking = 1`;
    }

    if (featured) {
      sql += ` AND n.is_featured = 1`;
    }

    if (trending) {
      sql += ` AND n.is_trending = 1`;
    }

    sql += ` ORDER BY n.publish_date DESC, n.created_at DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const result = await db.execute({ sql, args });

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE 1=1
    `;
    const countArgs: any[] = [];

    if (category) {
      countSql += ` AND c.slug = ?`;
      countArgs.push(category);
    }

    if (tag) {
      countSql += ` AND n.id IN (SELECT news_id FROM news_tags nt INNER JOIN tags t ON nt.tag_id = t.id WHERE t.slug = ?)`;
      countArgs.push(tag);
    }

    if (status) {
      countSql += ` AND n.status = ?`;
      countArgs.push(status);
    } else {
      countSql += ` AND n.status = 'published' AND n.publish_date <= strftime('%s', 'now')`;
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

export const POST: APIRoute = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const db = createDb();

    // Validate input
    const validation = validateInput(body, {
      title: { required: true, minLength: 5, maxLength: 200 },
      content: { required: true, minLength: 20 },
      categoryId: { required: false },
      status: { required: false }
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

    const slug = body.slug || generateSlug(body.title);
    const readingTime = calculateReadingTime(body.content);
    const status = body.status || 'draft';

    // Check if slug exists
    const slugCheck = await db.execute({
      sql: `SELECT id FROM news WHERE slug = ?`,
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

    // Create news
    const result = await db.execute({
      sql: `
        INSERT INTO news (
          title, slug, summary, content, featured_image, gallery,
          author_id, category_id, status, is_featured, is_breaking,
          is_sticky, is_trending, reading_time, publish_date,
          seo_title, seo_description, keywords, canonical_url, meta_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        body.title, slug, body.summary || '', sanitizeHtml(body.content),
        body.featured_image || '', body.gallery || '',
        user.id, body.category_id || null, status,
        body.is_featured || 0, body.is_breaking || 0,
        body.is_sticky || 0, body.is_trending || 0,
        readingTime, body.publish_date || Math.floor(Date.now() / 1000),
        body.seo_title || body.title, body.seo_description || body.summary || '',
        body.keywords || '', body.canonical_url || '',
        body.meta_json || ''
      ]
    });

    const newsId = result.meta?.last_row_id;

    // Add tags
    if (body.tags && Array.isArray(body.tags) && body.tags.length > 0) {
      for (const tagName of body.tags) {
        const tagSlug = generateSlug(tagName);
        // Get or create tag
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

        if (tagId && newsId) {
          await db.execute({
            sql: `INSERT INTO news_tags (news_id, tag_id) VALUES (?, ?)`,
            args: [newsId, tagId]
          });
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      data: { id: newsId, slug }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('News create error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
