'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 订单详情页
 * 展示订单信息，打手接单需支付保证金
 */

interface Order {
  id: string;
  orderNo: string;
  title: string;
  price: number;
  status: string;
  deposit: number;
  depositStatus: string;
  server?: string | null;
  requirements?: string | null;
  securityDeposit: number;
  efficiencyDeposit: number;
  requiredHours?: number | null;
  createdAt: string;
  player: { id: string; name: string; role: string; kefuLink?: string | null };
  booster?: { id: string; name: string } | null;
  game: { name: string };
}

interface UserInfo {
  id: string;
  name: string;
  role: 'BOOSTER' | 'ADMIN';
  adminLevel?: number;
}

export default function OrderDetail({ params }: { params: { id: string } }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [params.id, router]);

  /**
   * 页面加载时获取订单详情和当前用户
   */
  const fetchData = async () => {
    try {
      const [userRes, orderRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch(`/api/orders/${params.id}`),
      ]);

      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const user = await userRes.json();
      const orderData = await orderRes.json();

      setCurrentUser(user);
      setOrder(orderData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 刷新订单数据
   */
  const refreshOrder = async () => {
    const res = await fetch(`/api/orders/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setOrder(data);
    }
  };

  /**
   * 打手接单 - 跳转支付页面
   */
  const handleGrabOrder = () => {
    router.push(`/orders/${params.id}/pay`);
  };

  /**
   * 联系客服 - 创建或进入聊天
   */
  const handleContactKefu = async () => {
    if (!order) return;
    setActionLoading(true);

    try {
      // 先检查是否已有会话
      const sessionsRes = await fetch('/api/chat');
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json();
        const existingSession = sessionsData.sessions?.find(
          (s: { orderId: string }) => s.orderId === order.id
        );

        if (existingSession) {
          // 已有会话，直接跳转
          router.push(`/chat/${existingSession.id}`);
          return;
        }
      }

      // 创建新会话
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          message: `您好，我是打手 ${currentUser?.name}，关于订单「${order.title}」有问题咨询。`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/chat/${data.session.id}`);
      } else {
        const data = await res.json();
        alert(data.error || '创建会话失败');
      }
    } catch (error) {
      console.error('联系客服失败:', error);
      alert('网络错误，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 打手提交完成
   */
  const handleSubmitComplete = async () => {
    if (!order) return;
    setActionLoading(true);

    try {
      const res = await fetch(`/api/orders/${params.id}/complete`, { method: 'PATCH' });

      if (res.ok) {
        alert('已提交完成，等待管理员验收！');
        await refreshOrder();
      } else {
        const data = await res.json();
        alert(data.error || '提交失败');
      }
    } catch (error) {
      console.error('提交失败:', error);
      alert('网络错误，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 管理员确认验收
   */
  const handleConfirmOrder = async () => {
    if (!order) return;

    if (!confirm('确认验收？验收后打手将获得报酬，保证金退还。')) {
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/orders/${params.id}/confirm`, { method: 'PATCH' });

      if (res.ok) {
        alert('验收成功！订单已完成！');
        await refreshOrder();
      } else {
        const data = await res.json();
        alert(data.error || '确认失败');
      }
    } catch (error) {
      console.error('确认失败:', error);
      alert('网络错误，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 发起争议
   */
  const handleDispute = async () => {
    if (!order) return;

    const reason = prompt('请输入争议原因：');
    if (!reason?.trim()) {
      alert('请输入争议原因');
      return;
    }

    if (!confirm('确认发起争议？订单将进入仲裁流程。')) {
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/orders/${params.id}/dispute`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        alert('已发起争议，等待管理员仲裁处理。');
        await refreshOrder();
      } else {
        const data = await res.json();
        alert(data.error || '发起争议失败');
      }
    } catch (error) {
      console.error('发起争议失败:', error);
      alert('网络错误，请重试');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 获取订单状态显示
   */
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { text: '🟢 待接单', color: 'text-green-600' };
      case 'PENDING_PAY_CONFIRM':
        return { text: '⏳ 待确认支付', color: 'text-orange-600' };
      case 'TAKEN':
        return { text: '🔵 进行中', color: 'text-blue-600' };
      case 'SUBMITTED':
        return { text: '🟡 待验收', color: 'text-yellow-600' };
      case 'DONE':
        return { text: '✅ 已完成', color: 'text-gray-600' };
      case 'DISPUTED':
        return { text: '⚠️ 争议中', color: 'text-red-600' };
      default:
        return { text: status, color: 'text-gray-600' };
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!order || !currentUser) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">订单不存在</div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(order.status);
  const isAdmin = currentUser.role === 'ADMIN';
  const isBooster = currentUser.role === 'BOOSTER';
  const isMyTakenOrder = isBooster && order.booster?.id === currentUser.id;

  // 调试信息
  console.log('订单详情调试:', {
    currentUserRole: currentUser.role,
    orderStatus: order.status,
    isBooster,
    isAdmin,
    showGrabButton: isBooster && order.status === 'OPEN',
    showContactingOwner: isMyTakenOrder && order.status === 'TAKEN'
  });

  // 按钮显示逻辑
  const showGrabButton = isBooster && order.status === 'OPEN';
  const showContactingOwner = isMyTakenOrder && order.status === 'TAKEN';
  const showConfirmButton = isAdmin && order.status === 'SUBMITTED';
  const showDisputeButton = isMyTakenOrder && (order.status === 'TAKEN' || order.status === 'SUBMITTED');

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-24">
      {/* 顶部导航栏 */}
      <header className="bg-white p-4 shadow-sm flex items-center">
        <button
          onClick={() => router.push('/')}
          className="text-blue-600 font-medium mr-4"
        >
          返回
        </button>
        <h1 className="text-xl font-bold text-gray-800">订单详情</h1>
      </header>

      {/* 订单信息卡片 */}
      <main className="p-4 mt-2 space-y-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800 mb-2">{order.title}</h2>
            <p className="text-2xl text-red-500 font-bold">¥{order.price}</p>
            {((order.securityDeposit ?? 0) > 0 || (order.efficiencyDeposit ?? 0) > 0) && (
              <p className="text-sm text-gray-500 mt-1">
                安全¥{order.securityDeposit ?? 0}/效率保障金¥{order.efficiencyDeposit ?? 0}
              </p>
            )}
          </div>

          {/* 订单基本信息 */}
          <div className="space-y-2 text-gray-600 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">订单编号</span>
              <span className="font-mono">{order.orderNo || order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">所在区服</span>
              <span>{order.server || order.game?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">发布时间</span>
              <span>{new Date(order.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            {order.requiredHours && (
              <div className="flex justify-between">
                <span className="text-gray-400">需求时间</span>
                <span className="text-orange-500 font-medium">{order.requiredHours}小时</span>
              </div>
            )}
            {order.booster && (
              <div className="flex justify-between">
                <span className="text-gray-400">接单打手</span>
                <span className="text-blue-600">{order.booster.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">当前状态</span>
              <span className={statusDisplay.color}>{statusDisplay.text}</span>
            </div>
          </div>

          {/* 接单攻略 */}
          <div className="border-t pt-4">
            <h3 className="font-bold text-gray-800 mb-2">接单攻略</h3>
            <p className="text-sm text-gray-500 mb-2">接单必看代练要求</p>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-2">
              <p className="text-red-500 font-medium">根据国家相关法律和政策要求，未成年人禁止接发单!</p>
              {order.game?.name === '王者荣耀' ? (
                <>
                  <p><strong>登录游戏:</strong> 进入游戏，注销"现有账号"右上角"扫码授权"后联系号主进行辅助扫码验证。</p>
                  <p>1: 接单后请在30分钟内联系号主并在1小时内开始，开打前请提供首图(好友天梯巅峰赛排行榜)结束提供完单截图。</p>
                  <p>2: 期间出现异常需要及时提交异常并提供异常相关证据截图。</p>
                  <p>3: 期间不可以使用账号道具，不要联系或回复好友信息。</p>
                  <p>4: 接单后不可以联系号主透露订单信息或者私下交易。</p>
                  <p>5: 切勿使用外挂，不允许打广告、挂机、恶意骂人等恶意行为。</p>
                </>
              ) : (
                <>
                  <p>1: 接单后请在30分钟内联系号主并在1小时内开始，开打前请提供首图(天梯排行榜)结束提供完单截图。</p>
                  <p>2: 期间出现异常需要及时提交异常并提供异常相关证据截图。</p>
                  <p>3: 期间不可以使用账号道具，不要联系或回复好友信息。</p>
                  <p>4: 接单后不可以联系号主透露订单信息或者私下交易。</p>
                  <p>5: 切勿使用外挂，不允许打广告、挂机、恶意骂人等恶意行为。部分订单为促使订单完成需要提供接单者的联系方式给发单者。</p>
                  <div className="border-t pt-2 mt-2">
                    <p className="font-medium text-gray-700">游戏说明</p>
                    <p>加游戏角色Q</p>
                  </div>
                </>
              )}
            </div>
          </div>


          {/* 收益信息（打手视角） */}
          {isMyTakenOrder && (
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
              <div className="text-sm opacity-80">订单完成后可获得</div>
              <div className="text-2xl font-bold mt-1">¥{order.price}</div>
              <div className="text-xs opacity-70 mt-1">保证金 ¥{(order.deposit ?? 0).toFixed(2)} 将自动退还</div>
            </div>
          )}

          {/* 待验收提示 */}
          {order.status === 'SUBMITTED' && isAdmin && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
              打手已提交完成，请确认验收！验收后打手将获得报酬。
            </div>
          )}
        </div>
      </main>

      {/* 底部操作栏 */}
      <footer className="fixed bottom-0 w-full max-w-md bg-white border-t p-4 pb-6">
        {/* 打手接单按钮 */}
        {showGrabButton && (
          <>
            <button
              onClick={handleGrabOrder}
              className="w-full py-3 rounded-xl font-bold text-white text-lg bg-blue-600 active:bg-blue-700 shadow-md"
            >
              立即接单
            </button>
            {/* 冻结保障金信息 */}
            <div className="bg-blue-50 rounded-lg p-3 mt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-700">冻结安全/效率保障金</span>
                <span className="font-bold text-blue-700">¥{(order.deposit ?? 0).toFixed(2)}</span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                接单需支付保障金，完成后自动退还
              </div>
            </div>
          </>
        )}

        {/* 正在联系号主 + 客服按钮 */}
        {showContactingOwner && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 py-3 bg-blue-50 rounded-xl">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
              <span className="text-blue-600 font-medium">正在联系号主...</span>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleContactKefu}
                disabled={actionLoading}
                className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium disabled:bg-green-300"
              >
                客服
              </button>
              <button
                onClick={handleSubmitComplete}
                disabled={actionLoading}
                className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-medium disabled:bg-orange-300"
              >
                提交完成
              </button>
            </div>
          </div>
        )}

        {/* 管理员确认验收按钮 */}
        {showConfirmButton && (
          <div className="space-y-2">
            <button
              onClick={handleConfirmOrder}
              disabled={actionLoading}
              className="w-full py-3 rounded-xl font-bold text-white text-lg bg-orange-500 active:bg-orange-600 shadow-md disabled:bg-orange-300"
            >
              {actionLoading ? '确认中...' : '确认验收'}
            </button>
            <p className="text-center text-xs text-gray-400">确认验收后打手获得 ¥{order.price} 报酬</p>
          </div>
        )}

        {/* 已完成状态 */}
        {order.status === 'DONE' && (
          <div className="text-center text-gray-500 py-3">
            ✅ 订单已完成
          </div>
        )}

        {/* 争议状态 */}
        {order.status === 'DISPUTED' && (
          <div className="text-center text-red-500 py-3">
            ⚠️ 订单争议中，等待管理员仲裁
          </div>
        )}

        {/* 发起争议按钮 */}
        {showDisputeButton && !showContactingOwner && (
          <button
            onClick={handleDispute}
            disabled={actionLoading}
            className="w-full py-2 border border-red-500 text-red-500 rounded-xl text-sm font-medium mt-2"
          >
            发起争议（仲裁）
          </button>
        )}
      </footer>
    </div>
  );
}
