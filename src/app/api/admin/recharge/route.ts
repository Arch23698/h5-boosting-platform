/**
 * 充值确认 API
 * GET: 获取待确认的充值记录
 * POST: 确认或拒绝充值
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * GET /api/admin/recharge
 * 获取所有待确认的充值记录
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查权限
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { adminLevel: true, canManageRecharge: true },
    });

    if (!currentUser || (currentUser.adminLevel !== 2 && !currentUser.canManageRecharge)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 获取待确认的充值记录
    const pendingDeposits = await prisma.transaction.findMany({
      where: { type: 'DEPOSIT_PENDING', status: 'PENDING' },
      include: {
        user: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ transactions: pendingDeposits });
  } catch (error) {
    console.error('获取充值记录失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/**
 * POST /api/admin/recharge
 * 确认或拒绝充值
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查权限
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { adminLevel: true, canManageRecharge: true },
    });

    if (!currentUser || (currentUser.adminLevel !== 2 && !currentUser.canManageRecharge)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { transactionId, action } = await request.json();

    if (!transactionId || !action) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 获取充值记录
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: '充值记录不存在' }, { status: 404 });
    }

    if (transaction.status !== 'PENDING') {
      return NextResponse.json({ error: '该记录已处理' }, { status: 400 });
    }

    if (action === 'confirm') {
      // 确认充值
      await prisma.$transaction(async (tx) => {
        // 1. 更新交易状态为已确认
        await tx.transaction.update({
          where: { id: transactionId },
          data: { status: 'SUCCESS', description: `充值已确认 - 管理员: ${currentUser.adminLevel}` },
        });

        // 2. 增加用户余额
        await tx.user.update({
          where: { id: transaction.userId },
          data: { balance: { increment: transaction.amount } },
        });

        // 3. 创建充值成功记录
        await tx.transaction.create({
          data: {
            type: 'DEPOSIT_CONFIRMED',
            amount: transaction.amount,
            status: 'SUCCESS',
            description: `充值成功确认 - 订单号: ${transaction.description?.split(' - ')[1] || 'N/A'}`,
            userId: transaction.userId,
          },
        });
      });

      return NextResponse.json({ success: true, message: '充值已确认' });
    } else if (action === 'reject') {
      // 拒绝充值
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED', description: '充值被管理员拒绝' },
      });

      return NextResponse.json({ success: true, message: '充值已拒绝' });
    } else {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('处理充值失败:', error);
    return NextResponse.json({ error: '处理失败' }, { status: 500 });
  }
}