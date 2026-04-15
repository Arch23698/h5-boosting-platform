/**
 * 老板确认验收 API
 * PATCH /api/orders/[id]/confirm
 * 老板确认订单完成：
 * 1. 订单状态从 SUBMITTED 变为 DONE
 * 2. 退还保证金给打手
 * 3. 订单金额支付给打手（作为报酬）
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 获取当前登录用户
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 只有管理员才能确认验收
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: '只有管理员才能确认验收' }, { status: 403 });
    }

    // 检查订单状态
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { booster: true },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 管理员可以验收任何订单
    // 不需要验证订单归属

    // 只有待验收的订单才能确认
    if (order.status !== 'SUBMITTED') {
      return NextResponse.json({ error: '订单状态不允许确认' }, { status: 400 });
    }

    // 验证打手存在
    if (!order.boosterId || !order.booster) {
      return NextResponse.json({ error: '该订单没有打手接单' }, { status: 400 });
    }

    // 使用事务处理验收逻辑
    const result = await prisma.$transaction(async (tx) => {
      // 1. 退还保证金给打手
      if (order.deposit > 0 && order.depositStatus === 'FROZEN') {
        await tx.user.update({
          where: { id: order.boosterId! },
          data: {
            balance: {
              increment: order.deposit,
            },
          },
        });

        // 创建保证金退还记录
        await tx.transaction.create({
          data: {
            type: 'UNFREEZE',
            amount: order.deposit,
            status: 'SUCCESS',
            description: `保证金退还 - 订单: ${order.title}`,
            userId: order.boosterId!,
            orderId: params.id,
          },
        });
      }

      // 2. 支付报酬给打手（订单金额）
      await tx.user.update({
        where: { id: order.boosterId! },
        data: {
          balance: {
            increment: order.price,
          },
        },
      });

      // 创建报酬交易记录
      await tx.transaction.create({
        data: {
          type: 'REWARD',
          amount: order.price,
          status: 'SUCCESS',
          description: `代练报酬 - 订单: ${order.title}`,
          userId: order.boosterId!,
          orderId: params.id,
        },
      });

      // 3. 更新订单状态
      const updatedOrder = await tx.order.update({
        where: { id: params.id },
        data: {
          status: 'DONE',
          depositStatus: 'RETURNED',
        },
        include: { player: true, booster: true, game: true },
      });

      return updatedOrder;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('确认验收失败:', error);
    return NextResponse.json({ error: '确认失败' }, { status: 500 });
  }
}
