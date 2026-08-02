import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth } from '@/middleware/auth';
import { validateInput, sanitizeHtml, validateEmail } from '@/utils/security';

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = createDb();
    const newsId = url.searchParams.get('newsId');
    const status = url.searchParams.get('status') || 'approved';

    let sql = `
      SELECT c.*, u.name as user_name, u.avatar as user_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.status = ?
    `;
    const args: any[] = [status];

    if (newsId) {
      sql += ` AND c.news_id = ?`;
      args.push(parseInt(newsId));
    }

    sql += ` AND c.parent_id IS NULL ORDER BY c.created_at DESC LIMIT 50`;

    const result = await db.execute({ sql, args });

    // Get replies for each comment
    const commentsWithReplies = [];
    for (const comment of (result.results || [])) {
      const replies = await db.execute({
        sql: `
          SELECT c.*, u.name as user_name, u.avatar as user_avatar
          FROM comments c
          LEFT JOIN users u ON c.user_id = u.id
          WHERE c.parent_id = ? AND c.status = 'approved'
          ORDER BY c.created_at ASC
        `,
        args: [comment.id]
      });
      commentsWithReplies.push({
        ...comment,
        replies: replies.results || []
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: commentsWithReplies
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Comments fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const db = createDb();

    const validation = validateInput(body, {
      newsId: { required: true, type: 'number' },
      name: { required: true, minLength: 2, maxLength: 100 },
      email: { required: true, type: 'email' },
      content: { required: true, minLength: 3, maxLength: 5000 }
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

    // Check if news exists and is published
    const newsCheck = await db.execute({
      sql: `SELECT id FROM news WHERE id = ? AND status = 'published'`,
      args: [body.newsId]
    });

    if (!newsCheck.results || newsCheck.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'News not found or not published' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for spam (simple check - can be enhanced)
    const content = sanitizeHtml(body.content);

    // Create comment
    const result = await db.execute({
      sql: `
        INSERT INTO comments (
          news_id, user_id, parent_id, name, email, content, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        body.newsId,
        body.userId || null,
        body.parentId || null,
        body.name,
        body.email,
        content,
        'pending' // All comments require admin approval
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
    console.error('Comment create error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
