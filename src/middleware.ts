import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { v4 as uuidv4 } from 'uuid';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  
  // 1. Device ID Management
  let deviceId = req.cookies.get('nizestore_device_id')?.value;
  if (!deviceId) {
    deviceId = uuidv4();
    res.cookies.set('nizestore_device_id', deviceId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  // 2. Auth Protection
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  // Admin routes protection
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    if (!token || token.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  if (pathname.startsWith('/dashboard')) {
    if (!token || token.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  // Prevent clients from accessing admin login if they are not admin (optional, or just redirect them)
  if (pathname === '/admin/login' && token?.role === 'client') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Prevent admin from accessing normal login/register if already logged in
  if ((pathname === '/login' || pathname === '/register') && token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
