/**
 * 登出 API
 * POST /api/auth/logout
 * 清除 JWT Session Cookie
 */

import { NextResponse } from 'next/server';
import { clearSession } from '@/app/lib/auth';

export async function POST() {
  try {
    // 清除 Session Cookie
    await clearSession();

    return NextResponse.json({ message: '登出成功' });
  } catch (error) {
    console.error('登出失败:', error);
    return NextResponse.json(
      { error: '登出失败' },
      { status: 500 }
    );
  }
}
