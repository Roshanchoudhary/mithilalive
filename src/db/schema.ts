import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  mobile: text('mobile'),
  role: text('role').notNull().default('user'),
  avatar: text('avatar'),
  bio: text('bio'),
  country: text('country'),
  state: text('state'),
  city: text('city'),
  isVerified: integer('is_verified').default(0),
  isActive: integer('is_active').default(1),
  lastLogin: integer('last_login'),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  icon: text('icon'),
  image: text('image'),
  parentId: integer('parent_id'),
  order: integer('order').default(0),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  isActive: integer('is_active').default(1),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const tags = sqliteTable('tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const news = sqliteTable('news', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  summary: text('summary'),
  content: text('content').notNull(),
  featuredImage: text('featured_image'),
  gallery: text('gallery'),
  authorId: integer('author_id').notNull().references(() => users.id),
  categoryId: integer('category_id').references(() => categories.id),
  status: text('status').notNull().default('draft'),
  isFeatured: integer('is_featured').default(0),
  isBreaking: integer('is_breaking').default(0),
  isSticky: integer('is_sticky').default(0),
  isTrending: integer('is_trending').default(0),
  views: integer('views').default(0),
  readingTime: integer('reading_time'),
  publishDate: integer('publish_date'),
  scheduledDate: integer('scheduled_date'),
  seoTitle: text('seo_title'),
  seoDescription: text('seo_description'),
  keywords: text('keywords'),
  canonicalUrl: text('canonical_url'),
  metaJson: text('meta_json'),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const newsTags = sqliteTable('news_tags', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  newsId: integer('news_id').notNull().references(() => news.id, { onDelete: 'cascade' }),
  tagId: integer('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
});

export const comments = sqliteTable('comments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  newsId: integer('news_id').notNull().references(() => news.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  parentId: integer('parent_id').references(() => comments.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull().default('pending'),
  likes: integer('likes').default(0),
  isSpam: integer('is_spam').default(0),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const commentReports = sqliteTable('comment_reports', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  commentId: integer('comment_id').notNull().references(() => comments.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
  reason: text('reason').notNull(),
  status: text('status').default('pending'),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const media = sqliteTable('media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  url: text('url').notNull(),
  thumbnail: text('thumbnail'),
  webpUrl: text('webp_url'),
  size: integer('size'),
  mimeType: text('mime_type'),
  width: integer('width'),
  height: integer('height'),
  alt: text('alt'),
  title: text('title'),
  caption: text('caption'),
  folder: text('folder').default('/'),
  uploadedBy: integer('uploaded_by').references(() => users.id),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value'),
  group: text('group').default('general'),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const menus = sqliteTable('menus', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  location: text('location').notNull(),
  items: text('items'),
  isActive: integer('is_active').default(1),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const advertisements = sqliteTable('advertisements', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  position: text('position').notNull(),
  code: text('code').notNull(),
  isActive: integer('is_active').default(1),
  startDate: integer('start_date'),
  endDate: integer('end_date'),
  priority: integer('priority').default(0),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});

export const analytics = sqliteTable('analytics', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  newsId: integer('news_id').references(() => news.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  referer: text('referer'),
  data: text('data'),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type'),
  link: text('link'),
  isRead: integer('is_read').default(0),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  ip: text('ip'),
  userAgent: text('user_agent'),
  expiresAt: integer('expires_at').notNull(),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const activityLogs = sqliteTable('activity_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  target: text('target'),
  targetId: integer('target_id'),
  details: text('details'),
  ip: text('ip'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
});

export const permissions = sqliteTable('permissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  role: text('role').notNull().unique(),
  permissions: text('permissions'),
  createdAt: integer('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at').default(sql`CURRENT_TIMESTAMP`),
});
