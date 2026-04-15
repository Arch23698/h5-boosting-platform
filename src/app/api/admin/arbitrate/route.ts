/**
 * 仲裁 API
 * 仅管理员可访问
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * GET /api/admin/arbitrate
 * 获取争议订单列表
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查是否是管理员
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 获取争议订单列表
    const disputedOrders = await prisma.order.findMany({
      where: { status: 'DISPUTED' },
      include: {
        player: true,
        booster: true,
        game: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      orders: disputedOrders,
    });
  } catch (error) {
    console.error('获取争议订单失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/**
 * POST /api/admin/arbitrate
 * 仲裁处理：判给老板或打手
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查是否是管理员
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: '无权执行此操作' }, { status: 403 });
    }

    const { orderId, action } = await request.json();

    // 获取订单信息
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { player: true, booster: true },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    if (order.status !== 'DISPUTED') {
      return NextResponse.json({ error: '该订单不在争议状态' }, { status: 400 });
    }

    if (!order.boosterId) {
      return NextResponse.json({ error: '该订单没有打手' }, { status: 400 });
    }

    // 使用事务处理仲裁结果
    const result = await prisma.$transaction(async (tx) => {
      if (action === 'favor_player') {
        // 判给老板：没收打手保证金给老板
        if (order.deposit > 0 && order.depositStatus === 'FROZEN') {
          // 保证金给老板
          await tx.user.update({
            where: { id: order.playerId },
            data: { balance: { increment: order.deposit } },
          });

          // 记录交易
          await tx.transaction.create({
            data: {
              type: 'REWARD',
              amount: order.deposit,
              status: 'SUCCESS',
              description: `仲裁胜诉 - 保证金退还 - 订单: ${order.title}`,
              userId: order.playerId,
              orderId: orderId,
            },
          });

          // 记录打手没收
          await tx.transaction.create({
            data: {
              type: 'FORFEIT',
              amount: order.deposit,
              status: 'SUCCESS',
              description: `仲裁败诉 - 保证金被没收 - 订单: ${order.title}`,
              userId: order.boosterId,
              orderId: orderId,
            },
          });
        }

        // 更新订单状态
        return await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'DONE',
            depositStatus: 'FORFEITED',
          },
          include: { player: true, booster: true, game: true },
        });

      } else if (action === 'favor_booster') {
        // 判给打手：退还保证金 + 支付报酬
        if (order.deposit > 0 && order.depositStatus === 'FROZEN') {
          // 退还保证金
          await tx.user.update({
            where: { id: order.boosterId },
            data: { balance: { increment: order.deposit } },
          });

          await tx.transaction.create({
            data: {
              type: 'UNFREEZE',
              amount: order.deposit,
              status: 'SUCCESS',
              description: `仲裁胜诉 - 保证金退还 - 订单: ${order.title}`,
              userId: order.boosterId,
              orderId: orderId,
            },
          });
        }

        // 支付报酬给打手
        await tx.user.update({
          where: { id: order.boosterId },
          data: { balance: { increment: order.price } },
        });

        await tx.transaction.create({
          data: {
            type: 'REWARD',
            amount: order.price,
            status: 'SUCCESS',
            description: `仲裁胜诉 - 获得报酬 - 订单: ${order.title}`,
            userId: order.boosterId,
            orderId: orderId,
          },
        });

        // 更新订单状态
        return await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'DONE',
            depositStatus: 'RETURNED',
          },
          include: { player: true, booster: true, game: true },
        });

      } else {
        throw new Error('无效的仲裁操作');
      }
    });

    return NextResponse.json({
      success: true,
      message: action === 'favor_player' ? '已判给老板，打手保证金已没收' : '已判给打手，保证金和报酬已发放',
      order: result,
    });

  } catch (error) {
    console.error('仲裁失败:', error);
    return NextResponse.json({ error: '仲裁失败' }, { status: 500 });
  }
}
