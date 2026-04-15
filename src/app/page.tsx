'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * 订单状态标签组件
 */
function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { text: string; className: string }> = {
    OPEN: { text: '待接单', className: 'bg-green-100 text-green-700' },
    PENDING_PAY_CONFIRM: { text: '待确认支付', className: 'bg-orange-100 text-orange-700' },
    TAKEN: { text: '进行中', className: 'bg-blue-100 text-blue-700' },
    SUBMITTED: { text: '待验收', className: 'bg-yellow-100 text-yellow-700' },
    DONE: { text: '已完成', className: 'bg-gray-100 text-gray-600' },
    DISPUTED: { text: '争议中', className: 'bg-red-100 text-red-700' },
  };
  const { text, className } = config[status] || { text: status, className: 'bg-gray-100 text-gray-600' };
  return <span className={`px-2 py-1 rounded text-xs ${className}`}>{text}</span>;
}

/**
 * 用户信息类型定义
 */
interface UserInfo {
  id: string;
  name: string;
  role: 'BOOSTER' | 'ADMIN';
  adminLevel?: number;
}

/**
 * 订单类型定义
 */
interface Order {
  id: string;
  title: string;
  orderNo: string;
  price: number;
  status: string;
  deposit: number;
  player: { name: string };
  game: { id: string; name: string };
}

/**
 * 游戏类型
 */
interface Game {
  id: string;
  name: string;
}

/**
 * 游戏图标映射（本地图片路径）
 */
const gameIcons: Record<string, string> = {
  '王者荣耀': '/icons/王者荣耀.jpg',
  '和平精英': '/icons/和平精英.jpg',
  '英雄联盟': '/icons/英雄联盟.jpg',
  '原神': '/icons/原神.jpg',
  '永劫无间': '/icons/永劫无间.jpg',
  'CSGO': '/icons/CSGO.jpg',
  '三角洲行动': '/icons/三角洲行动.jpg',
  '英雄联盟手游': '/icons/英雄联盟手游.jpg',
};

/**
 * 主页
 */
export default function Home() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'orders'>('home'); // 当前标签页
  const [selectedGameId, setSelectedGameId] = useState<string>(''); // 筛选的游戏
  const [searchQuery, setSearchQuery] = useState<string>(''); // 搜索关键词
  const [showSearch, setShowSearch] = useState(false); // 显示搜索框
  const [newOrder, setNewOrder] = useState({
    title: '',
    price: '',
    deposit: '',
    gameId: '',
    server: '',
    securityDeposit: '',
    efficiencyDeposit: '',
    requiredHours: '',
  });
  const router = useRouter();

  useEffect(() => {
    fetchUser();
  }, [router]);

  /**
   * 获取当前用户
   */
  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        setCurrentUser(user);
        fetchOrders();
        fetchGames();
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取订单列表
   */
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (error) {
      console.error('获取订单列表失败:', error);
    }
  };

  /**
   * 获取游戏列表
   */
  const fetchGames = async () => {
    try {
      const res = await fetch('/api/games');
      if (res.ok) {
        const data = await res.json();
        setGames(data);
      }
    } catch (error) {
      console.error('获取游戏列表失败:', error);
    }
  };

  /**
   * 发布订单（仅管理员）
   */
  const createOrder = async () => {
    if (!newOrder.title || !newOrder.price || !newOrder.gameId) {
      alert('请填写完整信息');
      return;
    }

    const price = parseFloat(newOrder.price);
    const deposit = newOrder.deposit ? parseFloat(newOrder.deposit) : Math.ceil(price * 0.5);

    if (deposit < 10) {
      alert('保证金最少10元');
      return;
    }

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newOrder.title,
          price,
          deposit,
          gameId: newOrder.gameId,
          server: newOrder.server,
          securityDeposit: newOrder.securityDeposit ? parseFloat(newOrder.securityDeposit) : 0,
          efficiencyDeposit: newOrder.efficiencyDeposit ? parseFloat(newOrder.efficiencyDeposit) : 0,
          requiredHours: newOrder.requiredHours ? parseInt(newOrder.requiredHours) : null,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewOrder({ title: '', price: '', deposit: '', gameId: '', server: '', securityDeposit: '', efficiencyDeposit: '', requiredHours: '' });
        fetchOrders();
        alert('订单发布成功！');
      } else {
        const data = await res.json();
        alert(data.error || '发布失败');
      }
    } catch (error) {
      console.error('发布订单失败:', error);
      alert('网络错误，请重试');
    }
  };

  /**
   * 点击游戏跳转到订单大厅并筛选
   */
  const handleGameClick = (gameId: string) => {
    setSelectedGameId(gameId);
    setActiveTab('orders');
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const isSuperAdmin = currentUser.adminLevel === 2;

  // 根据选择的游戏和搜索关键词筛选订单
  const filteredOrders = orders.filter(order => {
    // 游戏筛选
    if (selectedGameId && order.game?.id !== selectedGameId) {
      return false;
    }
    // 搜索筛选（订单号、标题、游戏名）
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        (order.title && order.title.toLowerCase().includes(query)) ||
        (order.orderNo && order.orderNo.toLowerCase().includes(query)) ||
        (order.game?.name && order.game.name.toLowerCase().includes(query))
      );
    }
    return true;
  });

  // 获取选中游戏的名称
  const selectedGameName = games.find(g => g.id === selectedGameId)?.name || '';

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* 顶部标签切换 */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center border-b">
          <div className="flex-1 flex border-b-0">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex-1 py-3 text-center font-medium transition ${
                activeTab === 'home'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
            >
              首页
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-3 text-center font-medium transition ${
                activeTab === 'orders'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500'
              }`}
            >
              订单大厅
            </button>
          </div>
          <button
            onClick={() => setShowSearch(true)}
            className="px-4 py-3 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        <div className="p-4 text-sm text-gray-500 flex justify-between items-center">
          <span>
            当前身份: <strong className="text-blue-600">
              {isAdmin ? (isSuperAdmin ? '超级管理员' : '管理员') : '打手'} {currentUser.name}
            </strong>
          </span>
          {isAdmin && activeTab === 'orders' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-full text-xs font-medium active:scale-95 transition"
            >
              + 发布订单
            </button>
          )}
        </div>
      </header>

      {/* 首页内容 - 游戏列表 */}
      {activeTab === 'home' && (
        <main className="p-4">
          <h2 className="text-lg font-bold text-gray-800 mb-4">选择游戏快速接单</h2>
          <div className="grid grid-cols-4 gap-4">
            {games.map(game => {
              const iconSrc = gameIcons[game.name] || '/icons/default.png';
              return (
                <button
                  key={game.id}
                  onClick={() => handleGameClick(game.id)}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-md bg-gray-100">
                    <img
                      src={iconSrc}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-gray-600 text-center leading-tight">
                    {game.name.length > 4 ? (
                      <>
                        {game.name.slice(0, 4)}
                        <br />
                        {game.name.slice(4)}
                      </>
                    ) : game.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 热门订单推荐 */}
          <div className="mt-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">热门订单</h2>
            {orders.filter(o => o.status === 'OPEN').slice(0, 3).length === 0 ? (
              <p className="text-center text-gray-400 py-6">暂无待接单订单</p>
            ) : (
              orders.filter(o => o.status === 'OPEN').slice(0, 3).map(order => (
                <Link href={`/orders/${order.id}`} key={order.id}>
                  <div className="bg-white rounded-xl p-4 shadow-sm mb-3 border border-gray-100">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-800 flex-1 pr-2">{order.title}</h3>
                      <span className="text-red-500 font-bold">¥{order.price}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>{order.game?.name}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </main>
      )}

      {/* 订单大厅内容 */}
      {activeTab === 'orders' && (
        <>
          {/* 游戏筛选栏 */}
          <div className="bg-white border-b">
            <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
              <button
                onClick={() => setSelectedGameId('')}
                className={`flex flex-col items-center gap-1 transition ${
                  selectedGameId === '' ? 'opacity-100' : 'opacity-60'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-gray-100 ${
                  selectedGameId === '' ? 'border-2 border-blue-500' : ''
                }`}>
                  🎮
                </div>
                <span className={`text-xs ${selectedGameId === '' ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  全部
                </span>
              </button>
              {games.map(game => {
                const iconSrc = gameIcons[game.name] || '/icons/default.png';
                return (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGameId(game.id)}
                    className={`flex flex-col items-center gap-1 transition ${
                      selectedGameId === game.id ? 'opacity-100' : 'opacity-60'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl overflow-hidden ${
                      selectedGameId === game.id ? 'border-2 border-blue-500' : ''
                    }`}>
                      <img
                        src={iconSrc}
                        alt={game.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className={`text-xs whitespace-nowrap ${
                      selectedGameId === game.id ? 'text-blue-600 font-medium' : 'text-gray-500'
                    }`}>
                      {game.name.length > 4 ? game.name.slice(0, 4) : game.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 订单列表 */}
          <main className="p-4 space-y-4">
            {(selectedGameId || searchQuery) && (
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">
                  {searchQuery ? `搜索: "${searchQuery}"` : `${selectedGameName}订单`}
                </h2>
                <button
                  onClick={() => {
                    setSelectedGameId('');
                    setSearchQuery('');
                  }}
                  className="text-sm text-blue-600"
                >
                  清除筛选
                </button>
              </div>
            )}
            {filteredOrders.length === 0 ? (
              <p className="text-center text-gray-400 mt-10">
                {searchQuery ? '未找到匹配的订单' : (selectedGameId ? '该游戏暂无订单' : '暂无订单，管理员快来发单吧！')}
              </p>
            ) : (
              filteredOrders.map(order => (
                <Link href={`/orders/${order.id}`} key={order.id}>
                  <div className="bg-white rounded-xl p-4 shadow-sm active:bg-gray-50 transition border border-gray-100 mb-4 block">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="font-bold text-gray-800">{order.title}</h2>
                      <span className="text-red-500 font-bold">¥{order.price}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                      <span>{order.game?.name}</span>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="text-xs text-gray-400">
                      保证金: ¥{(order.deposit ?? 0).toFixed(2)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </main>
        </>
      )}

      {/* 发布订单弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">发布新订单</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">选择游戏</label>
                <select
                  value={newOrder.gameId}
                  onChange={(e) => setNewOrder({ ...newOrder, gameId: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">请选择游戏</option>
                  {games.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">订单标题</label>
                <input
                  type="text"
                  value={newOrder.title}
                  onChange={(e) => setNewOrder({ ...newOrder, title: e.target.value })}
                  placeholder="例如: 巅峰1637到1800，周日晚上打完"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">所在区服</label>
                <input
                  type="text"
                  value={newOrder.server}
                  onChange={(e) => setNewOrder({ ...newOrder, server: e.target.value })}
                  placeholder="例如: 安卓-微信/190区之外"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">订单金额（元）</label>
                  <input
                    type="number"
                    value={newOrder.price}
                    onChange={(e) => setNewOrder({ ...newOrder, price: e.target.value })}
                    placeholder="报酬"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">需求时间（小时）</label>
                  <input
                    type="number"
                    value={newOrder.requiredHours}
                    onChange={(e) => setNewOrder({ ...newOrder, requiredHours: e.target.value })}
                    placeholder="例如: 24"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">安全保障金（元）</label>
                  <input
                    type="number"
                    value={newOrder.securityDeposit}
                    onChange={(e) => setNewOrder({ ...newOrder, securityDeposit: e.target.value })}
                    placeholder="可选"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">效率保障金（元）</label>
                  <input
                    type="number"
                    value={newOrder.efficiencyDeposit}
                    onChange={(e) => setNewOrder({ ...newOrder, efficiencyDeposit: e.target.value })}
                    placeholder="可选"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">冻结保证金（元）</label>
                <input
                  type="number"
                  value={newOrder.deposit}
                  onChange={(e) => setNewOrder({ ...newOrder, deposit: e.target.value })}
                  placeholder="留空则自动计算为金额的50%"
                  className="w-full border rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-400 mt-1">打手接单需支付的保证金，最少10元</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
              >
                取消
              </button>
              <button
                onClick={createOrder}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium"
              >
                发布
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 搜索弹窗 */}
      {showSearch && (
        <div className="fixed inset-0 bg-white z-50">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSearch(false)}
                className="text-gray-500"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索订单号、标题、游戏..."
                  className="w-full bg-gray-100 rounded-full px-4 py-2 pl-10 text-sm"
                  autoFocus
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 搜索结果显示 */}
          <div className="p-4">
            {searchQuery.trim() ? (
              filteredOrders.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500 mb-3">找到 {filteredOrders.length} 个订单</p>
                  {filteredOrders.slice(0, 10).map(order => (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      onClick={() => setShowSearch(false)}
                    >
                      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-gray-800 text-sm">{order.title}</h3>
                            <p className="text-xs text-gray-500">{order.game?.name} · {order.orderNo}</p>
                          </div>
                          <span className="text-red-500 font-bold text-sm">¥{order.price}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                  {filteredOrders.length > 10 && (
                    <p className="text-center text-sm text-gray-400 py-2">
                      还有 {filteredOrders.length - 10} 个订单，点击查看更多
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-10">未找到匹配的订单</p>
              )
            ) : (
              <p className="text-center text-gray-400 py-10">输入关键词搜索订单</p>
            )}
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t flex">
        <Link
          href="/"
          className="flex-1 py-3 text-center text-gray-400 text-sm"
        >
          首页
        </Link>
        <Link
          href="/chat"
          className="flex-1 py-3 text-center text-gray-400 text-sm"
        >
          客服
        </Link>
        <Link
          href="/profile"
          className="flex-1 py-3 text-center text-gray-400 text-sm"
        >
          我的
        </Link>
        {isAdmin && (
          <Link
            href="/admin"
            className="flex-1 py-3 text-center text-gray-400 text-sm"
          >
            管理
          </Link>
        )}
      </nav>
    </div>
  );
}
