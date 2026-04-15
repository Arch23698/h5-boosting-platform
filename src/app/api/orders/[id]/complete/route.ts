/**
 * 打手提交完成 API
 * PATCH /api/orders/[id]/complete
 * 打手完成代练后提交，订单状态从 TAKEN 变为 SUBMITTED
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

    // 只有打手才能提交完成
    if (user.role !== 'BOOSTER') {
      return NextResponse.json({ error: '只有打手才能提交完成' }, { status: 403 });
    }

    // 检查订单状态
    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 验证是否是自己的订单
    if (order.boosterId !== user.userId) {
      return NextResponse.json({ error: '这不是你接的订单' }, { status: 403 });
    }

    // 只有进行中的订单才能提交
    if (order.status !== 'TAKEN') {
      return NextResponse.json({ error: '订单状态不允许提交' }, { status: 400 });
    }

    // 更新订单状态为 SUBMITTED（待验收）
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: { status: 'SUBMITTED' },
      include: { player: true, booster: true, game: true },
    });

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('提交完成失败:', error);
    return NextResponse.json({ error: '提交失败' }, { status: 500 });
  }
}
