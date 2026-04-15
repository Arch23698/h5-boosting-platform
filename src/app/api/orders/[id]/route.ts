/**
 * 订单详情 API
 * GET: 获取单个订单详情
 * PATCH: 打手接单（需确认已支付保证金）
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * GET /api/orders/[id]
 * 获取单个订单详情
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: params.id },
      include: {
        game: true,
        player: {
          select: {
            id: true,
            name: true,
            role: true,
            kefuLink: true,
          }
        },
        booster: true
      },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('获取订单详情失败:', error);
    return NextResponse.json({ error: '获取订单详情失败' }, { status: 500 });
  }
}

/**
 * PATCH /api/orders/[id]
 * 打手接单（点击已支付，等待管理员确认）
 */
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

    // 只有打手才能接单
    if (user.role !== 'BOOSTER') {
      return NextResponse.json({ error: '只有打手才能接单' }, { status: 403 });
    }

    // 检查订单是否存在且可接
    const existingOrder = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!existingOrder) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (existingOrder.status !== 'OPEN') {
      return NextResponse.json({ error: '该订单已被接走' }, { status: 400 });
    }

    // 打手点击已支付后，状态变为待管理员确认支付
    // 不直接更新为 TAKEN，而是 PENDING_PAY_CONFIRM
    const result = await prisma.order.update({
      where: { id: params.id },
      data: {
        status: 'PENDING_PAY_CONFIRM', // 待确认支付
        boosterId: user.userId,
      },
      include: { player: true, booster: true, game: true },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('接单失败:', error);
    return NextResponse.json({ error: '接单失败' }, { status: 500 });
  }
}
