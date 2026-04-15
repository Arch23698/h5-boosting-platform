/**
 * 钱包余额 API
 * GET /api/wallet/balance
 * 获取当前用户的账户余额和交易记录
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取用户信息（包含余额）
    const userData = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        role: true,
        balance: true,
      },
    });

    // 获取最近的交易记录
    const transactions = await prisma.transaction.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      user: userData,
      transactions,
    });
  } catch (error) {
    console.error('获取余额失败:', error);
    return NextResponse.json({ error: '获取余额失败' }, { status: 500 });
  }
}
