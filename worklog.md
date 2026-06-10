---
Task ID: 1
Agent: Main
Task: Fix image upload "gagal mendapatkan signature" / "Unknown API key demo_api_key" error

Work Log:
- Investigated the issue: Cloudinary env vars (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) were not configured in .env file
- Old signature endpoint (/api/upload/signature) returned demo data ("demo_api_key") when env vars missing, causing Cloudinary to reject uploads
- On Vercel, the signature endpoint also failed because Cloudinary wasn't configured
- Created new server-side upload endpoint at POST /api/upload that:
  1. Receives file from browser via FormData
  2. If Cloudinary credentials are configured: uploads to Cloudinary server-side
  3. If Cloudinary credentials are NOT configured + not on Vercel: saves to local filesystem (public/uploads/)
  4. If on Vercel without Cloudinary: returns clear error message about needing to configure env vars
- Updated seller-dashboard.tsx to use new POST /api/upload endpoint instead of signature-based direct-to-Cloudinary approach
- Updated old signature endpoint to return proper error instead of demo data
- Updated .env.example with Cloudinary documentation
- Tested with curl: upload works locally, file saved to public/uploads/grosirpj-products/, accessible via HTTP
- Verified via Agent Browser: product form renders correctly with upload section

Stage Summary:
- New upload endpoint: /src/app/api/upload/route.ts
- Updated: /src/components/seller-dashboard.tsx (handleImageUpload function)
- Updated: /src/app/api/upload/signature/route.ts (proper error instead of demo data)
- Updated: /.env.example (Cloudinary vars documented)
- For Vercel deployment: User MUST add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to Vercel Environment Variables
- For local development: Cloudinary is optional - falls back to local file storage
