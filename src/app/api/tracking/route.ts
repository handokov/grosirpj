import { NextRequest, NextResponse } from 'next/server';
import {
  generateTrackingData,
  getCachedTracking,
  setCachedTracking,
  simulateProgressUpdate,
} from '@/lib/tracking-simulation';

// ===== GET /api/tracking?resi=XXX&kurir=JNE&origin=Jakarta&destination=Surabaya =====
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const resi = searchParams.get('resi');
  const kurir = searchParams.get('kurir') || 'JNE';
  const origin = searchParams.get('origin') || 'Jakarta';
  const destination = searchParams.get('destination') || 'Surabaya';

  if (!resi) {
    return NextResponse.json(
      { error: 'Nomor resi wajib diisi' },
      { status: 400 }
    );
  }

  const cacheKey = `${resi}-${kurir}`;

  try {
    // Check cache first
    const cached = getCachedTracking(cacheKey);
    if (cached) {
      // Simulate progress update on cache hit (like real API would show new data)
      const updated = simulateProgressUpdate(cached);
      setCachedTracking(cacheKey, updated);
      return NextResponse.json({
        success: true,
        data: updated,
        cached: true,
      });
    }

    // Generate tracking data (simulating API call to expedition)
    // In production, this would be a real API call:
    // const response = await fetch(`https://api.binderbyte.com/waybill?api_key=XXX&courier=${kurir}&awb=${resi}`);

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));

    const trackingData = generateTrackingData(resi, kurir, origin, destination);

    // Cache the result
    setCachedTracking(cacheKey, trackingData);

    return NextResponse.json({
      success: true,
      data: trackingData,
      cached: false,
    });
  } catch (error) {
    console.error('Tracking API error:', error);
    return NextResponse.json(
      { error: 'Gagal mengambil data tracking. Coba lagi nanti.' },
      { status: 500 }
    );
  }
}
