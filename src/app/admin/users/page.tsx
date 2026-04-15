'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * 用户类型
 */
interface User {
  id: string;
  name: string;
  role: string;
  adminLevel: number;
  canManageRecharge: boolean;
  canManageOrders: boolean;
  canManageChat: boolean;
  kefuLink: string | null;
  balance: number;
  createdAt: string;
  _count?: {
    boostedOrders: number;
  };
}

/**
 * 用户管理页面（仅超级管理员可访问）
 */
export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null);
  const [showKefuModal, setShowKefuModal] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    password: '',
    adminLevel: '1',
  });
  const [newPassword, setNewPassword] = useState('');
  const [newKefuLink, setNewKefuLink] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAndFetchUsers();
  }, []);

  /**
   * 检查权限并获取用户列表
   */
  const checkAndFetchUsers = async () => {
    try {
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const user = await userRes.json();

      if (user.role !== 'ADMIN' || user.adminLevel !== 2) {
        alert('只有超级管理员才能访问此页面');
        router.push('/admin');
        return;
      }

      fetchUsers();
    } catch (error) {
      console.error('检查权限失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取用户列表
   */
  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('获取用户失败:', error);
    }
  };

  /**
   * 创建管理员
   */
  const handleCreateAdmin = async () => {
    if (!newUser.name || !newUser.password) {
      alert('请填写完整信息');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUser.name,
          password: newUser.password,
          adminLevel: parseInt(newUser.adminLevel),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('管理员创建成功！');
        setShowCreateModal(false);
        setNewUser({ name: '', password: '', adminLevel: '1' });
        fetchUsers();
      } else {
        alert(data.error || '创建失败');
      }
    } catch (error) {
      console.error('创建失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 修改密码
   */
  const handleChangePassword = async (userId: string) => {
    if (!newPassword || newPassword.length < 4) {
      alert('密码至少4个字符');
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('密码修改成功！');
        setShowPasswordModal(null);
        setNewPassword('');
      } else {
        alert(data.error || '修改失败');
      }
    } catch (error) {
      console.error('修改密码失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 切换充值配置管理权限
   */
  const handleToggleRechargePermission = async (userId: string, currentValue: boolean) => {
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canManageRecharge: !currentValue }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(!currentValue ? '已开启充值配置权限' : '已关闭充值配置权限');
        fetchUsers();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 切换订单管理权限
   */
  const handleToggleOrdersPermission = async (userId: string, currentValue: boolean) => {
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canManageOrders: !currentValue }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(!currentValue ? '已开启订单管理权限' : '已关闭订单管理权限');
        fetchUsers();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 切换聊天管理权限
   */
  const handleToggleChatPermission = async (userId: string, currentValue: boolean) => {
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ canManageChat: !currentValue }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(!currentValue ? '已开启聊天管理权限' : '已关闭聊天管理权限');
        fetchUsers();
      } else {
        alert(data.error || '操作失败');
      }
    } catch (error) {
      console.error('操作失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 设置客服链接
   */
  const handleSetKefuLink = async (userId: string) => {
    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}/kefu`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kefuLink: newKefuLink }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('客服链接设置成功！');
        setShowKefuModal(null);
        setNewKefuLink('');
        fetchUsers();
      } else {
        alert(data.error || '设置失败');
      }
    } catch (error) {
      console.error('设置客服链接失败:', error);
      alert('网络错误');
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 删除用户
   */
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`确认删除用户 "${userName}"？此操作不可撤销。`)) {
      return;
    }

    setActionLoading(true);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('删除成功');
        fetchUsers();
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
   * 打开客服链接设置弹窗
   */
  const openKefuModal = (user: User) => {
    setShowKefuModal(user.id);
    setNewKefuLink(user.kefuLink || '');
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  const adminUsers = users.filter(u => u.role === 'ADMIN');
  const boosterUsers = users.filter(u => u.role === 'BOOSTER');

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* 顶部 */}
      <header className="bg-purple-600 p-4 text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">用户管理</h1>
          <Link href="/admin" className="text-sm opacity-80">
            返回管理
          </Link>
        </div>
        <p className="text-sm opacity-80 mt-1">
          超级管理员 · 共 {users.length} 个用户
        </p>
      </header>

      {/* 创建管理员按钮 */}
      <div className="p-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold"
        >
          + 创建新管理员
        </button>
      </div>

      {/* 管理员列表 */}
      <div className="px-4">
        <h2 className="text-lg font-bold text-gray-700 mb-3">管理员 ({adminUsers.length})</h2>
        <div className="space-y-3">
          {adminUsers.map(user => (
            <div key={user.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{user.name}</h3>
                  <p className="text-xs text-gray-500">
                    {user.adminLevel === 2 ? '超级管理员' : '小管理员'}
                  </p>
                  {user.kefuLink && (
                    <p className="text-xs text-green-600 mt-1 truncate">
                      客服: {user.kefuLink}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {user.adminLevel !== 2 && (
                    <>
                      <button
                        onClick={() => handleToggleRechargePermission(user.id, user.canManageRecharge)}
                        disabled={actionLoading}
                        className={`text-xs px-2 py-1 rounded ${user.canManageRecharge ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}
                      >
                        充值{user.canManageRecharge ? '✓' : '✗'}
                      </button>
                      <button
                        onClick={() => handleToggleOrdersPermission(user.id, user.canManageOrders)}
                        disabled={actionLoading}
                        className={`text-xs px-2 py-1 rounded ${user.canManageOrders ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}
                      >
                        订单{user.canManageOrders ? '✓' : '✗'}
                      </button>
                      <button
                        onClick={() => handleToggleChatPermission(user.id, user.canManageChat)}
                        disabled={actionLoading}
                        className={`text-xs px-2 py-1 rounded ${user.canManageChat ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}
                      >
                        聊天{user.canManageChat ? '✓' : '✗'}
                      </button>
                      <button
                        onClick={() => openKefuModal(user)}
                        className="text-green-500 text-xs px-2"
                      >
                        客服
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setShowPasswordModal(user.id)}
                    className="text-blue-500 text-xs px-2"
                  >
                    改密
                  </button>
                  {user.adminLevel !== 2 && (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.name)}
                      disabled={actionLoading}
                      className="text-red-500 text-xs px-2"
                    >
                      删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 打手列表 */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-bold text-gray-700 mb-3">打手 ({boosterUsers.length})</h2>
        <div className="space-y-3">
          {boosterUsers.map(user => (
            <div key={user.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-800">{user.name}</h3>
                  <p className="text-xs text-gray-500">
                    接单 {user._count?.boostedOrders || 0} 个
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPasswordModal(user.id)}
                    className="text-blue-500 text-sm px-2"
                  >
                    改密
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    disabled={actionLoading}
                    className="text-red-500 text-sm px-2"
                  >
                    删除
                  </button>
                </div>
              </div>
            </div>
          ))}
          {boosterUsers.length === 0 && (
            <div className="text-center text-gray-400 py-10 bg-white rounded-xl">
              暂无打手
            </div>
          )}
        </div>
      </div>

      {/* 创建管理员弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">创建新管理员</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">用户名</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="2-20个字符"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">密码</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="至少4个字符"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">管理员级别</label>
                <select
                  value={newUser.adminLevel}
                  onChange={(e) => setNewUser({ ...newUser, adminLevel: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="1">小管理员</option>
                  <option value="2">超级管理员</option>
                </select>
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
                onClick={handleCreateAdmin}
                disabled={actionLoading}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium disabled:bg-purple-300"
              >
                {actionLoading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">修改密码</h2>

            <div>
              <label className="block text-sm text-gray-600 mb-1">新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少4个字符"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPasswordModal(null);
                  setNewPassword('');
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
              >
                取消
              </button>
              <button
                onClick={() => handleChangePassword(showPasswordModal)}
                disabled={actionLoading}
                className="flex-1 py-2 bg-purple-600 text-white rounded-lg font-medium disabled:bg-purple-300"
              >
                {actionLoading ? '修改中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 设置客服链接弹窗 */}
      {showKefuModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">设置客服链接</h2>
            <p className="text-sm text-gray-500 mb-4">打手接单后会显示此客服链接</p>

            <div>
              <label className="block text-sm text-gray-600 mb-1">客服链接</label>
              <input
                type="text"
                value={newKefuLink}
                onChange={(e) => setNewKefuLink(e.target.value)}
                placeholder="例如: https://kefu.qq.com/xxx 或微信号"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowKefuModal(null);
                  setNewKefuLink('');
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
              >
                取消
              </button>
              <button
                onClick={() => handleSetKefuLink(showKefuModal)}
                disabled={actionLoading}
                className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium disabled:bg-green-300"
              >
                {actionLoading ? '设置中...' : '确认设置'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部导航 */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t flex">
        <Link href="/" className="flex-1 py-3 text-center text-gray-400 text-sm">
          首页
        </Link>
        <Link href="/profile" className="flex-1 py-3 text-center text-gray-400 text-sm">
          我的
        </Link>
        <Link href="/admin" className="flex-1 py-3 text-center text-purple-600 text-sm font-bold border-t-2 border-purple-600">
          管理
        </Link>
      </nav>
    </div>
  );
}
