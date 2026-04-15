/**
 * 用户管理 API
 * PATCH: 更新用户权限
 * DELETE: 删除用户
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * PATCH /api/admin/users/[id]
 * 更新用户权限（充值配置管理权限）
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

    // 从数据库检查当前用户是否是超级管理员
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { adminLevel: true },
    });

    if (!currentUser || currentUser.adminLevel !== 2) {
      return NextResponse.json({ error: '权限不足，仅超级管理员可修改' }, { status: 403 });
    }

    const { canManageRecharge, canManageOrders, canManageChat } = await request.json();

    const updateData: any = {};
    if (canManageRecharge !== undefined) updateData.canManageRecharge = Boolean(canManageRecharge);
    if (canManageOrders !== undefined) updateData.canManageOrders = Boolean(canManageOrders);
    if (canManageChat !== undefined) updateData.canManageChat = Boolean(canManageChat);

    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        adminLevel: true,
        canManageRecharge: true,
        canManageOrders: true,
        canManageChat: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('更新用户权限失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * 删除用户
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 从数据库检查当前用户是否是超级管理员
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { adminLevel: true },
    });

    // 只有超级管理员才能删除用户
    if (!currentUser || currentUser.adminLevel !== 2) {
      return NextResponse.json({ error: '无权执行此操作' }, { status: 403 });
    }

    // 不能删除自己
    if (user.userId === params.id) {
      return NextResponse.json({ error: '不能删除自己' }, { status: 400 });
    }

    // 检查要删除的用户
    const targetUser = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!targetUser) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 });
    }

    // 不能删除超级管理员
    if (targetUser.adminLevel === 2) {
      return NextResponse.json({ error: '不能删除超级管理员' }, { status: 400 });
    }

    // 使用事务删除用户及其关联数据
    await prisma.$transaction(async (tx) => {
      // 1. 删除该用户的交易记录
      await tx.transaction.deleteMany({
        where: { userId: params.id },
      });

      // 2. 删除该用户发送的消息
      await tx.message.deleteMany({
        where: { senderId: params.id },
      });

      // 3. 删除该用户接收的消息
      await tx.message.deleteMany({
        where: { receiverId: params.id },
      });

      // 4. 删除该用户的聊天会话
      await tx.chatSession.deleteMany({
        where: { boosterId: params.id },
      });

      await tx.chatSession.deleteMany({
        where: { adminId: params.id },
      });

      // 5. 最后删除用户
      await tx.user.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除用户失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
