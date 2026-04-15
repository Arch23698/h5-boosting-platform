/**
 * 确认支付 API
 * PATCH /api/orders/[id]/confirm-pay
 * 管理员确认打手已支付保证金
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 检查订单是否存在
    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 只有待确认支付状态才能确认
    if (order.status !== 'PENDING_PAY_CONFIRM') {
      return NextResponse.json({ error: '该订单不在待确认支付状态' }, { status: 400 });
    }

    // 使用事务执行确认操作
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建保证金支付记录
      await tx.transaction.create({
        data: {
          type: 'FREEZE',
          amount: order.deposit,
          status: 'SUCCESS',
          description: `保证金冻结 - 订单: ${order.title}`,
          userId: order.boosterId!,
          orderId: params.id,
        },
      });

      // 2. 更新订单状态为已接单
      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: {
          status: 'TAKEN',
          depositStatus: 'FROZEN',
        },
        include: { player: true, booster: true, game: true },
      });

      return updatedOrder;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('确认支付失败:', error);
    return NextResponse.json({ error: '确认失败' }, { status: 500 });
  }
}