'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * 登录/注册页面
 * 只支持打手注册，管理员由超级管理员创建
 */
export default function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [idCard, setIdCard] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  /**
   * 处理登录
   */
  const handleLogin = async () => {
    if (!name.trim() || !password.trim()) {
      alert('请输入用户名和密码');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password })
      });

      const data = await res.json();

      if (res.ok) {
        const roleText = data.role === 'ADMIN' ?
          (data.adminLevel === 2 ? '超级管理员' : '管理员') : '打手';
        alert(`登录成功！欢迎回来，${roleText} ${data.name}`);
        router.push('/');
        router.refresh();
      } else {
        alert(data.error || '登录失败');
      }
    } catch (error) {
      console.error('登录失败:', error);
      alert('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理注册（只能注册打手）
   */
  const handleRegister = async () => {
    if (!name.trim() || !password.trim()) {
      alert('请输入用户名和密码');
      return;
    }

    if (name.length < 2 || name.length > 20) {
      alert('用户名需要2-20个字符');
      return;
    }

    if (password.length < 4) {
      alert('密码至少需要4个字符');
      return;
    }

    // 手机号必填校验
    if (!phone) {
      alert('请输入手机号');
      return;
    }

    // 手机号格式校验
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      alert('请输入正确的11位手机号');
      return;
    }

    // 身份证号必填校验
    if (!idCard) {
      alert('请输入身份证号');
      return;
    }

    // 身份证号格式校验
    if (!/(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/.test(idCard)) {
      alert('请输入正确的身份证号（15或18位）');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, password, phone: phone || null, idCard: idCard || null })
      });

      const data = await res.json();

      if (res.ok) {
        alert(`注册成功！欢迎加入，打手 ${name}`);
        router.push('/');
        router.refresh();
      } else {
        alert(data.error || '注册失败');
      }
    } catch (error) {
      console.error('注册失败:', error);
      alert('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 提交表单
   */
  const handleSubmit = () => {
    if (isRegister) {
      handleRegister();
    } else {
      handleLogin();
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col justify-center p-6">
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">极速代练系统</h1>
        <p className="text-center text-gray-400 text-sm mb-6">
          {isRegister ? '注册成为打手开始接单赚钱' : '登录你的账号'}
        </p>

        {/* 登录/注册切换 */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          <button
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              !isRegister ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            登录
          </button>
          <button
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              isRegister ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            注册
          </button>
        </div>

        <div className="space-y-5">
          {/* 用户名输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入用户名"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 密码输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 注册时才显示手机和身份证 */}
          {isRegister && (
            <>
              {/* 手机号输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  手机号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入11位手机号"
                  maxLength={11}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 身份证号输入 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  身份证号 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  placeholder="请输入身份证号"
                  maxLength={18}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}


          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3 font-bold mt-4 active:bg-blue-700 transition disabled:bg-blue-300"
          >
            {loading
              ? (isRegister ? '注册中...' : '登录中...')
              : (isRegister ? '注册成为打手' : '立即登录')}
          </button>

          {/* 切换提示 */}
          <p className="text-center text-sm text-gray-500">
            {isRegister ? '已有账号？' : '没有账号？'}
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-600 font-medium ml-1"
            >
              {isRegister ? '去登录' : '去注册'}
            </button>
          </p>
        </div>
      </div>

      {/* 底部提示 */}
      <p className="text-center text-xs text-gray-400 mt-6">
        管理员账号由超级管理员创建
      </p>
    </div>
  );
}
