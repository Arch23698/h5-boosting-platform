/**
 * 获取当前登录用户 API
 * GET /api/auth/me
 * 从 JWT Session 中解析用户信息并返回
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/lib/auth';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    // 从 Cookie 中获取当前用户
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      );
    }

    // 获取完整用户信息
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

    // 返回用户信息
    return NextResponse.json({
      id: fullUser?.id,
      name: fullUser?.name,
      role: fullUser?.role,
      adminLevel: fullUser?.adminLevel,
      canManageRecharge: fullUser?.canManageRecharge || false,
      canManageOrders: fullUser?.canManageOrders || false,
      canManageChat: fullUser?.canManageChat || false,
      balance: fullUser?.balance || 0,
    });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json(
      { error: '获取用户信息失败' },
      { status: 500 }
    );
  }
}
