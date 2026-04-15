'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

/**
 * 支付保证金页面
 * 打手接单时跳转到此页面支付保证金
 */

interface Order {
  id: string;
  title: string;
  price: number;
  deposit: number;
  status: string;
  game: { name: string };
  player: { name: string };
}

export default function PayDepositPage() {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  /**
   * 获取订单信息
   */
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);

        // 如果订单已被接走，跳转回详情页
        if (data.status !== 'OPEN') {
          router.push(`/orders/${params.id}`);
        }
      } else {
        alert('订单不存在');
        router.push('/');
      }
    } catch (error) {
      console.error('获取订单失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 确认支付（模拟支付成功）
   */
  const handleConfirmPay = async () => {
    if (!order) return;

    setPaying(true);

    try {
      const res = await fetch(`/api/orders/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'grab' }),
      });

      const data = await res.json();

      if (res.ok) {
        setPaid(true);
        // 2秒后跳转回订单详情页
        setTimeout(() => {
          router.push(`/orders/${params.id}`);
        }, 2000);
      } else {
        alert(data.error || '接单失败');
      }
    } catch (error) {
      console.error('支付失败:', error);
      alert('网络错误，请重试');
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">订单不存在</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white p-4 shadow-sm flex items-center">
        <button
          onClick={() => router.push(`/orders/${params.id}`)}
          className="text-blue-600 font-medium mr-4"
        >
          返回
        </button>
        <h1 className="text-xl font-bold text-gray-800">支付保证金</h1>
      </header>

      <main className="p-4">
        {/* 订单信息 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h2 className="font-bold text-gray-800 mb-2">{order.title}</h2>
          <p className="text-sm text-gray-500">{order.game.name}</p>
          <div className="flex justify-between mt-3 pt-3 border-t">
            <span className="text-gray-600">订单金额</span>
            <span className="font-bold text-red-500">¥{order.price}</span>
          </div>
        </div>

        {/* 支付金额 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">需支付保障金</span>
            <span className="text-2xl font-bold text-blue-600">¥{order.deposit.toFixed(2)}</span>
          </div>
          <p className="text-xs text-gray-400">
            * 保证金在订单完成后自动退还
          </p>
        </div>

        {/* 支付信息 */}
        {!paid && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-4 text-center">
            <h3 className="font-bold text-gray-800 mb-4">支付保障金</h3>

            {/* 保障金金额 */}
            <div className="text-3xl font-bold text-red-500 mb-4">
              ¥{order.deposit.toFixed(2)}
            </div>

            <p className="text-sm text-gray-500 mb-4">
              安全/效率保障金不足，请充值
            </p>

            {/* 前往充值按钮 */}
            <Link
              href="/profile?tab=wallet"
              className="block w-full py-3 bg-blue-500 text-white rounded-xl font-bold text-lg text-center"
            >
              已知晓，前往联系客服充值
            </Link>

            <p className="text-xs text-gray-400 mt-3">
              充值后返回此页面继续接单
            </p>
          </div>
        )}

        {/* 支付成功提示 */}
        {paid && (
          <div className="bg-white rounded-xl p-6 shadow-sm mb-4 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-bold text-green-600 mb-2">支付成功！</h3>
            <p className="text-gray-500">正在跳转到订单详情...</p>
          </div>
        )}

        {/* 客服联系 */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">支付遇到问题？</p>
              <p className="text-xs text-gray-400">联系客服获取帮助</p>
            </div>
            <a
              href="https://example.com/kefu"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm"
            >
              联系客服
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
