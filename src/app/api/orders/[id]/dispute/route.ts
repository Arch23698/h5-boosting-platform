/**
 * 发起争议 API
 * PATCH /api/orders/[id]/dispute
 * 老板或打手对订单发起争议，进入仲裁流程
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
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { reason } = await request.json();

    // 获取订单信息
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: { player: true, booster: true },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 只有订单相关的老板或打手才能发起争议
    const isPlayer = user.userId === order.playerId;
    const isBooster = user.userId === order.boosterId;

    if (!isPlayer && !isBooster) {
      return NextResponse.json({ error: '您不是该订单的当事人' }, { status: 403 });
    }

    // 只有进行中或待验收的订单可以发起争议
    if (order.status !== 'TAKEN' && order.status !== 'SUBMITTED') {
      return NextResponse.json({ error: '当前订单状态不支持发起争议' }, { status: 400 });
    }

    // 更新订单状态为争议中
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: 'DISPUTED',
      },
      include: { player: true, booster: true, game: true },
    });

    // 创建争议记录（可以作为交易记录）
    await prisma.transaction.create({
      data: {
        type: 'FREEZE',
        amount: 0,
        status: 'PENDING',
        description: `发起争议 - ${reason || '无原因'} - 发起人: ${isPlayer ? '老板' : '打手'}`,
        userId: user.userId,
        orderId: params.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: '已发起争议，等待管理员仲裁',
      order: updatedOrder,
    });

  } catch (error) {
    console.error('发起争议失败:', error);
    return NextResponse.json({ error: '发起争议失败' }, { status: 500 });
  }
}
