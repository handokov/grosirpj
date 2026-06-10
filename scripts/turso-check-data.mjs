#!/usr/bin/env node
import { createClient } from '@libsql/client';

const databaseUrl = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url: databaseUrl, authToken });

async function main() {
  const tables = ['User', 'Product', 'Order', 'OrderItem', 'Review', 'Chat', 'Notification', 'Wishlist', 'CartItem', 'VariantGroup', 'VariantOption', 'UserAddress', 'ProductView', 'SearchHistory'];
  
  console.log('=== Turso Database Data Count ===\n');
  
  let totalRows = 0;
  for (const table of tables) {
    try {
      const result = await client.execute(`SELECT COUNT(*) as count FROM "${table}"`);
      const count = Number(result.rows[0].count);
      totalRows += count;
      console.log(`  ${table}: ${count} rows`);
    } catch (e) {
      console.log(`  ${table}: ERROR - ${e.message}`);
    }
  }
  
  console.log(`\nTotal rows: ${totalRows}`);
}

main().catch(e => { console.error(e); process.exit(1); });
