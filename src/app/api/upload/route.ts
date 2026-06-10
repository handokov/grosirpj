import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAuthUser } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

// POST /api/upload — Server-side image upload (Cloudinary or local fallback)
export async function POST(request: Request) {
  try {
    // Require authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengupload file' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'grosirpj/products';

    if (!file) {
      return NextResponse.json(
        { error: 'File tidak ditemukan' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format tidak didukung (JPG, PNG, WebP, GIF)' },
        { status: 400 }
      );
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File terlalu besar (maks 10MB)' },
        { status: 400 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // If Cloudinary is configured, upload to Cloudinary
    if (cloudName && apiKey && apiSecret) {
      try {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
          secure: true,
        });

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: folder,
                transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
                resource_type: 'image',
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result);
              }
            )
            .end(buffer);
        });

        const uploadResult = result as { secure_url: string; public_id: string };
        return NextResponse.json({
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          provider: 'cloudinary',
        });
      } catch (cloudErr: any) {
        console.error('Cloudinary upload error, falling back to local:', cloudErr.message);
        // Fall through to local storage
      }
    }

    // On production (Vercel), local filesystem is ephemeral/read-only — require Cloudinary
    if (process.env.VERCEL) {
      console.error('Cloudinary not configured on Vercel — image upload unavailable');
      return NextResponse.json(
        { error: 'Upload gagal: Cloudinary belum dikonfigurasi. Silakan set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di Vercel Environment Variables.' },
        { status: 503 }
      );
    }

    // Fallback: Save to local filesystem (development only)
    try {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Generate unique filename
      const ext = path.extname(file.name) || '.jpg';
      const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;

      // Map cloudinary folder to local path
      const localFolder = folder.replace(/\//g, '-'); // e.g., "grosirpj-products"
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', localFolder);
      await mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, uniqueName);
      await writeFile(filePath, buffer);

      const url = `/uploads/${localFolder}/${uniqueName}`;
      return NextResponse.json({
        url,
        publicId: `local/${localFolder}/${uniqueName}`,
        provider: 'local',
      });
    } catch (localErr: any) {
      console.error('Local upload error:', localErr);
      return NextResponse.json(
        { error: 'Gagal menyimpan file: ' + localErr.message },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Gagal mengupload file' },
      { status: 500 }
    );
  }
}
