import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth } from '@/middleware/auth';

export const GET: APIRoute = requireAuth(async (request, user) => {
  try {
    const db = createDb();
    const url = new URL(request.url);
    const folder = url.searchParams.get('folder') || '/';
    const search = url.searchParams.get('search') || '';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    const offset = (page - 1) * limit;

    let sql = `
      SELECT * FROM media
      WHERE folder = ?
    `;
    const args: any[] = [folder];

    if (search) {
      sql += ` AND (original_name LIKE ? OR filename LIKE ? OR alt LIKE ?)`;
      const searchTerm = `%${search}%`;
      args.push(searchTerm, searchTerm, searchTerm);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    args.push(limit, offset);

    const result = await db.execute({ sql, args });

    // Get total count
    let countSql = `
      SELECT COUNT(*) as total FROM media
      WHERE folder = ?
    `;
    const countArgs: any[] = [folder];

    if (search) {
      countSql += ` AND (original_name LIKE ? OR filename LIKE ? OR alt LIKE ?)`;
      const searchTerm = `%${search}%`;
      countArgs.push(searchTerm, searchTerm, searchTerm);
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
    console.error('Media fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

export const DELETE: APIRoute = requireAuth(async (request, user) => {
  try {
    const body = await request.json();
    const { id } = body;
    const db = createDb();

    if (!id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Media ID required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get media record
    const mediaResult = await db.execute({
      sql: `SELECT * FROM media WHERE id = ?`,
      args: [id]
    });

    if (!mediaResult.results || mediaResult.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Media not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const media = mediaResult.results[0];

    // Delete from R2
    const env = (request as any).env;
    const r2 = env.R2 as R2Bucket;

    try {
      // Extract keys from URLs
      const urlParts = media.url.split('/');
      const key = urlParts.slice(3).join('/');
      
      if (key) {
        await r2.delete(key);
      }

      // Delete thumbnail
      if (media.thumbnail) {
        const thumbParts = media.thumbnail.split('/');
        const thumbKey = thumbParts.slice(3).join('/');
        if (thumbKey) {
          await r2.delete(thumbKey);
        }
      }

      // Delete WebP
      if (media.webp_url) {
        const webpParts = media.webp_url.split('/');
        const webpKey = webpParts.slice(3).join('/');
        if (webpKey) {
          await r2.delete(webpKey);
        }
      }
    } catch (r2Error) {
      console.error('R2 deletion error:', r2Error);
      // Continue with database deletion even if R2 fails
    }

    // Delete from database
    await db.execute({
      sql: `DELETE FROM media WHERE id = ?`,
      args: [id]
    });

    return new Response(JSON.stringify({
      success: true,
      data: { id }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Media deletion error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
