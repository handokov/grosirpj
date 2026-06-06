# Task 7 - Auth & Shipping Agent

## Task
Add authentication (login/register modal), shipping cost estimation, and city selection to `/home/z/my-project/grosirpj.html`

## Work Completed

### 1. Authentication (Login/Register Modal)
- Added auth modal overlay with CSS animations (scale + translate)
- Two tabs: "Masuk" (Login) and "Daftar" (Register)
- Login form: Email + Password + error display
- Register form: Name + Email + Password + City dropdown (30 cities) + error display
- Demo login: any email with password >= 6 chars
- Register saves to localStorage and auto-logs in

### 2. City Selection on Registration
- 30 Indonesian cities in dropdown: Jakarta, Surabaya, Bandung, Semarang, Yogyakarta, Solo, Medan, Palembang, Pekanbaru, Padang, Lampung, Makassar, Manado, Denpasar, Balikpapan, Banjarmasin, Pontianak, Samarinda, Lombok, Kupang, Ambon, Jayapura, Pekalongan, Malang, Tangerang, Bekasi, Depok, Bogor, Cirebon, Batu
- Default: Jakarta
- Stored in localStorage with user data

### 3. Shipping Cost Estimation
- Added "Estimasi Pengiriman" section in product detail panel
- Shows when logged in: Dari, Ke (with MapPin), Jarak, Ongkos Kirim, Estimasi, Kurir
- Shows when not logged in: "Login untuk melihat estimasi ongkir" + "Login Sekarang" button
- Haversine distance calculation between city coordinates
- Same city: Gratis Ongkir, 1-2 hari
- Same island: distance-based tiers, 1-4 hari
- Different island: distance-based tiers, 3-8 hari
- Max cost capped at 80,000

### 4. Auth State Management
- currentUser variable with localStorage persistence
- loadUser(), saveUser(), requireLogin(), logout() functions
- updateAuthUI() refreshes navbar display and re-renders affected components

### 5. Updated Existing Functions
- addToCart() → checks requireLogin() first
- openCart() → checks requireLogin() first
- Product card quick-add buttons → lock icon + requireLogin() when not logged in
- Detail "Tambah ke Keranjang" → "Login untuk Beli" with lock icon when not logged in
- Cart sidebar shows per-item shipping cost + total shipping
- Total price in detail footer includes shipping cost

### Navbar Auth UI
- Not logged in: "Masuk" button (green)
- Logged in: avatar circle + name + MapPin + city + logout button

All existing features preserved: flash sale, categories, products, cart, detail, toast, countdown, reveal animations.
