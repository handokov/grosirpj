# GrosirPJ Backup - v1.4-turso-migration

**Date**: 2026-06-09
**Status**: ✅ Working on Vercel + Turso

## GitHub Tags (Code Backup)
| Tag | Description |
|-----|-------------|
| v1.0-seller-notif | Initial + seller notifications |
| v1.1-structured-db | Structured database |
| v1.2-white-chat-bg | White chat background |
| v1.2-vercel-db-fix | Vercel DB fix |
| v1.3-payment-order-history | Payment & order history |
| **v1.4-turso-migration** | **Turso cloud DB migration** ← CURRENT |

## Turso Database (Data Backup)
- **URL**: libsql://grosirpj-handokov.aws-ap-northeast-1.turso.io
- **Setup Script**: `scripts/turso-setup.ts`

### Data Counts
| Table | Rows |
|-------|------|
| User | 7 |
| UserAddress | 7 |
| Product | 30 |
| VariantGroup | 35 |
| VariantOption | 134 |
| OrderItem | 10 |
| Review | 12 |
| Chat | 10 |
| Notification | 11 |
| CartItem | 5 |
| ProductView | 11 |
| SearchHistory | 10 |

## Vercel Environment Variables
| Variable | Value |
|----------|-------|
| DATABASE_URL | libsql://grosirpj-handokov.aws-ap-northeast-1.turso.io |
| TURSO_AUTH_TOKEN | (sensitive - check Vercel dashboard) |

## How to Restore
1. **Code**: `git checkout v1.4-turso-migration`
2. **Database**: `bun run scripts/turso-setup.ts` (recreates schema + seeds data)
3. **Deploy**: Push to GitHub → Vercel auto-deploys
