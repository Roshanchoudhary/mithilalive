import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';
import { requireAuth, requireRole } from '@/middleware/auth';
import { validateInput } from '@/utils/security';

export const GET: APIRoute = async ({ url }) => {
  try {
    const db = createDb();
    const group = url.searchParams.get('group') || 'general';

    const result = await db.execute({
      sql: `SELECT * FROM settings WHERE group_name = ?`,
      args: [group]
    });

    // Convert to key-value object
    const settings: Record<string, string> = {};
    for (const row of (result.results || [])) {
      settings[row.key] = row.value;
    }

    return new Response(JSON.stringify({
      success: true,
      data: settings
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Settings fetch error:', error);
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

    // Validate input
    const validation = validateInput(body, {
      key: { required: true },
      value: { required: false },
      group: { required: false }
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

    const { key, value, group = 'general' } = body;

    // Check if setting exists
    const existing = await db.execute({
      sql: `SELECT id FROM settings WHERE key = ?`,
      args: [key]
    });

    let result;
    if (existing.results && existing.results.length > 0) {
      // Update
      result = await db.execute({
        sql: `
          UPDATE settings 
          SET value = ?, group_name = ?, updated_at = strftime('%s', 'now')
          WHERE key = ?
        `,
        args: [value, group, key]
      });
    } else {
      // Insert
      result = await db.execute({
        sql: `
          INSERT INTO settings (key, value, group_name)
          VALUES (?, ?, ?)
        `,
        args: [key, value, group]
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: { key, value, group }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Settings update error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));

export const PUT: APIRoute = requireAuth(requireRole(['super_admin', 'admin'])(async (request, user) => {
  try {
    const body = await request.json();
    const db = createDb();

    // Bulk update settings
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid settings format' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.execute({
        sql: `
          INSERT OR REPLACE INTO settings (key, value, updated_at)
          VALUES (?, ?, strftime('%s', 'now'))
        `,
        args: [key, value]
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: settings
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Settings bulk update error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}));
