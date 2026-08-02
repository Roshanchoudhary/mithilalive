import sharp from 'sharp';

export interface ImageOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export async function optimizeImage(buffer: Buffer, options: ImageOptions = {}) {
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    fit = 'cover'
  } = options;

  let image = sharp(buffer);

  if (width || height) {
    image = image.resize(width, height, { fit });
  }

  switch (format) {
    case 'webp':
      image = image.webp({ quality });
      break;
    case 'jpeg':
      image = image.jpeg({ quality, progressive: true });
      break;
    case 'png':
      image = image.png({ quality, compressionLevel: 9 });
      break;
  }

  return await image.toBuffer();
}

export async function generateThumbnail(buffer: Buffer, size: number = 150) {
  return await optimizeImage(buffer, {
    width: size,
    height: size,
    quality: 70,
    format: 'webp',
    fit: 'cover'
  });
}

export function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  return sharp(buffer).metadata().then(meta => ({
    width: meta.width || 0,
    height: meta.height || 0
  }));
}

export function getImageMimeType(buffer: Buffer): string {
  const signature = buffer.toString('hex', 0, 4);
  
  const mimeTypes: Record<string, string> = {
    '89504e47': 'image/png',
    'ffd8ffe0': 'image/jpeg',
    'ffd8ffe1': 'image/jpeg',
    'ffd8ffe2': 'image/jpeg',
    'ffd8ffe3': 'image/jpeg',
    'ffd8ffe8': 'image/jpeg',
    '47494638': 'image/gif',
    '52494646': 'image/webp'
  };

  return mimeTypes[signature] || 'application/octet-stream';
}

export function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg'
  };
  return extensions[mimeType] || 'bin';
}

export function generateFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = originalName.split('.').pop() || 'jpg';
  return `${timestamp}-${random}.${ext}`;
}

export function generateWebpFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}.webp`;
}

export function getFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
  return (bytes / 1073741824).toFixed(1) + ' GB';
}

export function isValidImage(mimeType: string): boolean {
  const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  return validTypes.includes(mimeType);
}

export function getImageUrl(path: string): string {
  const siteUrl = import.meta.env.SITE_URL || '';
  if (path.startsWith('http')) return path;
  return `${siteUrl}${path}`;
}
