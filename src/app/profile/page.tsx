'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * 订单类型定义
 */
interface Order {
  id: string;
  title: string;
  price: number;
  status: string;
  createdAt: string;
  game: { name: string };
  player?: { name: string };
  booster?: { name: string } | null;
}

/**
 * 用户信息类型定义
 */
interface UserProfile {
  id: string;
  name: string;
  role: 'BOOSTER' | 'ADMIN';
  adminLevel?: number;
  balance: number;
}

/**
 * API 返回数据类型
 */
interface ProfileData {
  user: UserProfile;
  orders: Order[];
}

/**
 * 个人中心页面
 */
export default function ProfilePage() {
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, [router]);

  /**
   * 获取个人数据
   */
  const fetchProfile = async () => {
    try {
      const profileRes = await fetch('/api/auth/profile');

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setData(profileData);
      } else {
        router.push('/login');
        return;
      }
    } catch (error) {
      console.error('获取个人数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 登出操作
   */
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  /**
   * 获取订单状态标签样式和文案
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

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { user, orders } = data;
  const isAdmin = user.role === 'ADMIN';
  const isSuperAdmin = user.adminLevel === 2;

  // 获取角色显示信息
  const getRoleDisplay = () => {
    if (isSuperAdmin) return { title: '超级管理员', subtitle: '拥有所有权限' };
    if (isAdmin) return { title: '管理员', subtitle: '管理订单与仲裁' };
    return { title: '打手', subtitle: '接单赚钱' };
  };
  const roleDisplay = getRoleDisplay();

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* 用户信息卡片 */}
      <header className="bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{user.name}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {roleDisplay.title} · {roleDisplay.subtitle}
            </p>
          </div>
          {!isAdmin && (
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{orders.length}</div>
              <div className="text-xs text-gray-400">接取订单</div>
            </div>
          )}
        </div>

        {/* 钱包入口 - 仅打手可见 */}
        {!isAdmin && (
          <Link
            href="/wallet"
            className="mt-4 flex items-center justify-between p-4 bg-gradient-to-r from-green-500 to-green-600 rounded-xl text-white"
          >
            <div>
              <div className="text-sm opacity-80">我的钱包</div>
              <div className="text-2xl font-bold">¥{user.balance?.toFixed(2) || '0.00'}</div>
            </div>
            <div className="text-sm opacity-80">充值/提现 &gt;</div>
          </Link>
        )}

        {/* 消息入口 - 打手和超管管理员都可以查看 */}
        <Link
          href="/chat"
          className="mt-3 flex items-center justify-between p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl text-white"
        >
          <div>
            <div className="text-sm opacity-80">客服消息</div>
            <div className="text-lg font-bold">联系客服 / 查看消息</div>
          </div>
          <div className="text-sm opacity-80">进入 &gt;</div>
        </Link>

        {/* 管理员入口 */}
        {isAdmin && (
          <Link
            href="/admin"
            className="mt-3 flex items-center justify-between p-4 bg-gradient-to-r from-red-500 to-red-600 rounded-xl text-white"
          >
            <div>
              <div className="text-sm opacity-80">管理后台</div>
              <div className="text-lg font-bold">订单管理 & 仲裁中心</div>
            </div>
            <div className="text-sm opacity-80">进入 &gt;</div>
          </Link>
        )}

        {/* 超级管理员 - 用户管理入口 */}
        {isSuperAdmin && (
          <Link
            href="/admin/users"
            className="mt-3 flex items-center justify-between p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl text-white"
          >
            <div>
              <div className="text-sm opacity-80">用户管理</div>
              <div className="text-lg font-bold">创建/管理管理员</div>
            </div>
            <div className="text-sm opacity-80">进入 &gt;</div>
          </Link>
        )}

        <button
          onClick={handleLogout}
          className="mt-4 w-full py-2 border border-red-500 text-red-500 rounded-xl text-sm font-medium active:bg-red-50"
        >
          退出登录
        </button>
      </header>

      {/* 订单列表 */}
      {!isAdmin && (
        <>
          <div className="px-4 pt-4 pb-2">
            <h2 className="text-lg font-bold text-gray-700">我接取的订单</h2>
          </div>

          <main className="px-4 space-y-3">
            {orders.length === 0 ? (
              <div className="text-center text-gray-400 mt-10 py-10 bg-white rounded-xl">
                还没有接过单子
              </div>
            ) : (
              orders.map(order => {
                const statusDisplay = getStatusDisplay(order.status);
                return (
                  <Link href={`/orders/${order.id}`} key={order.id}>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 active:bg-gray-50 transition">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-800 flex-1 pr-2">{order.title}</h3>
                        <span className="text-red-500 font-bold whitespace-nowrap">¥{order.price}</span>
                      </div>

                      <div className="flex justify-between items-center text-sm text-gray-500">
                        <span className="text-xs">{order.game?.name}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${statusDisplay.className}`}>
                          {statusDisplay.text}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </main>
        </>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t flex">
        <Link
          href="/"
          className="flex-1 py-3 text-center text-gray-400 text-sm"
        >
          订单大厅
        </Link>
        <Link
          href="/chat"
          className="flex-1 py-3 text-center text-gray-400 text-sm"
        >
          客服
        </Link>
        <Link
          href="/profile"
          className="flex-1 py-3 text-center text-blue-600 text-sm font-bold border-t-2 border-blue-600"
        >
          我的
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex-1 py-3 text-center text-red-600 text-sm font-bold"
          >
            管理
          </Link>
        )}
      </nav>
    </div>
  );
}
