import { createDb } from '../src/db/index.js';
import { hashPassword } from '../src/utils/auth.js';

async function seed() {
  console.log('🌱 Seeding database...');
  
  const db = createDb();
  
  try {
    // Create admin user
    const adminPassword = hashPassword(import.meta.env.ADMIN_PASSWORD || 'admin123');
    await db.execute({
      sql: `
        INSERT OR REPLACE INTO users (name, email, password, role, is_verified, is_active)
        VALUES (?, ?, ?, 'super_admin', 1, 1)
      `,
      args: ['Admin', import.meta.env.ADMIN_EMAIL || 'admin@example.com', adminPassword]
    });
    console.log('✅ Admin user created');

    // Insert default permissions
    const permissions = [
      { role: 'super_admin', perms: '["*"]' },
      { role: 'admin', perms: '["news.*", "users.read", "users.update", "categories.*", "tags.*", "settings.*", "ads.*"]' },
      { role: 'editor', perms: '["news.*", "categories.read", "tags.read"]' },
      { role: 'reporter', perms: '["news.create", "news.update", "news.read"]' },
      { role: 'employee', perms: '["news.create", "news.update_own", "news.read"]' },
      { role: 'user', perms: '["news.read", "comments.create"]' }
    ];

    for (const p of permissions) {
      await db.execute({
        sql: `
          INSERT OR REPLACE INTO permissions (role, permissions)
          VALUES (?, ?)
        `,
        args: [p.role, p.perms]
      });
    }
    console.log('✅ Permissions seeded');

    // Insert default settings
    const settings = [
      { key: 'site_name', value: 'News Portal' },
      { key: 'site_description', value: 'Your trusted source for news and updates' },
      { key: 'primary_color', value: '#3b82f6' },
      { key: 'secondary_color', value: '#1e293b' }
    ];

    for (const s of settings) {
      await db.execute({
        sql: `
          INSERT OR REPLACE INTO settings (key, value, group_name)
          VALUES (?, ?, 'general')
        `,
        args: [s.key, s.value]
      });
    }
    console.log('✅ Settings seeded');

    // Insert default categories
    const categories = [
      'Politics', 'Technology', 'Business', 'Sports', 
      'Entertainment', 'Health', 'Science', 'Education'
    ];

    for (const cat of categories) {
      const slug = cat.toLowerCase();
      await db.execute({
        sql: `
          INSERT OR IGNORE INTO categories (name, slug, is_active)
          VALUES (?, ?, 1)
        `,
        args: [cat, slug]
      });
    }
    console.log('✅ Categories seeded');

    console.log('🎉 Database seeded successfully!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
