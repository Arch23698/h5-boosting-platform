/**
 * 充值确认 API（模拟支付成功回调）
 * POST /api/wallet/recharge/confirm
 *
 * 当前为模拟支付模式，生产环境需替换为支付平台回调接口
 * 真实支付时，此接口由支付宝/微信服务器调用
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

    const { amount, orderNo } = await request.json();

    // 验证参数
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: '充值金额无效' }, { status: 400 });
    }

    // 使用事务处理充值
    const result = await prisma.$transaction(async (tx) => {
      // 1. 增加用户余额
      const updatedUser = await tx.user.update({
        where: { id: user.userId },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      // 2. 创建交易记录
      const transaction = await tx.transaction.create({
        data: {
          type: 'DEPOSIT',
          amount: amount,
          status: 'SUCCESS',
          description: `充值成功 - 订单号: ${orderNo || 'N/A'}`,
          userId: user.userId,
        },
      });

      return { updatedUser, transaction };
    });

    return NextResponse.json({
      success: true,
      message: '充值成功',
      balance: result.updatedUser.balance,
      transaction: result.transaction,
    });
  } catch (error) {
    console.error('充值确认失败:', error);
    return NextResponse.json({ error: '充值失败' }, { status: 500 });
  }
}
