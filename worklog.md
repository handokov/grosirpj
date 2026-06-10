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

---
Task ID: 2
Agent: Main
Task: Fix all critical security issues - SQL injection, no auth, dual system conflicts

Work Log:
- Audited all 25 API routes comprehensively
- Deleted /api/products/seller (raw SQL, no auth, broken schema refs)
- Deleted /api/debug (exposes DB tables and env info, no auth)
- Replaced 14 raw SQL DELETE statements in /api/seed with Prisma ORM deleteMany()
- Added auth (getAuthUser) to all 17 unauthenticated endpoints:
  - cart (GET/POST/PATCH/DELETE), addresses (all 4), chat (GET/PATCH/POST)
  - notifications (GET/PATCH), wishlist (GET/POST), reviews (POST)
  - search-history (GET/POST/DELETE), product-views (GET/POST)
  - seed (GET/POST - also blocked in production)
  - orders GET, orders/[id] GET, products/stats GET
- Fixed IDOR in /api/auth/me - removed ?userId= query param fallback
- Fixed auth bypass in /api/orders/[id] PATCH - removed body.userId fallback
- Fixed /api/health - removed password hash status leak
- Fixed payment-dialog.tsx - replaced IDOR call to /api/auth/me?userId= with /api/orders/[id]
- Removed unused /src/lib/hash.ts (duplicate of simpleHash)
- Removed simpleHash import from /src/lib/db.ts and /src/app/api/seed/route.ts
- simpleHash kept in /src/lib/auth.ts for backward compatibility (legacy password verification + auto-upgrade to bcrypt on login)

Stage Summary:
- SQL Injection: ELIMINATED - all user-facing raw SQL removed, only schema creation DDL remains in db.ts
- No Auth: FIXED - all endpoints now require JWT authentication, userId from JWT not client
- Password Hash: simpleHash only for backward compat, bcrypt for all new passwords, auto-upgrade on login
- Dual System: FIXED - deleted legacy /api/products/seller, all endpoints now use Prisma ORM
- ChatUser/Message models: NOT needed - Chat model serves both purposes correctly
- /api/upload/signature: EXISTS and properly secured with auth
