/**
 * 注册 API
 * POST /api/auth/register
 * 创建打手账号（默认角色为 BOOSTER）
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { createSession } from '@/app/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { name, password, phone, idCard } = await request.json();

    // 参数校验
    if (!name || !password) {
      return NextResponse.json(
        { error: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // 用户名长度校验
    if (name.length < 2 || name.length > 20) {
      return NextResponse.json(
        { error: '用户名需要2-20个字符' },
        { status: 400 }
      );
    }

    // 密码长度校验
    if (password.length < 4) {
      return NextResponse.json(
        { error: '密码至少需要4个字符' },
        { status: 400 }
      );
    }

    // 手机号必填校验
    if (!phone) {
      return NextResponse.json(
        { error: '手机号不能为空' },
        { status: 400 }
      );
    }

    // 手机号格式校验
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: '手机号格式不正确' },
        { status: 400 }
      );
    }

    // 身份证号必填校验
    if (!idCard) {
      return NextResponse.json(
        { error: '身份证号不能为空' },
        { status: 400 }
      );
    }

    // 身份证号格式校验
    if (!/(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(idCard)) {
      return NextResponse.json(
        { error: '身份证号格式不正确' },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { name },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: '用户名已被使用，请换一个' },
        { status: 400 }
      );
    }

    // 检查手机号是否已被使用（如果提供了手机号）
    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone },
      });
      if (existingPhone) {
        return NextResponse.json(
          { error: '该手机号已被注册' },
          { status: 400 }
        );
      }
    }

    // 检查身份证号是否已被使用（如果提供了身份证号）
    if (idCard) {
      const existingIdCard = await prisma.user.findUnique({
        where: { idCard },
      });
      if (existingIdCard) {
        return NextResponse.json(
          { error: '该身份证号已被注册' },
          { status: 400 }
        );
      }
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建打手账号
    const user = await prisma.user.create({
      data: {
        name,
        password: hashedPassword,
        phone: phone || null,
        idCard: idCard || null,
        role: 'BOOSTER',
        adminLevel: 0,
      },
    });

    // 生成 JWT Session（注册成功自动登录）
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
      message: '注册成功！',
    });
  } catch (error) {
    console.error('注册失败:', error);
    return NextResponse.json(
      { error: '注册失败，请稍后重试' },
      { status: 500 }
    );
  }
}
