import { db, ensureDb } from '@/lib/db';
import { Prisma } from '@prisma/client';

// GET /api/products — List, search, filter, paginate products
export async function GET(request: Request) {
  try {
    await ensureDb();
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const sortBy = searchParams.get('sortBy') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const sellerId = searchParams.get('sellerId') || '';
    const activeParam = searchParams.get('active');
    const active = activeParam === 'false' ? false : true;

    // Build where clause
    const where: Prisma.ProductWhereInput = {
      active,
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    if (category) {
      where.category = category;
    }

    if (sellerId) {
      where.sellerId = sellerId;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        (where.price as Prisma.IntFilter).gte = parseInt(minPrice, 10);
      }
      if (maxPrice) {
        (where.price as Prisma.IntFilter).lte = parseInt(maxPrice, 10);
      }
    }

    // Build orderBy
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    switch (sortBy) {
      case 'popular':
        orderBy = { sold: 'desc' };
        break;
      case 'price-asc':
        orderBy = { price: 'asc' };
        break;
      case 'price-desc':
        orderBy = { price: 'desc' };
        break;
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'newest':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
          _count: {
            select: { reviews: true },
          },
        },
      }),
      db.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const formattedProducts = products.map((product) => {
      const { _count, ...rest } = product;
      let images: string[] = [];
      try {
        images = JSON.parse(rest.images);
      } catch {
        images = [];
      }

      const discount =
        rest.originalPrice && rest.originalPrice > rest.price
          ? Math.round(((rest.originalPrice - rest.price) / rest.originalPrice) * 100)
          : 0;

      return {
        id: rest.id,
        name: rest.name,
        description: rest.description,
        price: rest.price,
        originalPrice: rest.originalPrice,
        discount,
        category: rest.category,
        images,
        minOrder: rest.minOrder,
        stock: rest.stock,
        location: rest.location,
        active: rest.active,
        sold: rest.sold,
        rating: rest.rating,
        sellerId: rest.sellerId,
        seller: rest.seller,
        variantGroups: rest.variantGroups,
        reviewCount: _count.reviews,
        createdAt: rest.createdAt,
      };
    });

    return Response.json({
      products: formattedProducts,
      total,
      page,
      totalPages,
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return Response.json(
      { error: 'Gagal mengambil data produk' },
      { status: 500 }
    );
  }
}

// POST /api/products — Create a new product (seller only)
export async function POST(request: Request) {
  try {
    await ensureDb();
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
      sellerId,
      variantGroups,
    } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return Response.json(
        { error: 'Nama produk wajib diisi' },
        { status: 400 }
      );
    }
    if (price === undefined || price === null || price <= 0) {
      return Response.json(
        { error: 'Harga produk wajib diisi dan harus lebih dari 0' },
        { status: 400 }
      );
    }
    if (!category || !category.trim()) {
      return Response.json(
        { error: 'Kategori produk wajib diisi' },
        { status: 400 }
      );
    }
    if (!sellerId || !sellerId.trim()) {
      return Response.json(
        { error: 'Seller ID wajib diisi' },
        { status: 400 }
      );
    }

    // Verify seller exists and is a seller
    const seller = await db.user.findUnique({ where: { id: sellerId } });
    if (!seller) {
      return Response.json(
        { error: 'Seller tidak ditemukan' },
        { status: 404 }
      );
    }
    if (seller.role !== 'seller') {
      return Response.json(
        { error: 'Hanya seller yang dapat menambahkan produk' },
        { status: 403 }
      );
    }

    const imagesJson = Array.isArray(images) ? JSON.stringify(images) : '[]';

    const product = await db.product.create({
      data: {
        name: name.trim(),
        description: description || '',
        price: parseInt(String(price), 10),
        originalPrice: originalPrice ? parseInt(String(originalPrice), 10) : 0,
        category: category.trim(),
        images: imagesJson,
        minOrder: minOrder ? parseInt(String(minOrder), 10) : 1,
        stock: stock ? parseInt(String(stock), 10) : 0,
        location: location || 'Jakarta',
        sellerId,
        variantGroups: {
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
        },
      },
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

    return Response.json(
      {
        ...product,
        images: parsedImages,
        discount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/products error:', error);
    return Response.json(
      { error: 'Gagal membuat produk' },
      { status: 500 }
    );
  }
}
