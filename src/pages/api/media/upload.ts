import type { APIRoute } from 'astro';
import { requireAuth } from '@/middleware/auth';
import { createDb } from '@/db/index';
import { optimizeImage, generateThumbnail, getImageMimeType, generateFilename, generateWebpFilename, isValidImage } from '@/utils/image';

export const POST: APIRoute = requireAuth(async (request, user) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || '/';
    const alt = formData.get('alt') as string || '';

    if (!file) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No file uploaded' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    if (!isValidImage(file.type)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid file type. Only images are allowed.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'File size too large. Max 10MB allowed.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename = generateFilename(file.name);
    const webpFilename = generateWebpFilename(file.name);

    // Get R2 bucket from environment
    const env = (request as any).env;
    const r2 = env.R2 as R2Bucket;
    const db = createDb();

    // Upload original image to R2
    const originalKey = `uploads/${folder}/${filename}`;
    await r2.put(originalKey, buffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000'
      }
    });

    // Generate and upload WebP version
    const webpBuffer = await optimizeImage(buffer, { format: 'webp', quality: 80 });
    const webpKey = `uploads/${folder}/${webpFilename}`;
    await r2.put(webpKey, webpBuffer, {
      httpMetadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000'
      }
    });

    // Generate and upload thumbnail
    const thumbnailBuffer = await generateThumbnail(buffer);
    const thumbnailFilename = `thumb-${filename}`;
    const thumbnailKey = `uploads/${folder}/thumbnails/${thumbnailFilename}`;
    await r2.put(thumbnailKey, thumbnailBuffer, {
      httpMetadata: {
        contentType: 'image/webp',
        cacheControl: 'public, max-age=31536000'
      }
    });

    // Get public URLs
    const accountId = env.CLOUDFLARE_ACCOUNT_ID;
    const bucketName = env.R2_BUCKET_NAME || 'news-media';
    const publicUrl = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`;
    
    const url = `${publicUrl}/${originalKey}`;
    const webpUrl = `${publicUrl}/${webpKey}`;
    const thumbnailUrl = `${publicUrl}/${thumbnailKey}`;

    // Save to database
    const result = await db.execute({
      sql: `
        INSERT INTO media (
          filename, original_name, url, thumbnail, webp_url,
          size, mime_type, alt, folder, uploaded_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        filename,
        file.name,
        url,
        thumbnailUrl,
        webpUrl,
        file.size,
        file.type,
        alt || file.name,
        folder || '/',
        user.id
      ]
    });

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: result.meta?.last_row_id,
        filename,
        originalName: file.name,
        url,
        webpUrl,
        thumbnailUrl,
        size: file.size,
        mimeType: file.type
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
