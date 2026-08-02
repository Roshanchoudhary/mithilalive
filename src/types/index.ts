export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  mobile?: string;
  role: 'super_admin' | 'admin' | 'editor' | 'reporter' | 'employee' | 'user';
  avatar?: string;
  bio?: string;
  country?: string;
  state?: string;
  city?: string;
  isVerified: boolean;
  isActive: boolean;
  lastLogin?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: number;
  order: number;
  seoTitle?: string;
  seoDescription?: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Tag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: number;
  updatedAt: number;
}

export interface News {
  id: number;
  title: string;
  slug: string;
  summary?: string;
  content: string;
  featuredImage?: string;
  gallery?: string[];
  authorId: number;
  categoryId?: number;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  isFeatured: boolean;
  isBreaking: boolean;
  isSticky: boolean;
  isTrending: boolean;
  views: number;
  readingTime?: number;
  publishDate?: number;
  scheduledDate?: number;
  seoTitle?: string;
  seoDescription?: string;
  keywords?: string;
  canonicalUrl?: string;
  metaJson?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Comment {
  id: number;
  newsId: number;
  userId?: number;
  parentId?: number;
  name: string;
  email: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  likes: number;
  isSpam: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Media {
  id: number;
  filename: string;
  originalName: string;
  url: string;
  thumbnail?: string;
  webpUrl?: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  alt?: string;
  title?: string;
  caption?: string;
  folder: string;
  uploadedBy?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  group: string;
  createdAt: number;
  updatedAt: number;
}

export interface Menu {
  id: number;
  name: string;
  location: 'header' | 'footer' | 'mobile';
  items: MenuItem[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface MenuItem {
  label: string;
  href: string;
  target?: '_blank' | '_self';
  children?: MenuItem[];
}

export interface Advertisement {
  id: number;
  name: string;
  position: 'header' | 'footer' | 'sidebar' | 'article_before' | 'article_after' | 'between_paragraphs' | 'sticky_mobile' | 'sticky_desktop' | 'popup';
  code: string;
  isActive: boolean;
  startDate?: number;
  endDate?: number;
  priority: number;
  createdAt: number;
  updatedAt: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface JWTPayload {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}
