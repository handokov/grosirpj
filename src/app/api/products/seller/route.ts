import { NextRequest, NextResponse } from 'next/server'
import { db, ensureDb } from '@/lib/db'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// GET: List products for a seller
export async function GET(request: NextRequest) {
  try {
    await ensureDb()

    const { searchParams } = new URL(request.url)
    const sellerId = searchParams.get('sellerId')

    if (!sellerId) {
      return NextResponse.json({ error: 'sellerId is required' }, { status: 400 })
    }

    const products = await db.$queryRawUnsafe(
      `SELECT * FROM "Product" WHERE "sellerId" = ? ORDER BY "createdAt" DESC`,
      sellerId
    )

    return NextResponse.json({ success: true, products })
  } catch (error) {
    console.error('Failed to fetch seller products:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
}

// POST: Create or update a product
export async function POST(request: NextRequest) {
  try {
    await ensureDb()

    const body = await request.json()
    const { id, sellerId, name, price, originalPrice, images, category, description,
            minOrder, stock, location, variants, variantGroups, sellerName, status } = body

    if (!sellerId || !name || !price) {
      return NextResponse.json({ error: 'sellerId, name, price are required' }, { status: 400 })
    }

    const imagesJson = JSON.stringify(images || [])
    const variantsJson = typeof variants === 'string' ? variants : JSON.stringify(variants || [])
    const variantGroupsJson = typeof variantGroups === 'string' ? variantGroups : JSON.stringify(variantGroups || [])

    if (id) {
      // Update existing product
      await db.$executeRawUnsafe(`
        UPDATE "Product" SET
          "name" = ?,
          "price" = ?,
          "originalPrice" = ?,
          "images" = ?,
          "category" = ?,
          "description" = ?,
          "minOrder" = ?,
          "stock" = ?,
          "location" = ?,
          "variants" = ?,
          "variantGroups" = ?,
          "status" = ?,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ? AND "sellerId" = ?
      `, name, Number(price), Number(originalPrice || 0), imagesJson, category || 'fashion',
         description || '', Number(minOrder || 1), Number(stock || 100), location || 'Jakarta',
         variantsJson, variantGroupsJson, status || 'active', id, sellerId)

      return NextResponse.json({ success: true, productId: id })
    } else {
      // Create new product
      const productId = generateId()
      await db.$executeRawUnsafe(`
        INSERT INTO "Product" (
          "id", "sellerId", "name", "price", "originalPrice", "images",
          "category", "description", "minOrder", "stock", "location",
          "variants", "variantGroups", "sellerName", "sellerRating", "rating",
          "sold", "status", "createdAt", "updatedAt"
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, 4.5, 4.5,
          0, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `, productId, sellerId, name, Number(price), Number(originalPrice || 0), imagesJson,
         category || 'fashion', description || '', Number(minOrder || 1), Number(stock || 100),
         location || 'Jakarta', variantsJson, variantGroupsJson, sellerName || '', status || 'active')

      return NextResponse.json({ success: true, productId })
    }
  } catch (error) {
    console.error('Failed to save product:', error)
    return NextResponse.json({ error: 'Failed to save product' }, { status: 500 })
  }
}

// DELETE: Delete a product
export async function DELETE(request: NextRequest) {
  try {
    await ensureDb()

    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const sellerId = searchParams.get('sellerId')

    if (!productId || !sellerId) {
      return NextResponse.json({ error: 'productId and sellerId are required' }, { status: 400 })
    }

    await db.$executeRawUnsafe(
      `DELETE FROM "Product" WHERE "id" = ? AND "sellerId" = ?`,
      productId, sellerId
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete product:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
