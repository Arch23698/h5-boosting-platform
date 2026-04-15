/**
 * 登录 API
 * POST /api/auth/login
 * 验证用户名和密码，成功后设置 JWT Session
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { createSession } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { name, password } = await request.json();

    // 参数校验
    if (!name || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { name },
    });

    // 用户不存在
    if (!user) {
      return NextResponse.json(
        { error: '用户名不存在，请先注册' },
        { status: 401 }
      );
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: '密码错误，请重试' },
        { status: 401 }
      );
    }

    // 生成 JWT Session
    await createSession({
      userId: user.id,
      name: user.name,
      role: user.role,
      adminLevel: user.adminLevel,
    });

    // 返回用户信息
    return NextResponse.json({
      id: user.id,
      name: user.name,
      role: user.role,
      adminLevel: user.adminLevel,
    });
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { error: '登录失败，请稍后重试' },
      { status: 500 }
    );
  }
}
