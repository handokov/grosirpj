---
Task ID: 1
Agent: Main Agent
Task: Implement notification deep linking and per-store cart checkout

Work Log:
- Explored codebase: notification panel, cart sidebar, checkout flow, chat panel, order history
- Added chat notification creation in /api/chat/route.ts POST handler (type: 'chat', link: '/chat/{senderId}')
- Updated notification-panel.tsx: clicking notifications now navigates based on type
  - type 'chat' → opens Chat panel with specific partner
  - all other types → opens Order History
- Updated navbar notification dropdown in page.tsx: same deep linking behavior
- Added visual hints: "→ Buka Chat" for chat notifications, "→ Lihat Pesanan" for order notifications
- Updated store/ui.ts: added checkoutSellerId state for per-store checkout
- Updated store/cart.ts: added removeItemsBySeller, getSellerItems, getSellerSubtotal methods
- Rewrote cart-sidebar.tsx: items grouped by store with per-store checkout buttons
- Updated checkout-flow.tsx: accepts sellerId filter, shows store name badge, removes only checked-out seller's items on success
- All changes pass lint check
- Verified with agent browser:
  - Cart groups items by store (CV Garment Prima, Elektronik Surabaya)
  - Each store group has its own "Checkout {storeName}" button
  - Clicking chat notification opens Chat panel with the sender
  - Clicking order/shipping notification opens Order History
  - Checkout flow shows the specific store name

Stage Summary:
- Notification deep linking: ✅ Working (chat → Chat panel, order → Order History)
- Per-store cart checkout: ✅ Working (grouped by store, separate checkout buttons)
- Chat notification creation: ✅ Working (creates type 'chat' with link '/chat/{senderId}')
