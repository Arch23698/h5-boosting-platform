'use client';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * 充值配置管理页面
 * 超级管理员可以上传二维码和开关充值功能
 */
export default function RechargeConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<{ qrcode: string | null; enabled: boolean }>({ qrcode: null, enabled: false });
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string; adminLevel: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

      // 只有超级管理员或有充值管理权限的管理员可以访问
      if (userData.adminLevel !== 2 && !userData.canManageRecharge) {
        alert('权限不足');
        router.push('/');
        return;
      }

      setCurrentUser(userData);
      setConfig(configData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 上传二维码
   */
  const handleUploadQRCode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('action', 'upload_qrcode');
      formData.append('file', file);

      const res = await fetch('/api/admin/config/recharge', {
        method: 'PATCH',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setConfig({ ...config, qrcode: data.qrcode });
        alert('上传成功');
      } else {
        alert(data.error || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      alert('上传失败');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 切换充值开关
   */
  const handleToggleEnabled = async (enabled: boolean) => {
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append('action', 'toggle_enabled');
      formData.append('enabled', enabled.toString());

      const res = await fetch('/api/admin/config/recharge', {
        method: 'PATCH',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setConfig({ ...config, enabled: data.enabled });
        alert(data.enabled ? '充值功能已开启' : '充值功能已关闭');
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('操作失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航栏 */}
      <header className="bg-white p-4 shadow-sm flex items-center">
        <Link href="/admin" className="text-blue-600 font-medium mr-4">
          返回
        </Link>
        <h1 className="text-xl font-bold text-gray-800">充值配置</h1>
      </header>

      <main className="p-4">
        {/* 充值开关 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-gray-800">充值功能</h3>
              <p className="text-sm text-gray-500">开启后打手可以进行充值</p>
            </div>
            <button
              onClick={() => handleToggleEnabled(!config.enabled)}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                config.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 二维码上传 */}
        <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
          <h3 className="font-bold text-gray-800 mb-3">充值二维码</h3>

          {config.qrcode ? (
            <div className="mb-4">
              <div className="w-48 h-48 mx-auto rounded-lg overflow-hidden bg-gray-50 border">
                <img
                  src={config.qrcode}
                  alt="充值二维码"
                  className="w-full h-full object-contain"
                />
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">当前二维码</p>
            </div>
          ) : (
            <div className="w-48 h-48 mx-auto rounded-lg bg-gray-50 flex items-center justify-center mb-4 border border-dashed border-gray-300">
              <p className="text-gray-400 text-sm">暂未设置二维码</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadQRCode}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium disabled:bg-blue-300"
          >
            {saving ? '上传中...' : config.qrcode ? '更换二维码' : '上传二维码'}
          </button>

          <p className="text-xs text-gray-400 mt-2 text-center">
            支持 jpg、png、gif 格式
          </p>
        </div>

        {/* 预览 */}
        {config.qrcode && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-3">充值页面预览</h3>
            <div className="w-32 h-32 mx-auto rounded-lg overflow-hidden bg-gray-50 border">
              <img
                src={config.qrcode}
                alt="预览"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}