import type { APIRoute } from 'astro';
import { createDb } from '@/db/index';

export const GET: APIRoute = async () => {
  const db = createDb();
  const siteUrl = import.meta.env.SITE_URL || 'https://your-domain.com';
  const siteName = import.meta.env.SITE_NAME || 'News Portal';

  // Get latest 20 published news
  const newsResult = await db.execute({
    sql: `
      SELECT n.*, u.name as author_name
      FROM news n
      LEFT JOIN users u ON n.author_id = u.id
      WHERE n.status = 'published' 
      ORDER BY n.publish_date DESC
      LIMIT 20
    `
  });

  let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
  rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  rss += '  <channel>\n';
  rss += `    <title>${siteName}</title>\n`;
  rss += `    <link>${siteUrl}</link>\n`;
  rss += `    <description>Latest news from ${siteName}</description>\n`;
  rss += `    <language>en</language>\n`;
  rss += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
  rss += `    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />\n`;

  if (newsResult.results) {
    for (const news of newsResult.results) {
      const pubDate = news.publish_date ? new Date(news.publish_date * 1000).toUTCString() : new Date().toUTCString();
      const description = news.summary || news.title;
      const content = news.content.replace(/<[^>]*>/g, '').substring(0, 500) + '...';
      
      rss += '    <item>\n';
      rss += `      <title>${escapeXml(news.title)}</title>\n`;
      rss += `      <link>${siteUrl}/${news.slug}</link>\n`;
      rss += `      <guid>${siteUrl}/${news.slug}</guid>\n`;
      rss += `      <pubDate>${pubDate}</pubDate>\n`;
      rss += `      <description>${escapeXml(description)}</description>\n`;
      rss += `      <content:encoded><![CDATA[${news.content}]]></content:encoded>\n`;
      if (news.author_name) {
        rss += `      <author>${escapeXml(news.author_name)}</author>\n`;
      }
      rss += '    </item>\n';
    }
  }

  rss += '  </channel>\n';
  rss += '</rss>';

  return new Response(rss, {
    headers: {
      'Content-Type': 'application/rss+xml',
      'Cache-Control': 'public, max-age=3600'
    }
  });
};

function escapeXml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
