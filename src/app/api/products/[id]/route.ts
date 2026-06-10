import { db, ensureDb } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { getAuthUser } from '@/lib/auth';

// GET /api/products/[id] — Get single product detail
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;

    const product = await db.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            name: true,
            storeName: true,
            storeDescription: true,
            city: true,
          },
        },
        variantGroups: {
          include: {
            options: true,
          },
          orderBy: { order: 'asc' },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product) {
      return Response.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Parse images from JSON string
    let images: string[] = [];
    try {
      images = JSON.parse(product.images);
    } catch {
      images = [];
    }

    // Calculate average rating from reviews
    const reviewCount = product.reviews.length;
    const averageRating =
      reviewCount > 0
        ? Math.round(
            (product.reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10
          ) / 10
        : product.rating;

    // Calculate discount percentage
    const discount =
      product.originalPrice && product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;

    return Response.json({
      ...product,
      images,
      discount,
      averageRating,
      reviewCount,
    });
  } catch (error) {
    console.error('GET /api/products/[id] error:', error);
    return Response.json(
      { error: 'Gagal mengambil detail produk' },
      { status: 500 }
    );
  }
}

// PUT /api/products/[id] — Update a product
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;

    // Require authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login untuk mengubah produk' },
        { status: 401 }
      );
    }

    // Check if product exists
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify the authenticated user owns this product
    if (existing.sellerId !== authUser.userId) {
      return Response.json(
        { error: 'Anda tidak berwenang mengubah produk ini' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      originalPrice,
      category,
      images,
      minOrder,
      stock,
      location,
      active,
      variantGroups,
    } = body;

    // Build update data — only include provided fields
    const updateData: Prisma.ProductUpdateInput = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseInt(String(price), 10);
    if (originalPrice !== undefined)
      updateData.originalPrice = parseInt(String(originalPrice), 10);
    if (category !== undefined) updateData.category = category.trim();
    if (images !== undefined) {
      updateData.images = Array.isArray(images)
        ? JSON.stringify(images)
        : '[]';
    }
    if (minOrder !== undefined) updateData.minOrder = parseInt(String(minOrder), 10);
    if (stock !== undefined) updateData.stock = parseInt(String(stock), 10);
    if (location !== undefined) updateData.location = location;
    if (active !== undefined) updateData.active = active;

    // If variantGroups is provided, delete old ones and create new ones
    if (variantGroups !== undefined) {
      // Delete existing variant groups (cascade will delete options)
      await db.variantGroup.deleteMany({ where: { productId: id } });

      // Add new variant groups to update data
      updateData.variantGroups = {
        create: Array.isArray(variantGroups)
          ? variantGroups.map(
              (group: { name: string; options: string[] }, index: number) => ({
                name: group.name,
                order: index,
                options: {
                  create: Array.isArray(group.options)
                    ? group.options.map((option: string) => ({
                        value: option,
                      }))
                    : [],
                },
              })
            )
          : [],
      };
    }

    const product = await db.product.update({
      where: { id },
      data: updateData,
      include: {
        seller: {
          select: {
            name: true,
            storeName: true,
          },
        },
        variantGroups: {
          include: {
            options: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Parse images for response
    let parsedImages: string[] = [];
    try {
      parsedImages = JSON.parse(product.images);
    } catch {
      parsedImages = [];
    }

    const discount =
      product.originalPrice && product.originalPrice > product.price
        ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0;

    return Response.json({
      ...product,
      images: parsedImages,
      discount,
    });
  } catch (error) {
    console.error('PUT /api/products/[id] error:', error);
    return Response.json(
      { error: 'Gagal memperbarui produk' },
      { status: 500 }
    );
  }
}

// DELETE /api/products/[id] — Delete a product
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;

    // Require authentication
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login untuk menghapus produk' },
        { status: 401 }
      );
    }

    // Check if product exists
    const existing = await db.product.findUnique({ where: { id } });
    if (!existing) {
      return Response.json(
        { error: 'Produk tidak ditemukan' },
        { status: 404 }
      );
    }

    // Verify the authenticated user owns this product
    if (existing.sellerId !== authUser.userId) {
      return Response.json(
        { error: 'Anda tidak berwenang menghapus produk ini' },
        { status: 403 }
      );
    }

    // Delete the product (cascade will handle variantGroups, options, reviews, orderItems)
    await db.product.delete({ where: { id } });

    return Response.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/products/[id] error:', error);
    return Response.json(
      { error: 'Gagal menghapus produk' },
      { status: 500 }
    );
  }
}
