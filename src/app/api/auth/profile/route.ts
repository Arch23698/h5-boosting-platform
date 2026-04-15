/**
 * 个人中心 API
 * GET /api/auth/profile
 * 根据用户身份返回相关订单列表
 * - 老板：返回发布的订单
 * - 打手：返回接取的订单
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

export async function GET() {
  try {
    // 获取当前登录用户
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 根据角色查询不同订单
    let orders = [];

    // 获取用户完整信息（包括 canManageRecharge）
    const fullUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        id: true,
        name: true,
        role: true,
        adminLevel: true,
        canManageRecharge: true,
        balance: true,
      },
    });

    if (user.role === 'BOOSTER') {
      // 打手：查询自己接取的订单
      orders = await prisma.order.findMany({
        where: { boosterId: user.userId },
        include: {
          game: true,
          player: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }
    // 管理员不需要查询订单列表

    return NextResponse.json({
      user: {
        id: fullUser?.id,
        name: fullUser?.name,
        role: fullUser?.role,
        adminLevel: fullUser?.adminLevel,
        canManageRecharge: fullUser?.canManageRecharge || false,
        balance: fullUser?.balance || 0,
      },
      orders,
    });
  } catch (error) {
    console.error('获取个人数据失败:', error);
    return NextResponse.json({ error: '获取数据失败' }, { status: 500 });
  }
}
