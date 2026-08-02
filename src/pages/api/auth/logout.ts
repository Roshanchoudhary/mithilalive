import type { APIRoute } from 'astro';
import { clearAuthCookie } from '@/utils/auth';
import { createDb } from '@/db/index';
import { getSession } from '@/middleware/auth';

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await getSession(request);
    
    if (user) {
      const db = createDb();
      // Delete session
      const cookieHeader = request.headers.get('cookie');
      const token = cookieHeader?.split(';')
        .find(c => c.trim().startsWith('auth_token='))
        ?.split('=')[1];
      
      if (token) {
        await db.execute({
          sql: `DELETE FROM sessions WHERE token = ?`,
          args: [token]
        });
      }
    }

    // Clear cookie
    const cookie = clearAuthCookie();

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });

  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
