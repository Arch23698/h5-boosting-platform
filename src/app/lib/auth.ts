/**
 * JWT 鉴权工具函数
 * 基于 jose 库实现 Token 生成与验证
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

// Token 有效期：7 天
const TOKEN_EXPIRES_IN = '7d';
// Token 有效秒数（用于计算 cookie 过期时间）
const TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7天，单位：秒

/**
 * 获取 JWT 密钥
 * 密钥存储在环境变量中，开发环境下提供默认值
 */
function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'h5-boosting-platform-secret-key-dev';
  return new TextEncoder().encode(secret);
}

/**
 * JWT 载荷（Payload）结构定义
 */
export interface JwtPayload {
  userId: string;   // 用户 ID
  name: string;     // 用户昵称
  role: string;     // 用户角色：BOOSTER 或 ADMIN
  adminLevel?: number; // 管理员等级：1=小管理员, 2=超级管理员
}

/**
 * 生成 JWT Token 并设置 HttpOnly Cookie
 * @param payload - 用户信息载荷
 */
export async function createSession(payload: JwtPayload): Promise<void> {
  const secretKey = getSecretKey();

  // 使用 jose 生成 JWT
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })  // 使用 HS256 算法
    .setIssuedAt()                          // 设置签发时间
    .setExpirationTime(TOKEN_EXPIRES_IN)    // 设置过期时间
    .sign(secretKey);                       // 签名

  // 获取 cookie store（Next.js 服务端 API）
  const cookieStore = await cookies();

  // 设置 HttpOnly Cookie
  cookieStore.set('token', token, {
    httpOnly: true,           // 防止 XSS 攻击，JS 无法读取
    secure: process.env.NODE_ENV === 'production',  // 生产环境强制 HTTPS
    sameSite: 'lax',          // 防止 CSRF 攻击
    maxAge: TOKEN_MAX_AGE,    // Cookie 有效期
    path: '/',                // 全站有效
  });
}

/**
 * 清除当前会话（删除 Cookie）
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('token');
}

/**
 * 从请求中获取并验证 JWT Token
 * 用于 Middleware 中验证用户身份
 * @param request - Next.js 请求对象
 * @returns 验证成功返回用户载荷，失败返回 null
 */
export async function verifyToken(request: NextRequest): Promise<JwtPayload | null> {
  try {
    // 从 Cookie 中获取 token
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return null;
    }

    // 验证 JWT
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    // 返回用户信息
    return payload as JwtPayload;
  } catch (error) {
    // Token 无效或已过期
    return null;
  }
}

/**
 * 从当前请求中获取已登录用户信息
 * 用于服务端组件或 API 路由中获取当前用户
 * @returns 用户信息或 null
 */
export async function getCurrentUser(): Promise<JwtPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return null;
    }

    const secretKey = getSecretKey();
    const { payload } = await jwtVerify(token, secretKey);

    return payload as JwtPayload;
  } catch (error) {
    return null;
  }
}
