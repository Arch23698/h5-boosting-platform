'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * 交易记录类型
 */
interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  createdAt: string;
}

/**
 * 钱包数据类型
 */
interface WalletData {
  user: {
    id: string;
    name: string;
    role: string;
    balance: number;
  };
  transactions: Transaction[];
}

/**
 * 钱包页面
 * 充值和提现
 */
export default function WalletPage() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [rechargeConfig, setRechargeConfig] = useState<{ qrcode: string | null; enabled: boolean }>({ qrcode: null, enabled: false });
  const [activeTab, setActiveTab] = useState<'recharge' | 'withdraw'>('recharge');
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [recharging, setRecharging] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [walletRes, configRes] = await Promise.all([
        fetch('/api/wallet/balance'),
        fetch('/api/admin/config/recharge'),
      ]);

      if (!walletRes.ok) {
        router.push('/login');
        return;
      }

      const walletData = await walletRes.json();
      const configData = configRes.ok ? await configRes.json() : { qrcode: null, enabled: false };

      setData(walletData);
      setRechargeConfig(configData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 提现处理
   */
  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    const balance = data?.user.balance || 0;

    if (!amount || amount <= 0) {
      alert('请输入有效的提现金额');
      return;
    }

    if (amount < 10) {
      alert('提现金额最少10元');
      return;
    }

    if (amount > balance) {
      alert('余额不足');
      return;
    }

    if (!confirm(`确认提现 ¥${amount.toFixed(2)} 到您的账户？`)) {
      return;
    }

    setWithdrawing(true);

    try {
      const res = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('提现申请已提交，请等待管理员处理');
        setWithdrawAmount('');
        fetchData();
      } else {
        alert(result.error || '提现失败');
      }
    } catch (error) {
      console.error('提现失败:', error);
      alert('网络错误');
    } finally {
      setWithdrawing(false);
    }
  };

  /**
   * 充值处理 - 显示二维码
   */
  const handleRecharge = async () => {
    const amount = parseFloat(rechargeAmount);

    if (!amount || amount <= 0) {
      alert('请输入有效的充值金额');
      return;
    }

    if (amount < 10) {
      alert('充值金额最少10元');
      return;
    }

    // 显示二维码弹窗
    setPendingAmount(amount);
    setShowQRCode(true);
  };

  /**
   * 确认已支付 - 创建充值记录
   */
  const handleConfirmPayment = async () => {
    if (!confirm('确认您已支付？支付后需等待管理员确认到账。')) {
      return;
    }

    setRecharging(true);

    try {
      const res = await fetch('/api/wallet/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: pendingAmount }),
      });

      const result = await res.json();

      if (res.ok) {
        alert('已提交支付信息，请等待管理员确认到账');
        setShowQRCode(false);
        setRechargeAmount('');
        fetchData();
      } else {
        alert(result.error || '提交失败');
      }
    } catch (error) {
      console.error('确认支付失败:', error);
      alert('网络错误');
    } finally {
      setRecharging(false);
    }
  };

  /**
   * 获取交易类型显示
   */
  const getTypeDisplay = (type: string) => {
    const types: Record<string, { text: string; color: string }> = {
      DEPOSIT: { text: '充值', color: 'text-green-600' },
      DEPOSIT_PENDING: { text: '充值待确认', color: 'text-orange-600' },
      DEPOSIT_CONFIRMED: { text: '充值已确认', color: 'text-green-600' },
      WITHDRAW: { text: '提现', color: 'text-red-600' },
      WITHDRAW_PENDING: { text: '提现待审核', color: 'text-orange-600' },
      WITHDRAW_REJECTED: { text: '提现被拒绝', color: 'text-red-600' },
      FREEZE: { text: '冻结保证金', color: 'text-orange-600' },
      UNFREEZE: { text: '解冻保证金', color: 'text-blue-600' },
      REWARD: { text: '获得报酬', color: 'text-green-600' },
      FORFEIT: { text: '保证金没收', color: 'text-red-600' },
    };
    return types[type] || { text: type, color: 'text-gray-600' };
  };

  /**
   * 格式化时间
   */
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const { user, transactions } = data;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航栏 */}
      <header className="bg-white p-4 shadow-sm flex items-center">
        <button onClick={() => router.back()} className="text-blue-600 font-medium mr-4">
          返回
        </button>
        <h1 className="text-xl font-bold text-gray-800">我的钱包</h1>
      </header>

      {/* 余额卡片 */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
        <p className="text-sm opacity-80">账户余额</p>
        <p className="text-4xl font-bold mt-1">¥{user.balance.toFixed(2)}</p>
      </div>

      {/* 标签切换 */}
      <div className="flex bg-white border-b">
        <button
          onClick={() => setActiveTab('recharge')}
          className={`flex-1 py-3 text-center font-medium transition ${
            activeTab === 'recharge'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500'
          }`}
        >
          充值
        </button>
        <button
          onClick={() => setActiveTab('withdraw')}
          className={`flex-1 py-3 text-center font-medium transition ${
            activeTab === 'withdraw'
              ? 'text-green-600 border-b-2 border-green-600'
              : 'text-gray-500'
          }`}
        >
          提现
        </button>
      </div>

      <main className="p-4">
        {/* 充值标签 */}
        {activeTab === 'recharge' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">申请充值</h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">当前余额</label>
              <div className="text-2xl font-bold text-green-600">¥{data?.user.balance.toFixed(2) || '0.00'}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">充值金额</label>
              <input
                type="number"
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value)}
                placeholder="请输入充值金额"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">最少充值10元</p>
            </div>

            {/* 快速金额按钮 */}
            <div className="flex gap-2 mb-4">
              {[50, 100, 200, 500].map(amount => (
                <button
                  key={amount}
                  onClick={() => setRechargeAmount(amount.toString())}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  ¥{amount}
                </button>
              ))}
            </div>

            <button
              onClick={handleRecharge}
              disabled={recharging || !rechargeAmount}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-bold disabled:bg-green-300"
            >
              {recharging ? '提交中...' : '充值'}
            </button>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700 mt-4">
              <p className="font-medium mb-1">充值说明：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>点击"充值"后显示二维码</li>
                <li>扫码支付后点击"我已支付"</li>
                <li>支付后需等待管理员确认到账</li>
              </ul>
            </div>
          </div>
        )}

        {/* 二维码弹窗 */}
        {showQRCode && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
              <h2 className="text-lg font-bold mb-2">扫码支付</h2>
              <p className="text-red-500 font-bold text-2xl mb-4">¥{pendingAmount.toFixed(2)}</p>

              {rechargeConfig.enabled && rechargeConfig.qrcode ? (
                <>
                  <div className="w-64 h-64 mx-auto mb-4 rounded-lg overflow-hidden bg-gray-50">
                    <img
                      src={rechargeConfig.qrcode}
                      alt="充值二维码"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <p className="text-sm text-gray-500 mb-4">
                    请使用微信或支付宝扫描上方二维码支付
                  </p>
                </>
              ) : (
                <div className="py-8">
                  <p className="text-gray-400">暂无可用二维码，请联系管理员</p>
                </div>
              )}

              <button
                onClick={handleConfirmPayment}
                disabled={recharging}
                className="w-full py-3 bg-green-500 text-white rounded-xl font-bold disabled:bg-green-300 mb-3"
              >
                {recharging ? '处理中...' : '我已支付'}
              </button>

              <button
                onClick={() => {
                  setShowQRCode(false);
                  setRechargeAmount('');
                }}
                className="w-full py-2 border border-gray-300 rounded-xl text-gray-600"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 提现标签 */}
        {activeTab === 'withdraw' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-800 mb-4">申请提现</h2>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">可提现金额</label>
              <div className="text-2xl font-bold text-green-600">¥{user.balance.toFixed(2)}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">提现金额</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="请输入提现金额"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">最少提现10元</p>
            </div>

            {/* 快速金额按钮 */}
            <div className="flex gap-2 mb-4">
              {[50, 100, 200, 500].map(amount => (
                <button
                  key={amount}
                  onClick={() => setWithdrawAmount(amount.toString())}
                  disabled={user.balance < amount}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm disabled:opacity-50"
                >
                  ¥{amount}
                </button>
              ))}
            </div>

            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount}
              className="w-full py-3 bg-green-500 text-white rounded-xl font-bold disabled:bg-green-300"
            >
              {withdrawing ? '提交中...' : '申请提现'}
            </button>

            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 mt-4">
              <p className="font-medium mb-1">提现说明：</p>
              <ul className="list-disc list-inside space-y-1 text-gray-500">
                <li>提现申请提交后，需管理员审核处理</li>
                <li>审核通过后1-3个工作日到账</li>
                <li>如有疑问请联系客服</li>
              </ul>
            </div>
          </div>
        )}

        {/* 交易记录 */}
        <div className="mt-4">
          <h2 className="text-lg font-bold text-gray-800 mb-3">交易记录</h2>

          {transactions.length === 0 ? (
            <div className="text-center text-gray-400 py-10 bg-white rounded-xl">暂无交易记录</div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const typeDisplay = getTypeDisplay(tx.type);
                return (
                  <div key={tx.id} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className={`font-medium ${typeDisplay.color}`}>
                          {typeDisplay.text}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {tx.description || '-'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${typeDisplay.color}`}>
                          {tx.type === 'FREEZE' || tx.type === 'WITHDRAW' || tx.type === 'WITHDRAW_PENDING' || tx.type === 'FORFEIT' || tx.type === 'WITHDRAW_REJECTED'
                            ? '-'
                            : '+'}
                          {tx.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {formatTime(tx.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* 底部导航 */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t flex">
        <Link href="/" className="flex-1 py-3 text-center text-gray-400 text-sm">
          订单大厅
        </Link>
        <Link href="/chat" className="flex-1 py-3 text-center text-gray-400 text-sm">
          客服
        </Link>
        <Link href="/profile" className="flex-1 py-3 text-center text-gray-400 text-sm">
          我的
        </Link>
        <Link href="/wallet" className="flex-1 py-3 text-center text-green-600 text-sm font-bold border-t-2 border-green-600">
          钱包
        </Link>
      </nav>
    </div>
  );
}