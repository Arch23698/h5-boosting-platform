'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  booster: { id: string; name: string };
  admin: { id: string; name: string } | null;
  order: { id: string; title: string; orderNo: string };
}

/**
 * 用户类型
 */
interface UserInfo {
  id: string;
  name: string;
  role: string;
}

export default function ChatDetailPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    fetchMessages();
    // 每5秒轮询新消息
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [params.id]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setSession(data.session);
        setMessages(data.messages);
        if (!currentUser) {
          const userRes = await fetch('/api/auth/me');
          if (userRes.ok) {
            setCurrentUser(await userRes.json());
          }
        }
      } else {
        alert('会话不存在');
        router.push('/chat');
      }
    } catch (error) {
      console.error('获取消息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch(`/api/chat/${params.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: inputMessage.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setInputMessage('');
      } else {
        const data = await res.json();
        alert(data.error || '发送失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送失败');
    } finally {
      setSending(false);
    }
  };

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (!session || !currentUser) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400">会话不存在</div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const otherName = isAdmin ? session.booster?.name : (session.admin?.name || '客服');

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col">
      {/* 顶部导航栏 */}
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center">
          <button
            onClick={() => router.push('/chat')}
            className="text-blue-600 font-medium mr-4"
          >
            返回
          </button>
          <div>
            <h1 className="font-bold text-gray-800">{otherName}</h1>
            <p className="text-xs text-gray-500">{session.order?.title}</p>
          </div>
        </div>
      </header>

      {/* 消息列表 */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* 订单信息提示 */}
        <div className="bg-blue-50 rounded-lg p-3 text-center text-sm text-blue-600">
          订单号: {session.order?.orderNo}
        </div>

        {messages.map(message => {
          const isMine = message.senderId === currentUser.id;
          return (
            <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] ${isMine ? 'order-1' : ''}`}>
                {!isMine && (
                  <p className="text-xs text-gray-500 mb-1">{message.sender?.name}</p>
                )}
                <div
                  className={`rounded-2xl px-4 py-2 ${
                    isMine
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <p className={`text-xs text-gray-400 mt-1 ${isMine ? 'text-right' : ''}`}>
                  {new Date(message.createdAt).toLocaleString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* 输入框 */}
      <footer className="bg-white border-t p-4 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="输入消息..."
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !inputMessage.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium disabled:bg-blue-300"
          >
            发送
          </button>
        </div>
      </footer>
    </div>
  );
}
