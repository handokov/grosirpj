---
Task ID: 1
Agent: main
Task: Implement payment (bayar) feature for GrosirPJ e-commerce

Work Log:
- Updated Prisma schema to add `paymentProof` (String) and `paidAt` (DateTime?) fields to Order model
- Ran `prisma db push` and `prisma generate` to sync database and regenerate client
- Created `/src/components/payment-dialog.tsx` - Full payment dialog component with:
  - Transfer Bank: Shows seller's bank details (bank name, account number, holder name) with copy buttons
  - E-Wallet: Shows seller's e-wallet info with copy buttons
  - COD: Simple confirmation that payment will be made on delivery
  - Payment confirmation form with sender name and optional notes
  - Already-paid state showing confirmation details and payment proof
- Updated `/src/app/api/orders/[id]/route.ts` - Added paymentProof and paidAt to PATCH endpoint
- Updated `/src/app/api/orders/route.ts` - Added bank info fields to seller select
- Updated `/src/app/api/orders/[id]/route.ts` GET - Added bank info to seller detail
- Updated `/src/components/order-history.tsx` - Added "Bayar Sekarang" button for pending orders, PaymentDialog integration
- Updated `/src/components/seller-dashboard.tsx` - Added payment method, proof display, and conditional "Konfirmasi Bayar" button
- Added "Pesanan Saya" (Order History) button to navbar in page.tsx
- Tested API endpoints: Order creation returns paymentProof/paidAt fields, Payment confirmation PATCH works correctly

Stage Summary:
- Payment feature fully implemented with 3 payment methods: Transfer Bank, E-Wallet, COD
- Seller bank details displayed to buyer during payment
- Payment confirmation updates order status from "pending" to "paid" with proof and timestamp
- Seller dashboard shows payment proof from buyers and can confirm/reject orders
- Order History accessible via "Pesanan Saya" button in navbar
- All lint checks pass
