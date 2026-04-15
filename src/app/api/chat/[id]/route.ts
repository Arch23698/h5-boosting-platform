/**
 * 聊天消息 API
 * GET: 获取会话消息
 * POST: 发送消息
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * GET /api/chat/[id]
 * 获取会话的所有消息
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取会话
    const session = await prisma.chatSession.findUnique({
      where: { id: params.id },
      include: {
        booster: { select: { id: true, name: true } },
        admin: { select: { id: true, name: true } },
        order: { select: { id: true, title: true, orderNo: true } },
      },
    });

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    // 验证权限
    if (user.role !== 'ADMIN' && session.boosterId !== user.userId) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    // 获取消息
    const messages = await prisma.message.findMany({
      where: { sessionId: params.id },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // 标记消息为已读
    await prisma.message.updateMany({
      where: {
        sessionId: params.id,
        receiverId: user.userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ session, messages });
  } catch (error) {
    console.error('获取消息失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/**
 * POST /api/chat/[id]
 * 发送消息
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
    }

    // 获取会话
    const session = await prisma.chatSession.findUnique({
      where: { id: params.id },
    });

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    // 验证权限
    if (user.role !== 'ADMIN' && session.boosterId !== user.userId) {
      return NextResponse.json({ error: '无权发送消息' }, { status: 403 });
    }

    // 确定接收者
    // 如果是管理员，发送给打手；如果是打手，发送给已分配的管理员（如果没有则为空）
    const receiverId = user.role === 'ADMIN'
      ? session.boosterId
      : (session.adminId || '');

    // 发送消息
    // 如果接收者为空（如打手发消息但没有管理员分配），则只保存消息不设置接收者
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        sessionId: params.id,
        senderId: user.userId,
        receiverId: receiverId || null,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // 更新会话的最后消息
    await prisma.chatSession.update({
      where: { id: params.id },
      data: { lastMessage: content.trim() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json({ error: '发送失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/chat/[id]
 * 删除会话（仅超级管理员或有聊天管理权限）
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

    // 检查权限
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { adminLevel: true, canManageChat: true },
    });

    if (!currentUser || (currentUser.adminLevel !== 2 && !currentUser.canManageChat)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 检查会话是否存在
    const session = await prisma.chatSession.findUnique({
      where: { id: params.id },
    });

    if (!session) {
      return NextResponse.json({ error: '会话不存在' }, { status: 404 });
    }

    // 删除会话（级联删除消息）
    await prisma.chatSession.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除会话失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}
