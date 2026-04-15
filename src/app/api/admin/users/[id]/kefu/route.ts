/**
 * 设置客服链接 API
 * 仅超级管理员可访问
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * PATCH /api/admin/users/[id]/kefu
 * 设置管理员的客服链接
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 只有超级管理员才能设置客服链接
    if (user.role !== 'ADMIN' || user.adminLevel !== 2) {
      return NextResponse.json({ error: '无权执行此操作' }, { status: 403 });
    }

    const { kefuLink } = await request.json();

    // 检查用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 只有管理员才能设置客服链接
    if (targetUser.role !== 'ADMIN') {
      return NextResponse.json({ error: '只能为管理员设置客服链接' }, { status: 400 });
    }

    // 更新客服链接
    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { kefuLink: kefuLink || null },
    });

    return NextResponse.json({
      success: true,
      message: '客服链接设置成功',
      kefuLink: updated.kefuLink
    });
  } catch (error) {
    console.error('设置客服链接失败:', error);
    return NextResponse.json({ error: '设置失败' }, { status: 500 });
  }
}
