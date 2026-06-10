import { db, ensureDb } from '@/lib/db';
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

// PATCH /api/auth/profile - Update user profile
export async function PATCH(request: Request) {
  try {
    await ensureDb();

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Anda harus login' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      name,
      phone,
      city,
      address,
      province,
      postalCode,
      avatar,
      gender,
      dateOfBirth,
      // Seller fields
      storeName,
      storeDescription,
      storeAvatar,
      bankName,
      bankAccount,
      bankHolder,
    } = body;

    // Build update data - only include fields that are provided
    const updateData: Record<string, unknown> = {};

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (city !== undefined) updateData.city = city;
    if (address !== undefined) updateData.address = address;
    if (province !== undefined) updateData.province = province;
    if (postalCode !== undefined) updateData.postalCode = postalCode;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (gender !== undefined) updateData.gender = gender;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

    // Seller-only fields
    if (authUser.role === 'seller') {
      if (storeName !== undefined) updateData.storeName = storeName;
      if (storeDescription !== undefined) updateData.storeDescription = storeDescription;
      if (storeAvatar !== undefined) updateData.storeAvatar = storeAvatar;
      if (bankName !== undefined) updateData.bankName = bankName;
      if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
      if (bankHolder !== undefined) updateData.bankHolder = bankHolder;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Tidak ada data yang diupdate' },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: authUser.userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        city: true,
        address: true,
        province: true,
        postalCode: true,
        avatar: true,
        gender: true,
        dateOfBirth: true,
        role: true,
        phone: true,
        storeName: true,
        storeDescription: true,
        storeAvatar: true,
        bankName: true,
        bankAccount: true,
        bankHolder: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'Gagal mengupdate profil' },
      { status: 500 }
    );
  }
}
