/**
 * 数据库种子数据
 * 创建默认管理员账号和游戏数据
 */

import prisma from '../src/app/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  // 创建超级管理员账号 (adminLevel = 2)
  const superAdminPassword = await bcrypt.hash('admin123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { name: 'admin' },
    update: {},
    create: {
      name: 'admin',
      password: superAdminPassword,
      role: 'ADMIN',
      adminLevel: 2, // 超级管理员
    },
  });

  console.log('✅ 超级管理员创建成功:', superAdmin.name, '(密码: admin123)');

  // 创建游戏数据
  const games = await Promise.all([
    prisma.game.upsert({
      where: { id: 'game-1' },
      update: {},
      create: { id: 'game-1', name: '王者荣耀' },
    }),
    prisma.game.upsert({
      where: { id: 'game-2' },
      update: {},
      create: { id: 'game-2', name: '和平精英' },
    }),
    prisma.game.upsert({
      where: { id: 'game-3' },
      update: {},
      create: { id: 'game-3', name: '英雄联盟' },
    }),
    prisma.game.upsert({
      where: { id: 'game-4' },
      update: {},
      create: { id: 'game-4', name: '原神' },
    }),
    prisma.game.upsert({
      where: { id: 'game-5' },
      update: {},
      create: { id: 'game-5', name: '永劫无间' },
    }),
    prisma.game.upsert({
      where: { id: 'game-6' },
      update: {},
      create: { id: 'game-6', name: 'CSGO' },
    }),
    prisma.game.upsert({
      where: { id: 'game-7' },
      update: {},
      create: { id: 'game-7', name: '三角洲行动' },
    }),
    prisma.game.upsert({
      where: { id: 'game-8' },
      update: {},
      create: { id: 'game-8', name: '英雄联盟手游' },
    }),
  ]);

  console.log('✅ 游戏数据创建成功:', games.map(g => g.name).join(', '));
}

main()
  .catch((e) => {
    console.error('❌ 种子数据创建失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
