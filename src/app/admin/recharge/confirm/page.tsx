'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * 待确认充值类型
 */
interface PendingDeposit {
  id: string;
  amount: number;
  description: string | null;
  createdAt: string;
  user: { id: string; name: string; role: string };
}

/**
 * 充值确认管理页面
 */
export default function RechargeConfirmPage() {
  const [pendingDeposits, setPendingDeposits] = useState<PendingDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  /**
   * 检查权限并获取数据
   */
  const checkAdminAndFetchData = async () => {
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

      // 检查是否有充值管理权限
      if (user.adminLevel !== 2 && !user.canManageRecharge) {
        alert('您没有充值管理权限');
        router.push('/');
        return;
      }

      setIsAdmin(true);
      fetchPendingDeposits();
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取待确认的充值记录
   */
  const fetchPendingDeposits = async () => {
    try {
      const res = await fetch('/api/admin/recharge');
      if (res.ok) {
        const data = await res.json();
        setPendingDeposits(data.transactions || []);
      }
    } catch (error) {
      console.error('获取充值记录失败:', error);
    }
  };

  /**
   * 确认充值
   */
  const handleConfirm = async (transactionId: string) => {
    if (!confirm('确认该充值已到账？')) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, action: 'confirm' }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('确认成功');
        fetchPendingDeposits();
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
   * 拒绝充值
   */
  const handleReject = async (transactionId: string) => {
    if (!confirm('确认拒绝该充值？')) return;

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, action: 'reject' }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('已拒绝');
        fetchPendingDeposits();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('拒绝失败:', error);
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

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* 顶部 */}
      <header className="bg-green-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">充值确认</h1>
          <Link href="/admin" className="text-sm opacity-80">
            返回管理
          </Link>
        </div>
      </header>

      {/* 待确认充值列表 */}
      <main className="p-4">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          待确认充值 ({pendingDeposits.length})
        </h2>

        {pendingDeposits.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            暂无待确认的充值
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDeposits.map(deposit => (
              <div key={deposit.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-800">{deposit.user.name}</h3>
                    <p className="text-xs text-gray-500">
                      角色: {deposit.user.role === 'ADMIN' ? '管理员' : '打手'}
                    </p>
                  </div>
                  <span className="text-2xl font-bold text-green-600">
                    ¥{deposit.amount.toFixed(2)}
                  </span>
                </div>

                <div className="text-sm text-gray-500 mb-3">
                  订单号: {deposit.description?.split(' - ')[1] || 'N/A'}
                </div>

                <div className="text-xs text-gray-400 mb-3">
                  申请时间: {formatTime(deposit.createdAt)}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleConfirm(deposit.id)}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm font-medium disabled:bg-green-300"
                  >
                    确认到账
                  </button>
                  <button
                    onClick={() => handleReject(deposit.id)}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:bg-red-300"
                  >
                    拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t flex">
        <Link href="/" className="flex-1 py-3 text-center text-gray-400 text-sm">
          订单大厅
        </Link>
        <Link href="/profile" className="flex-1 py-3 text-center text-gray-400 text-sm">
          我的
        </Link>
        <Link href="/admin" className="flex-1 py-3 text-center text-green-600 text-sm font-bold border-t-2 border-green-600">
          管理
        </Link>
      </nav>
    </div>
  );
}