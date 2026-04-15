/**
 * 订单管理 API
 * PATCH: 更新订单状态和时间
 * DELETE: 删除订单
 */

import { NextResponse } from 'next/server';
import prisma from '@/app/lib/prisma';
import { getCurrentUser } from '@/app/lib/auth';

/**
 * PATCH /api/admin/orders/[id]
 * 更新订单状态和时间（仅超级管理员）
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 检查权限（仅超级管理员）
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { adminLevel: true },
    });

    if (!currentUser || currentUser.adminLevel !== 2) {
      return NextResponse.json({ error: '权限不足，仅超级管理员可修改' }, { status: 403 });
    }

    // 检查订单是否存在
    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    const { status, requiredHours, createdAt } = await request.json();

    const updateData: any = {};

    // 验证并设置状态
    if (status) {
      const validStatuses = ['OPEN', 'PENDING_PAY_CONFIRM', 'TAKEN', 'SUBMITTED', 'DONE', 'DISPUTED'];
      if (validStatuses.includes(status)) {
        updateData.status = status;
      }
    }

    // 验证并设置需求时间
    if (requiredHours !== undefined && requiredHours !== null) {
      const hours = parseInt(requiredHours);
      if (!isNaN(hours) && hours > 0) {
        updateData.requiredHours = hours;
      }
    }

    // 验证并设置发布时间
    if (createdAt !== undefined && createdAt !== null && createdAt !== '') {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        updateData.createdAt = date;
      }
    }

    // 更新订单
    const updatedOrder = await prisma.order.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ order: updatedOrder });
  } catch (error) {
    console.error('更新订单失败:', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/orders/[id]
 * 删除订单
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

    // 检查权限（超级管理员或有订单管理权限）
    const currentUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { adminLevel: true, canManageOrders: true },
    });

    if (!currentUser || (currentUser.adminLevel !== 2 && !currentUser.canManageOrders)) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    }

    // 检查订单是否存在
    const order = await prisma.order.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json({ error: '订单不存在' }, { status: 404 });
    }

    // 删除订单
    await prisma.order.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('删除订单失败:', error);
    return NextResponse.json({ error: '删除失败' }, { status: 500 });
  }
}