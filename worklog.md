# Worklog - Task 1: Fix Seller Auth Redirects and Add Role System

## Summary
Fixed the seller authentication flow so that sellers are properly redirected to `seller-dashboard.html` instead of `index.html`, and added a `role` field throughout the entire stack (DB, API, auth store, UI).

## Changes Made

### TASK 1: Fix login-seller.html redirects
- **File**: `/home/z/my-project/login-seller.html`
- Changed 4 occurrences of `window.location.href = 'index.html'` to `window.location.href = 'seller-dashboard.html'`:
  - Line 887: After found seller login
  - Line 903: After demo seller login
  - Line 974: After seller registration
  - Line 1024: Check session - already logged in as seller

### TASK 2: Fix login-buyer.html - role field
- **File**: `/home/z/my-project/login-buyer.html`
- Verified all 4 places already have `role: 'buyer'`:
  - Line 796: Login handler (found user)
  - Line 805: Login handler (demo user)
  - Line 851: Register handler (users list)
  - Line 855: Register handler (session save)
- No changes needed.

### TASK 3: Add role check to seller-dashboard.html
- **File**: `/home/z/my-project/seller-dashboard.html`
- Added role check at the beginning of `init()` function:
  ```javascript
  const user = loadSellerInfo();
  if (!user || user.role !== 'seller') {
    window.location.href = 'login-seller.html';
    return;
  }
  ```

### TASK 4: Add role field to Prisma schema and update API routes
- **File**: `/home/z/my-project/prisma/schema.prisma`
  - Added `role String @default("buyer")` to User model
  - Ran `bun run db:push` to sync schema

- **File**: `/home/z/my-project/src/app/api/auth/register/route.ts`
  - Accept `role` from request body (defaults to "buyer")
  - Include `role` in `db.user.create` data
  - Include `role` in response JSON

- **File**: `/home/z/my-project/src/app/api/auth/login/route.ts`
  - Include `role` in response JSON (from `user.role`)

- **File**: `/home/z/my-project/src/app/api/auth/me/route.ts`
  - Added `role: true` to the `select` clause
  - Role is now included in the response automatically

### TASK 5: Update auth store to include role and sellerMode
- **File**: `/home/z/my-project/src/store/auth.ts`
  - Added `role: string` to `AuthUser` interface
  - Added `sellerMode: boolean` to `AuthStore` interface (defaults to `false`)
  - Added `setSellerMode: (mode: boolean) => void` to `AuthStore` interface
  - In `login` method: after setting user, if `data.role === 'seller'`, set `sellerMode: true`
  - In `register` method: same logic as login
  - In `init` method: after loading user from DB, if `data.user.role === 'seller'`, set `sellerMode: true`
  - In `logout` method: also set `sellerMode: false`

### TASK 6: Update Next.js page.tsx to use auth store sellerMode
- **File**: `/home/z/my-project/src/app/page.tsx`
  - Replaced `const [sellerMode, setSellerMode] = useState(false)` with:
    - `const sellerMode = useAuthStore((s) => s.sellerMode)`
    - `const setSellerMode = useAuthStore((s) => s.setSellerMode)`
  - Updated "Jual" button click handler: when user is not logged in, also stores `grosirpj_pending_seller` flag in localStorage
  - Added useEffect: after login, if user is a seller and pending seller flag exists, auto-set sellerMode to true

### TASK 7: Sync public HTML files
- Copied updated files to `/home/z/my-project/public/`:
  - `login-seller.html`
  - `login-buyer.html`
  - `seller-dashboard.html`
  - `grosirpj.html`

### TASK 8: Fix grosirpj.html for role-based nav display
- **File**: `/home/z/my-project/grosirpj.html`
  - Wrapped "Jual" button in a `<div id="sellerNavBtn">` container for dynamic updates
  - Updated `updateAuthUI()` function to dynamically change the nav button:
    - If `currentUser.role === 'seller'`: Show "Dashboard Seller" link (styled with emerald colors) that redirects to `seller-dashboard.html`
    - Otherwise: Show "Jual" button (original behavior)

## Verification
- `bun run lint` passed with no errors
- Dev server is running on port 3000
- All schema changes pushed to database successfully

## Browser Testing Results
- ✅ Seller registration: `login-seller.html` → register → redirects to `seller-dashboard.html`
- ✅ Seller login: `login-seller.html` → login → redirects to `seller-dashboard.html`
- ✅ Seller dashboard shows "Selamat Datang, [Name]!" correctly
- ✅ Dashboard protection: accessing `seller-dashboard.html` without login redirects to `login-seller.html`
- ✅ Buyer login: `login-buyer.html` → login → redirects to `index.html`
- ✅ Main page `grosirpj.html`: Shows "Dashboard Seller" link for seller accounts, "Jual" for buyer/guest
- ✅ Main page shows "Keluar" (logout) when logged in, "Masuk" when not

## Post-subagent fix
- Updated `auth-modal.tsx` to register as seller when `grosirpj_pending_seller` flag is set
- Updated dialog description to show seller-specific messaging when pending seller flag is active
