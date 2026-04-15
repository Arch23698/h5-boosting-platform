/**
 * 聊天会话 API
 * GET: 获取聊天列表
 * POST: 创建新会话或发送消息
 * PATCH: 分配会话给管理员
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * GET /api/chat
 * 获取聊天会话列表
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    let sessions = [];

    if (user.role === 'ADMIN') {
      // 管理员：获取所有会话
      sessions = await prisma.chatSession.findMany({
        include: {
          booster: { select: { id: true, name: true } },
          admin: { select: { id: true, name: true } },
          order: { select: { id: true, title: true, orderNo: true } },
          _count: {
            select: { messages: { where: { isRead: false, receiverId: user.userId } } }
          }
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else {
      // 打手：获取自己的会话
      sessions = await prisma.chatSession.findMany({
        where: { boosterId: user.userId },
        include: {
          booster: { select: { id: true, name: true } },
          admin: { select: { id: true, name: true } },
          order: { select: { id: true, title: true, orderNo: true } },
          _count: {
            select: { messages: { where: { isRead: false, receiverId: user.userId } } }
          }
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('获取聊天列表失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/**
 * PATCH /api/chat
 * 分配会话给管理员
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const { sessionId, adminId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 更新会话的adminId
    const session = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { adminId: adminId || user.userId },
      include: {
        booster: { select: { id: true, name: true } },
        admin: { select: { id: true, name: true } },
        order: { select: { id: true, title: true, orderNo: true } },
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('分配会话失败:', error);
    return NextResponse.json({ error: '分配失败' }, { status: 500 });
  }
}

/**
 * POST /api/chat
 * 创建新会话
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { orderId, message } = await request.json();

    if (!orderId || !message) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    // 检查订单是否存在
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { player: true },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 检查是否已有会话
    let session = await prisma.chatSession.findFirst({
      where: { orderId, boosterId: user.userId },
    });

    if (!session) {
      // 创建新会话 - 不分配给特定管理员，让所有管理员可以接入
      session = await prisma.chatSession.create({
        data: {
          orderId,
          boosterId: user.userId,
          adminId: null, // 待分配状态
          lastMessage: message,
        },
      });
    }

    // 发送消息 - 接收者为空，因为还没有管理员分配
    const newMessage = await prisma.message.create({
      data: {
        content: message,
        sessionId: session.id,
        senderId: user.userId,
        receiverId: '', // 打手发送的消息没有特定接收者，等待管理员接入
      },
    });

    // 更新会话的最后消息
    await prisma.chatSession.update({
      where: { id: session.id },
      data: { lastMessage: message },
    });

    return NextResponse.json({ session, message: newMessage });
  } catch (error) {
    console.error('创建会话失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
