import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAuthUser } from '@/lib/auth';

// GET /api/upload/signature — Generate a Cloudinary upload signature for direct browser uploads
// NOTE: Prefer using POST /api/upload instead, which handles server-side upload with local fallback.
// This signature endpoint is kept for backward compatibility but requires Cloudinary credentials.
export async function GET(request: Request) {
  try {
    // Require authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Anda harus login untuk mengupload file' },
        { status: 401 }
      );
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // If Cloudinary env vars are not set, return error with guidance
    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        {
          error: 'Upload belum dikonfigurasi. Silakan set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di environment variables, atau gunakan server-side upload (POST /api/upload).',
        },
        { status: 503 }
      );
    }

    // Get folder from query params (default: grosirpj/products)
    const { searchParams } = new URL(request.url);
    const folder = searchParams.get('folder') || 'grosirpj/products';

    const timestamp = Math.round(new Date().getTime() / 1000);

    // Generate signature using Cloudinary SDK
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      apiSecret
    );

    return NextResponse.json({
      signature,
      timestamp,
      apiKey,
      cloudName,
      folder,
    });
  } catch (error) {
    console.error('Generate upload signature error:', error);
    return NextResponse.json(
      { error: 'Gagal membuat signature upload' },
      { status: 500 }
    );
  }
}
