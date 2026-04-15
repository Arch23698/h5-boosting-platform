/**
 * Next.js Middleware
 * 保护需要登录的路由和 API
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './app/lib/auth';

/**
 * 不需要鉴权的路径（白名单）
 */
const PUBLIC_PATHS = [
  '/login',               // 登录页
  '/api/auth/login',      // 登录 API
  '/api/auth/register',   // 注册 API
  '/api/auth/me',         // 获取用户信息 API
  '/api/games',           // 游戏列表 API
];

/**
 * Middleware 主函数
 * 在每个请求到达之前执行
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否为公开路径
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 验证 JWT Token
  const user = await verifyToken(request);

  // 未登录：API 返回 401，页面重定向到登录页
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 页面请求重定向到登录页
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 已登录：将用户信息注入请求头，供后续使用
  const response = NextResponse.next();
  response.headers.set('x-user-id', user.userId);
  response.headers.set('x-user-name', encodeURIComponent(user.name));
  response.headers.set('x-user-role', user.role);

  return response;
}

/**
 * 配置 Middleware 匹配规则
 * 只对指定路径生效，优化性能
 */
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (网站图标)
     * - 公共资源文件
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
