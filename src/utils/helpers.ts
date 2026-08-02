import { createDb } from '@/db/index';

export async function getLatestNews(limit: number = 10) {
  const db = createDb();
  const result = await db.execute({
    sql: `
      SELECT n.*, c.name as category, c.slug as category_slug, u.name as author
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.status = 'published' AND n.publish_date <= strftime('%s', 'now')
      ORDER BY n.publish_date DESC
      LIMIT ?
    `,
    args: [limit]
  });
  return result.results;
}

export async function getFeaturedNews(limit: number = 5) {
  const db = createDb();
  const result = await db.execute({
    sql: `
      SELECT n.*, c.name as category, c.slug as category_slug, u.name as author
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.status = 'published' AND n.is_featured = 1 AND n.publish_date <= strftime('%s', 'now')
      ORDER BY n.publish_date DESC
      LIMIT ?
    `,
    args: [limit]
  });
  return result.results;
}

export async function getTrendingNews(limit: number = 6) {
  const db = createDb();
  const result = await db.execute({
    sql: `
      SELECT n.*, c.name as category, c.slug as category_slug, u.name as author
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.status = 'published' AND n.is_trending = 1 AND n.publish_date <= strftime('%s', 'now')
      ORDER BY n.views DESC, n.publish_date DESC
      LIMIT ?
    `,
    args: [limit]
  });
  return result.results;
}

export async function getBreakingNews(limit: number = 5) {
  const db = createDb();
  const result = await db.execute({
    sql: `
      SELECT n.*, c.name as category, c.slug as category_slug
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.status = 'published' AND n.is_breaking = 1 AND n.publish_date <= strftime('%s', 'now')
      ORDER BY n.publish_date DESC
      LIMIT ?
    `,
    args: [limit]
  });
  return result.results;
}

export async function getNewsBySlug(slug: string) {
  const db = createDb();
  const result = await db.execute({
    sql: `
      SELECT n.*, c.name as category, c.slug as category_slug, u.name as author
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.slug = ? AND n.status = 'published'
    `,
    args: [slug]
  });
  
  if (result.results && result.results.length > 0) {
    await db.execute({
      sql: `UPDATE news SET views = views + 1 WHERE id = ?`,
      args: [result.results[0].id]
    });
    
    const tags = await db.execute({
      sql: `
        SELECT t.* FROM tags t
        INNER JOIN news_tags nt ON t.id = nt.tag_id
        WHERE nt.news_id = ?
      `,
      args: [result.results[0].id]
    });
    
    return { ...result.results[0], tags: tags.results };
  }
  return null;
}

export async function getRelatedNews(newsId: number, limit: number = 3) {
  const db = createDb();
  const result = await db.execute({
    sql: `
      SELECT n.*, c.name as category
      FROM news n
      LEFT JOIN categories c ON n.category_id = c.id
      WHERE n.id != ? AND n.status = 'published' AND n.publish_date <= strftime('%s', 'now')
      ORDER BY n.publish_date DESC
      LIMIT ?
    `,
    args: [newsId, limit]
  });
  return result.results;
}

export async function getComments(newsId: number, limit: number = 50) {
  const db = createDb();
  const result = await db.execute({
    sql: `
      SELECT c.*, u.name as user_name, u.avatar as user_avatar
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.news_id = ? AND c.status = 'approved' AND c.parent_id IS NULL
      ORDER BY c.created_at DESC
      LIMIT ?
    `,
    args: [newsId, limit]
  });
  return result.results;
}

export async function getCategoriesWithCount() {
  const db = createDb();
  const result = await db.execute({
    sql: `
      SELECT c.*, COUNT(n.id) as news_count
      FROM categories c
      LEFT JOIN news n ON c.id = n.category_id AND n.status = 'published'
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.order_index ASC
    `
  });
  return result.results;
}

export async function getTagsWithCount() {
  const db = createDb();
  const result = await db.execute({
    sql: `
      SELECT t.*, COUNT(nt.news_id) as news_count
      FROM tags t
      LEFT JOIN news_tags nt ON t.id = nt.tag_id
      LEFT JOIN news n ON nt.news_id = n.id AND n.status = 'published'
      GROUP BY t.id
      ORDER BY t.name ASC
    `
  });
  return result.results;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) return `${diffYear}y ago`;
  if (diffMonth > 0) return `${diffMonth}mo ago`;
  if (diffDay > 0) return `${diffDay}d ago`;
  if (diffHour > 0) return `${diffHour}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return `${diffSec}s ago`;
}

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.replace(/<[^>]*>/g, '').split(/\s+/).length;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function truncateText(text: string, maxLength: number = 160): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function extractTextFromHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}
