import type { APIRoute } from 'astro';
import { getSession } from '@/middleware/auth';

export const GET: APIRoute = async ({ request }) => {
  try {
    const user = await getSession(request);

    if (!user) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Unauthorized' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get full user data from database
    const db = createDb();
    const result = await db.execute({
      sql: `
        SELECT id, name, email, mobile, role, avatar, bio, country, state, city,
        is_verified, is_active, last_login, created_at
        FROM users
        WHERE id = ?
      `,
      args: [user.id]
    });

    if (!result.results || result.results.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User not found' 
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
    console.error('User fetch error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
