# Task: Create API Routes for Orders, Reviews, and Chat

## Summary
Successfully created 4 API route files for the GrosirPJ marketplace, all verified working with lint and live API testing.

## Files Created

### 1. `/src/app/api/orders/route.ts`
- **GET**: List orders with optional query params (`buyerId`, `sellerId`, `status`)
  - Includes items with productName, and basic buyer/seller info
  - Returns `{ orders: [...] }`
- **POST**: Create new order (checkout)
  - Validates stock availability for each item
  - Calculates totalAmount from items
  - Groups items by sellerId - creates separate orders per seller
  - Uses Prisma transaction for atomic stock decrement + order creation
  - Creates OrderItem records with variant snapshot as JSON string
  - Returns `{ orders: [...] }` with status 201

### 2. `/src/app/api/orders/[id]/route.ts`
- **GET**: Get order detail by ID with full buyer/seller info
  - Returns 404 if not found
  - Includes items, buyer (with phone/address), seller (with storeName/phone)
- **PATCH**: Update order status with valid transition enforcement
  - Valid transitions: pending→paid→shipped→delivered, pending→cancelled
  - Returns 400 with descriptive error for invalid transitions
  - Returns updated order with includes

### 3. `/src/app/api/reviews/route.ts`
- **GET**: Get reviews for a product (requires `productId` query param)
  - Includes user name in each review
  - Returns `{ reviews: [...] }`
- **POST**: Create a review
  - Validates rating 1-5
  - Enforces one review per user per product (unique constraint)
  - After creating, recalculates product's average rating using Prisma aggregate
  - Returns created review with user info, status 201

### 4. `/src/app/api/chat/route.ts`
- **GET**: Dual-mode endpoint
  - With `userId` + `otherUserId`: returns messages between them (ordered ASC)
  - With only `userId`: returns list of conversations with last message, unread count, and partner info
  - Conversations sorted by most recent message first
- **POST**: Send a message
  - Validates both sender and receiver exist
  - Prevents sending to self
  - Creates chat record with `read: false`
  - Returns created message with sender/receiver info, status 201

## Testing Results
All endpoints tested and verified:
- ✅ GET /api/orders (with and without filters)
- ✅ GET /api/orders/[id] (valid and 404 cases)
- ✅ PATCH /api/orders/[id] (valid and invalid transitions)
- ✅ GET /api/reviews?productId=...
- ✅ POST /api/reviews (including duplicate review 409 error)
- ✅ GET /api/chat?userId=... (conversations mode)
- ✅ GET /api/chat?userId=...&otherUserId=... (messages mode)
- ✅ POST /api/chat
- ✅ ESLint passes with no errors

## Notes
- All routes use `Response.json()` as requested
- All routes import `db` from `@/lib/db`
- Error messages are in Indonesian (matching the marketplace's locale)
- Proper try/catch with appropriate HTTP status codes
- Next.js 16 route handler syntax with `params: Promise<{ id: string }>` pattern
