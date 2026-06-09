import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

/**
 * GET /api/upload/signature
 * Generates a signed payload for client-side direct upload to Cloudinary.
 * This avoids sending large files through Vercel's serverless functions
 * (which have a 4.5MB body size limit).
 */
export async function GET(request: NextRequest) {
  try {
    const folder = request.nextUrl.searchParams.get('folder') || 'grosirpj/products'
    const timestamp = Math.round(new Date().getTime() / 1000)

    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp,
        folder,
        transformation: 'q_auto:good,f_auto',
      },
      process.env.CLOUDINARY_API_SECRET!
    )

    return NextResponse.json({
      signature,
      timestamp,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      folder,
    })
  } catch (error: any) {
    console.error('[upload/signature] Error:', error)
    return NextResponse.json(
      { error: 'Gagal membuat signature' },
      { status: 500 }
    )
  }
}
