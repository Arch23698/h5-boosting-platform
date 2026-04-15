/**
 * 充值 API
 * POST /api/wallet/recharge
 * 创建充值记录，待管理员确认
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

// 充值金额选项
const RECHARGE_OPTIONS = [10, 50, 100, 200, 500];

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { amount } = await request.json();

    // 验证充值金额
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: '请选择有效的充值金额' }, { status: 400 });
    }

    if (amount < 10) {
      return NextResponse.json({ error: '充值金额最少10元' }, { status: 400 });
    }

    // 生成充值订单号
    const orderNo = `RCH${Date.now()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // 创建待确认的充值记录
    await prisma.transaction.create({
      data: {
        type: 'DEPOSIT_PENDING',
        amount: amount,
        status: 'PENDING',
        description: `充值待确认 - 订单号: ${orderNo}`,
        userId: user.userId,
      },
    });

    return NextResponse.json({
      success: true,
      orderNo,
      amount,
      message: '充值申请已提交，请等待管理员确认',
    });
  } catch (error) {
    console.error('创建充值订单失败:', error);
    return NextResponse.json({ error: '创建充值订单失败' }, { status: 500 });
  }
}

/**
 * GET /api/wallet/recharge
 * 获取可用的充值金额选项
 */
export async function GET() {
  return NextResponse.json({
    options: RECHARGE_OPTIONS,
  });
}
