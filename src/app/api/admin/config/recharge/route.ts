/**
 * 系统配置 API
 * GET: 获取充值配置
 * PATCH: 更新充值配置（超级管理员）
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

const UPLOAD_DIR = 'public/uploads';

/**
 * GET /api/admin/config/recharge
 * 获取充值配置
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取充值二维码配置
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'recharge_qrcode' },
    });

    // 获取充值开关配置
    const rechargeEnabled = await prisma.systemConfig.findUnique({
      where: { key: 'recharge_enabled' },
    });

    return NextResponse.json({
      qrcode: config?.value || null,
      enabled: rechargeEnabled?.value === 'true',
    });
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/config/recharge
 * 更新充值配置（超级管理员）
 */
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.adminLevel !== 2) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'upload_qrcode') {
      const file = formData.get('file') as File;
      if (!file || !file.type.startsWith('image/')) {
        return NextResponse.json({ error: '请上传图片文件' }, { status: 400 });
      }

      // 生成唯一文件名
      const ext = file.name.split('.').pop();
      const filename = `recharge_qrcode_${Date.now()}.${ext}`;
      const filepath = `${UPLOAD_DIR}/${filename}`;

      // 读取文件并保存
      const buffer = Buffer.from(await file.arrayBuffer());
      const fs = require('fs');

      // 确保目录存在
      if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      }

      fs.writeFileSync(filepath, buffer);

      // 保存配置到数据库
      await prisma.systemConfig.upsert({
        where: { key: 'recharge_qrcode' },
        update: { value: `/uploads/${filename}` },
        create: { key: 'recharge_qrcode', value: `/uploads/${filename}`, description: '充值二维码' },
      });

      return NextResponse.json({ qrcode: `/uploads/${filename}` });
    }

    if (action === 'toggle_enabled') {
      const enabled = formData.get('enabled') as string;

      await prisma.systemConfig.upsert({
        where: { key: 'recharge_enabled' },
        update: { value: enabled },
        create: { key: 'recharge_enabled', value: enabled, description: '充值功能开关' },
      });

      return NextResponse.json({ enabled: enabled === 'true' });
    }

    return NextResponse.json({ error: '无效操作' }, { status: 400 });
  } catch (error) {
    console.error('更新配置失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}