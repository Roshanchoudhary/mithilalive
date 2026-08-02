import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';

export const GET: APIRoute = async () => {
  const db = createDb();
  const siteUrl = import.meta.env.SITE_URL || 'https://your-domain.com';

  // Get all published news
  const newsResult = await db.execute({
    sql: `
      SELECT slug, updated_at 
      FROM news 
      WHERE status = 'published' 
      ORDER BY updated_at DESC
    `
  });

  // Static pages
  const staticPages = [
    { url: '/', priority: 1.0, changefreq: 'daily' },
    { url: '/search', priority: 0.7, changefreq: 'weekly' },
    { url: '/about', priority: 0.5, changefreq: 'monthly' },
    { url: '/contact', priority: 0.5, changefreq: 'monthly' },
    { url: '/privacy', priority: 0.3, changefreq: 'yearly' },
    { url: '/terms', priority: 0.3, changefreq: 'yearly' },
  ];

  // Get categories
  const categoriesResult = await db.execute({
    sql: `SELECT slug FROM categories WHERE is_active = 1`
  });

  // Get tags
  const tagsResult = await db.execute({
    sql: `SELECT slug FROM tags`
  });

  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Static pages
  for (const page of staticPages) {
    sitemap += `  <url>\n`;
    sitemap += `    <loc>${siteUrl}${page.url}</loc>\n`;
    sitemap += `    <priority>${page.priority}</priority>\n`;
    sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
    sitemap += `  </url>\n`;
  }

  // News articles
  if (newsResult.results) {
    for (const news of newsResult.results) {
      const lastmod = news.updated_at ? new Date(news.updated_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${siteUrl}/${news.slug}</loc>\n`;
      sitemap += `    <lastmod>${lastmod}</lastmod>\n`;
      sitemap += `    <priority>0.8</priority>\n`;
      sitemap += `    <changefreq>daily</changefreq>\n`;
      sitemap += `  </url>\n`;
    }
  }

  // Categories
  if (categoriesResult.results) {
    for (const cat of categoriesResult.results) {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${siteUrl}/category/${cat.slug}</loc>\n`;
      sitemap += `    <priority>0.6</priority>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `  </url>\n`;
    }
  }

  // Tags
  if (tagsResult.results) {
    for (const tag of tagsResult.results) {
      sitemap += `  <url>\n`;
      sitemap += `    <loc>${siteUrl}/tag/${tag.slug}</loc>\n`;
      sitemap += `    <priority>0.4</priority>\n`;
      sitemap += `    <changefreq>weekly</changefreq>\n`;
      sitemap += `  </url>\n`;
    }
  }

  sitemap += '</urlset>';

  return new Response(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};
