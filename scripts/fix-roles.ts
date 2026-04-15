/**
 * 更新用户角色脚本
 * 将所有 PLAYER 角色更新为 BOOSTER
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 更新所有 PLAYER 角色为 BOOSTER
  const result = await prisma.user.updateMany({
    where: { role: 'PLAYER' },
    data: { role: 'BOOSTER' },
  });

  console.log(`✅ 已更新 ${result.count} 个用户角色从 PLAYER 到 BOOSTER`);

  // 修复 admin 的 adminLevel
  const adminResult = await prisma.user.updateMany({
    where: { name: 'admin', role: 'ADMIN' },
    data: { adminLevel: 2 },
  });

  console.log(`✅ 已更新 ${adminResult.count} 个管理员为超级管理员`);

  // 显示所有用户
  const users = await prisma.user.findMany({
    select: { id: true, name: true, role: true, adminLevel: true },
  });

  console.log('\n当前用户列表:');
  users.forEach(u => {
    console.log(`- ${u.name}: role=${u.role}, adminLevel=${u.adminLevel}`);
  });
}

main()
  .catch((e) => {
    console.error('❌ 更新失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
