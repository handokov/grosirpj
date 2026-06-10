import { db, ensureDb } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// POST /api/withdraw - Seller requests withdrawal
export async function POST(request: Request) {
  try {
    await ensureDb();

    const authUser = await getAuthUser(request);
    if (!authUser) {
      return Response.json(
        { error: 'Anda harus login untuk menarik saldo' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, amount } = body;

    // Verify the authenticated user matches
    if (authUser.userId !== userId) {
      return Response.json(
        { error: 'Anda tidak berwenang melakukan penarikan ini' },
        { status: 403 }
      );
    }

    // Validate amount
    if (!amount || amount < 10000) {
      return Response.json(
        { error: 'Minimum penarikan Rp 10.000' },
        { status: 400 }
      );
    }

    // Get user's current balance
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        sellerBalance: true,
        bankName: true,
        bankAccount: true,
        bankHolder: true,
      },
    });

    if (!user) {
      return Response.json(
        { error: 'User tidak ditemukan' },
        { status: 404 }
      );
    }

    if (!user.bankName || !user.bankAccount) {
      return Response.json(
        { error: 'Informasi rekening bank belum lengkap. Silakan lengkapi di profil.' },
        { status: 400 }
      );
    }

    if (amount > user.sellerBalance) {
      return Response.json(
        { error: 'Saldo tidak mencukupi' },
        { status: 400 }
      );
    }

    // Deduct balance
    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        sellerBalance: { decrement: amount },
      },
    });

    // Create notification
    try {
      await db.notification.create({
        data: {
          userId,
          title: '💸 Penarikan Diproses',
          message: `Penarikan Rp ${amount.toLocaleString('id-ID')} sedang diproses. Dana akan ditransfer ke ${user.bankName} ${user.bankAccount} dalam 1-2 hari kerja.`,
          type: 'payment',
        },
      });
    } catch {
      // Don't fail if notification creation fails
    }

    return Response.json({
      success: true,
      message: 'Penarikan berhasil diproses',
      newBalance: updatedUser.sellerBalance,
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return Response.json(
      { error: 'Gagal memproses penarikan' },
      { status: 500 }
    );
  }
}
