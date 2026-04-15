/**
 * 用户管理 API
 * 仅超级管理员可访问
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/users
 * 获取所有用户列表
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 只有超级管理员才能查看用户列表
    if (user.role !== 'ADMIN' || user.adminLevel !== 2) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      include: {
        _count: {
          select: { boostedOrders: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('获取用户失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * 创建新管理员
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 只有超级管理员才能创建管理员
    if (user.role !== 'ADMIN' || user.adminLevel !== 2) {
      return NextResponse.json({ error: '无权执行此操作' }, { status: 403 });
    }

    const { name, password, adminLevel } = await request.json();

    // 参数校验
    if (!name || !password) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    if (name.length < 2 || name.length > 20) {
      return NextResponse.json({ error: '用户名需要2-20个字符' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: '密码至少4个字符' }, { status: 400 });
    }

    // 检查用户名是否存在
    const existing = await prisma.user.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建管理员
    const newUser = await prisma.user.create({
      data: {
        name,
        password: hashedPassword,
        role: 'ADMIN',
        adminLevel: adminLevel || 1,
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        role: newUser.role,
        adminLevel: newUser.adminLevel,
      },
    });
  } catch (error) {
    console.error('创建管理员失败:', error);
    return NextResponse.json({ error: '创建失败' }, { status: 500 });
  }
}
