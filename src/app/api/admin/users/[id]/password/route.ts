/**
 * 修改用户密码 API
 * 仅超级管理员可访问
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * PATCH /api/admin/users/[id]/password
 * 修改用户密码
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

    // 只有超级管理员才能修改密码
    if (user.role !== 'ADMIN' || user.adminLevel !== 2) {
      return NextResponse.json({ error: '无权执行此操作' }, { status: 403 });
    }

    const { password } = await request.json();

    if (!password || password.length < 4) {
      return NextResponse.json({ error: '密码至少4个字符' }, { status: 400 });
    }

    // 检查用户是否存在
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 更新密码
    await prisma.user.update({
      where: { id: params.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    return NextResponse.json({ error: '修改失败' }, { status: 500 });
  }
}
