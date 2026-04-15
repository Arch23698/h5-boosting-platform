/**
 * 订单列表 API
 * GET: 获取所有订单
 * POST: 创建新订单（仅管理员可发单）
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * GET /api/orders
 * 获取所有订单列表
 */
export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: { game: true, player: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('获取订单列表失败:', error);
    return NextResponse.json({ error: '获取列表失败' }, { status: 500 });
  }
}

/**
 * 生成订单编号
 * 格式: 时间戳 + 随机数
 */
function generateOrderNo(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return timestamp + random;
}

/**
 * POST /api/orders
 * 创建新订单（仅管理员可发单）
 */
export async function POST(request: Request) {
  try {
    // 获取当前登录用户
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 只有管理员才能发单
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: '只有管理员才能发布订单' }, { status: 403 });
    }

    const body = await request.json();
    const { title, price, deposit, gameId, server, securityDeposit, efficiencyDeposit, requiredHours } = body;

    // 参数校验
    if (!title || !price || !gameId) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    // 保证金最少10元
    const orderPrice = parseFloat(price);
    const orderDeposit = deposit ? parseFloat(deposit) : Math.max(Math.ceil(orderPrice * 0.5), 10);

    if (orderDeposit < 10) {
      return NextResponse.json({ error: '保证金最少10元' }, { status: 400 });
    }

    // 创建订单
    const order = await prisma.order.create({
      data: {
        orderNo: generateOrderNo(),
        title,
        price: orderPrice,
        deposit: orderDeposit,
        depositStatus: 'NONE',
        playerId: user.userId,
        gameId,
        server: server || null,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : 0,
        efficiencyDeposit: efficiencyDeposit ? parseFloat(efficiencyDeposit) : 0,
        requiredHours: requiredHours ? parseInt(requiredHours) : null,
      },
      include: { player: true, game: true },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('发布订单失败:', error);
    return NextResponse.json({ error: '发布订单失败' }, { status: 500 });
  }
}
