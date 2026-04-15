/**
 * 管理员列表 API
 * GET: 获取所有管理员列表
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * GET /api/admin/admins
 * 获取所有管理员列表
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        name: true,
        adminLevel: true,
      },
      orderBy: { adminLevel: 'desc' },
    });

    return NextResponse.json({ admins });
  } catch (error) {
    console.error('获取管理员列表失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}