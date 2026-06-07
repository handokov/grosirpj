# Task 2-a: Wishlist and Notification API Routes and Zustand Stores

## Agent: wishlist-api-store-agent

## Task Summary
Created Wishlist and Notification API routes and their corresponding Zustand stores for the GrosirPJ marketplace.

## Files Created

### 1. `/home/z/my-project/src/app/api/wishlist/route.ts`
- **GET**: Accepts `userId` query param, returns wishlist items with full product details (including seller info). Parses JSON images field from product.
- **POST**: Accepts `{userId, productId}` body, toggles wishlist entry. Uses the `@@unique([userId, productId])` constraint via `findUnique` on the compound key. Returns `{added: boolean}`.

### 2. `/home/z/my-project/src/store/wishlist.ts`
- `items: string[]` — stores product IDs in wishlist
- `loading: boolean` — loading state
- `fetchWishlist(userId)` — fetches from API, populates items array with product IDs
- `toggleWishlist(userId, productId)` — calls POST API, optimistically updates items array
- `isWishlisted(productId)` — checks if product ID exists in items

### 3. `/home/z/my-project/src/app/api/notifications/route.ts`
- **GET**: Accepts `userId` query param, returns notifications ordered by `createdAt` desc
- **PATCH**: Accepts `{id}` to mark single notification as read, or `{markAllRead: true, userId}` to mark all as read. Uses `updateMany` for bulk updates.

### 4. `/home/z/my-project/src/store/notification.ts`
- `notifications: NotificationItem[]` — full notification objects
- `unreadCount: number` — derived count of unread notifications
- `loading: boolean` — loading state
- `fetchNotifications(userId)` — fetches from API, calculates unread count
- `markAsRead(id)` — calls PATCH API, updates local state
- `markAllAsRead(userId)` — calls PATCH API with markAllRead, updates local state

## Lint Status
- All files pass `bun run lint` with no errors
