'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * 充值页面
 * 显示充值二维码
 */
export default function RechargePage() {
  const [user, setUser] = useState<{ id: string; name: string; balance: number } | null>(null);
  const [config, setConfig] = useState<{ qrcode: string | null; enabled: boolean }>({ qrcode: null, enabled: false });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, configRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/admin/config/recharge'),
      ]);

      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const userData = await userRes.json();
      const configData = configRes.ok ? await configRes.json() : { qrcode: null, enabled: false };

      setUser(userData);
      setConfig(configData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!config.enabled) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50">
        <header className="bg-white p-4 shadow-sm flex items-center">
          <button onClick={() => router.back()} className="text-blue-600 font-medium mr-4">
            返回
          </button>
          <h1 className="text-xl font-bold text-gray-800">充值</h1>
        </header>
        <main className="p-4">
          <div className="bg-white rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">充值功能已关闭</h2>
            <p className="text-gray-500">请稍后再试</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white p-4 shadow-sm flex items-center">
        <button onClick={() => router.back()} className="text-blue-600 font-medium mr-4">
          返回
        </button>
        <h1 className="text-xl font-bold text-gray-800">充值</h1>
      </header>

      <main className="p-4">
        {/* 当前余额 */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white mb-4">
          <p className="text-sm opacity-80">当前余额</p>
          <p className="text-4xl font-bold mt-1">¥{user?.balance?.toFixed(2) || '0.00'}</p>
        </div>

        {/* 充值二维码 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">扫码充值</h2>

          {config.qrcode ? (
            <div className="w-64 h-64 mx-auto mb-4 rounded-lg overflow-hidden bg-gray-50">
              <img
                src={config.qrcode}
                alt="充值二维码"
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-64 h-64 mx-auto mb-4 rounded-lg bg-gray-50 flex items-center justify-center">
              <p className="text-gray-400">暂无可用二维码</p>
            </div>
          )}

          <p className="text-sm text-gray-500 text-center mb-4">
            请使用微信或支付宝扫描上方二维码进行充值
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
            <p className="font-medium mb-1">充值说明：</p>
            <ul className="list-disc list-inside space-y-1">
              <li>充值成功后，请联系客服确认</li>
              <li>充值金额将实时到账到您的钱包</li>
              <li>有任何问题请联系客服</li>
            </ul>
          </div>
        </div>

        {/* 联系客服 */}
        <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
          <Link href="/chat" className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">充值遇到问题？</p>
              <p className="text-xs text-gray-400">联系客服获取帮助</p>
            </div>
            <span className="text-blue-600">&gt;</span>
          </Link>
        </div>
      </main>
    </div>
  );
}