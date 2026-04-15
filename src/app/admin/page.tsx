'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * 订单类型
 */
interface Order {
  id: string;
  title: string;
  price: number;
  status: string;
  deposit: number;
  depositStatus: string;
  player: { id: string; name: string };
  booster: { id: string; name: string } | null;
  game: { name: string };
  createdAt: string;
  updatedAt: string;
  requiredHours: number | null;
}

/**
 * 管理员后台页面
 */
export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [canManageRecharge, setCanManageRecharge] = useState(false);
  const [canManageOrders, setCanManageOrders] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders'>('orders');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editStatus, setEditStatus] = useState('');
  const [editHours, setEditHours] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAdminAndFetchOrders();
  }, []);

  /**
   * 检查是否是管理员并获取订单
   */
  const checkAdminAndFetchOrders = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const user = await userRes.json();

      if (user.role !== 'ADMIN') {
        alert('您不是管理员，无法访问此页面');
        router.push('/');
        return;
      }

      setIsAdmin(true);
      setIsSuperAdmin(user.adminLevel === 2);
      setCanManageRecharge(user.adminLevel === 2 || user.canManageRecharge === true);
      setCanManageOrders(user.adminLevel === 2 || user.canManageOrders === true);
      fetchOrders();
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取订单列表
   */
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('获取订单失败:', error);
    }
  };

  /**
   * 执行仲裁
   */
  const handleArbitrate = async (orderId: string, action: 'favor_player' | 'favor_booster') => {
    if (!confirm(`确认${action === 'favor_player' ? '判给客户' : '判给打手'}？此操作不可撤销。`)) {
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/arbitrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(data.message);
        fetchOrders();
      } else {
        alert(data.error || '仲裁失败');
      }
    } catch (error) {
      console.error('仲裁失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 格式化时间
   */
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  /**
   * 获取订单状态显示
   */
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { text: '待接单', className: 'bg-green-100 text-green-700' };
      case 'PENDING_PAY_CONFIRM':
        return { text: '待确认支付', className: 'bg-orange-100 text-orange-700' };
      case 'TAKEN':
        return { text: '进行中', className: 'bg-blue-100 text-blue-700' };
      case 'SUBMITTED':
        return { text: '待验收', className: 'bg-yellow-100 text-yellow-700' };
      case 'DONE':
        return { text: '已完成', className: 'bg-gray-100 text-gray-600' };
      case 'DISPUTED':
        return { text: '争议中', className: 'bg-red-100 text-red-700' };
      default:
        return { text: status, className: 'bg-gray-100 text-gray-600' };
    }
  };

  /**
   * 删除订单
   */
  const handleDeleteOrder = async (orderId: string, orderTitle: string) => {
    if (!confirm(`确认删除订单 "${orderTitle}"？此操作不可撤销。`)) {
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('删除成功');
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 确认打手已支付保证金
   */
  const handleConfirmPay = async (orderId: string) => {
    if (!confirm('确认打手已支付保证金？确认后订单正式开始。')) {
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/orders/${orderId}/confirm-pay`, {
        method: 'PATCH',
      });

      const data = await res.json();

      if (res.ok) {
        alert('确认成功！订单已正式开始。');
        fetchOrders();
      } else {
        alert(data.error || '确认失败');
      }
    } catch (error) {
      console.error('确认失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 保存订单编辑
   */
  const handleSaveOrder = async () => {
    if (!editingOrder) return;

    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/orders/${editingOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus || undefined,
          createdAt: editHours || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('更新成功');
        setEditingOrder(null);
        fetchOrders();
      } else {
        alert(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 开始编辑订单
   */
  const handleStartEdit = (order: Order) => {
    setEditingOrder(order);
    setEditStatus(order.status);
    // 格式化时间为 datetime-local 格式
    const date = new Date(order.createdAt);
    const formatted = date.toISOString().slice(0, 16);
    setEditHours(formatted);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">无权访问</div>
      </div>
    );
  }

  const allOrders = orders.filter(o => o.status !== 'DONE');

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* 顶部 */}
      <header className="bg-red-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">管理后台</h1>
          <Link href="/" className="text-sm opacity-80">
            返回首页
          </Link>
        </div>
      </header>

      {/* 标签切换 */}
      <div className="flex bg-white border-b">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-3 text-center text-sm font-medium ${
            activeTab === 'orders' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500'
          }`}
        >
          订单管理 ({allOrders.length})
        </button>
      </div>

      {/* 充值配置入口 - 超级管理员或有权限的管理员 */}
      {(isSuperAdmin || canManageRecharge) && (
        <div className="p-4 pb-0 space-y-3">
          <Link
            href="/admin/recharge"
            className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl text-white"
          >
            <div>
              <div className="text-sm opacity-80">充值配置</div>
              <div className="text-lg font-bold">上传二维码 / 开关充值</div>
            </div>
            <div className="text-sm opacity-80">进入 &gt;</div>
          </Link>

          <Link
            href="/admin/recharge/confirm"
            className="flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white"
          >
            <div>
              <div className="text-sm opacity-80">充值确认</div>
              <div className="text-lg font-bold">确认用户充值到账</div>
            </div>
            <div className="text-sm opacity-80">进入 &gt;</div>
          </Link>
        </div>
      )}

      {/* 订单列表 */}
      <main className="p-4 space-y-4">
        {activeTab === 'orders' && (
          <>
            {allOrders.length === 0 ? (
              <div className="text-center text-gray-400 py-20">
                暂无进行中的订单
              </div>
            ) : (
              allOrders.map(order => {
                const statusDisplay = getStatusDisplay(order.status);
                return (
                  <div key={order.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-800">{order.title}</h3>
                        <p className="text-xs text-gray-400 mt-1">{order.game.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-red-500 font-bold">¥{order.price}</span>
                        <p className="text-xs text-gray-400">保证金 ¥{order.deposit.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-600 mb-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${statusDisplay.className}`}>
                        {statusDisplay.text}
                      </span>
                    </div>

                    {order.booster && (
                      <div className="text-sm text-gray-600 mb-3">
                        打手: {order.booster.name}
                      </div>
                    )}

                    {/* 操作按钮 - 根据权限显示 */}
                    {canManageOrders || isSuperAdmin ? (
                      <div className="flex gap-2">
                        {order.status === 'PENDING_PAY_CONFIRM' && (
                          <button
                            onClick={() => handleConfirmPay(order.id)}
                            disabled={actionLoading}
                            className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium disabled:bg-green-300"
                          >
                            确认支付
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button
                            onClick={() => handleStartEdit(order)}
                            disabled={actionLoading}
                            className="flex-1 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium disabled:bg-purple-300"
                          >
                            编辑
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOrder(order.id, order.title)}
                          disabled={actionLoading}
                          className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:bg-red-300"
                        >
                          删除
                        </button>
                        <Link
                          href={`/orders/${order.id}`}
                          className="flex-1 py-2 bg-blue-500 text-white text-center rounded-lg text-sm font-medium"
                        >
                          详情
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/orders/${order.id}`}
                        className="block w-full py-2 bg-blue-500 text-white text-center rounded-lg text-sm font-medium"
                      >
                        查看详情
                      </Link>
                    )}
                  </div>
                );
              })
            )}
          </>
        )}

      </main>

      {/* 编辑订单弹窗 */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">编辑订单</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">订单状态</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="OPEN">待接单</option>
                  <option value="PENDING_PAY_CONFIRM">待确认支付</option>
                  <option value="TAKEN">进行中</option>
                  <option value="SUBMITTED">待验收</option>
                  <option value="DISPUTED">争议中</option>
                  <option value="DONE">已完成</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">发布时间</label>
                <input
                  type="datetime-local"
                  value={editHours}
                  onChange={(e) => setEditHours(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingOrder(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleSaveOrder}
                disabled={actionLoading}
                className="flex-1 py-2 bg-purple-500 text-white rounded-lg font-medium disabled:bg-purple-300"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t flex">
        <Link href="/" className="flex-1 py-3 text-center text-gray-400 text-sm">
          订单大厅
        </Link>
        <Link href="/profile" className="flex-1 py-3 text-center text-gray-400 text-sm">
          我的
        </Link>
        <Link href="/admin" className="flex-1 py-3 text-center text-red-600 text-sm font-bold border-t-2 border-red-600">
          管理
        </Link>
      </nav>
    </div>
  );
}
