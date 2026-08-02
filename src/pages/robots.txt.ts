import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const siteUrl = import.meta.env.SITE_URL || 'https://your-domain.com';
  
  const robots = `# robots.txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /employee/
Disallow: /api/
Disallow: /login/
Disallow: /register/
Disallow: /search?*

# Sitemap
Sitemap: ${siteUrl}/sitemap.xml

# Crawl-delay
Crawl-delay: 10

# Host
Host: ${siteUrl.replace('https://', '').replace('http://', '')}
`;

  return new Response(robots, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400'
    }
  });
};
