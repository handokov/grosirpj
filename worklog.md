---
Task ID: 1
Agent: main-agent
Task: Upgrade GrosirPJ to Next.js with new features (Wishlist, Review Submission, Notifications)

Work Log:
- Reviewed entire existing Next.js codebase (already comprehensive with 30 products, auth, cart, checkout, chat, seller dashboard)
- Added Wishlist model to Prisma schema (Wishlist with userId, productId, unique constraint)
- Added Notification model to Prisma schema (Notification with userId, title, message, type, read, link)
- Pushed schema changes with `bun run db:push`
- Created Wishlist API route at /api/wishlist (GET for listing, POST for toggle)
- Created Wishlist Zustand store at /store/wishlist.ts
- Created Notification API route at /api/notifications (GET for listing, PATCH for marking read)
- Created Notification Zustand store at /store/notification.ts
- Added Wishlist heart button to ProductGrid component on every product card
- Added Wishlist heart button to ProductDetail component on product image
- Added Review submission form to ProductDetail reviews tab (star rating + comment)
- Added Notification bell dropdown to Navbar with unread count badge
- Added Wishlist indicator to Navbar with count badge
- Added seed notifications (6 sample notifications for buyers and sellers)
- Updated seed route to delete new tables and create notification data
- Reseeded database successfully
- All lint checks pass

Stage Summary:
- Wishlist feature: Users can toggle products as favorites via heart buttons in product grid and detail view
- Review submission: Logged-in users can submit reviews with star rating and comment text
- Notification system: Bell icon in navbar shows unread count, dropdown shows notification list with mark-as-read
- All new features integrated into existing UI seamlessly
- Database now has Wishlist and Notification tables with proper indexes
