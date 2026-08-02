import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput } from '@/utils/security';

export const PUT: APIRoute = requireAuth(requireRole(['super_admin', 'admin'])(async (request, user) => {
  try {
    const { id } = request.params;
    const body = await request.json();
    const db = createDb();

    // Check if comment exists
    const existing = await db.execute({
      sql: `SELECT id FROM comments WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Comment not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update comment status
    const { status } = body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid status' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.execute({
      sql: `
        UPDATE comments 
        SET status = ?, updated_at = strftime('%s', 'now')
        WHERE id = ?
      `,
      args: [status, parseInt(id)]
    });

    return new Response(JSON.stringify({
      success: true,
      data: { id: parseInt(id), status }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Comment update error:', error);
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

    // Check if comment exists
    const existing = await db.execute({
      sql: `SELECT id FROM comments WHERE id = ?`,
      args: [parseInt(id)]
    });

    if (!existing.results || existing.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Comment not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete comment (cascade will handle replies)
    await db.execute({
      sql: `DELETE FROM comments WHERE id = ?`,
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
    console.error('Comment deletion error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
