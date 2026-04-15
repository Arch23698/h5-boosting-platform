/**
 * 游戏列表 API
 * GET /api/games
 * 返回所有游戏
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';

export async function GET() {
  try {
    const games = await prisma.game.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error('获取游戏列表失败:', error);
    return NextResponse.json({ error: '获取失败' }, { status: 500 });
  }
}
