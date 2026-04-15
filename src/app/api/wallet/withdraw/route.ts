/**
 * 提现 API
 * POST /api/wallet/withdraw
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { amount } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '请输入有效的提现金额' }, { status: 400 });
    }

    if (amount < 10) {
      return NextResponse.json({ error: '提现金额最少10元' }, { status: 400 });
    }

    // 检查余额
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
    });

    if (!currentUser || currentUser.balance < amount) {
      return NextResponse.json({ error: '余额不足' }, { status: 400 });
    }

    // 扣减余额
    await prisma.user.update({
      where: { id: user.userId },
      data: {
        balance: currentUser.balance - amount,
      },
    });

    // 创建提现记录
    await prisma.transaction.create({
      data: {
        type: 'WITHDRAW_PENDING',
        amount,
        status: 'PENDING',
        description: '提现申请，待审核',
        userId: user.userId,
      },
    });

    return NextResponse.json({ message: '提现申请已提交' });
  } catch (error) {
    console.error('提现失败:', error);
    return NextResponse.json({ error: '提现失败' }, { status: 500 });
  }
}