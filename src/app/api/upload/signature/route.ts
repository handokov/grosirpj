import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getAuthUser } from '@/lib/auth';

// GET /api/upload/signature — Generate a Cloudinary upload signature for direct browser uploads
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

    // If Cloudinary env vars are not set, return mock/demo data so the app doesn't crash
    if (!cloudName || !apiKey || !apiSecret) {
      console.warn('Cloudinary env vars not configured, returning demo signature data');
      return NextResponse.json({
        signature: 'demo_signature',
        timestamp: Math.round(new Date().getTime() / 1000),
        apiKey: 'demo_api_key',
        cloudName: 'demo_cloud_name',
        folder: 'grosirpj/products',
      });
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
