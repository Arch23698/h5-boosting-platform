'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/**
 * 消息类型
 */
interface Message {
  id: string;
  content: string;
  senderId: string;
  sender: { id: string; name: string; role: string };
  createdAt: string;
  isRead: boolean;
}

/**
 * 会话类型
 */
interface Session {
  id: string;
  lastMessage: string | null;
  updatedAt: string;
  booster: { id: string; name: string };
  admin: { id: string; name: string } | null;
  order: { id: string; title: string; orderNo: string };
  _count?: { messages: number };
  messages?: Message[];
}

/**
 * 用户类型
 */
interface UserInfo {
  id: string;
  name: string;
  role: string;
  adminLevel: number;
  canManageChat: boolean;
}

/**
 * 管理员类型
 */
interface Admin {
  id: string;
  name: string;
  adminLevel: number;
}

export default function ChatListPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [assigning, setAssigning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [userRes, sessionsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/chat'),
      ]);

      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const userData = await userRes.json();
      const sessionsData = await sessionsRes.json();

      setCurrentUser(userData);
      setSessions(sessionsData.sessions || []);

      // 只在管理员登录时获取管理员列表
      if (userData.role === 'ADMIN') {
        try {
          const adminsRes = await fetch('/api/admin/admins');
          if (adminsRes.ok) {
            const adminsData = await adminsRes.json();
            setAdmins(adminsData.admins || []);
          }
        } catch (e) {
          console.error('获取管理员列表失败:', e);
        }
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 删除会话
   */
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('确认删除此聊天会话？此操作不可撤销。')) {
      return;
    }

    setAssigning(true);

    try {
      const res = await fetch(`/api/chat/${sessionId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('删除成功');
        // 刷新会话列表
        const sessionsRes = await fetch('/api/chat');
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions || []);
      } else {
        const data = await res.json();
        alert(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      alert('网络错误');
    } finally {
      setAssigning(false);
    }
  };

  /**
   * 分配会话给管理员
   */
  const handleAssign = async (adminId: string) => {
    if (!selectedSession) return;

    setAssigning(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          adminId,
        }),
      });

      if (res.ok) {
        // 刷新会话列表
        const sessionsRes = await fetch('/api/chat');
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions || []);
        setShowAssignModal(false);
        setSelectedSession(null);
      } else {
        const data = await res.json();
        alert(data.error || '分配失败');
      }
    } catch (error) {
      console.error('分配失败:', error);
      alert('网络错误');
    } finally {
      setAssigning(false);
    }
  };

  /**
   * 自己接入会话
   */
  const handleTakeOver = async (sessionId: string) => {
    if (!currentUser) return;

    setAssigning(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          adminId: currentUser.id,
        }),
      });

      if (res.ok) {
        const sessionsRes = await fetch('/api/chat');
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions || []);
      } else {
        const data = await res.json();
        alert(data.error || '接入失败');
      }
    } catch (error) {
      console.error('接入失败:', error);
      alert('网络错误');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'ADMIN';

  // 分类会话
  let unassignedSessions: Session[] = [];
  let mySessions: Session[] = [];
  let otherSessions: Session[] = [];

  if (isAdmin) {
    // 管理员视角
    unassignedSessions = sessions.filter(s => !s.admin);
    mySessions = sessions.filter(s => s.admin?.id === currentUser?.id);
    otherSessions = sessions.filter(s => s.admin && s.admin.id !== currentUser?.id);
  } else {
    // 打手视角 - 显示自己创建的会话
    mySessions = sessions.filter(s => s.booster?.id === currentUser?.id);
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 pb-20">
      {/* 顶部导航栏 */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-800">
            {isAdmin ? '客服消息' : '我的客服'}
          </h1>
        </div>
      </header>

      {/* 会话列表 */}
      <main className="p-4">
        {loading ? (
          <div className="text-center text-gray-400 py-20">加载中...</div>
        ) : (isAdmin ? (unassignedSessions.length === 0 && mySessions.length === 0 && otherSessions.length === 0) : mySessions.length === 0) ? (
          <div className="text-center text-gray-400 py-20">
            {isAdmin ? '暂无客服消息' : '暂无聊天记录，点击订单详情页的客服按钮可以联系客服'}
          </div>
        ) : (
          <div className="space-y-4">
            {/* 未分配会话 - 管理员可见 */}
            {isAdmin && unassignedSessions.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-orange-600 mb-2">
                  待接入 ({unassignedSessions.length})
                </h2>
                <div className="space-y-3">
                  {unassignedSessions.map(session => (
                    <div key={session.id} className="bg-white rounded-xl p-4 shadow-sm border border-orange-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-800">{session.order?.title}</h3>
                          <p className="text-xs text-gray-500">
                            订单号: {session.order?.orderNo}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(session.updatedAt).toLocaleString('zh-CN', {
                            month: 'numeric',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate mb-2">
                        {session.lastMessage || '暂无消息'}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTakeOver(session.id)}
                          disabled={assigning}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:bg-blue-300"
                        >
                          我来回复
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSession(session);
                            setShowAssignModal(true);
                          }}
                          disabled={assigning}
                          className="py-2 px-3 border border-gray-300 text-gray-600 rounded-lg text-sm"
                        >
                          转接
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        打手: {session.booster?.name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 我的会话 - 通用标题 */}
            {mySessions.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-green-600 mb-2">
                  {isAdmin ? `我的会话 (${mySessions.length})` : `我的客服 (${mySessions.length})`}
                </h2>
                <div className="space-y-3">
                  {mySessions.map(session => (
                    <div key={session.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                      <Link href={`/chat/${session.id}`}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800">{session.order?.title}</h3>
                            <p className="text-xs text-gray-500">
                              订单号: {session.order?.orderNo}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(session.updatedAt).toLocaleString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600 truncate flex-1">
                            {session.lastMessage || '暂无消息'}
                          </p>
                          {session._count?.messages ? (
                            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                              {session._count.messages}
                            </span>
                          ) : null}
                        </div>
                        <div className="flex gap-2 mt-2 text-xs text-gray-500">
                          {isAdmin ? (
                            <span>打手: {session.booster?.name}</span>
                          ) : (
                            <span>客服: {session.admin?.name || '待分配'}</span>
                          )}
                        </div>
                      </Link>
                      {/* 删除按钮 - 仅超级管理员或有聊天管理权限的管理员可见 */}
                      {(currentUser?.adminLevel === 2 || currentUser?.canManageChat) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            disabled={assigning}
                            className="w-full py-2 bg-red-500 text-white rounded-lg text-sm font-medium disabled:bg-red-300"
                          >
                            删除会话
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 其他人的会话 - 仅超级管理员可见 */}
            {isAdmin && currentUser?.adminLevel === 2 && otherSessions.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-2">
                  其他人的会话 ({otherSessions.length})
                </h2>
                <div className="space-y-3">
                  {otherSessions.map(session => (
                    <Link href={`/chat/${session.id}`} key={session.id}>
                      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 opacity-60">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800">{session.order?.title}</h3>
                            <p className="text-xs text-gray-500">
                              订单号: {session.order?.orderNo}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(session.updatedAt).toLocaleString('zh-CN', {
                              month: 'numeric',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2 text-xs text-gray-500">
                          <span>打手: {session.booster?.name}</span>
                          <span>客服: {session.admin?.name}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 转接弹窗 */}
      {showAssignModal && selectedSession && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-4">转接会话</h2>
            <p className="text-sm text-gray-600 mb-4">
              将会话转接给其他管理员
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {admins
                .filter(a => a.id !== currentUser?.id)
                .map(admin => (
                  <button
                    key={admin.id}
                    onClick={() => handleAssign(admin.id)}
                    disabled={assigning}
                    className="w-full py-3 px-4 border border-gray-200 rounded-lg text-left hover:bg-gray-50 disabled:opacity-50"
                  >
                    <span className="font-medium">{admin.name}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      {admin.adminLevel === 2 ? '超级管理员' : '管理员'}
                    </span>
                  </button>
                ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedSession(null);
                }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600"
              >
                取消
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
        {isAdmin && (
          <Link href="/admin" className="flex-1 py-3 text-center text-gray-400 text-sm">
            管理
          </Link>
        )}
      </nav>
    </div>
  );
}
