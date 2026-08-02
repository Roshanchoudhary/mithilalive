export interface SeoData {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  keywords?: string[];
  siteName?: string;
}

export function generateSeoTags(data: SeoData) {
  const siteName = data.siteName || import.meta.env.SITE_NAME || 'News Portal';
  const siteUrl = import.meta.env.SITE_URL || 'https://your-domain.com';
  const fullTitle = data.title === siteName ? siteName : `${data.title} | ${siteName}`;
  const imageUrl = data.image?.startsWith('http') ? data.image : `${siteUrl}${data.image || '/images/og-default.jpg'}`;
  const canonicalUrl = data.url ? `${siteUrl}${data.url}` : siteUrl;

  return {
    title: fullTitle,
    meta: [
      { name: 'description', content: data.description },
      { name: 'keywords', content: data.keywords?.join(', ') },
      { name: 'author', content: data.author },
      { property: 'og:title', content: fullTitle },
      { property: 'og:description', content: data.description },
      { property: 'og:type', content: data.type || 'website' },
      { property: 'og:url', content: canonicalUrl },
      { property: 'og:image', content: imageUrl },
      { property: 'og:site_name', content: siteName },
      { property: 'article:published_time', content: data.publishedTime },
      { property: 'article:modified_time', content: data.modifiedTime },
      { property: 'article:author', content: data.author },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: fullTitle },
      { name: 'twitter:description', content: data.description },
      { name: 'twitter:image', content: imageUrl }
    ],
    link: [
      { rel: 'canonical', href: canonicalUrl }
    ]
  };
}

export function generateArticleSchema(data: {
  title: string;
  description: string;
  image: string;
  url: string;
  author: string;
  publishedTime: string;
  modifiedTime: string;
  category?: string;
  tags?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: data.title,
    description: data.description,
    image: data.image,
    url: data.url,
    author: {
      '@type': 'Person',
      name: data.author
    },
    datePublished: data.publishedTime,
    dateModified: data.modifiedTime,
    articleSection: data.category,
    keywords: data.tags?.join(', '),
    publisher: {
      '@type': 'Organization',
      name: import.meta.env.SITE_NAME || 'News Portal'
    }
  };
}

export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: import.meta.env.SITE_NAME || 'News Portal',
    url: import.meta.env.SITE_URL || 'https://your-domain.com',
    logo: `${import.meta.env.SITE_URL || 'https://your-domain.com'}/images/logo.png`,
    sameAs: [
      'https://facebook.com/yourpage',
      'https://twitter.com/yourpage',
      'https://youtube.com/yourpage'
    ]
  };
}

export function generateSitemap(items: Array<{ url: string; lastmod: string; priority: number; changefreq: string }>) {
  let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
  sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  for (const item of items) {
    sitemap += '  <url>\n';
    sitemap += `    <loc>${item.url}</loc>\n`;
    sitemap += `    <lastmod>${item.lastmod}</lastmod>\n`;
    sitemap += `    <priority>${item.priority}</priority>\n`;
    sitemap += `    <changefreq>${item.changefreq}</changefreq>\n`;
    sitemap += '  </url>\n';
  }
  
  sitemap += '</urlset>';
  return sitemap;
}

export function generateRSSFeed(items: Array<{ title: string; description: string; link: string; pubDate: string; guid: string }>) {
  const siteName = import.meta.env.SITE_NAME || 'News Portal';
  const siteUrl = import.meta.env.SITE_URL || 'https://your-domain.com';
  
  let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
  rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
  rss += '  <channel>\n';
  rss += `    <title>${siteName}</title>\n`;
  rss += `    <link>${siteUrl}</link>\n`;
  rss += `    <description>Latest news from ${siteName}</description>\n`;
  rss += `    <atom:link href="${siteUrl}/feed.xml" rel="self" type="application/rss+xml" />\n`;
  
  for (const item of items) {
    rss += '    <item>\n';
    rss += `      <title>${item.title}</title>\n`;
    rss += `      <description>${item.description}</description>\n`;
    rss += `      <link>${item.link}</link>\n`;
    rss += `      <pubDate>${item.pubDate}</pubDate>\n`;
    rss += `      <guid>${item.guid}</guid>\n`;
    rss += '    </item>\n';
  }
  
  rss += '  </channel>\n';
  rss += '</rss>';
  return rss;
}

export function generateRobotsTxt(allowCrawl: boolean = true): string {
  let robots = '# robots.txt\n';
  robots += `User-agent: *\n`;
  robots += `Allow: /\n`;
  robots += `Disallow: /admin/\n`;
  robots += `Disallow: /employee/\n`;
  robots += `Disallow: /api/\n`;
  robots += `Sitemap: ${import.meta.env.SITE_URL || 'https://your-domain.com'}/sitemap.xml\n`;
  return robots;
}
