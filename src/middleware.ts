import { NextRequest, NextResponse } from 'next/server';

import { getCurrentUserEdge } from './utils/current-user-edge';

const guestRoutes = ['/login', '/signup'];
const isGuestRoute = (path: string) => {
  return guestRoutes.includes(path);
};

export default async function middleware(req: NextRequest) {
  const response = (await middlewareAuth(req)) ?? NextResponse.next();

  return response;
}

async function middlewareAuth(
  req: NextRequest
): Promise<NextResponse | undefined> {
  const path = req.nextUrl.pathname;

  const sessionUser = await getCurrentUserEdge();

  if (!sessionUser && !isGuestRoute(path)) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (sessionUser && isGuestRoute(path)) {
    return NextResponse.redirect(new URL('/', req.url));
  }
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)'
  ]
};
